from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Optional
from datetime import datetime
from models.database import get_supabase_client
from models.cooking_schemas import (
    CookingSessionCreate, CookingSessionResponse, CookingSessionStatus,
    StepAdvanceRequest
)
from services.cooking_service import (
    create_session, get_session, advance_step, pause_session, resume_session, complete_session
)
import json

router = APIRouter()
supabase = get_supabase_client()

def ensure_user_exists(user_id: str) -> bool:
    """Check if user exists, if not create a placeholder user"""
    try:
        from models.database import get_supabase_client
        supabase = get_supabase_client()
        if supabase is None:
            return False
        result = supabase.table("users").select("id").eq("id", user_id).execute()
        if result.data:
            return True
        
        supabase.table("users").insert({
            "id": user_id,
            "username": f"User_{user_id[:8]}",
            "email": None
        }).execute()
        print(f"[INFO] Auto-created user record: {user_id[:8]}...")
        return True
    except Exception as e:
        print(f"[WARN] Failed to ensure user exists: {e}")
        return False

@router.post("/session", response_model=CookingSessionResponse)
async def start_cooking_session(session: CookingSessionCreate):
    try:
        ensure_user_exists(session.user_id)
        result = await create_session(session.recipe_id, session.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}", response_model=CookingSessionResponse)
async def get_cooking_session(session_id: str, user_id: str):
    try:
        result = await get_session(session_id, user_id)
        if result:
            return result
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/{session_id}/advance")
async def advance_to_next_step(session_id: str, request: StepAdvanceRequest, user_id: str):
    try:
        result = await advance_step(session_id, user_id, request.voice_command, request.manual_advance)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/{session_id}/pause")
async def pause_cooking(session_id: str, user_id: str):
    try:
        result = await pause_session(session_id, user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/{session_id}/resume")
async def resume_cooking(session_id: str, user_id: str):
    try:
        result = await resume_session(session_id, user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/{session_id}/complete")
async def complete_cooking(session_id: str, user_id: str):
    try:
        result = await complete_session(session_id, user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
    
    async def send_step_update(self, session_id: str, data: dict):
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            await websocket.send_json(data)

manager = ConnectionManager()

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "voice_command":
                result = await advance_step(
                    session_id, 
                    message.get("user_id"),
                    {"command": message.get("command"), "confidence": message.get("confidence", 1.0)},
                    False
                )
                await manager.send_step_update(session_id, {
                    "type": "step_update",
                    "data": result.dict()
                })
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)
