import type {CookingSession, Recipe, RecipeDifficulty} from '../types';

const FAVORITES_STORAGE_KEY = 'favorite_recipes_v1';
const HISTORY_STORAGE_KEY = 'cooking_history_v1';
const FAVORITES_LIMIT = 100;
const HISTORY_LIMIT = 50;

export const FAVORITES_UPDATED_EVENT = 'favorites-updated';
export const COOKING_HISTORY_UPDATED_EVENT = 'cooking-history-updated';

export interface FavoriteRecipeItem {
  id: string;
  title: string;
  cooking_time: number;
  difficulty: RecipeDifficulty;
  image_url?: string;
  saved_at: string;
}

export interface CookingHistoryItem {
  session_id: string;
  recipe_id: string;
  recipe_title: string;
  completed_at: string;
  elapsed_seconds: number;
}

function readList<T>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.warn('Failed to parse local storage list:', error);
    return [];
  }
}

function writeList<T>(storageKey: string, data: T[]): void {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function getFavoriteRecipes(): FavoriteRecipeItem[] {
  const favorites = readList<FavoriteRecipeItem>(FAVORITES_STORAGE_KEY);
  return favorites.sort((a, b) => {
    return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
  });
}

export function isRecipeFavorited(recipeId: string): boolean {
  return getFavoriteRecipes().some((item) => item.id === recipeId);
}

export function toggleFavoriteRecipe(recipe: Recipe): boolean {
  const favorites = getFavoriteRecipes();
  const existingIndex = favorites.findIndex((item) => item.id === recipe.id);

  if (existingIndex >= 0) {
    const updated = favorites.filter((item) => item.id !== recipe.id);
    writeList(FAVORITES_STORAGE_KEY, updated);
    window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
    return false;
  }

  const created: FavoriteRecipeItem = {
    id: recipe.id,
    title: recipe.title,
    cooking_time: recipe.cooking_time,
    difficulty: recipe.difficulty,
    image_url: recipe.image_url,
    saved_at: new Date().toISOString(),
  };

  const updated = [created, ...favorites].slice(0, FAVORITES_LIMIT);
  writeList(FAVORITES_STORAGE_KEY, updated);
  window.dispatchEvent(new Event(FAVORITES_UPDATED_EVENT));
  return true;
}

export function getCookingHistory(limit: number = HISTORY_LIMIT):
    CookingHistoryItem[] {
  const history = readList<CookingHistoryItem>(HISTORY_STORAGE_KEY);
  return history
      .sort((a, b) => {
        return new Date(b.completed_at).getTime() -
            new Date(a.completed_at).getTime();
      })
      .slice(0, limit);
}

export function addCookingHistory(
    session: CookingSession, elapsedSeconds: number): void {
  const history = getCookingHistory(HISTORY_LIMIT);
  const nextItem: CookingHistoryItem = {
    session_id: session.id,
    recipe_id: session.recipe_id,
    recipe_title: session.recipe_title,
    completed_at: new Date().toISOString(),
    elapsed_seconds: Math.max(0, Math.floor(elapsedSeconds)),
  };

  const deduplicated = history.filter((item) => item.session_id !== session.id);
  const updated = [nextItem, ...deduplicated].slice(0, HISTORY_LIMIT);
  writeList(HISTORY_STORAGE_KEY, updated);
  window.dispatchEvent(new Event(COOKING_HISTORY_UPDATED_EVENT));
}
