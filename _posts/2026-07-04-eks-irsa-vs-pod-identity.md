---
layout: single
title: "☸️ EKS에서 Pod에 AWS 권한 주기 — IRSA와 Pod Identity"
date: 2026-07-04 21:00:00 +0900
categories: aws
tags: [aws, eks, kubernetes, IRSA, PodIdentity, IAM, security]
---


EKS에서 돌아가는 Pod가 S3 버킷을 읽거나 MSK에 붙거나 DynamoDB를 조회하려면 결국 AWS API 요청에 서명할 자격증명이 필요하다. 예전에는 노드에 붙은 Instance Profile을 그대로 쓰거나 Access Key를 Secret에 박아 넣는 식으로 해결했는데, 전자는 같은 노드의 모든 Pod가 동일한 권한을 공유하게 되고 후자는 키가 새면 회수하기 전까지 그대로 뚫린다. 둘 다 최소 권한 원칙과는 거리가 멀다.

지금 EKS에서 권장하는 방식은 두 가지다. **IRSA(IAM Roles for Service Accounts)**와 **EKS Pod Identity**. 둘 다 "Pod가 장기 키를 들고 있지 않고, 자기 ServiceAccount에 매핑된 IAM Role의 임시 자격증명을 필요할 때 받아 쓴다"는 목표는 같다. 다른 건 그걸 어떻게 검증하고 발급하느냐다.

이 문서는 두 방식을 각각 뜯어보고, S3와 MSK를 예로 실제 설정이 어떻게 되는지 정리한다.

## 먼저 짚고 넘어갈 것: ServiceAccount는 IAM 계정이 아니다

헷갈리기 쉬운 지점이라 먼저 정리한다.

- **Kubernetes ServiceAccount(SA)** 는 클러스터 안에서만 의미 있는 신원이다. `kubectl`로 만들고 네임스페이스 안에 산다. AWS는 이 존재를 알지 못한다.
- **IAM Role** 은 AWS 쪽 신원이다. 여기에 S3, MSK 같은 리소스에 대한 권한(정책)이 붙는다.

IRSA든 Pod Identity든 하는 일은 결국 이 별개의 두 신원을 이어 붙이는 것이다. "이 SA를 쓰는 Pod는 이 IAM Role의 자격증명을 받을 자격이 있다"는 매핑을 만드는 게 전부다. SA 자체가 IAM 계정으로 승격되는 게 아니다.

Pod가 SA를 집어 드는 건 spec의 한 줄이다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      serviceAccountName: my-app-sa   # 이 Pod가 사용할 SA
      containers:
        - name: app
          image: my-app:1.0.0
```

지정하지 않으면 네임스페이스의 `default` SA가 붙는다. 즉 SA를 명시하지 않은 Pod에 권한을 주려다 실수하면 `default`에 권한이 붙어 그 네임스페이스 전체가 영향을 받는다. 그래서 워크로드마다 전용 SA를 만드는 게 기본이다.

## IRSA (IAM Roles for Service Accounts)

2019년부터 있던 방식이다. 핵심은 클러스터가 발급하는 **OIDC 토큰**을 AWS STS가 신뢰하도록 만들어 두고, Pod가 그 토큰을 STS에 제출해 Role을 assume 하는 것이다.

### 구성 요소

1. **클러스터의 OIDC provider** — EKS 클러스터마다 OIDC 발급자(issuer) URL이 있고, 이걸 IAM에 OIDC identity provider로 등록해 둔다. 이게 IRSA의 신뢰 뿌리다.
2. **annotation이 붙은 ServiceAccount** — SA에 `eks.amazonaws.com/role-arn`으로 어떤 Role을 쓸지 적는다.
3. **Pod Identity Webhook** — EKS에 기본 내장된 mutating webhook. annotation이 붙은 SA를 쓰는 Pod가 생성되면 자동으로 프로젝션된 토큰 볼륨과 환경변수(`AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE`)를 주입한다.
4. **IAM Role의 신뢰 정책** — 어떤 OIDC provider의, 어떤 SA만 이 Role을 assume 할 수 있는지 조건으로 명시한다.

### 동작 흐름

```mermaid
sequenceDiagram
    participant Pod
    participant SA as ServiceAccount<br/>(token 볼륨)
    participant STS as AWS STS
    participant OIDC as 클러스터 OIDC Provider
    participant S3

    Note over Pod,SA: Webhook이 토큰 볼륨과<br/>AWS_ROLE_ARN 등을 주입
    Pod->>SA: 프로젝션된 OIDC 토큰(JWT) 읽기
    Pod->>STS: AssumeRoleWithWebIdentity(token, role-arn)
    STS->>OIDC: 토큰 서명 검증 (issuer 공개키)
    OIDC-->>STS: 검증 OK
    STS->>STS: 신뢰 정책의 sub/aud 조건 확인
    STS-->>Pod: 임시 자격증명 (약 1시간)
    Pod->>S3: 서명된 요청 (GetObject 등)
    S3-->>Pod: 응답
