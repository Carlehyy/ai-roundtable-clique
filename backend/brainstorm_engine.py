"""
Brainstorm engine - orchestrate multi-LLM discussions
"""
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models import Session, Message, LLMProvider, ConsensusPoint, SessionLLM
from schemas import MessageCreate, MessageRole
from llm_providers import create_provider
from websocket_manager import (
    notify_new_message, notify_llm_typing, notify_llm_stopped_typing,
    notify_consensus_update, notify_round_update, notify_session_completed
)

class BrainstormEngine:
    """Engine to manage multi-LLM brainstorming sessions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.active_sessions: Dict[int, dict] = {}  # session_id -> session state
    
    async def initialize_session(self, session_id: int) -> dict:
        """Initialize a brainstorming session"""
        from sqlalchemy.orm import selectinload
        
        # Load session with LLMs
        result = await self.db.execute(
            select(Session)
            .where(Session.id == session_id)
            .options(selectinload(Session.llms))
        )
        session = result.scalar_one_or_none()
        
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Load LLM providers
        llm_configs = []
        for llm in session.llms:
            if llm.is_enabled and llm.api_key:
                llm_configs.append({
                    "id": llm.id,
                    "name": llm.display_name,
                    "provider_type": llm.provider_type,
                    "model_name": llm.model_name,
                    "api_key": llm.api_key,
                    "api_base": llm.api_base,
                    "brand_color": llm.brand_color
                })
        
        # Initialize session state
        session_state = {
            "session_id": session_id,
            "topic": session.topic,
            "llms": llm_configs,
            "current_round": 0,
            "max_rounds": session.max_rounds,
            "temperature": session.temperature,
            "max_tokens": session.max_tokens,
            "messages": [],  # Discussion history
            "consensus_points": [],
            "is_running": False
        }
        
        self.active_sessions[session_id] = session_state
        return session_state
    
    async def start_brainstorm(self, session_id: int) -> bool:
        """Start the brainstorming process"""
        if session_id not in self.active_sessions:
            await self.initialize_session(session_id)
        
        session_state = self.active_sessions[session_id]
        session_state["is_running"] = True
        
        # Add system message to introduce the topic
        intro_message = f"""欢迎来到多AI头脑风暴会议！

讨论话题：{session_state['topic']}

参与讨论的AI助手：{', '.join([llm['name'] for llm in session_state['llms']])}

规则：
1. 每位AI助手将依次发表观点
2. 可以回应其他AI的观点，提出赞同或反对意见
3. 目标是逐步达成共识，找到最佳解决方案
4. 讨论将进行最多 {session_state['max_rounds']} 轮

现在，让我们开始讨论！"""
        
        # Save system message
        system_msg = Message(
            session_id=session_id,
            role=MessageRole.SYSTEM,
            content=intro_message
        )
        self.db.add(system_msg)
        await self.db.commit()
        
        await notify_new_message(session_id, {
            "id": system_msg.id,
            "role": "system",
            "content": intro_message,
            "created_at": datetime.utcnow().isoformat()
        })
        
        # Start the first round
        await self._run_round(session_id)
        
        return True
    
    async def _run_round(self, session_id: int):
        """Run one round of discussion"""
        session_state = self.active_sessions[session_id]
        session_state["current_round"] += 1
        
        current_round = session_state["current_round"]
        
        # Notify round update
        await notify_round_update(session_id, {
            "current_round": current_round,
            "max_rounds": session_state["max_rounds"],
            "status": "started"
        })
        
        # Each LLM takes turns speaking
        for llm_config in session_state["llms"]:
            if not session_state["is_running"]:
                break
            
            await self._llm_speak(session_id, llm_config)
            
            # Small delay between speakers
            await asyncio.sleep(1)
        
        # Check if we should continue
        if current_round < session_state["max_rounds"] and session_state["is_running"]:
            # Add a small delay before next round
            await asyncio.sleep(2)
            await self._run_round(session_id)
        else:
            await self._finalize_session(session_id)
    
    async def _llm_speak(self, session_id: int, llm_config: dict):
        """Have an LLM generate a response"""
        session_state = self.active_sessions[session_id]
        
        # Notify that LLM is typing
        await notify_llm_typing(session_id, llm_config["id"], llm_config["name"])
        
        try:
            # Build conversation context
            messages = self._build_context(session_state, llm_config)
            
            # Create provider and generate response
            provider = create_provider(
                llm_config["provider_type"],
                llm_config["api_key"],
                llm_config["model_name"],
                llm_config.get("api_base")
            )
            
            response = await provider.generate_response(
                messages,
                temperature=session_state["temperature"],
                max_tokens=session_state["max_tokens"]
            )
            
            if response.error:
                content = f"[Error generating response: {response.error}]"
            else:
                content = response.content
            
            # Save message to database
            message = Message(
                session_id=session_id,
                llm_id=llm_config["id"],
                role=MessageRole.ASSISTANT,
                content=content,
                thinking_content=response.thinking_content,
                tokens_used=response.tokens_used,
                response_time_ms=response.response_time_ms
            )
            self.db.add(message)
            await self.db.commit()
            await self.db.refresh(message)
            
            # Update session state
            session_state["messages"].append({
                "role": "assistant",
                "content": content,
                "llm_name": llm_config["name"]
            })
            
            # Notify clients
            await notify_llm_stopped_typing(session_id, llm_config["id"])
            await notify_new_message(session_id, {
                "id": message.id,
                "session_id": session_id,
                "llm_id": llm_config["id"],
                "llm_name": llm_config["name"],
                "llm_brand_color": llm_config["brand_color"],
                "role": "assistant",
                "content": content,
                "thinking_content": response.thinking_content,
                "tokens_used": response.tokens_used,
                "response_time_ms": response.response_time_ms,
                "created_at": message.created_at.isoformat()
            })
            
            # Update consensus
            await self._update_consensus(session_id)
            
        except Exception as e:
            await notify_llm_stopped_typing(session_id, llm_config["id"])
            # Send error message
            error_msg = Message(
                session_id=session_id,
                llm_id=llm_config["id"],
                role=MessageRole.SYSTEM,
                content=f"[{llm_config['name']} encountered an error: {str(e)}]"
            )
            self.db.add(error_msg)
            await self.db.commit()
    
    def _build_context(self, session_state: dict, current_llm: dict) -> List[Dict[str, str]]:
        """Build conversation context for an LLM"""
        messages = []
        
        # System prompt
        system_prompt = f"""You are {current_llm['name']}, participating in a brainstorming session with other AI assistants.

