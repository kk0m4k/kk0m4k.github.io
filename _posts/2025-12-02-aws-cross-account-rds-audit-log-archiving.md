--- 
layout: single
title: "📜 AWS 교차 계정을 활용한 RDS Audit Log 중앙 관리 아키텍처 구축하기"
date: 2025-12-02 10:00:00 +0900
categories:
  - aws
tags:
  - aws
  - cloudwatch
  - firehose
---

👋 오늘은 여러 AWS 계정에 분산된 RDS 데이터베이스의 감사 로그(Audit Log)를 중앙 로깅 계정으로 안전하고 효율적으로 수집하여 아카이빙하는 방법에 대한 내용을  담고 있습니다. 이 아키텍처는 컴플라이언스 요구사항 충족, 보안 모니터링 강화, 그리고 사후 분석 및 감사 대응에 매우 중요합니다.

## 🚀 왜 중앙 로깅이 필요한가요?

기업 환경에서는 여러 개의 AWS 계정을 운영하는 경우가 많습니다. (e.g., Prod, Dev, Staging) 각 계정의 리소스에서 생성되는 로그를 개별적으로 관리하는 것은 비효율적이며 보안에 허점을 만들 수 있습니다.

-   **📜 컴플라이언스 준수**: PCI-DSS, HIPAA, SOX 등 많은 규제 및 표준에서는 로그 데이터의 장기 보관 및 무결성 유지를 요구합니다. 중앙화된 로깅은 이를 체계적으로 관리할 수 있게 해줍니다.
-   **🔒 보안 모니터링 및 탐지**: 분산된 로그를 한 곳에서 통합 분석함으로써, 비정상적인 접근 시도나 내부자 위협 같은 보안 이벤트를 더 빠르고 정확하게 탐지할 수 있습니다.
-   **🕵️‍♀️ 신속한 사후 조사**: 장애 발생이나 보안 사고 시, 관련된 모든 로그가 한곳에 모여있다면 원인 분석과 영향도 파악에 걸리는 시간을 크게 단축할 수 있습니다.

## 🏗️ 아키텍처 개요

오늘 우리가 구축할 아키텍처의 데이터 흐름은 다음과 같습니다.

1.  **PROD 계정**: 운영 RDS 인스턴스에서 생성된 Audit Log가 CloudWatch Logs 그룹으로 전송됩니다.
2.  **CloudWatch 구독 필터**: PROD 계정의 CloudWatch Logs 그룹에 구독 필터(Subscription Filter)를 생성합니다. 이 필터는 특정 패턴의 로그를 실시간으로 스트리밍합니다.
3.  **Cross-Account Role & Destination**: 구독 필터는 PROD 계정의 IAM Role을 사용하여 `centralized-Logarchive` (중앙 로깅) 계정에 있는 CloudWatch Log Destination으로 로그를 전송합니다.
4.  **Amazon Data Firehose**: Log Destination은 수신된 로그를 Amazon Data Firehose로 전달합니다.
5.  **S3 버킷 저장**: Firehose는 버퍼링, 압축, 변환 등의 처리를 거쳐 최종적으로 중앙 로깅 계정의 S3 버킷에 로그를 저장합니다. 이때, `연/월/일/시` 형태의 파티셔닝을 적용하여 데이터 조회 효율성을 높입니다.

### Mermaid 다이어그램

```mermaid
graph TD
    subgraph kk0m4k-PROD Account
        A[RDS Instance] -- Audit Log --> B(CloudWatch Log Group);
        B -- Subscription Filter --> C{IAM Role for CWL};
    end

    subgraph centralized-Logarchive Account
        E(CloudWatch Log Destination<br>cwl-destination-logarchive) -- IAM Policy --> F(Amazon Data Firehose<br>firehose-to-s3);
        F -- IAM Role for Firehose --> G[S3 Bucket<br>centralized-rds-audit-log-s3];
    end

    C -- STS AssumeRole & PutLogEvents --> E;

    style A fill:#D4A7B0,stroke:#333,stroke-width:2px
    style B fill:#C1E1C1,stroke:#333,stroke-width:2px
    style F fill:#FDFD96,stroke:#333,stroke-width:2px
    style G fill:#AEC6CF,stroke:#333,stroke-width:2px
end
```

## 🛠️ 단계별 구축 가이드 (AWS CLI)

이제 AWS CLI를 사용하여 각 구성 요소를 단계별로 생성해 보겠습니다.

**변수 설정**: CLI 명령어를 실행하기 전에, 자신의 환경에 맞게 아래 변수들을 설정해주세요.

```bash
# Centralized Log Archive Account
export LOG_ARCHIVE_ACCOUNT_ID="<CENTRALIZED_LOG_ARCHIVE_ACCOUNT_ID>"
export LOG_ARCHIVE_REGION="ap-northeast-2"

# Production Account
export PROD_ACCOUNT_ID="<PRODUCTION_ACCOUNT_ID>"
export PROD_REGION="ap-northeast-2"

# Resource Names
export S3_BUCKET_NAME="centralized-rds-audit-log-s3"
export FIREHOSE_NAME="firehose-to-s3"
export CWL_DESTINATION_NAME="cwl-destination-logarchive"
export RDS_LOG_GROUP_NAME="/aws/rds/instance/your-rds-instance/audit"
```

