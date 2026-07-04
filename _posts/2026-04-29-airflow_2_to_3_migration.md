---
title: "Apache Airflow 2.x → 3.x 마이그레이션 가이드"
author: Francesco

layout: single
categories:
  - airflow

author_profile: true
tags:
  - Airflow
  - Python
  - DataEngineering
  - Migration
---
{% raw %}

Apache Airflow 3.0은 2.x 대비 내부 아키텍처를 대폭 개편한 메이저 릴리즈입니다.
DAG 작성 인터페이스의 SDK 분리, 표준 Operator의 Provider 이전, `execution_date` 제거 등 여러 Breaking Change가 포함되어 있습니다.
이 글에서는 실제 마이그레이션 과정에서 마주치는 주요 변경사항과 대응 방법을 코드 예시와 함께 정리하였습니다.

---

## 🐍 1. Python 버전 요구사항

Airflow 3.0은 **Python 3.9 이상**을 요구합니다. Python 3.8 환경이라면 마이그레이션 전에 Python 업그레이드가 선행되어야 합니다.

| Airflow 버전 | 지원 Python           |
| ------------ | --------------------- |
| 2.x          | 3.8, 3.9, 3.10, 3.11  |
| 3.x          | 3.9, 3.10, 3.11, 3.12 |

---

## 📦 2. Import 경로 변경 — `airflow.sdk`

Airflow 3.0의 가장 큰 변화 중 하나는 DAG 작성에 필요한 핵심 클래스들을 `airflow.sdk`로 일원화한 것입니다. 이는 Airflow의 내부 스케줄러/서버 컴포넌트와 DAG 작성 인터페이스를 분리하는 방향의 일환입니다.

### 2.1 DAG, task 데코레이터

```python
# Before (Airflow 2.x)
from airflow.models import DAG
from airflow.decorators import task

# After (Airflow 3.x)
from airflow.sdk import DAG, task
```

### 2.2 Variable

```python
# Before (Airflow 2.x)
from airflow.models import Variable

value = Variable.get("my_variable")
json_value = Variable.get("my_json_variable", deserialize_json=True)

# After (Airflow 3.x)
from airflow.sdk import Variable

value = Variable.get("my_variable")
json_value = Variable.get("my_json_variable", deserialize_json=True)
```

> `Variable`의 API 자체는 동일합니다. import 경로만 변경됩니다.

### 2.3 XCom

```python
# Before (Airflow 2.x)
from airflow.models import XCom

# After (Airflow 3.x)
from airflow.sdk import XCom
```

### 2.4 BaseHook

`BaseHook`은 기존 경로를 **그대로 유지**합니다.

```python
# 2.x와 3.x 동일
from airflow.hooks.base import BaseHook

class MyCustomHook(BaseHook):
    def get_conn(self):
        conn = self.get_connection(self.conn_id)
        return conn
```

### 2.5 전체 요약

| 클래스       | Airflow 2.x            | Airflow 3.x                 |
| ------------ | ---------------------- | --------------------------- |
| `DAG`        | `airflow.models`       | `airflow.sdk`               |
| `task`       | `airflow.decorators`   | `airflow.sdk`               |
| `Variable`   | `airflow.models`       | `airflow.sdk`               |
| `XCom`       | `airflow.models`       | `airflow.sdk`               |
| `BaseHook`   | `airflow.hooks.base`   | `airflow.hooks.base` (동일) |
| `Connection` | `airflow.models`       | `airflow.sdk`               |
| `Param`      | `airflow.models.param` | `airflow.sdk`               |

---

## 🔧 3. 표준 Operator — `airflow.providers.standard`

Airflow 3.0에서 내장 Operator들이 **`airflow.providers.standard`** 패키지로 이동했습니다. 기존 `airflow.operators.*` 경로는 deprecated 처리되며, 향후 제거될 예정입니다.

### 3.1 BashOperator

```python
# Before (Airflow 2.x)
from airflow.operators.bash import BashOperator

# After (Airflow 3.x)
from airflow.providers.standard.operators.bash import BashOperator

task = BashOperator(
    task_id="print_date",
    bash_command="date",
)
```

### 3.2 PythonOperator / BranchPythonOperator

```python
# Before (Airflow 2.x)
from airflow.operators.python import PythonOperator, BranchPythonOperator

# After (Airflow 3.x)
from airflow.providers.standard.operators.python import PythonOperator, BranchPythonOperator

def my_callable():
    print("Hello from PythonOperator")

task = PythonOperator(
    task_id="my_python_task",
    python_callable=my_callable,
)
```

### 3.3 TriggerDagRunOperator

