import { t, type LStr } from '../../i18n/i18n';
import { S } from '../../i18n/strings';
import type { App } from '../app';
import { h, sleep, anim, vibrate, onPress } from '../dom';
import { iconImg, iconUrl, spriteUrl, battleBackdrop } from '../../gfx/render';
import { getCombat, finishCombat, enemyAct } from '../../engine/run';
import type { Combat } from '../../engine/combat';
import type { CardInst, CEvent, Unit, TileFx } from '../../engine/types';
import { ENEMIES } from '../../data/enemies';
import { ALLIES } from '../../data/allies';
import { STATUSES } from '../../data/statuses';
import { POTIONS } from '../../data/potions';
import { CARDS } from '../../data/cards';
import { audio, type Sfx } from '../../audio/audio';
import { cardEl, deckModal, previewCard, showTip, hideTip, statusTipHtml, toast, potionTipHtml, modal } from '../components';

interface UnitView {
  hp: number;
  maxHp: number;
  block: number;
  pos: number;
  st: Record<string, number>;
}

const FX_COLOR: Record<string, string> = {
  explosion: '#ff8a2a',
  fire: '#ff6a2a',
  slam: '#c9a07a',
  soul: '#b38cff',
  spores: '#8fd35a',
  beam: '#ff4d6a',
  crystal: '#8fe3ff',
  trap: '#caa66a',
  holy: '#ffe066',
  lightning: '#8fd3ff',
  acid: '#9dff5a',
  slash: '#ffffff',
  ice: '#bfe8ff',
};

const PROJECTILE: Record<string, [string, string]> = {
  arrow: ['arrow', '#e8e2cf'],
  fire: ['fire', '#ff8a2a'],
  ice: ['ice', '#bfe8ff'],
  lightning: ['lightning', '#ffe066'],
  arcane: ['star', '#b38cff'],
  shadow: ['soul', '#9b6bd6'],
  soul: ['soul', '#b38cff'],
  holy: ['sun', '#ffe066'],
  knife: ['dagger', '#e8e2cf'],
  rock: ['wall', '#9c9484'],
  acid: ['drop', '#9dff5a'],
  spores: ['cloud', '#8fd35a'],
  bullet: ['star', '#ffd35a'],
  explosion: ['bomb', '#ff8a2a'],
  wind: ['wind', '#dfe9f5'],
  axe: ['axe', '#c3c8d4'],
};

const SFX_FOR_FX: Record<string, Sfx> = {
  fire: 'fire',
  explosion: 'boom',
  ice: 'ice',
  lightning: 'zap',
  arrow: 'arrow',
  knife: 'arrow',
  arcane: 'magic',
  shadow: 'magic',
  soul: 'magic',
  holy: 'magic',
};

export class BattleScreen {
  app: App;
  c: Combat;
  el: HTMLElement;
  field!: HTMLElement;
  lane!: HTMLElement;
  unitsLayer!: HTMLElement;
  fx!: HTMLElement;
  hand!: HTMLElement;
  hud!: HTMLElement;
  topbar!: HTMLElement;
  relicbar!: HTMLElement;
  tiles: HTMLElement[] = [];
  unitEls = new Map<number, HTMLElement>();
  view = new Map<number, UnitView>();
  energyView = 0;
  selected: number | null = null;
  potionSlot: number | null = null;
  busy = false;
  destroyed = false;
  hintEl: HTMLElement | null = null;
  resizeObs: ResizeObserver | null = null;

  constructor(app: App) {
    this.app = app;
    this.c = getCombat(app.run!)!;
    this.el = h('div', { class: 'screen battle' });
    this.build();
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObs?.disconnect();
    hideTip();
  }

  /* ================================================================ layout */

  private build(): void {
    const run = this.app.run!;
    this.topbar = this.app.topBar({ onPotion: (i) => this.onPotion(i) });
    this.relicbar = this.app.relicBar();
    this.el.append(this.topbar, this.relicbar);
    this.field = h('div', { class: 'field' });
    this.field.style.backgroundImage = `url(${battleBackdrop(enemyAct(run), run.floor)})`;
    this.lane = h('div', { class: 'lane' });
    for (let i = 0; i < this.c.s.lane; i++) {
      const tile = h('div', { class: 'tile', dataset: { tile: String(i) } });
      tile.addEventListener('click', () => this.onTile(i));
      this.tiles.push(tile);
      this.lane.append(tile);
    }
    this.unitsLayer = h('div', { class: 'units' });
    this.fx = h('div', { class: 'fxlayer' });
    this.field.append(this.lane, this.unitsLayer, this.fx);
    this.el.append(this.field);
    this.hud = h('div', { class: 'hud' });
    this.el.append(this.hud);
    this.hand = h('div', { class: 'hand' });
    this.el.append(this.hand);
    this.field.addEventListener('click', (e) => {
      if (e.target === this.field || e.target === this.unitsLayer) this.deselect();
    });
    this.resizeObs = new ResizeObserver(() => this.layoutUnits());
    this.resizeObs.observe(this.field);
  }

  start(): void {
    this.c.flush();
    this.syncView();
    this.renderAll();
    if (this.c.over) {
      void this.finish();
      return;
    }
    if (this.c.s.turn <= 1) void this.banner(t(S.yourTurn), '#ffe08a');
    if (!this.app.profile.tutorial.combat) this.showTutorial();
  }

