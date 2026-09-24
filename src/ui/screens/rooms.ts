import { t } from '../../i18n/i18n';
import { S } from '../../i18n/strings';
import type { App } from '../app';
import { h } from '../dom';
import { iconImg, spriteUrl, battleBackdrop } from '../../gfx/render';
import {
  takeReward,
  proceed,
  rerollCardReward,
  buyItem,
  doRest,
  restHealAmount,
  canRestHeal,
  openChest,
  eventChoose,
  eventPendingSelect,
  eventResolveSelect,
  eventTakeCard,
  upgradableCards,
  removalPrice,
  enemyAct,
} from '../../engine/run';
import { perkLevel } from '../../engine/meta';
import { RELICS } from '../../data/relics';
import { POTIONS } from '../../data/potions';
import { EVENTS, type EventApi } from '../../data/events';
import { CARDS } from '../../data/cards';
import { audio } from '../../audio/audio';
import { cardEl, deckModal, modal, previewCard, relicTipHtml, potionTipHtml, showTip, toast } from '../components';

/* ================================================================ reward */

export function rewardScreen(app: App): HTMLElement {
  const run = app.run!;
  const el = h('div', { class: 'screen' });
  el.append(app.topBar(), app.relicBar());
  el.append(h('div', { class: 'header' }, h('h2', { class: 'center' }, t(S.rewards))));
  const sc = h('div', { class: 'scroll col', style: { gap: '10px' } });
  const rerender = () => app.renderRun();
  (run.rewards ?? []).forEach((r, i) => {
    let btn: HTMLElement | null = null;
    if (r.kind === 'gold') {
      btn = h('button', { class: `reward-item ${r.taken ? 'taken' : ''}`, html: `${iconImg('coin', undefined, '')}<span>${t(S.gold, { n: r.n ?? 0 })}</span>` });
      btn.addEventListener('click', () => {
        if (takeReward(run, i)) {
          audio.sfx('coin');
          rerender();
        }
      });
    } else if (r.kind === 'relic' && r.relic) {
      const rd = RELICS[r.relic];
      btn = h('button', { class: `reward-item ${r.taken ? 'taken' : ''}`, html: `${iconImg(rd.icon, rd.tint, '')}<span>${t(rd.name)}<small>${t(rd.desc)}</small></span>` });
      btn.addEventListener('click', () => {
        if (takeReward(run, i)) {
          audio.sfx('relic');
          toast(t(rd.name), rd.icon, rd.tint);
          rerender();
        }
      });
    } else if (r.kind === 'potion' && r.potion) {
      const pd = POTIONS[r.potion];
      btn = h('button', { class: `reward-item ${r.taken ? 'taken' : ''}`, html: `${iconImg('potion', pd.color, '')}<span>${t(pd.name)}<small>${t(pd.desc)}</small></span>` });
      btn.addEventListener('click', () => {
        if (takeReward(run, i)) {
          audio.sfx('coin');
          rerender();
        } else {
          audio.sfx('error');
          toast(t(S.potionsFull), 'potion');
        }
      });
    } else if (r.kind === 'card') {
      btn = h('button', { class: `reward-item ${r.taken ? 'taken' : ''}`, html: `${iconImg('cards', '#b38cff', '')}<span>${t(S.addCard)}</span>` });
      btn.addEventListener('click', () => cardPick(app, i, rerender));
    } else if (r.kind === 'bossRelic') {
      btn = h('button', { class: `reward-item ${r.taken ? 'taken' : ''}`, html: `${iconImg('crown', undefined, '')}<span>${t(S.bossRelic)}</span>` });
      btn.addEventListener('click', () => bossRelicPick(app, i, rerender));
    }
    if (btn) sc.append(btn);
  });
  el.append(sc);
  const foot = h('div', { class: 'footer' });
  foot.append(
    h(
      'button',
      {
        class: 'btn gold wide',
        onclick: () => {
          audio.sfx('click');
          proceed(run, app.profile);
          app.renderRun();
        },
      },
      t(S.proceed),
    ),
  );
  el.append(foot);
  return el;
}

