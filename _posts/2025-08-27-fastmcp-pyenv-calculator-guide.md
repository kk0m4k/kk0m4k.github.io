---
layout: single
title: "pyenv 환경에서 MCP 서버 설정하기: Claude Desktop & Cursor AI"
date: 2025-08-27 10:00:00 +0900
categories: fastmcp
tags: [fastmcp]
---

Claude Desktop과 Cursor AI에서 pyenv 가상환경을 사용하는 MCP(Model Context Protocol) 서버를 설정하는 방법입니다.

## MCP 서버 설정 파일

Claude Desktop이나 Cursor AI의 `settings.json`에 다음과 같이 설정합니다:

```json
{
  "mcpServers": {
    "calculator": {
      "command": "/bin/bash",
      "args": [
        "-c",
        "PYENV_VERSION=mcp-venv pyenv exec python /path/to/your/mcp_server.py"
      ]
    }
  }
}
```

### 설정 해석
- `PYENV_VERSION=mcp-venv`: pyenv 가상환경 지정
- `pyenv exec python`: 해당 가상환경의 Python 실행
- `/bin/bash -c`: 환경변수와 함께 명령 실행

## 빠른 시작 가이드

### 1. pyenv 가상환경 생성
```bash
pyenv virtualenv 3.10.4 mcp-venv
PYENV_VERSION=mcp-venv pip install fastmcp
```

### 2. 샘플 MCP 서버 (계산기 예제)
```python
# calculator_mcp.py
import sys
import json

def main():
    line = sys.stdin.readline()
    if not line:
        return
    
    parts = line.strip().split()
    num1 = float(parts[0])
    num2 = float(parts[1])
    
    result = {"result": num1 * num2}
    print(json.dumps(result))

if __name__ == "__main__":
    main()
```

### 3. 클라이언트 설정
위의 JSON 설정을 Claude Desktop 또는 Cursor AI의 설정 파일에 추가하면 완료입니다.

## 주의사항
- 경로는 반드시 절대경로 사용
- pyenv가 시스템에 설치되어 있어야 함
- 가상환경 이름이 정확해야 함
