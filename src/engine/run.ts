import { Rng, hashString, makeRngState } from '../core/rng';
import type { CardInst, ClassId, Rarity } from './types';
import type { GameMode, MapNode, RewardItem, RunMods, RunState, ShopItem } from './runTypes';
import { Combat } from './combat';
import { availableNodes, generateMap, generateTowerSegment, isBossNext } from './map';
import { CLASSES } from '../data/classes';
import { CARDS, CARD_LIST, canUpgrade, cardSpec, classCards } from '../data/cards';
import { RELICS, RELIC_LIST, relicPassive } from '../data/relics';
import { POTIONS, POTION_LIST } from '../data/potions';
import { BOSSES_BY_ACT, ENCOUNTERS, encountersFor } from '../data/encounters';
import { EVENTS, EVENT_LIST, type EventApi } from '../data/events';
import { ENEMIES } from '../data/enemies';
import { perkLevel, type Profile, saveProfile, checkAchievements, type AchievementDef } from './meta';
import { storage, KEYS } from './storage';

export const RUN_VERSION = 1;
export const ACTS = 3;
const TOWER_SEGMENT = 10;

export interface NewRunOpts {
  cls: ClassId;
  mode: GameMode;
  hellLevel?: number;
  seed?: number;
}

/* ================================================================== weekly */

export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const WEEKLY_MODS = ['richStart', 'cursedStart', 'eliteHunt', 'toughFoes', 'weakRest', 'potionMaster', 'bigDeck', 'glass'] as const;

export function weeklySetup(week = weekKey()): { seed: number; cls: ClassId; mods: string[] } {
  const seed = hashString('deckdelver-weekly-' + week);
  const rng = Rng.fromSeed(seed);
  const classes = Object.keys(CLASSES) as ClassId[];
  const cls = rng.pick(classes);
  const mods = rng.sample([...WEEKLY_MODS], 2);
  return { seed, cls, mods };
}

/* ================================================================ creation */

function baseMods(): RunMods {
  return { enemyHp: 1, enemyDmg: 1, eliteHp: 1, bossHp: 1, restHeal: 1, goldMult: 1, eliteWeight: 1, potionSlotsDelta: 0 };
}

export function computeMods(run: RunState, profile?: Profile): RunMods {
  const m = baseMods();
  const h = run.mode === 'hell' ? run.hellLevel : 0;
  if (h >= 1) m.eliteWeight = 1.6;
  if (h >= 2) m.enemyDmg *= 1.1;
  if (h >= 3) m.eliteHp *= 1.2;
  if (h >= 4) m.bossHp *= 1.15;
  if (h >= 5) m.restHeal *= 0.8;
  if (h >= 7) m.enemyHp *= 1.1;
  if (h >= 9) m.potionSlotsDelta -= 1;
  if (h >= 10) m.enemyDmg *= 1.1;
  if (run.weekly) {
    const w = run.weekly.modifiers;
    if (w.includes('eliteHunt')) m.eliteWeight *= 2.2;
    if (w.includes('toughFoes')) m.enemyHp *= 1.2;
    if (w.includes('weakRest')) m.restHeal *= 0.5;
    if (w.includes('potionMaster')) m.potionSlotsDelta += 1;
    if (w.includes('glass')) m.enemyHp *= 0.8;
  }
  if (run.mode === 'tower') {
    const seg = Math.floor(Math.max(0, run.towerFloor - 1) / TOWER_SEGMENT);
    const extra = Math.max(0, seg - 2);
    m.enemyHp *= 1 + 0.22 * extra;
    m.enemyDmg *= 1 + 0.12 * extra;
  }
  void profile;
  return m;
}

export function potionSlots(run: RunState, profile?: Profile): number {
  const base = 3 + (profile ? perkLevel(profile, 'potionBelt') : 0);
  return Math.max(1, base + relicPassive(run, 'potionSlots') + run.mods.potionSlotsDelta);
}

