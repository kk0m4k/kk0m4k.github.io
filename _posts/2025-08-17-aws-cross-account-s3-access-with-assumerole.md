---
title: "AWS 다중 계정 환경에서 AssumeRole을 사용하여 안전하게 S3에 접근하기"
date: 2025-08-17 10:00:00 +0900
categories: aws
tags: [aws, iam, sts, assumerole]
---

## Using AssumeRole in an AWS Multi-Account Environment

많은 기업들이 AWS를 사용하면서 보안 강화, 비용 분리, 장애 영향 범위 최소화 등을 위해 여러 개의 AWS 계정을 운영하는 '다중 계정(Multi-Account)' 전략을 채택합니다. 예를 들어, 다음과 같은 구조를 흔히 볼 수 있습니다.

-   **`kkom4k-prod` (프로덕션 계정):** 실제 서비스가 운영되는 계정
-   **`kkom4k-dev` (개발 계정):** 개발 및 테스트 환경을 위한 계정
-   **`kkom4k-mgmt` (관리 계정):** 여러 계정의 로그를 중앙에서 수집하거나, 보안 감사를 수행하고, CI/CD 파이프라인을 관리하는 중앙 허브 계정

이런 환경에서 다음과 같은 요구사항이 생깁니다.

> "중앙 관리(`kkom4k-mgmt`) 계정에서 프로덕션(`kkom4k-prod`) 계정에 있는 S3 버킷(`centralized-log`)의 로그 파일을 주기적으로 읽어와 분석하고 싶다."
근
이때 가장 간단하지만 **절대 사용해서는 안 되는 방법**은 프로덕션 계정에 IAM 사용자를 만들고 Access Key를 발급받아 관리 계정의 서버에 저장하는 것입니다. 이는 Access Key 유출 시 프로덕션 계정이 직접적인 위협에 노출되는 심각한 보안 취약점을 야기합니다.

AWS는 이러한 문제를 해결하기 위해 **`sts:AssumeRole`**이라는 안전한 메커니즘을 제공합니다. `AssumeRole`은 한 계정의 IAM 주체(사용자 또는 역할)가 다른 계정의 역할(Role)을 잠시 '빌려 입고' 해당 역할의 권한으로 작업을 수행하도록 허용합니다. 이 과정에서 장기적인 자격 증명(Access Key) 대신, 짧은 시간 동안만 유효한 **임시 자격 증명**을 사용하므로 보안이 크게 향상됩니다.

이 글에서는 `kkom4k-mgmt` 계정에서 `kkom4k-prod` 계정의 역할을 AssumeRole 한 뒤, Boto3를 사용하여 S3 버킷의 객체 목록을 조회하는 전체 과정과 실제 코드를 상세히 다룹니다.

## 1. IAM 설정: 신뢰의 기반 다지기

먼저 두 계정에 AssumeRole을 위한 IAM 역할과 정책을 설정해야 합니다.

### 1) `kkom4k-prod` 계정 (리소스 소유 계정)

S3 버킷과 다른 계정이 수임할 역할을 생성합니다.

#### 권한 정책 (Permissions Policy)
이 역할이 최종적으로 수행할 작업을 정의합니다. 여기서는 `centralized-log` 버킷을 조회하는 권한을 부여합니다.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::centralized-log"
        }
    ]
}
```

#### 신뢰 정책 (Trust Policy)
어떤 주체가 이 역할을 수임할 수 있는지 정의합니다. `kkom4k-mgmt` 계정에게 역할을 빌려줄 것을 명시합니다.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::MGMT_ACCOUNT_ID:root"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```
> **참고:** `MGMT_ACCOUNT_ID`는 `kkom4k-mgmt`의 실제 AWS 계정 ID로 변경해야 합니다. `Principal`을 특정 IAM 역할로 제한하면 더 안전합니다.

### 2) `kkom4k-mgmt` 계정 (중앙 관리 계정)

`kkom4k-prod` 계정의 역할을 수임할 권한을 가진 IAM 정책을 생성하고, 이를 사용자나 EC2 역할에 연결합니다.

