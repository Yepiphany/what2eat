-- Update RLS policies to allow any UUID for development
-- This allows the locally generated user IDs to work with Supabase

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own recipe pages" ON recipe_pages;
DROP POLICY IF EXISTS "Users can insert own recipe pages" ON recipe_pages;
DROP POLICY IF EXISTS "Users can update own recipe pages" ON recipe_pages;
DROP POLICY IF EXISTS "Users can delete own recipe pages" ON recipe_pages;

-- Create new RLS policies - allow any valid UUID for development
CREATE POLICY "Users can view any recipe pages" ON recipe_pages
    FOR SELECT USING (user_id::text LIKE '________-____-____-____-____________');

CREATE POLICY "Users can insert any recipe pages" ON recipe_pages
    FOR INSERT WITH CHECK (user_id::text LIKE '________-____-____-____-____________');

CREATE POLICY "Users can update any recipe pages" ON recipe_pages
    FOR UPDATE USING (user_id::text LIKE '________-____-____-____-____________');

CREATE POLICY "Users can delete any recipe pages" ON recipe_pages
    FOR DELETE USING (user_id::text LIKE '________-____-____-____-____________');

SELECT 'RLS policies updated for local UUID support!' as status;