function cardPick(app: App, idx: number, done: () => void): void {
  const run = app.run!;
  const r = run.rewards![idx];
  const wrap = h('div', { class: 'col' });
  const row = h('div', { class: 'card-choice' });
  let close = () => {};
  r.cards!.forEach((id, j) => {
    const ce = cardEl({ id, up: !!r.cardsUp?.[j] });
    ce.addEventListener('click', () => {
      if (takeReward(run, idx, j)) {
        audio.sfx('draw');
        toast(t(CARDS[id].name), 'cards', '#b38cff');
        close();
        done();
      }
    });
    let timer: number | undefined;
    ce.addEventListener('pointerdown', () => (timer = window.setTimeout(() => previewCard({ id, up: !!r.cardsUp?.[j] }), 500)));
    ce.addEventListener('pointerup', () => clearTimeout(timer));
    ce.addEventListener('pointerleave', () => clearTimeout(timer));
    row.append(ce);
  });
  wrap.append(row);
  const foot = h('div', { class: 'row', style: { gap: '8px', marginTop: '10px' } });
  if (perkLevel(app.profile, 'reroll') > run.rerolls)
    foot.append(
      h(
        'button',
        {
          class: 'btn small',
          onclick: () => {
            if (rerollCardReward(run, idx, app.profile)) {
              close();
              cardPick(app, idx, done);
            }
          },
        },
        `${t(S.reroll)} (${perkLevel(app.profile, 'reroll') - run.rerolls})`,
      ),
    );
  foot.append(h('button', { class: 'btn small ghost', style: { flex: '1' }, onclick: () => close() }, t(S.skip)));
  wrap.append(foot);
  close = modal(wrap, { title: t(S.chooseCard), closable: false });
}

function bossRelicPick(app: App, idx: number, done: () => void): void {
  const run = app.run!;
  const r = run.rewards![idx];
  const wrap = h('div', { class: 'col' });
  let close = () => {};
  for (const id of r.relics ?? []) {
    const rd = RELICS[id];
    const b = h('button', { class: 'reward-item', html: `${iconImg(rd.icon, rd.tint, '')}<span>${t(rd.name)}<small>${t(rd.desc)}</small></span>` });
    b.addEventListener('click', () => {
      if (takeReward(run, idx, id)) {
        audio.sfx('chest');
        close();
        done();
      }
    });
    wrap.append(b);
  }
  wrap.append(h('button', { class: 'btn small ghost', onclick: () => close() }, t(S.skip)));
  close = modal(wrap, { title: t(S.bossRelic), closable: false });
}

/* ================================================================== shop */

