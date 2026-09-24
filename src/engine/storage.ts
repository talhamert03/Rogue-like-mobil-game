/** Small persistence abstraction so the engine can run in node tests. */
export interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  del(key: string): void;
}

const mem = new Map<string, string>();
const memoryKV: KV = {
  get: (k) => mem.get(k) ?? null,
  set: (k, v) => void mem.set(k, v),
  del: (k) => void mem.delete(k),
};

function detect(): KV {
  try {
    if (typeof localStorage !== 'undefined') {
      const t = '__dd_test__';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
      return {
        get: (k) => {
          try {
            return localStorage.getItem(k);
          } catch {
            return mem.get(k) ?? null;
          }
        },
        set: (k, v) => {
          try {
            localStorage.setItem(k, v);
          } catch {
            mem.set(k, v);
          }
        },
        del: (k) => {
          try {
            localStorage.removeItem(k);
          } catch {
            mem.delete(k);
          }
        },
      };
    }
  } catch {
    /* fall through */
  }
  return memoryKV;
}

export const storage: KV = detect();

export const KEYS = {
  run: 'deckdelver.run.v1',
  profile: 'deckdelver.profile.v1',
};