export function newRun(opts: NewRunOpts, profile: Profile): RunState {
  const seed = opts.seed ?? (Math.floor(Math.random() * 2 ** 32) >>> 0);
  const master = Rng.fromSeed(seed);
  const cls = CLASSES[opts.cls];
  const run: RunState = {
    v: RUN_VERSION,
    seed,
    mode: opts.mode,
    hellLevel: opts.mode === 'hell' ? Math.max(1, opts.hellLevel ?? 1) : 0,
    cls: opts.cls,
    hp: cls.hp,
    maxHp: cls.hp,
    gold: 99,
    deck: [],
    relics: [cls.relic],
    relicCounters: {},
    potions: [null, null, null],
    act: 1,
    floor: 0,
    map: { act: 1, rows: 0, cols: 0, nodes: [], cur: null, bossId: '' },
    screen: 'map',
    combat: null,
    rewards: null,
    shop: null,
    event: null,
    treasure: null,
    rest: null,
    nextUid: 1,
    rng: {
      map: makeRngState(master.fork()),
      combat: makeRngState(master.fork()),
      loot: makeRngState(master.fork()),
      cards: makeRngState(master.fork()),
      event: makeRngState(master.fork()),
      shop: makeRngState(master.fork()),
    },
    mods: baseMods(),
    stats: { kills: 0, elites: 0, bosses: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0, goldEarned: 0, floors: 0, turns: 0, maxHit: 0 },
    seenCards: [],
    seenEnemies: [],
    fought: [],
    rarePity: 0,
    potionChance: 0.4,
    removals: 0,
    rerolls: 0,
    startedAt: Date.now(),
    playTime: 0,
    towerFloor: 0,
    bossQueue: [],
  };
  if (opts.mode === 'weekly') {
    const w = weeklySetup();
    run.weekly = { week: weekKey(), modifiers: w.mods };
  }
  run.mods = computeMods(run, profile);
  for (const id of cls.deck) run.deck.push({ uid: run.nextUid++, id, up: false });

  // perks
  const loot = new Rng(run.rng.loot);
  run.maxHp += 4 * perkLevel(profile, 'vitality');
  run.gold += 20 * perkLevel(profile, 'wealth');
  const scholar = perkLevel(profile, 'scholar');
  const upg = loot.sample(run.deck, scholar);
  for (const c of upg) c.up = true;
  if (perkLevel(profile, 'blessing')) grantRelic(run, randomRelicId(run, loot, 'common'));
  // hell
  if (run.hellLevel >= 6) run.hp = Math.floor(run.maxHp * 0.9);
  if (run.hellLevel >= 8) addCardToDeck(run, 'burden');
  if (run.hellLevel >= 10) run.maxHp -= 5;
  // weekly
  if (run.weekly) {
    const w = run.weekly.modifiers;
    if (w.includes('richStart')) run.gold += 250;
    if (w.includes('cursedStart')) {
      addCardToDeck(run, 'regret');
      addCardToDeck(run, 'doubt');
      grantRelic(run, randomRelicId(run, loot, 'rare'));
    }
    if (w.includes('bigDeck')) for (const d of loot.sample(classCards(run.cls), 3)) addCardToDeck(run, d.id);
    if (w.includes('glass')) run.maxHp = Math.floor(run.maxHp * 0.6);
  }
  run.hp = Math.min(run.hp, run.maxHp);
  if (run.hellLevel < 6) run.hp = run.maxHp;
  run.potions = Array(potionSlots(run, profile)).fill(null);
  if (perkLevel(profile, 'starterPotion')) gainPotion(run, randomPotionId(loot));
  if (run.weekly?.modifiers.includes('potionMaster')) for (let i = 0; i < 3; i++) gainPotion(run, randomPotionId(loot));

  // bosses
  const mapRng = new Rng(run.rng.map);
  run.bossQueue = [1, 2, 3].map((a) => mapRng.pick(BOSSES_BY_ACT[a]));
  if (opts.mode === 'tower') {
    run.act = 1;
    run.map = generateTowerSegment(mapRng, 1, TOWER_SEGMENT, towerBoss(run, 10, mapRng));
  } else {
    run.map = generateMap(mapRng, 1, run.bossQueue[0], run.mods.eliteWeight);
  }
  for (const c of run.deck) markSeen(run, c.id);
  return run;
}

function towerBoss(_run: RunState, floor: number, rng: Rng): string {
  const act = Math.min(3, Math.ceil(floor / TOWER_SEGMENT));
  return rng.pick(BOSSES_BY_ACT[act]);
}

/** the act used for enemy selection */
export function enemyAct(run: RunState): number {
  if (run.mode === 'tower') {
    const seg = Math.floor(Math.max(0, run.towerFloor - 1) / TOWER_SEGMENT);
    return Math.min(3, seg + 1);
  }
  return run.act;
}

/* =============================================================== save/load */

export function saveRun(run: RunState | null): void {
  if (!run) storage.del(KEYS.run);
  else storage.set(KEYS.run, JSON.stringify(run));
}

export function loadRun(): RunState | null {
  const raw = storage.get(KEYS.run);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as RunState;
    if (r.v !== RUN_VERSION) return null;
    return r;
  } catch {
    return null;
  }
}

/* ================================================================= helpers */

export function markSeen(run: RunState, cardId: string): void {
  if (!run.seenCards.includes(cardId)) run.seenCards.push(cardId);
}

