const STORAGE_KEY_SCANNED = 'stats_scanned_ingredients';
const STORAGE_KEY_VIEWED = 'stats_viewed_recipes';

function readCount(key: string): number {
  const raw = localStorage.getItem(key);
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeCount(key: string, value: number): void {
  localStorage.setItem(key, String(Math.max(0, value)));
}

export function getScannedIngredientsCount(): number {
  return readCount(STORAGE_KEY_SCANNED);
}

export function getViewedRecipesCount(): number {
  return readCount(STORAGE_KEY_VIEWED);
}

export function incrementScannedIngredients(count: number = 1): number {
  const next = readCount(STORAGE_KEY_SCANNED) + count;
  writeCount(STORAGE_KEY_SCANNED, next);
  return next;
}

export function incrementViewedRecipes(count: number = 1): number {
  const next = readCount(STORAGE_KEY_VIEWED) + count;
  writeCount(STORAGE_KEY_VIEWED, next);
  return next;
}
