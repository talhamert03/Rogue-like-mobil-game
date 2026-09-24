import type { RngState } from '../core/rng';
import type { CardInst, ClassId, CombatState } from './types';

export type GameMode = 'classic' | 'hell' | 'tower' | 'weekly';

export type NodeType = 'battle' | 'elite' | 'event' | 'shop' | 'rest' | 'treasure' | 'boss';

export interface MapNode {
  id: number;
  row: number;
  col: number;
  type: NodeType;
  next: number[];
  visited?: boolean;
}

export interface MapState {
  act: number;
  rows: number;
  cols: number;
  nodes: MapNode[];
  /** id of the current node (null before the first step) */
  cur: number | null;
  bossId: string;
}

export interface RunMods {
  enemyHp: number;
  enemyDmg: number;
  eliteHp: number;
  bossHp: number;
  restHeal: number;
  goldMult: number;
  eliteWeight: number;
  potionSlotsDelta: number;
}

export interface RewardItem {
  kind: 'gold' | 'card' | 'relic' | 'potion' | 'bossRelic';
  n?: number;
  cards?: string[];
  cardsUp?: boolean[];
  relic?: string;
  relics?: string[];
  potion?: string;
  taken?: boolean;
}

export interface ShopItem {
  kind: 'card' | 'relic' | 'potion' | 'remove';
  id?: string;
  up?: boolean;
  price: number;
  sold?: boolean;
  sale?: boolean;
}

export interface EventState {
  id: string;
  page: string;
  /** random values rolled when the event starts */
  vars: Record<string, number | string>;
  resultText?: string;
}

export type Screen =
  | 'map'
  | 'combat'
  | 'reward'
  | 'shop'
  | 'event'
  | 'rest'
  | 'treasure'
  | 'victory'
  | 'defeat'
  | 'tower';

export interface RunStats {
  kills: number;
  elites: number;
  bosses: number;
  damageDealt: number;
  damageTaken: number;
  cardsPlayed: number;
  goldEarned: number;
  floors: number;
  turns: number;
  maxHit: number;
}

export interface RunState {
  v: number;
  seed: number;
  mode: GameMode;
  hellLevel: number;
  weekly?: { week: string; modifiers: string[] };
  cls: ClassId;
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInst[];
  relics: string[];
  relicCounters: Record<string, number>;
  potions: (string | null)[];
  act: number;
  floor: number;
  map: MapState;
  screen: Screen;
  combat: CombatState | null;
  rewards: RewardItem[] | null;
  shop: ShopItem[] | null;
  event: EventState | null;
  treasure: { relic: string; gold: number; opened: boolean } | null;
  rest: { done: boolean } | null;
  nextUid: number;
  rng: {
    map: RngState;
    combat: RngState;
    loot: RngState;
    cards: RngState;
    event: RngState;
    shop: RngState;
  };
  mods: RunMods;
  stats: RunStats;
  seenCards: string[];
  seenEnemies: string[];
  /** encounters already fought this act (avoid repeats) */
  fought: string[];
  /** rare card chance offset (pity timer) */
  rarePity: number;
  potionChance: number;
  removals: number;
  rerolls: number;
  startedAt: number;
  playTime: number;
  score?: number;
  shards?: number;
  lastResult?: 'won' | 'lost' | 'abandoned';
  towerFloor: number;
  bossQueue: string[];
}
