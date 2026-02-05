# What2Eat (今天吃什么)

一站式饮食决策与管理平台，消除用户的"选择困难症"，平衡营养健康与决策效率。

## ✨ 功能特性

### 1. 🤖 AI 视觉识材（扫一扫冰箱）
- 用户拍摄冰箱内部或食材照片
- 系统通过计算机视觉识别蔬菜、肉类、蛋奶等
- 自动同步到"虚拟库存"
- 对即将过期的食材进行高亮提醒
- 优先推荐相关菜谱

### 2. 🍳 "因材施教" 菜谱推荐
- 根据"虚拟库存"中已有的食材，匹配最适合的菜谱
- 口味偏好画像：川味、生酮饮食、减脂、快手菜等
- 智能补全方案：自动生成"补货清单"
- 多维度筛选：烹饪时间、难度、饮食类型等

### 3. 👨‍🍳 烹饪引导
- 详细分步骤语音引导
- 支持语音交互（"下一步"、"继续"）
- 实时计时器
- 小贴士提示

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI框架**: TailwindCSS + Lucide React
- **状态管理**: Zustand
- **后端**: Python + FastAPI
- **数据库**: Supabase (PostgreSQL)
- **AI服务**: OpenAI GPT-4o (视觉识别)
- **语音识别**: Web Speech API

## 📁 项目结构

```
what2eat/
├── backend/                    # FastAPI 后端
│   ├── main.py                # 应用入口
│   ├── requirements.txt       # Python依赖
│   ├── routers/               # API路由
│   │   ├── ingredients.py    # 食材管理
│   │   ├── recipes.py         # 菜谱推荐
│   │   ├── cooking.py         # 烹饪引导
│   │   └── users.py           # 用户管理
│   ├── services/              # 业务逻辑
│   │   ├── vision_service.py  # 视觉识别
│   │   ├── recipe_service.py  # 菜谱推荐
│   │   └── cooking_service.py # 烹饪引导
│   └── models/                # 数据模型
│       ├── schemas.py
│       ├── recipe_schemas.py
│       ├── cooking_schemas.py
│       ├── user_schemas.py
│       └── database.py
├── frontend/                  # React 前端
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   │   └── Layout.tsx
│   │   ├── pages/             # 页面组件
│   │   │   ├── HomePage.tsx
│   │   │   ├── ScannerPage.tsx
│   │   │   ├── RecipesPage.tsx
│   │   │   ├── RecipeDetailPage.tsx
│   │   │   ├── CookingPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── services/          # API服务
│   │   │   └── api.ts
│   │   ├── stores/            # 状态管理
│   │   │   └── index.ts
│   │   └── types/             # TypeScript类型
│   │       └── index.ts
│   └── package.json
└── supabase/                  # Supabase配置
    └── config/
        └── schema.sql         # 数据库Schema
```

## 🚀 快速开始

### 前置条件

- Node.js 18+
- Python 3.11+
- Supabase 账号
- OpenAI API Key

### 1. 克隆项目

```bash
git clone <repository-url>
cd what2eat
```

### 2. 设置 Supabase

1. 创建新的 Supabase 项目
2. 在 Supabase SQL Editor 中运行 `supabase/config/schema.sql`
3. 获取项目 URL 和 anon key

### 3. 设置后端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

创建 `.env` 文件：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

启动后端：

```bash
uvicorn main:app --reload
```

后端将在 `http://localhost:8000` 运行

API 文档：`http://localhost:8000/docs`

### 4. 设置前端

```bash
cd frontend
npm install
```

创建 `.env` 文件：

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

启动前端：

```bash
npm run dev
```

前端将在 `http://localhost:5173` 运行

## 📱 功能演示

### 首页
- 查看食材库存
- 快速扫描入口
- 今日推荐菜谱
- 即将过期提醒

### 扫描页面
- 拍照识别食材
- 上传图片识别
- 手动添加/编辑食材
- 保存到库存

### 菜谱页面
- 智能推荐菜谱
- 多维度筛选
- 匹配度显示
- 缺失食材提醒

### 烹饪页面
- 步骤引导
- 语音控制
- 计时器
- 烹饪小贴士

### 个人中心
- 用户信息管理
- 口味偏好设置
- 饮食类型选择
- 统计信息

## 🔧 配置说明

### Supabase 设置

1. 启用 Row Level Security (RLS)
2. 设置合适的访问策略
3. 配置实时订阅（可选）

### OpenAI 配置

本项目使用 GPT-4o 进行：
- 食材图像识别
- 菜谱智能推荐
- 烹饪建议生成

### 语音识别

浏览器原生 Web Speech API 支持：
- Chrome: 完整支持
- Edge: 完整支持
- Safari: 部分支持
- Firefox: 需要手动启用

## 🧪 测试

```bash
# 后端测试
cd backend
pytest

# 前端测试
cd frontend
npm run test
```

## 📦 构建

```bash
# 前端构建
cd frontend
npm run build

# 后端使用 Gunicorn
cd backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Supabase](https://supabase.com/) - 开源 Firebase 替代方案
- [OpenAI](https://openai.com/) - AI 能力支持
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [Lucide](https://lucide.dev/) - 图标库
- [Zustand](https://zustand-demo.pmnd.rs/) - 状态管理

## 📞 联系方式

- 项目链接: [https://github.com/yourusername/what2eat](https://github.com/yourusername/what2eat)
- 问题反馈: [Issues](https://github.com/yourusername/what2eat/issues)

---

Happy Cooking! 🍳✨
