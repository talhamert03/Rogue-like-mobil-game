import type { LStr } from '../i18n/i18n';
import type { RngState } from '../core/rng';

export type ClassId =
  | 'warrior'
  | 'assassin'
  | 'wizard'
  | 'ranger'
  | 'paladin'
  | 'necromancer'
  | 'engineer'
  | 'monk'
  | 'shaman'
  | 'druid'
  | 'barbarian'
  | 'pirate'
  | 'runemaster'
  | 'warden'
  | 'cultist';

export type CardType = 'attack' | 'skill' | 'power' | 'curse' | 'status';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special';
export type CardPool = ClassId | 'neutral' | 'curse' | 'status' | 'token';

/**
 * What the player has to pick when playing a card.
 *  - none   : no target, played directly
 *  - enemy  : an enemy unit within `range`
 *  - ally   : a friendly summoned unit within `range`
 *  - tile   : any tile within `range` (area spells, bombs)
 *  - empty  : an empty tile within `range` (summons, traps, teleports)
 *  - move   : an empty tile reachable by walking up to `range` tiles
 */
export type TargetKind = 'none' | 'enemy' | 'ally' | 'tile' | 'empty' | 'move';

/** Who an effect applies to. */
export type Sel =
  | 'target' // the chosen unit (or unit on chosen tile)
  | 'self'
  | 'all' // all enemies
  | 'random' // random enemy
  | 'adjacent' // enemies adjacent to the hero
  | 'area' // units within `radius` of the chosen tile / target (enemies only)
  | 'areaAll' // every unit within radius (friend or foe, e.g. bombs)
  | 'line' // enemies in a straight line from the hero towards target, `len` tiles
  | 'behind' // the unit right behind the target (away from hero)
  | 'allies' // all friendly summons
  | 'near'; // enemies within `radius` of the hero

/** Dynamic numeric value: base + per * source */
export interface Val {
  b: number;
  per?:
    | 'x'
    | 'block'
    | 'ki'
    | 'souls'
    | 'radiance'
    | 'targetPoison'
    | 'targetMark'
    | 'handSize'
    | 'allies'
    | 'exhausted'
    | 'missingHp'
    | 'runes'
    | 'fury'
    | 'gold'
    | 'targetDoom';
  m?: number;
}
export type Num = number | Val;

export type Cond =
  | { c: 'targetHas'; s: string }
  | { c: 'selfHas'; s: string; n?: number }
  | { c: 'targetDist'; min?: number; max?: number }
  | { c: 'killed' }
  | { c: 'hpBelow'; pct: number };

export type Effect =
  | {
      k: 'dmg';
      n: Num;
      times?: Num;
      to?: Sel;
      radius?: number;
      len?: number;
      pierce?: boolean;
      holy?: boolean;
      lifesteal?: number;
      fx?: string;
    }
  | { k: 'block'; n: Num; to?: 'self' | 'allies' }
  | { k: 'status'; s: string; n: Num; to?: Sel; radius?: number; len?: number }
  | { k: 'draw'; n: Num }
  | { k: 'energy'; n: Num }
  | { k: 'mp'; n: Num }
  | { k: 'heal'; n: Num; to?: 'self' | 'allies' }
  | { k: 'moveTo' } // walk / blink to chosen tile
  | { k: 'dash'; n: number } // move towards target until adjacent, up to n tiles
  | { k: 'retreat'; n: number } // move away from nearest enemy
  | { k: 'push'; n: number; to?: Sel; radius?: number; stun?: boolean }
  | { k: 'pull'; n: number; to?: Sel }
  | { k: 'behindTarget' } // teleport to the far side of target
  | { k: 'swap' }
  | { k: 'summon'; unit: string; n?: number }
  | { k: 'trap'; trap: string; n: Num; radius?: number; spread?: number }
  | { k: 'bomb'; n: Num; radius: number; timer?: number; spread?: number }
  | { k: 'addCard'; card: string; n: number; to: 'hand' | 'draw' | 'discard'; up?: boolean }
  | { k: 'loseHp'; n: Num }
  | { k: 'spend'; s: string; n: number | 'all' } // spend a resource status (ki, souls...)
  | { k: 'custom'; id: string; n?: Num; m?: Num }
  | { k: 'if'; cond: Cond; then: Effect[]; else?: Effect[] };

