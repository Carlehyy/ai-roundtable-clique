#!/usr/bin/env python3
"""
Manual testing script for specific functionality
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def test_session_workflow():
    """Test complete session workflow"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Get online providers
        print("1. Getting online providers...")
        response = await client.get(f"{BASE_URL}/api/providers")
        providers = response.json()
        online_providers = [p for p in providers if p["status"] == "online"]
        print(f"   Found {len(online_providers)} online providers")
        for p in online_providers:
            print(f"   - {p['display_name']} (ID: {p['id']})")
        
        if len(online_providers) < 2:
            print("   ❌ Need at least 2 online providers")
            return
        
        # 2. Create session with online providers
        print("\n2. Creating session...")
        llm_ids = [p["id"] for p in online_providers[:3]]
        session_data = {
            "title": "AI未来发展讨论",
            "description": "多个AI模型讨论人工智能的未来",
            "topic": "请从不同角度讨论人工智能在未来10年可能带来的机遇和挑战",
            "llm_ids": llm_ids,
            "max_rounds": 2,
            "temperature": 0.8,
            "max_tokens": 300
        }
        
        response = await client.post(f"{BASE_URL}/api/sessions", json=session_data)
        if response.status_code != 200:
            print(f"   ❌ Failed to create session: {response.status_code}")
            print(f"   Response: {response.text}")
            return
        
        session = response.json()
        session_id = session["id"]
        print(f"   ✓ Session created (ID: {session_id})")
        
        # 3. Get session details
        print("\n3. Getting session details...")
        response = await client.get(f"{BASE_URL}/api/sessions/{session_id}")
        if response.status_code != 200:
            print(f"   ❌ Failed to get session: {response.status_code}")
            print(f"   Response: {response.text}")
            return
        
        session_detail = response.json()
        print(f"   ✓ Session: {session_detail['title']}")
        print(f"   Topic: {session_detail['topic']}")
        print(f"   Max rounds: {session_detail['max_rounds']}")
        
        # 4. Start brainstorm
        print("\n4. Starting brainstorm...")
        response = await client.post(f"{BASE_URL}/api/sessions/{session_id}/start")
        if response.status_code != 200:
            print(f"   ❌ Failed to start brainstorm: {response.status_code}")
            return
        
        print("   ✓ Brainstorm started")
        
        # 5. Wait and check messages
        print("\n5. Waiting for AI responses (15 seconds)...")
        await asyncio.sleep(15)
        
        response = await client.get(f"{BASE_URL}/api/sessions/{session_id}/messages")
        if response.status_code != 200:
            print(f"   ❌ Failed to get messages: {response.status_code}")
            return
        
        messages = response.json()
        print(f"   ✓ Retrieved {len(messages)} messages")
        
        # Display messages
        for i, msg in enumerate(messages, 1):
            print(f"\n   Message {i}:")
            print(f"   From: {msg.get('llm_name', 'Unknown')}")
            print(f"   Role: {msg['role']}")
            print(f"   Content: {msg['content'][:200]}..." if len(msg['content']) > 200 else f"   Content: {msg['content']}")
        
        # 6. Get final session state
        print("\n6. Getting final session state...")
        response = await client.get(f"{BASE_URL}/api/sessions/{session_id}")
        if response.status_code == 200:
            final_session = response.json()
            print(f"   Current round: {final_session['current_round']}/{final_session['max_rounds']}")
            print(f"   Is active: {final_session['is_active']}")
            print(f"   Is completed: {final_session['is_completed']}")
        
        # 7. Get stats
        print("\n7. System statistics...")
        response = await client.get(f"{BASE_URL}/api/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"   Total sessions: {stats['total_sessions']}")
            print(f"   Active sessions: {stats['active_sessions']}")
            print(f"   Total messages: {stats['total_messages']}")
            print(f"   Online LLMs: {stats['online_llms']}/{stats['total_llms']}")
        
        print("\n✓ Test completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_session_workflow())
