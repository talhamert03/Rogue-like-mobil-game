import { t, getLang, type Lang } from '../../i18n/i18n';
import { S } from '../../i18n/strings';
import type { App } from '../app';
import { h } from '../dom';
import { iconImg, spriteUrl, battleBackdrop } from '../../gfx/render';
import { CLASSES, CLASS_ORDER } from '../../data/classes';
import { CARDS, CARD_LIST } from '../../data/cards';
import { RELICS, RELIC_LIST } from '../../data/relics';
import { POTION_LIST } from '../../data/potions';
import { ENEMY_LIST } from '../../data/enemies';
import { STATUSES } from '../../data/statuses';
import { audio } from '../../audio/audio';
import { PERKS, perkLevel, buyPerk, unlockClass, ACHIEVEMENTS, HELL_LEVELS, defaultProfile, saveProfile } from '../../engine/meta';
import { newRun, weeklySetup, weekKey } from '../../engine/run';
import type { ClassId } from '../../engine/types';
import type { GameMode } from '../../engine/runTypes';
import { cardEl, confirmModal, previewCard, relicTipHtml, showTip, toast } from '../components';
import { storage, KEYS } from '../../engine/storage';

function header(app: App, title: string, back: () => void = () => app.go('title'), extra?: HTMLElement): HTMLElement {
  const hd = h('div', { class: 'header' });
  hd.append(
    h(
      'button',
      {
        class: 'iconbtn',
        onclick: () => {
          audio.sfx('click');
          back();
        },
      },
      '◀',
    ),
  );
  hd.append(h('h2', {}, title));
  if (extra) hd.append(extra);
  return hd;
}

function shardBadge(app: App): HTMLElement {
  return h('div', { class: 'shards', html: `${iconImg('soul', '#8fe3ff', 'ico')}<span>${app.profile.shards}</span>` });
}

/* ================================================================== title */