  private showTutorial(): void {
    const box = h('div', { class: 'hint-box', style: { top: '96px' } });
    const tr = t({
      tr: '<b>Savaşa hoş geldin!</b><br>• Bir <b>karta dokun</b>, sonra parlayan <b>hedefe</b> dokun.<br>• <b>Yeşil karelere</b> dokunarak yürü (hareket puanı).<br>• Düşmanların üstündeki simge <b>niyetlerini</b> gösterir. Kırmızı kareler alan saldırısıdır!<br>• Enerjin bitince <b>Turu Bitir</b>.',
      en: '<b>Welcome to battle!</b><br>• <b>Tap a card</b>, then tap a glowing <b>target</b>.<br>• Tap <b>green tiles</b> to walk (movement points).<br>• The icon above enemies shows their <b>intent</b>. Red tiles are area attacks!<br>• When out of energy, <b>End Turn</b>.',
    });
    box.innerHTML = tr;
    const ok = h('button', { class: 'btn gold small wide' }, 'OK');
    ok.addEventListener('click', () => {
      box.remove();
      this.app.profile.tutorial.combat = true;
      this.app.saveProfile();
    });
    box.append(ok);
    this.el.append(box);
  }

  /* ================================================================= view */

  private syncView(): void {
    this.view.clear();
    for (const u of this.c.s.units) {
      if (!u.alive) continue;
      this.view.set(u.uid, { hp: u.hp, maxHp: u.maxHp, block: u.block, pos: u.pos, st: { ...u.st } });
    }
    this.energyView = this.c.s.energy;
  }

  private renderAll(): void {
    this.renderUnits();
    this.renderBossBar();
    this.renderTiles();
    this.renderHud();
    this.renderHand();
  }

  private tileW(): number {
    return this.lane.getBoundingClientRect().width / this.c.s.lane;
  }

  private unitLeft(pos: number): number {
    const lr = this.lane.getBoundingClientRect();
    const fr = this.field.getBoundingClientRect();
    return lr.left - fr.left + pos * this.tileW();
  }

  private layoutUnits(): void {
    if (this.destroyed) return;
    for (const [uid, el] of this.unitEls) {
      const v = this.view.get(uid);
      if (v) this.placeUnit(el, v.pos);
    }
  }

  private placeUnit(el: HTMLElement, pos: number): void {
    const w = this.tileW();
    el.style.width = w + 'px';
    el.style.marginLeft = '0';
    el.style.left = this.unitLeft(pos) + 'px';
  }

  private spriteFor(u: Unit): { id: string; palette?: Record<string, string>; scale: number; flying: boolean } {
    if (u.side === 'hero') return { id: u.def, scale: 1.05, flying: false };
    if (u.side === 'ally') {
      const a = ALLIES[u.def];
      return { id: a.sprite, palette: a.palette, scale: a.scale ?? (u.def === 'mech' || u.def === 'boneGolem' ? 1.15 : 0.9), flying: !!a.flying };
    }
    const e = ENEMIES[u.def];
    return { id: e.sprite, palette: e.palette, scale: e.scale ?? 1, flying: !!e.flying };
  }

  private renderUnits(): void {
    const alive = new Set(this.c.s.units.filter((u) => u.alive).map((u) => u.uid));
    for (const [uid, el] of this.unitEls) {
      if (!alive.has(uid)) {
        el.remove();
        this.unitEls.delete(uid);
      }
    }
    for (const u of this.c.s.units) {
      if (!u.alive) continue;
      if (!this.view.has(u.uid)) this.view.set(u.uid, { hp: u.hp, maxHp: u.maxHp, block: u.block, pos: u.pos, st: { ...u.st } });
      this.renderUnit(u);
    }
  }

  private renderUnit(u: Unit): void {
    let el = this.unitEls.get(u.uid);
    const v = this.view.get(u.uid)!;
    if (!el) {
      const sp = this.spriteFor(u);
      el = h('div', { class: `unit idle ${sp.flying ? 'flying' : ''} side-${u.side}`, dataset: { uid: String(u.uid) } });
      const spr = h('div', { class: 'spr' });
      const img = h('img', { src: spriteUrl(sp.id, sp.palette), alt: '', draggable: 'false' });
      img.style.setProperty('--sc', String(sp.scale));
      spr.append(img, h('div', { class: 'shadow' }));
      el.append(h('div', { class: 'intent' }), spr, h('div', { class: 'hpbar' }), h('div', { class: 'statuses' }));
      const uid = u.uid;
      onPress(
        el,
        () => this.onUnit(uid),
        () => this.unitInfo(uid),
      );
      this.unitsLayer.append(el);
      this.unitEls.set(u.uid, el);
      this.placeUnit(el, v.pos);
    }
    // facing
    const hero = this.c.hero;
    const spr = el.querySelector('.spr') as HTMLElement;
    let faceLeft = false;
    if (u.side === 'enemy') faceLeft = hero.pos < v.pos;
    else {
      const f = this.c.nearestFoe(u);
      faceLeft = !!f && f.pos < v.pos;
    }
    spr.style.transform = faceLeft ? 'scaleX(-1)' : '';
    // hp bar
    const bar = el.querySelector('.hpbar') as HTMLElement;
    const pct = Math.max(0, (v.hp / v.maxHp) * 100);
    bar.className = `hpbar ${v.block > 0 ? 'blocked' : ''} ${v.st.poison ? 'poisoned' : ''}`;
    bar.innerHTML = `<div class="lag" style="width:${pct}%"></div><div class="fill" style="width:${pct}%"></div><div class="hptext">${v.hp}/${v.maxHp}</div>${
      v.block > 0 ? `<div class="blockbadge"><img src="${iconUrl('shield', '#6fa8dc')}">${v.block}</div>` : ''
    }`;
    // statuses
    const stEl = el.querySelector('.statuses') as HTMLElement;
    stEl.innerHTML = Object.entries(v.st)
      .filter(([k, n]) => STATUSES[k] && !STATUSES[k].hidden && n !== 0)
      .map(([k, n]) => `<div class="st"><img src="${iconUrl(STATUSES[k].icon, STATUSES[k].color)}"><b>${n}</b></div>`)
      .join('');
    // intent
    const intEl = el.querySelector('.intent') as HTMLElement;
    intEl.innerHTML = u.side === 'enemy' ? this.intentHtml(u) : '';
    intEl.className = `intent ${u.intent?.kind === 'attack' || u.intent?.kind === 'charge' || u.intent?.kind === 'area' ? 'attack' : ''}`;
  }

