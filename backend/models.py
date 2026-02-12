"""
Database models for SynapseMind
"""
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    Text, ForeignKey, Enum, JSON, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

Base = declarative_base()

class LLMProviderStatus(str, PyEnum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    TESTING = "testing"

class MessageRole(str, PyEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class LLMProvider(Base):
    """LLM Provider configuration and status"""
    __tablename__ = "llm_providers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    provider_type = Column(String(50), nullable=False)  # claude, openai, gemini, etc.
    api_key = Column(String(500), nullable=True)  # Encrypted storage
    api_base = Column(String(500), nullable=True)  # Custom API base URL
    model_name = Column(String(100), nullable=False)
    
    # Status tracking
    status = Column(Enum(LLMProviderStatus), default=LLMProviderStatus.OFFLINE)
    is_enabled = Column(Boolean, default=True)
    
    # Usage tracking
    total_quota = Column(Float, nullable=True)  # Total quota (if available)
    used_quota = Column(Float, default=0.0)  # Used quota
    remaining_quota = Column(Float, nullable=True)  # Remaining quota
    
    # Performance metrics
    avg_response_time = Column(Float, nullable=True)  # Average response time in ms
    success_rate = Column(Float, default=100.0)  # Success rate percentage
    last_check_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)  # Last time used in a session
    
    # Brand colors for UI
    brand_color = Column(String(7), default="#3b82f6")
    icon_url = Column(String(500), nullable=True)
    
    # Configuration
    config = Column(JSON, default=dict)  # Additional provider-specific config
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sessions = relationship("Session", secondary="session_llms", back_populates="llms")
    messages = relationship("Message", back_populates="llm")

class Session(Base):
    """Brainstorm session"""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    topic = Column(Text, nullable=False)
    
    # Session configuration
    max_rounds = Column(Integer, default=10)
    current_round = Column(Integer, default=0)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2000)
    
    # Session status
    is_active = Column(Boolean, default=True)
    is_completed = Column(Boolean, default=False)
    consensus_reached = Column(Boolean, default=False)
    consensus_percentage = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    llms = relationship("LLMProvider", secondary="session_llms", back_populates="sessions")
    messages = relationship("Message", back_populates="session", order_by="Message.created_at")

class SessionLLM(Base):
    """Many-to-many relationship between Session and LLMProvider"""
    __tablename__ = "session_llms"
    
    session_id = Column(Integer, ForeignKey("sessions.id"), primary_key=True)
    llm_id = Column(Integer, ForeignKey("llm_providers.id"), primary_key=True)
    
    # Session-specific settings
    is_active = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)  # Speaking order
    
    # Session-specific metrics
    message_count = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)

class Message(Base):
    """Chat message"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    llm_id = Column(Integer, ForeignKey("llm_providers.id"), nullable=True)  # Null for user messages
    
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    
    # For LLM messages
    thinking_content = Column(Text, nullable=True)  # Chain of thought
    tokens_used = Column(Integer, nullable=True)
    response_time_ms = Column(Float, nullable=True)
    
    # Consensus tracking
    sentiment = Column(String(20), nullable=True)  # positive, negative, neutral
    key_points = Column(JSON, default=list)  # Extracted key points
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="messages")
    llm = relationship("LLMProvider", back_populates="messages")

class ConsensusPoint(Base):
    """Track consensus points during discussion"""
    __tablename__ = "consensus_points"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    
    point_text = Column(Text, nullable=False)
    agreement_percentage = Column(Float, default=0.0)
    supporting_llms = Column(JSON, default=list)
    opposing_llms = Column(JSON, default=list)
    
    is_resolved = Column(Boolean, default=False)
    resolution = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

# Database setup
DATABASE_URL = "sqlite+aiosqlite:///./synapsemind.db"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Dependency to get database session"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
