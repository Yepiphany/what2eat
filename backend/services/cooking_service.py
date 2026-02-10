from typing import List, Dict, Optional
from datetime import datetime
import uuid
from models.database import get_supabase_client
from models.cooking_schemas import (
    CookingStep, CookingSessionStatus, CookingSessionResponse
)
from services.recipe_service import get_recipe_from_database

supabase = get_supabase_client()

SAMPLE_COOKING_STEPS = {
    "recipe_1": [
        {
            "step_number": 1,
            "instruction": "番茄洗净，在顶部划十字，用开水烫30秒后去皮切块",
            "duration_seconds": 180,
            "tips": "烫番茄时水不要烧开，保持90度左右更容易去皮"
        },
        {
            "step_number": 2,
            "instruction": "鸡蛋打入碗中，加入少许盐，用筷子充分搅散",
            "duration_seconds": 60,
            "tips": "打蛋时加点盐可以让蛋更蓬松"
        },
        {
            "step_number": 3,
            "instruction": "锅烧热后倒入稍多一些的油，油温七成热时倒入蛋液",
            "duration_seconds": 45,
            "tips": "判断油温：筷子放入油中有小气泡冒出即可"
        },
        {
            "step_number": 4,
            "instruction": "蛋液开始凝固时用铲子快速划散，炒至金黄盛出备用",
            "duration_seconds": 90,
            "tips": "不要炒太老，保持嫩滑口感"
        },
        {
            "step_number": 5,
            "instruction": "锅中留少许底油，放入番茄块翻炒出汁",
            "duration_seconds": 120,
            "tips": "可以加点糖中和番茄的酸味"
        },
        {
            "step_number": 6,
            "instruction": "将炒好的鸡蛋倒回锅中，与番茄翻炒均匀",
            "duration_seconds": 60,
            "tips": "大火快炒，保持鸡蛋嫩滑"
        },
        {
            "step_number": 7,
            "instruction": "加入适量盐调味，撒上葱花即可出锅",
            "duration_seconds": 30,
            "tips": "最后加盐可以减少钠的摄入"
        }
    ],
    "recipe_2": [
        {
            "step_number": 1,
            "instruction": "豆腐切成2厘米见方的小块，放入加盐的开水中焯烫2分钟",
            "duration_seconds": 150,
            "tips": "焯水可以去除豆腥味，让豆腐更紧实不易碎"
        },
        {
            "step_number": 2,
            "instruction": "猪肉末加入少许料酒和生抽腌制5分钟",
            "duration_seconds": 300,
            "tips": "腌制可以让肉末更入味"
        },
        {
            "step_number": 3,
            "instruction": "锅中放油，加入花椒和辣椒爆香",
            "duration_seconds": 30,
            "tips": "小火慢炒，避免炒糊"
        },
        {
            "step_number": 4,
            "instruction": "加入郫县豆瓣酱炒出红油",
            "duration_seconds": 60,
            "tips": "这是麻婆豆腐麻辣鲜香的关键"
        },
        {
            "step_number": 5,
            "instruction": "放入肉末翻炒至变色",
            "duration_seconds": 120,
            "tips": "肉末要炒散，不要结块"
        },
        {
            "step_number": 6,
            "instruction": "轻轻放入豆腐块，加入适量清水炖煮3分钟",
            "duration_seconds": 180,
            "tips": "翻动时要轻，防止豆腐碎掉"
        },
        {
            "step_number": 7,
            "instruction": "水淀粉勾芡，撒上花椒粉和葱花出锅",
            "duration_seconds": 45,
            "tips": "芡要薄而亮，包裹住豆腐即可"
        }
    ]
}

async def create_session(recipe_id: str, user_id: str) -> CookingSessionResponse:
    try:
        # 1. 优先尝试从数据库或内存获取完整菜谱信息
        recipe = get_recipe_from_database(recipe_id)
        
        steps = []
        recipe_title = "自定义菜谱"
        
        # 2. 如果找到了菜谱，提取其步骤
        if recipe:
            recipe_title = recipe.get("title", "未知菜谱")
            recipe_steps = recipe.get("steps", [])
            if recipe_steps:
                steps = [
                    CookingStep(
                        step_number=i+1,
                        instruction=step,
                        duration_seconds=300 # 默认5分钟
                    )
                    for i, step in enumerate(recipe_steps)
                ]
        
        # 3. 如果没找到菜谱或没有步骤，再尝试示例菜谱
        if not steps:
            sample_steps_data = SAMPLE_COOKING_STEPS.get(recipe_id)
            if sample_steps_data:
                steps = [CookingStep(**s) for s in sample_steps_data]
                recipe_title = "示例菜谱"
        
        # 4. 最后兜底方案
        if not steps:
            steps = [
                CookingStep(
                    step_number=1,
                    instruction="按照菜谱步骤进行烹饪",
                    duration_seconds=None
                )
            ]
        
        session_data = {
            "recipe_id": recipe_id,
            "user_id": user_id,
            "current_step": 0,
            "status": CookingSessionStatus.NOT_STARTED.value,
            "steps": [s.model_dump() for s in steps],
            "recipe_title": recipe_title
        }
        
        result = supabase.table("cooking_sessions").insert(session_data).execute()
        
        if result.data:
            return CookingSessionResponse(
                **result.data[0],
                steps=steps
            )
        
        return CookingSessionResponse(
            id="temp_session",
            recipe_id=recipe_id,
            user_id=user_id,
            current_step=0,
            status=CookingSessionStatus.NOT_STARTED,
            started_at=None,
            completed_at=None,
            steps=steps,
            recipe_title=recipe_result.data[0].get("title", "未知菜谱") if recipe_result.data else "自定义菜谱"
        )
    
    except Exception as e:
        print(f"Create session error: {e}")
        
        # 即使报错，也尝试通过 get_recipe_from_database 获取
        recipe = get_recipe_from_database(recipe_id)
        recipe_title = recipe.get("title", "示例菜谱") if recipe else "示例菜谱"
        recipe_steps = recipe.get("steps", []) if recipe else []
        
        if recipe_steps:
            steps = [
                CookingStep(
                    step_number=i+1,
                    instruction=step,
                    duration_seconds=300
                )
                for i, step in enumerate(recipe_steps)
            ]
        else:
            sample_steps_data = SAMPLE_COOKING_STEPS.get(recipe_id, [])
            if sample_steps_data:
                steps = [CookingStep(**s) for s in sample_steps_data]
            else:
                steps = [
                    CookingStep(
                        step_number=1,
                        instruction="按照菜谱步骤进行烹饪",
                        duration_seconds=None
                    )
                ]

        return CookingSessionResponse(
            id="temp_session_" + str(uuid.uuid4())[:8],
            recipe_id=recipe_id,
            user_id=user_id,
            current_step=0,
            status=CookingSessionStatus.NOT_STARTED,
            started_at=None,
            completed_at=None,
            steps=steps,
            recipe_title=recipe_title
        )