  private intentHtml(u: Unit): string {
    const it = u.intent;
    if (!it) return '';
    const dmg = it.dmg !== undefined ? this.c.intentDamage(u) : 0;
    const times = it.times && it.times > 1 ? `×${it.times}` : '';
    switch (it.kind) {
      case 'attack':
        return `${iconImg('sword', '#ff9a8a', '')}<span>${dmg}${times}</span>${(it.range ?? 1) > 1 ? `<span class="rng">◎${it.range}</span>` : ''}`;
      case 'charge':
        return `${iconImg('boot', '#ff9a8a', '')}<span>${dmg}${times}</span><span class="rng">»${(it.range ?? 2) - 1}</span>`;
      case 'area':
        return `${iconImg('explosion', undefined, '')}<span>${dmg}${times}</span>`;
      case 'block':
        return iconImg('shield', '#6fa8dc', '');
      case 'buff':
        return iconImg('star', '#ffd35a', '');
      case 'debuff':
        return iconImg('skull', undefined, '');
      case 'summon':
        return iconImg('soul', '#b38cff', '');
      case 'heal':
        return iconImg('heart', undefined, '');
      case 'move':
        return iconImg('boot', '#c3c8d4', '');
      case 'retreat':
        return iconImg('wind', '#c3c8d4', '');
      case 'escape':
        return iconImg('coin', undefined, '');
      case 'stun':
        return iconImg('stars', undefined, '');
      default:
        return iconImg('question', '#c3c8d4', '');
    }
  }

  private intentText(u: Unit): string {
    const it = u.intent;
    if (!it) return '';
    const d = it.dmg !== undefined ? this.c.intentDamage(u) : 0;
    const tm = it.times && it.times > 1 ? t(S.times, { n: it.times }) : '';
    const def = ENEMIES[u.def];
    const mv = def?.moves[it.move];
    const name = mv?.name ? `<b>${t(mv.name)}</b>: ` : '';
    switch (it.kind) {
      case 'attack':
        return name + t(S.intentAttack, { d, t: tm }) + ((it.range ?? 1) > 1 ? ` · ${t(S.intentRange, { r: it.range ?? 1 })}` : '');
      case 'charge':
        return name + t(S.intentCharge, { r: (it.range ?? 2) - 1, d });
      case 'area':
        return name + t(S.intentArea, { d: d + tm });
      case 'block':
        return name + t(S.intentBlock);
      case 'buff':
        return name + t(S.intentBuff);
      case 'debuff':
        return name + t(S.intentDebuff);
      case 'summon':
        return name + t(S.intentSummon);
      case 'heal':
        return name + t(S.intentHeal);
      case 'move':
        return name + t(S.intentMove);
      case 'retreat':
        return name + t(S.intentRetreat);
      case 'escape':
        return name + t(S.intentEscape);
      case 'stun':
        return t(S.intentStun);
      default:
        return '';
    }
  }

  private unitInfo(uid: number): void {
    const u = this.c.unit(uid);
    const el = this.unitEls.get(uid);
    if (!u || !el) return;
    let name = '';
    if (u.side === 'hero') name = t({ tr: 'Sen', en: 'You' });
    else if (u.side === 'ally') name = t(ALLIES[u.def].name) + (ALLIES[u.def].dmg ? ` · ⚔${ALLIES[u.def].dmg} ◎${ALLIES[u.def].range}` : '');
    else name = t(ENEMIES[u.def].name);
    let html = `<h4>${name}</h4><div class="muted">${u.hp}/${u.maxHp} ${t(S.hp)}${u.block ? ` · ${u.block} 🛡` : ''}</div>`;
    if (u.side === 'enemy') html += `<div style="margin-top:4px">${this.intentText(u)}</div>`;
    html += statusTipHtml(u);
    showTip(el, html);
  }

  private renderTiles(): void {
    const c = this.c;
    const sel = this.selectedCard();
    let targetTiles = new Set<number>();
    const targetUnits = new Set<number>();
    if (sel && this.selected !== null) {
      const vt = c.validTargets(sel);
      vt.tiles.forEach((x) => targetTiles.add(x));
      vt.units.forEach((x) => targetUnits.add(x));
    }
    if (this.potionSlot !== null) for (const e of c.enemies()) targetUnits.add(e.uid);
    const walk = new Set(sel || this.potionSlot !== null || this.busy || c.s.phase !== 'player' ? [] : c.heroMoveTiles());
    const danger = new Set<number>();
    for (const e of c.enemies()) if (e.intent?.kind === 'area') for (const x of e.intent.tiles ?? []) danger.add(x);
    if (sel && c.specOf(sel).target === 'enemy') targetTiles = new Set();
    this.tiles.forEach((el, i) => {
      el.className = `tile ${walk.has(i) ? 'walk' : ''} ${targetTiles.has(i) ? 'target' : ''} ${danger.has(i) ? 'danger' : ''}`;
      el.innerHTML = '';
      const fx = c.s.tiles.find((f) => f.pos === i);
      if (fx) el.append(this.tileFxEl(fx));
    });
    for (const [uid, el] of this.unitEls) el.classList.toggle('targetable', targetUnits.has(uid));
  }

