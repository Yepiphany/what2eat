-- Recipe Pages Table Migration
-- Run this in Supabase SQL Editor

-- Create recipe_pages table
CREATE TABLE IF NOT EXISTS recipe_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_index INTEGER NOT NULL DEFAULT 0,
    recipes JSONB NOT NULL DEFAULT '[]',
    ingredients_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_recipe_pages_user_id ON recipe_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_pages_ingredients_hash ON recipe_pages(ingredients_hash);

-- Enable Row Level Security
ALTER TABLE recipe_pages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - allow hardcoded user_id for development
CREATE POLICY "Users can view own recipe pages" ON recipe_pages
    FOR SELECT USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Users can insert own recipe pages" ON recipe_pages
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Users can update own recipe pages" ON recipe_pages
    FOR UPDATE USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Users can delete own recipe pages" ON recipe_pages
    FOR DELETE USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_recipe_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_recipe_pages_updated_at ON recipe_pages;
CREATE TRIGGER update_recipe_pages_updated_at BEFORE UPDATE ON recipe_pages
    FOR EACH ROW EXECUTE FUNCTION update_recipe_pages_updated_at();

SELECT 'Recipe pages table created successfully!' as status;