export function addCardToDeck(run: RunState, id: string, up = false): CardInst {
  const c: CardInst = { uid: run.nextUid++, id, up: up && canUpgrade(id, false) };
  run.deck.push(c);
  markSeen(run, id);
  return c;
}

export function grantRelic(run: RunState, id: string | null): void {
  if (!id || run.relics.includes(id)) return;
  run.relics.push(id);
  const r = RELICS[id];
  const before = potionSlots(run);
  r?.onPickup?.(run, new Rng(run.rng.loot));
  if (r?.potionSlots) {
    const after = potionSlots(run);
    while (run.potions.length < after) run.potions.push(null);
    void before;
  }
}

export function gainPotion(run: RunState, id: string): boolean {
  const idx = run.potions.indexOf(null);
  if (idx < 0) return false;
  run.potions[idx] = id;
  return true;
}

export function randomPotionId(rng: Rng): string {
  const rarity = rng.weighted({ common: 65, uncommon: 30, rare: 5 });
  return rng.pick(POTION_LIST.filter((p) => p.rarity === rarity)).id;
}

export function randomRelicId(run: RunState, rng: Rng, rarity: string): string | null {
  const pool = RELIC_LIST.filter((r) => r.rarity === rarity && !run.relics.includes(r.id) && (!r.cls || r.cls === run.cls));
  if (!pool.length) {
    const any = RELIC_LIST.filter((r) => ['common', 'uncommon', 'rare'].includes(r.rarity) && !run.relics.includes(r.id));
    return any.length ? rng.pick(any).id : null;
  }
  return rng.pick(pool).id;
}

function rollRarity(run: RunState, rng: Rng, tier: 'normal' | 'elite' | 'boss' | 'shop'): Rarity {
  if (tier === 'boss') return 'rare';
  const rareBase = tier === 'elite' ? 10 : tier === 'shop' ? 9 : 3;
  const rare = Math.max(0, rareBase + run.rarePity);
  const unc = tier === 'elite' ? 40 : 37;
  const roll = rng.next() * 100;
  if (roll < rare) {
    run.rarePity = -5;
    return 'rare';
  }
  if (roll < rare + unc) return 'uncommon';
  run.rarePity = Math.min(run.rarePity + 1, 40);
  return 'common';
}

export function cardChoiceCount(run: RunState, profile?: Profile): number {
  return Math.max(1, 3 + relicPassive(run, 'cardChoices') + (profile ? perkLevel(profile, 'insight') : 0));
}

export function rollCardChoices(run: RunState, tier: 'normal' | 'elite' | 'boss', n: number, rareBoost = false): { ids: string[]; up: boolean[] } {
  const rng = new Rng(run.rng.cards);
  const ids: string[] = [];
  const up: boolean[] = [];
  const upChance = run.act >= 3 || enemyAct(run) >= 3 ? 0.25 : run.act === 2 || enemyAct(run) === 2 ? 0.12 : 0;
  let guard = 0;
  while (ids.length < n && guard++ < 100) {
    const rarity = rareBoost && rng.chance(0.3) ? 'rare' : rollRarity(run, rng, tier);
    const neutral = rng.chance(0.08);
    let pool = classCards(neutral ? 'neutral' : run.cls, rarity);
    if (!pool.length) pool = classCards(run.cls, rarity);
    const pick = rng.pick(pool);
    if (ids.includes(pick.id)) continue;
    ids.push(pick.id);
    up.push(rng.chance(upChance));
  }
  return { ids, up };
}

/* =================================================================== map */

export function currentNode(run: RunState): MapNode | undefined {
  return run.map.nodes.find((n) => n.id === run.map.cur);
}

export function mapChoices(run: RunState): MapNode[] {
  return availableNodes(run.map);
}

export function canFightBoss(run: RunState): boolean {
  return run.mode !== 'tower' && isBossNext(run.map) && run.screen === 'map';
}

/** Enter a map node. Returns the new screen. */
export function enterNode(run: RunState, nodeId: number | 'boss', profile: Profile): void {
  if (nodeId === 'boss') {
    run.floor++;
    run.stats.floors++;
    startCombat(run, run.map.bossId);
    return;
  }
  const node = run.map.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  if (!mapChoices(run).some((n) => n.id === nodeId)) return;
  run.map.cur = node.id;
  node.visited = true;
  run.floor++;
  run.stats.floors++;
  if (run.mode === 'tower') {
    run.towerFloor++;
    run.mods = computeMods(run, profile);
  }
  switch (node.type) {
    case 'battle':
      startCombat(run, pickEncounter(run, 'normal'));
      break;
    case 'elite':
      startCombat(run, pickEncounter(run, 'elite'));
      break;
    case 'boss':
      startCombat(run, run.map.bossId);
      break;
    case 'shop':
      run.shop = generateShop(run, profile);
      run.screen = 'shop';
      break;
    case 'rest':
      run.rest = { done: false };
      run.screen = 'rest';
      break;
    case 'treasure':
      openTreasureRoom(run);
      break;
    case 'event':
      startEvent(run, profile);
      break;
  }
}

