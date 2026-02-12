"""
SynapseMind - Multi-LLM Brainstorming Platform
FastAPI Backend
"""
import os
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models import (
    init_db, get_db, async_session_maker, LLMProvider, Session, Message, 
    ConsensusPoint, SessionLLM, LLMProviderStatus
)
from schemas import (
    LLMProviderCreate, LLMProviderUpdate, LLMProviderResponse,
    SessionCreate, SessionUpdate, SessionResponse, SessionDetailResponse,
    MessageCreate, MessageResponse, ConsensusPointCreate, ConsensusPointResponse,
    TestConnectionResponse, SystemStats, WSMessageType
)
from llm_providers import create_provider, DEFAULT_PROVIDERS
from websocket_manager import ConnectionManager, manager, send_error
from brainstorm_engine import BrainstormEngine

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await init_db()
    
    # Initialize default providers if none exist
    async for db in get_db():
        result = await db.execute(select(func.count(LLMProvider.id)))
        count = result.scalar()
        
        if count == 0:
            # Add default providers
            for provider_data in DEFAULT_PROVIDERS:
                provider = LLMProvider(
                    name=provider_data["name"],
                    display_name=provider_data["display_name"],
                    provider_type=provider_data["provider_type"],
                    model_name=provider_data["model_name"],
                    brand_color=provider_data["brand_color"],
                    status=LLMProviderStatus.OFFLINE
                )
                db.add(provider)
            await db.commit()
            print("Initialized default LLM providers")
    
    yield
    
    # Shutdown
    print("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="SynapseMind API",
    description="Multi-LLM Brainstorming Platform Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== LLM Provider Endpoints ==============

@app.get("/api/providers", response_model=List[LLMProviderResponse])
async def get_providers(db: AsyncSession = Depends(get_db)):
    """Get all LLM providers"""
    result = await db.execute(select(LLMProvider).order_by(LLMProvider.display_name))
    providers = result.scalars().all()
    
    # Add masked API key to response
    response_data = []
    for provider in providers:
        provider_dict = {
            "id": provider.id,
            "name": provider.name,
            "display_name": provider.display_name,
            "provider_type": provider.provider_type,
            "model_name": provider.model_name,
            "brand_color": provider.brand_color,
            "icon_url": provider.icon_url,
            "status": provider.status,
            "is_enabled": provider.is_enabled,
            "api_key_masked": provider.api_key[:8] + "*" * 20 if provider.api_key else None,
            "api_base": provider.api_base,
            "total_quota": provider.total_quota,
            "used_quota": provider.used_quota,
            "remaining_quota": provider.remaining_quota,
            "avg_response_time": provider.avg_response_time,
            "success_rate": provider.success_rate,
            "last_check_at": provider.last_check_at,
            "created_at": provider.created_at,
            "updated_at": provider.updated_at
        }
        response_data.append(provider_dict)
    
    return response_data

@app.get("/api/providers/{provider_id}", response_model=LLMProviderResponse)
async def get_provider(provider_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific LLM provider"""
    result = await db.execute(select(LLMProvider).where(LLMProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Return with masked API key
    return {
        "id": provider.id,
        "name": provider.name,
        "display_name": provider.display_name,
        "provider_type": provider.provider_type,
        "model_name": provider.model_name,
        "brand_color": provider.brand_color,
        "icon_url": provider.icon_url,
        "status": provider.status,
        "is_enabled": provider.is_enabled,
        "api_key_masked": provider.api_key[:8] + "*" * 20 if provider.api_key else None,
        "api_base": provider.api_base,
        "total_quota": provider.total_quota,
        "used_quota": provider.used_quota,
        "remaining_quota": provider.remaining_quota,
        "avg_response_time": provider.avg_response_time,
        "success_rate": provider.success_rate,
        "last_check_at": provider.last_check_at,
        "created_at": provider.created_at,
        "updated_at": provider.updated_at
    }

@app.post("/api/providers", response_model=LLMProviderResponse)
async def create_provider_config(
    provider_data: LLMProviderCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Create a new LLM provider configuration"""
    # Check if provider with same name exists
    result = await db.execute(
        select(LLMProvider).where(LLMProvider.name == provider_data.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Provider with this name already exists")
    
    provider = LLMProvider(
        name=provider_data.name,
        display_name=provider_data.display_name,
        provider_type=provider_data.provider_type,
        model_name=provider_data.model_name,
        api_key=provider_data.api_key,
        api_base=provider_data.api_base,
        brand_color=provider_data.brand_color,
        icon_url=provider_data.icon_url,
        config=provider_data.config,
        status=LLMProviderStatus.OFFLINE
    )
    
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    
    return provider

@app.put("/api/providers/{provider_id}", response_model=LLMProviderResponse)
async def update_provider(
    provider_id: int,
    provider_data: LLMProviderUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an LLM provider configuration"""
    result = await db.execute(select(LLMProvider).where(LLMProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Update fields
    update_data = provider_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(provider, field, value)
    
    provider.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(provider)
    
    return provider

@app.delete("/api/providers/{provider_id}")
async def delete_provider(provider_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an LLM provider"""
    result = await db.execute(select(LLMProvider).where(LLMProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    await db.delete(provider)
    await db.commit()
    
    return {"message": "Provider deleted successfully"}

@app.post("/api/providers/{provider_id}/test", response_model=TestConnectionResponse)
async def test_provider_connection(provider_id: int, db: AsyncSession = Depends(get_db)):
    """Test connection to an LLM provider"""
    result = await db.execute(select(LLMProvider).where(LLMProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if not provider.api_key:
        return TestConnectionResponse(
            success=False,
            message="API key not configured"
        )
    
    # Update status to testing
    provider.status = LLMProviderStatus.TESTING
    await db.commit()
    
    try:
        # Create provider and test connection
        llm_provider = create_provider(
            provider.provider_type,
            provider.api_key,
            provider.model_name,
            provider.api_base
        )
        
        success, quota_info, response_time_ms = await llm_provider.test_connection()
        
        if success:
            provider.status = LLMProviderStatus.ONLINE
            provider.last_check_at = datetime.utcnow()
            provider.avg_response_time = response_time_ms
            
            if quota_info:
                provider.total_quota = quota_info.total
                provider.used_quota = quota_info.used or 0
                provider.remaining_quota = quota_info.remaining
            
            await db.commit()
            
            return TestConnectionResponse(
                success=True,
                message="Connection successful",
                response_time_ms=response_time_ms,
                quota_info={
                    "total": quota_info.total if quota_info else None,
                    "used": quota_info.used if quota_info else None,
                    "remaining": quota_info.remaining if quota_info else None
                } if quota_info else None
            )
        else:
            provider.status = LLMProviderStatus.ERROR
            await db.commit()
            
            return TestConnectionResponse(
                success=False,
                message="Connection failed",
                response_time_ms=response_time_ms
            )
            
    except Exception as e:
        provider.status = LLMProviderStatus.ERROR
        await db.commit()
        
        return TestConnectionResponse(
            success=False,
            message=f"Error: {str(e)}"
        )

# ============== Session Endpoints ==============

@app.get("/api/sessions", response_model=List[SessionResponse])
async def get_sessions(
    skip: int = 0, 
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all brainstorming sessions"""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.llms))
        .order_by(Session.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    sessions = result.scalars().all()
    return sessions

@app.get("/api/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific session with messages"""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id)
        .options(selectinload(Session.llms), selectinload(Session.messages))
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session

@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new brainstorming session"""
    # Validate LLM IDs
    llm_result = await db.execute(
        select(LLMProvider).where(
            LLMProvider.id.in_(session_data.llm_ids),
            LLMProvider.is_enabled == True
        )
    )
    llms = llm_result.scalars().all()
    
    if len(llms) != len(session_data.llm_ids):
        raise HTTPException(status_code=400, detail="Some LLM providers not found or disabled")
    
    # Create session
    session = Session(
        title=session_data.title,
        description=session_data.description,
        topic=session_data.topic,
        max_rounds=session_data.max_rounds,
        temperature=session_data.temperature,
        max_tokens=session_data.max_tokens
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # Associate LLMs with session
    for i, llm_id in enumerate(session_data.llm_ids):
        session_llm = SessionLLM(
            session_id=session.id,
            llm_id=llm_id,
            order_index=i
        )
        db.add(session_llm)
    
    await db.commit()
    
    # Refresh to load relationships
    await db.refresh(session, ["llms"])
    
    return session

@app.put("/api/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a session"""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_data = session_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    session.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    
    return session

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a session"""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()
    
    return {"message": "Session deleted successfully"}

# ============== Message Endpoints ==============

@app.get("/api/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    session_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a session"""
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
        .offset(skip)
        .limit(limit)
    )
    messages = result.scalars().all()
    return messages

# ============== Brainstorm Control Endpoints ==============

@app.post("/api/sessions/{session_id}/start")
async def start_brainstorm(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Start a brainstorming session"""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.is_completed:
        raise HTTPException(status_code=400, detail="Session already completed")
    
    # Start the brainstorm in background with a new DB session
    async def run_brainstorm():
        from models import async_session_maker
        async with async_session_maker() as new_db:
            try:
                engine = BrainstormEngine(new_db)
                await engine.start_brainstorm(session_id)
            except Exception as e:
                print(f"Brainstorm error: {e}")
                import traceback
                traceback.print_exc()
    
    # Run in background task
    import asyncio
    asyncio.create_task(run_brainstorm())
    
    return {"message": "Brainstorm session started", "session_id": session_id}

@app.post("/api/sessions/{session_id}/stop")
async def stop_brainstorm(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Stop an active brainstorming session"""
    engine = BrainstormEngine(db)
    await engine.stop_session(session_id)
    
    return {"message": "Brainstorm session stopped", "session_id": session_id}

# ============== WebSocket Endpoint ==============

@app.websocket("/ws/sessions/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int):
    """WebSocket endpoint for real-time session updates"""
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Receive and process messages from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            message_data = data.get("data", {})
            
            if message_type == WSMessageType.SEND_MESSAGE:
                # Handle user message
                content = message_data.get("content", "")
                if content:
                    async with async_session_maker() as db:
                        try:
                            engine = BrainstormEngine(db)
                            message = await engine.add_user_message(session_id, content)
                            await db.commit()
                            
                            # Broadcast new message to all connected clients
                            await manager.broadcast_to_session(session_id, {
                                "type": WSMessageType.NEW_MESSAGE,
                                "data": {
                                    "id": message.id,
                                    "role": message.role,
                                    "content": message.content,
                                    "llm_id": message.llm_id,
                                    "created_at": message.created_at.isoformat()
                                }
                            })
                        except Exception as e:
                            await db.rollback()
                            print(f"Error adding user message: {e}")
                            raise
            
            elif message_type == WSMessageType.START_BRAINSTORM:
                # Start brainstorm
                pass  # Handled via HTTP endpoint
            
            elif message_type == WSMessageType.NEXT_ROUND:
                # Advance to next round
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_to_session(session_id, {
            "type": WSMessageType.USER_LEFT,
            "data": {
                "timestamp": datetime.utcnow().isoformat()
            }
        })

# ============== Stats Endpoints ==============

@app.get("/api/stats", response_model=SystemStats)
async def get_system_stats(db: AsyncSession = Depends(get_db)):
    """Get system statistics"""
    # Count sessions
    session_result = await db.execute(select(func.count(Session.id)))
    total_sessions = session_result.scalar()
    
    active_result = await db.execute(
        select(func.count(Session.id)).where(Session.is_active == True)
    )
    active_sessions = active_result.scalar()
    
    # Count messages
    message_result = await db.execute(select(func.count(Message.id)))
    total_messages = message_result.scalar()
    
    # Count LLMs
    llm_result = await db.execute(select(func.count(LLMProvider.id)))
    total_llms = llm_result.scalar()
    
    online_result = await db.execute(
        select(func.count(LLMProvider.id))
        .where(LLMProvider.status == LLMProviderStatus.ONLINE)
    )
    online_llms = online_result.scalar()
    
    return SystemStats(
        total_sessions=total_sessions,
        active_sessions=active_sessions,
        total_messages=total_messages,
        total_llms=total_llms,
        online_llms=online_llms
    )

# ============== Health Check ==============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ============== Static Files ==============

# Serve static files from the frontend dist directory
app.mount("/assets", StaticFiles(directory="../app/dist/assets"), name="assets")

@app.get("/")
async def serve_frontend():
    """Serve the frontend application"""
    return FileResponse("../app/dist/index.html")

# ============== Main ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
