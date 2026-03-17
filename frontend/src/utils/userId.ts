const STORAGE_KEY_USER_ID = 'user_id';
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string|null): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function getUserId(): string {
  const storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID);
  if (isValidUuid(storedUserId)) {
    return storedUserId;
  }

  const userId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY_USER_ID, userId);
  if (storedUserId) {
    console.warn('[USER] 检测到无效用户ID，已重新生成:', storedUserId);
  } else {
    console.log('[USER] 创建新用户ID:', userId);
  }
  return userId;
}

export function setUserId(id: string): void {
  if (!isValidUuid(id)) {
    throw new Error('user_id 必须是合法 UUID');
  }
  localStorage.setItem(STORAGE_KEY_USER_ID, id);
}

export function clearUserId(): void {
  localStorage.removeItem(STORAGE_KEY_USER_ID);
}

export function getOrCreateUserId(): string {
  return getUserId();
}
