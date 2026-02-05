from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

class CookingStep(BaseModel):
    step_number: int
    instruction: str
    duration_seconds: Optional[int] = None
    tips: Optional[str] = None
    image_url: Optional[str] = None

class CookingSessionStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"

class CookingSessionCreate(BaseModel):
    recipe_id: str
    user_id: str

class CookingSessionResponse(BaseModel):
    id: str
    recipe_id: str
    user_id: str
    current_step: int = 0
    status: CookingSessionStatus = CookingSessionStatus.NOT_STARTED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    steps: List[CookingStep]
    recipe_title: str

class VoiceCommand(BaseModel):
    command: str
    confidence: float

class StepAdvanceRequest(BaseModel):
    session_id: str
    voice_command: Optional[VoiceCommand] = None
    manual_advance: bool = False