export function titleScreen(app: App): HTMLElement {
  const el = h('div', { class: 'screen title-screen' });
  el.style.backgroundImage = `linear-gradient(#0008, #000c), url(${battleBackdrop(1, 3)})`;
  const logo = h('div', { class: 'logo' });
  logo.append(h('h1', {}, t(S.gameName)));
  logo.append(h('div', { class: 'sub' }, t(S.tagline)));
  const heroes = h('div', { class: 'heroes' });
  CLASS_ORDER.forEach((c, i) => {
    const img = h('img', { src: spriteUrl('hero:' + c), alt: '' });
    img.style.animationDelay = `${i * 0.15}s`;
    if (!app.profile.unlocked.includes(c)) img.style.filter = 'brightness(0) opacity(0.5)';
    heroes.append(img);
  });
  logo.append(heroes);
  el.append(logo);
  for (let i = 0; i < 22; i++) {
    const e = h('div', { class: 'ember' });
    e.style.left = `${Math.round(Math.random() * 100)}%`;
    e.style.animationDuration = `${6 + Math.random() * 8}s`;
    e.style.animationDelay = `${-Math.random() * 12}s`;
    e.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 80)}px`);
    if (Math.random() < 0.3) e.style.background = '#ffe08a';
    el.append(e);
  }

  const menu = h('div', { class: 'menu' });
  const click = (f: () => void) => () => {
    audio.unlock();
    audio.sfx('click');
    f();
  };
  if (app.run && app.run.screen !== 'victory' && app.run.screen !== 'defeat') {
    menu.append(h('button', { class: 'btn gold', onclick: click(() => app.renderRun()) }, t(S.continue)));
  }
  menu.append(
    h(
      'button',
      {
        class: 'btn',
        onclick: click(() => {
          if (app.run && app.run.screen !== 'victory' && app.run.screen !== 'defeat') {
            confirmModal(t(S.abandonConfirm), () => {
              app.run = null;
              storage.del(KEYS.run);
              app.go('mode');
            });
          } else app.go('mode');
        }),
      },
      t(S.play),
    ),
  );
  const row = h('div', { class: 'grid2' });
  row.append(h('button', { class: 'btn small', onclick: click(() => app.go('camp')) }, t(S.camp)));
  row.append(h('button', { class: 'btn small', onclick: click(() => app.go('library')) }, t(S.library)));
  row.append(h('button', { class: 'btn small', onclick: click(() => app.go('stats')) }, t(S.stats)));
  row.append(h('button', { class: 'btn small', onclick: click(() => app.go('settings')) }, t(S.settings)));
  menu.append(row);
  menu.append(h('button', { class: 'btn small ghost', onclick: click(() => app.go('help')) }, t(S.howTo)));
  menu.append(shardBadge(app));
  menu.append(h('div', { class: 'version' }, 'v1.0.0'));
  el.append(menu);
  el.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  return el;
}

/* ================================================================== modes */

export function modeScreen(app: App): HTMLElement {
  const el = h('div', { class: 'screen' });
  el.append(header(app, t(S.chooseMode)));
  const sc = h('div', { class: 'scroll col', style: { gap: '12px' } });
  const p = app.profile;
  const choose = (mode: GameMode, hell = 1) => {
    audio.sfx('click');
    app.pendingMode = { mode, hell };
    if (mode === 'weekly') {
      const w = weeklySetup();
      startRun(app, w.cls, 'weekly', 1, w.seed);
    } else app.go('class');
  };
  const card = (mode: GameMode, icon: string, tint: string, title: string, desc: string, extra?: HTMLElement, locked = false) => {
    const b = h('button', { class: `panel mode-card ${locked ? 'locked' : ''}` });
    b.append(h('div', { class: 'mi', html: iconImg(icon, tint, '') }));
    const body = h('div', { style: { flex: '1' } }, h('h3', {}, title), h('p', {}, desc));
    if (extra) body.append(extra);
    b.append(body);
    if (!locked) b.addEventListener('click', () => choose(mode, app.pendingMode.hell));
    return b;
  };
  sc.append(card('classic', 'sword', '#c3c8d4', t(S.modeClassic), t(S.modeClassicDesc)));

  const hellUnlocked = p.stats.wins > 0 || p.hellMax > 0;
  const maxHell = Math.min(10, p.hellMax + 1);
  const hellExtra = h('div', { class: 'col', style: { marginTop: '8px', gap: '4px' } });
  if (hellUnlocked) {
    const sel = h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '4px' } });
    let chosen = Math.min(maxHell, app.pendingMode.hell || 1);
    const desc = h('div', { class: 'muted', style: { fontSize: '12px' } });
    const renderDesc = () => {
      desc.innerHTML = HELL_LEVELS.slice(0, chosen)
        .map((d, i) => `${i + 1}. ${t(d)}`)
        .join('<br>');
    };
    for (let i = 1; i <= 10; i++) {
      const b = h('button', { class: `chip ${i === chosen ? 'on' : ''}`, style: { opacity: i <= maxHell ? '1' : '0.35' } }, String(i));
      if (i === chosen) b.style.borderColor = '#ffd35a';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (i > maxHell) return;
        chosen = i;
        app.pendingMode.hell = i;
        sel.querySelectorAll('.chip').forEach((c, j) => ((c as HTMLElement).style.borderColor = j + 1 === i ? '#ffd35a' : ''));
        renderDesc();
      });
      sel.append(b);
    }
    app.pendingMode.hell = chosen;
    renderDesc();
    hellExtra.append(sel, desc);
  }
  sc.append(card('hell', 'fire', '#ff6a2a', t(S.modeHell), hellUnlocked ? t(S.modeHellDesc) : t(S.modeHellLocked), hellUnlocked ? hellExtra : undefined, !hellUnlocked));
  sc.append(card('tower', 'wall', '#b38cff', t(S.modeTower), t(S.modeTowerDesc), h('div', { class: 'muted px', style: { marginTop: '4px' } }, t(S.best, { n: p.stats.bestTower }))));
  const w = weeklySetup();
  const wk = weekKey();
  const wExtra = h('div', { class: 'col', style: { marginTop: '6px', gap: '3px', fontSize: '12px' } });
  wExtra.append(h('div', { class: 'row', html: `<img src="${spriteUrl('hero:' + w.cls)}" style="width:28px;height:28px"> <b class="px">${t(CLASSES[w.cls].name)}</b> <span class="muted">· ${wk}</span>` }));
  for (const m of w.mods) wExtra.append(h('div', { style: { color: '#ffe08a' } }, '• ' + t(S.weeklyMods[m])));
  if (p.weeklyBest[wk]) wExtra.append(h('div', { class: 'muted px' }, t(S.best, { n: p.weeklyBest[wk] })));
  sc.append(card('weekly', 'crown', '#ffd35a', t(S.modeWeekly), t(S.modeWeeklyDesc), wExtra));
  el.append(sc);
  return el;
}

function startRun(app: App, cls: ClassId, mode: GameMode, hell: number, seed?: number): void {
  audio.unlock();
  app.run = newRun({ cls, mode, hellLevel: hell, seed }, app.profile);
  app.save();
  app.renderRun();
}

/* ================================================================== class select */

export function classScreen(app: App): HTMLElement {
  const el = h('div', { class: 'screen' });
  el.append(header(app, t(S.chooseHero), () => app.go('mode'), shardBadge(app)));
  let sel: ClassId = (app.profile.unlocked.includes('warrior') ? 'warrior' : app.profile.unlocked[0]) as ClassId;
  const stage = h('div', { class: 'class-stage' });
  const tabs = h('div', { class: 'class-tabs' });
  const info = h('div', { class: 'scroll', style: { paddingTop: '0' } });
  const foot = h('div', { class: 'footer' });

  const render = () => {
    const c = CLASSES[sel];
    const unlocked = app.profile.unlocked.includes(sel);
    stage.innerHTML = '';
    const portrait = h('div', { class: 'portrait', style: { background: `radial-gradient(circle, ${c.color}55, #0000 65%)` } });
    portrait.append(h('img', { src: spriteUrl('hero:' + sel), alt: '', style: unlocked ? {} : { filter: 'brightness(0) opacity(0.6)' } }));
    stage.append(portrait);
    stage.append(h('h2', { style: { color: c.color } }, t(c.name)));
    stage.append(h('div', { class: 'ctitle' }, t(c.title)));
    stage.append(
      h('div', {
        class: 'class-stats',
        html: `<span>${iconImg('heart', undefined, 'ico')} ${c.hp}</span><span>${iconImg('energy', undefined, 'ico')} ${c.energy}</span><span>${iconImg('boot', '#9ee37d', 'ico')} ${c.mp}</span>`,
      }),
    );
    info.innerHTML = '';
    info.append(h('p', { style: { lineHeight: '1.4', margin: '4px 0 8px', textAlign: 'center' } }, t(c.desc)));
    info.append(h('div', { class: 'center', style: { color: '#ffe08a', fontWeight: '800', marginBottom: '10px' } }, t(c.mechanic)));
    const r = RELICS[c.relic];
    const relicRow = h('div', { class: 'panel row', style: { marginBottom: '10px' } });
    relicRow.append(h('div', { html: iconImg(r.icon, r.tint, 'ico lg') }));
    relicRow.append(h('div', { html: `<b class="px" style="color:#ffe08a">${t(r.name)}</b><br><span style="font-size:13px">${t(r.desc)}</span>` }));
    info.append(h('div', { class: 'muted px', style: { marginBottom: '4px' } }, t(S.startingRelic)), relicRow);
    info.append(h('div', { class: 'muted px', style: { marginBottom: '4px' } }, t(S.startingDeck)));
    const deck = h('div', { class: 'deck-preview' });
    const counts = new Map<string, number>();
    for (const id of c.deck) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, n] of counts) {
      const chip = h('button', { class: 'chip' }, `${n}× ${t(CARDS[id].name)}`);
      chip.addEventListener('click', () => previewCard({ id, up: false }));
      deck.append(chip);
    }
    info.append(deck);
    foot.innerHTML = '';
    if (unlocked) {
      foot.append(
        h(
          'button',
          {
            class: 'btn gold wide',
            onclick: () => {
              audio.sfx('click');
              startRun(app, sel, app.pendingMode.mode, app.pendingMode.hell);
            },
          },
          t(S.embark) + (app.pendingMode.mode === 'hell' ? ` · ${t(S.hellLevel, { n: app.pendingMode.hell })}` : app.pendingMode.mode === 'tower' ? ` · ${t(S.modeTower)}` : ''),
        ),
      );
    } else {
      const can = app.profile.shards >= c.unlock;
      foot.append(
        h(
          'button',
          {
            class: `btn wide ${can ? 'green' : 'disabled'}`,
            onclick: () => {
              if (unlockClass(app.profile, sel)) {
                audio.sfx('chest');
                toast(t(c.name) + ' ✓', 'star');
                app.go('class');
              }
            },
          },
          t(S.unlockFor, { n: c.unlock }),
        ),
      );
    }
    tabs.querySelectorAll('.class-tab').forEach((b) => b.classList.toggle('sel', (b as HTMLElement).dataset.cls === sel));
  };
  for (const cls of CLASS_ORDER) {
    const unlocked = app.profile.unlocked.includes(cls);
    const b = h('button', { class: `class-tab ${unlocked ? '' : 'locked'}`, dataset: { cls } });
    b.append(h('img', { src: spriteUrl('hero:' + cls), alt: '' }));
    if (!unlocked) b.append(h('img', { class: 'lock', src: '', alt: '' }));
    if (!unlocked) (b.lastChild as HTMLImageElement).outerHTML = iconImg('lock', undefined, 'lock');
    b.addEventListener('click', () => {
      audio.sfx('click');
      sel = cls;
      render();
    });
    tabs.append(b);
  }
  el.append(stage, tabs, info, foot);
  render();
  return el;
}

