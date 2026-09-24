import { Rng } from '../core/rng';
import { L, type LStr } from '../i18n/i18n';
import type {
  AiCtx,
  CardInst,
  CardSpec,
  CEvent,
  CombatState,
  Effect,
  EnemyMove,
  Intent,
  Num,
  Sel,
  TileFx,
  Unit,
} from './types';
import type { RunState } from './runTypes';
import { cardSpec, CARDS } from '../data/cards';
import { ENEMIES } from '../data/enemies';
import { ALLIES } from '../data/allies';
import { RELICS, relicPassive } from '../data/relics';
import { CLASSES } from '../data/classes';
import { ENCOUNTERS } from '../data/encounters';
import { POTIONS } from '../data/potions';
import { DEBUFFS, DURATION_STATUSES } from '../data/statuses';

export const LANE = 8;
export const RUNES = ['runeFire', 'runeFrost', 'runeStorm'];
export const FORMS = ['bearForm', 'wolfForm', 'owlForm'];
export const HAND_MAX = 10;
const COLLIDE_DMG = 4;
const MAX_ENEMIES = 6;

export interface Target {
  uid?: number;
  tile?: number;
}

interface Ctx {
  src: Unit;
  card?: CardInst;
  spec?: CardSpec;
  tgt?: Unit;
  tile?: number;
  x: number;
  killed: boolean;
  lastUnblocked: number;
}

export interface PlayCheck {
  ok: boolean;
  reason?: LStr;
}

const TXT = {
  miss: L('Iska!', 'Miss!'),
  dodge: L('Kaçındı!', 'Dodged!'),
  stunned: L('Sersem!', 'Stunned!'),
  outOfReach: L('Ulaşamadı', 'Out of reach'),
  blocked: L('Engellendi', 'Negated'),
  noRoom: L('Yer yok!', 'No room!'),
  escaped: L('Kaçtı!', 'Escaped!'),
  immovable: L('Sarsılmaz', 'Immovable'),
  revive: L('Yeniden doğdu!', 'Revived!'),
  rooted: L('Sabitlendi', 'Rooted'),
  steal: L('-{n} Altın', '-{n} Gold'),
  trap: L('Tuzak!', 'Trap!'),
  boom: L('BOOM!', 'BOOM!'),
  collide: L('Çarpışma!', 'Collision!'),
};

export class Combat {
  s: CombatState;
  run: RunState;
  rng: Rng;
  events: CEvent[] = [];

  constructor(state: CombatState, run: RunState) {
    this.s = state;
    this.run = run;
    this.rng = new Rng(state.rng);
  }

  /* ================================================================ setup */

  static create(run: RunState, encounterId: string, rngSeed: number): CombatState {
    const enc = ENCOUNTERS[encounterId];
    if (!enc) throw new Error('unknown encounter ' + encounterId);
    const rng = Rng.fromSeed(rngSeed);
    const s: CombatState = {
      lane: LANE,
      units: [],
      heroUid: 1,
      tiles: [],
      hand: [],
      draw: [],
      discard: [],
      exhaust: [],
      energy: 0,
      mp: 0,
      turn: 0,
      phase: 'player',
      nextUid: 2,
      rng: rng.state,
      cardsThisTurn: 0,
      attacksThisTurn: 0,
      cardsThisCombat: 0,
      hpLostThisCombat: 0,
      shuffles: 0,
      encounter: encounterId,
      tier: enc.tier,
      flags: {},
      goldStolen: 0,
      escaped: [],
    };
    s.units.push({
      uid: 1,
      def: 'hero:' + run.cls,
      side: 'hero',
      hp: run.hp,
      maxHp: run.maxHp,
      block: 0,
      pos: enc.heroPos ?? 1,
      st: {},
      alive: true,
    });
    for (const e of enc.enemies) {
      const def = ENEMIES[e.id];
      let hp = rng.int(def.hp[0], def.hp[1]);
      hp = Math.round(hp * run.mods.enemyHp * (def.tier === 'elite' ? run.mods.eliteHp : def.tier === 'boss' ? run.mods.bossHp : 1));
      s.units.push({
        uid: s.nextUid++,
        def: e.id,
        side: 'enemy',
        hp,
        maxHp: hp,
        block: 0,
        pos: e.pos,
        st: { ...(def.start ?? {}) },
        alive: true,
        hist: [],
        mem: {},
      });
    }
    const deck = run.deck.map((c) => ({ uid: c.uid, id: c.id, up: c.up }));
    rng.shuffle(deck);
    const innate = deck.filter((c) => cardSpec(c.id, c.up).innate);
    const rest = deck.filter((c) => !cardSpec(c.id, c.up).innate);
    // draw pile: last element is the top of the pile
    s.draw = [...rest, ...innate];
    return s;
  }

  /** Called once after create(). */
  begin(): void {
    const hero = this.hero;
    this.relicHook('onCombatStart');
    for (const e of this.enemies()) this.chooseIntent(e);
    this.startPlayerTurn();
    void hero;
  }

  /* ============================================================== helpers */

  get hero(): Unit {
    return this.s.units.find((u) => u.uid === this.s.heroUid)!;
  }
  get cls() {
    return CLASSES[this.run.cls];
  }
  unit(uid: number | undefined): Unit | undefined {
    if (uid === undefined) return undefined;
    return this.s.units.find((u) => u.uid === uid && u.alive);
  }
  enemies(): Unit[] {
    return this.s.units.filter((u) => u.alive && u.side === 'enemy');
  }
  allies(): Unit[] {
    return this.s.units.filter((u) => u.alive && u.side === 'ally');
  }
  foesOf(u: Unit): Unit[] {
    return u.side === 'enemy'
      ? this.s.units.filter((x) => x.alive && x.side !== 'enemy')
      : this.enemies();
  }
  unitAt(pos: number): Unit | undefined {
    return this.s.units.find((u) => u.alive && u.pos === pos);
  }
  inLane(pos: number): boolean {
    return pos >= 0 && pos < this.s.lane;
  }
  isFree(pos: number): boolean {
    return this.inLane(pos) && !this.unitAt(pos);
  }
  dist(a: Unit, b: Unit): number {
    return Math.abs(a.pos - b.pos);
  }
  st(u: Unit, s: string): number {
    return u.st[s] ?? 0;
  }
  emit(e: CEvent): void {
    this.events.push(e);
  }
  flush(): CEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
  hasRelic(id: string): boolean {
    return this.run.relics.includes(id);
  }
  private relicHook(name: 'onCombatStart' | 'onTurnStart' | 'onTurnEnd' | 'onShuffle'): void {
    for (const id of this.run.relics) {
      const r = RELICS[id];
      const f = r?.[name];
      if (f) f(this);
    }
  }
  relicFlash(id: string): void {
    this.emit({ t: 'relic', id });
  }
  nearestFoe(u: Unit): Unit | undefined {
    let best: Unit | undefined;
    let bd = 99;
    for (const f of this.foesOf(u)) {
      const d = this.dist(u, f);
      if (d < bd || (d === bd && f.side === 'hero')) {
        best = f;
        bd = d;
      }
    }
    return best;
  }
  /** direction from hero towards enemies (defaults to +1) */
  heroFacing(): number {
    const e = this.nearestFoe(this.hero);
    if (!e) return 1;
    return Math.sign(e.pos - this.hero.pos) || 1;
  }

  /* =========================================================== card costs */

  specOf(c: CardInst): CardSpec {
    return cardSpec(c.id, c.up);
  }
  costOf(c: CardInst): number {
    const sp = this.specOf(c);
    if (sp.cost < 0) return -1;
    let cost = c.tc ?? c.cc ?? sp.cost;
    if (this.hasRelic('timeWheel') && !this.s.flags.timeWheel && sp.cost >= 2) cost = 0;
    return Math.max(0, cost);
  }

  canPlay(c: CardInst): PlayCheck {
    if (this.s.phase !== 'player') return { ok: false };
    const sp = this.specOf(c);
    if (sp.unplayable) return { ok: false, reason: L('Oynanamaz', 'Unplayable') };
    const cost = this.costOf(c);
    if (cost > this.s.energy) return { ok: false, reason: L('Yetersiz enerji', 'Not enough energy') };
    if (sp.soulCost && this.st(this.hero, 'souls') < sp.soulCost)
      return { ok: false, reason: L('Yetersiz Ruh', 'Not enough Souls') };
    if (sp.kiCost && this.st(this.hero, 'ki') < sp.kiCost) return { ok: false, reason: L('Yetersiz Ki', 'Not enough Ki') };
    if (sp.hpCost && this.hero.hp <= sp.hpCost) return { ok: false, reason: L('Yetersiz can', 'Not enough HP') };
    if (sp.goldCost && this.run.gold < sp.goldCost) return { ok: false, reason: L('Yetersiz altın', 'Not enough gold') };
    if (sp.target !== 'none') {
      const vt = this.validTargets(c);
      if (vt.units.length === 0 && vt.tiles.length === 0)
        return { ok: false, reason: sp.target === 'enemy' ? L('Menzilde hedef yok', 'No target in range') : L('Geçerli hedef yok', 'No valid target') };
    }
    return { ok: true };
  }

  validTargets(c: CardInst): { units: number[]; tiles: number[] } {
    const sp = this.specOf(c);
    const hero = this.hero;
    const range = sp.range ?? 1;
    const units: number[] = [];
    const tiles: number[] = [];
    switch (sp.target) {
      case 'enemy':
        for (const e of this.enemies()) if (this.dist(hero, e) <= range) units.push(e.uid);
        break;
      case 'ally':
        for (const a of this.allies()) if (this.dist(hero, a) <= range) units.push(a.uid);
        break;
      case 'tile':
        for (let p = 0; p < this.s.lane; p++) if (p !== hero.pos && Math.abs(p - hero.pos) <= range) tiles.push(p);
        break;
      case 'empty':
        for (let p = 0; p < this.s.lane; p++) if (this.isFree(p) && Math.abs(p - hero.pos) <= range) tiles.push(p);
        break;
      case 'move':
        if (!this.st(hero, 'root')) tiles.push(...this.walkable(hero, range));
        break;
      default:
        break;
    }
    return { units, tiles };
  }

  /** tiles reachable by walking up to n steps without passing through units */
  walkable(u: Unit, n: number): number[] {
    const out: number[] = [];
    for (const dir of [-1, 1]) {
      for (let i = 1; i <= n; i++) {
        const p = u.pos + dir * i;
        if (!this.isFree(p)) break;
        out.push(p);
      }
    }
    return out.sort((a, b) => a - b);
  }

