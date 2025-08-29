"""
FastMCP 서버 구현
계산기 도구를 제공하는 MCP 서버
"""

import asyncio
from fastmcp import FastMCP
from calculator_tool import multiply, divide, add, subtract

# FastMCP 서버 인스턴스 생성
mcp = FastMCP("Calculator Server")

@mcp.tool()
def multiply_tool(a: int, b: int) -> int:
    """두 정수를 곱한 결과를 반환합니다."""
    return multiply(a, b)

@mcp.tool()
def divide_tool(a: int, b: int) -> float | str:
    """첫 번째 정수를 두 번째 정수로 나눈 결과를 반환합니다."""
    return divide(a, b)

@mcp.tool()
def add_tool(a: int, b: int) -> int:
    """두 정수를 더한 결과를 반환합니다."""
    return add(a, b)

@mcp.tool()
def subtract_tool(a: int, b: int) -> int:
    """첫 번째 정수에서 두 번째 정수를 뺀 결과를 반환합니다."""
    return subtract(a, b)

if __name__ == "__main__":
    # 서버 실행
    mcp.run(transport="stdio")