/* ================================================================== camp */

export function campScreen(app: App): HTMLElement {
  const el = h('div', { class: 'screen' });
  el.append(header(app, t(S.campTitle), undefined, shardBadge(app)));
  const sc = h('div', { class: 'scroll' });
  sc.append(h('p', { class: 'muted center', style: { marginTop: '0' } }, t(S.campDesc)));
  sc.append(h('h3', { style: { margin: '10px 0 8px' } }, t(S.heroes)));
  const heroes = h('div', { class: 'class-tabs', style: { padding: '0 0 10px' } });
  for (const cls of CLASS_ORDER) {
    const wins = app.profile.classWins[cls] ?? 0;
    const b = h('button', { class: `class-tab ${wins ? 'sel' : ''}`, title: t(CLASSES[cls].name) });
    b.append(h('img', { src: spriteUrl('hero:' + cls), alt: '' }));
    b.append(h('span', { class: 'px', style: { position: 'absolute', bottom: '1px', right: '4px', fontSize: '12px', color: wins ? '#ffe08a' : '#8a7aa0' } }, wins ? `★${wins}` : '·'));
    b.addEventListener('click', () => toast(`${t(CLASSES[cls].name)} · ${t(S.statWins)}: ${wins}`, 'trophy'));
    heroes.append(b);
  }
  sc.append(heroes);
  sc.append(h('h3', { style: { margin: '10px 0 8px' } }, t(S.perks)));
  for (const pk of PERKS) {
    const lvl = perkLevel(app.profile, pk.id);
    const maxed = lvl >= pk.costs.length;
    const cost = maxed ? 0 : pk.costs[lvl];
    const row = h('div', { class: 'perk' });
    row.append(h('div', { class: 'pi', html: iconImg(pk.icon, '#8fe3ff', '') }));
    const body = h('div', { class: 'body' });
    body.append(h('b', { class: 'px' }, t(pk.name)), h('div', { style: { fontSize: '13px' } }, t(pk.desc)));
    const pips = h('div', { class: 'pips' });
    for (let i = 0; i < pk.costs.length; i++) pips.append(h('i', { class: i < lvl ? 'on' : '' }));
    body.append(pips);
    row.append(body);
    const btn = h('button', { class: `btn small ${maxed ? 'disabled' : app.profile.shards >= cost ? 'green' : 'disabled'}`, html: maxed ? t(S.maxed) : `${iconImg('soul', '#8fe3ff', 'ico')} ${cost}` });
    btn.addEventListener('click', () => {
      if (buyPerk(app.profile, pk.id)) {
        audio.sfx('buff');
        app.go('camp');
      }
    });
    row.append(btn);
    sc.append(row);
  }
  el.append(sc);
  return el;
}

