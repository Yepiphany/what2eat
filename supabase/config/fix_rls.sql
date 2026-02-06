-- ========================================
-- 修复 RLS 权限问题 - 允许演示模式
-- ========================================

-- 1. 删除现有的严格 RLS 策略（仅保留 SELECT 公共访问）
DROP POLICY IF EXISTS "Users can insert own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can update own ingredients" ON ingredients;
DROP POLICY IF EXISTS "Users can delete own ingredients" ON ingredients;

DROP POLICY IF EXISTS "Users can insert their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;

DROP POLICY IF EXISTS "Users can insert own cooking sessions" ON cooking_sessions;
DROP POLICY IF EXISTS "Users can update own cooking sessions" ON cooking_sessions;
DROP POLICY IF EXISTS "Users can delete own cooking sessions" ON cooking_sessions;

DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;

DROP POLICY IF EXISTS "Users can insert own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can update own shopping lists" ON shopping_sessions;
DROP POLICY IF EXISTS "Users can delete own shopping lists" ON shopping_lists;

-- 2. 创建允许匿名访问的新策略（基于 user_id 直接匹配）
-- Ingredients: 允许任何人访问和操作（演示模式）
CREATE POLICY "Anyone can view ingredients" ON ingredients
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert ingredients" ON ingredients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update ingredients" ON ingredients
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete ingredients" ON ingredients
    FOR DELETE USING (true);

-- Recipes: 公共食谱可查看，允许匿名创建
CREATE POLICY "Anyone can view recipes" ON recipes
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert recipes" ON recipes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update recipes" ON recipes
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete recipes" ON recipes
    FOR DELETE USING (true);

-- Cooking sessions
CREATE POLICY "Anyone can view cooking sessions" ON cooking_sessions
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert cooking sessions" ON cooking_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update cooking sessions" ON cooking_sessions
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete cooking sessions" ON cooking_sessions
    FOR DELETE USING (true);

-- User favorites
CREATE POLICY "Anyone can view favorites" ON user_favorites
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert favorites" ON user_favorites
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete favorites" ON user_favorites
    FOR DELETE USING (true);

-- Shopping lists
CREATE POLICY "Anyone can view shopping lists" ON shopping_lists
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert shopping lists" ON shopping_lists
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update shopping lists" ON shopping_lists
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete shopping lists" ON shopping_lists
    FOR DELETE USING (true);

SELECT 'RLS policies updated for demo mode' as status;