function pickEncounter(run: RunState, tier: 'normal' | 'elite'): string {
  const rng = new Rng(run.rng.combat);
  const act = enemyAct(run);
  const battlesThisAct = run.fought.filter((id) => ENCOUNTERS[id]?.act === act && ENCOUNTERS[id]?.tier === 'normal').length;
  let pool = tier === 'normal' ? encountersFor(act, 'normal', battlesThisAct < 3 && run.mode !== 'tower') : encountersFor(act, 'elite');
  if (tier === 'normal' && run.mode === 'tower') pool = encountersFor(act, 'normal');
  const fresh = pool.filter((e) => !run.fought.slice(-6).includes(e.id));
  const chosen = rng.pick(fresh.length ? fresh : pool);
  return chosen.id;
}

/* ================================================================ combat */

const combatCache = new WeakMap<object, Combat>();

export function startCombat(run: RunState, encounterId: string): Combat {
  const rng = new Rng(run.rng.combat);
  run.combat = Combat.create(run, encounterId, rng.fork());
  run.fought.push(encounterId);
  run.screen = 'combat';
  const c = new Combat(run.combat, run);
  combatCache.set(run.combat, c);
  c.begin();
  for (const e of ENCOUNTERS[encounterId].enemies) if (!run.seenEnemies.includes(e.id)) run.seenEnemies.push(e.id);
  return c;
}

export function getCombat(run: RunState): Combat | null {
  if (!run.combat) return null;
  let c = combatCache.get(run.combat);
  if (!c) {
    c = new Combat(run.combat, run);
    combatCache.set(run.combat, c);
  }
  return c;
}

/** called by UI once combat phase is won/lost and animations are done */
export function finishCombat(run: RunState, profile: Profile): 'reward' | 'defeat' | 'victory' {
  const c = getCombat(run);
  if (!c) return 'reward';
  const won = c.s.phase === 'won';
  const tier = c.s.tier;
  run.hp = Math.max(0, c.hero.hp);
  for (const id of run.relics) RELICS[id]?.onCombatEnd?.(run, won, tier);
  run.hp = Math.min(run.hp, run.maxHp);
  const stolen = c.s.goldStolen - (c.s.flags.escapedGold ?? 0);
  const bonusGold = c.s.flags.bonusGold ?? 0;
  run.combat = null;
  if (!won) {
    run.screen = 'defeat';
    run.lastResult = 'lost';
    return 'defeat';
  }
  if (tier === 'elite') run.stats.elites++;
  if (tier === 'boss') run.stats.bosses++;
  const loot = new Rng(run.rng.loot);
  const rewards: RewardItem[] = [];
  const goldBase = tier === 'boss' ? loot.int(95, 110) : tier === 'elite' ? loot.int(28, 38) : loot.int(12, 20);
  const gold = Math.round(goldBase * run.mods.goldMult) + Math.max(0, stolen) + bonusGold;
  rewards.push({ kind: 'gold', n: gold });
  if (tier === 'elite') rewards.push({ kind: 'relic', relic: randomRelicId(run, loot, loot.weighted({ common: 50, uncommon: 35, rare: 15 })) ?? undefined });
  if (loot.chance(run.potionChance) || tier === 'elite') {
    rewards.push({ kind: 'potion', potion: randomPotionId(loot) });
    run.potionChance = Math.max(0.1, run.potionChance - 0.1);
  } else run.potionChance = Math.min(0.9, run.potionChance + 0.1);
  const n = cardChoiceCount(run, profile);
  const ch = rollCardChoices(run, tier, n);
  rewards.push({ kind: 'card', cards: ch.ids, cardsUp: ch.up });
  if (tier === 'boss') {
    const opts: string[] = [];
    for (let i = 0; i < 3; i++) {
      const id = randomRelicId(run, loot, 'boss');
      if (id && !opts.includes(id) && RELICS[id].rarity === 'boss') opts.push(id);
    }
    if (opts.length) rewards.push({ kind: 'bossRelic', relics: opts });
  }
  run.rewards = rewards.filter((r) => r.kind !== 'relic' || r.relic);
  run.screen = 'reward';
  return 'reward';
}