```python
# Before (Airflow 2.x)
from airflow.operators.trigger_dagrun import TriggerDagRunOperator

# After (Airflow 3.x)
from airflow.providers.standard.operators.trigger_dagrun import TriggerDagRunOperator
```

### 3.4 TimeSensor / TimeDeltaSensor

```python
# Before (Airflow 2.x)
from airflow.sensors.time_delta import TimeDeltaSensor
from airflow.sensors.time import TimeSensor

# After (Airflow 3.x)
from airflow.providers.standard.sensors.time_delta import TimeDeltaSensor
from airflow.providers.standard.sensors.time import TimeSensor
```

### 3.5 ExternalTaskSensor

```python
# Before (Airflow 2.x)
from airflow.sensors.external_task import ExternalTaskSensor

# After (Airflow 3.x)
from airflow.providers.standard.sensors.external_task import ExternalTaskSensor
```

### 3.6 필수 패키지 설치

`airflow.providers.standard`는 별도 패키지로 제공됩니다.

```bash
pip install apache-airflow-providers-standard
```

---

## 📅 4. `execution_date` 제거 → `logical_date`

Airflow 3.0에서 `execution_date`가 **완전히 제거**됩니다. 대신 `logical_date`를 사용해야 합니다.

### 4.1 Task Context 변수

```python
# Before (Airflow 2.x)
def my_task(**context):
    execution_date = context["execution_date"]       # pendulum.DateTime
    next_execution_date = context["next_execution_date"]
    prev_execution_date = context["prev_execution_date"]
    ds = context["ds"]                               # "2024-01-15"
    ds_nodash = context["ds_nodash"]                 # "20240115"

# After (Airflow 3.x)
def my_task(**context):
    logical_date = context["logical_date"]           # pendulum.DateTime (or None)
    next_logical_date = context["next_logical_date"]
    prev_logical_date = context["prev_logical_date"]
    ds = context["ds"]                               # 동일하게 사용 가능
    ds_nodash = context["ds_nodash"]                 # 동일하게 사용 가능
```

### 4.2 Jinja 템플릿

```jinja2
{# Before (Airflow 2.x) #}
bash_command="echo {{ execution_date }}"
bash_command="echo {{ execution_date.strftime('%Y-%m-%d') }}"

{# After (Airflow 3.x) #}
bash_command="echo {{ logical_date }}"
bash_command="echo {{ logical_date.strftime('%Y-%m-%d') }}"
```

### 4.3 DagRun 객체

```python
# Before (Airflow 2.x)
def my_task(**context):
    dag_run = context["dag_run"]
    run_date = dag_run.execution_date

# After (Airflow 3.x)
def my_task(**context):
    dag_run = context["dag_run"]
    run_date = dag_run.logical_date  # None일 수 있음 (Asset 트리거, 수동 실행)
```

### 4.4 `logical_date`가 None인 경우

Airflow 3.0에서 Asset 이벤트로 트리거되거나 `schedule=None`으로 수동 실행된 DAG는
`logical_date`가 `None`일 수 있습니다.

```python
from airflow.sdk import task, DAG
from airflow.utils.context import Context
import pendulum

with DAG(
    dag_id="example_dag",
    start_date=pendulum.datetime(2024, 1, 1, tz="UTC"),
    schedule=None,
) as dag:

    @task
    def my_task(context: Context = None):
        logical_date = context.get("logical_date")
        if logical_date is None:
            # Asset 트리거 또는 수동 실행
            dag_run_date = context["dag_run"].logical_date
            print(f"수동/Asset 트리거 실행: {dag_run_date}")
        else:
            print(f"스케줄 실행: {logical_date}")
```

### 4.5 변경된 Context 변수 전체 목록

| Airflow 2.x              | Airflow 3.x                              |
| ------------------------ | ---------------------------------------- |
| `execution_date`         | `logical_date`                           |
| `next_execution_date`    | `next_logical_date`                      |
| `prev_execution_date`    | `prev_logical_date`                      |
| `next_ds`                | `next_logical_date.strftime('%Y-%m-%d')` |
| `prev_ds`                | `prev_logical_date.strftime('%Y-%m-%d')` |
| `dag_run.execution_date` | `dag_run.logical_date`                   |

---

## 🗂️ 5. SubDagOperator 제거 → TaskGroup

`SubDagOperator`는 Airflow 2.x에서 deprecated, 3.x에서 **완전 제거**됩니다. 대신 `TaskGroup`을 사용합니다.

### 5.1 TaskGroup으로 전환

