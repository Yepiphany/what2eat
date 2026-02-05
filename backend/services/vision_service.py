from typing import List, Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import asyncio

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

async def analyze_ingredients_image(image_base64: str) -> List[Dict]:
    """
    使用 ModelScope AI 分析图片中的食材
    """
    try:
        model = os.getenv("MODELSCOPE_VISION_MODEL", "moonshotai/Kimi-K2.5")
        
        # 使用异步方式调用 API
        response = await asyncio.to_thread(
            lambda: model_scope_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": """你是一个专业的食材识别专家。请分析图片中的所有食材，并返回JSON格式的识别结果。

对于每种食材，请提供：
1. name: 食材名称（中文）
2. category: 食材类别（vegetable, meat, seafood, dairy, egg, grain, fruit, seasoning, beverage, other）
3. quantity: 数量估算（数值）
4. unit: 单位（个、斤、克、毫升等）
5. estimated_expiry_days: 预估保质期（天数）

注意：
- 识别所有可见的食材
- 对于冷藏食材（如蔬菜、肉类），保质期通常是3-7天
- 对于干货或调料，保质期可以是30天以上
- 如果无法确定数量，标记为1
- 只返回JSON数组，不要有其他文字
"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                stream=False  # 先尝试非流式模式
            )
        )
        
        # 非流式响应直接获取内容
        content = response.choices[0].message.content or ""
        
        # 清理 content，移除可能的 markdown 代码块标记
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            result = {"ingredients": []}
            import re
            patterns = [
                r'"name"\s*:\s*"([^"]+)"',
            ]
            for pattern in patterns:
                ingredient_names = re.findall(pattern, content)
                for name in ingredient_names:
                    if name and len(name) <= 10 and len(name) >= 1 and not any(kw in name for kw in ['步骤', '说明', '注意', '食材', '列表', '以下', '识别']):
                        if name not in [i['name'] for i in result["ingredients"]]:
                            result["ingredients"].append({
                                "name": name,
                                "category": "other",
                                "quantity": 1,
                                "unit": "个",
                                "estimated_expiry_days": 7
                            })
        
        if isinstance(result, dict) and "ingredients" in result:
            return result["ingredients"]
        elif isinstance(result, list):
            return result
        else:
            return []
    
    except Exception as e:
        print(f"ModelScope vision analysis error: {e}")
        
        # 如果 ModelScope 失败，尝试使用 OpenAI
        if openai_client:
            print("尝试使用 OpenAI 作为备选...")
            return await analyze_with_openai(image_base64)
        
        return []

async def analyze_with_openai(image_base64: str) -> List[Dict]:
    """备用的 OpenAI 分析方法"""
    try:
        response = await asyncio.to_thread(
            lambda: openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": """你是一个专业的食材识别专家。请分析图片中的所有食材，并返回JSON格式的识别结果。

对于每种食材，请提供：
1. name: 食材名称（中文）
2. category: 食材类别（vegetable, meat, seafood, dairy, egg, grain, fruit, seasoning, beverage, other）
3. quantity: 数量估算（数值）
4. unit: 单位（个、斤、克、毫升等）
5. estimated_expiry_days: 预估保质期（天数）

注意：
- 识别所有可见的食材
- 对于冷藏食材（如蔬菜、肉类），保质期通常是3-7天
- 对于干货或调料，保质期可以是30天以上
- 如果无法确定数量，标记为1
- 只返回JSON数组，不要有其他文字
"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000
            )
        )
        
        content = response.choices[0].message.content or ""
        
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            result = {"ingredients": []}
            import re
            ingredient_names = re.findall(r'"name"\s*:\s*"([^"]+)"', content)
            for name in ingredient_names:
                if name and len(name) <= 10 and not any(kw in name for kw in ['步骤', '说明', '注意']):
                    result["ingredients"].append({
                        "name": name,
                        "category": "other",
                        "quantity": 1,
                        "unit": "个",
                        "estimated_expiry_days": 7
                    })
        
        if isinstance(result, dict) and "ingredients" in result:
            return result["ingredients"]
        elif isinstance(result, list):
            return result
        else:
            return []
    
    except Exception as e:
        print(f"OpenAI vision analysis error: {e}")
        return []
