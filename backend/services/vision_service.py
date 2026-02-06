from typing import List, Dict, Optional
from dotenv import load_dotenv
import os
import json
import asyncio
import httpx

load_dotenv()

MODELSCOPE_BASE_URL = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn/v1")
MODELSCOPE_API_KEY = os.getenv("MODELSCOPE_API_KEY", "")
MODELSCOPE_VISION_MODEL = os.getenv("MODELSCOPE_VISION_MODEL", "moonshotai/Kimi-K2.5")

async def analyze_ingredients_image(image_base64: str) -> List[Dict]:
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{MODELSCOPE_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {MODELSCOPE_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODELSCOPE_VISION_MODEL,
                    "messages": [
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
                    "max_tokens": 1000,
                    "stream": False
                }
            )
            
            if response.status_code != 200:
                print(f"ModelScope API error: {response.status_code} - {response.text}")
                return []
            
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                parsed = {"ingredients": []}
                import re
                patterns = [
                    r'"name"\s*:\s*"([^"]+)"',
                ]
                for pattern in patterns:
                    ingredient_names = re.findall(pattern, content)
                    for name in ingredient_names:
                        if name and len(name) <= 10 and len(name) >= 1 and not any(kw in name for kw in ['步骤', '说明', '注意', '食材', '列表', '以下', '识别']):
                            if name not in [i['name'] for i in parsed["ingredients"]]:
                                parsed["ingredients"].append({
                                    "name": name,
                                    "category": "other",
                                    "quantity": 1,
                                    "unit": "个",
                                    "estimated_expiry_days": 7
                                })
            
            if isinstance(parsed, dict) and "ingredients" in parsed:
                return parsed["ingredients"]
            elif isinstance(parsed, list):
                return parsed
            else:
                return []
    
    except Exception as e:
        print(f"ModelScope vision analysis error: {e}")
        return []