```python
# Before (Airflow 2.x) — SubDagOperator
from airflow.operators.subdag import SubDagOperator

def create_subdag(parent_dag_id, child_dag_id, default_args):
    with DAG(dag_id=f"{parent_dag_id}.{child_dag_id}", default_args=default_args) as dag:
        task_a = BashOperator(task_id="task_a", bash_command="echo A")
        task_b = BashOperator(task_id="task_b", bash_command="echo B")
    return dag

with DAG("parent_dag", ...) as dag:
    section = SubDagOperator(
        task_id="section",
        subdag=create_subdag("parent_dag", "section", default_args),
    )

# After (Airflow 3.x) — TaskGroup
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from airflow.utils.task_group import TaskGroup

with DAG("parent_dag", ...) as dag:
    with TaskGroup(group_id="section") as section:
        task_a = BashOperator(task_id="task_a", bash_command="echo A")
        task_b = BashOperator(task_id="task_b", bash_command="echo B")
```

---

## 🗃️ 6. Dataset → Asset

Airflow 2.4에서 도입된 `Dataset`이 Airflow 3.0에서 **`Asset`으로 이름이 변경**됩니다. 데이터 의존성 기반 스케줄링(Data-aware scheduling)의 핵심 개념입니다.

```python
# Before (Airflow 2.x)
from airflow.datasets import Dataset

my_dataset = Dataset("s3://my-bucket/data/output.csv")

with DAG(
    dag_id="producer_dag",
    schedule="@daily",
    outlets=[my_dataset],
) as dag:
    ...

with DAG(
    dag_id="consumer_dag",
    schedule=[my_dataset],  # Dataset이 업데이트되면 실행
) as dag:
    ...

# After (Airflow 3.x)
from airflow.sdk import Asset

my_asset = Asset("s3://my-bucket/data/output.csv")

with DAG(
    dag_id="producer_dag",
    schedule="@daily",
    outlets=[my_asset],
) as dag:
    ...

with DAG(
    dag_id="consumer_dag",
    schedule=[my_asset],  # Asset이 업데이트되면 실행
) as dag:
    ...
```

---

## 🔄 7. DAG 직렬화 변경 — JSON 방식으로 통일

Airflow 3.0에서는 DAG 직렬화가 **JSON 방식으로 완전히 통일**됩니다. 이전 버전에서 옵션으로 존재하던 바이너리 직렬화 방식은 제거됩니다. 이 변경의 실질적인 영향은 **XCom으로 전달하는 값**에 있습니다. Task 간에 주고받는 모든 XCom 값은 JSON으로 직렬화 가능해야 합니다.

```python
# 주의: datetime, DataFrame 같은 타입은 직접 XCom 전달이 불가능
# Before (Airflow 2.x) — 바이너리 직렬화 옵션 사용 시 가능했던 패턴
@task
def produce_data():
    import pandas as pd
    return pd.DataFrame({"a": [1, 2, 3]})  # 직렬화 불가

# After (Airflow 3.x) — JSON 직렬화 가능한 타입으로 변환
@task
def produce_data():
    import pandas as pd
    df = pd.DataFrame({"a": [1, 2, 3]})
    return df.to_dict(orient="records")  # JSON 직렬화 가능 (list of dict)

@task
def produce_date():
    import pendulum
    return pendulum.now().isoformat()  # datetime → ISO 8601 문자열
```

> 💡 대용량 데이터는 XCom 대신 외부 스토리지(S3, GCS 등)를 통해 전달하는 패턴을 권장합니다.

---

## 🔔 8. Callback 시그니처

Task/DAG Callback 함수는 Airflow 3.x에서도 동일한 시그니처를 유지하지만, context 내 `execution_date` 키 참조를 `logical_date`로 변경해야 합니다.

```python
from airflow.utils.context import Context

# on_failure_callback
def on_failure_callback(context: Context):
    task_instance = context["task_instance"]
    logical_date = context.get("logical_date")  # execution_date 대신
    exception = context.get("exception")
    print(f"Task {task_instance.task_id} failed at {logical_date}: {exception}")

# on_success_callback
def on_success_callback(context: Context):
    task_instance = context["task_instance"]
    print(f"Task {task_instance.task_id} succeeded")

with DAG(
    dag_id="example_dag",
    on_failure_callback=on_failure_callback,
    ...
) as dag:
    task = PythonOperator(
        task_id="my_task",
        python_callable=my_callable,
        on_success_callback=on_success_callback,
    )
```

---

## ⚙️ 9. Params

`Params`를 활용한 DAG 파라미터 정의는 Airflow 3.x에서도 유지되지만, import 경로가 변경됩니다.

