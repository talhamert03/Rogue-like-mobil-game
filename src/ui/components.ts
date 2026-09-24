import { t } from '../i18n/i18n';
import { S } from '../i18n/strings';
import { CARDS, cardSpec } from '../data/cards';
import { describeCard } from '../data/cardText';
import { CLASSES } from '../data/classes';
import { RELICS } from '../data/relics';
import { POTIONS } from '../data/potions';
import { STATUSES } from '../data/statuses';
import { iconImg, iconUrl } from '../gfx/render';
import type { Combat } from '../engine/combat';
import type { CardInst, ClassId, Unit } from '../engine/types';
import { h } from './dom';

/* ------------------------------------------------------------------ cards */

export function cardColor(id: string): string {
  const d = CARDS[id];
  if (!d) return '#6b7385';
  if (d.pool === 'curse') return '#3a2d4f';
  if (d.pool === 'status') return '#4a4e5e';
  if (d.pool === 'neutral' || d.pool === 'token') return '#7a7f8c';
  return CLASSES[d.pool as ClassId]?.color ?? '#6b7385';
}

export interface CardOpts {
  combat?: Combat;
  target?: Unit;
  cw?: number;
  cost?: number;
}

export function cardEl(inst: { id: string; up: boolean }, opts: CardOpts = {}): HTMLElement {
  const def = CARDS[inst.id];
  const spec = cardSpec(inst.id, inst.up);
  const color = cardColor(inst.id);
  const el = h('div', {
    class: `card ${def.rarity} ${inst.up ? 'upgraded' : ''} ${def.pool === 'curse' || def.pool === 'status' ? 'curse' : ''}`,
    style: { '--cc': color, ...(opts.cw ? { '--cw': opts.cw + 'px' } : {}) },
  });
  el.dataset.id = inst.id;
  const baseCost = spec.cost;
  const cost = opts.cost ?? baseCost;
  if (!spec.unplayable) {
    const costCls = cost < baseCost ? 'mod-down' : cost > baseCost ? 'mod-up' : '';
    el.append(h('div', { class: `cost ${costCls}` }, baseCost < 0 ? 'X' : String(cost)));
  }
  if (spec.soulCost) el.append(h('div', { class: 'soul', title: t(STATUSES.souls.name) }, String(spec.soulCost)));
  el.append(h('div', { class: 'name' }, t(def.name) + (inst.up ? '+' : '')));
  const art = h('div', { class: 'art', html: iconImg(def.art, def.tint ?? lighten(color), '') });
  if (spec.type === 'attack' || spec.target === 'enemy' || spec.target === 'tile' || spec.target === 'empty' || spec.target === 'ally') {
    const r = spec.range ?? 1;
    if (spec.target !== 'none') {
      const label = r <= 1 && spec.target === 'enemy' ? '⚔' : `◎${r}`;
      art.append(h('div', { class: 'range' }, label));
    }
  }
  el.append(art);
  el.append(h('div', { class: 'type' }, t(S.cardTypes[spec.type])));
  el.append(h('div', { class: 'desc', html: `<span>${describeCard(inst.id, inst.up, opts.combat, opts.target)}</span>` }));
  return el;
}

function lighten(hex: string): string {
  const v = hex.replace('#', '');
  const n = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return '#' + n.map((x) => Math.min(255, Math.round(x + (255 - x) * 0.45)).toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ tooltip */

let tipEl: HTMLElement | null = null;

export function showTip(anchor: Element, html: string): void {
  hideTip();
  const root = document.getElementById('app')!;
  tipEl = h('div', { class: 'tooltip', html });
  root.append(tipEl);
  const ar = anchor.getBoundingClientRect();
  const rr = root.getBoundingClientRect();
  const tr = tipEl.getBoundingClientRect();
  let x = ar.left - rr.left + ar.width / 2 - tr.width / 2;
  x = Math.max(6, Math.min(rr.width - tr.width - 6, x));
  let y = ar.top - rr.top - tr.height - 8;
  if (y < 6) y = ar.bottom - rr.top + 8;
  tipEl.style.left = x + 'px';
  tipEl.style.top = y + 'px';
  const kill = () => {
    hideTip();
    document.removeEventListener('pointerdown', kill, true);
  };
  setTimeout(() => document.addEventListener('pointerdown', kill, true), 50);
}

export function hideTip(): void {
  tipEl?.remove();
  tipEl = null;
}

export function relicTipHtml(id: string): string {
  const r = RELICS[id];
  if (!r) return '';
  return `<h4>${t(r.name)}</h4><div class="muted" style="font-size:11px">${t(S.rarity[r.rarity])}</div><div>${t(r.desc)}</div>`;
}

export function potionTipHtml(id: string): string {
  const p = POTIONS[id];
  return `<h4>${t(p.name)}</h4><div>${t(p.desc)}</div>`;
}

export function statusTipHtml(u: Unit): string {
  const rows = Object.entries(u.st)
    .filter(([k]) => STATUSES[k] && !STATUSES[k].hidden)
    .map(([k, n]) => {
      const m = STATUSES[k];
      return `<div class="tt-row"><img src="${iconUrl(m.icon, m.color)}"><div><b style="color:${m.color}">${t(m.name)} ${n}</b> — ${t(m.desc, { n })}</div></div>`;
    });
  return rows.join('');
}

/* ------------------------------------------------------------------ toast */

export function toast(text: string, icon?: string, tint?: string): void {
  const root = document.getElementById('app')!;
  const el = h('div', { class: 'toast', html: `${icon ? iconImg(icon, tint, 'ico') : ''}<span>${text}</span>` });
  root.append(el);
  setTimeout(() => el.remove(), 2700);
}

/* ------------------------------------------------------------------ modal */

export function modal(content: HTMLElement, opts: { title?: string; onClose?: () => void; closable?: boolean; footer?: HTMLElement } = {}): () => void {
  const root = document.getElementById('app')!;
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: 'modal panel' });
  const close = () => {
    back.remove();
    opts.onClose?.();
  };
  if (opts.title || opts.closable !== false) {
    const head = h('div', { class: 'row', style: { marginBottom: '6px' } });
    head.append(h('h3', { style: { flex: '1' } }, opts.title ?? ''));
    if (opts.closable !== false) head.append(h('button', { class: 'btn small ghost', onclick: close }, t(S.close)));
    box.append(head);
  }
  const sc = h('div', { class: 'scroll' });
  sc.append(content);
  box.append(sc);
  if (opts.footer) box.append(opts.footer);
  back.append(box);
  back.addEventListener('click', (e) => {
    if (e.target === back && opts.closable !== false) close();
  });
  root.append(back);
  return () => back.remove();
}

