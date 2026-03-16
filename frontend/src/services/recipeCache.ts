const RECIPE_CACHE_DIRTY_KEY = 'recipe_cache_dirty';
const FORCE_REFRESH_RECIPES_KEY = 'forceRefreshRecipes';

export const RECIPE_CACHE_DIRTY_EVENT = 'recipe-cache-dirty-change';

function notifyDirtyChange() {
  window.dispatchEvent(new CustomEvent(RECIPE_CACHE_DIRTY_EVENT));
}

export function isRecipeCacheDirty(): boolean {
  return localStorage.getItem(RECIPE_CACHE_DIRTY_KEY) === '1';
}

export function markRecipeCacheDirty(): void {
  localStorage.setItem(RECIPE_CACHE_DIRTY_KEY, '1');
  notifyDirtyChange();
}

export function clearRecipeCacheDirty(): void {
  localStorage.removeItem(RECIPE_CACHE_DIRTY_KEY);
  notifyDirtyChange();
}

export function requestRecipeForceRefresh(): void {
  sessionStorage.setItem(FORCE_REFRESH_RECIPES_KEY, 'true');
}

export function consumeRecipeForceRefreshRequest(): boolean {
  const shouldRefresh =
      sessionStorage.getItem(FORCE_REFRESH_RECIPES_KEY) === 'true';
  if (shouldRefresh) {
    sessionStorage.removeItem(FORCE_REFRESH_RECIPES_KEY);
  }
  return shouldRefresh;
}
