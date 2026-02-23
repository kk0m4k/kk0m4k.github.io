---
layout: single
title: "Palo Alto NGFW Egress 트래픽 이상탐지 파이프라인: Airflow + ML 앙상블로 구축하기"
date: 2026-02-22 21:00:00 +0900
categories: ai_mil_dl
tags:
  [
    paloalto,
    anomaly-detection,
    airflow,
    ML,
    ensemble,
    splunk,
    secops,
    isolation-forest,
    pyod,
  ]
---

> 방화벽 로그 수만 건을 10분마다 수집하고, ~140개 피처로 변환하고, 4개 모델 앙상블로 이상 트래픽을 실시간 탐지하는 SecOps ML 파이프라인을 소개합니다.

---

## 📋 Table of Contents

- [배경: 왜 Egress 트래픽인가?](#-배경-왜-egress-트래픽인가)
- [아키텍처 개요](#-아키텍처-개요)
- [DAG 1: Feature Engineering — 원본 로그를 ML 피처로](#-dag-1-feature-engineering--원본-로그를-ml-피처로)
- [DAG 2: Model Training — 4개 모델 주간 재학습](#-dag-2-model-training--4개-모델-주간-재학습)
- [DAG 3: Anomaly Detection — 실시간 앙상블 추론](#-dag-3-anomaly-detection--실시간-앙상블-추론)
- [Palo Alto NGFW Egress 트래픽의 구조](#-palo-alto-ngfw-egress-트래픽의-구조)
- [이상 트래픽 탐지 전략](#-이상-트래픽-탐지-전략)
- [F1-Score 향상 기법](#-f1-score-향상-기법)
- [과대적합 방지 전략](#-과대적합-방지-전략)
- [마무리](#-마무리)

---

## 🎯 배경: 왜 Egress 트래픽인가?

대부분의 보안 모니터링이 **인바운드(Ingress)** 트래픽에 집중하는 반면, 실제 데이터 유출과 C2(Command & Control) 통신은 **아웃바운드(Egress)** 방향에서 발생합니다. 공격자가 내부에 침투한 후 데이터를 외부로 빼돌리거나, 감염된 호스트가 C2 서버와 주기적으로 통신하는 행위는 모두 Egress 트래픽에서 포착됩니다.

Palo Alto NGFW(Next-Generation Firewall)는 L7 수준의 애플리케이션 식별, URL 카테고리 분류, 위협 로그 연계 등을 제공하므로, 단순한 IP/Port 기반 분석을 넘어 **풍부한 컨텍스트**를 활용한 이상탐지가 가능합니다.

---

## 🏗 아키텍처 개요

전체 파이프라인은 **3개의 Airflow DAG**로 구성됩니다:

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Palo Alto NGFW Anomaly Detection Pipeline          │
└─────────────────────────────────────────────────────────────────────┘

  Splunk (index=ngfw-egressfw)
  ┌──────────────────────────┐
  │   Raw Traffic Logs       │  150+ fields, TRAFFIC/THREAT
  └────────────┬─────────────┘
               │  every 10 min
               ▼
  ┌──────────────────────────┐
  │  DAG 1: Feature          │  76 session features → ~140 aggregated
  │  Engineering             │  (src_ip, dst_ip, 10-min window)
  └────────────┬─────────────┘
               │
               ▼
  Splunk (index=ngfw-ml, sourcetype=paloalto:egress:feature)
               │
      ┌────────┴────────────────────────────┐
      │                                     │
      ▼  weekly (Sun 03:00 KST)             ▼  every 10 min
  ┌──────────────────┐              ┌────────────────────────┐
  │  DAG 2: Model    │              │  DAG 3: Anomaly        │
  │  Training        │── .joblib ──▶│  Detection (Inference) │
  │  (7-day data)    │   4 models   │  (72h context)         │
  └──────────────────┘              └───────────┬────────────┘
                                                │
                                                ▼
                               Splunk (sourcetype=paloalto:anomaly:detection)
                                    📊 Splunk Dashboard / Alert
```

---

## ⚙️ DAG 1: Feature Engineering — 원본 로그를 ML 피처로

> **스케줄**: `*/10 * * * *` (매 10분)
> **역할**: 원본 트래픽 로그를 수집하여 ML 모델이 이해할 수 있는 ~140개 집계 피처로 변환

### 파이프라인 흐름

```
start → fetch_and_engineer → send_to_splunk → end
```

### 상세 동작

**1단계 — 원본 데이터 수집**: Splunk에서 최근 **10분** 분량의 TRAFFIC/THREAT 로그를 조회합니다. 수집된 데이터 내에서 롤링 통계(예: `src_conns_5min`, `src_conns_1hr`)와 IP별 행동 패턴을 계산하며, 충분한 세션 수가 확보되는 환경에서 동작합니다.

**2단계 — 전처리**: 150개 이상의 원본 필드에서 불필요한 48개 컬럼(Splunk 메타데이터, PA 예약 필드)을 제거하고, TRAFFIC 로그와 THREAT 로그를 JOIN하여 URL 위협 정보를 보강합니다.

**3단계 — 76개 세션 피처 생성**: 7개 카테고리로 나눠 세션 단위 피처를 추출합니다:

| 카테고리        | 피처 수 | 주요 피처 예시                                                           |
| --------------- | ------- | ------------------------------------------------------------------------ |
| 🕐 시간         | 10      | `hour_sin/cos`, `is_business_hour`, `src_conns_5min`, `src_burst_ratio`  |
| 📊 볼륨         | 11      | `bytes_log`, `bytes_zscore`, `transfer_asymmetry`, `is_large_outbound`   |
| 🧠 행동         | 13      | `src_unique_dst_ips`, `session_end_risk`, `is_rare_dst_ip`               |
| 🌐 네트워크     | 7       | `dest_ip_popularity_log`, `dns_query_count`, `dest_ip_port_rarity`       |
| 🌍 지리         | 4       | `dest_country_risk`, `is_unusual_country`, `dest_country_freq_log`       |
| 📱 애플리케이션 | 7       | `app_frequency_log`, `url_category_risk`, `is_unknown_domain`            |
| 🔬 고급         | 24      | `beacon_score`, `dest_unique_subnets`, `network_risk_score`              |

**4단계 — (src_ip, dst_ip, 10분 윈도우) 집계**: 세션 단위 피처를 소스 IP + 목적지 IP + 10분 타임 버킷 기준으로 집계합니다. 집계 전략은 피처 특성에 따라 다릅니다:

```python
# 이진 플래그 (21종) → sum(건수) + max(발생 여부) = 42개
BINARY_FLAG_FEATURES = ['is_exfil_pattern', 'beacon_score', ...]

# 연속형 스코어 (37종) → mean(평균) + max(최악) = 74개
CONTINUOUS_SCORE_FEATURES = ['bytes_zscore', 'network_risk_score', ...]

# src_ip 레벨 (13개) + 시간 (5개) + 윈도우 통계 (6개)
# → 총 ~140개 집계 피처
```

**5단계 — 최근 10분 필터링**: `max(_time_bucket) - 10분`을 기준으로 **최근 10분 윈도우만** Splunk에 저장하여 중복을 방지합니다. Airflow 스케줄 지연에 대응하기 위해 execution_date가 아닌 데이터 기반 컷오프를 사용합니다.

---

## 🧪 DAG 2: Model Training — 4개 모델 주간 재학습

> **스케줄**: `0 18 * * 0` (매주 일요일 UTC 18:00 = KST 월요일 03:00)
> **역할**: 7일치 집계 피처 데이터로 4개 이상탐지 모델을 학습하고 저장

### 파이프라인 흐름

```
start → fetch_training_data → train_models → report_metrics → end
```

### 학습 프로세스

**1) Pseudo-Label 생성** — 비지도학습 환경에서 모델 성능을 평가하기 위해 Rule-Based로 pseudo ground truth를 만듭니다:

```python
# 이상(1) 판정 기준 (OR 결합):
- bytes_global_zscore_max > 3.0      # 극단적 트래픽량
- is_unusual_country_sum > 0         # 고위험 국가 접속
- is_exfil_pattern_sum > 0           # 데이터 유출 패턴
- beacon_score_sum > 0               # C2 비콘 패턴
- is_app_port_mismatch_sum > 0       # 앱-포트 불일치
- is_rare_dst_ip_sum > 0             # 희귀 목적지 IP
  AND dest_country_risk_max >= 4     #   + 중위험 이상 국가 (복합 조건)
- session_end_risk_max >= 4          # 위협/차단 종료
- network_risk_score_max > 0.7       # 복합 네트워크 이상

# 안전 필터: 모든 세션이 안전 앱/Internal 도메인/MyData 파트너이면 억제
# (단, beacon/mismatch/exfil/unusual_country/session_end_risk 시그널이 있으면 유지)
```

**2) Contamination 자동 보정** — pseudo-label 비율에 기반하여 모델의 이상 비율(contamination)을 동적으로 설정합니다:

```python
contamination = min(max(pseudo_rate * 1.3, 0.005), 0.10)
```

이는 데이터 분포 변화에 모델이 적응할 수 있도록 하면서, 극단적인 값([0.5%, 10%] 범위)을 방지합니다.

**3) 4개 모델 학습**:

| #   | 모델                   | 알고리즘                       | 특징                                      |
| --- | ---------------------- | ------------------------------ | ----------------------------------------- |
| 1   | **Isolation Forest**   | sklearn IF (500 trees)         | 기본 앵커 모델, 고차원 데이터에 강건      |
| 2   | **PyOD Ensemble**      | IF + LOF + HBOS + ECOD + COPOD | 5개 이질적 알고리즘의 평균 스코어         |
| 3   | **Consensus Ensemble** | 동일 5개 + 가중 투표           | IF에 2배 가중치, F1 최적화 threshold      |
| 4   | **Two-Stage Detector** | IF(8%) → GradientBoosting      | Stage 1: 고 Recall → Stage 2: 오탐 필터링 |

**4) 모델 저장 및 메트릭 리포트**: `.joblib`으로 직렬화하여 저장하고, 모델별 F1/Precision/Recall을 Splunk에 기록합니다.

---

## 🔍 DAG 3: Anomaly Detection — 실시간 앙상블 추론

> **스케줄**: `*/10 * * * *` (매 10분)
> **역할**: 학습된 4개 모델로 실시간 이상탐지를 수행하고, 이상 트래픽만 Splunk에 저장

### 파이프라인 흐름

```
start → wait_for_feature_engineering → fetch_features → predict_anomalies → send_results → end
```

`wait_for_feature_engineering`은 `ExternalTaskSensor`로, DAG 1(Feature Engineering)의 완료를 대기한 후 추론을 시작합니다.

### 핵심: 72시간 컨텍스트 + 10분 출력

추론 시 **72시간(3일)치** 데이터를 가져옵니다. 이유는 PyOD Ensemble의 `predict()`가 배치 내 percentile로 threshold를 계산하기 때문입니다. 10분치(수십 건)만으로는 분포가 불안정하여 오탐이 급증하지만, 72시간(수만 건)이면 안정적인 임계값 계산이 가능합니다.

### 앙상블 투표 메커니즘

```python
# 4개 모델 독립 추론
anomaly_votes = (
    (if_label == -1) +      # Isolation Forest
    (pyod_label == -1) +     # PyOD Ensemble
    (consensus_label == -1) + # Consensus Ensemble
    (twostage_label == -1)   # Two-Stage
)

# 2개 이상 모델이 이상으로 판정 → 최종 이상
final_label = -1 if anomaly_votes >= 2 else 1
```

**정규화된 앙상블 스코어**도 함께 계산합니다. 각 모델의 스코어를 [0, 1]로 정규화한 후 평균을 취하되, IF와 Two-Stage는 "낮을수록 이상"이므로 부호를 반전합니다:

```python
if_norm = 1 - normalize(if_scores)         # 반전
pyod_norm = normalize(pyod_scores)          # 그대로
consensus_norm = normalize(consensus_scores) # 그대로
ts_norm = 1 - normalize(ts_scores)          # 반전

anomaly_score = (if_norm + pyod_norm + consensus_norm + ts_norm) / 4
```

### 이상 원인 분석 (Anomaly Reason)

최종 이상으로 판정된 이벤트에 대해 **Rule-Based 원인 분석**을 자동으로 수행합니다. Pseudo-label과 동일한 8가지 규칙을 적용하여 어떤 보안 시그널이 트리거되었는지 사람이 읽을 수 있는 형태로 생성합니다:

```python
# 출력 예시:
anomaly_reason = "C2 beaconing pattern; App-port protocol mismatch"
anomaly_detail = '[{"rule": "c2_beaconing", "col": "beacon_score_sum", ...}]'
```

### 출력 결과 예시

최종적으로 Splunk에 저장되는 이상 이벤트에는 다음 필드가 포함됩니다:

| 필드                           | 설명                                                 |
| ------------------------------ | ---------------------------------------------------- |
| `src_ip`, `dst_ip`             | 소스/목적지 IP                                       |
| `time_bucket`                  | 10분 윈도우                                          |
| `dest_loc`                     | 목적지 국가 코드                                     |
| `anomaly_label`                | 최종 판정 (-1=이상)                                  |
| `anomaly_score`                | 앙상블 평균 (0~1, 높을수록 이상)                     |
| `anomaly_model_count`          | 이상 판정 모델 수 (2~4)                              |
| `anomaly_models`               | 판정 모델 목록 (예: `IsolationForest,PyOD,TwoStage`) |
| `anomaly_reason`               | 이상 원인 요약 (세미콜론 구분)                       |
| `anomaly_detail`               | 이상 원인 상세 (JSON, Splunk spath 파싱 가능)        |
| `if_score`, `pyod_score`, ...  | 개별 모델 스코어                                     |
| `session_count`, `total_bytes` | 트래픽 통계                                          |

---

## 🌐 Palo Alto NGFW Egress 트래픽의 구조

Palo Alto NGFW에서 수집하는 Egress 트래픽 로그는 크게 **TRAFFIC**과 **THREAT** 두 가지 유형으로 구성됩니다.

### TRAFFIC 로그

모든 세션의 기본 네트워크 메타데이터를 담고 있습니다:

```
┌─ 네트워크 5-tuple ──────────────────────────────────┐
│  src_ip, src_port, dest_ip, dest_port, protocol     │
├─ 존/인터페이스 ──────────────────────────────────────┤
│  src_zone (Trust) → dest_zone (Untrust)              │
├─ L7 식별 ────────────────────────────────────────────┤
│  application (ssl, web-browsing, dns, slack, ...)    │
├─ 트래픽 통계 ────────────────────────────────────────┤
│  bytes, bytes_sent, bytes_received, packets          │
├─ 세션 상태 ──────────────────────────────────────────┤
│  session_end_reason (tcp-fin, tcp-rst, aged-out, ...) │
├─ 지리 정보 ──────────────────────────────────────────┤
│  dest_loc (국가 코드: KR, US, CN, RU, ...)           │
└──────────────────────────────────────────────────────┘
```

### THREAT 로그

TRAFFIC과 1:N으로 연결되며, URL 필터링/IPS에서 탐지된 위협 정보를 포함합니다. 파이프라인에서는 TRAFFIC과 THREAT를 JOIN하여 세션에 위협 컨텍스트를 보강합니다.

### Egress 방향의 특수성

Egress 트래픽 분석에서 주목하는 패턴들:

| 위협 패턴               | 관찰 지점                               | 피처 예시                                       |
| ----------------------- | --------------------------------------- | ----------------------------------------------- |
| 🔄 **C2 비콘**          | 동일 src→dst 쌍의 일정한 주기 통신      | `beacon_score`, `inter_arrival_jitter`          |
| 📤 **데이터 유출**      | 비정상적 아웃바운드 전송량              | `transfer_asymmetry`, `is_exfil_pattern`        |
| 🌏 **고위험 국가 접속** | 희귀 목적지 국가                        | `dest_country_risk`, `is_unusual_country`       |
| 🔀 **포트 불일치**      | SSL이 비표준 포트, DNS가 53이 아닌 포트 | `is_app_port_mismatch`                          |
| 💀 **비정상 세션 종료** | tcp-rst, aged-out, threat, policy-deny  | `session_end_risk`                              |
| 🕸 **Lateral Movement** | 동일 서브넷 내 다수 IP 접속             | `same_subnet_conn_count`, `dest_unique_subnets` |

---

## 🕵️ 이상 트래픽 탐지 전략

### 다층 앙상블 접근법

단일 모델은 각각 고유한 약점이 있습니다. Isolation Forest는 밀도 기반 이상에 약하고, LOF는 고차원에서 성능이 떨어지며, HBOS는 피처 간 상관관계를 무시합니다. 이러한 단점을 상호 보완하기 위해 **4개 이질적 모델의 합의(consensus)** 방식을 채택했습니다.

```
┌────────────────────────────────────────────────────────────────┐
│                     Ensemble Voting (≥ 2/4)                    │
├────────────┬──────────────┬─────────────────┬──────────────────┤
│ Isolation  │ PyOD         │ Consensus       │ Two-Stage        │
│ Forest     │ Ensemble     │ Ensemble        │ Detector         │
│            │              │                 │                  │
│ 500 trees  │ IF+LOF+HBOS  │ 5 models with   │ IF(8%) → GB     │
│ contam=auto│ +ECOD+COPOD  │ IF weight=2x    │ pseudo-label     │
│            │ 평균 스코어    │ F1-optimized    │ sample-weighted  │
│            │              │ threshold       │                  │
│  Global    │  Local+      │  Weighted       │  Cascading       │
│  Isolation │  Distribution│  Consensus      │  Refinement      │
└────────────┴──────────────┴─────────────────┴──────────────────┘
```

### 하이브리드 탐지: ML + Rule-Based

ML 모델만으로는 보안 도메인의 모든 위협을 포착할 수 없습니다. 특히 **비콘 패턴**이나 **프로토콜 이상**처럼 명확한 시그니처가 있는 위협은 룰 기반이 더 정확합니다. 하이브리드 예측 함수가 이를 결합합니다:

```python
def hybrid_predict(labels, scores, features, score_threshold=None):
    # ML 탐지 결과에 강한 보안 시그널을 OR 결합
    hybrid = (labels == -1).astype(int)

    # ML이 놓쳐도 이상으로 판정하는 강한 시그널
    hybrid |= (features['beacon_score_sum'] > 0)         # C2 비콘
    hybrid |= (features['is_app_port_mismatch_sum'] > 0)  # 포트 불일치
    hybrid |= (features['session_end_risk_max'] >= 4)     # 위협 종료

    # 안전 트래픽 판정: 안전 앱 OR Internal 도메인 OR MyData 파트너
    safe_mask = (
        (features['is_known_safe_app_sum'] == features['session_count']) |
        (features['is_internal_domain_sum'] == features['session_count']) |
        (features['is_mydata_partner_sum'] == features['session_count'])
    )

    # 강한 시그널: beacon, mismatch, exfil, 고위험 국가, 위협 종료
    strong = (features['beacon_score_sum'] > 0) | \
             (features['is_app_port_mismatch_sum'] > 0) | \
             (features['is_exfil_pattern_sum'] > 0) | \
             (features['is_unusual_country_sum'] > 0) | \
             (features['session_end_risk_max'] >= 4)

    hybrid[safe_mask & ~strong] = 0  # 안전 + 시그널 없음 → 억제

    return hybrid
```

---

## 📈 F1-Score 향상 기법

비지도 이상탐지에서 F1-Score를 높이는 것은 쉽지 않습니다. 라벨이 없기 때문입니다. 이 파이프라인에서는 다음 5가지 기법을 적용했습니다.

### 1. Pseudo-Label 기반 평가 체계

완전한 비지도학습이지만, 보안 도메인 지식을 활용한 Rule-Based pseudo-label로 **평가 가능한 프레임워크**를 구축했습니다. 8가지 보안 시그널(극단 트래픽, 고위험 국가, 유출 패턴, C2 비콘, 희귀 IP+위험 국가 복합 조건 등)의 OR 결합으로 생성하되, 안전 트래픽 필터(안전 앱/Internal 도메인/MyData 파트너)와 강한 시그널 예외를 적용하여 라벨 품질을 확보합니다.

### 2. Threshold 최적화

Consensus Ensemble에서는 percentile 기반 threshold를 그대로 사용하지 않고, **pseudo-label 대비 F1을 최대화하는 threshold를 탐색**합니다:

```python
def optimize_threshold(self, X, pseudo_labels):
    scores = self._get_weighted_scores(X)
    # 90th~99th percentile 범위를 0.5% 단위로 탐색
    for pct in np.arange(90, 99.5, 0.5):
        t = np.percentile(scores, pct)
        pred = (scores > t).astype(int)
        f1 = f1_score(pseudo_labels, pred)
        if f1 > best['f1']:
            best = {'threshold': t, 'f1': f1, ...}
    self.threshold = best['threshold']
```

### 3. Two-Stage Cascade (Recall → Precision)

가장 독창적인 기법입니다. 단일 모델로는 Precision과 Recall을 동시에 높이기 어렵기 때문에, **2단계로 나눠서 각각에 최적화**합니다:

```
Stage 1: Isolation Forest (contamination=8%)
  └─ 넓은 그물로 후보 추출 → 높은 Recall 확보

Stage 2: GradientBoosting Classifier
  └─ pseudo-label 학습으로 오탐 필터링 → Precision 향상
  └─ IF anomaly score를 추가 피처로 활용
  └─ class-weighted 학습으로 불균형 대응
```

Stage 1이 전체 데이터의 약 8%를 후보로 추출하면, Stage 2가 이 중에서 진짜 이상만 골라냅니다. 핵심은 Stage 2의 GradientBoosting이 **IF의 anomaly score를 추가 피처로 받는다**는 점입니다 — IF가 "어느 정도 의심스러운지"를 GB가 참고하여 최종 판단합니다.

### 4. 가중 합의 앙상블

Consensus Ensemble에서 5개 모델의 스코어를 단순 평균하지 않고, **Isolation Forest에 2배 가중치**를 부여합니다:

```python
ENSEMBLE_WEIGHTS = {
    'IForest': 2.0,    # 앵커 모델: 고차원에서 가장 안정적
    'LOF': 1.0,
    'HBOS': 1.0,
    'ECOD': 1.0,
    'COPOD': 1.0,
}
```

이는 IF가 고차원 피처 공간에서 가장 안정적인 성능을 보이며, 다른 모델들이 특정 데이터 분포에서 흔들릴 때 **앵커 역할**을 하기 때문입니다.

### 5. Contamination 자동 보정

고정된 contamination 값은 데이터 분포가 변하면 성능이 급락합니다. Pseudo-label 비율에 연동하여 매주 자동 조정합니다:

```python
contamination = min(max(pseudo_rate * 1.3, 0.005), 0.10)
#                       ^실제 비율의 130%   ^하한     ^상한
```

1.3배 마진은 pseudo-label이 놓치는 이상 트래픽까지 커버하기 위함이고, [0.5%, 10%] 범위 제한은 극단적 보정을 방지합니다.

---

## 🛡 과대적합 방지 전략

ML 모델, 특히 GradientBoosting 같은 고용량 모델은 학습 데이터에 과대적합(overfitting)되기 쉽습니다. 이 파이프라인에서 적용한 과대적합 방지 기법들을 정리합니다.

### 1. RobustScaler 사용

네트워크 트래픽 데이터는 극단적인 스큐(skew)가 특징입니다. 한 IP가 수백만 바이트를 전송하는 동안 대부분은 수천 바이트입니다. `StandardScaler` 대신 **`RobustScaler`**(중앙값과 IQR 기반)를 사용하여 이상치에 의한 스케일 왜곡을 방지합니다:

```python
self.scaler = RobustScaler()
X_scaled = self.scaler.fit_transform(X)
```

### 2. Isolation Forest의 구조적 정규화

```python
IsolationForest(
    n_estimators=500,
    max_samples=0.8,    # 전체의 80%만 샘플링 → 각 트리의 다양성 확보
    max_features=0.8,   # 전체의 80%만 피처 사용 → 피처 의존도 분산
    random_state=42,
)
```

- `max_samples=0.8`: 각 트리가 전체 데이터의 80%만 보므로, 특정 패턴에 과적합하지 않습니다.
- `max_features=0.8`: 각 트리가 ~140개 피처 중 80%만 사용하여 피처 간 상관관계에 의한 편향을 줄입니다.

### 3. GradientBoosting의 과적합 제어

Two-Stage의 Stage 2에 적용된 기법들:

```python
GradientBoostingClassifier(
    n_estimators=200,         # 적당한 트리 수 (과도하지 않게)
    max_depth=5,              # 트리 깊이 제한 → 복잡도 억제
    learning_rate=0.1,        # 적절한 학습률 → 효율적 학습
    min_samples_leaf=20,      # 리프 노드 최소 샘플 → 과적합 방지
    subsample=0.8,            # 80% 행 서브샘플링 → Stochastic GB
)
```

특히 `min_samples_leaf=20`은 리프 노드가 최소 20개 샘플을 포함하도록 강제하여, 소수의 이상치에 맞춰진 규칙이 만들어지는 것을 방지합니다.

### 4. Sample Weight로 클래스 불균형 대응

이상 트래픽은 전체의 3~8%에 불과합니다. 단순 학습하면 모델이 "항상 정상"이라고 예측해도 92% 이상의 정확도를 달성합니다. `compute_sample_weight('balanced')`로 소수 클래스에 높은 가중치를 부여합니다:

```python
sample_weights = compute_sample_weight('balanced', pseudo_labels)
self.stage2_model.fit(X_stage2, pseudo_labels, sample_weight=sample_weights)
```

### 5. 앙상블 투표의 다수결 (≥ 2/4)

개별 모델의 과적합은 앙상블 투표에서 자연스럽게 상쇄됩니다. 4개 모델 중 **2개 이상**이 동의해야 최종 이상으로 판정하므로, 한 모델이 과적합으로 과잉 탐지해도 다른 모델들이 브레이크를 겁니다.

### 6. 주간 재학습 + 7일 윈도우

모델을 매주 7일치 데이터로 재학습하여:

- **최신 트래픽 패턴을 반영**하되 (concept drift 대응)
- **7일이라는 충분한 기간**으로 일시적 이상에 과적합하지 않도록 합니다
- 주말과 평일의 트래픽 패턴 차이도 7일 윈도우로 자연스럽게 포함됩니다

### 7. 안전 트래픽 필터

Pseudo-label과 하이브리드 예측 모두에서 **알려진 안전 앱(Slack, Teams, Zoom, Office365, AWS 등), Internal 자체 도메인, MyData 파트너 도메인의 트래픽은 강한 시그널이 없을 때 억제**합니다. 안전 판정은 세 가지 조건의 OR 결합(`is_known_safe_app`, `is_internal_domain`, `is_mydata_partner`)으로 이루어지며, 이는 정상 트래픽의 패턴 변화가 모델을 혼란시키는 것을 방지합니다.

---

## 🎬 마무리

이 파이프라인의 핵심 설계 원칙을 요약하면:

| 원칙            | 구현                                            |
| --------------- | ----------------------------------------------- |
| **다층 방어**   | 4개 이질적 모델 + Rule-Based 하이브리드         |
| **적응성**      | 주간 재학습, contamination 자동 보정            |
| **안정성**      | 72시간 컨텍스트 윈도우, ≥2/4 투표               |
| **과적합 방지** | RobustScaler, 서브샘플링, 앙상블 다수결         |
| **F1 최적화**   | Pseudo-label, threshold 탐색, Two-Stage cascade |
| **운영 효율**   | 10분 주기 피처/추론, 주간 학습, Splunk 통합     |

Palo Alto NGFW의 풍부한 L7 로그를 ML 파이프라인과 결합함으로써, 기존 시그니처 기반 탐지가 놓치는 **저강도 지속 위협(Low-and-Slow)**, **비콘 통신**, **점진적 데이터 유출** 같은 위협을 포착할 수 있게 되었습니다.

전체 코드는 3개 DAG, 7개 피처 모듈, 4개 탐지기, 1개 평가기로 구성되어 있으며, Airflow의 스케줄링과 Splunk의 데이터 플랫폼 위에서 자동화된 SecOps ML 파이프라인으로 운영됩니다.

---

_Built with Apache Airflow, scikit-learn, PyOD, and Splunk_