---

### 단계 1: Centralized Log Archive 계정 설정 (`centralized-Logarchive`)

먼저 로그를 최종적으로 저장하고 처리할 중앙 로깅 계정의 리소스를 생성합니다.

#### 1.1. S3 버킷 생성

Firehose가 로그를 저장할 S3 버킷을 생성합니다.

```bash
aws s3api create-bucket \
    --bucket ${S3_BUCKET_NAME} \
    --region ${LOG_ARCHIVE_REGION} \
    --create-bucket-configuration LocationConstraint=${LOG_ARCHIVE_REGION} \
    --profile log-archive-profile # 중앙 계정 프로필
```

#### 1.2. Firehose를 위한 IAM Role 및 Policy 생성

Firehose가 S3 버킷에 데이터를 쓸 수 있도록 허용하는 IAM 역할이 필요합니다.

**Policy JSON (`firehose-s3-policy.json`):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:AbortMultipartUpload",
                "s3:GetBucketLocation",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:ListBucketMultipartUploads",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::${S3_BUCKET_NAME}",
                "arn:aws:s3:::${S3_BUCKET_NAME}/*"
            ]
        }
    ]
}
```

**Trust Policy JSON (`firehose-trust-policy.json`):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "firehose.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

**CLI 명령어:**
```bash
# Policy 내용 파일에 맞게 수정
sed -i.bak "s/">${S3_BUCKET_NAME}/${S3_BUCKET_NAME}/g" firehose-s3-policy.json

# IAM Role 생성
aws iam create-role \
    --role-name Firehose-S3-Role \
    --assume-role-policy-document file://firehose-trust-policy.json \
    --profile log-archive-profile

# IAM Policy 생성 및 연결
FIREHOSE_POLICY_ARN=$(aws iam create-policy \
    --policy-name Firehose-S3-Policy \
    --policy-document file://firehose-s3-policy.json \
    --query 'Policy.Arn' --output text \
    --profile log-archive-profile)

aws iam attach-role-policy \
    --role-name Firehose-S3-Role \
    --policy-arn ${FIREHOSE_POLICY_ARN} \
    --profile log-archive-profile
```

#### 1.3. Amazon Data Firehose 생성

S3로 데이터를 전송할 Firehose Delivery Stream을 생성합니다. `YYYY/MM/DD/HH` 형식의 파티셔닝을 설정하는 것이 핵심입니다.

```bash
FIREHOSE_ROLE_ARN="arn:aws:iam::${LOG_ARCHIVE_ACCOUNT_ID}:role/Firehose-S3-Role"
S3_BUCKET_ARN="arn:aws:s3:::${S3_BUCKET_NAME}"

aws firehose create-delivery-stream \
    --delivery-stream-name ${FIREHOSE_NAME} \
    --delivery-stream-type DirectPut \
    --extended-s3-destination-configuration '{
        "RoleARN": "'${FIREHOSE_ROLE_ARN}'",
        "BucketARN": "'${S3_BUCKET_ARN}'",
        "Prefix": "audit-logs/!{timestamp:yyyy}/!{timestamp:MM}/!{timestamp:dd}/!{timestamp:HH}/",
        "ErrorOutputPrefix": "error-logs/!{firehose:error-output-type}/!{timestamp:yyyy}/!{timestamp:MM}/!{timestamp:dd}/",
        "BufferingHints": {
            "IntervalInSeconds": 300,
            "SizeInMBs": 5
        },
        "CompressionFormat": "GZIP"
    }' \
    --region ${LOG_ARCHIVE_REGION} \
    --profile log-archive-profile
```

#### 1.4. CloudWatch Log Destination 생성

PROD 계정의 CloudWatch Logs가 데이터를 보낼 수 있는 엔드포인트인 Log Destination을 생성합니다.

```bash
FIREHOSE_DESTINATION_ARN="arn:aws:firehose:${LOG_ARCHIVE_REGION}:${LOG_ARCHIVE_ACCOUNT_ID}:deliverystream/${FIREHOSE_NAME}"

aws logs put-destination \
    --destination-name ${CWL_DESTINATION_NAME} \
    --target-arn ${FIREHOSE_DESTINATION_ARN} \
    --role-arn ${FIREHOSE_ROLE_ARN} \
    --region ${LOG_ARCHIVE_REGION} \
    --profile log-archive-profile