export function takeReward(run: RunState, idx: number, choice?: number | string): boolean {
  const r = run.rewards?.[idx];
  if (!r || r.taken) return false;
  switch (r.kind) {
    case 'gold':
      run.gold += r.n ?? 0;
      run.stats.goldEarned += r.n ?? 0;
      break;
    case 'relic':
      grantRelic(run, r.relic ?? null);
      break;
    case 'potion':
      if (!gainPotion(run, r.potion!)) return false;
      break;
    case 'card': {
      if (typeof choice !== 'number' || !r.cards?.[choice]) return false;
      addCardToDeck(run, r.cards[choice], r.cardsUp?.[choice]);
      break;
    }
    case 'bossRelic':
      if (typeof choice !== 'string' || !r.relics?.includes(choice)) return false;
      grantRelic(run, choice);
      break;
  }
  r.taken = true;
  return true;
}

export function rerollCardReward(run: RunState, idx: number, profile: Profile): boolean {
  const r = run.rewards?.[idx];
  if (!r || r.kind !== 'card' || r.taken) return false;
  if (run.rerolls >= perkLevel(profile, 'reroll')) return false;
  run.rerolls++;
  const ch = rollCardChoices(run, 'normal', r.cards!.length);
  r.cards = ch.ids;
  r.cardsUp = ch.up;
  return true;
}

/** leave the reward/shop/event/rest/treasure screen */
export function proceed(run: RunState, profile: Profile): void {
  const wasBoss = run.combat === null && run.rewards?.some((r) => r.kind === 'bossRelic');
  run.rewards = null;
  run.shop = null;
  run.event = null;
  run.treasure = null;
  run.rest = null;
  if (run.mode === 'tower') {
    const choices = mapChoices(run);
    if (!choices.length) {
      // new segment
      const rng = new Rng(run.rng.map);
      const start = run.towerFloor + 1;
      run.map = generateTowerSegment(rng, start, TOWER_SEGMENT, towerBoss(run, start + TOWER_SEGMENT - 1, rng));
      run.act = enemyAct(run);
      run.rerolls = 0;
    }
    if (wasBoss) run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.3));
    run.screen = 'map';
    return;
  }
  if (wasBoss) {
    if (run.act >= ACTS) {
      run.screen = 'victory';
      run.lastResult = 'won';
      return;
    }
    run.act++;
    run.rerolls = 0;
    run.hp = Math.min(run.maxHp, run.hp + Math.ceil((run.maxHp - run.hp) * 0.6));
    const rng = new Rng(run.rng.map);
    run.map = generateMap(rng, run.act, run.bossQueue[run.act - 1], run.mods.eliteWeight);
  }
  run.screen = 'map';
  void profile;
}

/* ================================================================ deck ops */

export function removeCard(run: RunState, uid: number): boolean {
  const i = run.deck.findIndex((c) => c.uid === uid);
  if (i < 0) return false;
  const [c] = run.deck.splice(i, 1);
  if (c.id === 'parasite') run.maxHp = Math.max(1, run.maxHp - 3);
  run.hp = Math.min(run.hp, run.maxHp);
  return true;
}

export function upgradeCard(run: RunState, uid: number): boolean {
  const c = run.deck.find((x) => x.uid === uid);
  if (!c || !canUpgrade(c.id, c.up)) return false;
  c.up = true;
  return true;
}

export function transformCard(run: RunState, uid: number): string | null {
  const i = run.deck.findIndex((c) => c.uid === uid);
  if (i < 0) return null;
  const old = run.deck[i];
  const rng = new Rng(run.rng.cards);
  const pool = CARD_LIST.filter((d) => d.pool === run.cls && d.rarity !== 'starter' && d.rarity !== 'special' && d.id !== old.id);
  const pick = rng.pick(pool);
  removeCard(run, uid);
  addCardToDeck(run, pick.id, old.up);
  return pick.id;
}

export function duplicateCard(run: RunState, uid: number): boolean {
  const c = run.deck.find((x) => x.uid === uid);
  if (!c) return false;
  addCardToDeck(run, c.id, c.up);
  return true;
}

export function upgradableCards(run: RunState): CardInst[] {
  return run.deck.filter((c) => canUpgrade(c.id, c.up));
}

/* ==================================================================== shop */

export function shopMult(run: RunState, profile?: Profile): number {
  let m = 1;
  for (const id of run.relics) m *= RELICS[id]?.shopMult ?? 1;
  if (profile) m *= 1 - 0.08 * perkLevel(profile, 'bargain');
  return m;
}

export function removalPrice(run: RunState, profile?: Profile): number {
  return Math.round((75 + 25 * run.removals) * shopMult(run, profile));
}

