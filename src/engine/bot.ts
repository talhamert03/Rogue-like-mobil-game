/**
 * A simple heuristic player used for automated testing and balance simulation.
 * It only uses the public engine API, exactly like the UI does.
 */
import type { Combat } from './combat';
import type { CardInst, Unit } from './types';
import type { RunState } from './runTypes';
import type { Profile } from './meta';
import {
  buyItem,
  doRest,
  enterNode,
  eventChoose,
  eventPendingSelect,
  eventResolveSelect,
  eventTakeCard,
  finishCombat,
  getCombat,
  mapChoices,
  canFightBoss,
  openChest,
  proceed,
  takeReward,
  upgradableCards,
  canRestHeal,
} from './run';
import { EVENTS } from '../data/events';
import { CARDS } from '../data/cards';

function incoming(c: Combat): number {
  let total = 0;
  const hero = c.hero;
  for (const e of c.enemies()) {
    const it = e.intent;
    if (!it || it.dmg === undefined) continue;
    const per = c.calcAttack(e, hero, it.dmg) * (it.times ?? 1);
    if (it.kind === 'area') {
      if (it.tiles?.includes(hero.pos)) total += per;
    } else if (it.kind === 'attack' || it.kind === 'charge') {
      const reach = (it.range ?? 1) + (it.kind === 'attack' ? speedOf(c, e) : 0);
      if (c.dist(e, hero) <= reach) total += per;
    }
  }
  return total;
}

function speedOf(c: Combat, e: Unit): number {
  void c;
  return e.intent?.kind === 'charge' ? 0 : 1;
}

function scoreCard(c: Combat, card: CardInst, need: number): number {
  const sp = c.specOf(card);
  let s = 0;
  if (sp.type === 'power') s += 50;
  for (const e of sp.effects) {
    if (e.k === 'dmg') s += 10 + (typeof e.n === 'number' ? e.n : 6) * (typeof e.times === 'number' ? e.times : 1) * (e.to === 'all' || e.to === 'near' || e.to === 'area' ? 1.8 : 1);
    if (e.k === 'block') s += need > 0 ? 12 + (typeof e.n === 'number' ? e.n : 6) : 1;
    if (e.k === 'status') s += 8;
    if (e.k === 'draw' || e.k === 'energy') s += 20;
    if (e.k === 'summon' || e.k === 'trap' || e.k === 'bomb') s += 14;
    if (e.k === 'heal') s += c.hero.hp < c.hero.maxHp * 0.7 ? 15 : 0;
    if (e.k === 'custom') s += 12;
  }
  const cost = c.costOf(card);
  return s / Math.max(0.6, cost < 0 ? c.s.energy : cost);
}

function pickTarget(c: Combat, card: CardInst): { uid?: number; tile?: number } | null {
  const sp = c.specOf(card);
  const vt = c.validTargets(card);
  if (sp.target === 'none') return {};
  if (sp.target === 'enemy') {
    const units = vt.units.map((u) => c.unit(u)!).filter(Boolean);
    if (!units.length) return null;
    units.sort((a, b) => a.hp + a.block - (b.hp + b.block));
    return { uid: units[0].uid };
  }
  if (sp.target === 'ally') {
    const u = vt.units[0];
    return u === undefined ? null : { uid: u };
  }
  if (!vt.tiles.length) return null;
  if (sp.target === 'tile') {
    // tile with most enemies around
    let best = vt.tiles[0];
    let bs = -1;
    for (const t of vt.tiles) {
      const n = c.enemies().filter((e) => Math.abs(e.pos - t) <= 1).length;
      const selfHit = Math.abs(c.hero.pos - t) <= 1 ? 1 : 0;
      if (n - selfHit > bs) {
        bs = n - selfHit;
        best = t;
      }
    }
    return bs > 0 ? { tile: best } : null;
  }
  if (sp.target === 'empty') {
    // closest empty tile to nearest enemy
    const f = c.nearestFoe(c.hero);
    const sorted = vt.tiles.slice().sort((a, b) => Math.abs(a - (f?.pos ?? 7)) - Math.abs(b - (f?.pos ?? 7)));
    return { tile: sorted[0] };
  }
  return { tile: vt.tiles[0] };
}

function wantsMelee(c: Combat): boolean {
  return c.s.hand.some((card) => {
    const sp = c.specOf(card);
    return sp.type === 'attack' && sp.target === 'enemy' && (sp.range ?? 1) <= 1;
  });
}

function botMove(c: Combat): void {
  const hero = c.hero;
  const tiles = c.heroMoveTiles();
  if (!tiles.length) return;
  // escape telegraphed areas
  const danger = new Set<number>();
  for (const e of c.enemies()) if (e.intent?.kind === 'area') for (const t of e.intent.tiles ?? []) danger.add(t);
  if (danger.has(hero.pos)) {
    const safe = tiles.filter((t) => !danger.has(t));
    if (safe.length) {
      safe.sort((a, b) => Math.abs(a - hero.pos) - Math.abs(b - hero.pos));
      c.moveHero(safe[0]);
      return;
    }
  }
  const f = c.nearestFoe(hero);
  if (!f) return;
  if (wantsMelee(c) && c.dist(hero, f) > 1) {
    const closer = tiles.filter((t) => Math.abs(t - f.pos) < c.dist(hero, f) && !danger.has(t));
    closer.sort((a, b) => Math.abs(a - f.pos) - Math.abs(b - f.pos));
    if (closer.length) c.moveHero(closer[0]);
  }
}

