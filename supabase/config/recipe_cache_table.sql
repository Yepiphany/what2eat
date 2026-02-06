-- Recipe Cache Table for storing AI-generated recipes based on ingredients
CREATE TABLE IF NOT EXISTS recipe_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredients_hash TEXT NOT NULL UNIQUE,
    ingredients_list TEXT[] NOT NULL,
    recipes JSONB NOT NULL,
    taste_preferences TEXT[],
    diet_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by ingredients_hash
CREATE INDEX IF NOT EXISTS idx_recipe_cache_ingredients_hash ON recipe_cache(ingredients_hash);

-- Cleanup: Remove old cache entries older than 7 days (optional, can be run manually)
-- DELETE FROM recipe_cache WHERE created_at < NOW() - INTERVAL '7 days';
