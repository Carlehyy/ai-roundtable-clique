"""
WebSocket connection manager for real-time communication
"""
import json
import asyncio
from typing import Dict, List, Set
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from schemas import WebSocketMessage, WSMessageType

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        # session_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # websocket -> user_info
        self.user_info: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, session_id: int):
        """Accept and register a new connection"""
        await websocket.accept()
        
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        
        self.active_connections[session_id].add(websocket)
        self.user_info[websocket] = {
            "session_id": session_id,
            "connected_at": datetime.utcnow()
        }
        
        # Notify others that a user joined
        await self.broadcast_to_session(
            session_id,
            {
                "type": WSMessageType.USER_JOINED,
                "data": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "connection_count": len(self.active_connections[session_id])
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    def disconnect(self, websocket: WebSocket):
        """Remove a connection"""
        session_id = self.user_info.get(websocket, {}).get("session_id")
        
        if session_id and session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            
            # Clean up empty sessions
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        
        if websocket in self.user_info:
            del self.user_info[websocket]
        
        return session_id
    
    async def broadcast_to_session(self, session_id: int, message: dict):
        """Broadcast message to all connections in a session"""
        if session_id not in self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections[session_id]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.active_connections[session_id].discard(conn)
    
    async def send_to_websocket(self, websocket: WebSocket, message: dict):
        """Send message to a specific websocket"""
        try:
            await websocket.send_json(message)
        except Exception:
            pass
    
    def get_session_connections(self, session_id: int) -> Set[WebSocket]:
        """Get all connections for a session"""
        return self.active_connections.get(session_id, set())
    
    def get_connection_count(self, session_id: int) -> int:
        """Get number of connections for a session"""
        return len(self.active_connections.get(session_id, set()))

# Global connection manager instance
manager = ConnectionManager()

# Helper functions for common message types
async def notify_new_message(session_id: int, message_data: dict):
    """Notify all clients about a new message"""
    await manager.broadcast_to_session(session_id, {
        "type": WSMessageType.NEW_MESSAGE,
        "data": message_data,
        "timestamp": datetime.utcnow().isoformat()
    })

async def notify_llm_typing(session_id: int, llm_id: int, llm_name: str):
    """Notify that an LLM is typing"""
    await manager.broadcast_to_session(session_id, {
        "type": WSMessageType.LLM_TYPING,
        "data": {
            "llm_id": llm_id,
            "llm_name": llm_name
        },
        "timestamp": datetime.utcnow().isoformat()
    })

async def notify_llm_stopped_typing(session_id: int, llm_id: int):
    """Notify that an LLM stopped typing"""
    await manager.broadcast_to_session(session_id, {
        "type": WSMessageType.LLM_STOPPED_TYPING,
        "data": {
            "llm_id": llm_id
        },
        "timestamp": datetime.utcnow().isoformat()
    })

async def notify_consensus_update(session_id: int, consensus_data: dict):
    """Notify about consensus update"""
    await manager.broadcast_to_session(session_id, {
        "type": WSMessageType.CONSENSUS_UPDATE,
        "data": consensus_data,
        "timestamp": datetime.utcnow().isoformat()
    })

async def notify_round_update(session_id: int, round_data: dict):
    """Notify about round update"""
    await manager.broadcast_to_session(session_id, {
        "type": WSMessageType.ROUND_UPDATE,
        "data": round_data,
        "timestamp": datetime.utcnow().isoformat()
    })

async def notify_session_completed(session_id: int, result_data: dict):
    """Notify that session is completed"""
    await manager.broadcast_to_session(session_id, {
        "type": WSMessageType.SESSION_COMPLETED,
        "data": result_data,
        "timestamp": datetime.utcnow().isoformat()
    })

async def send_error(websocket: WebSocket, error_message: str):
    """Send error message to a specific client"""
    await manager.send_to_websocket(websocket, {
        "type": WSMessageType.ERROR,
        "data": {
            "message": error_message
        },
        "timestamp": datetime.utcnow().isoformat()
    })
