from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
from services.recipe_service import enhance_recipe_with_matching, generate_recipe_id, get_recipe_from_database
from models.database import get_supabase_client
from datetime import datetime, timezone

router = APIRouter()
supabase = get_supabase_client()

MIN_RECOMMEND_INGREDIENTS = 15
AUTO_FILL_PRESET_INGREDIENTS: List[str] = [
    "土豆", "西红柿", "洋葱", "胡萝卜", "青椒", "西兰花", "生菜", "香菇",
    "鸡蛋", "豆腐", "鸡胸肉", "猪里脊", "牛肉", "虾", "鱼片", "葱", "姜", "蒜",
    "生抽", "蚝油", "豆瓣酱", "咖喱", "孜然", "面条", "米饭", "金针菇", "杏鲍菇",
]


def _merge_ingredients(base: List[str], presets: Optional[List[str]]) -> List[str]:
    merged: List[str] = []
    seen: set[str] = set()

    for raw in (base or []) + (presets or []):
        name = str(raw).strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        merged.append(name)

    return merged


def _auto_fill_ingredients(ingredients: List[str], min_count: int = MIN_RECOMMEND_INGREDIENTS) -> List[str]:
    if len(ingredients) >= min_count:
        return ingredients

    filled = list(ingredients)
    seen = {name.lower() for name in ingredients}

    for preset in AUTO_FILL_PRESET_INGREDIENTS:
        key = preset.lower()
        if key in seen:
            continue
        filled.append(preset)
        seen.add(key)
        if len(filled) >= min_count:
            break

    return filled


def _to_utc_datetime(raw_value: str) -> Optional[datetime]:
    try:
        if not raw_value:
            return None
        parsed = datetime.fromisoformat(str(raw_value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def _get_urgent_ingredient_names(user_id: Optional[str]) -> List[str]:
    if not user_id:
        return []

    try:
        result = (
            supabase.table("ingredients")
            .select("name, expiry_date")
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data:
            return []

        now = datetime.now(timezone.utc)
        urgent: List[str] = []
        seen: set[str] = set()

        for item in result.data:
            expiry_raw = item.get("expiry_date")
            expiry_dt = _to_utc_datetime(expiry_raw)
            if not expiry_dt:
                continue

            days_left = (expiry_dt - now).days
            if days_left <= 1:
                name = str(item.get("name") or "").strip()
                if not name:
                    continue
                key = name.lower()
                if key in seen:
                    continue
                seen.add(key)
                urgent.append(name)

        return urgent
    except Exception as e:
        print(f"[WARN] Failed to load urgent ingredients for user {user_id}: {e}")
        return []
def _build_goal_context(
    user_id: Optional[str],
    request_temp_goals: Optional[List[str]],
    request_long_goals: Optional[List[str]],
) -> Optional[str]:
    temp_goals = [g.strip() for g in (request_temp_goals or []) if isinstance(g, str) and g.strip()]
    long_goals = [g.strip() for g in (request_long_goals or []) if isinstance(g, str) and g.strip()]

    if user_id and (not temp_goals and not long_goals):
        try:
            result = (
                supabase.table("user_memory_profiles")
                .select("temporary_goals,long_term_goals")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            if result.data:
                temp_goals = [
                    g.strip()
                    for g in (result.data[0].get("temporary_goals") or [])
                    if isinstance(g, str) and g.strip()
                ]
                long_goals = [
                    g.strip()
                    for g in (result.data[0].get("long_term_goals") or [])
                    if isinstance(g, str) and g.strip()
                ]
        except Exception as e:
            print(f"[WARN] Failed to fetch goal memory context: {e}")

    if not temp_goals and not long_goals:
        return None

    segments: List[str] = []
    if temp_goals:
        segments.append(f"临时目标/要求: {'；'.join(temp_goals)}")
    if long_goals:
        segments.append(f"长期目标: {'；'.join(long_goals)}")
    return "\n".join(segments)

@router.post("/recommend")
async def get_recipe_recommendations(request: Request):
    from models.recipe_schemas import TastePreference, DietType
    
    data = await request.json()
    available_ingredients = data.get('available_ingredients', [])
    required_ingredients = data.get('required_ingredients', [])
    preset_ingredients = data.get('preset_ingredients', [])
    taste_preferences = data.get('taste_preferences', [])
    diet_type_str = data.get('diet_type', None)
    force_refresh = data.get('force_refresh', False)
    max_cooking_time = data.get('max_cooking_time', None)
    cooking_level = data.get('cooking_level', None)
    user_id = data.get('user_id', None)
    temporary_goals = data.get('temporary_goals', [])
    long_term_goals = data.get('long_term_goals', [])
    
    merged_ingredients = _merge_ingredients(available_ingredients, preset_ingredients)
    prepared_ingredients = _auto_fill_ingredients(merged_ingredients)
    urgent_ingredients = _get_urgent_ingredient_names(user_id)

    if not prepared_ingredients:
        return []
    
    # 转换 diet_type 为枚举
    diet_type = None
    if diet_type_str:
        try:
            diet_type = DietType(diet_type_str)
        except ValueError:
            print(f"Invalid diet_type: {diet_type_str}")
    
    # 转换 taste_preferences 为枚举列表
    taste_prefs = []
    for t in taste_preferences:
        try:
            taste_prefs.append(TastePreference(t))
        except ValueError:
            print(f"Invalid taste preference: {t}")
    
    from services.recipe_service import get_ai_batch_recipes
    
    recipes = await get_ai_batch_recipes(
        available_ingredients=prepared_ingredients,
        matching_ingredients=available_ingredients,
        required_ingredients=required_ingredients,
        urgent_ingredients=urgent_ingredients,
        taste_preferences=taste_prefs,
        diet_type=diet_type,
        count=10,
        force_refresh=force_refresh,
        max_cooking_time=max_cooking_time,
        cooking_level=cooking_level,
        memory_context=_build_goal_context(user_id, temporary_goals, long_term_goals),
    )
    return recipes

@router.post("/batch")
async def get_batch_recipes(request: Request):
    from models.recipe_schemas import TastePreference, DietType
    
    data = await request.json()
    available_ingredients = data.get('available_ingredients', [])
    preset_ingredients = data.get('preset_ingredients', [])
    taste_preferences = data.get('taste_preferences', [])
    diet_type = data.get('diet_type', None)
    
    from services.recipe_service import get_ai_batch_recipes
    
    merged_ingredients = _merge_ingredients(available_ingredients, preset_ingredients)
    prepared_ingredients = _auto_fill_ingredients(merged_ingredients)

    recipes = await get_ai_batch_recipes(
        available_ingredients=prepared_ingredients,
        matching_ingredients=available_ingredients,
        taste_preferences=taste_preferences,
        diet_type=diet_type,
        count=10
    )
    return {"recipes": recipes, "total": len(recipes)}

@router.get("/{recipe_id}")
async def get_recipe(recipe_id: str):
    recipe = get_recipe_from_database(recipe_id)
    
    if recipe:
        return recipe
    
    raise HTTPException(status_code=404, detail="菜谱不存在")

@router.get("")
async def get_recipes():
    return []

@router.post("")
async def create_recipe(request):
    return {
        "id": "new_recipe_1",
        **(request.model_dump() if hasattr(request, 'model_dump') else dict(request)),
        "matched_ingredients": [],
        "missing_ingredients": [],
        "match_percentage": 0,
        "image_url": None
    }