export function shopScreen(app: App): HTMLElement {
  const run = app.run!;
  const el = h('div', { class: 'screen' });
  el.append(app.topBar(), app.relicBar());
  const merchant = h('div', { class: 'merchant' });
  merchant.append(h('img', { src: spriteUrl('goblin', { a: '#c9a07a', b: '#9a7050', h: '#5a2d6b' }), alt: '', style: { width: '64px', height: '64px' } }));
  merchant.append(h('div', { class: 'bubble' }, t(S.shopGreet)));
  el.append(merchant);
  const sc = h('div', { class: 'scroll' });
  const grid = h('div', { class: 'shop-grid' });
  const refresh = () => app.renderRun();
  const priceEl = (price: number, sale?: boolean) =>
    h('div', { class: `price ${run.gold < price ? 'poor' : ''}`, html: `${iconImg('coin', undefined, 'ico')}${price}${sale ? `<span class="sale">-50%</span>` : ''}` });
  const buy = (i: number, extra?: number) => {
    const it = run.shop![i];
    if (run.gold < it.price) {
      audio.sfx('error');
      toast(t(S.notEnoughGold), 'coin');
      return;
    }
    if (buyItem(run, i, extra)) {
      audio.sfx('coin');
      refresh();
    } else {
      audio.sfx('error');
      if (it.kind === 'potion') toast(t(S.potionsFull), 'potion');
    }
  };
  (run.shop ?? []).forEach((it, i) => {
    if (it.kind !== 'card') return;
    const wrap = h('div', { class: `shop-item ${it.sold ? 'sold' : ''}` });
    const ce = cardEl({ id: it.id!, up: !!it.up });
    wrap.append(ce, priceEl(it.price, it.sale));
    ce.addEventListener('click', () => {
      const body = h('div', { class: 'big-card-preview' }, cardEl({ id: it.id!, up: !!it.up }, { cw: 180 }));
      let close = () => {};
      const foot = h(
        'div',
        { class: 'row', style: { gap: '8px' } },
        h('button', { class: 'btn ghost', style: { flex: '1' }, onclick: () => close() }, t(S.cancel)),
        h(
          'button',
          {
            class: `btn gold ${run.gold < it.price ? 'disabled' : ''}`,
            style: { flex: '1' },
            html: `${iconImg('coin', undefined, 'ico')} ${it.price}`,
            onclick: () => {
              close();
              buy(i);
            },
          },
        ),
      );
      close = modal(body, { footer: foot });
    });
    grid.append(wrap);
  });
  sc.append(grid);
  const row2 = h('div', { class: 'shop-grid', style: { marginTop: '16px' } });
  (run.shop ?? []).forEach((it, i) => {
    if (it.kind === 'card') return;
    const wrap = h('div', { class: `shop-item ${it.sold ? 'sold' : ''}` });
    let icon = '';
    let tip = '';
    if (it.kind === 'relic') {
      const rd = RELICS[it.id!];
      icon = iconImg(rd.icon, rd.tint, '');
      tip = relicTipHtml(it.id!);
    } else if (it.kind === 'potion') {
      icon = iconImg('potion', POTIONS[it.id!].color, '');
      tip = potionTipHtml(it.id!);
    } else {
      icon = iconImg('skull', undefined, '');
      tip = `<h4>${t(S.removeService)}</h4><div>${t(S.removeDesc)}</div>`;
    }
    const box = h('button', { class: 'round-item', html: icon });
    wrap.append(box, priceEl(it.kind === 'remove' ? removalPrice(run, app.profile) : it.price));
    if (it.kind === 'remove') wrap.append(h('div', { class: 'muted', style: { fontSize: '11px', textAlign: 'center' } }, t(S.removeService)));
    box.addEventListener('click', () => {
      const body = h('div', { class: 'col center', html: `<div>${icon.replace('class=""', 'class="ico xl"')}</div>${tip}` });
      let close = () => {};
      const foot = h(
        'div',
        { class: 'row', style: { gap: '8px', marginTop: '8px' } },
        h('button', { class: 'btn ghost', style: { flex: '1' }, onclick: () => close() }, t(S.cancel)),
        h(
          'button',
          {
            class: `btn gold ${run.gold < it.price ? 'disabled' : ''}`,
            style: { flex: '1' },
            html: `${iconImg('coin', undefined, 'ico')} ${it.price}`,
            onclick: () => {
              close();
              if (it.kind === 'remove') {
                if (run.gold < it.price) return buy(i);
                deckModal(run.deck, { title: t(S.pickRemove), pick: (c) => buy(i, c.uid) });
              } else buy(i);
            },
          },
        ),
      );
      close = modal(body, { footer: foot });
    });
    row2.append(wrap);
  });
  sc.append(row2);
  el.append(sc);
  el.append(
    h(
      'div',
      { class: 'footer' },
      h(
        'button',
        {
          class: 'btn wide',
          onclick: () => {
            audio.sfx('click');
            proceed(run, app.profile);
            app.renderRun();
          },
        },
        t(S.leaveShop),
      ),
    ),
  );
  void showTip;
  return el;
}

/* ================================================================= event */