async def get_session(session_id: str, user_id: str) -> Optional[CookingSessionResponse]:
    try:
        result = supabase.table("cooking_sessions").select("*").eq("id", session_id).eq("user_id", user_id).execute()
        
        if result.data:
            session_data = result.data[0]
            steps = [CookingStep(**step) for step in session_data.get("steps", [])]
            return CookingSessionResponse(**session_data, steps=steps)
        
        return None
    
    except Exception as e:
        print(f"Get session error: {e}")
        return None

async def advance_step(
    session_id: str, 
    user_id: str, 
    voice_command: dict = None,
    manual_advance: bool = False
) -> CookingSessionResponse:
    try:
        session = await get_session(session_id, user_id)
        
        if not session:
            raise ValueError("Session not found")
        
        if session.status == CookingSessionStatus.COMPLETED:
            raise ValueError("Session already completed")
        
        if session.status == CookingSessionStatus.NOT_STARTED:
            session.status = CookingSessionStatus.IN_PROGRESS
            session.started_at = datetime.now()
        
        new_step = session.current_step + 1
        
        if new_step >= len(session.steps):
            await complete_session(session_id, user_id)
            return await get_session(session_id, user_id)
        
        update_data = {
            "current_step": new_step,
            "status": CookingSessionStatus.IN_PROGRESS.value,
            "updated_at": "now()"
        }
        
        if session.started_at:
            update_data["started_at"] = session.started_at.isoformat()
        
        supabase.table("cooking_sessions").update(update_data).eq("id", session_id).execute()
        
        return await get_session(session_id, user_id)
    
    except Exception as e:
        print(f"Advance step error: {e}")
        raise

async def pause_session(session_id: str, user_id: str) -> CookingSessionResponse:
    try:
        result = supabase.table("cooking_sessions").update({
            "status": CookingSessionStatus.PAUSED.value,
            "updated_at": "now()"
        }).eq("id", session_id).eq("user_id", user_id).execute()
        
        if result.data:
            steps = [CookingStep(**step) for step in result.data[0].get("steps", [])]
            return CookingSessionResponse(**result.data[0], steps=steps)
        
        raise ValueError("Session not found")
    
    except Exception as e:
        print(f"Pause session error: {e}")
        raise

async def resume_session(session_id: str, user_id: str) -> CookingSessionResponse:
    try:
        result = supabase.table("cooking_sessions").update({
            "status": CookingSessionStatus.IN_PROGRESS.value,
            "updated_at": "now()"
        }).eq("id", session_id).eq("user_id", user_id).execute()
        
        if result.data:
            steps = [CookingStep(**step) for step in result.data[0].get("steps", [])]
            return CookingSessionResponse(**result.data[0], steps=steps)
        
        raise ValueError("Session not found")
    
    except Exception as e:
        print(f"Resume session error: {e}")
        raise

async def complete_session(session_id: str, user_id: str) -> CookingSessionResponse:
    try:
        result = supabase.table("cooking_sessions").update({
            "status": CookingSessionStatus.COMPLETED.value,
            "completed_at": datetime.now().isoformat(),
            "updated_at": "now()"
        }).eq("id", session_id).eq("user_id", user_id).execute()
        
        if result.data:
            steps = [CookingStep(**step) for step in result.data[0].get("steps", [])]
            return CookingSessionResponse(**result.data[0], steps=steps)
        
        raise ValueError("Session not found")
    
    except Exception as e:
        print(f"Complete session error: {e}")
        raise

async def get_voice_commands_for_step(step_number: int) -> List[str]:
    return [
        "下一步",
        "继续",
        "下一个",
        "好的",
        "知道了",
        "说完了",
        "完成",
        "继续下一步"
    ]
