from typing import List, Dict, Optional
from models.recipe_schemas import TastePreference, DietType, RecipeDifficulty
from dotenv import load_dotenv
import os
import json
from openai import OpenAI

load_dotenv()

# 使用 ModelScope AI API (Moonshot AI Kimi)
base_url = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn/v1")
api_key = os.getenv("MODELSCOPE_API_KEY", "")

model_scope_client = OpenAI(
    base_url=base_url,
    api_key=api_key
)

# 备用的 OpenAI 客户端（如果 ModelScope 不可用）
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)
else:
    openai_client = None

SAMPLE_RECIPES = [
    {
        "id": "recipe_1",
        "title": "番茄炒蛋",
        "description": "经典家常菜，简单美味",
        "ingredients": ["番茄", "鸡蛋", "葱", "盐", "糖", "食用油"],
        "steps": [
            "番茄洗净切块",
            "鸡蛋打散备用",
            "热锅倒油，倒入蛋液翻炒至凝固",
            "加入番茄翻炒均匀",
            "加入盐和糖调味",
            "撒上葱花出锅"
        ],
        "cooking_time": 15,
        "difficulty": "easy",
        "taste_tags": ["sweet", "mild"],
        "diet_types": ["normal", "vegetarian"],
        "calories": 280,
        "servings": 2,
        "image_url": None
    },
    {
        "id": "recipe_2",
        "title": "麻婆豆腐",
        "description": "川菜经典，麻辣鲜香",
        "ingredients": ["豆腐", "猪肉末", "郫县豆瓣酱", "花椒", "辣椒", "蒜", "葱", "生抽", "淀粉"],
        "steps": [
            "豆腐切块焯水",
            "准备肉末",
            "热锅倒油，炒香豆瓣酱",
            "加入肉末翻炒",
            "加入豆腐轻轻翻动",
            "勾芡出锅"
        ],
        "cooking_time": 25,
        "difficulty": "medium",
        "taste_tags": ["spicy", "umami"],
        "diet_types": ["normal"],
        "calories": 350,
        "servings": 2,
        "image_url": None
    },
    {
        "id": "recipe_3",
        "title": "清炒时蔬",
        "description": "保持蔬菜原味，健康美味",
        "ingredients": ["青菜", "蒜", "盐", "食用油"],
        "steps": [
            "青菜洗净切段",
            "蒜切片",
            "热锅倒油，爆香蒜片",
            "加入青菜翻炒",
            "加盐调味即可"
        ],
        "cooking_time": 10,
        "difficulty": "easy",
        "taste_tags": ["mild"],
        "diet_types": ["normal", "vegan", "vegetarian", "keto", "low_carb"],
        "calories": 120,
        "servings": 2,
        "image_url": None
    },
    {
        "id": "recipe_4",
        "title": "红烧肉",
        "description": "肥而不腻，入口即化",
        "ingredients": ["五花肉", "生抽", "老抽", "料酒", "冰糖", "葱", "姜", "八角"],
        "steps": [
            "五花肉切块焯水",
            "锅中放油，加入冰糖炒糖色",
            "加入五花肉翻炒上色",
            "加入调味料和香料",
            "小火炖煮1小时"
        ],
        "cooking_time": 90,
        "difficulty": "medium",
        "taste_tags": ["sweet", "salty"],
        "diet_types": ["normal", "paleo"],
        "calories": 580,
        "servings": 4,
        "image_url": None
    },
    {
        "id": "recipe_5",
        "title": "蒜蓉西兰花",
        "description": "简单快手，营养丰富",
        "ingredients": ["西兰花", "蒜", "盐", "橄榄油"],
        "steps": [
            "西兰花洗净切小朵",
            "蒜切末",
            "烧水焯西兰花1分钟",
            "热锅倒油，爆香蒜末",
            "加入西兰花翻炒",
            "加盐调味出锅"
        ],
        "cooking_time": 12,
        "difficulty": "easy",
        "taste_tags": ["mild"],
        "diet_types": ["normal", "vegan", "vegetarian", "keto", "low_carb", "low_fat"],
        "calories": 150,
        "servings": 2,
        "image_url": None
    }
]