  heroMoveTiles(): number[] {
    if (this.s.phase !== 'player' || this.st(this.hero, 'root')) return [];
    return this.walkable(this.hero, this.s.mp);
  }

  /* ============================================================ numbers */

  evalNum(n: Num, ctx: Ctx): number {
    if (typeof n === 'number') return n;
    const m = n.m ?? 1;
    let src = 0;
    const hero = this.hero;
    switch (n.per) {
      case 'x':
        src = ctx.x;
        break;
      case 'block':
        src = hero.block;
        break;
      case 'ki':
        src = this.st(hero, 'ki');
        break;
      case 'souls':
        src = this.st(hero, 'souls');
        break;
      case 'radiance':
        src = this.st(hero, 'radiance');
        break;
      case 'targetPoison':
        src = ctx.tgt ? this.st(ctx.tgt, 'poison') : 0;
        break;
      case 'targetMark':
        src = ctx.tgt ? this.st(ctx.tgt, 'mark') : 0;
        break;
      case 'handSize':
        src = this.s.hand.length;
        break;
      case 'allies':
        src = this.allies().length;
        break;
      case 'exhausted':
        src = this.s.exhaust.length;
        break;
      case 'missingHp':
        src = hero.maxHp - hero.hp;
        break;
      case 'runes':
        src = this.runeCount();
        break;
      case 'fury':
        src = this.st(hero, 'fury');
        break;
      case 'gold':
        src = this.run.gold;
        break;
      case 'targetDoom':
        src = ctx.tgt ? this.st(ctx.tgt, 'doom') : 0;
        break;
      default:
        break;
    }
    return Math.floor(n.b + m * src);
  }

  enemyDmgMult(): number {
    return this.run.mods.enemyDmg;
  }

  /** final attack damage (before block) */
  calcAttack(src: Unit | null, tgt: Unit, base: number, holy = false): number {
    let d = base;
    if (src) {
      d += this.st(src, 'strength');
      if (holy) d += this.st(src, 'radiance');
      if (src.side === 'hero') {
        const ss = this.st(src, 'sharpshooter');
        if (ss && this.dist(src, tgt) >= 3) d += ss;
        d += this.formAttackBonus(src);
        d += this.st(src, 'runeFire') * (1 + this.st(src, 'runeAmp'));
        for (const id of this.run.relics) {
          const r = RELICS[id];
          if (r?.atkMod) d = r.atkMod(this, src, tgt, d);
        }
      }
      if (this.st(src, 'weak')) d *= src.side === 'enemy' && this.hasRelic('witchEye') ? 0.6 : 0.75;
    }
    d += this.st(tgt, 'mark');
    if (this.st(tgt, 'vulnerable')) d *= tgt.side !== 'hero' && this.hasRelic('cruelHook') ? 1.75 : 1.5;
    return Math.max(0, Math.floor(d));
  }

  /** what the hero would deal with a given base damage (for card text) */
  heroPreview(base: number, holy: boolean, tgt?: Unit): number {
    const hero = this.hero;
    if (tgt) return this.calcAttack(hero, tgt, base, holy);
    let d = base + this.st(hero, 'strength') + (holy ? this.st(hero, 'radiance') : 0) + this.formAttackBonus(hero) + this.st(hero, 'runeFire') * (1 + this.st(hero, 'runeAmp'));
    if (this.st(hero, 'weak')) d *= 0.75;
    return Math.max(0, Math.floor(d));
  }

  heroBlockPreview(base: number): number {
    let b = base + this.st(this.hero, 'dexterity');
    if (this.st(this.hero, 'frail')) b *= 0.75;
    return Math.max(0, Math.floor(b));
  }

  /** damage shown on an enemy intent (per hit) */
  intentDamage(e: Unit): number {
    const it = e.intent;
    if (!it || it.dmg === undefined) return 0;
    const tgt = this.nearestFoe(e) ?? this.hero;
    return this.calcAttack(e, tgt.side === 'hero' ? tgt : this.hero, it.dmg);
  }

  /* ======================================================== core actions */

  dealDamage(
    src: Unit | null,
    tgt: Unit,
    amount: number,
    opt: { attack?: boolean; pierce?: boolean; fx?: string; melee?: boolean } = {},
  ): number {
    if (!tgt.alive || this.s.phase === 'won' || this.s.phase === 'lost') return 0;
    if (opt.attack && this.st(tgt, 'dodge') > 0) {
      tgt.st.dodge--;
      if (!tgt.st.dodge) delete tgt.st.dodge;
      this.emit({ t: 'miss', uid: tgt.uid });
      this.emit({ t: 'status', uid: tgt.uid, s: 'dodge', delta: -1, total: this.st(tgt, 'dodge') });
      return 0;
    }
    if (src?.side === 'hero' && opt.attack && this.hasRelic('shadowSeal') && !this.s.flags.shadowSeal) {
      this.s.flags.shadowSeal = 1;
      amount *= 2;
      this.relicFlash('shadowSeal');
    }
    let blocked = 0;
    if (!opt.pierce) {
      blocked = Math.min(tgt.block, amount);
      tgt.block -= blocked;
    }
    let loss = amount - blocked;
    if (tgt.side === 'hero' && loss > 0 && opt.attack && this.hasRelic('ironBand') && this.s.flags.ironBandTurn !== this.s.turn) {
      this.s.flags.ironBandTurn = this.s.turn;
      loss = Math.max(0, loss - 3);
      this.relicFlash('ironBand');
    }
    loss = Math.min(loss, tgt.hp);
    tgt.hp -= loss;
    this.emit({ t: 'dmg', uid: tgt.uid, amount: loss, blocked, hp: tgt.hp, block: tgt.block, src: src?.uid, fx: opt.fx });
    if (src && src.side !== 'enemy') {
      this.run.stats.damageDealt += loss;
      if (loss > this.run.stats.maxHit) this.run.stats.maxHit = loss;
    }
    if (tgt.side === 'hero' && loss > 0) this.onHeroHpLoss(loss);
    // thorns / counter
    const melee = opt.melee ?? (src ? this.dist(src, tgt) <= 1 : false);
    if (opt.attack && src && src.alive && melee) {
      const th = this.st(tgt, 'thorns') + this.st(tgt, 'counter');
      if (th > 0) this.dealDamage(tgt, src, th, { fx: 'thorns' });
    }
    if (opt.attack && src && src.alive && tgt.side === 'hero' && loss === 0 && blocked > 0 && this.hasRelic('mirrorShield')) {
      this.relicFlash('mirrorShield');
      this.dealDamage(tgt, src, 3, { fx: 'thorns' });
    }
    if (tgt.hp <= 0) this.kill(tgt, src);
    else this.checkDoom(tgt);
    return loss;
  }

  loseHp(u: Unit, n: number, fx = 'poison'): void {
    if (!u.alive || n <= 0) return;
    const loss = Math.min(n, u.hp);
    u.hp -= loss;
    this.emit({ t: 'dmg', uid: u.uid, amount: loss, blocked: 0, hp: u.hp, block: u.block, fx });
    if (u.side === 'hero' && loss > 0) this.onHeroHpLoss(loss);
    else if (u.side !== 'hero') this.run.stats.damageDealt += loss;
    if (u.hp <= 0) this.kill(u, null);
    else this.checkDoom(u);
  }

  private onHeroHpLoss(loss: number): void {
    const hero = this.hero;
    this.s.hpLostThisCombat += loss;
    this.run.stats.damageTaken += loss;
    const bl = this.st(hero, 'bloodlust');
    if (bl && hero.hp > 0) this.applyStatus(hero, 'strength', bl, hero);
    for (const id of this.run.relics) RELICS[id]?.onHeroHpLoss?.(this, loss);
  }