```

토큰 검증은 클러스터의 OIDC provider가 뿌리이고, 실제 STS 호출은 Pod 안의 AWS SDK가 한다. SDK가 알아서 `AssumeRoleWithWebIdentity`를 부르고 자격증명을 캐시하며 만료 전에 갱신한다. 애플리케이션 코드는 평소처럼 SDK만 쓰면 되고 자격증명을 직접 다룰 필요가 없다.

### 설정 예시

OIDC provider 등록은 클러스터당 한 번만 한다. `eksctl`을 쓰면 이 과정과 Role 생성, 신뢰 정책 작성을 한 번에 처리해 준다.

```bash
# OIDC provider 등록 (클러스터당 1회)
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster --approve

# SA + IAM Role 생성 + 신뢰 정책 자동 작성
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace data \
  --name s3-reader-sa \
  --attach-policy-arn arn:aws:iam::123456789012:policy/s3-read-only \
  --approve
```

수동으로 할 경우 SA와 신뢰 정책은 이렇게 생긴다.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader-sa
  namespace: data
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3-reader-role
```

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::123456789012:oidc-provider/oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:sub": "system:serviceaccount:data:s3-reader-sa",
        "oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:aud": "sts.amazonaws.com"
      }
    }
  }]
}
```

`sub` 조건이 IRSA 보안의 핵심이다. `system:serviceaccount:<네임스페이스>:<SA이름>` 형식으로, 정확히 그 네임스페이스의 그 SA만 이 Role을 쓸 수 있게 묶는다. 이걸 대충 와일드카드로 열어두면 클러스터 안 아무 SA나 Role을 가져다 쓸 수 있게 되니 주의해야 한다.

### IRSA의 불편한 점

실무에서 걸리는 지점은 대체로 이렇다.

- 클러스터를 새로 만들 때마다 OIDC provider를 IAM에 등록해야 한다. 빠뜨리면 아무리 annotation을 잘 달아도 동작하지 않는다.
- OIDC issuer URL이 클러스터마다 다르기 때문에, 같은 워크로드를 여러 클러스터에 배포하면 Role의 신뢰 정책을 클러스터 수만큼 손봐야 한다. 하나의 Role을 여러 클러스터에서 재사용하려면 신뢰 정책에 조건을 여러 개 나열해야 한다.
- 신뢰 정책 문자열이 길고 오타에 취약하다. `sub` 값 하나 틀리면 조용히 `AccessDenied`가 난다.

## EKS Pod Identity

2023년 말에 나온 방식이다. IRSA의 운영 부담, 특히 클러스터별 OIDC 설정과 신뢰 정책 관리를 걷어내는 게 목적이다.

### 구성 요소

1. **EKS Pod Identity Agent** — 클러스터에 애드온으로 설치하는 DaemonSet. 각 노드에서 돌면서 Pod에 자격증명을 나눠준다.
2. **Pod Identity Association** — AWS API로 만드는 매핑. `(클러스터, 네임스페이스, SA) → IAM Role` 관계를 AWS 쪽에 등록한다. SA에 annotation을 달지 않는다.
3. **IAM Role의 신뢰 정책** — OIDC 대신 `pods.eks.amazonaws.com` 서비스를 신뢰하는 단순한 형태.

### 동작 흐름

```mermaid
sequenceDiagram
    participant Pod
    participant Agent as Pod Identity Agent<br/>(노드 DaemonSet)
    participant EKS as EKS Auth
    participant STS as AWS STS
    participant S3

    Note over Pod,Agent: association이 있으면 Agent가<br/>credentials 엔드포인트 env 주입
    Pod->>Agent: 자격증명 요청<br/>(container credentials 엔드포인트)
    Agent->>EKS: 이 Pod의 SA에 매핑된 Role 확인
    EKS->>STS: AssumeRole (+ 세션 태그)
    STS-->>EKS: 임시 자격증명
    EKS-->>Agent: 자격증명 전달
    Agent-->>Pod: 임시 자격증명
    Pod->>S3: 서명된 요청
    S3-->>Pod: 응답