export function botPlayTurn(c: Combat): void {
  let guard = 0;
  botMove(c);
  while (!c.over && c.s.phase === 'player' && guard++ < 40) {
    const need = incoming(c) - c.hero.block;
    const playable = c.s.hand.filter((card) => c.canPlay(card).ok);
    if (!playable.length) break;
    playable.sort((a, b) => scoreCard(c, b, need) - scoreCard(c, a, need));
    let played = false;
    for (const card of playable) {
      const t = pickTarget(c, card);
      if (!t) continue;
      if (c.playCard(card.uid, t)) {
        played = true;
        break;
      }
    }
    if (!played) break;
    if (!c.over && c.s.mp > 0) botMove(c);
  }
  // use a potion when in danger
  if (!c.over && c.s.phase === 'player' && c.hero.hp < c.hero.maxHp * 0.35) {
    const slot = c.run.potions.findIndex((p) => p && p !== 'fairy');
    if (slot >= 0) {
      const tgt = c.enemies()[0];
      c.usePotion(slot, tgt?.uid);
    }
  }
  if (!c.over) c.endTurn();
}

export function botFightCombat(c: Combat, maxTurns = 60): 'won' | 'lost' | 'timeout' {
  for (let i = 0; i < maxTurns && !c.over; i++) {
    botPlayTurn(c);
    c.flush();
  }
  return c.s.phase === 'won' ? 'won' : c.s.phase === 'lost' ? 'lost' : 'timeout';
}

/** plays a full run; returns the final state */
export function botPlayRun(run: RunState, profile: Profile, maxSteps = 2000): RunState {
  for (let step = 0; step < maxSteps; step++) {
    switch (run.screen) {
      case 'map': {
        if (canFightBoss(run)) {
          enterNode(run, 'boss', profile);
          break;
        }
        const ch = mapChoices(run);
        if (!ch.length) return run;
        const pref = (t: string) =>
          t === 'rest' && run.hp < run.maxHp * 0.6 ? 0 : t === 'battle' ? 1 : t === 'treasure' ? 1 : t === 'event' ? 2 : t === 'shop' ? 3 : t === 'elite' ? (run.hp > run.maxHp * 0.7 ? 1 : 5) : 4;
        ch.sort((a, b) => pref(a.type) - pref(b.type));
        enterNode(run, ch[0].id, profile);
        break;
      }
      case 'combat': {
        const c = getCombat(run)!;
        const r = botFightCombat(c);
        if (r === 'timeout') {
          c.s.phase = 'lost';
        }
        finishCombat(run, profile);
        break;
      }
      case 'reward': {
        const rw = run.rewards ?? [];
        rw.forEach((r, i) => {
          if (r.kind === 'card') {
            // prefer non-starter, rarer cards
            const order = r.cards!.map((id, j) => ({ j, s: { rare: 3, uncommon: 2, common: 1 }[CARDS[id].rarity as 'rare'] ?? 0 }));
            order.sort((a, b) => b.s - a.s);
            if (run.deck.length < 22) takeReward(run, i, order[0].j);
          } else if (r.kind === 'bossRelic') takeReward(run, i, r.relics![0]);
          else takeReward(run, i);
        });
        proceed(run, profile);
        break;
      }
      case 'shop': {
        const items = run.shop ?? [];
        const rm = items.findIndex((it) => it.kind === 'remove');
        const starter = run.deck.find((c) => CARDS[c.id].pool === 'curse') ?? run.deck.find((c) => CARDS[c.id].rarity === 'starter' && !c.up);
        if (rm >= 0 && starter) buyItem(run, rm, starter.uid);
        items.forEach((it, i) => {
          if (it.kind === 'relic' && run.gold >= it.price) buyItem(run, i);
        });
        proceed(run, profile);
        break;
      }
      case 'rest': {
        if (run.hp < run.maxHp * 0.55 && canRestHeal(run)) doRest(run, 'heal', profile);
        else {
          const up = upgradableCards(run);
          if (up.length) doRest(run, 'upgrade', profile, up[0].uid);
          else doRest(run, 'heal', profile);
        }
        proceed(run, profile);
        break;
      }
      case 'treasure':
        openChest(run);
        proceed(run, profile);
        break;
      case 'event': {
        const ev = run.event!;
        const def = EVENTS[ev.id];
        const page = def.pages[ev.page];
        const sel = eventPendingSelect(run);
        if (sel) {
          eventResolveSelect(run, run.deck[0]?.uid ?? null);
          break;
        }
        if (run.rewards && ev.vars.__reward) {
          eventTakeCard(run, 0);
          break;
        }
        // pick the first available option that is not "leave" unless hp is low
        let idx = page.options.length - 1;
        for (let i = 0; i < page.options.length; i++) {
          const o = page.options[i];
          if (o.cond) {
            const ok = (() => {
              try {
                return o.cond!({ run } as never);
              } catch {
                return false;
              }
            })();
            if (!ok) continue;
          }
          idx = i;
          break;
        }
        eventChoose(run, idx, profile);
        break;
      }
      case 'victory':
      case 'defeat':
        return run;
      default:
        return run;
    }
  }
  return run;
}
