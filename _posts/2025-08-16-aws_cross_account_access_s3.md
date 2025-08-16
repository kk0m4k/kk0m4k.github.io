---
title: "Cross Account S3 access using AssumeRole"
author: Francesco

layout: single
categories:
  - AWS

author_profile: true
tags:
  - AWS
  - AssumeRole
  - CrossAccount
---

# AWS Cross-Account S3 접근: IAM Role과 STS를 이용한 안전한 데이터 공유

여러 AWS 계정을 운영할 때, 특정 계정의 리소스(예: S3 버킷)를 다른 계정에서 안전하게 접근해야 하는 상황은 매우 흔합니다. 예를 들어, 여러 프로덕션 계정에서 발생하는 로그를 하나의 중앙 집중식 로깅 계정에 저장하는 경우가 대표적입니다.

이 글에서는 `kkom4k-prod` 계정의 리소스가 `kkom4k-shared-account` 계정에 있는 S3 버킷(`centralized-logging`)에 안전하게 접근하여 객체를 읽고 쓰는 방법을 IAM Role과 STS(Security Token Service)를 통해 단계별로 알아보겠습니다.

## 핵심 개념

1.  **IAM Role (역할):** 특정 권한을 가진 위임 가능한 자격 증명입니다. 사용자나 서비스에 직접 키를 발급하는 대신, 역할을 부여하여 필요한 권한을 동적으로 얻게 합니다.
2.  **신뢰 정책 (Trust Policy):** 이 역할을 **누가 수임(Assume)할 수 있는지** 정의하는 정책입니다. "나는 이 계정 또는 이 역할을 신뢰해"라고 선언하는 것과 같습니다.
3.  **권한 정책 (Permissions Policy):** 역할을 수임한 후 **무엇을 할 수 있는지** 정의하는 정책입니다. "S3 버킷에 파일을 쓸 수 있다"와 같은 구체적인 권한을 명시합니다.
4.  **STS (Security Token Service):** `AssumeRole` API 호출을 통해 임시 보안 자격 증명(Access Key, Secret Key, Session Token)을 발급해주는 서비스입니다. 이 임시 토큰을 사용하여 다른 계정의 리소스에 접근합니다.

## 아키텍처 및 인증 흐름

전체적인 흐름은 다음과 같습니다.

```
          [kkom4k-prod Account]                                  [kkom4k-shared-account Account]
┌───────────────────────────────────────────┐                  ┌──────────────────────────────────────────────┐
│                                           │                  │                                              │
│  ┌───────────┐        (1) AssumeRole      │                  │  ┌──────────────────────────┐                │
│  │ EC2/Lambda│  ───────────────────────────►  [ AWS STS ]  ◄───  │ IAM Role                 │ (2) Trust Policy │
│  │(s3-logging)│       w/ Role ARN         │                  │  │(CentralizedLoggingRole)  │     Check      │
│  └───────────┘                            │                  │  └──────────────────────────┘                │
│        ▲                                  │                  │                  │                           │
│        │                                  │                  │                  │ (3) Permissions Policy    │
│        │ (4) Temporary Credentials        │                  │                  ▼                           │
│        └───────────────────────────────────   [ AWS STS ]      │  ┌──────────────────────────┐                │
│                                           │                  │  │ S3 Bucket                │                │
│  ┌───────────┐        (5) S3 API Call     │                  │  │(centralized-logging)     │                │
│  │ EC2/Lambda│  ───────────────────────────►                  └──────────────────────────┘                │
│  │(s3-logging)│  w/ Temp Credentials      │                                                                │
│  └───────────┘                            │                                                                │
│                                           │                                                                │
└───────────────────────────────────────────┘                  └──────────────────────────────────────────────┘
```