```

Pod는 STS를 직접 부르지 않는다. 노드의 Agent가 링크로컬 주소로 자격증명 엔드포인트를 열어두고, SDK가 그쪽에서 자격증명을 받아 간다. 검증과 STS 호출은 EKS 서비스가 대신 처리한다.

### 설정 예시

```bash
# 1. Pod Identity Agent 애드온 설치 (클러스터당 1회)
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name eks-pod-identity-agent

# 2. SA와 Role을 매핑 (annotation 불필요)
aws eks create-pod-identity-association \
  --cluster-name my-cluster \
  --namespace data \
  --service-account s3-reader-sa \
  --role-arn arn:aws:iam::123456789012:role/s3-reader-role
```

SA는 특별할 게 없다.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader-sa
  namespace: data
```

신뢰 정책도 짧다.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "pods.eks.amazonaws.com" },
    "Action": ["sts:AssumeRole", "sts:TagSession"]
  }]
}
```

OIDC provider ARN도, 긴 `sub` 조건도 없다. 클러스터가 바뀌어도 이 신뢰 정책은 그대로다. 그래서 같은 Role을 여러 클러스터에서 재사용하기 쉽다 — 각 클러스터에서 association만 하나씩 만들면 된다.

`sts:TagSession`이 붙는 건 Pod Identity가 세션 태그를 자동으로 실어 주기 때문이다. 클러스터 이름, 네임스페이스, SA 이름 같은 값이 태그로 붙어서, IAM 정책에서 `aws:PrincipalTag/...` 조건으로 ABAC(태그 기반 접근 제어)를 걸 수 있다. IRSA에는 없던 기능이다.

## 두 방식 비교

| 항목 | IRSA | Pod Identity |
|---|---|---|
| 등장 시기 | 2019 | 2023 말 |
| 매핑 표현 | SA의 annotation | AWS API association |
| 신뢰 뿌리 | 클러스터별 OIDC provider | EKS 서비스(`pods.eks.amazonaws.com`) |
| 신뢰 정책 | OIDC ARN + `sub`/`aud` 조건 (길다) | 서비스 principal 한 줄 |
| 클러스터 준비 | OIDC provider 등록 필요 | Agent 애드온 설치 |
| Role 재사용 | 클러스터마다 신뢰 정책 수정 | association만 추가하면 됨 |
| 세션 태그(ABAC) | 없음 | 지원 |
| EKS Fargate | 지원 | 미지원 (Agent가 DaemonSet이라) |
| 비-EKS(온프렘 등) | OIDC 방식이라 응용 가능 | EKS 전용 |
| 최소 버전 | 넓게 호환 | EKS 1.24+, 최신 SDK 필요 |

큰 그림에서 선택 기준은 이렇다.

- 새 EKS 클러스터, 새 워크로드라면 **Pod Identity**를 기본으로 둔다. 설정이 단순하고 오설정 여지가 적다.
- **Fargate**를 쓰거나, EKS가 아닌 쿠버네티스거나, 아주 오래된 버전이면 **IRSA**를 써야 한다.
- 이미 IRSA로 잘 돌고 있는 클러스터를 급히 갈아엎을 이유는 없다. 신규 워크로드부터 Pod Identity로 붙이면서 점진적으로 옮기는 편이 무난하다.

보안 관점에서 보면 Pod Identity 쪽이 신뢰 정책이 단순해서 사람이 실수로 권한을 과하게 여는 위험이 줄어든다. 다만 어느 쪽을 쓰든 "SA 하나에 최소 권한 Role 하나"라는 원칙은 동일하게 지켜야 한다. 방식이 편해졌다고 Role 하나에 권한을 몰아 담으면 의미가 없다.

## 예제 1: S3 버킷 접근 제어

`data-lake-prod`라는 버킷의 `raw/` 경로만 읽는 Pod를 만든다고 하자. 권한 정책은 두 방식이 완전히 동일하다. 달라지는 건 SA와 Role을 잇는 부분뿐이다.

먼저 공통으로 쓸 권한 정책. 특정 버킷의 특정 프리픽스로만 범위를 좁힌다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListScopedToPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::data-lake-prod",
      "Condition": { "StringLike": { "s3:prefix": "raw/*" } }
    },
    {
      "Sid": "ReadObjectsUnderPrefix",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::data-lake-prod/raw/*"
    }
  ]
}
```