def recommend_recipes(
    available_ingredients: List[str],
    taste_preferences: List[TastePreference] = None,
    diet_type: Optional[DietType] = None,
    max_cooking_time: Optional[int] = None,
    max_difficulty: Optional[RecipeDifficulty] = None
) -> List[Dict]:
    """
    根据可用食材推荐菜谱
    """
    try:
        filtered_recipes = []
        
        for recipe in SAMPLE_RECIPES:
            if diet_type and diet_type.value not in recipe.get("diet_types", []):
                continue
            
            if max_cooking_time and recipe["cooking_time"] > max_cooking_time:
                continue
            
            if max_difficulty:
                difficulty_levels = ["easy", "medium", "hard"]
                if difficulty_levels.index(recipe["difficulty"]) > difficulty_levels.index(max_difficulty.value):
                    continue
            
            recipe_ingredients = set(recipe["ingredients"])
            available_set = set(available_ingredients)
            
            matched = recipe_ingredients & available_set
            missing = recipe_ingredients - available_set
            
            match_percentage = len(matched) / len(recipe_ingredients) * 100 if recipe_ingredients else 0
            
            if match_percentage >= 30:
                recipe_copy = recipe.copy()
                recipe_copy["matched_ingredients"] = list(matched)
                recipe_copy["missing_ingredients"] = list(missing)
                recipe_copy["match_percentage"] = round(match_percentage, 1)
                filtered_recipes.append(recipe_copy)
        
        filtered_recipes.sort(key=lambda x: x["match_percentage"], reverse=True)
        
        if not filtered_recipes and available_ingredients:
            ai_recommendation = get_ai_recipe_recommendation(
                available_ingredients, taste_preferences, diet_type
            )
            if ai_recommendation:
                filtered_recipes.append(ai_recommendation)
        
        return filtered_recipes[:10]
    
    except Exception as e:
        print(f"Recipe recommendation error: {e}")
        return []

def get_ai_recipe_recommendation(
    ingredients: List[str],
    taste_preferences: List[TastePreference] = None,
    diet_type: Optional[DietType] = None
) -> Optional[Dict]:
    """
    使用 ModelScope AI 生成智能菜谱推荐
    """
    try:
        model = os.getenv("MODELSCOPE_VISION_MODEL", "moonshotai/Kimi-K2.5")
        taste_str = ", ".join([t.value for t in taste_preferences]) if taste_preferences else "任意"
        diet_str = diet_type.value if diet_type else "任意"
        
        response = model_scope_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": """你是一个专业厨师。请根据用户提供的食材推荐一道合适的菜品。

返回JSON格式：
{
    "id": "ai_recipe_1",
    "title": "菜品名称",
    "description": "简短描述",
    "ingredients": ["主料", "辅料1", "辅料2", "调料1", "调料2"],
    "steps": ["步骤1", "步骤2", "步骤3"],
    "cooking_time": 预计烹饪时间（分钟）,
    "difficulty": "easy/medium/hard",
    "taste_tags": ["口味标签1", "口味标签2"],
    "diet_types": ["适合的饮食类型"],
    "calories": 预估卡路里,
    "servings": 份量,
    "matched_ingredients": ["匹配的食材"],
    "missing_ingredients": ["缺少的食材"],
    "match_percentage": 匹配度（0-100）
}

要求：
- 推荐的菜品应该能使用用户现有的主要食材
- 步骤要简洁明了，适合家庭烹饪
- 考虑用户的口味偏好和饮食限制
- 只返回JSON，不要其他文字
"""
                },
                {
                    "role": "user",
                    "content": f"""现有食材: {', '.join(ingredients)}
口味偏好: {taste_str}
饮食限制: {diet_str}

