type Entry<T> = {
  value: T;
  expiresAt: number;
};

const TTL_MS = 60_000;

const store = new Map<string, Entry<unknown>>();

/**
 * Small in-process cache used to keep repeated text searches off the database.
 * Search is the only hot read path in this app, so nothing else goes through here.
 */
export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }

  return entry.value as T;
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}