/* ================================================================== library */

export function libraryScreen(app: App): HTMLElement {
  const el = h('div', { class: 'screen' });
  el.append(header(app, t(S.library)));
  const tabs = h('div', { class: 'tabs' });
  const sc = h('div', { class: 'scroll' });
  const p = app.profile;
  const seenCards = new Set([...p.seenCards, ...(app.run?.seenCards ?? [])]);
  const seenRelics = new Set([...p.seenRelics, ...(app.run?.relics ?? [])]);
  const seenEnemies = new Set([...p.seenEnemies, ...(app.run?.seenEnemies ?? [])]);
  const views: Record<string, () => void> = {
    cards: () => {
      const filters = h('div', { class: 'tabs', style: { background: 'none', padding: '0 0 8px' } });
      const grid = h('div', { class: 'deckgrid' });
      const pools = ['all', ...CLASS_ORDER, 'neutral', 'curse'];
      const draw = (pool: string) => {
        grid.innerHTML = '';
        filters.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.pool === pool));
        const list = CARD_LIST.filter((c) => c.rarity !== 'special' || c.pool === 'curse').filter((c) => pool === 'all' || c.pool === pool || (pool === 'curse' && c.pool === 'status'));
        let known = 0;
        for (const d of list) {
          const seen = seenCards.has(d.id) || d.rarity === 'starter';
          if (seen) known++;
          const ce = cardEl({ id: d.id, up: false });
          if (!seen) {
            ce.style.filter = 'brightness(0.15)';
            ce.querySelector('.desc')!.innerHTML = '???';
          } else ce.addEventListener('click', () => previewCard({ id: d.id, up: false }));
          grid.append(ce);
        }
        grid.prepend(h('div', { class: 'muted px', style: { gridColumn: '1/-1' } }, `${known}/${list.length}`));
      };
      for (const pool of pools) {
        const label = pool === 'all' ? '★' : pool === 'neutral' ? '◇' : pool === 'curse' ? '☠' : t(CLASSES[pool as ClassId].name);
        const b = h('button', { dataset: { pool } }, label);
        b.addEventListener('click', () => draw(pool));
        filters.append(b);
      }
      sc.append(filters, grid);
      draw('all');
    },
    relics: () => {
      for (const r of RELIC_LIST) {
        const seen = seenRelics.has(r.id);
        const row = h('div', { class: `list-item ${seen ? '' : 'unknown'}`, html: iconImg(r.icon, r.tint, '') });
        row.append(h('div', { html: seen ? `<b class="px" style="color:#ffe08a">${t(r.name)}</b> <span class="muted" style="font-size:11px">${t(S.rarity[r.rarity])}</span><br><span style="font-size:13px">${t(r.desc)}</span>` : `<b class="px">${t(S.unknown)}</b>` }));
        sc.append(row);
      }
    },
    potions: () => {
      for (const po of POTION_LIST) {
        const row = h('div', { class: 'list-item', html: iconImg('potion', po.color, '') });
        row.append(h('div', { html: `<b class="px" style="color:${po.color}">${t(po.name)}</b><br><span style="font-size:13px">${t(po.desc)}</span>` }));
        sc.append(row);
      }
      sc.append(h('h3', { style: { margin: '14px 0 6px' } }, '⚑'));
      for (const st of Object.values(STATUSES).filter((s) => !s.hidden)) {
        const row = h('div', { class: 'list-item', html: iconImg(st.icon, st.color, '') });
        row.append(h('div', { html: `<b class="px" style="color:${st.color}">${t(st.name)}</b><br><span style="font-size:13px">${t(st.desc, { n: 'X' })}</span>` }));
        sc.append(row);
      }
    },
    bestiary: () => {
      for (const e of ENEMY_LIST) {
        const seen = seenEnemies.has(e.id);
        const row = h('div', { class: `list-item ${seen ? '' : 'unknown'}` });
        row.append(h('img', { src: spriteUrl(e.sprite, e.palette, true), alt: '', style: { width: '44px', height: '44px' } }));
        const tier = e.tier === 'boss' ? '👑' : e.tier === 'elite' ? '☠' : '';
        row.append(h('div', { html: seen ? `<b class="px">${tier} ${t(e.name)}</b><br><span class="muted" style="font-size:12px">${iconImg('heart', undefined, 'ico')} ${e.hp[0]}–${e.hp[1]} · ${iconImg('boot', '#9ee37d', 'ico')} ${e.speed}</span>${e.lore ? `<br><span style="font-size:12px">${t(e.lore)}</span>` : ''}` : `<b class="px">${t(S.unknown)}</b>` }));
        sc.append(row);
      }
    },
  };
  const names: Record<string, string> = { cards: t(S.cards), relics: t(S.relics), potions: t(S.potions), bestiary: t(S.bestiary) };
  for (const k of Object.keys(views)) {
    const b = h('button', {}, names[k]);
    b.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      sc.innerHTML = '';
      sc.scrollTop = 0;
      views[k]();
    });
    tabs.append(b);
  }
  el.append(tabs, sc);
  (tabs.firstChild as HTMLButtonElement).click();
  return el;
}