请推荐一道合适的菜品"""
                }
            ],
            max_tokens=800
        )
        
        content = response.choices[0].message.content
        
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            result = {
                "id": "ai_recipe_1",
                "title": "智能推荐菜",
                "description": "根据您的食材推荐",
                "ingredients": ingredients[:5],
                "steps": ["按照个人习惯烹饪"],
                "cooking_time": 30,
                "difficulty": "easy",
                "taste_tags": ["mild"],
                "diet_types": ["normal"],
                "calories": 300,
                "servings": 2
            }
        
        available_set = set(ingredients)
        recipe_ingredients = set(result.get("ingredients", []))
        matched = recipe_ingredients & available_set
        result["matched_ingredients"] = list(matched)
        result["missing_ingredients"] = list(recipe_ingredients - available_set)
        result["match_percentage"] = round(len(matched) / len(recipe_ingredients) * 100, 1) if recipe_ingredients else 0
        
        return result
    
    except Exception as e:
        print(f"ModelScope AI recipe generation error: {e}")
        
        # 如果 ModelScope 失败，尝试使用 OpenAI
        if openai_client:
            print("尝试使用 OpenAI 作为备选...")
            return get_ai_recipe_with_openai(ingredients, taste_preferences, diet_type)
        
        return None

def get_ai_recipe_with_openai(
    ingredients: List[str],
    taste_preferences: List[TastePreference] = None,
    diet_type: Optional[DietType] = None
) -> Optional[Dict]:
    """备用的 OpenAI 菜谱生成方法"""
    try:
        taste_str = ", ".join([t.value for t in taste_preferences]) if taste_preferences else "任意"
        diet_str = diet_type.value if diet_type else "任意"
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """你是一个专业厨师。请根据用户提供的食材推荐一道合适的菜品。

返回JSON格式：
{
    "id": "ai_recipe_1",
    "title": "菜品名称",
    "description": "简短描述",
    "ingredients": ["主料", "辅料1", "辅料2", "调料1", "调料2"],
    "steps": ["步骤1", "步骤2", "步骤3"],
    "cooking_time": 预计烹饪时间,
    "difficulty": "easy/medium/hard",
    "taste_tags": ["口味标签1", "口味标签2"],
    "diet_types": ["适合的饮食类型"],
    "calories": 预估卡路里,
    "servings": 份量,
    "matched_ingredients": ["匹配的食材"],
    "missing_ingredients": ["缺少的食材"],
    "match_percentage": 匹配度（0-100）
}

只返回JSON，不要其他文字
"""
                },
                {
                    "role": "user",
                    "content": f"""现有食材: {', '.join(ingredients)}
口味偏好: {taste_str}
饮食限制: {diet_str}"""
                }
            ],
            max_tokens=800,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        result = json.loads(content)
        
        available_set = set(ingredients)
        recipe_ingredients = set(result.get("ingredients", []))
        matched = recipe_ingredients & available_set
        result["matched_ingredients"] = list(matched)
        result["missing_ingredients"] = list(recipe_ingredients - available_set)
        result["match_percentage"] = round(len(matched) / len(recipe_ingredients) * 100, 1) if recipe_ingredients else 0
        
        return result
    
    except Exception as e:
        print(f"OpenAI fallback error: {e}")
        return None

def generate_shopping_list(recipe_id: str, user_ingredients: List[str]) -> Dict:
    """
    生成购物清单
    """
    try:
        recipe = next((r for r in SAMPLE_RECIPES if r["id"] == recipe_id), None)
        
        if not recipe:
            return {"shopping_list": [], "tips": ["未找到该菜谱"]}
        
        needed = set(recipe["ingredients"]) - set(user_ingredients)
        
        return {
            "shopping_list": [
                {"item": item, "quantity": 1, "unit": "份", "priority": "high"}
                for item in needed
            ],
            "tips": ["建议购买新鲜的食材", "可以一次多买一些"]
        }
    
    except Exception as e:
        print(f"Shopping list generation error: {e}")
        return {"shopping_list": [], "tips": []}