#### 권한 정책 (Permissions Policy)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "sts:AssumeRole",
            "Resource": "arn:aws:iam::PROD_ACCOUNT_ID:role/ProdS3AccessRole"
        }
    ]
}
```
> **참고:** `PROD_ACCOUNT_ID`는 `kkom4k-prod`의 실제 AWS 계정 ID로, `ProdS3AccessRole`은 위에서 생성한 역할의 이름으로 변경해야 합니다.

## 2. 프로세스 흐름도

IAM 설정이 완료되면, 실제 작업은 다음과 같은 흐름으로 진행됩니다.

1.  **`kkom4k-mgmt`** 계정의 IAM 주체가 AWS STS(Security Token Service)에 `kkom4k-prod` 계정 역할의 ARN을 전달하며 `AssumeRole`을 요청합니다.
2.  **AWS STS**는 요청이 유효한지(`kkom4k-prod` 역할의 신뢰 정책 확인) 검증합니다.
3.  검증 완료 시, STS는 `kkom4k-prod` 역할의 권한을 가진 **임시 자격 증명**(Access Key, Secret Key, Session Token)을 발급합니다.
4.  `kkom4k-mgmt`의 애플리케이션은 이 **임시 자격 증명**을 사용하여 S3 클라이언트를 초기화합니다.
5.  새로 생성된 S3 클라이언트로 `kkom4k-prod`의 `centralized-log` 버킷에 API 요청을 보냅니다.
6.  `kkom4k-prod`의 S3 서비스는 요청에 담긴 임시 자격 증명이 유효한지 확인하고, 버킷의 객체 목록을 반환합니다.

## 3. 전체 흐름 다이어그램

```text
+-------------------------------------------+         +------------------------------------------+
|         kkom4k-mgmt (Management)          |         |         kkom4k-prod (Production)         |
|-------------------------------------------|         |------------------------------------------|
|                                           |         |                                          |
|  [IAM User/Role]                          |         |  [IAM Role: ProdS3AccessRole]            |
|  - sts:AssumeRole policy                  |         |  - s3:ListBucket policy                  |
|                                           |         |  - Trusts kkom4k-mgmt                    |
|      │                                    |         |      ▲                                   |
|      │ 1. AssumeRole(ProdS3AccessRole)    |         |      │ 2. Validate Trust Policy          |
|      │                                    |         |      │                                   |
|      ▼                                    |         |      │                                   |
|  +------------------+                     |         |  +------------------+                    |
|  |      AWS STS     | ◀-------------------(Request)---+      AWS STS     |                    |
|  +------------------+                     |         |  +------------------+                    |
|      │                                    |         |                                          |
|      │ 3. Return Temporary Credentials    |         |                                          |
|      │    (AccessKey, SecretKey, Token)   |         |                                          |
|      ▼                                    |         |                                          |
|  [Boto3 App]                              |         |                                          |
|  - Creates S3 client with temp creds      |         |                                          |
|      │                                    |         |                                          |
|      │ 5. ListObjectsV2(centralized-log)  |         |                                          |
|      │    (using temp credentials)         |         |      ▲ 6. Validate Permissions         |
|      └-------------------------------------(API Call)--> [S3: centralized-log]                 |
|                                           |         |      │                                   |
|                                           |         |      │ 7. Return Object List             |
|      ◀-------------------------------------(Response)----┘                                   |
|                                           |         |                                          |
+-------------------------------------------+         +------------------------------------------+
```

## 4. Boto3 파이썬 코드 예제

이제 실제 파이썬 코드를 살펴보겠습니다. 이 코드는 네트워크 불안정성에 대비하여 **10번의 재시도(Retry) 로직**을 포함하고 있습니다.

```python
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# --- 설정 값 (사용자 환경에 맞게 변경) ---
PROD_ACCOUNT_ID = "YOUR_PROD_ACCOUNT_ID"  # kkom4k-prod 계정 ID
PROD_ROLE_NAME = "ProdS3AccessRole"       # kkom4k-prod 계정의 역할 이름
TARGET_BUCKET = "centralized-log"         # kkom4k-prod 계정의 버킷 이름
TARGET_REGION = "ap-northeast-2"          # 대상 버킷이 있는 리전

# 1. Backoff 알고리즘을 사용하는 재시도 설정
# Boto3의 표준(standard) 재시도 모드를 사용하고, 최대 시도 횟수를 10으로 설정
retry_config = Config(
    region_name=TARGET_REGION,
    retries={
        'max_attempts': 10,
        'mode': 'standard'
    }
)

# 2. STS 클라이언트를 생성하고 AssumeRole 호출
try:
    print(f"Attempting to assume role: arn:aws:iam::{PROD_ACCOUNT_ID}:role/{PROD_ROLE_NAME}")
    
    # 현재 환경의 기본 자격증명으로 STS 클라이언트 생성
    sts_client = boto3.client('sts')
    
    assumed_role_object = sts_client.assume_role(
        RoleArn=f"arn:aws:iam::{PROD_ACCOUNT_ID}:role/{PROD_ROLE_NAME}",
        RoleSessionName="MgmtS3AccessSession"  # 감사 로그에 남는 세션 이름
    )
    
    # 임시 자격 증명 추출
    temp_credentials = assumed_role_object['Credentials']
    
    print("Successfully assumed role.")

except ClientError as error:
    print(f"Failed to assume role. Error: {error}")
    exit()

# 3. 임시 자격 증명과 Retry 설정을 사용하여 S3 클라이언트 생성
try:
    s3_client_assumed_role = boto3.client(
        's3',
        aws_access_key_id=temp_credentials['AccessKeyId'],
        aws_secret_access_key=temp_credentials['SecretAccessKey'],
        aws_session_token=temp_credentials['SessionToken'],
        config=retry_config
    )
    
    print(f"
Listing objects in bucket '{TARGET_BUCKET}' with assumed role...")

    # 4. S3 버킷 객체 목록 조회
    response = s3_client_assumed_role.list_objects_v2(Bucket=TARGET_BUCKET)
    
    if 'Contents' in response:
        print("Found objects:")
        for obj in response['Contents']:
            print(f"- {obj['Key']} (Size: {obj['Size']} bytes)")
    else:
        print("Bucket is empty or no objects found.")

except ClientError as error:
    print(f"Failed to list objects in bucket '{TARGET_BUCKET}'. Error: {error}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")

```

## 참고 자료 (References)

-   [자습서: IAM 역할을 사용하여 AWS 계정 간에 액세스 권한 위임 (AWS 공식 문서)](https://docs.aws.amazon.com/ko_kr/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html)
-   [IAM 역할 (AWS 공식 문서)](https://docs.aws.amazon.com/ko_kr/IAM/latest/UserGuide/id_roles.html)
-   [STS AssumeRole API 참조 (AWS 공식 문서)](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
-   [Boto3 자격 증명(Credentials) 가이드 (공식)](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html)