/* ================================================================== stats */

export function statsScreen(app: App): HTMLElement {
  const el = h('div', { class: 'screen' });
  el.append(header(app, t(S.stats)));
  const sc = h('div', { class: 'scroll' });
  const s = app.profile.stats;
  const grid = h('div', { class: 'panel stat-grid' });
  const hrs = Math.floor(s.playTime / 3600);
  const mins = Math.floor((s.playTime % 3600) / 60);
  const rows: [string, string | number][] = [
    [t(S.statRuns), s.runs],
    [t(S.statWins), s.wins],
    [t(S.statKills), s.kills],
    [t(S.statElites), s.elites],
    [t(S.statBosses), s.bosses],
    [t(S.statTower), s.bestTower],
    [t(S.statBest), s.bestScore],
    [t(S.statCards), s.cardsPlayed],
    [t(S.statMaxHit), s.maxHit],
    [t(S.statTime), `${hrs}h ${mins}m`],
  ];
  for (const [k, v] of rows) grid.append(h('span', {}, k), h('b', {}, String(v)));
  sc.append(grid);
  sc.append(h('h3', { style: { margin: '16px 0 8px' } }, `${t(S.achievements)} (${app.profile.achievements.length}/${ACHIEVEMENTS.length})`));
  for (const a of ACHIEVEMENTS) {
    const got = app.profile.achievements.includes(a.id);
    const row = h('div', { class: `list-item ${got ? '' : 'unknown'}`, html: iconImg('trophy', undefined, '') });
    row.append(h('div', { style: { flex: '1' }, html: `<b class="px" style="color:${got ? '#ffe08a' : '#aaa'}">${t(a.name)}</b><br><span style="font-size:13px">${t(a.desc)}</span>` }));
    row.append(h('div', { class: 'px', style: { color: '#8fe3ff', fontSize: '13px' } }, `+${a.reward}`));
    sc.append(row);
  }
  if (app.profile.history.length) {
    sc.append(h('h3', { style: { margin: '16px 0 8px' } }, t(S.history)));
    for (const hi of app.profile.history) {
      const row = h('div', { class: 'list-item' });
      row.append(h('img', { src: spriteUrl('hero:' + hi.cls), alt: '' }));
      const res = hi.result === 'won' ? `<span style="color:#7ed957">${t(S.won)}</span>` : hi.result === 'lost' ? `<span style="color:#ff7a6a">${t(S.lost)}</span>` : `<span class="muted">${t(S.abandoned)}</span>`;
      const mode = hi.mode === 'hell' ? t(S.hellLevel, { n: hi.hell }) : hi.mode === 'tower' ? t(S.modeTower) : hi.mode === 'weekly' ? t(S.modeWeekly) : t(S.modeClassic);
      row.append(h('div', { style: { flex: '1', fontSize: '13px' }, html: `<b class="px">${t(CLASSES[hi.cls].name)}</b> · ${mode}<br>${res} · ${t(S.floor, { n: hi.floor })}` }));
      row.append(h('div', { class: 'px', style: { color: '#ffd35a' } }, String(hi.score)));
      sc.append(row);
    }
  }
  el.append(sc);
  return el;
}