`ListBucket`은 버킷 ARN에, `GetObject`는 객체 ARN(`/raw/*`)에 걸어야 한다. 이 둘을 헷갈리면 목록은 되는데 다운로드가 안 되거나 그 반대가 된다.

### IRSA로 붙이기

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader-sa
  namespace: data
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3-reader-role
```

Role `s3-reader-role`에는 위 권한 정책을 붙이고, 신뢰 정책에는 `system:serviceaccount:data:s3-reader-sa`를 `sub` 조건으로 넣는다(앞의 IRSA 신뢰 정책 예시 그대로).

### Pod Identity로 붙이기

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader-sa
  namespace: data
```

```bash
aws eks create-pod-identity-association \
  --cluster-name my-cluster \
  --namespace data \
  --service-account s3-reader-sa \
  --role-arn arn:aws:iam::123456789012:role/s3-reader-role
```

Role의 권한 정책은 동일하고, 신뢰 정책만 `pods.eks.amazonaws.com` 형태로 둔다.

### Pod에서 확인

어느 방식이든 애플리케이션 코드는 그대로다. SDK가 자격증명을 알아서 찾는다.

```python
import boto3

s3 = boto3.client("s3")
obj = s3.get_object(Bucket="data-lake-prod", Key="raw/2026/07/events.parquet")
print(obj["Body"].read()[:100])
```

## 예제 2: MSK(Kafka) 접근 제어

MSK는 IAM 인증을 켜면 접근 제어가 S3와 결이 좀 다르다. `s3:*`처럼 서비스 액션을 쓰는 게 아니라 `kafka-cluster:*` 액션으로 클러스터 연결, 토픽 읽기/쓰기, 컨슈머 그룹 사용까지 IAM 정책으로 통제한다. 즉 Kafka ACL을 IAM 정책으로 대신 표현하는 셈이다.

