"""
Pydantic schemas for API
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

# Enums
class LLMProviderStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    TESTING = "testing"

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

# LLM Provider Schemas
class LLMProviderBase(BaseModel):
    name: str
    display_name: str
    provider_type: str
    model_name: str
    brand_color: str = "#3b82f6"
    icon_url: Optional[str] = None

class LLMProviderCreate(LLMProviderBase):
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    config: Dict[str, Any] = {}

class LLMProviderUpdate(BaseModel):
    display_name: Optional[str] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    model_name: Optional[str] = None
    is_enabled: Optional[bool] = None
    brand_color: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class LLMProviderResponse(LLMProviderBase):
    id: int
    status: LLMProviderStatus
    is_enabled: bool
    total_quota: Optional[float]
    used_quota: float
    remaining_quota: Optional[float]
    avg_response_time: Optional[float]
    success_rate: float
    last_check_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LLMProviderStatusResponse(BaseModel):
    id: int
    name: str
    display_name: str
    status: LLMProviderStatus
    is_enabled: bool
    remaining_quota: Optional[float]
    avg_response_time: Optional[float]
    brand_color: str

# Message Schemas
class MessageBase(BaseModel):
    content: str
    role: MessageRole

class MessageCreate(MessageBase):
    session_id: int
    llm_id: Optional[int] = None
    thinking_content: Optional[str] = None
    tokens_used: Optional[int] = None
    sentiment: Optional[str] = None
    key_points: List[str] = []

class MessageResponse(MessageBase):
    id: int
    session_id: int
    llm_id: Optional[int]
    llm_name: Optional[str] = None
    llm_brand_color: Optional[str] = None
    thinking_content: Optional[str]
    tokens_used: Optional[int]
    response_time_ms: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Session Schemas
class SessionBase(BaseModel):
    title: str
    description: Optional[str] = None
    topic: str
    max_rounds: int = 10
    temperature: float = 0.7
    max_tokens: int = 2000

class SessionCreate(SessionBase):
    llm_ids: List[int]

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_completed: Optional[bool] = None
    consensus_reached: Optional[bool] = None
    consensus_percentage: Optional[float] = None

class SessionResponse(SessionBase):
    id: int
    current_round: int
    is_active: bool
    is_completed: bool
    consensus_reached: bool
    consensus_percentage: float
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    llms: List[LLMProviderResponse]
    message_count: int = 0
    
    class Config:
        from_attributes = True

class SessionDetailResponse(SessionResponse):
    messages: List[MessageResponse]

# Consensus Point Schemas
class ConsensusPointBase(BaseModel):
    point_text: str

class ConsensusPointCreate(ConsensusPointBase):
    session_id: int

class ConsensusPointResponse(ConsensusPointBase):
    id: int
    session_id: int
    agreement_percentage: float
    supporting_llms: List[str]
    opposing_llms: List[str]
    is_resolved: bool
    resolution: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# WebSocket Message Schemas
class WSMessageType(str, Enum):
    # Client to Server
    JOIN_SESSION = "join_session"
    LEAVE_SESSION = "leave_session"
    SEND_MESSAGE = "send_message"
    START_BRAINSTORM = "start_brainstorm"
    NEXT_ROUND = "next_round"
    
    # Server to Client
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    NEW_MESSAGE = "new_message"
    LLM_TYPING = "llm_typing"
    LLM_STOPPED_TYPING = "llm_stopped_typing"
    CONSENSUS_UPDATE = "consensus_update"
    ROUND_UPDATE = "round_update"
    SESSION_COMPLETED = "session_completed"
    ERROR = "error"

class WebSocketMessage(BaseModel):
    type: WSMessageType
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Brainstorm Schemas
class BrainstormConfig(BaseModel):
    topic: str
    llm_ids: List[int]
    max_rounds: int = 10
    temperature: float = 0.7
    max_tokens: int = 2000

class LLMThought(BaseModel):
    llm_id: int
    llm_name: str
    content: str
    thinking: Optional[str] = None
    consensus_level: float = 0.0  # 0-1, how much this aligns with current consensus

# Admin Schemas
class SystemStats(BaseModel):
    total_sessions: int
    active_sessions: int
    total_messages: int
    total_llms: int
    online_llms: int

class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    response_time_ms: Optional[float] = None
    quota_info: Optional[Dict[str, Any]] = None