1.  **AssumeRole 요청:** `kkom4k-prod` 계정의 EC2 인스턴스(또는 다른 리소스)가 `s3-logging` 역할을 통해 `kkom4k-shared-account`의 `CentralizedLoggingRole`을 수임하겠다고 AWS STS에 요청합니다.
2.  **신뢰 정책 확인:** STS는 `CentralizedLoggingRole`의 신뢰 정책을 확인하여 `kkom4k-prod` 계정의 `s3-logging` 역할이 이 요청을 보낼 자격이 있는지 검증합니다.
3.  **임시 자격 증명 발급:** 신뢰 관계가 확인되면, STS는 `CentralizedLoggingRole`에 연결된 권한 정책(S3 읽기/쓰기)을 바탕으로 임시 자격 증명을 발급합니다.
4.  **자격 증명 수신:** `kkom4k-prod`의 EC2 인스턴스는 이 임시 자격 증명을 수신합니다.
5.  **S3 API 호출:** EC2 인스턴스는 발급받은 임시 자격 증명을 사용하여 `kkom4k-shared-account`의 `centralized-logging` 버킷에 API를 호출하여 객체를 업로드하거나 다운로드합니다.

---

## 1단계: kkom4k-shared-account 설정 (리소스 소유자)

먼저 S3 버킷과 다른 계정이 수임할 IAM 역할을 생성합니다.

### 1.1. S3 버킷 생성

*   `centralized-logging`이라는 이름으로 S3 버킷을 생성합니다.

### 1.2. IAM 역할 생성

`CentralizedLoggingRole`이라는 이름으로 IAM 역할을 생성합니다.

#### 가. 신뢰 정책 (Trust Policy)

이 역할은 `kkom4k-prod` 계정의 `s3-logging` 역할만 수임할 수 있도록 신뢰 관계를 설정합니다. 이는 가장 안전한 방법입니다.

*   **`{PROD_ACCOUNT_ID}`**는 `kkom4k-prod` 계정의 12자리 AWS 계정 ID로 변경해야 합니다.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::{PROD_ACCOUNT_ID}:role/s3-logging"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

#### 나. 권한 정책 (Permissions Policy)

이 역할을 수임했을 때 `centralized-logging` 버킷에 대해 어떤 작업을 할 수 있는지 권한을 부여합니다.

`CentralizedLoggingS3Access`와 같은 이름으로 정책을 생성하여 역할에 연결합니다.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::centralized-logging/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::centralized-logging"
        }
    ]
}
```

---

## 2단계: kkom4k-prod 설정 (접근 요청자)

이제 `kkom4k-shared-account`의 역할을 수임할 수 있는 권한을 가진 역할을 생성합니다.

### 2.1. IAM 역할 생성

`s3-logging`이라는 이름으로 IAM 역할을 생성합니다. 이 역할은 EC2 인스턴스나 Lambda 같은 AWS 서비스에 부여될 것입니다.

#### 가. 권한 정책 (Permissions Policy)

이 역할에는 `kkom4k-shared-account`의 `CentralizedLoggingRole`을 수임할 수 있는 `sts:AssumeRole` 권한만 부여하면 됩니다.

*   **`{SHARED_ACCOUNT_ID}`**는 `kkom4k-shared-account`의 12자리 AWS 계정 ID로 변경해야 합니다.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "sts:AssumeRole",
            "Resource": "arn:aws:iam::{SHARED_ACCOUNT_ID}:role/CentralizedLoggingRole"
        }
    ]
}
```

이 정책을 역할에 연결한 후, `s3-logging` 역할을 로그를 전송할 EC2 인스턴스의 **인스턴스 프로파일**에 연결합니다.

---

## 3단계: 샘플 코드를 통한 접근

이제 모든 설정이 완료되었습니다. 실제로 어떻게 접근하는지 AWS CLI와 Python Boto3 코드를 통해 알아보겠습니다.

### 3.1. AWS CLI를 이용한 접근

AWS CLI는 프로파일 설정을 통해 역할 체이닝을 매우 쉽게 지원합니다. `~/.aws/config` 파일을 다음과 같이 수정합니다.