`orders` 토픽을 읽는 컨슈머 Pod를 예로 든다. 권한 정책은 이렇게 생긴다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ConnectToCluster",
      "Effect": "Allow",
      "Action": ["kafka-cluster:Connect", "kafka-cluster:DescribeCluster"],
      "Resource": "arn:aws:kafka:ap-northeast-2:123456789012:cluster/prod-msk/*"
    },
    {
      "Sid": "ReadOrdersTopic",
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:DescribeTopic",
        "kafka-cluster:ReadData"
      ],
      "Resource": "arn:aws:kafka:ap-northeast-2:123456789012:topic/prod-msk/*/orders"
    },
    {
      "Sid": "UseConsumerGroup",
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:DescribeGroup",
        "kafka-cluster:AlterGroup"
      ],
      "Resource": "arn:aws:kafka:ap-northeast-2:123456789012:group/prod-msk/*/order-consumer-*"
    }
  ]
}
```

세 덩어리로 나뉜다. 클러스터에 붙는 권한, 토픽을 읽는 권한, 컨슈머 그룹을 쓰는 권한이다. 프로듀서라면 여기서 `ReadData` 대신 `WriteData`를 주고, 컨슈머 그룹 블록은 대개 필요 없다. 리소스 ARN에 토픽 이름과 그룹 이름 패턴을 넣어 딱 필요한 것만 열 수 있다는 점이 IAM 인증의 장점이다.

SA와 Role을 잇는 방법은 S3 예제와 완전히 같다. IRSA면 annotation, Pod Identity면 association. 권한 정책만 위 MSK 정책으로 바꿔 끼우면 된다.

클라이언트 쪽은 MSK IAM 인증용 라이브러리로 SASL 설정을 해줘야 한다. 이 라이브러리도 결국 SDK와 같은 경로로 자격증명을 집어오기 때문에, IRSA/Pod Identity가 주입한 임시 자격증명을 그대로 쓴다.

```properties
# Kafka client 설정 (aws-msk-iam-auth 사용)
security.protocol=SASL_SSL
sasl.mechanism=AWS_MSK_IAM
sasl.jaas.config=software.amazon.msk.auth.iam.IAMLoginModule required;
sasl.client.callback.handler.class=software.amazon.msk.auth.iam.IAMClientCallbackHandler
```

정리하면 MSK도 "SA ↔ Role 연결"은 S3와 똑같은 두 방식이고, 달라지는 건 Role에 붙이는 권한 정책이 `kafka-cluster:*` 액션이라는 점, 그리고 클라이언트에 SASL/IAM 설정이 필요하다는 점이다.

## 운영하면서 챙길 것들

몇 가지는 방식과 무관하게 공통으로 신경 써야 한다.

**SA 하나에 Role 하나.** 여러 워크로드가 SA를 공유하면 권한도 공유된다. 워크로드별로 SA를 쪼개고 각각 최소 권한 Role을 붙인다. 특히 `default` SA에는 아무 권한도 매핑하지 않는 게 안전하다.

**신뢰 정책과 권한 정책을 구분해서 본다.** 접근이 안 될 때 원인이 둘 중 어디인지부터 가른다. 신뢰 정책 문제면 애초에 Role assume 단계에서 막히고(`AccessDenied` on `AssumeRole...`), 권한 정책 문제면 assume은 됐는데 리소스 접근에서 막힌다. IRSA는 신뢰 정책 쪽 실수가, Pod Identity는 상대적으로 권한 정책 쪽 실수가 잦다.

**노드 Instance Role은 최소한으로.** IRSA/Pod Identity를 써도 노드 자체의 Instance Profile은 남아 있다. Pod가 자기 자격증명을 못 받으면 노드 권한으로 폴백하는 상황을 막으려면, 노드 Role에는 EKS 운영에 필요한 최소 권한만 두고 애플리케이션용 권한은 절대 얹지 않는다.

**감사.** 어느 방식이든 실제 API 호출은 CloudTrail에 assume 된 Role 세션으로 남는다. Pod Identity는 세션 태그에 네임스페이스와 SA가 실려서 "어느 Pod가 이 호출을 했는가"를 역추적하기가 IRSA보다 수월하다.

## 참고

- [IAM roles for service accounts (EKS 문서)](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [EKS Pod Identity (EKS 문서)](https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html)
- [IAM access control for Amazon MSK](https://docs.aws.amazon.com/msk/latest/developerguide/iam-access-control.html)
