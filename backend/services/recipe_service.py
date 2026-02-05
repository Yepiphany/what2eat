from typing import List, Dict, Optional
from models.recipe_schemas import TastePreference, DietType, RecipeDifficulty
from dotenv import load_dotenv
import os
import json
from openai import OpenAI

load_dotenv()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

async def recommend_recipes(
    available_ingredients: List[str],
    taste_preferences: List[TastePreference] = None,
    diet_type: Optional[DietType] = None,
    max_cooking_time: Optional[int] = None,
    max_difficulty: Optional[RecipeDifficulty] = None
) -> List[Dict]:
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
            ai_recommendation = await get_ai_recipe_recommendation(
                available_ingredients, taste_preferences, diet_type
            )
            if ai_recommendation:
                filtered_recipes.append(ai_recommendation)
        
        return filtered_recipes[:10]
    
    except Exception as e:
        print(f"Recipe recommendation error: {e}")
        return []

async def get_ai_recipe_recommendation(
    ingredients: List[str],
    taste_preferences: List[TastePreference] = None,
    diet_type: Optional[DietType] = None
) -> Optional[Dict]:
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
            max_tokens=800,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        result = json.loads(content)
        
        available_set = set(ingredients)
        recipe_ingredients = set(result.get("ingredients", []))
        matched = recipe_ingredients & available_set
        result["matched_ingredients"] = list(matched)
        result["missing_ingredients"] = list(recipe_ingredients - matched)
        result["match_percentage"] = round(len(matched) / len(recipe_ingredients) * 100, 1) if recipe_ingredients else 0
        
        return result
    
    except Exception as e:
        print(f"AI recipe generation error: {e}")
        return None

async def generate_shopping_list(recipe_id: str, user_ingredients: List[str]) -> Dict:
    try:
        recipe = next((r for r in SAMPLE_RECIPES if r["id"] == recipe_id), None)
        
        if not recipe:
            return {"shopping_list": [], "tips": ["未找到该菜谱"]}
        
        needed = set(recipe["ingredients"]) - set(user_ingredients)
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """你是一个购物助手。请根据用户缺少的食材生成购物清单。

返回JSON格式：
{
    "shopping_list": [
        {"item": "食材名称", "quantity": 数量, "unit": 单位, "priority": "high/medium/low"}
    ],
    "tips": ["购买建议1", "购买建议2"]
}

只返回JSON，不要其他文字
"""
                },
                {
                    "role": "user",
                    "content": f"缺少的食材: {', '.join(needed)}"
                }
            ],
            max_tokens=400,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
    
    except Exception as e:
        print(f"Shopping list generation error: {e}")
        return {"shopping_list": [], "tips": []}