function generateShop(run: RunState, profile: Profile): ShopItem[] {
  const rng = new Rng(run.rng.shop);
  const mult = shopMult(run, profile);
  const price = (base: number, spread = 0.1) => Math.round(base * (1 + (rng.next() * 2 - 1) * spread) * mult);
  const items: ShopItem[] = [];
  const cardPrice: Record<string, number> = { common: 50, uncommon: 75, rare: 150 };
  const rarities: Rarity[] = ['common', 'common', 'uncommon', 'uncommon', 'rare'];
  const used = new Set<string>();
  for (const rarity of rarities) {
    const pool = classCards(run.cls, rarity).filter((d) => !used.has(d.id));
    if (!pool.length) continue;
    const d = rng.pick(pool);
    used.add(d.id);
    items.push({ kind: 'card', id: d.id, price: price(cardPrice[rarity]) });
  }
  for (const rarity of ['uncommon', 'rare'] as Rarity[]) {
    const pool = classCards('neutral', rarity);
    const d = rng.pick(pool);
    items.push({ kind: 'card', id: d.id, price: price(cardPrice[rarity] * 1.2) });
  }
  const sale = rng.int(0, 4);
  items[sale].sale = true;
  items[sale].price = Math.round(items[sale].price / 2);
  const relicPrice: Record<string, number> = { common: 150, uncommon: 240, rare: 300, shop: 180 };
  const relicRarities = [rng.weighted({ common: 50, uncommon: 35, rare: 15 }), rng.weighted({ common: 50, uncommon: 35, rare: 15 }), 'shop'];
  for (const rr of relicRarities) {
    const id = randomRelicId(run, rng, rr);
    if (id && !items.some((i) => i.id === id)) items.push({ kind: 'relic', id, price: price(relicPrice[RELICS[id].rarity] ?? 200) });
  }
  const potionPrice: Record<string, number> = { common: 50, uncommon: 75, rare: 100 };
  for (let i = 0; i < 3; i++) {
    const id = randomPotionId(rng);
    items.push({ kind: 'potion', id, price: price(potionPrice[POTIONS[id].rarity]) });
  }
  items.push({ kind: 'remove', price: removalPrice(run, profile) });
  return items;
}

export function buyItem(run: RunState, idx: number, removeUid?: number): boolean {
  const it = run.shop?.[idx];
  if (!it || it.sold || run.gold < it.price) return false;
  switch (it.kind) {
    case 'card':
      addCardToDeck(run, it.id!, it.up);
      break;
    case 'relic':
      grantRelic(run, it.id!);
      break;
    case 'potion':
      if (!gainPotion(run, it.id!)) return false;
      break;
    case 'remove':
      if (removeUid === undefined || !removeCard(run, removeUid)) return false;
      run.removals++;
      break;
  }
  run.gold -= it.price;
  it.sold = true;
  return true;
}

/* ==================================================================== rest */

export function restHealAmount(run: RunState, profile?: Profile): number {
  const bonus = profile ? 0.1 * perkLevel(profile, 'restMastery') : 0;
  return Math.floor(run.maxHp * (0.3 + bonus) * run.mods.restHeal);
}

export function canRestHeal(run: RunState): boolean {
  return !run.relics.includes('blackSun');
}

export function doRest(run: RunState, action: 'heal' | 'upgrade' | 'remove', profile: Profile, uid?: number): boolean {
  if (!run.rest || run.rest.done) return false;
  if (action === 'heal') {
    if (!canRestHeal(run)) return false;
    run.hp = Math.min(run.maxHp, run.hp + restHealAmount(run, profile));
    for (const id of run.relics) RELICS[id]?.onRest?.(run);
  } else if (action === 'upgrade') {
    if (uid === undefined || !upgradeCard(run, uid)) return false;
  } else if (action === 'remove') {
    if (!run.relics.includes('pickaxe') || uid === undefined || !removeCard(run, uid)) return false;
  }
  run.rest.done = true;
  return true;
}

/* ================================================================ treasure */

function openTreasureRoom(run: RunState): void {
  const rng = new Rng(run.rng.loot);
  const rarity = rng.weighted({ common: 50, uncommon: 35, rare: 15 });
  const relic = randomRelicId(run, rng, rarity) ?? '';
  run.treasure = { relic, gold: rng.int(20, 40) + 10 * (enemyAct(run) - 1), opened: false };
  run.screen = 'treasure';
}

export function openChest(run: RunState): void {
  if (!run.treasure || run.treasure.opened) return;
  run.treasure.opened = true;
  run.gold += run.treasure.gold;
  run.stats.goldEarned += run.treasure.gold;
  grantRelic(run, run.treasure.relic || null);
}

/* =================================================================== event */

export interface EventSelect {
  kind: 'remove' | 'upgrade' | 'transform' | 'duplicate';
  after: string;
}

