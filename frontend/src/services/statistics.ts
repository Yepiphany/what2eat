const STORAGE_KEY_SCANNED = 'stats_scanned_ingredients';
const STORAGE_KEY_VIEWED = 'stats_viewed_recipes';

type DailyCounter = {
  date: string;
  count: number;
};

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCount(key: string): number {
  const raw = localStorage.getItem(key);
  if (!raw) return 0;

  // Backward compatibility for old numeric payloads.
  const legacy = parseInt(raw, 10);
  if (Number.isFinite(legacy)) {
    return Math.max(0, legacy);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DailyCounter>;
    if (!parsed || typeof parsed.count !== 'number' || typeof parsed.date !== 'string') {
      return 0;
    }
    if (parsed.date !== getTodayKey()) {
      return 0;
    }
    return Math.max(0, parsed.count);
  } catch {
    return 0;
  }
}

function writeCount(key: string, value: number): void {
  const payload: DailyCounter = {
    date: getTodayKey(),
    count: Math.max(0, value),
  };
  localStorage.setItem(key, JSON.stringify(payload));
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
