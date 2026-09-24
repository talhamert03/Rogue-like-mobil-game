import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { generateMap, availableNodes } from '../../src/engine/map';
import { newRun, startCombat, getCombat, saveRun, loadRun, finishCombat, takeReward, proceed, enterNode } from '../../src/engine/run';
import { defaultProfile } from '../../src/engine/meta';
import { botPlayRun, botFightCombat } from '../../src/engine/bot';
import { CARD_LIST } from '../../src/data/cards';
import { describeCard } from '../../src/data/cardText';
import { ENEMY_LIST } from '../../src/data/enemies';
import { ENCOUNTER_LIST } from '../../src/data/encounters';
import { CLASS_ORDER, CLASSES } from '../../src/data/classes';
import { RELICS } from '../../src/data/relics';
import { setLang } from '../../src/i18n/i18n';
import type { Unit } from '../../src/engine/types';

const profile = defaultProfile();

function combatWith(enc: string, cls = CLASS_ORDER[0], seed = 42) {
  const run = newRun({ cls, mode: 'classic', seed }, profile);
  const c = startCombat(run, enc);
  c.flush();
  return { run, c };
}

describe('rng', () => {
  it('is deterministic and serializable', () => {
    const a = Rng.fromSeed(123);
    const seq = [a.next(), a.next(), a.int(1, 10)];
    const b = Rng.fromSeed(123);
    expect([b.next(), b.next(), b.int(1, 10)]).toEqual(seq);
    const state = { ...a.state };
    const c = new Rng(state);
    expect(c.next()).toBe(a.next());
  });
});

describe('map', () => {
  it('generates a connected layered map with fixed rows', () => {
    for (let seed = 0; seed < 30; seed++) {
      const m = generateMap(Rng.fromSeed(seed), 1, 'a1_b_warden');
      expect(m.nodes.filter((n) => n.row === 0).every((n) => n.type === 'battle')).toBe(true);
      expect(m.nodes.filter((n) => n.row === 6).every((n) => n.type === 'treasure')).toBe(true);
      expect(m.nodes.filter((n) => n.row === m.rows - 1).every((n) => n.type === 'rest')).toBe(true);
      // every non-final node leads somewhere
      for (const n of m.nodes) if (n.row < m.rows - 1) expect(n.next.length).toBeGreaterThan(0);
      // no elites in the first rows
      expect(m.nodes.some((n) => n.type === 'elite' && n.row < 4)).toBe(false);
      expect(availableNodes(m).length).toBeGreaterThan(0);
    }
  });
});

describe('data integrity', () => {
  it('every card has a spec and a description in both languages', () => {
    for (const lang of ['tr', 'en'] as const) {
      setLang(lang);
      for (const d of CARD_LIST) {
        for (const up of [false, true]) {
          const text = describeCard(d.id, up);
          expect(text.length, `${d.id} ${lang}`).toBeGreaterThan(2);
          expect(text).not.toContain('undefined');
        }
      }
    }
    setLang('tr');
  });
  it('class decks and relics exist', () => {
    for (const cls of CLASS_ORDER) {
      const def = CLASSES[cls];
      expect(def.deck.length).toBe(10);
      expect(RELICS[def.relic]).toBeTruthy();
      // each class has a full card pool
      expect(CARD_LIST.filter((c) => c.pool === cls && c.rarity !== 'starter').length).toBeGreaterThanOrEqual(15);
    }
  });
  it('every encounter references valid enemies and free tiles', () => {
    const ids = new Set(ENEMY_LIST.map((e) => e.id));
    for (const e of ENCOUNTER_LIST) {
      const pos = new Set<number>();
      for (const en of e.enemies) {
        expect(ids.has(en.id), en.id).toBe(true);
        expect(pos.has(en.pos)).toBe(false);
        pos.add(en.pos);
        expect(en.pos).toBeGreaterThan(1);
        expect(en.pos).toBeLessThan(8);
      }
    }
  });
});