function eventApi(run: RunState): EventApi {
  const rng = new Rng(run.rng.event);
  const ev = run.event!;
  const api: EventApi = {
    run,
    rng,
    vars: ev.vars,
    gold: (n) => {
      run.gold = Math.max(0, run.gold + n);
      if (n > 0) run.stats.goldEarned += n;
    },
    heal: (n) => {
      run.hp = Math.min(run.maxHp, run.hp + n);
    },
    damage: (n) => {
      run.hp = Math.max(1, run.hp - n);
      run.stats.damageTaken += n;
    },
    maxHp: (n) => {
      run.maxHp = Math.max(1, run.maxHp + n);
      run.hp = Math.min(run.maxHp, Math.max(1, run.hp + Math.max(0, n)));
    },
    addCard: (id, up) => void addCardToDeck(run, id, up),
    curse: (id) => void addCardToDeck(run, id ?? rng.pick(['regret', 'doubt', 'shackles', 'burden', 'rot'])),
    relic: (rarity) => {
      const id = RELICS[rarity] ? rarity : randomRelicId(run, rng, rarity);
      grantRelic(run, id);
      if (id) ev.vars['gotRelic'] = id;
      return id;
    },
    potion: (id) => gainPotion(run, id ?? randomPotionId(rng)),
    loseRandomPotion: () => {
      const idx = run.potions.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return false;
      run.potions[rng.pick(idx)] = null;
      return true;
    },
    upgradeRandom: (n) => {
      const pool = upgradableCards(run);
      for (const c of rng.sample(pool, n)) c.up = true;
    },
    select: (kind, after) => {
      (ev.vars as Record<string, unknown>).__select = kind;
      ev.vars.__after = after;
    },
    cardReward: (rareBoost) => {
      const ch = rollCardChoices(run, 'normal', 3, rareBoost);
      run.rewards = [{ kind: 'card', cards: ch.ids, cardsUp: ch.up }];
      ev.vars.__reward = 1;
    },
    fight: (tier, bonusGold) => {
      ev.vars.__fight = tier;
      ev.vars.__bonus = bonusGold ?? 0;
    },
  };
  return api;
}

export function startEvent(run: RunState, profile: Profile): void {
  const rng = new Rng(run.rng.event);
  const act = enemyAct(run);
  const seen = run.relicCounters as Record<string, number>;
  const pool = EVENT_LIST.filter((e) => e.acts.includes(act) && !seen['ev_' + e.id]);
  // occasionally an "event" room is a surprise fight, shop or treasure
  const roll = rng.next();
  if (roll < 0.12) {
    run.relicCounters['surprise'] = 1;
    startCombat(run, pickEncounter(run, 'normal'));
    return;
  }
  if (roll < 0.18) {
    openTreasureRoom(run);
    return;
  }
  const ev = rng.pick(pool.length ? pool : EVENT_LIST);
  seen['ev_' + ev.id] = 1;
  run.event = { id: ev.id, page: 'start', vars: {} };
  run.screen = 'event';
  for (const id of run.relics) RELICS[id]?.onEnterEvent?.(run);
  ev.setup?.(eventApi(run));
  void profile;
}

/** returns the pending deck selection, if any */
export function eventPendingSelect(run: RunState): EventSelect | null {
  const v = run.event?.vars;
  if (!v || !v.__select) return null;
  return { kind: v.__select as EventSelect['kind'], after: String(v.__after) };
}

export function eventChoose(run: RunState, optionIdx: number, profile: Profile): 'page' | 'leave' | 'fight' | 'select' | 'reward' {
  const ev = run.event;
  if (!ev) return 'leave';
  const def = EVENTS[ev.id];
  const page = def.pages[ev.page];
  const opt = page?.options[optionIdx];
  if (!opt) return 'page';
  const api = eventApi(run);
  if (opt.cond && !opt.cond(api)) return 'page';
  const next = opt.go(api);
  if (ev.vars.__fight) {
    const tier = ev.vars.__fight as 'normal' | 'elite';
    const bonus = Number(ev.vars.__bonus ?? 0);
    run.event = null;
    const c = startCombat(run, pickEncounter(run, tier));
    c.s.flags.bonusGold = bonus;
    return 'fight';
  }
  if (next) ev.page = next;
  else {
    proceed(run, profile);
    return 'leave';
  }
  if (ev.vars.__select) return 'select';
  if (ev.vars.__reward) return 'reward';
  return 'page';
}