  private tileFxEl(fx: TileFx): HTMLElement {
    const icon = fx.kind === 'bomb' ? 'bomb' : fx.kind === 'hazard' ? 'fire' : fx.trap === 'spike' ? 'spikes' : fx.trap === 'mine' || fx.trap === 'explosive' ? 'bomb' : fx.trap === 'frost' ? 'ice' : 'trap';
    const el = h('div', { class: 'tilefx', html: iconImg(icon, fx.trap === 'frost' ? '#bfe8ff' : '#c3c8d4', '') });
    (el.firstChild as HTMLElement).style.width = '100%';
    (el.firstChild as HTMLElement).style.height = '100%';
    if (fx.timer !== undefined) el.append(h('span', { class: 'timer' }, String(fx.timer)));
    return el;
  }

  private renderHud(): void {
    const c = this.c;
    this.hud.innerHTML = '';
    const energy = h('div', { class: `energy ${this.energyView <= 0 ? 'empty' : ''}` }, `${this.energyView}/${c.heroEnergy()}`);
    energy.style.fontSize = '20px';
    const mp = h('div', { class: 'mp', html: `${iconImg('boot', '#9ee37d', '')}<span>${c.s.mp}</span>` });
    const piles = h('div', { class: 'piles' });
    const mkPile = (label: string, n: number, cards: CardInst[], color: string) => {
      const p = h('button', { class: 'pile', style: { borderColor: color } }, String(n), h('small', {}, label));
      p.addEventListener('click', () => deckModal(cards, { title: `${label} (${cards.length})` }));
      return p;
    };
    piles.append(mkPile(t(S.drawPile), c.s.draw.length, c.s.draw.slice().sort((a, b) => a.id.localeCompare(b.id)), '#6a5a8a'));
    piles.append(mkPile(t(S.discardPile), c.s.discard.length, c.s.discard, '#8a6a4a'));
    if (c.s.exhaust.length) piles.append(mkPile(t(S.exhaustPile), c.s.exhaust.length, c.s.exhaust, '#4a4a4a'));
    const anyPlayable = c.s.hand.some((x) => c.canPlay(x).ok);
    const end = h('button', { class: `btn red endturn ${!anyPlayable && c.s.mp === 0 && !this.busy ? 'pulse' : ''} ${this.busy || c.s.phase !== 'player' ? 'disabled' : ''}` }, t(S.endTurn));
    end.addEventListener('click', () => this.endTurn());
    const left = h('div', { class: 'row' }, energy, mp);
    this.hud.append(left, piles, end);
  }

  private selectedCard(): CardInst | undefined {
    return this.selected === null ? undefined : this.c.s.hand.find((x) => x.uid === this.selected);
  }

  private renderHand(): void {
    const c = this.c;
    this.hand.innerHTML = '';
    const cards = c.s.hand;
    const n = cards.length;
    if (!n) return;
    const W = this.hand.clientWidth || Math.min(480, window.innerWidth);
    const cw = parseFloat(getComputedStyle(this.hand).getPropertyValue('--cw')) || (window.innerHeight >= 800 ? 104 : window.innerHeight <= 640 ? 84 : 96);
    const spacing = n > 1 ? Math.min(cw * 0.92, (W - cw - 44) / (n - 1)) : 0;
    const total = spacing * (n - 1);
    const sel = this.selectedCard();
    const tgt = sel ? undefined : undefined;
    cards.forEach((card, i) => {
      const chk = c.canPlay(card);
      const el = cardEl(card, { combat: c, target: tgt, cost: c.costOf(card) });
      el.classList.add(chk.ok ? 'playable' : 'cantplay');
      if (c.specOf(card).unplayable) el.classList.add('unplayable');
      const mid = (n - 1) / 2;
      const off = i - mid;
      const x = -total / 2 + i * spacing;
      const rot = off * (n > 6 ? 2 : 3);
      const y = Math.abs(off) * Math.abs(off) * 2.2;
      const isSel = this.selected === card.uid;
      el.style.transform = isSel ? `translate(calc(-50% + ${x}px), -38px) scale(1.12)` : `translate(calc(-50% + ${x}px), ${y}px) rotate(${rot}deg)`;
      el.style.zIndex = String(isSel ? 50 : 10 + i);
      if (isSel) {
        el.classList.add('selected');
        const sp = c.specOf(card);
        const hint = sp.target === 'none' ? t(S.tapToPlay) : sp.target === 'enemy' || sp.target === 'ally' ? t(S.selectTarget) : t(S.selectTile);
        const hintEl = h('div', { class: 'card-hint' }, hint);
        hintEl.style.left = `${Math.max(100, Math.min(W - 100, W / 2 + x))}px`;
        hintEl.style.top = '-66px';
        this.hand.append(hintEl);
      }
      this.bindCard(el, card);
      this.hand.append(el);
    });
  }