describe('combat rules', () => {
  it('applies strength, weak and vulnerable in the right order', () => {
    const { c } = combatWith('a1_zombie');
    const hero = c.hero;
    const z = c.enemies()[0];
    expect(c.calcAttack(hero, z, 6)).toBe(6);
    hero.st.strength = 2;
    expect(c.calcAttack(hero, z, 6)).toBe(8);
    z.st.vulnerable = 1;
    expect(c.calcAttack(hero, z, 6)).toBe(12);
    hero.st.weak = 1;
    expect(c.calcAttack(hero, z, 6)).toBe(9);
  });

  it('block absorbs damage before hp', () => {
    const { c } = combatWith('a1_zombie');
    const z = c.enemies()[0];
    z.block = 5;
    const hp = z.hp;
    c.dealDamage(c.hero, z, 8, { attack: true });
    expect(z.block).toBe(0);
    expect(z.hp).toBe(hp - 3);
  });

  it('melee cards need adjacency and movement costs MP', () => {
    const { c } = combatWith('a1_zombie');
    const slash = c.s.hand.find((x) => x.id === 'slash');
    const z = c.enemies()[0];
    if (slash) expect(c.validTargets(slash).units).not.toContain(z.uid);
    const mp = c.s.mp;
    const tiles = c.heroMoveTiles();
    expect(tiles.length).toBeGreaterThan(0);
    const to = Math.max(...tiles);
    expect(c.moveHero(to)).toBe(true);
    expect(c.s.mp).toBe(mp - Math.abs(to - 1));
  });

  it('pushing into a wall deals collision damage', () => {
    const { c } = combatWith('a1_zombie');
    const z = c.enemies()[0];
    z.pos = 7;
    const hp = z.hp;
    c.push(z, 1, 2);
    expect(z.pos).toBe(7);
    expect(z.hp).toBeLessThan(hp);
  });

  it('pushing into another unit damages both', () => {
    const { c } = combatWith('a1_oozes');
    const [a, b] = c.enemies();
    a.pos = 5;
    b.pos = 6;
    const ha = a.hp;
    const hb = b.hp;
    c.push(a, 1, 1);
    expect(a.hp).toBeLessThan(ha);
    expect(b.hp).toBeLessThan(hb);
  });

  it('traps trigger when enemies walk onto them', () => {
    const { c } = combatWith('a1_zombie');
    const z = c.enemies()[0];
    z.pos = 5;
    c.placeTile({ pos: 4, kind: 'trap', trap: 'bear', n: 8, radius: 0, owner: 'hero' });
    const hp = z.hp;
    c.walkToward(z, c.hero.pos, 2, 1);
    expect(z.hp).toBe(hp - 8);
    expect(z.st.root).toBeGreaterThan(0);
    expect(z.pos).toBe(4);
  });

  it('poison ticks and decays at the start of the unit turn', () => {
    const { c } = combatWith('a1_zombie');
    const z = c.enemies()[0];
    c.applyStatus(z, 'poison', 3, c.hero);
    const hp = z.hp;
    c.endTurn();
    expect(z.hp).toBeLessThanOrEqual(hp - 3);
    expect(z.st.poison).toBe(2);
  });

  it('area intents only hit units on telegraphed tiles', () => {
    const { c } = combatWith('a1_b_warden');
    const boss = c.enemies()[0];
    boss.intent = { move: 'slam', kind: 'area', dmg: 14, tiles: [3, 4, 5] };
    const hp = c.hero.hp;
    c.hero.pos = 1;
    c.endTurn();
    expect(c.hero.hp).toBe(hp);
  });

  it('dodge negates an attack', () => {
    const { c } = combatWith('a1_zombie');
    const z = c.enemies()[0];
    c.hero.st.dodge = 1;
    const hp = c.hero.hp;
    c.dealDamage(z, c.hero, 10, { attack: true });
    expect(c.hero.hp).toBe(hp);
    expect(c.hero.st.dodge).toBeUndefined();
  });

  it('killing all enemies wins the combat', () => {
    const { c } = combatWith('a1_zombie');
    const z = c.enemies()[0];
    c.dealDamage(c.hero, z, 999, { attack: true });
    expect(c.s.phase).toBe('won');
  });

  it('summons occupy tiles and fight', () => {
    const { c } = combatWith('a1_zombie', 'necromancer');
    const u = c.summonAlly('skeleton', 2, false) as Unit;
    expect(u).toBeTruthy();
    expect(c.unitAt(2)?.uid).toBe(u.uid);
    const z = c.enemies()[0];
    z.pos = 3;
    const hp = z.hp;
    c.endTurn();
    expect(z.hp).toBeLessThan(hp);
  });

  it('bombs explode after the enemy turn', () => {
    const { c } = combatWith('a1_zombie', 'engineer');
    const z = c.enemies()[0];
    z.pos = 6;
    c.placeTile({ pos: 6, kind: 'bomb', n: 12, radius: 1, timer: 1, owner: 'hero' });
    const hp = z.hp;
    z.st.root = 5;
    c.endTurn();
    expect(z.hp).toBeLessThanOrEqual(hp - 12);
  });
});

describe('run flow', () => {
  it('save/load round-trips a run in the middle of combat', () => {
    const run = newRun({ cls: 'wizard', mode: 'classic', seed: 7 }, profile);
    enterNode(run, availableNodes(run.map)[0].id, profile);
    expect(run.screen).toBe('combat');
    saveRun(run);
    const loaded = loadRun()!;
    expect(loaded.combat?.units.length).toBe(run.combat?.units.length);
    const c = getCombat(loaded)!;
    const r = botFightCombat(c);
    expect(['won', 'lost', 'timeout']).toContain(r);
  });

  it('rewards can be taken and the run proceeds', () => {
    const run = newRun({ cls: 'warrior', mode: 'classic', seed: 11 }, profile);
    enterNode(run, availableNodes(run.map)[0].id, profile);
    const c = getCombat(run)!;
    for (const e of c.enemies()) c.dealDamage(c.hero, e, 999, { attack: true });
    finishCombat(run, profile);
    expect(run.screen).toBe('reward');
    const gold = run.gold;
    const gi = run.rewards!.findIndex((r) => r.kind === 'gold');
    expect(takeReward(run, gi)).toBe(true);
    expect(run.gold).toBeGreaterThan(gold);
    const ci = run.rewards!.findIndex((r) => r.kind === 'card');
    const deck = run.deck.length;
    expect(takeReward(run, ci, 0)).toBe(true);
    expect(run.deck.length).toBe(deck + 1);
    proceed(run, profile);
    expect(run.screen).toBe('map');
  });

  it.each(CLASS_ORDER)('bot can play a full %s run without errors', (cls) => {
    for (const seed of [1, 2]) {
      const run = newRun({ cls, mode: 'classic', seed }, profile);
      botPlayRun(run, profile);
      expect(['victory', 'defeat']).toContain(run.screen);
      expect(run.hp).toBeLessThanOrEqual(run.maxHp);
    }
  });

  it('tower and hell modes run', () => {
    const t = newRun({ cls: 'ranger', mode: 'tower', seed: 3 }, profile);
    botPlayRun(t, profile);
    expect(t.towerFloor).toBeGreaterThan(0);
    const h = newRun({ cls: 'paladin', mode: 'hell', hellLevel: 10, seed: 4 }, profile);
    expect(h.deck.some((c) => c.id === 'burden')).toBe(true);
    botPlayRun(h, profile);
    expect(['victory', 'defeat']).toContain(h.screen);
  });
});
