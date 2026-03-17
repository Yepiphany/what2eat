from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from models.database import get_supabase_client
from models.user_schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    TastePreference,
    DietType,
    UserMemoryProfileResponse,
    UserMemoryProfileUpdate,
    MemoryGoalsUpdateRequest,
    MemoryFavoritesSyncRequest,
    MemoryHistorySyncRequest,
)

router = APIRouter()
supabase = get_supabase_client()
FAVORITES_LIMIT = 100
HISTORY_LIMIT = 50


def _ensure_user_exists(user_id: str) -> None:
    try:
        existing = supabase.table("users").select("id").eq("id", user_id).execute()
        if existing.data:
            return
        supabase.table("users").insert(
            {
                "id": user_id,
                "username": f"User_{user_id[:8]}",
                "email": None,
                "taste_preferences": [],
            }
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ensure user exists: {e}")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_memory_profile(user_id: str) -> Dict[str, Any]:
    now = _now_iso()
    return {
        "user_id": user_id,
        "favorite_recipes": [],
        "history_records": [],
        "temporary_goals": [],
        "long_term_goals": [],
        "ai_context_notes": [],
        "created_at": now,
        "updated_at": now,
    }


def _ensure_memory_profile(user_id: str) -> Dict[str, Any]:
    _ensure_user_exists(user_id)
    try:
        result = (
            supabase.table("user_memory_profiles")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]

        payload = _default_memory_profile(user_id)
        created = supabase.table("user_memory_profiles").insert(payload).execute()
        if created.data:
            return created.data[0]
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ensure memory profile: {e}")


def _clean_goal_text(goal: str) -> str:
    return goal.strip()


def _normalize_list(value: Optional[List[Any]]) -> List[Any]:
    if isinstance(value, list):
        return value
    return []

@router.post("")
async def create_user(user: UserCreate):
    try:
        data = user.model_dump()
        
        result = supabase.table("users").insert(data).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Failed to create user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_update: UserUpdate):
    try:
        data = user_update.model_dump(exclude_unset=True)
        
        data["updated_at"] = "now()"
        
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}")
async def delete_user(user_id: str):
    try:
        result = supabase.table("users").delete().eq("id", user_id).execute()
        
        if result.data:
            return {"message": "User deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}/preferences")
async def update_user_preferences(
    user_id: str,
    payload: UserUpdate,
):
    try:
        data = {}
        taste_preferences = payload.taste_preferences
        diet_type = payload.diet_type
        max_cooking_time = payload.max_cooking_time
        cooking_level = payload.cooking_level

        if taste_preferences is not None:
            data["taste_preferences"] = [p.value for p in taste_preferences]
        if diet_type is not None:
            data["diet_type"] = diet_type.value
        if max_cooking_time is not None:
            data["max_cooking_time"] = max_cooking_time
        if cooking_level is not None:
            data["cooking_level"] = cooking_level
        
        data["updated_at"] = "now()"
        
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/memory", response_model=UserMemoryProfileResponse)
async def get_user_memory_profile(user_id: str):
    try:
        profile = _ensure_memory_profile(user_id)
        return UserMemoryProfileResponse(**profile)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}/memory", response_model=UserMemoryProfileResponse)
async def update_user_memory_profile(user_id: str, memory_update: UserMemoryProfileUpdate):
    try:
        profile = _ensure_memory_profile(user_id)
        data = memory_update.model_dump(exclude_unset=True)

        if "favorite_recipes" in data:
            data["favorite_recipes"] = _normalize_list(data["favorite_recipes"])[:FAVORITES_LIMIT]
        if "history_records" in data:
            data["history_records"] = _normalize_list(data["history_records"])[:HISTORY_LIMIT]
        if "temporary_goals" in data:
            data["temporary_goals"] = [g.strip() for g in _normalize_list(data["temporary_goals"]) if isinstance(g, str) and g.strip()]
        if "long_term_goals" in data:
            data["long_term_goals"] = [g.strip() for g in _normalize_list(data["long_term_goals"]) if isinstance(g, str) and g.strip()]
        if "ai_context_notes" in data:
            data["ai_context_notes"] = [g.strip() for g in _normalize_list(data["ai_context_notes"]) if isinstance(g, str) and g.strip()]

        data["updated_at"] = _now_iso()

        result = (
            supabase.table("user_memory_profiles")
            .update(data)
            .eq("user_id", user_id)
            .execute()
        )

        if result.data:
            return UserMemoryProfileResponse(**result.data[0])

        fallback = {**profile, **data}
        return UserMemoryProfileResponse(**fallback)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}/memory/favorites", response_model=UserMemoryProfileResponse)
async def sync_memory_favorites(user_id: str, payload: MemoryFavoritesSyncRequest):
    try:
        _ensure_memory_profile(user_id)
        data = {
            "favorite_recipes": payload.favorite_recipes[:FAVORITES_LIMIT],
            "updated_at": _now_iso(),
        }
        result = (
            supabase.table("user_memory_profiles")
            .update(data)
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return UserMemoryProfileResponse(**result.data[0])
        refreshed = _ensure_memory_profile(user_id)
        return UserMemoryProfileResponse(**refreshed)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}/memory/history", response_model=UserMemoryProfileResponse)
async def sync_memory_history(user_id: str, payload: MemoryHistorySyncRequest):
    try:
        _ensure_memory_profile(user_id)
        data = {
            "history_records": payload.history_records[:HISTORY_LIMIT],
            "updated_at": _now_iso(),
        }
        result = (
            supabase.table("user_memory_profiles")
            .update(data)
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return UserMemoryProfileResponse(**result.data[0])
        refreshed = _ensure_memory_profile(user_id)
        return UserMemoryProfileResponse(**refreshed)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}/memory/goals", response_model=UserMemoryProfileResponse)
async def update_memory_goal(user_id: str, payload: MemoryGoalsUpdateRequest):
    try:
        profile = _ensure_memory_profile(user_id)
        goal = _clean_goal_text(payload.goal)
        if not goal:
            raise HTTPException(status_code=400, detail="Goal cannot be empty")

        key = "temporary_goals" if payload.goal_type == "temporary" else "long_term_goals"
        goals = [g for g in _normalize_list(profile.get(key)) if isinstance(g, str) and g.strip()]

        if payload.action == "add":
            if goal not in goals:
                goals = [goal, *goals]
        else:
            goals = [g for g in goals if g != goal]

        data = {
            key: goals,
            "updated_at": _now_iso(),
        }

        result = (
            supabase.table("user_memory_profiles")
            .update(data)
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return UserMemoryProfileResponse(**result.data[0])

        refreshed = _ensure_memory_profile(user_id)
        return UserMemoryProfileResponse(**refreshed)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