/* ================================================================== settings */

export function settingsScreen(app: App, inModal = false): HTMLElement {
  const el = h('div', { class: inModal ? 'col' : 'screen' });
  if (!inModal) el.append(header(app, t(S.settings)));
  const sc = h('div', { class: inModal ? '' : 'scroll' });
  const s = app.profile.settings;
  const commit = () => {
    app.applySettings();
    saveProfile(app.profile);
  };
  const seg = <T extends string | number | boolean>(label: string, opts: [T, string][], get: () => T, set: (v: T) => void) => {
    const row = h('div', { class: 'setting' }, h('label', {}, label));
    const g = h('div', { class: 'seg' });
    for (const [v, name] of opts) {
      const b = h('button', { class: get() === v ? 'on' : '' }, name);
      b.addEventListener('click', () => {
        set(v);
        commit();
        audio.sfx('click');
        g.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        if (label === t(S.language, undefined) || opts[0][0] === 'tr') {
          if (!inModal) app.go('settings');
        }
      });
      g.append(b);
    }
    row.append(g);
    return row;
  };
  const slider = (label: string, get: () => number, set: (v: number) => void) => {
    const row = h('div', { class: 'setting' }, h('label', {}, label));
    const input = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(get()) }) as HTMLInputElement;
    input.addEventListener('input', () => {
      set(Number(input.value));
      commit();
    });
    input.addEventListener('change', () => audio.sfx('click'));
    row.append(input);
    return row;
  };
  sc.append(seg<Lang>(t(S.language), [['tr', 'Türkçe'], ['en', 'English']], () => getLang(), (v) => (s.lang = v)));
  sc.append(slider(t(S.music), () => s.music, (v) => (s.music = v)));
  sc.append(slider(t(S.sfx), () => s.sfx, (v) => (s.sfx = v)));
  sc.append(seg<number>(t(S.animSpeed), [[1, '1x'], [1.5, '1.5x'], [2, '2x'], [3, '3x']], () => s.speed, (v) => (s.speed = v)));
  sc.append(seg<boolean>(t(S.screenShake), [[true, t(S.on)], [false, t(S.off)]], () => s.shake, (v) => (s.shake = v)));
  sc.append(seg<boolean>(t(S.vibration), [[true, t(S.on)], [false, t(S.off)]], () => s.vibrate, (v) => (s.vibrate = v)));
  if (!inModal) {
    sc.append(
      h(
        'button',
        {
          class: 'btn red wide',
          style: { marginTop: '20px' },
          onclick: () =>
            confirmModal(t(S.resetConfirm), () => {
              const lang = app.profile.settings.lang;
              app.profile = defaultProfile();
              app.profile.settings.lang = lang;
              saveProfile(app.profile);
              storage.del(KEYS.run);
              app.run = null;
              app.go('title');
            }),
        },
        t(S.resetProgress),
      ),
    );
    sc.append(h('p', { class: 'muted center', style: { fontSize: '12px', marginTop: '20px' } }, t(S.credits)));
  }
  el.append(sc);
  return el;
}