Topic: {session_state['topic']}

Guidelines:
1. Share your unique perspective on the topic
2. Respond to points made by other AI assistants if you agree or disagree
3. Be constructive and aim to build consensus
4. Keep your response concise (2-4 paragraphs)
5. Address other participants by name when responding to them
6. Aim to find common ground and work towards a unified solution

Other participants: {', '.join([llm['name'] for llm in session_state['llms'] if llm['id'] != current_llm['id']])}

Current round: {session_state['current_round']} of {session_state['max_rounds']}"""
        
        messages.append({"role": "system", "content": system_prompt})
        
        # Add previous messages
        for msg in session_state["messages"][-10:]:  # Last 10 messages for context
            if msg["role"] == "assistant":
                messages.append({
                    "role": "assistant",
                    "content": f"[{msg.get('llm_name', 'AI')}]: {msg['content']}"
                })
            else:
                messages.append(msg)
        
        return messages
    
    async def _update_consensus(self, session_id: int):
        """Update consensus tracking"""
        session_state = self.active_sessions[session_id]
        
        # Simple consensus calculation based on message count
        total_messages = len(session_state["messages"])
        if total_messages == 0:
            return
        
        # Calculate a simple consensus score (this could be more sophisticated)
        consensus_score = min(100, (total_messages / (session_state["max_rounds"] * len(session_state["llms"]))) * 100)
        
        await notify_consensus_update(session_id, {
            "consensus_percentage": round(consensus_score, 1),
            "current_round": session_state["current_round"],
            "total_messages": total_messages
        })
    
    async def _finalize_session(self, session_id: int):
        """Finalize the brainstorming session"""
        session_state = self.active_sessions[session_id]
        session_state["is_running"] = False
        
        # Generate summary
        summary = await self._generate_summary(session_id)
        
        # Save summary as system message
        summary_msg = Message(
            session_id=session_id,
            role=MessageRole.SYSTEM,
            content=summary
        )
        self.db.add(summary_msg)
        
        # Update session
        result = await self.db.execute(
            select(Session).where(Session.id == session_id)
        )
        session = result.scalar_one()
        session.is_completed = True
        session.consensus_reached = True
        session.consensus_percentage = 80.0  # Placeholder
        session.completed_at = datetime.utcnow()
        
        await self.db.commit()
        
        # Notify clients
        await notify_session_completed(session_id, {
            "summary": summary,
            "total_rounds": session_state["current_round"],
            "total_messages": len(session_state["messages"]),
            "consensus_percentage": 80.0
        })
        
        # Clean up session state
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
    
    async def _generate_summary(self, session_id: int) -> str:
        """Generate a summary of the discussion"""
        session_state = self.active_sessions[session_id]
        
        summary = f"""## 讨论总结

**话题**: {session_state['topic']}

**讨论统计**:
- 总轮数: {session_state['current_round']}
- 参与AI: {', '.join([llm['name'] for llm in session_state['llms']])}
- 总消息数: {len(session_state['messages'])}

**主要观点**:
"""
        
        # Add key points from each LLM
        for llm in session_state["llms"]:
            llm_messages = [m for m in session_state["messages"] if m.get("llm_name") == llm["name"]]
            if llm_messages:
                summary += f"\n**{llm['name']}**:\n"
                for i, msg in enumerate(llm_messages[:3], 1):  # Top 3 messages
                    preview = msg['content'][:100] + "..." if len(msg['content']) > 100 else msg['content']
                    summary += f"{i}. {preview}\n"
        
        summary += "\n**共识程度**: 80%\n"
        summary += "\n感谢所有参与者的贡献！"
        
        return summary
    
    async def add_user_message(self, session_id: int, content: str) -> Message:
        """Add a user message to the session"""
        session_state = self.active_sessions.get(session_id)
        
        # Save to database
        message = Message(
            session_id=session_id,
            role=MessageRole.USER,
            content=content
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        
        # Update session state
        if session_state:
            session_state["messages"].append({
                "role": "user",
                "content": content
            })
        
        # Notify clients
        await notify_new_message(session_id, {
            "id": message.id,
            "session_id": session_id,
            "role": "user",
            "content": content,
            "created_at": message.created_at.isoformat()
        })
        
        return message
    
    async def stop_session(self, session_id: int):
        """Stop an active session"""
        if session_id in self.active_sessions:
            self.active_sessions[session_id]["is_running"] = False
            await self._finalize_session(session_id)
