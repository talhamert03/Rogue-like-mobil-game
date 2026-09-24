import { t } from '../../i18n/i18n';
import { S } from '../../i18n/strings';
import type { App } from '../app';
import { h } from '../dom';
import { iconImg, spriteUrl } from '../../gfx/render';
import { endRun } from '../../engine/run';
import { audio } from '../../audio/audio';
import { CLASSES } from '../../data/classes';

export function endScreen(app: App): HTMLElement {
  const run = app.run!;
  const result = run.screen === 'victory' ? 'won' : run.lastResult === 'abandoned' ? 'abandoned' : 'lost';
  const res = endRun(run, app.profile, result);
  app.run = null;
  const won = result === 'won';
  const el = h('div', { class: `screen endscreen ${won ? 'win' : 'lose'}` });
  el.append(h('img', { src: spriteUrl('hero:' + run.cls), alt: '', style: { width: '96px', height: '96px', filter: won ? '' : 'grayscale(0.8) brightness(0.7)', transform: won ? '' : 'rotate(90deg)' } }));
  el.append(h('h1', {}, won ? t(S.victory) : t(S.defeat)));
  el.append(h('p', { style: { maxWidth: '320px', lineHeight: '1.4' } }, won ? t(S.victoryText) : run.mode === 'tower' ? t(S.towerEnd, { n: run.towerFloor }) : t(S.defeatText)));
  const s = run.stats;
  const grid = h('div', { class: 'panel stat-grid', style: { width: '100%', maxWidth: '340px', textAlign: 'left' } });
  const rows: [string, string | number][] = [
    [t(CLASSES[run.cls].name), run.mode === 'tower' ? t(S.towerFloor, { n: run.towerFloor }) : t(S.floor, { n: run.floor })],
    [t(S.statKills), s.kills],
    [t(S.statElites), s.elites],
    [t(S.statBosses), s.bosses],
    [t(S.statCards), s.cardsPlayed],
    [t(S.statMaxHit), s.maxHit],
    [t(S.score), res.score + (res.newBest ? ' ★' : '')],
  ];
  for (const [k, v] of rows) grid.append(h('span', {}, k), h('b', {}, String(v)));
  el.append(grid);
  if (res.newBest) el.append(h('div', { class: 'px', style: { color: '#ffe08a' } }, t(S.newBest)));
  el.append(h('div', { class: 'shards', style: { fontSize: '22px' }, html: `${iconImg('soul', '#8fe3ff', 'ico lg')} ${t(S.shardsEarned, { n: res.shards })}` }));
  for (const a of res.achievements) {
    el.append(h('div', { class: 'panel row', style: { padding: '6px 10px' }, html: `${iconImg('trophy', undefined, 'ico lg')}<div style="text-align:left"><b class="px" style="color:#ffe08a">${t(S.achievementUnlocked, { n: t(a.name) })}</b><br><span style="font-size:12px">+${a.reward} ${t(S.shards)}</span></div>` }));
  }
  el.append(
    h(
      'button',
      {
        class: 'btn gold',
        style: { minWidth: '220px', marginTop: '8px' },
        onclick: () => {
          audio.sfx('click');
          app.go('title');
        },
      },
      t(S.mainMenu),
    ),
  );
  setTimeout(() => audio.sfx(won ? 'win' : 'lose'), 200);
  return el;
}