export interface CardSpec {
  cost: number; // -1 => X
  type: CardType;
  target: TargetKind;
  range?: number;
  effects: Effect[];
  exhaust?: boolean;
  ethereal?: boolean;
  retain?: boolean;
  innate?: boolean;
  unplayable?: boolean;
  soulCost?: number;
  kiCost?: number;
  /** paid in HP when played */
  hpCost?: number;
  /** paid in run gold when played */
  goldCost?: number;
  /** override automatically generated description */
  desc?: LStr;
  /** append text after generated description */
  note?: LStr;
}

export interface CardDef {
  id: string;
  name: LStr;
  pool: CardPool;
  rarity: Rarity;
  art: string; // icon id
  tint?: string;
  spec: (up: boolean) => CardSpec;
  /** end of turn / while-in-hand hooks for curses & status cards */
  inHand?: 'regret' | 'doubt' | 'shackles' | 'scorch' | 'decay';
  upgradable?: boolean;
}

export interface CardInst {
  uid: number;
  id: string;
  up: boolean;
  /** cost override for this combat (null => normal) */
  cc?: number;
  /** cost override for this turn only */
  tc?: number;
}

/* ------------------------------------------------------------------ units */

export type Side = 'hero' | 'enemy' | 'ally';

export interface Intent {
  move: string;
  kind: IntentKind;
  dmg?: number;
  times?: number;
  range?: number;
  tiles?: number[];
  n?: number;
}

export type IntentKind =
  | 'attack'
  | 'charge'
  | 'area'
  | 'block'
  | 'buff'
  | 'debuff'
  | 'summon'
  | 'heal'
  | 'move'
  | 'retreat'
  | 'sleep'
  | 'escape'
  | 'stun'
  | 'unknown';

export interface Unit {
  uid: number;
  def: string;
  side: Side;
  hp: number;
  maxHp: number;
  block: number;
  pos: number;
  st: Record<string, number>;
  intent?: Intent | null;
  /** ai memory: history of moves */
  hist?: string[];
  alive: boolean;
  /** summoned mid-combat as a minion of a boss (dies with it) */
  minionOf?: number;
  /** per-unit counters */
  mem?: Record<string, number>;
}

export interface TileFx {
  id: number;
  pos: number;
  kind: 'trap' | 'bomb' | 'hazard';
  trap?: string;
  n: number;
  radius: number;
  timer?: number;
  owner: 'hero' | 'enemy';
}

/* ------------------------------------------------------------ combat state */

export type CombatPhase = 'player' | 'enemy' | 'won' | 'lost';

export interface CombatState {
  lane: number;
  units: Unit[];
  heroUid: number;
  tiles: TileFx[];
  hand: CardInst[];
  draw: CardInst[];
  discard: CardInst[];
  exhaust: CardInst[];
  energy: number;
  mp: number;
  turn: number;
  phase: CombatPhase;
  nextUid: number;
  rng: RngState;
  /** counters this turn */
  cardsThisTurn: number;
  attacksThisTurn: number;
  /** counters this combat */
  cardsThisCombat: number;
  hpLostThisCombat: number;
  shuffles: number;
  encounter: string;
  tier: 'normal' | 'elite' | 'boss';
  /** relic counters specific to this combat */
  flags: Record<string, number>;
  goldStolen: number;
  escaped: string[];
}

/* ------------------------------------------------------------------ events */