export function eventScreen(app: App): HTMLElement {
  const run = app.run!;
  const ev = run.event!;
  const def = EVENTS[ev.id];
  const page = def.pages[ev.page];
  const el = h('div', { class: 'screen' });
  el.append(app.topBar(), app.relicBar());
  const art = h('div', { class: 'event-art' });
  art.style.backgroundImage = `linear-gradient(#0006, #000a), url(${battleBackdrop(enemyAct(run), 11 + ev.id.length)})`;
  art.innerHTML = iconImg(def.art, '#ffe08a', '');
  el.append(art);
  const sc = h('div', { class: 'scroll', style: { padding: '0' } });
  sc.append(h('h2', { style: { padding: '12px 16px 0', color: '#ffe08a' } }, t(def.title)));
  sc.append(h('div', { class: 'event-text' }, t(page.text)));
  const opts = h('div', { class: 'col', style: { padding: '0 14px 16px' } });
  const api = { run, vars: ev.vars } as unknown as EventApi;
  page.options.forEach((o, i) => {
    let ok = true;
    try {
      ok = o.cond ? o.cond(api) : true;
    } catch {
      ok = true;
    }
    const vars = Object.fromEntries(Object.entries(ev.vars).filter(([k]) => !k.startsWith('__'))) as Record<string, string | number>;
    const b = h('button', { class: 'event-opt', html: `${t(o.label, vars)}${o.hint ? `<small>${t(o.hint, vars)}</small>` : ''}` });
    if (!ok) b.setAttribute('disabled', 'true');
    b.addEventListener('click', () => {
      audio.sfx('click');
      const res = eventChoose(run, i, app.profile);
      if (res === 'select') {
        const sel = eventPendingSelect(run)!;
        const title = sel.kind === 'remove' ? t(S.pickRemove) : sel.kind === 'upgrade' ? t(S.pickUpgrade) : sel.kind === 'transform' ? t(S.pickTransform) : t(S.pickDuplicate);
        const list = sel.kind === 'upgrade' ? upgradableCards(run) : run.deck;
        deckModal(list, {
          title,
          showUpgrade: sel.kind === 'upgrade',
          pick: (c) => {
            eventResolveSelect(run, c.uid);
            audio.sfx('magic');
            app.renderRun();
          },
          onCancel: () => {
            if (eventPendingSelect(run)) {
              eventResolveSelect(run, null);
              app.renderRun();
            }
          },
        });
        return;
      }
      if (res === 'reward') {
        const r = run.rewards![0];
        const wrap = h('div', { class: 'card-choice' });
        let close = () => {};
        r.cards!.forEach((id, j) => {
          const ce = cardEl({ id, up: !!r.cardsUp?.[j] });
          ce.addEventListener('click', () => {
            eventTakeCard(run, j);
            audio.sfx('draw');
            close();
            app.renderRun();
          });
          wrap.append(ce);
        });
        const skip = h('button', {
          class: 'btn small ghost wide',
          style: { marginTop: '10px' },
          onclick: () => {
            eventTakeCard(run, null);
            close();
            app.renderRun();
          },
        }, t(S.skip));
        close = modal(h('div', {}, wrap, skip), { title: t(S.chooseCard), closable: false });
        return;
      }
      if (ev.vars.gotRelic && typeof ev.vars.gotRelic === 'string') {
        const rd = RELICS[ev.vars.gotRelic];
        if (rd) toast(t(rd.name), rd.icon, rd.tint);
        delete ev.vars.gotRelic;
      }
      app.renderRun();
    });
    opts.append(b);
  });
  sc.append(opts);
  el.append(sc);
  return el;
}

/* ================================================================== rest */