```ini
[profile prod-user]
# 이 프로파일은 kkom4k-prod 계정의 IAM 사용자 자격증명
aws_access_key_id = YOUR_PROD_ACCESS_KEY
aws_secret_access_key = YOUR_PROD_SECRET_KEY
region = ap-northeast-2

[profile shared-s3-access]
# 이 프로파일은 prod-user의 자격증명을 사용하여 역할을 수임
source_profile = prod-user
role_arn = arn:aws:iam::{SHARED_ACCOUNT_ID}:role/CentralizedLoggingRole
region = ap-northeast-2
```

이제 `shared-s3-access` 프로파일을 사용하여 `centralized-logging` 버킷에 접근할 수 있습니다.

```bash
# centralized-logging 버킷의 객체 목록 보기
aws s3 ls s3://centralized-logging --profile shared-s3-access

# 파일 업로드
echo "hello cross account" > test.txt
aws s3 cp test.txt s3://centralized-logging/test.txt --profile shared-s3-access
```

### 3.2. Python (Boto3)를 이용한 접근

EC2 인스턴스 프로파일에 `s3-logging` 역할이 연결되어 있다면 코드는 훨씬 간단해집니다. Boto3가 자동으로 인스턴스 메타데이터를 통해 역할을 수임하고 임시 자격 증명을 관리하기 때문입니다.

```python
import boto3

# 1. STS 클라이언트를 사용하여 다른 계정의 역할을 수임합니다.
sts_client = boto3.client('sts')

# kkom4k-shared-account의 역할 ARN
role_to_assume_arn = 'arn:aws:iam::{SHARED_ACCOUNT_ID}:role/CentralizedLoggingRole'

# AssumeRole API 호출
response = sts_client.assume_role(
    RoleArn=role_to_assume_arn,
    RoleSessionName='MyCrossAccountSession' # 세션 이름은 자유롭게 지정
)

# 임시 자격 증명 추출
temp_credentials = response['Credentials']

# 2. 임시 자격 증명을 사용하여 S3 클라이언트를 생성합니다.
s3_client = boto3.client(
    's3',
    aws_access_key_id=temp_credentials['AccessKeyId'],
    aws_secret_access_key=temp_credentials['SecretAccessKey'],
    aws_session_token=temp_credentials['SessionToken'],
)

# 3. 생성된 S3 클라이언트로 다른 계정의 버킷에 접근합니다.
bucket_name = 'centralized-logging'
file_content = 'This is a test log from kkom4k-prod.'
file_key = 'logs/prod-log-01.txt'

try:
    # 파일 업로드
    s3_client.put_object(Bucket=bucket_name, Key=file_key, Body=file_content)
    print(f"Successfully uploaded {file_key} to {bucket_name}")

    # 파일 다운로드 및 내용 확인
    response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
    content = response['Body'].read().decode('utf-8')
    print(f"Successfully downloaded {file_key}. Content: '{content}'")

except Exception as e:
    print(f"An error occurred: {e}")

```
> **참고:** 위 Python 코드는 로컬 환경에서 실행하는 예제입니다. 만약 `s3-logging` 역할이 부여된 EC2 인스턴스 내부에서 실행한다면, Boto3가 자동으로 자격 증명을 관리하므로 `sts_client.assume_role` 호출 없이 바로 `boto3.client('s3')`를 사용하여 S3에 접근할 수 있습니다. (단, 이 경우 EC2 역할의 권한 정책에 `sts:AssumeRole`이 아니라 직접 S3 권한을 부여해야 합니다. 하지만 Cross-Account 시나리오에서는 `AssumeRole` 방식이 정석입니다.)

## 결론

AWS IAM 역할과 STS를 이용한 Cross-Account 접근은 보안 키를 코드에 하드코딩하거나 여러 계정에 동일한 사용자를 생성할 필요 없이, 중앙에서 권한을 관리하고 최소 권한 원칙을 지킬 수 있는 매우 강력하고 안전한 방법입니다. 초기 설정이 다소 복잡하게 느껴질 수 있지만, 한번 구축해두면 AWS 환경의 보안과 관리 효율성을 크게 높일 수 있습니다.