  heal(u: Unit, n: number): void {
    if (!u.alive || n <= 0) return;
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + n);
    if (u.hp > before) this.emit({ t: 'heal', uid: u.uid, amount: u.hp - before, hp: u.hp });
  }

  gainBlock(u: Unit, n: number, fromCard: boolean): void {
    if (!u.alive) return;
    let b = n;
    if (fromCard) {
      b += this.st(u, 'dexterity');
      if (this.st(u, 'frail')) b *= 0.75;
    }
    b = Math.max(0, Math.floor(b));
    if (b <= 0) return;
    u.block += b;
    this.emit({ t: 'block', uid: u.uid, amount: b, block: u.block });
  }

  applyStatus(u: Unit, s: string, n: number, src?: Unit | null): void {
    if (!u.alive || n === 0) return;
    if (DEBUFFS.has(s) && n > 0 && this.st(u, 'ward') > 0) {
      u.st.ward--;
      if (!u.st.ward) delete u.st.ward;
      this.emit({ t: 'text', uid: u.uid, text: TXT.blocked, color: '#a78bfa' });
      this.emit({ t: 'status', uid: u.uid, s: 'ward', delta: -1, total: this.st(u, 'ward') });
      return;
    }
    if (src && src.side !== 'enemy' && n > 0) {
      const hero = this.hero;
      if (s === 'poison') {
        n += this.st(hero, 'noxious');
        if (this.hasRelic('viperFang')) n += 1;
      }
      if (s === 'burn') {
        n += this.st(hero, 'pyromancy');
        if (this.hasRelic('emberStone')) n += 1;
      }
    }
    if (s === 'stun' && u.side === 'enemy' && ENEMIES[u.def]?.tier === 'boss' && (u.mem?.stunned ?? 0) >= 2) {
      this.emit({ t: 'text', uid: u.uid, text: TXT.blocked, color: '#a78bfa' });
      return;
    }
    const before = this.st(u, s);
    let total = before + n;
    if (RUNES.includes(s)) total = Math.min(total, 3 + this.st(u, 'runeCap'));
    if (total === before && n > 0) return;
    if (total <= 0) delete u.st[s];
    else u.st[s] = total;
    this.emit({ t: 'status', uid: u.uid, s, delta: total - before, total: this.st(u, s) });
    if (s === 'doom' && n > 0) this.checkDoom(u);
    if (s === 'stun' && u.intent && n > 0) {
      u.intent = { move: '__stun', kind: 'stun' };
      this.emit({ t: 'intent', uid: u.uid });
    }
  }

  kill(u: Unit, killer: Unit | null): void {
    if (!u.alive) return;
    if (u.side === 'hero') {
      if (this.hasRelic('phoenix') && !this.run.relicCounters.phoenixUsed) {
        this.run.relicCounters.phoenixUsed = 1;
        u.hp = 0;
        this.relicFlash('phoenix');
        this.emit({ t: 'text', uid: u.uid, text: TXT.revive, color: '#ffb347' });
        this.heal(u, Math.floor(u.maxHp * 0.3));
        return;
      }
      const fairy = this.run.potions.indexOf('fairy');
      if (fairy >= 0) {
        this.run.potions[fairy] = null;
        u.hp = 0;
        this.emit({ t: 'text', uid: u.uid, text: TXT.revive, color: '#ffb347' });
        this.heal(u, Math.floor(u.maxHp * 0.3));
        return;
      }
      u.alive = false;
      this.emit({ t: 'death', uid: u.uid });
      this.s.phase = 'lost';
      this.emit({ t: 'end', result: 'lost' });
      return;
    }
    u.alive = false;
    this.emit({ t: 'death', uid: u.uid });
    if (u.side === 'enemy') {
      const def = ENEMIES[u.def];
      this.run.stats.kills++;
      if (!this.run.seenEnemies.includes(u.def)) this.run.seenEnemies.push(u.def);
      if (this.hasRelic('soulLantern') || this.st(this.hero, 'souls') >= 0) {
        if (this.hasRelic('soulLantern')) this.applyStatus(this.hero, 'souls', 1, this.hero);
      }
      for (const id of this.run.relics) RELICS[id]?.onKill?.(this, u);
      if (def?.onDeath?.split) {
        for (const sid of def.onDeath.split) this.spawnEnemy(sid, u.pos, undefined, Math.floor(u.maxHp / 2));
      }
      if (def?.onDeath?.explode) {
        const ex = def.onDeath.explode;
        const tiles = this.tilesAround(u.pos, ex.radius);
        this.emit({ t: 'area', tiles, fx: 'explosion' });
        this.emit({ t: 'shake', power: 2 });
        for (const x of this.s.units.filter((x) => x.alive && tiles.includes(x.pos) && x.uid !== u.uid))
          this.dealDamage(null, x, Math.round(ex.dmg * this.enemyDmgMult()), { fx: 'fire' });
      }
      if (def?.tier === 'boss') {
        for (const m of this.s.units.filter((m) => m.alive && m.minionOf === u.uid)) {
          m.alive = false;
          this.emit({ t: 'death', uid: m.uid });
        }
      }
    } else if (u.side === 'ally') {
      const ad = ALLIES[u.def];
      if (ad?.explode) {
        const tiles = this.tilesAround(u.pos, ad.explode.radius);
        this.emit({ t: 'area', tiles, fx: 'explosion' });
        this.emit({ t: 'shake', power: 2 });
        for (const x of this.enemies().filter((x) => tiles.includes(x.pos))) this.dealDamage(null, x, ad.explode.dmg, { fx: 'fire' });
      }
    }
    void killer;
    this.checkEnd();
  }

  checkEnd(): boolean {
    if (this.s.phase === 'won' || this.s.phase === 'lost') return true;
    if (!this.hero.alive) {
      this.s.phase = 'lost';
      this.emit({ t: 'end', result: 'lost' });
      return true;
    }
    if (this.enemies().length === 0) {
      this.s.phase = 'won';
      this.emit({ t: 'end', result: 'won' });
      return true;
    }
    return false;
  }

  get over(): boolean {
    return this.s.phase === 'won' || this.s.phase === 'lost';
  }

  tilesAround(pos: number, r: number): number[] {
    const out: number[] = [];
    for (let p = pos - r; p <= pos + r; p++) if (this.inLane(p)) out.push(p);
    return out;
  }

  /* ============================================================ movement */

  private arrive(u: Unit, from: number, how: 'walk' | 'push' | 'pull' | 'blink' | 'dash'): void {
    if (from !== u.pos) this.emit({ t: 'move', uid: u.uid, from, to: u.pos, how });
  }

  private afterMove(u: Unit): void {
    if (!u.alive) return;
    const bl = this.st(u, 'bleed');
    if (bl) this.loseHp(u, bl, 'blood');
    if (u.side === 'hero' && u.alive) {
      const d = this.st(u, 'diamond');
      if (d) this.gainBlock(u, d, false);
      for (const id of this.run.relics) RELICS[id]?.onHeroMove?.(this);
    }
  }

  /** steps unit to `to` tile by tile (assumes path is free), triggering traps */
  private stepPath(u: Unit, dir: number, steps: number, how: 'walk' | 'push' | 'pull' | 'dash'): number {
    let from = u.pos;
    let moved = 0;
    for (let i = 0; i < steps; i++) {
      const next = u.pos + dir;
      if (!this.isFree(next)) break;
      u.pos = next;
      moved++;
      if (u.side === 'enemy') {
        const fx = this.s.tiles.find((f) => f.pos === next && f.kind === 'trap' && f.owner === 'hero');
        if (fx) {
          this.arrive(u, from, how);
          from = u.pos;
          this.triggerTrap(fx);
          if (!u.alive || this.st(u, 'root')) break;
        }
      }
    }
    this.arrive(u, from, how);
    return moved;
  }

  /** walk toward a position until within `stop` distance, at most `max` steps */
  walkToward(u: Unit, target: number, max: number, stop = 1, how: 'walk' | 'dash' = 'walk'): number {
    if (this.st(u, 'root') || max <= 0) return 0;
    const dir = Math.sign(target - u.pos);
    if (dir === 0) return 0;
    const need = Math.max(0, Math.abs(target - u.pos) - stop);
    const moved = this.stepPath(u, dir, Math.min(max, need), how);
    if (moved > 0) this.afterMove(u);
    return moved;
  }

  walkAway(u: Unit, from: number, max: number): number {
    if (this.st(u, 'root') || max <= 0) return 0;
    let dir = Math.sign(u.pos - from);
    if (dir === 0) dir = u.side === 'enemy' ? 1 : -1;
    const moved = this.stepPath(u, dir, max, 'walk');
    if (moved > 0) this.afterMove(u);
    return moved;
  }

  blink(u: Unit, to: number): void {
    if (!this.isFree(to)) return;
    const from = u.pos;
    u.pos = to;
    this.arrive(u, from, 'blink');
    this.afterMove(u);
  }

  push(u: Unit, dir: number, n: number, stun = false): void {
    if (!u.alive || n <= 0) return;
    if (u.side === 'enemy' && ENEMIES[u.def]?.tier === 'boss') {
      this.emit({ t: 'text', uid: u.uid, text: TXT.immovable, color: '#ccc' });
      return;
    }
    if (u.st.construct) return;
    let moved = 0;
    const from = u.pos;
    let collided: Unit | 'wall' | null = null;
    for (let i = 0; i < n; i++) {
      const next = u.pos + dir;
      if (!this.inLane(next)) {
        collided = 'wall';
        break;
      }
      const occ = this.unitAt(next);
      if (occ) {
        collided = occ;
        break;
      }
      u.pos = next;
      moved++;
    }
    // re-walk to emit and trigger traps along the path
    if (moved > 0) {
      u.pos = from;
      this.stepPath(u, dir, moved, 'push');
      this.afterMove(u);
    }
    if (collided && u.alive) {
      const remaining = n - moved;
      const dmg = COLLIDE_DMG + (remaining - 1) * 2;
      this.emit({ t: 'text', uid: u.uid, text: TXT.collide, color: '#ffcf5a' });
      this.emit({ t: 'shake', power: 1 });
      this.dealDamage(null, u, dmg, { fx: 'impact' });
      if (collided !== 'wall' && collided.alive) this.dealDamage(null, collided, COLLIDE_DMG, { fx: 'impact' });
      if (stun && u.alive) this.applyStatus(u, 'stun', 1, this.hero);
      if (this.hasRelic('prayerBeads') && u.side === 'enemy') {
        this.relicFlash('prayerBeads');
        this.applyStatus(this.hero, 'ki', 1, this.hero);
      }
    }
  }

  pull(u: Unit, towards: Unit, n: number): void {
    if (!u.alive) return;
    if (u.side === 'enemy' && ENEMIES[u.def]?.tier === 'boss') {
      this.emit({ t: 'text', uid: u.uid, text: TXT.immovable, color: '#ccc' });
      return;
    }
    if (u.st.construct) return;
    const dir = Math.sign(towards.pos - u.pos);
    const need = Math.max(0, Math.abs(towards.pos - u.pos) - 1);
    const moved = this.stepPath(u, dir, Math.min(n, need), 'pull');
    if (moved > 0) this.afterMove(u);
  }

  /* =============================================================== tiles */

  placeTile(fx: Omit<TileFx, 'id'>): void {
    this.s.tiles = this.s.tiles.filter((f) => {
      if (f.pos === fx.pos) {
        this.emit({ t: 'tile', fx: f, on: false });
        return false;
      }
      return true;
    });
    const f: TileFx = { ...fx, id: this.s.nextUid++ };
    this.s.tiles.push(f);
    this.emit({ t: 'tile', fx: f, on: true });
  }

  triggerTrap(fx: TileFx): void {
    this.s.tiles = this.s.tiles.filter((f) => f.id !== fx.id);
    this.emit({ t: 'tile', fx, on: false });
    const tiles = this.tilesAround(fx.pos, fx.radius);
    this.emit({ t: 'area', tiles, fx: fx.trap === 'explosive' ? 'explosion' : 'trap' });
    const victims = this.enemies().filter((e) => tiles.includes(e.pos));
    for (const v of victims) {
      this.dealDamage(null, v, this.calcAttack(null, v, fx.n), { fx: 'trap' });
      if (v.alive && fx.trap === 'bear') this.applyStatus(v, 'root', 2, this.hero);
      if (v.alive && fx.trap === 'frost') {
        this.applyStatus(v, 'root', 1, this.hero);
        this.applyStatus(v, 'weak', 1, this.hero);
      }
      if (v.alive && fx.trap === 'poison') this.applyStatus(v, 'poison', 4, this.hero);
    }
    const tm = this.st(this.hero, 'trapmaster');
    if (tm) this.drawCards(tm);
    for (const id of this.run.relics) RELICS[id]?.onTrap?.(this);
  }

  explodeBomb(fx: TileFx): void {
    this.s.tiles = this.s.tiles.filter((f) => f.id !== fx.id);
    this.emit({ t: 'tile', fx, on: false });
    const tiles = this.tilesAround(fx.pos, fx.radius);
    this.emit({ t: 'area', tiles, fx: 'explosion' });
    this.emit({ t: 'shake', power: 3 });
    for (const u of this.s.units.filter((u) => u.alive && tiles.includes(u.pos))) {
      const dmg = u.side === 'hero' ? Math.ceil(fx.n / 2) : this.calcAttack(null, u, fx.n);
      this.dealDamage(null, u, dmg, { fx: 'fire' });
    }
  }

  /* ============================================================= summons */

  nearestFreeTile(from: number, prefDir: number): number | undefined {
    for (let d = 1; d < this.s.lane; d++) {
      for (const dir of [prefDir, -prefDir]) {
        const p = from + dir * d;
        if (this.isFree(p)) return p;
      }
    }
    return undefined;
  }

  summonAlly(defId: string, tile: number | undefined, up: boolean, hpOverride?: number): Unit | undefined {
    const def = ALLIES[defId];
    if (!def) return undefined;
    let pos = tile !== undefined && this.isFree(tile) ? tile : this.nearestFreeTile(this.hero.pos, this.heroFacing());
    if (pos === undefined) {
      this.emit({ t: 'text', uid: this.hero.uid, text: TXT.noRoom, color: '#ccc' });
      return undefined;
    }
    const hp = hpOverride ?? def.hp + (up ? def.hpUp ?? 0 : 0);
    const u: Unit = {
      uid: this.s.nextUid++,
      def: defId,
      side: 'ally',
      hp,
      maxHp: hp,
      block: 0,
      pos,
      st: def.speed === 0 ? { construct: 1 } : {},
      alive: true,
    };
    this.s.units.push(u);
    this.emit({ t: 'spawn', uid: u.uid });
    for (const id of this.run.relics) RELICS[id]?.onSummon?.(this, u);
    return u;
  }

  spawnEnemy(id: string, near: number, minionOf?: number, hpOverride?: number): Unit | undefined {
    if (this.enemies().length >= MAX_ENEMIES) return undefined;
    const def = ENEMIES[id];
    const dirAway = Math.sign(near - this.hero.pos) || 1;
    let pos: number | undefined = this.isFree(near) ? near : undefined;
    if (pos === undefined) pos = this.nearestFreeTile(near, dirAway);
    if (pos === undefined) return undefined;
    let hp = hpOverride ?? this.rng.int(def.hp[0], def.hp[1]);
    if (hpOverride === undefined) hp = Math.round(hp * this.run.mods.enemyHp);
    const u: Unit = {
      uid: this.s.nextUid++,
      def: id,
      side: 'enemy',
      hp,
      maxHp: hp,
      block: 0,
      pos,
      st: { ...(def.start ?? {}) },
      alive: true,
      hist: [],
      mem: {},
      minionOf,
    };
    this.s.units.push(u);
    this.emit({ t: 'spawn', uid: u.uid });
    this.chooseIntent(u);
    return u;
  }

  /* ========================================================= card piles */

  drawCards(n: number): number {
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (this.s.hand.length >= HAND_MAX) break;
      if (this.s.draw.length === 0) {
        if (this.s.discard.length === 0) break;
        this.s.draw = this.rng.shuffle(this.s.discard);
        this.s.discard = [];
        this.s.shuffles++;
        this.emit({ t: 'shuffle' });
        this.relicHook('onShuffle');
      }
      const c = this.s.draw.pop()!;
      this.s.hand.push(c);
      drawn++;
    }
    if (drawn) this.emit({ t: 'draw', n: drawn });
    return drawn;
  }

  addCard(id: string, n: number, to: 'hand' | 'draw' | 'discard', up = false): void {
    for (let i = 0; i < n; i++) {
      const c: CardInst = { uid: this.s.nextUid++ + 100000, id, up };
      if (to === 'hand' && this.s.hand.length < HAND_MAX) this.s.hand.push(c);
      else if (to === 'draw') this.s.draw.splice(this.rng.int(0, this.s.draw.length), 0, c);
      else this.s.discard.push(c);
    }
    if (to === 'hand') this.emit({ t: 'draw', n: 0 });
  }

  exhaustCard(c: CardInst): void {
    this.s.exhaust.push(c);
    this.emit({ t: 'exhaustCard', card: c });
    for (const id of this.run.relics) RELICS[id]?.onExhaust?.(this);
  }

  /* ========================================================== play card */

  playCard(cardUid: number, target: Target = {}): boolean {
    const idx = this.s.hand.findIndex((c) => c.uid === cardUid);
    if (idx < 0) return false;
    const card = this.s.hand[idx];
    const chk = this.canPlay(card);
    if (!chk.ok) return false;
    const sp = this.specOf(card);
    // validate target
    let tgt: Unit | undefined;
    let tile: number | undefined;
    if (sp.target !== 'none') {
      const vt = this.validTargets(card);
      if (sp.target === 'enemy' || sp.target === 'ally') {
        if (target.uid === undefined || !vt.units.includes(target.uid)) {
          // allow tile tap on a unit
          const u = target.tile !== undefined ? this.unitAt(target.tile) : undefined;
          if (!u || !vt.units.includes(u.uid)) return false;
          tgt = u;
        } else tgt = this.unit(target.uid);
        tile = tgt?.pos;
      } else {
        let tl = target.tile;
        if (tl === undefined && target.uid !== undefined) tl = this.unit(target.uid)?.pos;
        if (tl === undefined || !vt.tiles.includes(tl)) return false;
        tile = tl;
        tgt = this.unitAt(tl);
      }
    }
    // pay
    const cost = this.costOf(card);
    const x = cost < 0 ? this.s.energy : 0;
    this.s.energy -= cost < 0 ? this.s.energy : cost;
    if (this.hasRelic('timeWheel') && !this.s.flags.timeWheel && sp.cost >= 2) {
      this.s.flags.timeWheel = 1;
      this.relicFlash('timeWheel');
    }
    if (sp.soulCost) this.applyStatus(this.hero, 'souls', -sp.soulCost);
    if (sp.kiCost) this.applyStatus(this.hero, 'ki', -sp.kiCost);
    if (sp.goldCost) this.gainGold(-sp.goldCost);
    if (sp.hpCost) this.loseHp(this.hero, sp.hpCost, 'blood');
    this.s.hand.splice(idx, 1);
    delete card.tc;
    this.emit({ t: 'play', card, tgt: tgt?.uid });
    this.emit({ t: 'energy', n: this.s.energy });

    const ctx: Ctx = { src: this.hero, card, spec: sp, tgt, tile, x, killed: false, lastUnblocked: 0 };
    const hero = this.hero;
    let times = 1;
    if (sp.type === 'attack' && this.st(hero, 'echo') > 0) {
      this.applyStatus(hero, 'echo', -1);
      times = 2;
    }
    for (let r = 0; r < times; r++) {
      if (r > 0) {
        if (ctx.tgt && !ctx.tgt.alive) break;
        if (this.over) break;
      }
      this.resolve(sp.effects, ctx);
    }

    // counters
    this.s.cardsThisTurn++;
    this.s.cardsThisCombat++;
    this.run.stats.cardsPlayed++;
    if (sp.type === 'attack') this.s.attacksThisTurn++;
    for (const id of this.run.relics) RELICS[id]?.onCardPlayed?.(this, card, sp);

    // destination
    if (sp.type === 'power') {
      // powers are consumed
    } else if (sp.exhaust || sp.type === 'status' || sp.type === 'curse') {
      this.exhaustCard(card);
    } else {
      this.s.discard.push(card);
    }
    this.cleanup();
    this.checkEnd();
    return true;
  }

  moveHero(tile: number): boolean {
    if (this.s.phase !== 'player') return false;
    const tiles = this.heroMoveTiles();
    if (!tiles.includes(tile)) return false;
    const hero = this.hero;
    const d = Math.abs(tile - hero.pos);
    this.s.mp -= d;
    this.walkToward(hero, tile, d, 0);
    this.cleanup();
    this.checkEnd();
    return true;
  }

  private cleanup(): void {
    this.s.units = this.s.units.filter((u) => u.alive || u.side === 'hero');
  }

  /* ========================================================== resolver */

  private selectUnits(sel: Sel | undefined, ctx: Ctx, e: { radius?: number; len?: number }): Unit[] {
    const hero = this.hero;
    const src = ctx.src;
    const foes = this.foesOf(src);
    switch (sel ?? 'target') {
      case 'target':
        return ctx.tgt && ctx.tgt.alive ? [ctx.tgt] : [];
      case 'self':
        return [src];
      case 'all':
        return foes;
      case 'random':
        return foes.length ? [this.rng.pick(foes)] : [];
      case 'adjacent':
        return foes.filter((f) => this.dist(src, f) <= 1);
      case 'near':
        return foes.filter((f) => this.dist(src, f) <= (e.radius ?? 1));
      case 'area': {
        const c = ctx.tile ?? ctx.tgt?.pos ?? src.pos;
        return foes.filter((f) => Math.abs(f.pos - c) <= (e.radius ?? 1));
      }
      case 'areaAll': {
        const c = ctx.tile ?? ctx.tgt?.pos ?? src.pos;
        return this.s.units.filter((f) => f.alive && Math.abs(f.pos - c) <= (e.radius ?? 1));
      }
      case 'line': {
        const aim = ctx.tile ?? ctx.tgt?.pos;
        const dir = aim !== undefined ? Math.sign(aim - hero.pos) || 1 : this.heroFacing();
        const len = e.len ?? 3;
        return foes.filter((f) => {
          const d = (f.pos - hero.pos) * dir;
          return d >= 1 && d <= len;
        });
      }
      case 'behind': {
        if (!ctx.tgt) return [];
        const dir = Math.sign(ctx.tgt.pos - hero.pos) || 1;
        const u = this.unitAt(ctx.tgt.pos + dir);
        return u && u.side === 'enemy' ? [u] : [];
      }
      case 'allies':
        return this.allies();
    }
    return [];
  }

  resolve(effects: Effect[], ctx: Ctx): void {
    for (const e of effects) {
      if (this.over) return;
      this.resolveOne(e, ctx);
    }
  }

  private resolveOne(e: Effect, ctx: Ctx): void {
    const hero = this.hero;
    switch (e.k) {
      case 'dmg': {
        const times = this.evalNum(e.times ?? 1, ctx);
        const base = this.evalNum(e.n, ctx);
        const targets = this.selectUnits(e.to, ctx, e);
        const ranged = !!ctx.spec && (ctx.spec.range ?? 1) > 1;
        if (targets.length && ctx.src.side === 'hero') {
          const t0 = targets[0];
          this.emit({ t: 'attack', uid: hero.uid, tgt: t0.uid, ranged: ranged || this.dist(hero, t0) > 1, fx: e.fx });
        }
        for (const t of targets) {
          for (let i = 0; i < times; i++) {
            if (!t.alive || this.over) break;
            const wasAlive = t.alive;
            const dmg = this.calcAttack(ctx.src, t, base, e.holy);
            const loss = this.dealDamage(ctx.src, t, dmg, {
              attack: true,
              pierce: e.pierce,
              fx: e.fx,
              melee: this.dist(ctx.src, t) <= 1,
            });
            ctx.lastUnblocked = loss;
            if (e.lifesteal && loss > 0) this.heal(ctx.src, Math.floor(loss * e.lifesteal));
            if (wasAlive && !t.alive) ctx.killed = true;
          }
        }
        break;
      }
      case 'block': {
        const n = this.evalNum(e.n, ctx);
        if (e.to === 'allies') for (const a of this.allies()) this.gainBlock(a, n, false);
        else this.gainBlock(ctx.src, n, true);
        break;
      }
      case 'status': {
        const n = this.evalNum(e.n, ctx);
        const to = e.to ?? 'target';
        const targets = to === 'self' ? [ctx.src] : this.selectUnits(to, ctx, e);
        for (const t of targets) this.applyStatus(t, e.s, n, ctx.src);
        break;
      }
      case 'draw':
        this.drawCards(this.evalNum(e.n, ctx));
        break;
      case 'energy':
        this.s.energy += this.evalNum(e.n, ctx);
        this.emit({ t: 'energy', n: this.s.energy });
        break;
      case 'mp':
        this.s.mp += this.evalNum(e.n, ctx);
        break;
      case 'heal': {
        const n = this.evalNum(e.n, ctx);
        if (e.to === 'allies') for (const a of this.allies()) this.heal(a, n);
        else this.heal(ctx.src, n);
        break;
      }
      case 'moveTo': {
        if (ctx.tile === undefined) break;
        if (ctx.spec?.target === 'move') {
          this.walkToward(hero, ctx.tile, Math.abs(ctx.tile - hero.pos), 0);
        } else this.blink(hero, ctx.tile);
        break;
      }
      case 'dash': {
        if (!ctx.tgt) break;
        this.walkToward(hero, ctx.tgt.pos, e.n, 1, 'dash');
        break;
      }
      case 'retreat': {
        const f = this.nearestFoe(hero);
        this.walkAway(hero, f ? f.pos : hero.pos + 1, e.n);
        break;
      }
      case 'push': {
        const targets = this.selectUnits(e.to, ctx, e);
        // push farthest first so they don't collide with each other needlessly
        targets.sort((a, b) => this.dist(hero, b) - this.dist(hero, a));
        for (const t of targets) {
          const dir = Math.sign(t.pos - hero.pos) || 1;
          this.push(t, dir, e.n, e.stun);
        }
        break;
      }
      case 'pull': {
        const targets = this.selectUnits(e.to, ctx, {});
        targets.sort((a, b) => this.dist(hero, a) - this.dist(hero, b));
        for (const t of targets) this.pull(t, hero, e.n);
        break;
      }
      case 'behindTarget': {
        if (!ctx.tgt) break;
        const dir = Math.sign(ctx.tgt.pos - hero.pos) || 1;
        let p = ctx.tgt.pos + dir;
        if (!this.isFree(p)) p = ctx.tgt.pos - dir === hero.pos ? hero.pos : ctx.tgt.pos - dir;
        if (this.isFree(p)) this.blink(hero, p);
        break;
      }
      case 'swap': {
        if (!ctx.tgt) break;
        const a = hero.pos;
        const b = ctx.tgt.pos;
        hero.pos = b;
        ctx.tgt.pos = a;
        this.emit({ t: 'move', uid: hero.uid, from: a, to: b, how: 'blink' });
        this.emit({ t: 'move', uid: ctx.tgt.uid, from: b, to: a, how: 'blink' });
        break;
      }
      case 'summon': {
        const count = e.n ?? 1;
        for (let i = 0; i < count; i++) this.summonAlly(e.unit, i === 0 ? ctx.tile : undefined, !!ctx.card?.up);
        break;
      }
      case 'trap': {
        const n = this.evalNum(e.n, ctx);
        const center = ctx.tile ?? hero.pos + this.heroFacing();
        const spread = e.spread ?? 0;
        for (let p = center - spread; p <= center + spread; p++) {
          if (this.isFree(p)) this.placeTile({ pos: p, kind: 'trap', trap: e.trap, n, radius: e.radius ?? 0, owner: 'hero' });
        }
        break;
      }
      case 'bomb': {
        const n = this.evalNum(e.n, ctx);
        const center = ctx.tile ?? hero.pos + this.heroFacing();
        const spread = e.spread ?? 0;
        for (let p = center - spread; p <= center + spread; p++) {
          if (this.inLane(p) && p !== hero.pos)
            this.placeTile({ pos: p, kind: 'bomb', n, radius: e.radius, timer: e.timer ?? 1, owner: 'hero' });
        }
        break;
      }
      case 'addCard':
        this.addCard(e.card, e.n, e.to, e.up);
        break;
      case 'loseHp':
        this.loseHp(hero, this.evalNum(e.n, ctx), 'blood');
        break;
      case 'spend': {
        const have = this.st(hero, e.s);
        const n = e.n === 'all' ? have : Math.min(have, e.n);
        if (n > 0) this.applyStatus(hero, e.s, -n);
        break;
      }
      case 'if': {
        if (this.checkCond(e.cond, ctx)) this.resolve(e.then, ctx);
        else if (e.else) this.resolve(e.else, ctx);
        break;
      }
      case 'custom':
        this.custom(e.id, ctx, e.n !== undefined ? this.evalNum(e.n, ctx) : 0, e.m !== undefined ? this.evalNum(e.m, ctx) : 0);
        break;
    }
  }

  private checkCond(c: import('./types').Cond, ctx: Ctx): boolean {
    switch (c.c) {
      case 'targetHas':
        return !!ctx.tgt && this.st(ctx.tgt, c.s) > 0;
      case 'selfHas':
        return this.st(this.hero, c.s) >= (c.n ?? 1);
      case 'targetDist': {
        if (!ctx.tgt) return false;
        const d = this.dist(this.hero, ctx.tgt);
        return d >= (c.min ?? 0) && d <= (c.max ?? 99);
      }
      case 'killed':
        return ctx.killed;
      case 'hpBelow':
        return this.hero.hp <= this.hero.maxHp * c.pct;
    }
  }

  private custom(id: string, ctx: Ctx, n: number, m: number): void {
    const hero = this.hero;
    switch (id) {
      case 'triggerPoison': {
        // target immediately suffers its poison n times
        for (let i = 0; i < Math.max(1, n); i++) {
          const t = ctx.tgt;
          if (!t || !t.alive) break;
          const p = this.st(t, 'poison');
          if (p > 0) this.loseHp(t, p, 'poison');
        }
        break;
      }
      case 'multiplyPoison': {
        const t = ctx.tgt;
        if (t && t.alive) {
          const p = this.st(t, 'poison');
          if (p > 0) this.applyStatus(t, 'poison', p * (n - 1), null);
        }
        break;
      }
      case 'chain': {
        // lightning chains through contiguous enemies from target
        const t = ctx.tgt;
        if (!t) break;
        const hit = new Set<number>([t.uid]);
        for (const dir of [-1, 1]) {
          let p = t.pos + dir;
          for (;;) {
            const u = this.unitAt(p);
            if (!u || u.side !== 'enemy') break;
            hit.add(u.uid);
            p += dir;
          }
        }
        hit.delete(t.uid);
        for (const uid of hit) {
          const u = this.unit(uid);
          if (u) this.dealDamage(hero, u, this.calcAttack(hero, u, n), { attack: true, fx: 'lightning', melee: false });
        }
        break;
      }
      case 'upgradeHand':
        for (const c of this.s.hand) c.up = true;
        this.emit({ t: 'draw', n: 0 });
        break;
      case 'soulStorm': {
        const souls = this.st(hero, 'souls');
        if (souls > 0) this.applyStatus(hero, 'souls', -souls);
        for (let i = 0; i < souls; i++) {
          const foes = this.enemies();
          if (!foes.length) break;
          const f = this.rng.pick(foes);
          this.dealDamage(hero, f, this.calcAttack(hero, f, n), { attack: true, fx: 'soul', melee: false });
        }
        break;
      }
      case 'radiantBurst': {
        const r = this.st(hero, 'radiance');
        if (r > 0) this.applyStatus(hero, 'radiance', -r);
        const t = ctx.tgt;
        if (t && t.alive) this.dealDamage(hero, t, this.calcAttack(hero, t, r * n + m), { attack: true, fx: 'holy', melee: false });
        break;
      }
      case 'kiStrike': {
        // n + m*ki damage, spends all ki
        const ki = this.st(hero, 'ki');
        if (ki > 0) this.applyStatus(hero, 'ki', -ki);
        const t = ctx.tgt;
        if (t && t.alive) this.dealDamage(hero, t, this.calcAttack(hero, t, n + m * ki), { attack: true, fx: 'fist' });
        break;
      }
      case 'hundredFists': {
        const ki = this.st(hero, 'ki');
        if (ki > 0) this.applyStatus(hero, 'ki', -ki);
        const t = ctx.tgt;
        for (let i = 0; i < m + ki; i++) {
          if (!t || !t.alive) break;
          this.dealDamage(hero, t, this.calcAttack(hero, t, n), { attack: true, fx: 'fist' });
        }
        break;
      }
      case 'detonate': {
        const bombs = this.s.tiles.filter((f) => f.kind === 'bomb');
        for (const b of bombs) {
          b.n += n;
          this.explodeBomb(b);
        }
        break;
      }
      case 'corpseExplosion': {
        const a = ctx.tgt;
        if (!a || a.side !== 'ally') break;
        const pos = a.pos;
        a.alive = false;
        this.emit({ t: 'death', uid: a.uid });
        const tiles = this.tilesAround(pos, 1);
        this.emit({ t: 'area', tiles, fx: 'soul' });
        for (const f of this.enemies().filter((f) => tiles.includes(f.pos)))
          this.dealDamage(hero, f, this.calcAttack(hero, f, n), { attack: true, fx: 'soul', melee: false });
        break;
      }
      case 'cleanse': {
        for (const s of Object.keys(hero.st)) {
          if (DEBUFFS.has(s)) {
            const v = hero.st[s];
            delete hero.st[s];
            this.emit({ t: 'status', uid: hero.uid, s, delta: -v, total: 0 });
          }
        }
        break;
      }
      case 'stunAll': {
        for (const f of this.enemies()) this.applyStatus(f, 'stun', 1, hero);
        break;
      }
      case 'deadlyShot': {
        const t = ctx.tgt;
        if (!t || !t.alive) break;
        const mark = this.st(t, 'mark');
        const dmg = this.calcAttack(hero, t, n + mark * m);
        this.emit({ t: 'attack', uid: hero.uid, tgt: t.uid, ranged: true, fx: 'arrow' });
        this.dealDamage(hero, t, dmg, { attack: true, fx: 'arrow', melee: false });
        if (t.alive && mark) this.applyStatus(t, 'mark', -mark);
        break;
      }
      case 'allyStrength':
        for (const a of this.allies()) this.applyStatus(a, 'strength', n, hero);
        break;
      case 'lastStand':
        this.gainBlock(hero, Math.floor((hero.maxHp - hero.hp) / 2) + n, true);
        break;
      case 'freeNextCost':
        for (const c of this.s.hand) if (c !== ctx.card) c.tc = 0;
        break;
      case 'shieldSlam': {
        const t = ctx.tgt;
        if (!t) break;
        this.dealDamage(hero, t, this.calcAttack(hero, t, hero.block + n), { attack: true, fx: 'impact' });
        break;
      }
      case 'executeKill': {
        // if target killed, gain energy n
        if (ctx.killed) {
          this.s.energy += n;
          this.emit({ t: 'energy', n: this.s.energy });
        }
        break;
      }
      case 'gainSoulOnKill':
        if (ctx.killed) this.applyStatus(hero, 'souls', n, hero);
        break;
      case 'staticCharge': {
        const t = ctx.tgt;
        if (!t || !t.alive) break;
        const base = this.st(t, 'root') ? n * 2 : n;
        this.dealDamage(hero, t, this.calcAttack(hero, t, base), { attack: true, fx: 'lightning', melee: false });
        break;
      }
      case 'shiftBear':
      case 'shiftWolf':
      case 'shiftOwl': {
        const form = id === 'shiftBear' ? 'bearForm' : id === 'shiftWolf' ? 'wolfForm' : 'owlForm';
        const had = this.st(hero, form);
        for (const f of FORMS) if (f !== form && this.st(hero, f)) this.applyStatus(hero, f, -this.st(hero, f));
        if (!had) this.applyStatus(hero, form, form === 'bearForm' ? Math.max(3, n) : 1, hero);
        this.emit({ t: 'cast', uid: hero.uid, fx: 'buff' });
        if (!had) {
          const feral = this.st(hero, 'feral');
          if (feral) {
            this.s.energy += feral;
            this.emit({ t: 'energy', n: this.s.energy });
          }
          if (this.hasRelic('ancientSeed')) {
            this.relicFlash('ancientSeed');
            this.gainBlock(hero, 2, false);
          }
        }
        break;
      }
      case 'totemPulse':
        for (const a of this.allies().filter((a) => ALLIES[a.def]?.pulse)) {
          this.totemPulse(a);
          if (this.over) break;
        }
        break;
      case 'furyStrike': {
        const fury = this.st(hero, 'fury');
        if (fury > 0) this.applyStatus(hero, 'fury', -fury);
        const t = ctx.tgt;
        if (t && t.alive) this.dealDamage(hero, t, this.calcAttack(hero, t, n + m * fury), { attack: true, fx: 'impact' });
        break;
      }
      case 'furyFromMissing':
        this.applyStatus(hero, 'fury', Math.floor((hero.maxHp - hero.hp) / 10) + n, hero);
        break;
      case 'gold':
        this.gainGold(n);
        break;
      case 'goldShot': {
        const t = ctx.tgt;
        if (!t || !t.alive) break;
        const bonus = Math.min(20, Math.floor(this.run.gold / 25));
        this.emit({ t: 'attack', uid: hero.uid, tgt: t.uid, ranged: true, fx: 'bullet' });
        this.dealDamage(hero, t, this.calcAttack(hero, t, n + bonus), { attack: true, fx: 'bullet', melee: false });
        break;
      }
      case 'randomRune':
        for (let i = 0; i < Math.max(1, n); i++) this.applyStatus(hero, this.rng.pick(RUNES), 1, hero);
        break;
      case 'allRunes':
        for (const r of RUNES) this.applyStatus(hero, r, 1, hero);
        break;
      case 'invoke':
      case 'invokeAll': {
        const runes = this.runeCount();
        for (const r of RUNES) if (this.st(hero, r)) this.applyStatus(hero, r, -this.st(hero, r));
        if (!runes) break;
        const targets = id === 'invoke' ? (ctx.tgt && ctx.tgt.alive ? [ctx.tgt] : []) : this.enemies();
        this.emit({ t: 'area', tiles: targets.map((x) => x.pos), fx: 'crystal' });
        for (const t of targets) this.dealDamage(hero, t, this.calcAttack(hero, t, n * runes), { attack: true, fx: 'arcane', melee: false });
        break;
      }
      case 'doomStrike': {
        const t = ctx.tgt;
        if (!t || !t.alive) break;
        const doom = this.st(t, 'doom');
        this.emit({ t: 'attack', uid: hero.uid, tgt: t.uid, ranged: true, fx: 'soul' });
        if (doom) this.applyStatus(t, 'doom', -doom);
        this.dealDamage(hero, t, this.calcAttack(hero, t, doom + n), { attack: true, fx: 'soul', melee: false });
        break;
      }
      case 'doomMult':
        for (const e of this.enemies()) {
          const d = this.st(e, 'doom');
          if (d) this.applyStatus(e, 'doom', d * (n - 1), hero);
        }
        break;
      default:
        console.warn('unknown custom effect', id);
    }
  }

  /* ===================================================== class helpers */

  runeCount(): number {
    const h = this.hero;
    return RUNES.reduce((a, r) => a + this.st(h, r), 0);
  }

  formAttackBonus(u: Unit): number {
    let d = 0;
    if (this.st(u, 'wolfForm')) d += 2;
    if (this.st(u, 'primal') && FORMS.some((f) => this.st(u, f))) d += 3 * this.st(u, 'primal');
    return d;
  }

  gainGold(n: number): void {
    if (n === 0) return;
    const g = n < 0 ? Math.max(n, -this.run.gold) : n;
    this.run.gold += g;
    if (g > 0) this.run.stats.goldEarned += g;
    this.emit({ t: 'text', uid: this.hero.uid, text: L(`${g > 0 ? '+' : ''}${g} Altın`, `${g > 0 ? '+' : ''}${g} Gold`), color: '#ffd35a' });
    this.emit({ t: 'gold', n: this.run.gold });
  }

  /** enemies whose Doom reaches their HP are executed */
  checkDoom(u: Unit): void {
    if (!u.alive || u.side !== 'enemy') return;
    const doom = this.st(u, 'doom');
    if (doom > 0 && doom >= u.hp) {
      this.emit({ t: 'text', uid: u.uid, text: L('KIYAMET!', 'DOOMED!'), color: '#ff4d7a' });
      this.emit({ t: 'area', tiles: [u.pos], fx: 'soul' });
      u.hp = 0;
      this.emit({ t: 'dmg', uid: u.uid, amount: doom, blocked: 0, hp: 0, block: u.block, fx: 'soul' });
      this.kill(u, this.hero);
    }
  }

  totemPulse(a: Unit): void {
    const def = ALLIES[a.def];
    const hero = this.hero;
    const str = this.st(a, 'strength');
    this.emit({ t: 'cast', uid: a.uid, fx: def.pulse === 'heal' ? 'heal' : def.pulse === 'earth' ? 'block' : 'lightning' });
    switch (def.pulse) {
      case 'fire': {
        const foes = this.enemies().filter((e) => this.dist(a, e) <= 2);
        if (foes.length) this.emit({ t: 'area', tiles: this.tilesAround(a.pos, 2), fx: 'fire' });
        for (const f of foes) {
          this.dealDamage(a, f, 3 + str, { fx: 'fire' });
          if (f.alive) this.applyStatus(f, 'burn', 1, hero);
        }
        break;
      }
      case 'heal':
        this.heal(hero, 3);
        for (const x of this.allies()) if (x.uid !== a.uid) this.heal(x, 2);
        break;
      case 'storm': {
        const foes = this.enemies();
        if (!foes.length) break;
        const f = this.rng.pick(foes);
        this.emit({ t: 'attack', uid: a.uid, tgt: f.uid, ranged: true, fx: 'lightning' });
        this.dealDamage(a, f, 5 + str, { fx: 'lightning' });
        break;
      }
      case 'earth':
        this.gainBlock(hero, 4, false);
        break;
    }
  }

  /* ============================================================= turns */

  heroEnergy(): number {
    return this.cls.energy + relicPassive(this.run, 'energy');
  }
  heroMp(): number {
    return this.cls.mp + relicPassive(this.run, 'mp') + this.st(this.hero, 'haste') + (this.st(this.hero, 'wolfForm') ? 1 : 0);
  }
  heroHand(): number {
    return this.cls.hand + relicPassive(this.run, 'draw');
  }

  startPlayerTurn(): void {
    if (this.over) return;
    const s = this.s;
    const hero = this.hero;
    s.turn++;
    this.run.stats.turns++;
    s.phase = 'player';
    s.cardsThisTurn = 0;
    s.attacksThisTurn = 0;
    this.emit({ t: 'turn', side: 'player', turn: s.turn });
    // block & temporary statuses
    if (this.st(hero, 'retainBlock')) this.applyStatus(hero, 'retainBlock', -1);
    else if (!this.st(hero, 'bastion')) hero.block = 0;
    this.emit({ t: 'block', uid: hero.uid, amount: 0, block: hero.block });
    this.clearTemp(hero);
    // poison
    const p = this.st(hero, 'poison');
    if (p) {
      this.loseHp(hero, p, 'poison');
      this.applyStatus(hero, 'poison', -1);
      if (this.over) return;
    }
    s.energy = this.heroEnergy();
    s.mp = this.heroMp();
    // powers
    const titan = this.st(hero, 'titan');
    if (titan) this.applyStatus(hero, 'strength', titan, hero);
    const zen = this.st(hero, 'zen');
    if (zen) this.applyStatus(hero, 'ki', zen, hero);
    const cru = this.st(hero, 'crusader');
    if (cru) this.applyStatus(hero, 'radiance', cru, hero);
    const bar = this.st(hero, 'barrier');
    if (bar) this.gainBlock(hero, bar, false);
    const drone = this.st(hero, 'drone');
    if (drone) {
      for (const a of this.allies()) this.heal(a, 3);
      this.gainBlock(hero, drone, false);
    }
    const lich = this.st(hero, 'lichForm');
    for (let i = 0; i < lich; i++) this.summonAlly('skeleton', undefined, false);
    const bm = this.st(hero, 'bladeMaster');
    if (bm) this.addCard('throwingKnife', bm, 'hand');
    const bear = this.st(hero, 'bearForm');
    if (bear) this.gainBlock(hero, bear, false);
    const furyGen = this.st(hero, 'furyGen');
    if (furyGen) this.applyStatus(hero, 'fury', furyGen, hero);
    const doomAura = this.st(hero, 'doomAura');
    if (doomAura) for (const e of this.enemies()) this.applyStatus(e, 'doom', doomAura, hero);
    const runeGen = this.st(hero, 'runeGen');
    for (let i = 0; i < runeGen; i++) this.applyStatus(hero, this.rng.pick(RUNES), 1, hero);
    const hoard = this.st(hero, 'hoard');
    if (hoard) this.gainGold(hoard);
    if (this.over) return;
    this.relicHook('onTurnStart');
    this.drawCards(this.heroHand() + (this.st(hero, 'owlForm') ? 1 : 0) + (s.turn === 1 ? relicPassive(this.run, 'firstDraw') : 0));
    // shackles
    const shackles = s.hand.filter((c) => CARDS[c.id]?.inHand === 'shackles').length;
    if (shackles) s.mp = Math.max(0, s.mp - shackles);
    this.emit({ t: 'energy', n: s.energy });
  }

  private clearTemp(u: Unit): void {
    for (const k of ['dodge', 'counter']) {
      if (u.st[k]) {
        const v = u.st[k];
        delete u.st[k];
        this.emit({ t: 'status', uid: u.uid, s: k, delta: -v, total: 0 });
      }
    }
  }

  /** end-of-turn processing for any unit */
  private endOfTurnStatuses(u: Unit): void {
    if (!u.alive) return;
    const burn = this.st(u, 'burn');
    if (burn) {
      this.loseHp(u, burn, 'fire');
      if (!u.alive) return;
      const nb = Math.floor(burn / 2);
      this.applyStatus(u, 'burn', nb - burn);
    }
    const regen = this.st(u, 'regen');
    if (regen) {
      this.heal(u, regen);
      this.applyStatus(u, 'regen', -1);
    }
    const ritual = this.st(u, 'ritual');
    if (ritual) this.applyStatus(u, 'strength', ritual, u);
    for (const s of DURATION_STATUSES) if (this.st(u, s)) this.applyStatus(u, s, -1);
    this.checkDoom(u);
  }

  endTurn(): void {
    if (this.s.phase !== 'player') return;
    const s = this.s;
    const hero = this.hero;
    // cards in hand with end-of-turn effects
    for (const c of s.hand) {
      const d = CARDS[c.id];
      if (!d?.inHand) continue;
      if (d.inHand === 'scorch') this.dealDamage(null, hero, 2, { fx: 'fire' });
      if (d.inHand === 'regret') this.loseHp(hero, s.hand.length, 'blood');
      if (d.inHand === 'doubt') this.applyStatus(hero, 'weak', 1);
      if (d.inHand === 'decay') this.dealDamage(null, hero, 2, { fx: 'poison' });
      if (this.over) return;
    }
    // powers
    const plating = this.st(hero, 'plating');
    if (plating) this.gainBlock(hero, plating, false);
    const avatar = this.st(hero, 'avatar');
    if (avatar) {
      const r = this.st(hero, 'radiance');
      if (r > 0)
        for (let i = 0; i < avatar; i++) {
          this.emit({ t: 'cast', uid: hero.uid, fx: 'holy' });
          for (const f of this.enemies()) this.dealDamage(hero, f, r, { fx: 'holy' });
        }
    }
    const amp = 1 + this.st(hero, 'runeAmp');
    const frost = this.st(hero, 'runeFrost');
    if (frost) this.gainBlock(hero, 2 * frost * amp, false);
    const storm = this.st(hero, 'runeStorm');
    if (storm) {
      const foes = this.enemies();
      if (foes.length) {
        const f = this.rng.pick(foes);
        this.emit({ t: 'attack', uid: hero.uid, tgt: f.uid, ranged: true, fx: 'lightning' });
        this.dealDamage(hero, f, 2 * storm * amp, { fx: 'lightning' });
      }
    }
    if (this.over) return;
    const vigil = this.st(hero, 'vigil');
    if (vigil) {
      const adj = this.enemies().filter((e) => this.dist(hero, e) <= 1);
      if (adj.length) {
        this.emit({ t: 'cast', uid: hero.uid, fx: 'slash' });
        for (const e of adj) this.dealDamage(hero, e, vigil, { fx: 'slash' });
      }
    }
    if (this.over) return;
    const eld = this.st(hero, 'eldritch');
    if (eld) {
      this.loseHp(hero, 1, 'blood');
      if (this.over) return;
      this.emit({ t: 'area', tiles: this.enemies().map((e) => e.pos), fx: 'soul' });
      for (const e of this.enemies()) this.dealDamage(hero, e, 6 * eld, { fx: 'soul' });
    }
    if (this.over) return;
    const sc = this.st(hero, 'stormcall');
    for (let i = 0; i < sc; i++) {
      const foes = this.enemies();
      if (!foes.length) break;
      const f = this.rng.pick(foes);
      this.emit({ t: 'attack', uid: hero.uid, tgt: f.uid, ranged: true, fx: 'lightning' });
      this.dealDamage(hero, f, 6, { fx: 'lightning' });
    }
    this.relicHook('onTurnEnd');
    if (this.over) return;
    this.endOfTurnStatuses(hero);
    if (this.over) return;
    // enemy hazards under the hero
    for (const f of s.tiles.filter((f) => f.kind === 'hazard' && f.pos === hero.pos)) this.dealDamage(null, hero, f.n, { fx: 'fire' });
    if (this.over) return;
    // discard hand
    const keep: CardInst[] = [];
    for (const c of s.hand) {
      const sp = this.specOf(c);
      delete c.tc;
      if (sp.retain) keep.push(c);
      else if (sp.ethereal) this.exhaustCard(c);
      else s.discard.push(c);
    }
    s.hand = keep;
    this.emit({ t: 'draw', n: 0 });
    this.enemyPhase();
  }

  private enemyPhase(): void {
    const s = this.s;
    s.phase = 'enemy';
    this.emit({ t: 'turn', side: 'enemy', turn: s.turn });
    // allies act first
    for (const a of this.allies().sort((x, y) => this.distToNearestEnemy(x) - this.distToNearestEnemy(y))) {
      if (this.over) return;
      this.allyAct(a);
      this.cleanup();
    }
    if (this.over) return;
    const order = this.enemies().sort((a, b) => this.dist(a, this.hero) - this.dist(b, this.hero));
    for (const e of order) {
      if (!e.alive) continue;
      this.enemyAct(e);
      this.cleanup();
      if (this.over) return;
    }
    // bombs & hazards tick
    for (const f of s.tiles.slice()) {
      if (f.timer === undefined) continue;
      f.timer--;
      if (f.timer <= 0) {
        if (f.kind === 'bomb') this.explodeBomb(f);
        else {
          s.tiles = s.tiles.filter((x) => x.id !== f.id);
          this.emit({ t: 'tile', fx: f, on: false });
        }
      } else this.emit({ t: 'tile', fx: f, on: true });
      if (this.over) return;
    }
    this.cleanup();
    if (this.checkEnd()) return;
    for (const e of this.enemies()) this.chooseIntent(e);
    this.startPlayerTurn();
  }

  private distToNearestEnemy(u: Unit): number {
    const f = this.nearestFoe(u);
    return f ? this.dist(u, f) : 99;
  }

  private allyAct(a: Unit): void {
    const def = ALLIES[a.def];
    a.block = 0;
    if (!def || def.passive) {
      this.endOfTurnStatuses(a);
      return;
    }
    const p = this.st(a, 'poison');
    if (p) {
      this.loseHp(a, p, 'poison');
      this.applyStatus(a, 'poison', -1);
      if (!a.alive) return;
    }
    if (this.st(a, 'stun')) {
      this.applyStatus(a, 'stun', -1);
      return;
    }
    if (def.pulse) {
      const times = 1 + this.st(this.hero, 'totemEcho');
      for (let i = 0; i < times && !this.over; i++) this.totemPulse(a);
      this.endOfTurnStatuses(a);
      return;
    }
    if (def.aoe) {
      const targets = this.enemies().filter((e) => this.dist(a, e) <= def.range);
      if (targets.length) {
        this.emit({ t: 'cast', uid: a.uid, fx: 'lightning', tiles: this.tilesAround(a.pos, def.range) });
        for (const t of targets) this.dealDamage(a, t, this.calcAttack(a, t, def.dmg), { attack: true, fx: 'lightning', melee: false });
      }
    } else {
      let t = this.nearestFoe(a);
      if (t && this.dist(a, t) > def.range && def.speed > 0) {
        this.walkToward(a, t.pos, def.speed, def.range);
        t = this.nearestFoe(a);
      }
      if (t && a.alive && this.dist(a, t) <= def.range) {
        this.emit({ t: 'attack', uid: a.uid, tgt: t.uid, ranged: def.range > 1, fx: def.range > 1 ? (def.applies?.doom ? 'soul' : 'arrow') : undefined });
        this.dealDamage(a, t, this.calcAttack(a, t, def.dmg), { attack: true, fx: def.range > 1 ? 'arrow' : 'slash' });
        if (def.applies && t.alive) for (const [st, n] of Object.entries(def.applies)) this.applyStatus(t, st, n, this.hero);
      }
    }
    this.endOfTurnStatuses(a);
  }

  private enemyAct(e: Unit): void {
    const def = ENEMIES[e.def];
    // start of enemy turn
    if (this.st(e, 'retainBlock')) this.applyStatus(e, 'retainBlock', -1);
    else if (e.block) {
      e.block = 0;
      this.emit({ t: 'block', uid: e.uid, amount: 0, block: 0 });
    }
    this.clearTemp(e);
    const p = this.st(e, 'poison');
    if (p) {
      this.loseHp(e, p, 'poison');
      this.applyStatus(e, 'poison', -1);
      if (!e.alive) return;
    }
    if (this.st(e, 'stun')) {
      this.applyStatus(e, 'stun', -1);
      e.mem = e.mem ?? {};
      e.mem.stunned = (e.mem.stunned ?? 0) + 1;
      this.emit({ t: 'text', uid: e.uid, text: TXT.stunned, color: '#f5d442' });
    } else if (e.intent && def) {
      this.executeIntent(e, def.moves[e.intent.move], e.intent);
    }
    if (e.alive) this.endOfTurnStatuses(e);
  }

  private executeIntent(e: Unit, mv: EnemyMove | undefined, it: Intent): void {
    if (!mv) return;
    const def = ENEMIES[e.def];
    const hero = this.hero;
    const dmgMult = this.enemyDmgMult();
    const baseDmg = mv.dmg !== undefined ? Math.round(mv.dmg * dmgMult) : 0;
    switch (mv.kind) {
      case 'attack':
      case 'charge': {
        const range = mv.range ?? 1;
        let tgt = this.nearestFoe(e);
        if (!tgt) break;
        if (mv.kind === 'charge') this.walkToward(e, tgt.pos, mv.charge ?? 3, 1, 'dash');
        else if (this.dist(e, tgt) > range) this.walkToward(e, tgt.pos, def.speed, range);
        if (!e.alive) return;
        tgt = this.nearestFoe(e);
        if (tgt && this.dist(e, tgt) <= (mv.kind === 'charge' ? 1 : range)) {
          this.emit({ t: 'attack', uid: e.uid, tgt: tgt.uid, ranged: range > 1, fx: mv.fx });
          const times = mv.times ?? 1;
          for (let i = 0; i < times; i++) {
            if (!tgt.alive || !e.alive || this.over) break;
            const loss = this.dealDamage(e, tgt, this.calcAttack(e, tgt, baseDmg), { attack: true, fx: mv.fx });
            if (mv.lifesteal && loss > 0) this.heal(e, loss);
          }
          if (tgt.alive && e.alive && !this.over) {
            if (mv.target) for (const [s, n] of Object.entries(mv.target)) this.applyStatus(tgt, s, n, e);
            if (mv.push) this.push(tgt, Math.sign(tgt.pos - e.pos) || -1, mv.push);
            if (mv.pull) this.pull(tgt, e, mv.pull);
            if (mv.steal && tgt.side === 'hero') {
              const g = Math.min(this.run.gold, mv.steal);
              this.run.gold -= g;
              this.s.goldStolen += g;
              e.mem = e.mem ?? {};
              e.mem.stolen = (e.mem.stolen ?? 0) + g;
              if (g) this.emit({ t: 'text', uid: hero.uid, text: L(TXT.steal.tr.replace('{n}', String(g)), TXT.steal.en.replace('{n}', String(g))), color: '#ffd35a' });
            }
            if (mv.addCards) this.addCard(mv.addCards.card, mv.addCards.n, mv.addCards.to);
          }
        } else {
          this.emit({ t: 'text', uid: e.uid, text: TXT.outOfReach, color: '#aaa' });
        }
        break;
      }
      case 'area': {
        const tiles = it.tiles ?? [];
        this.emit({ t: 'cast', uid: e.uid, fx: mv.fx, tiles });
        this.emit({ t: 'area', tiles, fx: mv.fx ?? 'slam' });
        this.emit({ t: 'shake', power: 2 });
        for (const f of this.foesOf(e).filter((f) => tiles.includes(f.pos))) {
          const times = mv.times ?? 1;
          for (let i = 0; i < times; i++) {
            if (!f.alive || this.over) break;
            this.dealDamage(e, f, this.calcAttack(e, f, baseDmg), { attack: true, fx: mv.fx, melee: false });
          }
          if (f.alive && !this.over) {
            if (mv.target) for (const [s, n] of Object.entries(mv.target)) this.applyStatus(f, s, n, e);
            if (mv.push) this.push(f, Math.sign(f.pos - e.pos) || -1, mv.push);
          }
        }
        break;
      }
      case 'move': {
        this.walkToward(e, hero.pos, def.speed, 1);
        break;
      }
      case 'retreat': {
        this.walkAway(e, hero.pos, def.speed);
        break;
      }
      case 'summon': {
        for (const sid of mv.summon ?? []) this.spawnEnemy(sid, e.pos + (Math.sign(e.pos - hero.pos) || 1), def.tier === 'boss' ? e.uid : undefined);
        this.emit({ t: 'cast', uid: e.uid, fx: 'summon' });
        break;
      }
      case 'escape': {
        e.alive = false;
        this.s.flags.escapedGold = (this.s.flags.escapedGold ?? 0) + (e.mem?.stolen ?? 0);
        this.s.escaped.push(e.def);
        this.emit({ t: 'text', uid: e.uid, text: TXT.escaped, color: '#ffd35a' });
        this.emit({ t: 'death', uid: e.uid });
        this.checkEnd();
        return;
      }
      case 'debuff': {
        this.emit({ t: 'cast', uid: e.uid, fx: mv.fx ?? 'curse' });
        if (mv.target) for (const [s, n] of Object.entries(mv.target)) this.applyStatus(hero, s, n, e);
        if (mv.addCards) this.addCard(mv.addCards.card, mv.addCards.n, mv.addCards.to);
        break;
      }
      default:
        break;
    }
    if (!e.alive || this.over) return;
    // shared extras (block/buff/heal) for any intent kind
    if (mv.block) this.gainBlock(e, mv.block, false);
    if (mv.self) for (const [s, n] of Object.entries(mv.self)) this.applyStatus(e, s, n, e);
    if (mv.allies)
      for (const a of this.enemies().filter((a) => a.uid !== e.uid)) for (const [s, n] of Object.entries(mv.allies)) this.applyStatus(a, s, n, e);
    if (mv.heal) this.heal(e, mv.heal);
    if (mv.healAllies) for (const a of this.enemies()) this.heal(a, mv.healAllies);
    if (mv.kind !== 'debuff' && mv.kind !== 'attack' && mv.kind !== 'charge' && mv.kind !== 'area' && mv.addCards)
      this.addCard(mv.addCards.card, mv.addCards.n, mv.addCards.to);
    if ((mv.kind === 'buff' || mv.kind === 'block' || mv.kind === 'heal') && !mv.fx) this.emit({ t: 'cast', uid: e.uid, fx: mv.kind });
  }

  chooseIntent(e: Unit): void {
    const def = ENEMIES[e.def];
    if (!def) return;
    const hero = this.hero;
    const hist = e.hist ?? (e.hist = []);
    const ctx: AiCtx = {
      me: e,
      hero,
      turn: hist.length + 1,
      dist: this.dist(e, hero),
      allies: this.enemies().filter((a) => a.uid !== e.uid),
      rng: this.rng,
      last: hist[hist.length - 1],
      count: (m: string) => hist.filter((h) => h === m).length,
      freeTiles: Array.from({ length: this.s.lane }, (_, i) => i).filter((p) => this.isFree(p)).length,
    };
    let move = def.ai(ctx);
    if (!def.moves[move]) move = Object.keys(def.moves)[0];
    hist.push(move);
    const mv = def.moves[move];
    const it: Intent = { move, kind: mv.kind };
    if (mv.dmg !== undefined) {
      it.dmg = Math.round(mv.dmg * this.enemyDmgMult());
      it.times = mv.times ?? 1;
    }
    if (mv.kind === 'attack') it.range = mv.range ?? 1;
    if (mv.kind === 'charge') it.range = (mv.charge ?? 3) + 1;
    if (mv.kind === 'area') {
      const tiles = new Set<number>();
      if (mv.aroundTarget !== undefined) {
        const tgt = this.nearestFoe(e) ?? hero;
        for (const p of this.tilesAround(tgt.pos, mv.aroundTarget)) tiles.add(p);
      }
      if (mv.front !== undefined) {
        const dir = Math.sign(hero.pos - e.pos) || -1;
        for (let i = 1; i <= mv.front; i++) if (this.inLane(e.pos + dir * i)) tiles.add(e.pos + dir * i);
      }
      if (mv.radius !== undefined) for (const p of this.tilesAround(e.pos, mv.radius)) if (p !== e.pos) tiles.add(p);
      it.tiles = [...tiles].sort((a, b) => a - b);
    }
    if (mv.block) it.n = mv.block;
    e.intent = it;
    this.emit({ t: 'intent', uid: e.uid });
  }

  /* ============================================================ potions */

  usePotion(slot: number, tgtUid?: number): boolean {
    const id = this.run.potions[slot];
    if (!id || this.s.phase !== 'player') return false;
    const pd = POTIONS[id];
    const hero = this.hero;
    let tgt: Unit | undefined;
    if (pd.target === 'enemy') {
      tgt = this.unit(tgtUid);
      if (!tgt || tgt.side !== 'enemy') return false;
    }
    this.run.potions[slot] = null;
    const mult = this.hasRelic('alchemistFlask') ? 1.5 : 1;
    const k = (v: number) => Math.floor(v * mult);
    this.emit({ t: 'cast', uid: hero.uid, fx: 'potion' });
    switch (id) {
      case 'healing':
        this.heal(hero, k(hero.maxHp * 0.25));
        break;
      case 'strength':
        this.applyStatus(hero, 'strength', k(2), hero);
        break;
      case 'dexterity':
        this.applyStatus(hero, 'dexterity', k(2), hero);
        break;
      case 'energy':
        this.s.energy += k(2);
        this.emit({ t: 'energy', n: this.s.energy });
        break;
      case 'fire':
        if (tgt) this.dealDamage(hero, tgt, k(20), { fx: 'fire' });
        break;
      case 'frost':
        for (const f of this.enemies()) {
          this.applyStatus(f, 'root', k(2), hero);
          this.applyStatus(f, 'weak', k(1), hero);
        }
        break;
      case 'poison':
        if (tgt) this.applyStatus(tgt, 'poison', k(7), hero);
        break;
      case 'stoneskin':
        this.gainBlock(hero, k(14), false);
        break;
      case 'swift':
        this.s.mp += k(3);
        break;
      case 'insight':
        this.drawCards(k(3));
        break;
      case 'fear':
        if (tgt) this.applyStatus(tgt, 'vulnerable', k(3), hero);
        break;
      case 'regen':
        this.applyStatus(hero, 'regen', k(5), hero);
        break;
      case 'explosive':
        this.emit({ t: 'area', tiles: this.enemies().map((e) => e.pos), fx: 'explosion' });
        for (const f of this.enemies()) this.dealDamage(hero, f, k(10), { fx: 'fire' });
        break;
      case 'ghost':
        this.applyStatus(hero, 'dodge', k(2), hero);
        break;
      case 'fairy':
        this.heal(hero, k(hero.maxHp * 0.3));
        break;
      case 'cleanse':
        this.custom('cleanse', { src: hero, x: 0, killed: false, lastUnblocked: 0 }, 0, 0);
        this.gainBlock(hero, k(8), false);
        break;
    }
    this.cleanup();
    this.checkEnd();
    return true;
  }

  /* ============================================================ helpers for AI/bot */

  /** snapshot used by tests / simulation */
  summary(): string {
    return this.s.units
      .filter((u) => u.alive)
      .map((u) => `${u.def}@${u.pos}:${u.hp}/${u.maxHp}${u.block ? '+' + u.block : ''}`)
      .join(' ');
  }
}
