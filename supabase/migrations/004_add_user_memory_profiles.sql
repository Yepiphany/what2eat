-- Add persistent memory profile table for personalization and companionship features.

CREATE TABLE IF NOT EXISTS user_memory_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    favorite_recipes JSONB NOT NULL DEFAULT '[]'::jsonb,
    history_records JSONB NOT NULL DEFAULT '[]'::jsonb,
    temporary_goals TEXT[] NOT NULL DEFAULT '{}',
    long_term_goals TEXT[] NOT NULL DEFAULT '{}',
    ai_context_notes TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_memory_profiles_user_id
    ON user_memory_profiles(user_id);

ALTER TABLE user_memory_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user memory profiles" ON user_memory_profiles;
CREATE POLICY "Anyone can view user memory profiles" ON user_memory_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert user memory profiles" ON user_memory_profiles;
CREATE POLICY "Anyone can insert user memory profiles" ON user_memory_profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update user memory profiles" ON user_memory_profiles;
CREATE POLICY "Anyone can update user memory profiles" ON user_memory_profiles
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete user memory profiles" ON user_memory_profiles;
CREATE POLICY "Anyone can delete user memory profiles" ON user_memory_profiles
    FOR DELETE USING (true);

DROP TRIGGER IF EXISTS update_user_memory_profiles_updated_at ON user_memory_profiles;
CREATE TRIGGER update_user_memory_profiles_updated_at
    BEFORE UPDATE ON user_memory_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
