"""
Calculator tool for FastMCP server
"""

def multiply(a: int, b: int) -> int:
    """두 정수를 곱한 결과를 반환합니다."""
    return a * b

def divide(a: int, b: int) -> float:
    """첫 번째 정수를 두 번째 정수로 나눈 결과를 반환합니다."""
    if b == 0:
        return "오류: 0으로 나눌 수 없습니다."
    return a / b

def add(a: int, b: int) -> int:
    """두 정수를 더한 결과를 반환합니다."""
    return a + b

def subtract(a: int, b: int) -> int:
    """첫 번째 정수에서 두 번째 정수를 뺀 결과를 반환합니다."""
    return a - b