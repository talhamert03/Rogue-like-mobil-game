import { setLang, t } from '../i18n/i18n';
import { S } from '../i18n/strings';
import { loadProfile, saveProfile, type Profile } from '../engine/meta';
import { loadRun, saveRun, potionSlots, usePotionOnMap, discardPotion } from '../engine/run';
import type { RunState } from '../engine/runTypes';
import { audio } from '../audio/audio';
import { h, clear, setAnimSpeed } from './dom';
import { iconImg } from '../gfx/render';
import { RELICS } from '../data/relics';
import { POTIONS } from '../data/potions';
import { deckModal, showTip, relicTipHtml, potionTipHtml, modal, confirmModal } from './components';
import { titleScreen, modeScreen, classScreen, campScreen, libraryScreen, statsScreen, settingsScreen, helpScreen } from './screens/menus';
import { mapScreen } from './screens/map';
import { BattleScreen } from './screens/battle';
import { rewardScreen, shopScreen, eventScreen, restScreen, treasureScreen } from './screens/rooms';
import { endScreen } from './screens/end';
import type { GameMode } from '../engine/runTypes';

export type MenuScreen = 'title' | 'mode' | 'class' | 'camp' | 'library' | 'stats' | 'settings' | 'help';

export class App {
  root: HTMLElement;
  profile: Profile;
  run: RunState | null;
  pendingMode: { mode: GameMode; hell: number } = { mode: 'classic', hell: 1 };
  battle: BattleScreen | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.profile = loadProfile();
    this.run = loadRun();
    this.applySettings();
  }

  applySettings(): void {
    const s = this.profile.settings;
    setLang(s.lang);
    audio.setVolumes(s.sfx, s.music);
    setAnimSpeed(s.speed);
    document.title = t(S.gameName);
  }

  saveProfile(): void {
    saveProfile(this.profile);
  }

  save(): void {
    if (this.run) saveRun(this.run);
  }

  mount(el: HTMLElement): void {
    this.battle?.destroy();
    this.battle = null;
    clear(this.root);
    this.root.append(el);
  }

  go(screen: MenuScreen): void {
    audio.playMusic('menu');
    const map: Record<MenuScreen, (app: App) => HTMLElement> = {
      title: titleScreen,
      mode: modeScreen,
      class: classScreen,
      camp: campScreen,
      library: libraryScreen,
      stats: statsScreen,
      settings: settingsScreen,
      help: helpScreen,
    };
    this.mount(map[screen](this));
  }

  /** render the current run screen */
  renderRun(): void {
    const run = this.run;
    if (!run) return this.go('title');
    this.save();
    switch (run.screen) {
      case 'map':
        audio.playMusic('map');
        this.mount(mapScreen(this));
        break;
      case 'combat': {
        const boss = run.combat?.tier === 'boss';
        audio.playMusic(boss ? 'boss' : 'battle');
        const b = new BattleScreen(this);
        this.mount(b.el);
        this.battle = b;
        b.start();
        break;
      }
      case 'reward':
        this.mount(rewardScreen(this));
        break;
      case 'shop':
        audio.playMusic('map');
        this.mount(shopScreen(this));
        break;
      case 'event':
        audio.playMusic('map');
        this.mount(eventScreen(this));
        break;
      case 'rest':
        audio.playMusic('menu');
        this.mount(restScreen(this));
        break;
      case 'treasure':
        this.mount(treasureScreen(this));
        break;
      case 'victory':
      case 'defeat':
        audio.playMusic(null);
        this.mount(endScreen(this));
        break;
      default:
        this.mount(mapScreen(this));
    }
  }

  /* ---------------------------------------------------------- shared UI */

  topBar(opts: { onPotion?: (slot: number) => void } = {}): HTMLElement {
    const run = this.run!;
    const bar = h('div', { class: 'topbar' });
    bar.append(h('div', { class: 'stat', html: `${iconImg('heart', undefined, 'ico')}<span style="color:#ff9a8a">${run.hp}/${run.maxHp}</span>` }));
    bar.append(h('div', { class: 'stat', html: `${iconImg('coin', undefined, 'ico')}<span style="color:#ffd35a">${run.gold}</span>` }));
    const pots = h('div', { class: 'potions' });
    const slots = Math.max(run.potions.length, potionSlots(run, this.profile));
    while (run.potions.length < slots) run.potions.push(null);
    run.potions.forEach((p, i) => {
      const slot = h('button', { class: `potion-slot ${p ? 'full' : ''}` });
      if (p) {
        slot.innerHTML = iconImg('potion', POTIONS[p].color, '');
        slot.addEventListener('click', () => {
          if (opts.onPotion) opts.onPotion(i);
          else this.potionMenu(i);
        });
      }
      pots.append(slot);
    });
    bar.append(pots);
    bar.append(h('div', { class: 'spacer' }));
    const floor = run.mode === 'tower' ? t(S.towerFloor, { n: run.towerFloor }) : `${t(S.act, { n: run.act })}·${run.floor}`;
    bar.append(h('div', { class: 'stat muted', style: { fontSize: '13px' } }, floor));
    const deckBtn = h('button', { class: 'iconbtn', title: t(S.deck), html: iconImg('cards', '#b38cff', '') });
    deckBtn.append(h('span', { class: 'px', style: { position: 'absolute', fontSize: '11px', marginTop: '26px', marginLeft: '26px' } }, String(run.deck.length)));
    deckBtn.style.position = 'relative';
    deckBtn.addEventListener('click', () => deckModal(run.deck, { title: t(S.deckCount, { n: run.deck.length }) }));
    bar.append(deckBtn);
    const menuBtn = h('button', { class: 'iconbtn', title: t(S.menu), html: iconImg('gear', '#c3c8d4', '') });
    menuBtn.addEventListener('click', () => this.pauseMenu());
    bar.append(menuBtn);
    return bar;
  }

  relicBar(): HTMLElement {
    const run = this.run!;
    const bar = h('div', { class: 'relicbar' });
    for (const id of run.relics) {
      const r = RELICS[id];
      if (!r) continue;
      const el = h('button', { class: 'relic', html: iconImg(r.icon, r.tint, ''), dataset: { relic: id } });
      el.addEventListener('click', () => showTip(el, relicTipHtml(id)));
      bar.append(el);
    }
    return bar;
  }

  potionMenu(slot: number): void {
    const run = this.run!;
    const id = run.potions[slot];
    if (!id) return;
    const p = POTIONS[id];
    const body = h('div', { class: 'col center' });
    body.append(h('div', { html: iconImg('potion', p.color, 'ico xl') }));
    body.append(h('div', { html: potionTipHtml(id) }));
    let close = () => {};
    const row = h('div', { class: 'row', style: { gap: '8px', marginTop: '8px' } });
    if (!p.combatOnly)
      row.append(
        h(
          'button',
          {
            class: 'btn green',
            style: { flex: '1' },
            onclick: () => {
              usePotionOnMap(run, slot);
              audio.sfx('heal');
              close();
              this.renderRun();
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
            discardPotion(run, slot);
            close();
            this.renderRun();
          },
        },
        t(S.potionDiscard),
      ),
    );
    body.append(row);
    close = modal(body, {});
  }

  pauseMenu(): void {
    const body = h('div', { class: 'col' });
    let close = () => {};
    body.append(
      h('button', { class: 'btn wide', onclick: () => close() }, t(S.resume)),
      h(
        'button',
        {
          class: 'btn wide',
          onclick: () => {
            close();
            this.save();
            this.go('title');
          },
        },
        t(S.saveQuit),
      ),
      h(
        'button',
        {
          class: 'btn wide ghost',
          onclick: () => {
            close();
            const m = settingsScreen(this, true);
            modal(m, { title: t(S.settings) });
          },
        },
        t(S.settings),
      ),
      h(
        'button',
        {
          class: 'btn wide red',
          onclick: () => {
            close();
            confirmModal(t(S.abandonConfirm), () => {
              if (!this.run) return;
              this.run.screen = 'defeat';
              this.run.lastResult = 'abandoned';
              this.renderRun();
            });
          },
        },
        t(S.abandon),
      ),
    );
    close = modal(body, { title: t(S.menu) });
  }
}
