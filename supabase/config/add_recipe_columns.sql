-- Add missing columns to recipes table for AI-generated recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS match_percentage DECIMAL(5,2);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS matched_ingredients TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS missing_ingredients TEXT[];
