---
title: "AWS API Rate Limit(Throttling) 이해"
author: Francesco

layout: single
categories:
  - aws

author_profile: true
tags:
  - AWS
  - RateLimit
---

# AWS API 호출이 실패하나요? Boto3의 Throttling과 Rate Limit 이해하기

AWS 작업을 자동화하기 위해 `boto3`를 사용하다 보면, 특히 많은 리소스를 한 번에 처리하는 스크립트에서 `ThrottlingException` 또는 `RateExceeded`와 같은 에러를 마주칠 때가 있습니다. 이는 AWS가 의도적으로 설정한 보호 장치 때문입니다.

AWS가 왜 이러한 제한을 두었는지, 어떻게 동작하는지, 그리고 `boto3`를 사용하여 이 문제를 얼마나 스마트하게 해결할 수 있는지 알아보겠습니다.

### 1. 왜 AWS는 API 호출을 제한(Rate Limit)할까요?

AWS가 API 호출 속도를 제한하는 데에는 두 가지 주된 이유가 있습니다.

*   **서비스 안정성 및 성능 유지:** 특정 사용자나 애플리케이션이 비정상적으로 많은 요청을 보내 AWS 서비스 전체의 성능과 안정성에 영향을 주는 것을 방지합니다. 모든 고객에게 공평하고 안정적인 서비스를 제공하기 위한 필수적인 조치입니다.
*   **의도치 않은 과용 방지:** 사용자의 실수로 작성된 코드가 무한 루프에 빠져 엄청난 수의 API를 호출하고, 이로 인해 의도치 않은 과금이 발생하는 것을 막아주는 보호 기능의 역할도 합니다.

### 2. Throttling은 어떻게 적용되나요?

AWS의 Rate Limit, 즉 Throttling은 대부분의 서비스에서 **계정(Account)과 리전(Region)의 조합**을 기준으로 적용됩니다.

예를 들어, 여러분의 AWS 계정이 서울 리전(`ap-northeast-2`)에서 EC2 인스턴스 목록을 조회하는 `DescribeInstances` API 호출 한도에 도달했더라도, 같은 계정으로 도쿄 리전(`ap-northeast-1`)에서는 새로운 호출 한도를 가집니다. 각 리전은 독립적인 서비스 엔드포인트를 가지고 있기 때문입니다.

이러한 제한은 보통 '토큰 버킷(Token Bucket)' 알고리즘과 유사하게 동작하여, 지속적으로 처리 가능한 요청 속도(Sustain Rate)와 일시적으로 허용되는 최대 요청 수(Burst Limit)를 제어합니다.

### 3. Boto3의 스마트한 기본 처리: Exponential Backoff

`ThrottlingException`이 발생했을 때 가장 기본적인 해결책은 "잠시 기다렸다가 다시 시도"하는 것입니다. 하지만 얼마나 기다려야 할까요? `boto3`는 이 문제를 매우 지능적으로 해결합니다.

`boto3` 클라이언트는 **Exponential Backoff (지수적 백오프)** 알고리즘이 내장된 재시도(Retry) 핸들러를 기본적으로 포함하고 있습니다.

`ThrottlingException`이 발생하면 `boto3`는 자동으로 다음을 수행합니다.

1.  요청이 실패하면 아주 잠깐 기다린 후 첫 번째 재시도를 합니다.
2.  재시도도 실패하면, 이전보다 더 긴 시간을 기다립니다.
3.  이 과정을 재시도 횟수가 소진될 때까지 반복하며, 대기 시간은 점차 지수적으로 늘어납니다.

이 덕분에 개발자는 대부분의 경우 **별도의 예외 처리 코드를 작성하지 않아도** `boto3`가 알아서 Throttling 상황을 회피하며 작업을 완료해 줍니다.

### 4. 더 안정적인 접근: 재시도 정책 커스터마이징