```python
# Before (Airflow 2.x)
from airflow.models.param import Param

# After (Airflow 3.x)
from airflow.sdk import Param

with DAG(
    dag_id="parameterized_dag",
    params={
        "target_date": Param(
            default="2024-01-01",
            type="string",
            description="처리할 날짜 (YYYY-MM-DD)",
        ),
        "batch_size": Param(
            default=100,
            type="integer",
            minimum=1,
            maximum=10000,
        ),
    },
) as dag:

    @task
    def process(params=None):
        target_date = params["target_date"]
        batch_size = params["batch_size"]
        print(f"Processing {target_date} with batch_size={batch_size}")
```

---

## 🚀 10. TriggerDagRunOperator — `execution_date` 파라미터 제거

```python
# Before (Airflow 2.x)
from airflow.operators.trigger_dagrun import TriggerDagRunOperator

trigger = TriggerDagRunOperator(
    task_id="trigger_another_dag",
    trigger_dag_id="target_dag",
    execution_date="{{ ds }}",  # deprecated in 2.x, 제거됨 in 3.x
)

# After (Airflow 3.x)
from airflow.providers.standard.operators.trigger_dagrun import TriggerDagRunOperator

trigger = TriggerDagRunOperator(
    task_id="trigger_another_dag",
    trigger_dag_id="target_dag",
    logical_date="{{ logical_date }}",  # execution_date 대신 logical_date
)
```

---

## ⏳ 11. Deferrable Operators (비동기 실행)

Airflow 2.2에서 도입된 Deferrable Operator / Triggerer 패턴이 Airflow 3.x에서 더욱 강화됩니다. 장시간 대기가 필요한 센서류 작업에서 Worker 자원을 점유하지 않고 비동기로 처리할 수 있습니다.

```python
# Airflow 3.x — deferrable=True 옵션 활용
from airflow.providers.standard.sensors.time_delta import TimeDeltaSensor
import datetime

wait_task = TimeDeltaSensor(
    task_id="wait_30_minutes",
    delta=datetime.timedelta(minutes=30),
    deferrable=True,  # Triggerer를 통한 비동기 실행 (Worker 점유 없음)
)
```

`deferrable=True`를 사용하려면 Airflow Triggerer 컴포넌트가 실행 중이어야 합니다.

```bash
# Triggerer 실행
airflow triggerer
```

---

## 🌐 12. REST API 변경

Airflow 3.0은 REST API를 완전히 재작성했습니다. 기존 `/api/v1/*` 엔드포인트 구조가 변경됩니다.

| 기능               | Airflow 2.x                                                | Airflow 3.x                                                |
| ------------------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| DAG 목록 조회      | `GET /api/v1/dags`                                         | `GET /api/v2/dags`                                         |
| DAG 실행 트리거    | `POST /api/v1/dags/{dag_id}/dagRuns`                       | `POST /api/v2/dags/{dag_id}/dagRuns`                       |
| Task 인스턴스 조회 | `GET /api/v1/dags/{dag_id}/dagRuns/{run_id}/taskInstances` | `GET /api/v2/dags/{dag_id}/dagRuns/{run_id}/taskInstances` |

> REST API를 직접 호출하는 외부 스크립트나 모니터링 시스템이 있다면 버전을 `v2`로 업데이트해야 합니다.

---

## 🗑️ 13. `airflow.cfg` 주요 설정 제거

Airflow 3.0에서 제거된 주요 설정들입니다. 해당 설정이 `airflow.cfg`나 환경변수에 남아있어도 오류가 발생하진 않지만, 정리해두는 것이 좋습니다.

| 섹션          | 설정 키                 | 제거 이유          |
| ------------- | ----------------------- | ------------------ |
| `[core]`      | `enable_xcom_pickling`  | JSON 직렬화로 통일 |
| `[core]`      | `store_dag_code`        | 항상 저장으로 고정 |
| `[core]`      | `store_serialized_dags` | 항상 직렬화로 고정 |
| `[scheduler]` | `use_job_schedule`      | 제거               |

---

## 🆕 14. DAG 버전 관리 (신규 기능)

Airflow 3.0에서 **DAG 버전 관리** 기능이 추가됩니다. DAG 코드가 변경될 때마다 버전이 자동으로 기록되며, 과거 실행 당시의 DAG 코드를 UI에서 조회할 수 있습니다.

별도 설정 없이 자동으로 동작합니다. `/dags/{dag_id}/versions` API 또는 Airflow UI의 DAG 상세 화면에서 버전 이력을 확인할 수 있습니다.

---