/* ================================================================== help */

const HELP: { icon: string; tint?: string; tr: string; en: string }[] = [
  {
    icon: 'sword',
    tr: '<b>Amaç:</b> Dallanan haritada ilerle, savaşları kazan, destenı güçlendir ve her perdenin sonundaki bossu yen. Klasik modda 3 perde var.',
    en: '<b>Goal:</b> Advance through a branching map, win fights, build your deck and defeat the boss at the end of each act. Classic mode has 3 acts.',
  },
  {
    icon: 'energy',
    tr: '<b>Kartlar ve Enerji:</b> Her tur 5 kart çekip 3 enerji alırsın. Bir kartı oynamak için karta dokun, sonra parlayan hedefe dokun. Hedefsiz kartlar için karta ikinci kez dokun.',
    en: '<b>Cards & Energy:</b> Each turn you draw 5 cards and get 3 energy. Tap a card, then tap a glowing target. For untargeted cards, tap the card again.',
  },
  {
    icon: 'boot',
    tint: '#9ee37d',
    tr: '<b>Hareket:</b> Savaş tek sıralı bir koridorda geçer. Her tur hareket puanın var: yeşil karelere dokunarak yürü. Yakın dövüş kartları (⚔) bitişik hedef ister, menzilli kartlar (◎) uzaktan vurur.',
    en: '<b>Movement:</b> Battles happen in a single-file corridor. You get movement points each turn: tap green tiles to walk. Melee cards (⚔) need an adjacent target, ranged cards (◎) hit from afar.',
  },
  {
    icon: 'eye',
    tr: '<b>Niyetler:</b> Düşmanların üstündeki simge ne yapacaklarını gösterir. Kırmızı çizgili kareler alan saldırısıdır — oradan çekil! Yakın dövüşçüler sana ulaşamazsa saldırıları boşa gider.',
    en: '<b>Intents:</b> The icon above each enemy shows its next action. Red striped tiles mark area attacks — step out! Melee enemies that cannot reach you will miss.',
  },
  {
    icon: 'shield',
    tr: '<b>Blok:</b> Blok gelen hasarı emer ve senin turunun başında sıfırlanır.',
    en: '<b>Block:</b> Block absorbs incoming damage and resets at the start of your turn.',
  },
  {
    icon: 'wave',
    tr: '<b>İtme:</b> Düşmanları duvara ya da başka birimlere iterek ekstra hasar verebilirsin. Tuzaklar, bombalar ve çağrılan yardımcılar da savaş alanını şekillendirir.',
    en: '<b>Push:</b> Shove enemies into walls or other units for bonus damage. Traps, bombs and summoned allies also shape the battlefield.',
  },
  {
    icon: 'map',
    tr: '<b>Harita:</b> ⚔ Savaş, ☠ Elit (tılsım verir), ? Bilinmeyen olay, 🛍 Tüccar, 🔥 Kamp ateşi (iyileş ya da geliştir), 📦 Hazine.',
    en: '<b>Map:</b> ⚔ Battle, ☠ Elite (drops relics), ? Unknown event, 🛍 Merchant, 🔥 Campfire (heal or upgrade), 📦 Treasure.',
  },
  {
    icon: 'soul',
    tint: '#8fe3ff',
    tr: '<b>Kalıcı ilerleme:</b> Her maceranın sonunda Ruh Taşı kazanırsın. Kamp’ta yeni kahramanlar ve kalıcı güçlendirmeler aç.',
    en: '<b>Meta progression:</b> Earn Soul Shards at the end of every run. Unlock new heroes and permanent perks at the Camp.',
  },
  {
    icon: 'rune',
    tr: '<b>İpucu:</b> Kartlara, düşmanlara, tılsımlara ve durum simgelerine basılı tutarak detayları görebilirsin.',
    en: '<b>Tip:</b> Long-press cards, enemies, relics and status icons to see details.',
  },
];

export function helpScreen(app: App): HTMLElement {
  const el = h('div', { class: 'screen' });
  el.append(header(app, t(S.howTo)));
  const sc = h('div', { class: 'scroll col' });
  for (const p of HELP) {
    const row = h('div', { class: 'panel row', style: { alignItems: 'flex-start' } });
    row.append(h('div', { html: iconImg(p.icon, p.tint, 'ico lg') }));
    row.append(h('div', { style: { lineHeight: '1.45', fontSize: '14px' }, html: getLang() === 'tr' ? p.tr : p.en }));
    sc.append(row);
  }
  el.append(sc);
  void relicTipHtml;
  void showTip;
  return el;
}