`boto3`의 기본 재시도 횟수는 보통 5회로 설정되어 있습니다. 하지만 대규모 작업을 처리하거나 네트워크 환경이 불안정하여 Throttling이 매우 빈번하게 발생한다면, 기본 횟수만으로는 부족할 수 있습니다.

이럴 때 우리는 더 **보수적으로(Conservatively)** 접근하여 재시도 횟수를 늘려 안정성을 높일 수 있습니다. `botocore.config`의 `Config` 객체를 사용하면 재시도 정책을 손쉽게 변경할 수 있습니다.

#### 샘플 코드: 기본 재시도와 보수적인 재시도 비교

아래 코드는 기본 설정을 사용하는 클라이언트와, 재시도 횟수를 10회로 늘린 보수적인 설정을 사용하는 클라이언트를 생성하는 방법을 보여줍니다. 제 경험 상 거의 10회에 근접하게 까지 실패하는 경우가 있어서, 저는 안전하게 20회정도를 셋팅한 적이 있었습니다.

```python
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# --- 1. Boto3의 기본 재시도 정책 사용 ---
# 별도의 설정 없이 클라이언트를 생성하면 기본 재시도 로직(최대 5회)이 적용됩니다.
default_s3_client = boto3.client('s3')
print("1. 기본 설정을 사용하는 S3 클라이언트가 생성되었습니다.")
# 이 클라이언트는 Throttling 발생 시 자동으로 최대 5번까지 재시도합니다.


# --- 2. 더 보수적인(안정적인) 재시도 정책 설정 ---
# Throttling이 매우 빈번할 경우를 대비해, 기본값(5회)보다 더 많이 재시도하도록 설정합니다.

print("
2. 보수적인 재시도 설정을 준비합니다...")
# 'max_attempts': 재시도 최대 횟수를 10회로 늘립니다. (기본값보다 많음)
# 'mode': 'adaptive'는 더 지능적으로 재시도 간격을 조절하는 최신 모드입니다.
conservative_retry_config = Config(
    retries={
        'max_attempts': 10,
        'mode': 'adaptive'
    }
)

# 위에서 정의한 설정을 사용하여 새로운 클라이언트를 생성합니다.
conservative_s3_client = boto3.client('s3', config=conservative_retry_config)
print("   - 재시도 횟수 10회로 설정된 S3 클라이언트가 생성되었습니다.")


# --- 사용 예시 ---
# 이제 conservative_s3_client를 사용한 모든 API 호출은
# Throttling 발생 시 최대 10번까지 자동으로 재시도합니다.
try:
    # 예를 들어, 이 API 호출이 Throttling을 겪더라도
    # 개발자가 직접 루프를 돌릴 필요 없이 boto3가 알아서 10번까지 재시도합니다.
    response = conservative_s3_client.list_buckets()
    print("
[성공] 버킷 목록을 성공적으로 조회했습니다.")
    # for bucket in response['Buckets']:
    #     print(f" - {bucket['Name']}")

except ClientError as e:
    # 10번의 재시도 끝에도 실패하면 여기서 에러를 잡을 수 있습니다.
    if e.response['Error']['Code'] == 'ThrottlingException':
        print("
[실패] 10번의 재시도 후에도 Throttling 문제가 해결되지 않았습니다.")
    else:
        print(f"
[실패] 예상치 못한 에러 발생: {e}")

```

### 결론

AWS의 Rate Limit은 서비스를 안정적으로 유지하기 위한 필수적인 기능입니다. 다행히도 `boto3`는 이러한 상황을 자동으로 처리해주는 강력한 재시도 메커니즘을 내장하고 있습니다.

*   **대규모/중요 작업의 경우:** `Config` 객체를 통해 재시도 횟수(`max_attempts`)를 늘리는 '보수적인' 접근법으로 스크립트의 안정성을 크게 향상시킬 수 있습니다.

이제 `ThrottlingException`을 만나더라도 당황하지 말고, `boto3`의 스마트한 재시도 정책을 적극적으로 활용해 보세요.
