#!/usr/bin/env python3
"""
End-to-End Testing Script for SynapseMind
Tests all major functionalities of the platform
"""
import os
import sys
import json
import time
import asyncio
import httpx
from typing import Dict, List, Any

BASE_URL = "http://localhost:8000"
API_KEY = os.environ.get("OPENAI_API_KEY", "")

class TestRunner:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.test_results = []
        self.provider_ids = []
        self.session_id = None
        
    async def log_test(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "data": data
        }
        self.test_results.append(result)
        
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"\n{status} - {test_name}")
        if message:
            print(f"  Message: {message}")
        if data and not success:
            print(f"  Data: {json.dumps(data, indent=2)}")
    
    async def test_health_check(self):
        """Test 1: Health Check"""
        try:
            response = await self.client.get(f"{BASE_URL}/health")
            success = response.status_code == 200
            data = response.json() if success else None
            await self.log_test(
                "Health Check",
                success,
                f"Status: {response.status_code}",
                data
            )
            return success
        except Exception as e:
            await self.log_test("Health Check", False, str(e))
            return False
    
    async def test_get_providers(self):
        """Test 2: Get All Providers"""
        try:
            response = await self.client.get(f"{BASE_URL}/api/providers")
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success:
                provider_count = len(data)
                await self.log_test(
                    "Get All Providers",
                    True,
                    f"Found {provider_count} default providers",
                    {"count": provider_count, "providers": [p["name"] for p in data]}
                )
            else:
                await self.log_test("Get All Providers", False, f"Status: {response.status_code}", data)
            
            return success
        except Exception as e:
            await self.log_test("Get All Providers", False, str(e))
            return False
    
    async def test_create_provider(self, name: str, display_name: str, model_name: str):
        """Test 3: Create LLM Provider"""
        try:
            provider_data = {
                "name": name,
                "display_name": display_name,
                "provider_type": "openai",
                "model_name": model_name,
                "api_key": API_KEY,
                "api_base": None,  # Will use default OpenAI-compatible endpoint
                "brand_color": "#10a37f",
                "icon_url": None,
                "config": {}
            }
            
            response = await self.client.post(
                f"{BASE_URL}/api/providers",
                json=provider_data
            )
            
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success:
                self.provider_ids.append(data["id"])
                await self.log_test(
                    f"Create Provider: {display_name}",
                    True,
                    f"Provider ID: {data['id']}",
                    {"id": data["id"], "name": data["name"], "status": data["status"]}
                )
            else:
                await self.log_test(
                    f"Create Provider: {display_name}",
                    False,
                    f"Status: {response.status_code}",
                    data
                )
            
            return success, data.get("id") if success else None
        except Exception as e:
            await self.log_test(f"Create Provider: {display_name}", False, str(e))
            return False, None
    
    async def test_test_provider_connection(self, provider_id: int, provider_name: str):
        """Test 4: Test Provider Connection"""
        try:
            response = await self.client.post(
                f"{BASE_URL}/api/providers/{provider_id}/test"
            )
            
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and data.get("success"):
                await self.log_test(
                    f"Test Connection: {provider_name}",
                    True,
                    "Connection successful",
                    data
                )
            else:
                await self.log_test(
                    f"Test Connection: {provider_name}",
                    False,
                    data.get("message", "Connection failed") if data else "Unknown error",
                    data
                )
            
            return success and data.get("success", False)
        except Exception as e:
            await self.log_test(f"Test Connection: {provider_name}", False, str(e))
            return False
    
    async def test_create_session(self):
        """Test 5: Create Brainstorm Session"""
        try:
            # Only use providers that are online
            response = await self.client.get(f"{BASE_URL}/api/providers")
            if response.status_code != 200:
                await self.log_test("Create Session", False, "Failed to get providers")
                return False
            
            providers = response.json()
            online_providers = [p for p in providers if p["status"] == "online" and p["is_enabled"]]
            
            if len(online_providers) < 1:
                await self.log_test("Create Session", False, "No online providers available")
                return False
            
            # Use up to 3 online providers
            selected_llm_ids = [p["id"] for p in online_providers[:3]]
            
            session_data = {
                "title": "测试讨论: AI的未来发展",
                "description": "这是一个端到端测试会话",
                "topic": "请讨论人工智能在未来10年的发展趋势和潜在影响",
                "llm_ids": selected_llm_ids,
                "max_rounds": 3,
                "temperature": 0.7,
                "max_tokens": 500
            }
            
            response = await self.client.post(
                f"{BASE_URL}/api/sessions",
                json=session_data
            )
            
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success:
                self.session_id = data["id"]
                await self.log_test(
                    "Create Session",
                    True,
                    f"Session ID: {self.session_id}",
                    {
                        "id": data["id"],
                        "title": data["title"],
                        "llm_count": len(selected_llm_ids)
                    }
                )
            else:
                await self.log_test("Create Session", False, f"Status: {response.status_code}", data)
            
            return success
        except Exception as e:
            await self.log_test("Create Session", False, str(e))
            return False
    
    async def test_get_session(self):
        """Test 6: Get Session Details"""
        if not self.session_id:
            await self.log_test("Get Session", False, "No session ID available")
            return False
        
        try:
            response = await self.client.get(f"{BASE_URL}/api/sessions/{self.session_id}")
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success:
                await self.log_test(
                    "Get Session",
                    True,
                    f"Retrieved session: {data['title']}",
                    {
                        "id": data["id"],
                        "title": data["title"],
                        "is_active": data["is_active"],
                        "current_round": data["current_round"]
                    }
                )
            else:
                await self.log_test("Get Session", False, f"Status: {response.status_code}", data)
            
            return success
        except Exception as e:
            await self.log_test("Get Session", False, str(e))
            return False
    
    async def test_start_brainstorm(self):
        """Test 7: Start Brainstorm Session"""
        if not self.session_id:
            await self.log_test("Start Brainstorm", False, "No session ID available")
            return False
        
        try:
            response = await self.client.post(
                f"{BASE_URL}/api/sessions/{self.session_id}/start"
            )
            
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success:
                await self.log_test(
                    "Start Brainstorm",
                    True,
                    "Brainstorm started successfully",
                    data
                )
                
                # Wait a bit for the brainstorm to generate some messages
                print("  Waiting 10 seconds for brainstorm to generate messages...")
                await asyncio.sleep(10)
            else:
                await self.log_test("Start Brainstorm", False, f"Status: {response.status_code}", data)
            
            return success
        except Exception as e:
            await self.log_test("Start Brainstorm", False, str(e))
            return False
    
    async def test_get_messages(self):
        """Test 8: Get Session Messages"""
        if not self.session_id:
            await self.log_test("Get Messages", False, "No session ID available")
            return False
        
        try:
            response = await self.client.get(
                f"{BASE_URL}/api/sessions/{self.session_id}/messages"
            )
            
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success:
                message_count = len(data)
                await self.log_test(
                    "Get Messages",
                    True,
                    f"Retrieved {message_count} messages",
                    {
                        "count": message_count,
                        "sample": data[0] if data else None
                    }
                )
            else:
                await self.log_test("Get Messages", False, f"Status: {response.status_code}", data)
            
            return success
        except Exception as e:
            await self.log_test("Get Messages", False, str(e))
            return False
    
    async def test_get_stats(self):
        """Test 9: Get System Stats"""
        try:
            response = await self.client.get(f"{BASE_URL}/api/stats")
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success:
                await self.log_test(
                    "Get System Stats",
                    True,
                    "Stats retrieved successfully",
                    data
                )
            else:
                await self.log_test("Get System Stats", False, f"Status: {response.status_code}", data)
            
            return success
        except Exception as e:
            await self.log_test("Get System Stats", False, str(e))
            return False
    
    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 80)
        print("SynapseMind - End-to-End Testing")
        print("=" * 80)
        
        # Test 1: Health Check
        if not await self.test_health_check():
            print("\n❌ Health check failed. Aborting tests.")
            return
        
        # Test 2: Get Providers
        await self.test_get_providers()
        
        # Test 3: Create multiple providers with different models
        providers_to_create = [
            ("gpt4-mini", "GPT-4.1 Mini", "gpt-4.1-mini"),
            ("gpt4-nano", "GPT-4.1 Nano", "gpt-4.1-nano"),
            ("gemini-flash", "Gemini 2.5 Flash", "gemini-2.5-flash"),
        ]
        
        for name, display_name, model in providers_to_create:
            success, provider_id = await self.test_create_provider(name, display_name, model)
            if success and provider_id:
                # Test connection for each created provider
                await asyncio.sleep(1)  # Small delay between tests
                await self.test_test_provider_connection(provider_id, display_name)
        
        # Test 5: Create Session
        if await self.test_create_session():
            # Test 6: Get Session
            await self.test_get_session()
            
            # Test 7: Start Brainstorm
            if await self.test_start_brainstorm():
                # Test 8: Get Messages
                await self.test_get_messages()
        
        # Test 9: Get Stats
        await self.test_get_stats()
        
        # Print summary
        await self.print_summary()
        
        await self.client.aclose()
    
    async def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["success"])
        failed = total - passed
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: {passed} ✓")
        print(f"Failed: {failed} ✗")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "=" * 80)
        
        # Save results to file
        with open("/home/ubuntu/test_results.json", "w") as f:
            json.dump(self.test_results, f, indent=2, ensure_ascii=False)
        print("\nDetailed results saved to: /home/ubuntu/test_results.json")

async def main():
    if not API_KEY:
        print("❌ Error: OPENAI_API_KEY environment variable not set")
        sys.exit(1)
    
    runner = TestRunner()
    await runner.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
