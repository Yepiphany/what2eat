export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  expiry_date?: string;
  estimated_expiry_days?: number;
  image_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  days_until_expiry?: number;
  is_expiring_soon?: boolean;
}

export type IngredientCategory =|'vegetable'|'meat'|'seafood'|'dairy'|'egg'|
    'grain'|'fruit'|'seasoning'|'beverage'|'other';

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  cooking_time: number;
  difficulty: RecipeDifficulty;
  taste_tags: TastePreference[];
  diet_types: DietType[];
  calories?: number;
  servings: number;
  image_url?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  matched_ingredients?: string[];
  missing_ingredients?: string[];
  match_percentage?: number;
}

export type RecipeDifficulty = 'easy'|'medium'|'hard';
export type TastePreference =
    'spicy'|'sweet'|'sour'|'salty'|'umami'|'mild'|'bitter';
export type DietType = 'balanced'|'meat_lover'|'vegetable_lover'|'fitness_meal';

export interface CookingStep {
  step_number: number;
  instruction: string;
  duration_seconds?: number;
  tips?: string;
  image_url?: string;
}

export interface CookingSession {
  id: string;
  recipe_id: string;
  user_id: string;
  current_step: number;
  status: CookingSessionStatus;
  started_at?: string;
  completed_at?: string;
  steps: CookingStep[];
  recipe_title: string;
}

export type CookingSessionStatus =
    'not_started'|'in_progress'|'paused'|'completed';

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  taste_preferences: TastePreference[];
  diet_type?: DietType;
  max_cooking_time?: number;
  cooking_level?: string;
  created_at: string;
  updated_at: string;
}

export interface FavoriteRecipeMemoryItem {
  id: string;
  title: string;
  cooking_time: number;
  difficulty: RecipeDifficulty;
  image_url?: string;
  saved_at: string;
}

export interface CookingHistoryMemoryItem {
  session_id: string;
  recipe_id: string;
  recipe_title: string;
  completed_at: string;
  elapsed_seconds: number;
}

export interface UserMemoryProfile {
  user_id: string;
  favorite_recipes: FavoriteRecipeMemoryItem[];
  history_records: CookingHistoryMemoryItem[];
  temporary_goals: string[];
  long_term_goals: string[];
  ai_context_notes: string[];
  created_at: string;
  updated_at: string;
}

export type MemoryGoalType = 'temporary'|'long_term';

export type MemoryGoalAction = 'add'|'remove';

export interface RecipeRecommendationRequest {
  user_id?: string;
  available_ingredients: string[];
  required_ingredients?: string[];
  preset_ingredients?: string[];
  user_id?: string;
  taste_preferences?: TastePreference[];
  diet_type?: DietType;
  max_cooking_time?: number;
  max_difficulty?: RecipeDifficulty;
  cooking_level?: string;
  temporary_goals?: string[];
  long_term_goals?: string[];
}

export interface IngredientPresetResponse {
  categories: Record<string, string[]>;
}

export interface VoiceCommand {
  command: string;
  confidence: number;
}

export interface ShoppingItem {
  item: string;
  quantity: number;
  unit: string;
  priority: 'high'|'medium'|'low';
}

export interface ShoppingList {
  shopping_list: ShoppingItem[];
  tips: string[];
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