  private bindCard(el: HTMLElement, card: CardInst): void {
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let pressed = false;
    let longTimer: number | undefined;
    let longFired = false;
    const baseTransform = () => el.style.transform;
    let orig = '';
    el.addEventListener('pointerdown', (e) => {
      if (this.busy) return;
      pressed = true;
      longFired = false;
      startX = e.clientX;
      startY = e.clientY;
      orig = baseTransform();
      el.setPointerCapture(e.pointerId);
      longTimer = window.setTimeout(() => {
        if (!dragging && pressed) {
          longFired = true;
          previewCard(card);
        }
      }, 480);
    });
    el.addEventListener('pointermove', (e) => {
      if (!pressed) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging && (Math.abs(dy) > 18 || Math.abs(dx) > 18) && dy < 0) {
        dragging = true;
        clearTimeout(longTimer);
        el.classList.add('dragging');
        if (this.selected !== card.uid) this.select(card, false);
      }
      if (dragging) {
        el.style.transform = `translate(calc(-50% + ${dx}px), ${dy}px) scale(0.9)`;
        el.style.pointerEvents = 'none';
        const under = document.elementFromPoint(e.clientX, e.clientY);
        el.style.pointerEvents = '';
        this.tiles.forEach((tl) => tl.classList.remove('pick'));
        const tile = under?.closest('.tile') as HTMLElement | null;
        const unit = under?.closest('.unit') as HTMLElement | null;
        if (unit) {
          const v = this.view.get(Number(unit.dataset.uid));
          if (v) this.tiles[v.pos]?.classList.add('pick');
        } else if (tile) tile.classList.add('pick');
      }
    });
    const up = (e: PointerEvent) => {
      if (!pressed) return;
      pressed = false;
      clearTimeout(longTimer);
      if (longFired) return;
      if (dragging) {
        dragging = false;
        el.classList.remove('dragging');
        el.style.pointerEvents = 'none';
        const under = document.elementFromPoint(e.clientX, e.clientY);
        el.style.pointerEvents = '';
        this.tiles.forEach((tl) => tl.classList.remove('pick'));
        const unit = under?.closest('.unit') as HTMLElement | null;
        const tile = under?.closest('.tile') as HTMLElement | null;
        const inField = !!under?.closest('.field');
        const sp = this.c.specOf(card);
        if (unit) this.tryPlay(card, { uid: Number(unit.dataset.uid) });
        else if (tile) this.tryPlay(card, { tile: Number(tile.dataset.tile) });
        else if (inField && sp.target === 'none') this.tryPlay(card, {});
        else {
          el.style.transform = orig;
          this.renderHand();
        }
        return;
      }
      this.onCardTap(card);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => {
      pressed = false;
      dragging = false;
      clearTimeout(longTimer);
      el.classList.remove('dragging');
      this.renderHand();
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /* ============================================================ input */

  private onCardTap(card: CardInst): void {
    if (this.busy || this.c.s.phase !== 'player') return;
    const chk = this.c.canPlay(card);
    if (!chk.ok) {
      audio.sfx('error');
      if (chk.reason) toast(t(chk.reason));
      return;
    }
    if (this.selected === card.uid) {
      const sp = this.c.specOf(card);
      if (sp.target === 'none') this.tryPlay(card, {});
      else {
        // auto-target when there is exactly one option
        const vt = this.c.validTargets(card);
        if (vt.units.length === 1 && (sp.target === 'enemy' || sp.target === 'ally')) this.tryPlay(card, { uid: vt.units[0] });
        else this.deselect();
      }
      return;
    }
    this.select(card, true);
  }

  private select(card: CardInst, sound: boolean): void {
    this.potionSlot = null;
    this.selected = card.uid;
    if (sound) audio.sfx('click');
    hideTip();
    this.renderHand();
    this.renderTiles();
  }

  private deselect(): void {
    if (this.selected === null && this.potionSlot === null) return;
    this.selected = null;
    this.potionSlot = null;
    this.renderHand();
    this.renderTiles();
  }

  private onUnit(uid: number): void {
    if (this.busy) return;
    if (this.potionSlot !== null) {
      const u = this.c.unit(uid);
      if (u?.side === 'enemy') this.usePotion(this.potionSlot, uid);
      return;
    }
    const card = this.selectedCard();
    if (card) {
      const sp = this.c.specOf(card);
      const u = this.c.unit(uid);
      if (!u) return;
      if (sp.target === 'enemy' || sp.target === 'ally') this.tryPlay(card, { uid });
      else if (sp.target === 'tile' || sp.target === 'empty' || sp.target === 'move') this.tryPlay(card, { tile: u.pos });
      else if (sp.target === 'none') this.tryPlay(card, {});
      return;
    }
    this.unitInfo(uid);
  }

  private onTile(i: number): void {
    if (this.busy || this.c.s.phase !== 'player') return;
    const card = this.selectedCard();
    if (card) {
      const sp = this.c.specOf(card);
      if (sp.target === 'enemy' || sp.target === 'ally') {
        const u = this.c.unitAt(i);
        if (u) this.tryPlay(card, { uid: u.uid });
        else this.deselect();
      } else if (sp.target === 'none') this.tryPlay(card, {});
      else this.tryPlay(card, { tile: i });
      return;
    }
    if (this.potionSlot !== null) {
      const u = this.c.unitAt(i);
      if (u?.side === 'enemy') this.usePotion(this.potionSlot, u.uid);
      return;
    }
    const hero = this.c.hero;
    if (this.c.heroMoveTiles().includes(i)) {
      if (this.c.moveHero(i)) void this.playEvents();
    } else if (i !== hero.pos && !this.c.unitAt(i)) {
      if (this.c.st(hero, 'root')) toast(t(STATUSES.root.name), 'chain', '#7ec8e3');
    }
  }

  private tryPlay(card: CardInst, target: { uid?: number; tile?: number }): void {
    if (this.busy) return;
    const ok = this.c.playCard(card.uid, target);
    if (!ok) {
      audio.sfx('error');
      const chk = this.c.canPlay(card);
      if (!chk.ok && chk.reason) toast(t(chk.reason));
      this.selected = null;
      this.renderHand();
      this.renderTiles();
      return;
    }
    this.selected = null;
    void this.playEvents();
  }

  private onPotion(slot: number): void {
    if (this.busy) return;
    const id = this.app.run!.potions[slot];
    if (!id) return;
    const p = POTIONS[id];
    const body = h('div', { class: 'col center' });
    body.append(h('div', { html: iconImg('potion', p.color, 'ico xl') }), h('div', { html: potionTipHtml(id) }));
    let close = () => {};
    const row = h('div', { class: 'row', style: { gap: '8px', marginTop: '8px' } });
    if (id !== 'fairy')
      row.append(
        h(
          'button',
          {
            class: 'btn green',
            style: { flex: '1' },
            onclick: () => {
              close();
              if (p.target === 'enemy') {
                this.selected = null;
                this.potionSlot = slot;
                toast(t(S.potionPickTarget), 'potion', p.color);
                this.renderHand();
                this.renderTiles();
              } else this.usePotion(slot);
            },
          },
          t(S.potionUse),
        ),
      );
    row.append(
      h(
        'button',
        {
          class: 'btn red',
          style: { flex: '1' },
          onclick: () => {
            close();
            this.app.run!.potions[slot] = null;
            this.refreshTop();
          },
        },
        t(S.potionDiscard),
      ),
    );
    body.append(row);
    close = modal(body, {});
  }

  private usePotion(slot: number, tgt?: number): void {
    this.potionSlot = null;
    if (this.c.usePotion(slot, tgt)) {
      audio.sfx('heal');
      this.refreshTop();
      void this.playEvents();
    }
  }

  private refreshTop(): void {
    const nb = this.app.topBar({ onPotion: (i) => this.onPotion(i) });
    this.topbar.replaceWith(nb);
    this.topbar = nb;
  }

  private endTurn(): void {
    if (this.busy || this.c.s.phase !== 'player') return;
    audio.sfx('click');
    this.selected = null;
    this.potionSlot = null;
    this.c.endTurn();
    void this.playEvents();
  }

  /* ============================================================ playback */

  private async playEvents(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.renderHud();
    this.renderTiles();
    try {
      let evs = this.c.flush();
      while (evs.length) {
        for (const e of evs) {
          if (this.destroyed) return;
          await this.playEvent(e);
        }
        evs = this.c.flush();
      }
    } finally {
      this.busy = false;
    }
    if (this.destroyed) return;
    this.syncView();
    this.renderAll();
    this.refreshTop();
    this.app.save();
    if (this.c.over) await this.finish();
  }

  private unitCenter(uid: number): { x: number; y: number } | null {
    const el = this.unitEls.get(uid);
    if (!el) return null;
    const r = (el.querySelector('.spr') as HTMLElement).getBoundingClientRect();
    const fr = this.field.getBoundingClientRect();
    return { x: r.left - fr.left + r.width / 2, y: r.top - fr.top + r.height / 2 };
  }

  /** pixel particle burst at a unit */
  private burst(uid: number, color: string, count: number, spread = 42): void {
    const p = this.unitCenter(uid);
    if (!p || this.destroyed) return;
    for (let i = 0; i < count; i++) {
      const size = 3 + Math.floor(Math.random() * 4);
      const d = h('div', { class: 'particle', style: { left: p.x + 'px', top: p.y + 'px', width: size + 'px', height: size + 'px', background: i % 3 === 0 ? '#ffffff' : color } });
      this.fx.append(d);
      const ang = Math.random() * Math.PI * 2;
      const dist = spread * (0.4 + Math.random() * 0.8);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 14;
      void anim(
        d,
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.9)`, opacity: 0.9, offset: 0.55 },
          { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 26}px)) scale(0.3)`, opacity: 0 },
        ],
        520 + Math.random() * 260,
        { easing: 'cubic-bezier(.2,.8,.4,1)' },
      ).then(() => d.remove());
    }
  }

  private bossBar: HTMLElement | null = null;
  private bossUid: number | null = null;

  private renderBossBar(): void {
    const boss = this.c.enemies().find((e) => ENEMIES[e.def]?.tier === 'boss');
    if (!boss) {
      this.bossBar?.remove();
      this.bossBar = null;
      return;
    }
    this.bossUid = boss.uid;
    if (!this.bossBar) {
      this.bossBar = h('div', { class: 'bossbar' });
      this.field.append(this.bossBar);
    }
    const v = this.view.get(boss.uid) ?? { hp: boss.hp, maxHp: boss.maxHp, block: boss.block };
    const pct = Math.max(0, (v.hp / v.maxHp) * 100);
    this.bossBar.innerHTML = `<div class="bb-name">${t(ENEMIES[boss.def].name)}</div><div class="bb-track"><div class="bb-lag" style="width:${pct}%"></div><div class="bb-fill" style="width:${pct}%"></div><div class="bb-text">${v.hp} / ${v.maxHp}${v.block ? ` · 🛡 ${v.block}` : ''}</div></div>`;
  }

  private floater(uid: number, text: string, color: string, big = false): void {
    const p = this.unitCenter(uid);
    if (!p) return;
    const f = h('div', { class: 'floater', style: { left: p.x + 'px', top: p.y - 20 + 'px', color, fontSize: big ? '28px' : '20px' } }, text);
    f.style.transform = 'translateX(-50%)';
    this.fx.append(f);
    const dx = (Math.random() - 0.5) * 30;
    void anim(
      f,
      [
        { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
        { transform: `translate(calc(-50% + ${dx / 2}px), -18px) scale(1.15)`, opacity: 1, offset: 0.2 },
        { transform: `translate(calc(-50% + ${dx}px), -46px) scale(1)`, opacity: 0 },
      ],
      900,
    ).then(() => f.remove());
  }

  private updateUnitView(uid: number, patch: Partial<UnitView>): void {
    const v = this.view.get(uid);
    if (!v) return;
    Object.assign(v, patch);
    const u = this.c.s.units.find((x) => x.uid === uid);
    if (u && this.unitEls.has(uid)) this.renderUnit(u);
  }

  private shake(power: number): void {
    if (!this.app.profile.settings.shake) return;
    this.field.classList.remove('shake');
    void this.field.offsetWidth;
    this.field.classList.add('shake');
    if (power >= 2) vibrate(30, this.app.profile.settings.vibrate);
  }

  private async banner(text: string, color: string): Promise<void> {
    const b = h('div', { class: 'turn-banner', style: { color } }, text);
    this.el.append(b);
    await anim(
      b,
      [
        { opacity: 0, transform: 'scaleY(0.2)' },
        { opacity: 1, transform: 'scaleY(1)', offset: 0.15 },
        { opacity: 1, offset: 0.75 },
        { opacity: 0 },
      ],
      900,
    );
    b.remove();
  }

  private async projectile(from: number, to: number, fx?: string): Promise<void> {
    const a = this.unitCenter(from);
    const b = this.unitCenter(to);
    if (!a || !b) return;
    const [icon, tint] = PROJECTILE[fx ?? 'arrow'] ?? PROJECTILE.arrow;
    const img = h('img', { class: 'projectile', src: iconUrl(icon, tint), alt: '' });
    img.style.left = a.x - 9 + 'px';
    img.style.top = a.y - 9 + 'px';
    const flip = b.x < a.x ? ' scaleX(-1)' : '';
    const rot = icon === 'arrow' || icon === 'dagger' ? (b.x < a.x ? 'rotate(-45deg)' : 'rotate(45deg)') : '';
    this.fx.append(img);
    await anim(
      img,
      [
        { transform: `translate(0,0) ${rot}${flip} scale(1.2)` },
        { transform: `translate(${(b.x - a.x) / 2}px, -18px) ${rot}${flip} scale(1.4)`, offset: 0.5 },
        { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) ${rot}${flip} scale(1.2)` },
      ],
      230,
      { easing: 'linear' },
    );
    img.remove();
  }

  private async lunge(uid: number, toward: number): Promise<void> {
    const el = this.unitEls.get(uid)?.querySelector('.spr') as HTMLElement | undefined;
    const a = this.unitCenter(uid);
    const b = this.unitCenter(toward);
    if (!el || !a || !b) return;
    const dx = Math.sign(b.x - a.x) * Math.min(26, Math.abs(b.x - a.x) * 0.4);
    const base = el.style.transform;
    await anim(el, [{ transform: `${base} translateX(0)` }, { transform: `translateX(${dx}px) ${base}`, offset: 0.4 }, { transform: `${base} translateX(0)` }], 220);
  }

  private areaFlash(tiles: number[], fx: string): void {
    if (!tiles.length) return;
    const min = Math.min(...tiles);
    const max = Math.max(...tiles);
    const w = this.tileW();
    const color = FX_COLOR[fx] ?? '#ff8a2a';
    const d = h('div', {
      class: 'area-flash',
      style: {
        left: this.unitLeft(min) + 'px',
        width: (max - min + 1) * w + 'px',
        background: `radial-gradient(ellipse at 50% 100%, ${color}cc, ${color}33 60%, #0000 80%)`,
      },
    });
    this.fx.append(d);
    void anim(d, [{ opacity: 0, transform: 'scaleY(0.3)' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.3 }, { opacity: 0 }], 520).then(() => d.remove());
  }

  private flashRelic(id: string): void {
    const el = this.relicbar.querySelector(`[data-relic="${id}"]`);
    if (!el) return;
    el.classList.remove('flash');
    void (el as HTMLElement).offsetWidth;
    el.classList.add('flash');
    audio.sfx('relic');
  }

  private async playEvent(e: CEvent): Promise<void> {
    switch (e.t) {
      case 'turn':
        if (e.side === 'enemy') {
          this.renderHand();
          await this.banner(t(S.enemyTurn), '#ff9a8a');
        } else {
          audio.sfx('turn');
          this.syncView();
          this.renderAll();
          await this.banner(t(S.yourTurn), '#ffe08a');
        }
        break;
      case 'play': {
        audio.sfx('play');
        this.renderHand();
        const def = CARDS[e.card.id];
        const ghost = cardEl(e.card, { cw: 90 });
        ghost.style.position = 'absolute';
        ghost.style.left = '50%';
        ghost.style.bottom = '10px';
        ghost.style.zIndex = '60';
        ghost.style.pointerEvents = 'none';
        this.el.append(ghost);
        const ty = -(this.hand.clientHeight + 40);
        void anim(
          ghost,
          [
            { transform: 'translateX(-50%) scale(1)', opacity: 1 },
            { transform: `translate(-50%, ${ty}px) scale(0.6)`, opacity: 0.9, offset: 0.6 },
            { transform: `translate(-50%, ${ty - 20}px) scale(0.3)`, opacity: 0 },
          ],
          360,
        ).then(() => ghost.remove());
        void def;
        await sleep(140);
        break;
      }
      case 'attack': {
        const v = this.view.get(e.uid);
        const tv = this.view.get(e.tgt);
        if (!v || !tv) break;
        const sfx = SFX_FOR_FX[e.fx ?? ''];
        if (e.ranged) {
          audio.sfx(sfx ?? 'arrow');
          await this.projectile(e.uid, e.tgt, e.fx);
        } else {
          if (sfx) audio.sfx(sfx);
          await this.lunge(e.uid, e.tgt);
        }
        break;
      }
      case 'dmg': {
        this.updateUnitView(e.uid, { hp: e.hp, block: e.block });
        const el = this.unitEls.get(e.uid);
        if (el) {
          const spr = el.querySelector('.spr img') as HTMLElement;
          spr.classList.remove('hurt');
          void spr.offsetWidth;
          spr.classList.add('hurt');
        }
        if (e.uid === this.bossUid) this.renderBossBar();
        if (e.amount > 0) {
          const big = e.amount >= 15;
          const color = e.fx === 'poison' ? '#9dff5a' : e.fx === 'fire' ? '#ffab5a' : e.fx === 'blood' ? '#ff5d7a' : '#ff5d5d';
          this.burst(e.uid, FX_COLOR[e.fx ?? ''] ?? color, big ? 14 : 7, big ? 60 : 40);
          this.floater(e.uid, String(e.amount), color, big);
          audio.sfx(big ? 'heavy' : 'hit');
          if (big) this.shake(2);
          const u = this.c.s.units.find((x) => x.uid === e.uid);
          if (u?.side === 'hero') {
            this.shake(1);
            vibrate(20, this.app.profile.settings.vibrate);
          }
        } else if (e.blocked > 0) {
          this.floater(e.uid, t({ tr: 'Blok', en: 'Blocked' }), '#8fc3ff');
          audio.sfx('block');
        }
        await sleep(e.fx === 'poison' || e.fx === 'fire' ? 180 : 130);
        break;
      }
      case 'miss':
        this.floater(e.uid, t({ tr: 'Iska!', en: 'Miss!' }), '#dfe9f5');
        audio.sfx('miss');
        await sleep(160);
        break;
      case 'block':
        this.updateUnitView(e.uid, { block: e.block });
        if (e.amount > 0) {
          this.floater(e.uid, '+' + e.amount, '#8fc3ff');
          audio.sfx('block');
          await sleep(120);
        }
        break;
      case 'heal':
        this.updateUnitView(e.uid, { hp: e.hp });
        this.floater(e.uid, '+' + e.amount, '#7ed957');
        audio.sfx('heal');
        await sleep(160);
        break;
      case 'status': {
        const v = this.view.get(e.uid);
        if (!v) break;
        const st = { ...v.st };
        if (e.total <= 0) delete st[e.s];
        else st[e.s] = e.total;
        this.updateUnitView(e.uid, { st });
        const meta = STATUSES[e.s];
        if (meta && !meta.hidden && e.delta > 0 && meta.kind !== 'resource') {
          this.floater(e.uid, `${t(meta.name)}${e.delta > 1 ? ' ' + e.delta : ''}`, meta.color);
          audio.sfx(meta.kind === 'debuff' ? 'debuff' : 'buff');
          await sleep(110);
        } else if (meta?.kind === 'resource' && e.delta > 0) {
          this.floater(e.uid, `+${e.delta} ${t(meta.name)}`, meta.color);
          await sleep(80);
        }
        break;
      }
      case 'move': {
        this.updateUnitView(e.uid, { pos: e.to });
        const el = this.unitEls.get(e.uid);
        if (el) {
          if (e.how === 'blink') {
            await anim(el, [{ opacity: 1 }, { opacity: 0 }], 100);
            this.placeUnit(el, e.to);
            await anim(el, [{ opacity: 0 }, { opacity: 1 }], 120);
          } else {
            this.placeUnit(el, e.to);
            audio.sfx('move');
            await sleep(e.how === 'push' ? 200 : 260);
          }
        }
        // refresh facing for everyone
        for (const u of this.c.s.units) if (u.alive && this.unitEls.has(u.uid)) this.renderUnit(u);
        break;
      }
      case 'cast': {
        const el = this.unitEls.get(e.uid)?.querySelector('.spr') as HTMLElement | undefined;
        const sfx = e.fx ? SFX_FOR_FX[e.fx] : undefined;
        if (e.fx === 'summon') audio.sfx('summon');
        else if (sfx) audio.sfx(sfx);
        else if (e.fx === 'buff' || e.fx === 'block' || e.fx === 'heal') audio.sfx('buff');
        else if (e.fx === 'curse' || e.fx === 'sound' || e.fx === 'web' || e.fx === 'eye') audio.sfx('debuff');
        if (el) await anim(el, [{ filter: 'brightness(1)' }, { filter: 'brightness(2.2) drop-shadow(0 0 6px #fff)' }, { filter: 'brightness(1)' }], 260);
        break;
      }
      case 'area':
        this.areaFlash(e.tiles, e.fx);
        if (e.fx === 'explosion') audio.sfx('boom');
        await sleep(220);
        break;
      case 'shake':
        this.shake(e.power);
        break;
      case 'death': {
        const el = this.unitEls.get(e.uid);
        this.view.delete(e.uid);
        if (el) {
          audio.sfx('death');
          this.burst(e.uid, '#ffe08a', 16, 70);
          this.unitEls.delete(e.uid);
          await anim(el, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.6) translateY(10px)', filter: 'brightness(3)' }], 320);
          el.remove();
        }
        break;
      }
      case 'spawn': {
        const u = this.c.s.units.find((x) => x.uid === e.uid);
        if (u) {
          this.view.set(u.uid, { hp: u.hp, maxHp: u.maxHp, block: u.block, pos: u.pos, st: { ...u.st } });
          this.renderUnit(u);
          const el = this.unitEls.get(u.uid);
          audio.sfx('summon');
          if (el) await anim(el, [{ opacity: 0, transform: 'translateY(-20px)' }, { opacity: 1, transform: 'translateY(0)' }], 260);
        }
        break;
      }
      case 'draw':
        if (e.n > 0) audio.sfx('draw');
        this.renderHand();
        this.renderHud();
        if (e.n > 0) await sleep(60);
        break;
      case 'shuffle':
        break;
      case 'exhaustCard':
        break;
      case 'energy':
        this.energyView = e.n;
        this.renderHud();
        break;
      case 'gold':
        audio.sfx('coin');
        this.refreshTop();
        break;
      case 'intent': {
        const u = this.c.s.units.find((x) => x.uid === e.uid);
        if (u && u.alive) this.renderUnit(u);
        this.renderTiles();
        break;
      }
      case 'text':
        this.floater(e.uid, t(e.text as LStr), e.color);
        await sleep(200);
        break;
      case 'tile':
        this.renderTiles();
        break;
      case 'relic':
        this.flashRelic(e.id);
        break;
      case 'end':
        break;
    }
  }

  /* =============================================================== end */

  private async finish(): Promise<void> {
    const won = this.c.s.phase === 'won';
    if (won) {
      audio.sfx('win');
      await this.banner(t(S.victoryShort), '#ffe08a');
    } else {
      audio.sfx('lose');
      await sleep(600);
    }
    if (this.destroyed) return;
    finishCombat(this.app.run!, this.app.profile);
    this.app.renderRun();
  }
}
