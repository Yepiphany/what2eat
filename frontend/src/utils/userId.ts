const STORAGE_KEY_USER_ID = 'user_id';

export function getUserId(): string {
  let userId = localStorage.getItem(STORAGE_KEY_USER_ID);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    console.log('[USER] 创建新用户ID:', userId);
  }
  return userId;
}

export function setUserId(id: string): void {
  localStorage.setItem(STORAGE_KEY_USER_ID, id);
}

export function clearUserId(): void {
  localStorage.removeItem(STORAGE_KEY_USER_ID);
}

export function getOrCreateUserId(): string {
  return getUserId();
}