export function eventResolveSelect(run: RunState, uid: number | null): void {
  const ev = run.event;
  if (!ev) return;
  const kind = ev.vars.__select as EventSelect['kind'] | undefined;
  if (uid !== null && kind) {
    if (kind === 'remove') removeCard(run, uid);
    if (kind === 'upgrade') upgradeCard(run, uid);
    if (kind === 'transform') transformCard(run, uid);
    if (kind === 'duplicate') duplicateCard(run, uid);
  }
  delete ev.vars.__select;
  delete ev.vars.__after;
}

export function eventTakeCard(run: RunState, choice: number | null): void {
  const r = run.rewards?.[0];
  if (r && choice !== null && r.cards?.[choice]) addCardToDeck(run, r.cards[choice], r.cardsUp?.[choice]);
  run.rewards = null;
  if (run.event) delete run.event.vars.__reward;
}

/* ============================================================== potions (map) */

export function usePotionOnMap(run: RunState, slot: number): boolean {
  const id = run.potions[slot];
  if (!id) return false;
  if (id === 'healing') {
    const mult = run.relics.includes('alchemistFlask') ? 1.5 : 1;
    run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.25 * mult));
    run.potions[slot] = null;
    return true;
  }
  return false;
}

export function discardPotion(run: RunState, slot: number): void {
  run.potions[slot] = null;
}

/* ============================================================== end of run */

export interface RunResult {
  score: number;
  shards: number;
  achievements: AchievementDef[];
  newBest: boolean;
}

export function runScore(run: RunState): number {
  const s = run.stats;
  let score = s.floors * 5 + s.kills * 2 + s.elites * 20 + s.bosses * 60 + Math.floor(run.gold / 10);
  if (run.lastResult === 'won') score += 250 + run.hellLevel * 60;
  if (run.mode === 'tower') score = run.towerFloor * 25 + s.kills * 2 + s.elites * 15 + s.bosses * 50;
  return Math.max(0, score);
}

export function endRun(run: RunState, profile: Profile, result: 'won' | 'lost' | 'abandoned'): RunResult {
  run.lastResult = result;
  const score = runScore(run);
  const s = run.stats;
  let shards = Math.floor(s.floors * 2 + s.elites * 6 + s.bosses * 20 + (result === 'won' ? 60 : 0));
  if (run.mode === 'hell') shards = Math.floor(shards * (1 + run.hellLevel * 0.15));
  if (run.mode === 'tower') shards = Math.floor(run.towerFloor * 3 + s.bosses * 15);
  if (result === 'abandoned') shards = Math.floor(shards / 2);
  run.score = score;
  run.shards = shards;
  profile.shards += shards;
  profile.totalShards += shards;
  const ps = profile.stats;
  ps.runs++;
  if (result === 'won') {
    ps.wins++;
    profile.classWins[run.cls] = (profile.classWins[run.cls] ?? 0) + 1;
    if (run.mode === 'hell' || run.mode === 'classic') profile.hellMax = Math.max(profile.hellMax, run.mode === 'hell' ? run.hellLevel : 0);
  }
  ps.kills += s.kills;
  ps.elites += s.elites;
  ps.bosses += s.bosses;
  ps.cardsPlayed += s.cardsPlayed;
  ps.maxHit = Math.max(ps.maxHit, s.maxHit);
  ps.playTime += Math.floor((Date.now() - run.startedAt) / 1000);
  if (run.mode === 'tower') ps.bestTower = Math.max(ps.bestTower, run.towerFloor);
  const newBest = score > ps.bestScore;
  ps.bestScore = Math.max(ps.bestScore, score);
  if (run.weekly) profile.weeklyBest[run.weekly.week] = Math.max(profile.weeklyBest[run.weekly.week] ?? 0, score);
  for (const id of run.seenCards) if (!profile.seenCards.includes(id)) profile.seenCards.push(id);
  for (const id of run.seenEnemies) if (!profile.seenEnemies.includes(id)) profile.seenEnemies.push(id);
  for (const id of run.relics) if (!profile.seenRelics.includes(id)) profile.seenRelics.push(id);
  const achievements = checkAchievements(profile, run);
  const lastEnemy = run.fought[run.fought.length - 1];
  profile.history.unshift({
    cls: run.cls,
    mode: run.mode,
    hell: run.hellLevel,
    result,
    score,
    floor: run.mode === 'tower' ? run.towerFloor : run.floor,
    act: run.act,
    date: Date.now(),
    killedBy: result === 'lost' && lastEnemy ? ENCOUNTERS[lastEnemy]?.enemies.map((e) => e.id).find((id) => ENEMIES[id]?.tier !== 'minion') : undefined,
  });
  profile.history = profile.history.slice(0, 30);
  saveProfile(profile);
  saveRun(null);
  return { score, shards, achievements, newBest };
}

/* convenience for UI */
export function cardTypeOf(id: string) {
  return cardSpec(id, false).type;
}
export { CARDS };