## 🪝 15. Custom Hook 작성 시 유의사항

커스텀 Hook 클래스는 Airflow 3.x에서도 대부분 코드 변경 없이 동작하지만, BaseHook.get_connection()`의 반환값을 사용할 때 `Connection` 클래스의 import 경로가 변경됩니다.

```python
# Before (Airflow 2.x)
from airflow.hooks.base import BaseHook
from airflow.models import Connection  # 필요 시

# After (Airflow 3.x)
from airflow.hooks.base import BaseHook  # 동일
from airflow.sdk import Connection       # airflow.sdk로 이동

class MyApiHook(BaseHook):
    conn_name_attr = "my_conn_id"
    default_conn_name = "my_api_default"

    def __init__(self, conn_id: str = default_conn_name):
        super().__init__()
        self.conn_id = conn_id

    def get_conn(self):
        conn = self.get_connection(self.conn_id)
        # conn.host, conn.login, conn.password, conn.extra_dejson 등 동일하게 사용 가능
        return conn

    def call_api(self, endpoint: str):
        conn = self.get_conn()
        base_url = f"https://{conn.host}"
        headers = {"Authorization": f"Bearer {conn.password}"}
        # ... HTTP 요청 처리
```

> `extra_dejson` 속성은 Airflow 3.x에서도 계속 사용 가능합니다.

---

## ✅ 16. 마이그레이션 체크리스트

```
[ ] Python 버전 3.9+ 확인
[ ] apache-airflow-providers-standard 패키지 설치
[ ] from airflow.models import DAG          → from airflow.sdk import DAG
[ ] from airflow.decorators import task     → from airflow.sdk import task
[ ] from airflow.models import Variable     → from airflow.sdk import Variable
[ ] from airflow.models import XCom         → from airflow.sdk import XCom
[ ] from airflow.models.param import Param  → from airflow.sdk import Param
[ ] from airflow.operators.bash import BashOperator
      → from airflow.providers.standard.operators.bash import BashOperator
[ ] from airflow.operators.python import PythonOperator
      → from airflow.providers.standard.operators.python import PythonOperator
[ ] from airflow.operators.trigger_dagrun import TriggerDagRunOperator
      → from airflow.providers.standard.operators.trigger_dagrun import TriggerDagRunOperator
[ ] from airflow.sensors.* → airflow.providers.standard.sensors.*
[ ] execution_date → logical_date (context, Jinja 템플릿, 콜백 전체 검색 및 교체)
[ ] dag_run.execution_date → dag_run.logical_date
[ ] {{ execution_date }} → {{ logical_date }} (Jinja 템플릿)
[ ] SubDagOperator → TaskGroup으로 대체
[ ] from airflow.datasets import Dataset → from airflow.sdk import Asset
[ ] XCom 전달값이 JSON 직렬화 가능한지 확인
[ ] TriggerDagRunOperator execution_date 파라미터 → logical_date
[ ] REST API 엔드포인트 /api/v1/* → /api/v2/* 확인
[ ] airflow.cfg 불필요한 설정 정리
```

### 🔍 빠른 탐지 명령어

마이그레이션 전, 변경이 필요한 파일을 미리 파악하는 데 유용한 검색 명령어입니다.

```bash
# execution_date 사용 위치 탐색
grep -r "execution_date" ./dags ./plugins ./config

# 변경이 필요한 import 탐색
grep -r "from airflow.models import" ./dags ./plugins ./config
grep -r "from airflow.decorators import" ./dags ./plugins ./config
grep -r "from airflow.operators\." ./dags ./plugins ./config
grep -r "from airflow.sensors\." ./dags ./plugins ./config
grep -r "from airflow.datasets import" ./dags ./plugins ./config
grep -r "SubDagOperator" ./dags ./plugins ./config
```

---

## 마치며

Airflow 3.0은 내부 아키텍처와 외부 인터페이스 모두에서 상당한 변화가 있습니다. 특히 `execution_date` 완전 제거와 표준 Operator의 Provider 이전은 대부분의 DAG에 영향을 미칩니다.

변경 범위가 넓어 보이지만, 대부분의 변경은 **import 경로 수정**과 **`execution_date` → `logical_date` 치환**으로 해결됩니다. 위의 체크리스트와 탐지 명령어를 활용해 체계적으로 마이그레이션을 진행하면 충분히 관리 가능한 수준입니다.

---

_Apache Airflow 공식 마이그레이션 가이드: [https://airflow.apache.org/docs/apache-airflow/stable/migration-guide.html](https://airflow.apache.org/docs/apache-airflow/stable/migration-guide.html)_
{% endraw %}
