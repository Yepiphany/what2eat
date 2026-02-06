-- Supabase Database Schema for What2Eat (今天吃什么)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    email TEXT UNIQUE,
    avatar_url TEXT,
    taste_preferences TEXT[] DEFAULT '{}',
    diet_type TEXT CHECK (diet_type IN ('normal', 'keto', 'low_carb', 'low_fat', 'vegetarian', 'vegan', 'paleo')),
    max_cooking_time INTEGER DEFAULT 60,
    cooking_level TEXT CHECK (cooking_level IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredients Table
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('vegetable', 'meat', 'seafood', 'dairy', 'egg', 'grain', 'fruit', 'seasoning', 'beverage', 'other')),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT '个',
    expiry_date TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes Table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    ingredients TEXT[] NOT NULL,
    steps TEXT[] NOT NULL,
    cooking_time INTEGER NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    taste_tags TEXT[] DEFAULT '{}',
    diet_types TEXT[] DEFAULT '{}',
    calories INTEGER,
    servings INTEGER DEFAULT 1,
    image_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cooking Sessions Table
CREATE TABLE cooking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'paused', 'completed')),
    steps JSONB NOT NULL DEFAULT '[]',
    recipe_title TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Favorites Table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

-- Shopping Lists Table
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe Pages Table (stores multiple recipe pages for persistence)
CREATE TABLE recipe_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_index INTEGER NOT NULL DEFAULT 0,
    recipes JSONB NOT NULL DEFAULT '[]',
    ingredients_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_expiry ON ingredients(expiry_date);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_cooking_time ON recipes(cooking_time);
CREATE INDEX idx_cooking_sessions_user_id ON cooking_sessions(user_id);
CREATE INDEX idx_cooking_sessions_status ON cooking_sessions(status);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_pages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Ingredients policies
CREATE POLICY "Users can view own ingredients" ON ingredients
    FOR SELECT USING (user_id = auth.uid() OR user_id IN (SELECT id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own ingredients" ON ingredients
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ingredients" ON ingredients
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ingredients" ON ingredients
    FOR DELETE USING (user_id = auth.uid());

-- Recipes policies (public recipes visible to all)
CREATE POLICY "Anyone can view public recipes" ON recipes
    FOR SELECT USING (is_public = TRUE OR user_id = auth.uid());

CREATE POLICY "Users can insert their own recipes" ON recipes
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own recipes" ON recipes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own recipes" ON recipes
    FOR DELETE USING (user_id = auth.uid());

-- Cooking sessions policies
CREATE POLICY "Users can view own cooking sessions" ON cooking_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cooking sessions" ON cooking_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cooking sessions" ON cooking_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cooking sessions" ON cooking_sessions
    FOR DELETE USING (user_id = auth.uid());

-- User favorites policies
CREATE POLICY "Users can view own favorites" ON user_favorites
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own favorites" ON user_favorites
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own favorites" ON user_favorites
    FOR DELETE USING (user_id = auth.uid());

-- Shopping lists policies
CREATE POLICY "Users can view own shopping lists" ON shopping_lists
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own shopping lists" ON shopping_lists
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own shopping lists" ON shopping_lists
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own shopping lists" ON shopping_lists
    FOR DELETE USING (user_id = auth.uid());

-- Recipe pages policies - allow hardcoded user_id for development
CREATE POLICY "Users can view own recipe pages" ON recipe_pages
    FOR SELECT USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Users can insert own recipe pages" ON recipe_pages
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Users can update own recipe pages" ON recipe_pages
    FOR UPDATE USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Users can delete own recipe pages" ON recipe_pages
    FOR DELETE USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cooking_sessions_updated_at BEFORE UPDATE ON cooking_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_pages_updated_at BEFORE UPDATE ON recipe_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample recipes for testing
INSERT INTO recipes (id, title, description, ingredients, steps, cooking_time, difficulty, taste_tags, diet_types, calories, servings, is_public)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', '番茄炒蛋', '经典家常菜，简单美味', 
     ARRAY['番茄', '鸡蛋', '葱', '盐', '糖', '食用油'],
     ARRAY['番茄洗净切块', '鸡蛋打散备用', '热锅倒油，倒入蛋液翻炒至凝固', '加入番茄翻炒均匀', '加入盐和糖调味', '撒上葱花出锅'],
     15, 'easy', ARRAY['sweet', 'mild'], ARRAY['normal', 'vegetarian'], 280, 2, TRUE),

    ('550e8400-e29b-41d4-a716-446655440002', '麻婆豆腐', '川菜经典，麻辣鲜香',
     ARRAY['豆腐', '猪肉末', '郫县豆瓣酱', '花椒', '辣椒', '蒜', '葱', '生抽', '淀粉'],
     ARRAY['豆腐切块焯水', '准备肉末', '热锅倒油，炒香豆瓣酱', '加入肉末翻炒', '加入豆腐轻轻翻动', '勾芡出锅'],
     25, 'medium', ARRAY['spicy', 'umami'], ARRAY['normal'], 350, 2, TRUE),

    ('550e8400-e29b-41d4-a716-446655440003', '清炒时蔬', '保持蔬菜原味，健康美味',
     ARRAY['青菜', '蒜', '盐', '食用油'],
     ARRAY['青菜洗净切段', '蒜切片', '热锅倒油，爆香蒜片', '加入青菜翻炒', '加盐调味即可'],
     10, 'easy', ARRAY['mild'], ARRAY['normal', 'vegan', 'vegetarian', 'keto', 'low_carb'], 120, 2, TRUE),

    ('550e8400-e29b-41d4-a716-446655440004', '红烧肉', '肥而不腻，入口即化',
     ARRAY['五花肉', '生抽', '老抽', '料酒', '冰糖', '葱', '姜', '八角'],
     ARRAY['五花肉切块焯水', '锅中放油，加入冰糖炒糖色', '加入五花肉翻炒上色', '加入调味料和香料', '小火炖煮1小时'],
     90, 'medium', ARRAY['sweet', 'salty'], ARRAY['normal', 'paleo'], 580, 4, TRUE),

    ('550e8400-e29b-41d4-a716-446655440005', '蒜蓉西兰花', '简单快手，营养丰富',
     ARRAY['西兰花', '蒜', '盐', '橄榄油'],
     ARRAY['西兰花洗净切小朵', '蒜切末', '烧水焯西兰花1分钟', '热锅倒油，爆香蒜末', '加入西兰花翻炒', '加盐调味出锅'],
     12, 'easy', ARRAY['mild'], ARRAY['normal', 'vegan', 'vegetarian', 'keto', 'low_carb', 'low_fat'], 150, 2, TRUE);
