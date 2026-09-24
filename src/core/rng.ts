/**
 * Deterministic, serializable pseudo random number generator (mulberry32).
 * The state lives in a plain object so it can be stored inside the run save.
 */
export interface RngState {
  s: number;
}

export function makeRngState(seed: number): RngState {
  return { s: seed >>> 0 };
}

export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Rng {
  constructor(public readonly state: RngState) {}

  static fromSeed(seed: number): Rng {
    return new Rng(makeRngState(seed));
  }

  /** float in [0,1) */
  next(): number {
    let t = (this.state.s = (this.state.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick on empty array');
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Picks a key from a weight table. */
  weighted<K extends string>(table: Partial<Record<K, number>>): K {
    const entries = Object.entries(table) as [K, number][];
    const total = entries.reduce((a, [, w]) => a + Math.max(0, w), 0);
    let r = this.next() * total;
    for (const [k, w] of entries) {
      r -= Math.max(0, w);
      if (r < 0) return k;
    }
    return entries[entries.length - 1][0];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** n distinct items from arr (or fewer if arr is short) */
  sample<T>(arr: readonly T[], n: number): T[] {
    return this.shuffle(arr.slice()).slice(0, n);
  }

  /** derive an independent seed */
  fork(): number {
    return Math.floor(this.next() * 4294967296) >>> 0;
  }
}