export function restScreen(app: App): HTMLElement {
  const run = app.run!;
  const el = h('div', { class: 'screen' });
  el.append(app.topBar(), app.relicBar());
  const body = h('div', { class: 'scroll col', style: { alignItems: 'center', gap: '14px', paddingTop: '20px' } });
  body.append(h('h2', { style: { color: '#ffb347' } }, t(S.restTitle)));
  body.append(h('img', { class: 'rest-fire', src: '', alt: '' }));
  (body.lastChild as HTMLImageElement).outerHTML = iconImg('campfire', undefined, 'rest-fire');
  body.append(h('img', { src: spriteUrl('hero:' + run.cls), alt: '', style: { width: '72px', height: '72px', marginTop: '-20px' } }));
  const done = run.rest?.done;
  if (done) {
    body.append(h('p', { class: 'muted center' }, t(S.restDone)));
  } else {
    const opts = h('div', { class: 'grid2', style: { width: '100%' } });
    const heal = restHealAmount(run, app.profile);
    const healOk = canRestHeal(run);
    const hb = h('button', {
      class: `panel col ${healOk ? '' : 'disabled'}`,
      style: { alignItems: 'center', opacity: healOk ? '1' : '0.4' },
      html: `${iconImg('heart', undefined, 'ico xl')}<b class="px" style="font-size:20px">${t(S.restHeal)}</b><span class="muted">${healOk ? t(S.restHealDesc, { n: heal }) : t(S.restNoHeal)}</span>`,
    });
    hb.addEventListener('click', () => {
      if (!healOk) return;
      if (doRest(run, 'heal', app.profile)) {
        audio.sfx('heal');
        app.renderRun();
      }
    });
    const ub = h('button', {
      class: 'panel col',
      style: { alignItems: 'center' },
      html: `${iconImg('hammer', '#c3c8d4', 'ico xl')}<b class="px" style="font-size:20px">${t(S.restUpgrade)}</b><span class="muted">${t(S.restUpgradeDesc)}</span>`,
    });
    ub.addEventListener('click', () => {
      deckModal(upgradableCards(run), {
        title: t(S.pickUpgrade),
        showUpgrade: true,
        pick: (c) => {
          if (doRest(run, 'upgrade', app.profile, c.uid)) {
            audio.sfx('magic');
            app.renderRun();
          }
        },
      });
    });
    opts.append(hb, ub);
    if (run.relics.includes('pickaxe')) {
      const rb = h('button', {
        class: 'panel col',
        style: { alignItems: 'center', gridColumn: '1 / -1' },
        html: `${iconImg('pickaxe', '#9aa7b8', 'ico xl')}<b class="px" style="font-size:20px">${t(S.restRemove)}</b><span class="muted">${t(S.restRemoveDesc)}</span>`,
      });
      rb.addEventListener('click', () =>
        deckModal(run.deck, {
          title: t(S.pickRemove),
          pick: (c) => {
            if (doRest(run, 'remove', app.profile, c.uid)) app.renderRun();
          },
        }),
      );
      opts.append(rb);
    }
    body.append(opts);
  }
  el.append(body);
  el.append(
    h(
      'div',
      { class: 'footer' },
      h(
        'button',
        {
          class: `btn wide ${done ? 'gold' : 'ghost'}`,
          onclick: () => {
            audio.sfx('click');
            proceed(run, app.profile);
            app.renderRun();
          },
        },
        done ? t(S.proceed) : t(S.skip),
      ),
    ),
  );
  return el;
}

/* ============================================================== treasure */

export function treasureScreen(app: App): HTMLElement {
  const run = app.run!;
  const tr = run.treasure!;
  const el = h('div', { class: 'screen' });
  el.append(app.topBar(), app.relicBar());
  const body = h('div', { class: 'scroll col', style: { alignItems: 'center', gap: '16px', paddingTop: '30px' } });
  body.append(h('h2', { style: { color: '#ffd35a' } }, t(S.treasureTitle)));
  const chest = h('button', { html: iconImg('chest', undefined, 'chest-img') });
  body.append(chest);
  if (tr.opened) {
    const rd = RELICS[tr.relic];
    body.append(h('div', { class: 'reward-item', html: `${iconImg('coin', undefined, '')}<span>${t(S.gold, { n: tr.gold })}</span>` }));
    if (rd) body.append(h('div', { class: 'reward-item', html: `${iconImg(rd.icon, rd.tint, '')}<span>${t(rd.name)}<small>${t(rd.desc)}</small></span>` }));
  } else {
    const open = () => {
      audio.sfx('chest');
      openChest(run);
      app.renderRun();
    };
    chest.addEventListener('click', open);
    body.append(h('button', { class: 'btn gold', onclick: open }, t(S.openChest)));
  }
  el.append(body);
  if (tr.opened)
    el.append(
      h(
        'div',
        { class: 'footer' },
        h(
          'button',
          {
            class: 'btn gold wide',
            onclick: () => {
              proceed(run, app.profile);
              app.renderRun();
            },
          },
          t(S.proceed),
        ),
      ),
    );
  return el;
}
