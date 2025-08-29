"""
MCP 클라이언트를 사용하여 Gemini LLM과 연동하는 코드
"""

import asyncio
import google.generativeai as genai
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

class MCPGeminiClient:
    def __init__(self, server_script_path: str):
        self.server_script_path = server_script_path
        self.session = None
        self.available_tools = []
        
        # Gemini API 설정
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        
    async def connect_to_server(self):
        """MCP 서버에 연결하고 사용 가능한 도구를 가져옵니다."""
        server_params = StdioServerParameters(
            command="python",
            args=[self.server_script_path]
        )
        
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                self.session = session
                
                # 서버 초기화
                await session.initialize()
                
                # 사용 가능한 도구 목록 가져오기
                tools_result = await session.list_tools()
                self.available_tools = tools_result.tools
                
                print(f"✅ MCP 서버 연결됨. 사용 가능한 도구: {len(self.available_tools)}개")
                for tool in self.available_tools:
                    print(f"  - {tool.name}: {tool.description}")
                
                return session
    
    def create_gemini_function_declarations(self):
        """MCP 도구를 Gemini 함수 선언으로 변환합니다."""
        function_declarations = []
        
        for tool in self.available_tools:
            # MCP 도구 정보를 Gemini 함수 형식으로 변환
            parameters = {}
            if hasattr(tool, 'inputSchema') and tool.inputSchema:
                if 'properties' in tool.inputSchema:
                    for param_name, param_info in tool.inputSchema['properties'].items():
                        parameters[param_name] = {
                            "type": param_info.get('type', 'string'),
                            "description": param_info.get('description', '')
                        }
            
            function_declarations.append({
                "name": tool.name,
                "description": tool.description,
                "parameters": {
                    "type": "object",
                    "properties": parameters
                }
            })
        
        return function_declarations
    
    async def call_mcp_tool(self, tool_name: str, arguments: dict):
        """MCP 도구를 호출합니다."""
        try:
            result = await self.session.call_tool(tool_name, arguments)
            if result.content:
                # 결과가 리스트인 경우 첫 번째 항목의 텍스트 반환
                if isinstance(result.content, list) and len(result.content) > 0:
                    return result.content[0].text if hasattr(result.content[0], 'text') else str(result.content[0])
                else:
                    return str(result.content)
            return "도구 실행 완료"
        except Exception as e:
            return f"도구 실행 오류: {str(e)}"
    
    async def handle_user_request(self, user_prompt: str):
        """사용자 요청을 처리합니다."""
        print(f"👤 사용자: {user_prompt}")
        
        # Gemini 모델 설정
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            tools=self.create_gemini_function_declarations()
        )
        
        try:
            # Gemini에 요청 전송
            response = model.generate_content(
                user_prompt,
                tool_config={"function_calling_config": {"mode": "AUTO"}}
            )
            
            # 함수 호출이 요청된 경우
            if (response.candidates[0].content.parts and
                len(response.candidates[0].content.parts) > 0 and
                hasattr(response.candidates[0].content.parts[0], 'function_call') and
                response.candidates[0].content.parts[0].function_call):
                
                function_call = response.candidates[0].content.parts[0].function_call
                function_name = function_call.name
                function_args = {key: value for key, value in function_call.args.items()}
                
                print(f"🔧 MCP 도구 호출: {function_name}({function_args})")
                
                # MCP 도구 실행
                tool_result = await self.call_mcp_tool(function_name, function_args)
                
                # 결과를 포함하여 다시 Gemini에 요청
                function_response_content = genai.protos.Content(
                    parts=[genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=function_name,
                            response={"result": tool_result}
                        )
                    )],
                    role="user"
                )
                
                response = model.generate_content([
                    genai.protos.Content(parts=[genai.protos.Part(text=user_prompt)], role="user"),
                    response.candidates[0].content,
                    function_response_content
                ])
            
            # 최종 답변 출력
            print(f"🤖 Gemini: {response.text}")
            
        except Exception as e:
            print(f"🤖 Gemini: 오류가 발생했습니다: {str(e)}")

async def main():
    """메인 실행 함수"""
    # MCP 서버 스크립트 경로
    server_script = "/Users/francesco/Work/kk0m4k_github/kk0m4k.github.io/_posts/mcp_server.py"
    
    # 클라이언트 생성 및 서버 연결
    client = MCPGeminiClient(server_script)
    
    async with await client.connect_to_server():
        # 사용 예시
        await client.handle_user_request("안녕 제미니")
        print("-" * 40)
        
        await client.handle_user_request("3이랑 5를 곱해줘")
        print("-" * 40)
        
        await client.handle_user_request("100을 4로 나누면 결과가 뭐야?")
        print("-" * 40)
        
        await client.handle_user_request("50 더하기 30에서 15를 뺀 값은?")

if __name__ == "__main__":
    asyncio.run(main())