```

#### 1.5. Log Destination에 대한 권한 정책 설정

PROD 계정(`kk0m4k-PROD`)이 이 Log Destination으로 로그를 보낼 수 있도록 허용하는 정책을 설정합니다.

**Destination Policy JSON (`destination-policy.json`):**
```json
{
  "Version" : "2012-10-17",
  "Statement" : [
    {
      "Effect" : "Allow",
      "Principal" : {
        "AWS" : "${PROD_ACCOUNT_ID}"
      },
      "Action" : "logs:PutSubscriptionFilter",
      "Resource" : "arn:aws:logs:${LOG_ARCHIVE_REGION}:${LOG_ARCHIVE_ACCOUNT_ID}:destination:${CWL_DESTINATION_NAME}"
    }
  ]
}
```

**CLI 명령어:**
```bash
# Policy 내용 파일에 맞게 수정
LOG_DESTINATION_ARN="arn:aws:logs:${LOG_ARCHIVE_REGION}:${LOG_ARCHIVE_ACCOUNT_ID}:destination:${CWL_DESTINATION_NAME}"
sed -i.bak "s/">${PROD_ACCOUNT_ID}/${PROD_ACCOUNT_ID}/g" destination-policy.json
sed -i.bak "s,">${LOG_ARCHIVE_REGION},${LOG_ARCHIVE_REGION},g" destination-policy.json
sed -i.bak "s,">${LOG_ARCHIVE_ACCOUNT_ID},${LOG_ARCHIVE_ACCOUNT_ID},g" destination-policy.json
sed -i.bak "s,">${CWL_DESTINATION_NAME},${CWL_DESTINATION_NAME},g" destination-policy.json

# 정책 적용
aws logs put-destination-policy \
    --destination-name ${CWL_DESTINATION_NAME} \
    --access-policy file://destination-policy.json \
    --region ${LOG_ARCHIVE_REGION} \
    --profile log-archive-profile
```

---

### 단계 2: PROD 계정 설정 (`kk0m4k-PROD`)

이제 로그를 생성하는 PROD 계정에서 중앙 로깅 계정으로 로그를 보낼 설정을 합니다.

#### 2.1. CloudWatch Logs 구독을 위한 IAM Role 생성

CloudWatch Logs가 중앙 로깅 계정의 Destination으로 로그를 스트리밍할 때 사용할 IAM Role을 생성합니다.

**Trust Policy JSON (`cwl-trust-policy.json`):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "logs.ap-northeast-2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```
*주의: `Principal`의 `Service`는 로그 그룹이 위치한 리전에 맞게 `logs.<region>.amazonaws.com` 형식으로 지정해야 합니다.*

**Permission Policy JSON (`cwl-permission-policy.json`):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "logs:PutLogEvents",
            "Resource": "arn:aws:logs:${LOG_ARCHIVE_REGION}:${LOG_ARCHIVE_ACCOUNT_ID}:destination:${CWL_DESTINATION_NAME}"
        }
    ]
}
```

**CLI 명령어:**
```bash
# Policy 내용 파일에 맞게 수정
sed -i.bak "s/">${LOG_ARCHIVE_REGION}/${LOG_ARCHIVE_REGION}/g" cwl-permission-policy.json
sed -i.bak "s/">${LOG_ARCHIVE_ACCOUNT_ID}/${LOG_ARCHIVE_ACCOUNT_ID}/g" cwl-permission-policy.json
sed -i.bak "s/">${CWL_DESTINATION_NAME}/${CWL_DESTINATION_NAME}/g" cwl-permission-policy.json

# IAM Role 생성
aws iam create-role \
    --role-name CWL-to-CrossAccount-Destination-Role \
    --assume-role-policy-document file://cwl-trust-policy.json \
    --profile prod-profile # PROD 계정 프로필

# IAM Policy 생성 및 연결
CWL_POLICY_ARN=$(aws iam create-policy \
    --policy-name CWL-to-CrossAccount-Destination-Policy \
    --policy-document file://cwl-permission-policy.json \
    --query 'Policy.Arn' --output text \
    --profile prod-profile)

aws iam attach-role-policy \
    --role-name CWL-to-CrossAccount-Destination-Role \
    --policy-arn ${CWL_POLICY_ARN} \
    --profile prod-profile
```

#### 2.2. CloudWatch Log Group에 구독 필터 생성 ✅

마지막으로, PROD 계정의 RDS Audit Log 그룹에 구독 필터를 생성하여 모든 설정을 연결합니다.

```bash
LOG_DESTINATION_ARN="arn:aws:logs:${LOG_ARCHIVE_REGION}:${LOG_ARCHIVE_ACCOUNT_ID}:destination:${CWL_DESTINATION_NAME}"
CWL_ROLE_ARN="arn:aws:iam::${PROD_ACCOUNT_ID}:role/CWL-to-CrossAccount-Destination-Role"

aws logs put-subscription-filter \
    --log-group-name ${RDS_LOG_GROUP_NAME} \
    --filter-name "rds-auditlog-firehose-filter" \
    --filter-pattern "" \
    --destination-arn "${LOG_DESTINATION_ARN}" \
    --role-arn "${CWL_ROLE_ARN}" \
    --region ${PROD_REGION} \
    --profile prod-profile
```
*`filter-pattern`을 `""` (공백)으로 설정하면 모든 로그가 전송됩니다. 특정 키워드가 포함된 로그만 보내려면 패턴을 지정할 수.*