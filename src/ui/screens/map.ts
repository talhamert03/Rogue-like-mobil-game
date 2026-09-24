import { t } from '../../i18n/i18n';
import { S } from '../../i18n/strings';
import type { App } from '../app';
import { h } from '../dom';
import { iconImg, spriteUrl } from '../../gfx/render';
import { mapChoices, enterNode, canFightBoss, currentNode } from '../../engine/run';
import { ENCOUNTERS } from '../../data/encounters';
import { ENEMIES } from '../../data/enemies';
import { audio } from '../../audio/audio';
import type { NodeType } from '../../engine/runTypes';
import { showTip } from '../components';

export const NODE_ICON: Record<NodeType, [string, string]> = {
  battle: ['sword', '#c3c8d4'],
  elite: ['elite', '#ff5d5d'],
  event: ['question', '#b38cff'],
  shop: ['shop', '#ffd35a'],
  rest: ['campfire', '#ff8a2a'],
  treasure: ['chest', '#ffd35a'],
  boss: ['boss', '#ff5d5d'],
};

const NODE_NAME: Record<NodeType, keyof typeof S> = {
  battle: 'nodeBattle',
  elite: 'nodeElite',
  event: 'nodeEvent',
  shop: 'nodeShop',
  rest: 'nodeRest',
  treasure: 'nodeTreasure',
  boss: 'nodeBoss',
};

export function mapScreen(app: App): HTMLElement {
  const run = app.run!;
  const el = h('div', { class: 'screen' });
  el.append(app.topBar(), app.relicBar());
  const map = run.map;
  const actName = run.mode === 'tower' ? t(S.modeTower) : t(S.actNames[run.act - 1]);
  el.append(
    h('div', { class: 'row', style: { justifyContent: 'center', padding: '6px', background: '#0005', fontFamily: 'var(--pixel)' } }, h('span', { style: { color: '#ffe08a' } }, actName)),
  );

  const view = h('div', { class: 'mapview' });
  const W = Math.min(480, window.innerWidth);
  const rowH = 74;
  const bossRowExtra = run.mode === 'tower' ? 0 : 120;
  const H = map.rows * rowH + 80 + bossRowExtra;
  const inner = h('div', { style: { position: 'relative', height: H + 'px', width: '100%' } });
  const colW = (W - 40) / map.cols;
  const pos = (row: number, col: number, id: number) => {
    // deterministic jitter so the map looks hand-drawn
    const jx = (((id * 7919) % 9) - 4) * 1.2;
    const jy = (((id * 104729) % 9) - 4) * 1.4;
    return { x: 20 + colW * (col + 0.5) + jx, y: H - 50 - row * rowH + jy };
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  const avail = new Set(mapChoices(run).map((n) => n.id));
  const cur = currentNode(run);
  const bossPos = { x: W / 2, y: H - 50 - map.rows * rowH - 40 };
  for (const n of map.nodes) {
    const a = pos(n.row, n.col, n.id);
    for (const id of n.next) {
      const m = map.nodes.find((x) => x.id === id)!;
      const b = pos(m.row, m.col, m.id);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(b.y));
      const traveled = n.visited && m.visited;
      const active = cur?.id === n.id && avail.has(m.id);
      line.setAttribute('stroke', traveled ? '#7ed957' : active ? '#ffd35a' : '#6a5a8a');
      line.setAttribute('stroke-width', active || traveled ? '3' : '2');
      line.setAttribute('stroke-dasharray', traveled ? '0' : '5 5');
      line.setAttribute('opacity', traveled || active ? '0.95' : '0.5');
      svg.append(line);
    }
    if (run.mode !== 'tower' && n.row === map.rows - 1) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(bossPos.x));
      line.setAttribute('y2', String(bossPos.y));
      line.setAttribute('stroke', '#8a3a3a');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '4 6');
      line.setAttribute('opacity', '0.5');
      svg.append(line);
    }
  }
  inner.append(svg);

  let scrollTarget = H;
  for (const n of map.nodes) {
    const p = pos(n.row, n.col, n.id);
    const [icon, tint] = NODE_ICON[n.type];
    const isAvail = avail.has(n.id) && !canFightBoss(run);
    const cls = ['mnode', n.visited ? 'visited' : '', cur?.id === n.id ? 'cur' : '', isAvail ? 'avail' : '', !isAvail && !n.visited ? 'dim' : ''].join(' ');
    const b = h('button', { class: cls, html: iconImg(icon, tint, ''), style: { left: p.x + 'px', top: p.y + 'px' }, dataset: { node: String(n.id), type: n.type } });
    if (isAvail) {
      scrollTarget = Math.min(scrollTarget, p.y);
      b.addEventListener('click', () => {
        audio.sfx('click');
        enterNode(run, n.id, app.profile);
        app.renderRun();
      });
    } else {
      b.addEventListener('click', () => showTip(b, `<h4>${t(S[NODE_NAME[n.type]] as never)}</h4>`));
    }
    inner.append(b);
  }
  if (run.mode !== 'tower') {
    const enc = ENCOUNTERS[map.bossId];
    const bossDef = ENEMIES[enc.enemies.find((e) => ENEMIES[e.id].tier === 'boss')!.id];
    const ready = canFightBoss(run);
    const bn = h('button', {
      class: `mnode boss ${ready ? 'avail' : 'dim'}`,
      style: { left: bossPos.x + 'px', top: bossPos.y + 'px' },
      dataset: { node: 'boss' },
    });
    bn.append(h('img', { src: spriteUrl(bossDef.sprite, bossDef.palette, true), alt: '' }));
    bn.addEventListener('click', () => {
      if (ready) {
        audio.sfx('click');
        enterNode(run, 'boss', app.profile);
        app.renderRun();
      } else showTip(bn, `<h4>${t(bossDef.name)}</h4><div class="muted">${t(S.nodeBoss)}</div>`);
    });
    inner.append(bn);
    inner.append(h('div', { class: 'px center', style: { position: 'absolute', left: '0', right: '0', top: bossPos.y + 42 + 'px', color: '#ff9a8a', fontSize: '14px' } }, t(bossDef.name)));
    if (ready) scrollTarget = bossPos.y;
  }
  view.append(inner);
  el.append(view);

  const legend = h('div', { class: 'map-legend' });
  for (const k of ['battle', 'elite', 'event', 'shop', 'rest', 'treasure'] as NodeType[]) {
    legend.append(h('span', { html: `${iconImg(NODE_ICON[k][0], NODE_ICON[k][1], '')}${t(S[NODE_NAME[k]] as never)}` }));
  }
  el.append(legend);
  if (canFightBoss(run)) {
    el.append(
      h(
        'div',
        { class: 'footer' },
        h(
          'button',
          {
            class: 'btn red wide',
            onclick: () => {
              audio.sfx('click');
              enterNode(run, 'boss', app.profile);
              app.renderRun();
            },
          },
          t(S.fightBoss),
        ),
      ),
    );
  }
  requestAnimationFrame(() => {
    view.scrollTop = Math.max(0, scrollTarget - view.clientHeight * 0.6);
  });
  return el;
}