export type CEvent =
  | { t: 'turn'; side: 'player' | 'enemy'; turn: number }
  | { t: 'dmg'; uid: number; amount: number; blocked: number; hp: number; block: number; src?: number; fx?: string }
  | { t: 'miss'; uid: number }
  | { t: 'block'; uid: number; amount: number; block: number }
  | { t: 'heal'; uid: number; amount: number; hp: number }
  | { t: 'status'; uid: number; s: string; delta: number; total: number }
  | { t: 'move'; uid: number; from: number; to: number; how: 'walk' | 'push' | 'pull' | 'blink' | 'dash' }
  | { t: 'attack'; uid: number; tgt: number; ranged: boolean; fx?: string }
  | { t: 'cast'; uid: number; fx?: string; tiles?: number[] }
  | { t: 'area'; tiles: number[]; fx: string }
  | { t: 'death'; uid: number }
  | { t: 'spawn'; uid: number }
  | { t: 'draw'; n: number }
  | { t: 'shuffle' }
  | { t: 'play'; card: CardInst; tgt?: number }
  | { t: 'exhaustCard'; card: CardInst }
  | { t: 'energy'; n: number }
  | { t: 'gold'; n: number }
  | { t: 'intent'; uid: number }
  | { t: 'text'; uid: number; text: LStr; color: string }
  | { t: 'tile'; fx: TileFx; on: boolean }
  | { t: 'shake'; power: number }
  | { t: 'relic'; id: string }
  | { t: 'end'; result: 'won' | 'lost' };

/* --------------------------------------------------------------- enemies */

export interface EnemyMove {
  kind: IntentKind;
  dmg?: number;
  times?: number;
  range?: number;
  block?: number;
  self?: Record<string, number>;
  target?: Record<string, number>;
  allies?: Record<string, number>;
  /** area attack: tiles relative to the TARGET's position at intent time */
  aroundTarget?: number;
  /** area attack: tiles in front of self (towards hero) */
  front?: number;
  /** area attack: every tile within `radius` of self */
  radius?: number;
  summon?: string[];
  addCards?: { card: string; n: number; to: 'draw' | 'discard' | 'hand' };
  heal?: number;
  healAllies?: number;
  push?: number;
  pull?: number;
  /** charge distance before attacking */
  charge?: number;
  steal?: number;
  lifesteal?: boolean;
  fx?: string;
  name?: LStr;
}

export interface AiCtx {
  me: Unit;
  hero: Unit;
  turn: number;
  dist: number;
  allies: Unit[];
  rng: { next(): number; pick<T>(a: readonly T[]): T };
  last?: string;
  count: (move: string) => number;
  freeTiles: number;
}

export interface EnemyDef {
  id: string;
  name: LStr;
  sprite: string;
  palette?: Record<string, string>;
  scale?: number;
  hp: [number, number];
  speed: number;
  tier: 'normal' | 'elite' | 'boss' | 'minion';
  flying?: boolean;
  moves: Record<string, EnemyMove>;
  ai: (ctx: AiCtx) => string;
  start?: Record<string, number>;
  /** on death behaviour */
  onDeath?: { split?: string[]; explode?: { dmg: number; radius: number } };
  lore?: LStr;
}

export interface AllyDef {
  id: string;
  name: LStr;
  sprite: string;
  palette?: Record<string, string>;
  hp: number;
  hpUp?: number;
  speed: number;
  dmg: number;
  range: number;
  /** hits every enemy within range */
  aoe?: boolean;
  /** explodes on death */
  explode?: { dmg: number; radius: number };
  passive?: boolean;
  /** totem pulse performed every ally turn instead of attacking */
  pulse?: 'fire' | 'heal' | 'storm' | 'earth';
  /** statuses applied to enemies it hits */
  applies?: Record<string, number>;
  flying?: boolean;
  scale?: number;
}

/* ------------------------------------------------------------ relics etc */

export type RelicRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'shop' | 'event';

export interface PotionDef {
  id: string;
  name: LStr;
  desc: LStr;
  rarity: 'common' | 'uncommon' | 'rare';
  color: string;
  target: 'none' | 'enemy';
  combatOnly: boolean;
}