export function confirmModal(text: string, onYes: () => void, yesLabel = t(S.confirm), danger = true): void {
  const body = h('div', { class: 'col center' }, h('p', { style: { fontSize: '16px', lineHeight: '1.4' } }, text));
  let closeFn = () => {};
  const footer = h(
    'div',
    { class: 'row', style: { gap: '10px', marginTop: '8px' } },
    h('button', { class: 'btn ghost', style: { flex: '1' }, onclick: () => closeFn() }, t(S.cancel)),
    h(
      'button',
      {
        class: `btn ${danger ? 'red' : 'gold'}`,
        style: { flex: '1' },
        onclick: () => {
          closeFn();
          onYes();
        },
      },
      yesLabel,
    ),
  );
  closeFn = modal(body, { footer, closable: false });
}

/** Deck viewer / picker. */
export function deckModal(
  cards: CardInst[],
  opts: { title: string; pick?: (c: CardInst) => void; filter?: (c: CardInst) => boolean; showUpgrade?: boolean; cancelable?: boolean; onCancel?: () => void } = { title: '' },
): () => void {
  const grid = h('div', { class: 'deckgrid' });
  const list = cards.filter(opts.filter ?? (() => true));
  const sorted = list.slice().sort((a, b) => {
    const ta = cardSpec(a.id, a.up).type;
    const tb = cardSpec(b.id, b.up).type;
    return ta.localeCompare(tb) || t(CARDS[a.id].name).localeCompare(t(CARDS[b.id].name));
  });
  let close = () => {};
  for (const c of sorted) {
    const el = cardEl(opts.showUpgrade ? { id: c.id, up: true } : c);
    el.addEventListener('click', () => {
      if (opts.pick) {
        previewPick(c, opts.showUpgrade ?? false, () => {
          close();
          opts.pick!(c);
        });
      } else previewCard(c);
    });
    grid.append(el);
  }
  if (!sorted.length) grid.append(h('div', { class: 'muted center' }, '—'));
  close = modal(grid, {
    title: opts.title,
    closable: opts.cancelable !== false,
    onClose: opts.onCancel,
  });
  return close;
}

export function previewCard(c: { id: string; up: boolean }): void {
  const wrap = h('div', { class: 'big-card-preview' });
  wrap.append(cardEl(c, { cw: 190 }));
  const def = CARDS[c.id];
  wrap.append(h('div', { class: 'muted' }, `${t(S.rarity[def.rarity])} · ${t(S.cardTypes[cardSpec(c.id, c.up).type])}`));
  if (!c.up && def.upgradable !== false && def.pool !== 'curse' && def.pool !== 'status') {
    wrap.append(h('div', { class: 'muted', style: { marginTop: '6px' } }, t(S.upgradedPreview) + ':'));
    wrap.append(cardEl({ id: c.id, up: true }, { cw: 140 }));
  }
  modal(wrap, {});
}

function previewPick(c: CardInst, showUp: boolean, onYes: () => void): void {
  const wrap = h('div', { class: 'big-card-preview' });
  if (showUp) {
    wrap.append(h('div', { class: 'row', style: { gap: '6px' } }, cardEl(c, { cw: 130 }), h('div', { class: 'px', style: { fontSize: '26px' } }, '→'), cardEl({ id: c.id, up: true }, { cw: 130 })));
  } else wrap.append(cardEl(c, { cw: 180 }));
  let close = () => {};
  const footer = h(
    'div',
    { class: 'row', style: { gap: '10px', marginTop: '8px' } },
    h('button', { class: 'btn ghost', style: { flex: '1' }, onclick: () => close() }, t(S.cancel)),
    h(
      'button',
      {
        class: 'btn gold',
        style: { flex: '1' },
        onclick: () => {
          close();
          onYes();
        },
      },
      t(S.confirm),
    ),
  );
  close = modal(wrap, { footer, closable: false });
}
