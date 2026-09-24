import { L } from '../i18n/i18n';
import type { AiCtx, EnemyDef, EnemyMove } from '../engine/types';

/* ------------------------------------------------------------ AI helpers */

type Ai = (c: AiCtx) => string;

/** pick from a weight table, never repeating a move more than `maxRep` times in a row */
function weighted(c: AiCtx, table: Record<string, number>, maxRep = 2): string {
  const hist = c.me.hist ?? [];
  const entries = Object.entries(table).filter(([k, w]) => {
    if (w <= 0) return false;
    let rep = 0;
    for (let i = hist.length - 1; i >= 0 && hist[i] === k; i--) rep++;
    return rep < maxRep;
  });
  const pool = entries.length ? entries : Object.entries(table);
  const total = pool.reduce((a, [, w]) => a + w, 0);
  let r = c.rng.next() * total;
  for (const [k, w] of pool) {
    r -= w;
    if (r < 0) return k;
  }
  return pool[0][0];
}

/** approach first when the hero is out of reach */
const melee =
  (reach: number, inner: Ai): Ai =>
  (c) =>
    c.dist > reach ? 'advance' : inner(c);

const cycle =
  (...moves: string[]): Ai =>
  (c) =>
    moves[(c.turn - 1) % moves.length];

const ADV: EnemyMove = { kind: 'move', name: L('İlerle', 'Advance') };
const RETREAT: EnemyMove = { kind: 'retreat', name: L('Geri Çekil', 'Fall Back') };

const ALL: EnemyDef[] = [];
const E = (d: EnemyDef) => ALL.push(d);

/* ================================================================ ACT 1 */

E({
  id: 'slimeGreen',
  name: L('Yeşil Balçık', 'Green Ooze'),
  sprite: 'slime',
  palette: { a: '#7ed957', b: '#4ea83a', c: '#2f6e24' },
  hp: [14, 18],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    tackle: { kind: 'attack', dmg: 6, name: L('Çarpma', 'Tackle') },
    spit: { kind: 'attack', dmg: 3, range: 3, target: { weak: 1 }, fx: 'acid', name: L('Asit Tükür', 'Acid Spit') },
  },
  ai: (c) => (c.dist > 3 ? 'advance' : c.dist > 1 ? 'spit' : weighted(c, { tackle: 3, spit: 1 })),
});

E({
  id: 'slimePurple',
  name: L('Mor Balçık', 'Violet Ooze'),
  sprite: 'slime',
  palette: { a: '#b77ef0', b: '#8a4fd1', c: '#5a2d94' },
  hp: [22, 26],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    goop: { kind: 'attack', dmg: 7, addCards: { card: 'slime', n: 1, to: 'discard' }, fx: 'acid', name: L('Yapışkan Çarpma', 'Sticky Slam') },
    harden: { kind: 'block', block: 8, self: { strength: 1 }, name: L('Katılaş', 'Harden') },
  },
  ai: melee(2, (c) => weighted(c, { goop: 3, harden: 1 })),
});

E({
  id: 'rat',
  name: L('Mahzen Faresi', 'Cellar Rat'),
  sprite: 'rat',
  hp: [8, 11],
  speed: 2,
  tier: 'normal',
  moves: {
    advance: ADV,
    bite: { kind: 'attack', dmg: 4, fx: 'bite', name: L('Isırık', 'Bite') },
    gnaw: { kind: 'attack', dmg: 2, target: { bleed: 2 }, fx: 'bite', name: L('Kemir', 'Gnaw') },
  },
  ai: melee(3, (c) => weighted(c, { bite: 2, gnaw: 1 })),
});

E({
  id: 'skeletonArcher',
  name: L('Kemik Okçu', 'Bone Archer'),
  sprite: 'skeletonArcher',
  hp: [18, 22],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    retreat: RETREAT,
    shoot: { kind: 'attack', dmg: 6, range: 4, fx: 'arrow', name: L('Ok', 'Shoot') },
    aim: { kind: 'buff', self: { strength: 2 }, block: 4, name: L('Nişan Al', 'Take Aim') },
  },
  ai: (c) => (c.dist <= 1 && c.last !== 'retreat' ? 'retreat' : c.dist > 5 ? 'advance' : weighted(c, { shoot: 3, aim: 1 })),
});

E({
  id: 'goblinThief',
  name: L('Goblin Hırsız', 'Goblin Pickpocket'),
  sprite: 'goblin',
  palette: { a: '#8fc25a', b: '#5e8c34', h: '#6b4a2b' },
  hp: [20, 24],
  speed: 2,
  tier: 'normal',
  moves: {
    advance: ADV,
    grab: { kind: 'attack', dmg: 5, steal: 15, name: L('Kap', 'Snatch') },
    smoke: { kind: 'block', block: 8, name: L('Duman', 'Smoke') },
    flee: { kind: 'escape', name: L('Kaç', 'Flee') },
  },
  ai: (c) => {
    if ((c.me.mem?.stolen ?? 0) > 0 && c.turn >= 4) return c.last === 'smoke' ? 'flee' : 'smoke';
    return c.dist > 3 ? 'advance' : 'grab';
  },
});

E({
  id: 'sporeling',
  name: L('Spor Mantarı', 'Sporeling'),
  sprite: 'mushroom',
  hp: [20, 24],
  speed: 0,
  tier: 'normal',
  moves: {
    burst: { kind: 'area', dmg: 4, radius: 1, target: { poison: 2 }, fx: 'spores', name: L('Spor Patlaması', 'Spore Burst') },
    shot: { kind: 'attack', dmg: 5, range: 5, target: { poison: 1 }, fx: 'spores', name: L('Spor Atışı', 'Spore Shot') },
    harden: { kind: 'block', block: 8, name: L('Sertleş', 'Harden') },
  },
  ai: (c) => (c.dist <= 1 ? weighted(c, { burst: 3, harden: 1 }) : weighted(c, { shot: 3, harden: 1 })),
});

E({
  id: 'caveBat',
  name: L('Mağara Yarasası', 'Cave Bat'),
  sprite: 'bat',
  hp: [10, 13],
  speed: 3,
  tier: 'normal',
  flying: true,
  moves: {
    advance: ADV,
    bite: { kind: 'attack', dmg: 4, lifesteal: true, fx: 'bite', name: L('Kan Emme', 'Leech') },
    screech: { kind: 'debuff', target: { weak: 1 }, fx: 'sound', name: L('Çığlık', 'Screech') },
  },
  ai: melee(4, (c) => weighted(c, { bite: 3, screech: 1 }, 1)),
});

E({
  id: 'zombie',
  name: L('Zombi', 'Zombie'),
  sprite: 'zombie',
  hp: [30, 35],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    claw: { kind: 'attack', dmg: 9, name: L('Pençe', 'Claw') },
    groan: { kind: 'buff', self: { strength: 2 }, name: L('İnilti', 'Groan') },
  },
  ai: melee(2, (c) => weighted(c, { claw: 3, groan: 1 })),
});

E({
  id: 'cultist',
  name: L('Kültist Çırak', 'Cult Acolyte'),
  sprite: 'cultist',
  hp: [24, 28],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    ritual: { kind: 'buff', self: { ritual: 2 }, name: L('Ayin', 'Ritual') },
    bolt: { kind: 'attack', dmg: 6, range: 3, fx: 'shadow', name: L('Karanlık Ok', 'Dark Bolt') },
  },
  ai: (c) => (c.turn === 1 ? 'ritual' : c.dist > 4 ? 'advance' : 'bolt'),
});

/* ---- act 1 elites */
E({
  id: 'boneKnight',
  name: L('Kemik Şövalye', 'Bone Knight'),
  sprite: 'knight',
  palette: { a: '#d8d2bd', b: '#a39c86', c: '#6d6755', e: '#ff5d5d' },
  scale: 1.2,
  hp: [64, 70],
  speed: 1,
  tier: 'elite',
  moves: {
    advance: ADV,
    charge: { kind: 'charge', dmg: 11, charge: 3, push: 1, name: L('Hücum', 'Charge') },
    cleave: { kind: 'attack', dmg: 13, fx: 'slash', name: L('Yarma', 'Cleave') },
    wall: { kind: 'block', block: 14, self: { strength: 2 }, name: L('Kalkan Duvarı', 'Shield Wall') },
  },
  ai: (c) => {
    if (c.dist > 1 && c.dist <= 4 && c.last !== 'charge') return 'charge';
    if (c.dist > 4) return 'advance';
    return weighted(c, { cleave: 3, wall: 2 }, 1);
  },
});

E({
  id: 'giantSlime',
  name: L('Dev Balçık', 'Giant Ooze'),
  sprite: 'slime',
  palette: { a: '#7ed957', b: '#4ea83a', c: '#2f6e24' },
  scale: 1.5,
  hp: [64, 68],
  speed: 1,
  tier: 'elite',
  moves: {
    advance: ADV,
    slam: { kind: 'area', dmg: 12, aroundTarget: 1, fx: 'slam', name: L('Ezme', 'Body Slam') },
    goop: { kind: 'attack', dmg: 7, range: 3, addCards: { card: 'slime', n: 2, to: 'discard' }, fx: 'acid', name: L('Balçık Yağmuru', 'Goo Rain') },
  },
  ai: (c) => (c.dist > 4 ? 'advance' : cycle('goop', 'slam', 'slam')(c)),
  onDeath: { split: ['slimeGreen', 'slimeGreen'] },
});

E({
  id: 'goblinShaman',
  name: L('Goblin Şaman', 'Goblin Shaman'),
  sprite: 'goblinShaman',
  hp: [42, 46],
  speed: 1,
  tier: 'elite',
  moves: {
    retreat: RETREAT,
    zap: { kind: 'attack', dmg: 8, range: 5, fx: 'lightning', name: L('Şimşek', 'Zap') },
    hex: { kind: 'debuff', target: { vulnerable: 2, weak: 1 }, fx: 'curse', name: L('Lanet', 'Hex') },
    mend: { kind: 'heal', healAllies: 8, name: L('Şifa', 'Mend') },
    empower: { kind: 'buff', allies: { strength: 2 }, self: { strength: 1 }, name: L('Savaş Boyası', 'War Paint') },
  },
  ai: (c) => {
    if (c.dist <= 1 && c.last !== 'retreat') return 'retreat';
    const hurt = c.allies.some((a) => a.hp < a.maxHp * 0.6);
    if (hurt && c.last !== 'mend') return 'mend';
    if (c.turn === 1) return 'hex';
    return weighted(c, { zap: 3, empower: c.allies.length ? 2 : 0, hex: 1 }, 1);
  },
});

E({
  id: 'goblinGrunt',
  name: L('Goblin Er', 'Goblin Grunt'),
  sprite: 'goblin',
  hp: [16, 20],
  speed: 2,
  tier: 'minion',
  moves: {
    advance: ADV,
    stab: { kind: 'attack', dmg: 6, name: L('Bıçakla', 'Stab') },
  },
  ai: melee(3, () => 'stab'),
});

/* ---- act 1 bosses */
E({
  id: 'cryptWarden',
  name: L('Mahzen Bekçisi', 'Crypt Warden'),
  sprite: 'golem',
  scale: 1.7,
  hp: [140, 140],
  speed: 1,
  tier: 'boss',
  moves: {
    advance: ADV,
    rocks: { kind: 'attack', dmg: 7, times: 2, range: 6, fx: 'rock', name: L('Taş Yağmuru', 'Rock Hail') },
    slam: { kind: 'area', dmg: 14, front: 3, fx: 'slam', name: L('Yıkım Darbesi', 'Crushing Slam') },
    fortify: { kind: 'block', block: 18, self: { strength: 1 }, name: L('Taşlaş', 'Fortify') },
    pound: { kind: 'area', dmg: 10, radius: 2, push: 1, fx: 'slam', name: L('Zemin Sarsıntısı', 'Ground Pound') },
  },
  ai: cycle('rocks', 'slam', 'fortify', 'pound', 'rocks', 'slam'),
  lore: L('Mahzenlerin girişini yüzyıllardır bekleyen canlı taş.', 'Living stone that has guarded the cellars for centuries.'),
});

E({
  id: 'ratKing',
  name: L('Fare Kralı', 'Rat King'),
  sprite: 'ratKing',
  scale: 1.6,
  hp: [120, 120],
  speed: 1,
  tier: 'boss',
  moves: {
    advance: ADV,
    summon: { kind: 'summon', summon: ['rat'], name: L('Sürüyü Çağır', 'Call the Swarm') },
    plague: { kind: 'attack', dmg: 10, range: 2, target: { poison: 3 }, fx: 'bite', name: L('Veba Isırığı', 'Plague Bite') },
    crush: { kind: 'area', dmg: 13, aroundTarget: 1, fx: 'slam', name: L('Taç Darbesi', 'Crown Crush') },
    squeak: { kind: 'buff', allies: { strength: 2 }, self: { strength: 1 }, block: 10, name: L('Buyruk', 'Decree') },
  },
  ai: (c) => {
    if (c.allies.length < 2 && c.last !== 'summon' && c.count('summon') < 4 && c.freeTiles > 2) return 'summon';
    if (c.dist > 3) return weighted(c, { advance: 1, squeak: 1 }, 1);
    return weighted(c, { plague: 2, crush: 2, squeak: 1 }, 1);
  },
});

/* ================================================================ ACT 2 */

E({
  id: 'caveSpider',
  name: L('Mağara Örümceği', 'Cave Spider'),
  sprite: 'spider',
  hp: [26, 30],
  speed: 2,
  tier: 'normal',
  moves: {
    advance: ADV,
    bite: { kind: 'attack', dmg: 7, target: { poison: 2 }, fx: 'bite', name: L('Zehirli Isırık', 'Venom Bite') },
    web: { kind: 'debuff', target: { root: 2, weak: 1 }, fx: 'web', name: L('Ağ', 'Web') },
  },
  ai: (c) => (c.dist > 4 ? 'advance' : c.dist > 1 && c.last !== 'web' ? weighted(c, { web: 1, advance: 1 }) : weighted(c, { bite: 3, web: 1 })),
});

E({
  id: 'spiderling',
  name: L('Örümcek Yavrusu', 'Spiderling'),
  sprite: 'spider',
  palette: { a: '#7a6a8c', b: '#4d4059', e: '#ff4d4d' },
  scale: 0.8,
  hp: [8, 10],
  speed: 2,
  tier: 'minion',
  moves: { advance: ADV, bite: { kind: 'attack', dmg: 4, target: { poison: 1 }, fx: 'bite', name: L('Isırık', 'Bite') } },
  ai: melee(3, () => 'bite'),
});

E({
  id: 'crystalBeetle',
  name: L('Kristal Böcek', 'Crystal Beetle'),
  sprite: 'beetle',
  hp: [32, 36],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    shell: { kind: 'block', block: 12, name: L('Kabuk', 'Shell') },
    ram: { kind: 'charge', dmg: 10, charge: 2, push: 1, name: L('Toslama', 'Ram') },
    bite: { kind: 'attack', dmg: 8, name: L('Çene', 'Mandibles') },
  },
  ai: (c) => (c.dist > 3 ? 'advance' : c.dist > 1 ? 'ram' : weighted(c, { bite: 2, shell: 2 })),
});

E({
  id: 'direWolf',
  name: L('Ulu Kurt', 'Dire Wolf'),
  sprite: 'wolf',
  hp: [30, 34],
  speed: 3,
  tier: 'normal',
  moves: {
    advance: ADV,
    maul: { kind: 'attack', dmg: 9, fx: 'bite', name: L('Parçala', 'Maul') },
    howl: { kind: 'buff', self: { strength: 2 }, allies: { strength: 1 }, fx: 'sound', name: L('Uluma', 'Howl') },
  },
  ai: melee(4, (c) => (c.turn === 1 ? 'howl' : weighted(c, { maul: 4, howl: 1 }))),
});

E({
  id: 'orcBrute',
  name: L('Ork Kaba', 'Orc Brute'),
  sprite: 'orc',
  hp: [44, 48],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    smash: { kind: 'attack', dmg: 16, fx: 'impact', name: L('Balyoz', 'Smash') },
    jab: { kind: 'attack', dmg: 8, name: L('Dürt', 'Jab') },
    roar: { kind: 'buff', self: { strength: 3 }, name: L('Kükreme', 'Roar') },
  },
  ai: melee(2, (c) => weighted(c, { smash: 2, jab: 2, roar: 1 }, 1)),
});

E({
  id: 'shadowMage',
  name: L('Gölge Büyücü', 'Shadow Mage'),
  sprite: 'mage',
  hp: [26, 30],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    retreat: RETREAT,
    bolt: { kind: 'attack', dmg: 10, range: 5, fx: 'shadow', name: L('Gölge Oku', 'Shadow Bolt') },
    confuse: { kind: 'debuff', addCards: { card: 'daze', n: 2, to: 'draw' }, target: { frail: 1 }, fx: 'curse', name: L('Kafa Karıştır', 'Befuddle') },
  },
  ai: (c) => (c.dist <= 1 && c.last !== 'retreat' ? 'retreat' : c.dist > 5 ? 'advance' : weighted(c, { bolt: 3, confuse: 1 }, 2)),
});

E({
  id: 'gargoyle',
  name: L('Taş Gargoyl', 'Stone Gargoyle'),
  sprite: 'gargoyle',
  hp: [36, 40],
  speed: 2,
  tier: 'normal',
  flying: true,
  moves: {
    advance: ADV,
    stone: { kind: 'block', block: 15, name: L('Taş Form', 'Stone Form') },
    dive: { kind: 'charge', dmg: 12, charge: 4, name: L('Dalış', 'Dive') },
  },
  ai: (c) => (c.dist > 5 ? 'advance' : c.last === 'stone' ? 'dive' : c.last === 'dive' ? 'stone' : c.turn === 1 ? 'stone' : 'dive'),
});

E({
  id: 'gargoyleAlpha',
  name: L('Gargoyl Muhafız', 'Gargoyle Sentinel'),
  sprite: 'gargoyle',
  palette: { a: '#8c7f9e', b: '#5f5470', c: '#3b3347', e: '#ff7a3d' },
  scale: 1.2,
  hp: [58, 62],
  speed: 2,
  tier: 'elite',
  flying: true,
  moves: {
    advance: ADV,
    stone: { kind: 'block', block: 18, self: { strength: 2 }, name: L('Taş Form', 'Stone Form') },
    dive: { kind: 'charge', dmg: 14, charge: 4, push: 1, name: L('Dalış', 'Dive') },
    screech: { kind: 'debuff', target: { vulnerable: 2 }, fx: 'sound', name: L('Taş Çığlık', 'Stone Shriek') },
  },
  ai: (c) => (c.dist > 5 ? 'advance' : cycle('screech', 'dive', 'stone', 'dive')(c)),
});

E({
  id: 'koboldBomber',
  name: L('Kobold Bombacı', 'Kobold Bomber'),
  sprite: 'kobold',
  hp: [22, 26],
  speed: 1,
  tier: 'normal',
  moves: {
    retreat: RETREAT,
    bomb: { kind: 'area', dmg: 10, aroundTarget: 1, fx: 'explosion', name: L('Bomba', 'Bomb') },
    knife: { kind: 'attack', dmg: 5, name: L('Bıçak', 'Knife') },
  },
  ai: (c) => (c.dist <= 1 ? weighted(c, { knife: 1, retreat: 1 }, 1) : c.last === 'bomb' ? weighted(c, { retreat: 1, bomb: 1 }, 1) : 'bomb'),
});

E({
  id: 'fungalBrute',
  name: L('Mantar Kafa', 'Fungal Brute'),
  sprite: 'mushroom',
  palette: { a: '#d9534f', b: '#a33a36', c: '#f4efe0', d: '#c9bfa6' },
  scale: 1.2,
  hp: [38, 42],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    headbutt: { kind: 'attack', dmg: 11, fx: 'impact', name: L('Kafa Atma', 'Headbutt') },
    spores: { kind: 'area', dmg: 3, radius: 1, target: { poison: 3 }, fx: 'spores', name: L('Sporlar', 'Spores') },
  },
  ai: melee(2, (c) => weighted(c, { headbutt: 2, spores: 1 })),
});

/* ---- act 2 elites */
E({
  id: 'spiderQueen',
  name: L('Örümcek Kraliçe', 'Spider Queen'),
  sprite: 'spider',
  palette: { a: '#3d2d4f', b: '#241a30', e: '#ff3d6e', c: '#a13dff' },
  scale: 1.6,
  hp: [106, 112],
  speed: 1,
  tier: 'elite',
  moves: {
    advance: ADV,
    brood: { kind: 'summon', summon: ['spiderling', 'spiderling'], name: L('Kuluçka', 'Brood') },
    spray: { kind: 'area', dmg: 8, front: 3, target: { poison: 3 }, fx: 'acid', name: L('Zehir Püskürt', 'Venom Spray') },
    web: { kind: 'debuff', target: { root: 2, weak: 2 }, fx: 'web', name: L('Dev Ağ', 'Great Web') },
    bite: { kind: 'attack', dmg: 14, fx: 'bite', name: L('Ölümcül Isırık', 'Fatal Bite') },
  },
  ai: (c) => {
    if (c.allies.length < 2 && c.last !== 'brood' && c.freeTiles > 2) return 'brood';
    if (c.dist <= 1) return weighted(c, { bite: 2, spray: 1 }, 1);
    return weighted(c, { spray: 2, web: 1, advance: 1 }, 1);
  },
});

E({
  id: 'orcWarlord',
  name: L('Ork Savaş Beyi', 'Orc Warlord'),
  sprite: 'orc',
  palette: { a: '#6f9a3a', b: '#4b6b26', h: '#8c1c1c', m: '#b8b8b8' },
  scale: 1.4,
  hp: [114, 120],
  speed: 1,
  tier: 'elite',
  moves: {
    advance: ADV,
    cleave: { kind: 'area', dmg: 15, front: 2, fx: 'slash', name: L('Geniş Yarma', 'Great Cleave') },
    warcry: { kind: 'buff', self: { strength: 3 }, block: 10, fx: 'sound', name: L('Savaş Çığlığı', 'War Cry') },
    axe: { kind: 'attack', dmg: 12, range: 4, fx: 'axe', name: L('Balta Fırlat', 'Axe Throw') },
  },
  ai: (c) => (c.turn === 1 ? 'warcry' : c.dist > 2 ? weighted(c, { axe: 2, advance: 1 }, 1) : weighted(c, { cleave: 3, warcry: 1 }, 1)),
});

E({
  id: 'crystalGolem',
  name: L('Kristal Golem', 'Crystal Golem'),
  sprite: 'golem',
  palette: { a: '#8fe3ff', b: '#4fb3d9', c: '#2a7aa0', e: '#ffffff' },
  scale: 1.4,
  hp: [98, 104],
  speed: 1,
  tier: 'elite',
  moves: {
    advance: ADV,
    burst: { kind: 'area', dmg: 12, radius: 2, fx: 'crystal', name: L('Kristal Patlaması', 'Crystal Burst') },
    reflect: { kind: 'buff', self: { thorns: 3 }, block: 15, name: L('Yansıtıcı Kabuk', 'Prism Shell') },
    punch: { kind: 'attack', dmg: 14, fx: 'impact', name: L('Kristal Yumruk', 'Crystal Fist') },
  },
  ai: (c) => (c.dist > 3 ? weighted(c, { advance: 2, reflect: 1 }, 1) : cycle('burst', 'punch', 'reflect')(c)),
});

/* ---- act 2 bosses */
E({
  id: 'myceliumMother',
  name: L('Mantar Ana', 'Mycelium Mother'),
  sprite: 'mushroomBoss',
  scale: 1.8,
  hp: [200, 200],
  speed: 0,
  tier: 'boss',
  moves: {
    spawn: { kind: 'summon', summon: ['sporeling'], name: L('Tomurcuklan', 'Bud') },
    cloud: { kind: 'area', dmg: 4, radius: 3, target: { poison: 2 }, fx: 'spores', name: L('Zehir Bulutu', 'Toxic Cloud') },
    tendril: { kind: 'attack', dmg: 12, range: 6, pull: 3, fx: 'vine', name: L('Kök Kamçısı', 'Root Lash') },
    regrow: { kind: 'heal', heal: 20, block: 15, name: L('Yeniden Filizlen', 'Regrow') },
  },
  ai: (c) => {
    if (c.allies.length < 1 && c.last !== 'spawn') return 'spawn';
    return cycle('tendril', 'cloud', 'spawn', 'tendril', 'regrow', 'cloud')(c);
  },
});

E({
  id: 'trollKing',
  name: L('Trol Kral', 'Troll King'),
  sprite: 'troll',
  scale: 1.8,
  hp: [220, 220],
  speed: 1,
  tier: 'boss',
  start: { regen: 4 },
  moves: {
    advance: ADV,
    club: { kind: 'area', dmg: 16, aroundTarget: 1, fx: 'slam', name: L('Tokmak', 'Club Slam') },
    charge: { kind: 'charge', dmg: 14, charge: 3, push: 2, name: L('Hücum', 'Stampede') },
    rocks: { kind: 'attack', dmg: 9, times: 2, range: 5, fx: 'rock', name: L('Kaya Fırlat', 'Boulder Toss') },
    regen: { kind: 'buff', self: { regen: 6 }, block: 10, name: L('Yenilen', 'Regenerate') },
  },
  ai: (c) => {
    if (c.me.hp < c.me.maxHp * 0.5 && c.count('regen') < 2 && c.last !== 'regen') return 'regen';
    if (c.dist > 1 && c.dist <= 4 && c.last !== 'charge') return weighted(c, { charge: 2, rocks: 1 }, 1);
    if (c.dist > 4) return 'rocks';
    return weighted(c, { club: 3, rocks: 1 }, 1);
  },
});

/* ================================================================ ACT 3 */

E({
  id: 'imp',
  name: L('İblis Yavrusu', 'Imp'),
  sprite: 'imp',
  hp: [28, 32],
  speed: 3,
  tier: 'normal',
  flying: true,
  moves: {
    advance: ADV,
    spit: { kind: 'attack', dmg: 7, range: 3, target: { burn: 2 }, fx: 'fire', name: L('Ateş Tükür', 'Fire Spit') },
    cackle: { kind: 'buff', self: { strength: 2 }, name: L('Kıkırdama', 'Cackle') },
  },
  ai: (c) => (c.dist > 5 ? 'advance' : weighted(c, { spit: 3, cackle: 1 })),
});

E({
  id: 'hellhound',
  name: L('Cehennem Tazısı', 'Hellhound'),
  sprite: 'wolf',
  palette: { a: '#8c2b1f', b: '#5c1a12', e: '#ffcc33' },
  hp: [44, 48],
  speed: 3,
  tier: 'normal',
  moves: {
    advance: ADV,
    bite: { kind: 'attack', dmg: 12, fx: 'bite', name: L('Kor Dişler', 'Ember Fangs') },
    breath: { kind: 'area', dmg: 8, front: 3, target: { burn: 3 }, fx: 'fire', name: L('Alev Nefesi', 'Flame Breath') },
  },
  ai: (c) => (c.dist > 4 ? 'advance' : c.dist > 1 ? 'breath' : weighted(c, { bite: 2, breath: 1 })),
});

E({
  id: 'darkKnight',
  name: L('Kara Şövalye', 'Dark Knight'),
  sprite: 'knight',
  palette: { a: '#4a4a5a', b: '#2e2e3a', c: '#1b1b24', e: '#ff3d3d' },
  hp: [60, 66],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    slash: { kind: 'attack', dmg: 17, fx: 'slash', name: L('Ağır Kesik', 'Heavy Slash') },
    shield: { kind: 'block', block: 16, name: L('Kalkan', 'Shield Up') },
    charge: { kind: 'charge', dmg: 13, charge: 3, push: 2, name: L('Hücum', 'Charge') },
  },
  ai: (c) => (c.dist > 1 && c.dist <= 4 && c.last !== 'charge' ? 'charge' : c.dist > 4 ? 'advance' : weighted(c, { slash: 2, shield: 1 }, 1)),
});

E({
  id: 'wraith',
  name: L('Hortlak', 'Wraith'),
  sprite: 'ghost',
  hp: [40, 44],
  speed: 2,
  tier: 'normal',
  flying: true,
  moves: {
    advance: ADV,
    drain: { kind: 'attack', dmg: 10, lifesteal: true, fx: 'soul', name: L('Ruh Emme', 'Soul Drain') },
    fade: { kind: 'buff', self: { dodge: 1 }, block: 6, name: L('Sisleş', 'Fade') },
    wail: { kind: 'debuff', target: { weak: 2, frail: 2 }, fx: 'sound', name: L('Feryat', 'Wail') },
  },
  ai: melee(3, (c) => weighted(c, { drain: 3, fade: 1, wail: 1 }, 1)),
});

E({
  id: 'magmaGolem',
  name: L('Magma Golemi', 'Magma Golem'),
  sprite: 'golem',
  palette: { a: '#5a3a30', b: '#3a2420', c: '#24140f', e: '#ff8a2a' },
  scale: 1.2,
  hp: [66, 72],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    punch: { kind: 'attack', dmg: 14, target: { burn: 2 }, fx: 'fire', name: L('Lav Yumruğu', 'Lava Fist') },
    harden: { kind: 'block', block: 14, name: L('Soğu', 'Cool Down') },
  },
  ai: melee(2, (c) => weighted(c, { punch: 2, harden: 1 }, 1)),
  onDeath: { explode: { dmg: 12, radius: 1 } },
});

E({
  id: 'cultPriest',
  name: L('Tarikat Rahibi', 'Cult Priest'),
  sprite: 'cultist',
  palette: { a: '#5a1a2a', b: '#3a0f1a', e: '#ffd35a', s: '#d9c3a0' },
  hp: [42, 46],
  speed: 1,
  tier: 'normal',
  moves: {
    advance: ADV,
    retreat: RETREAT,
    mend: { kind: 'heal', healAllies: 12, name: L('Karanlık Şifa', 'Dark Mend') },
    smite: { kind: 'attack', dmg: 10, range: 4, fx: 'shadow', name: L('Lanet Oku', 'Curse Bolt') },
    daze: { kind: 'debuff', addCards: { card: 'daze', n: 2, to: 'draw' }, target: { weak: 1 }, fx: 'curse', name: L('Fısıltılar', 'Whispers') },
  },
  ai: (c) => {
    if (c.dist <= 1 && c.last !== 'retreat') return 'retreat';
    if (c.allies.some((a) => a.hp < a.maxHp * 0.6) && c.last !== 'mend') return 'mend';
    return c.dist > 4 ? 'advance' : weighted(c, { smite: 3, daze: 1 }, 1);
  },
});

E({
  id: 'watcherEye',
  name: L('Gözcü', 'Watcher'),
  sprite: 'eye',
  hp: [38, 42],
  speed: 1,
  tier: 'normal',
  flying: true,
  moves: {
    advance: ADV,
    beam: { kind: 'area', dmg: 11, front: 4, fx: 'beam', name: L('Işın', 'Beam') },
    stare: { kind: 'debuff', target: { vulnerable: 2 }, fx: 'eye', name: L('Delici Bakış', 'Piercing Gaze') },
  },
  ai: (c) => (c.dist > 5 ? 'advance' : c.last === 'beam' ? 'stare' : 'beam'),
});

E({
  id: 'skeletonWarrior',
  name: L('İskelet Savaşçı', 'Skeleton Warrior'),
  sprite: 'skeleton',
  hp: [14, 16],
  speed: 1,
  tier: 'minion',
  moves: { advance: ADV, hack: { kind: 'attack', dmg: 6, fx: 'slash', name: L('Kesik', 'Hack') } },
  ai: melee(2, () => 'hack'),
});

/* ---- act 3 elites */
E({
  id: 'pitFiend',
  name: L('Ateş İblisi', 'Pit Fiend'),
  sprite: 'demon',
  scale: 1.6,
  hp: [165, 175],
  speed: 1,
  tier: 'elite',
  moves: {
    advance: ADV,
    storm: { kind: 'area', dmg: 10, radius: 3, target: { burn: 3 }, fx: 'fire', name: L('Ateş Fırtınası', 'Firestorm') },
    claw: { kind: 'attack', dmg: 20, fx: 'slash', name: L('Pençe', 'Rend') },
    imps: { kind: 'summon', summon: ['imp'], name: L('İblis Çağır', 'Summon Imp') },
  },
  ai: (c) => (c.allies.length === 0 && c.last !== 'imps' && c.turn > 1 ? 'imps' : c.dist > 3 ? weighted(c, { storm: 1, advance: 1 }, 1) : weighted(c, { claw: 2, storm: 2 }, 1)),
});

E({
  id: 'necroLord',
  name: L('Ölü Lordu', 'Lord of the Dead'),
  sprite: 'lich',
  palette: { a: '#3b2d5a', b: '#241a3a', e: '#6cf0c2', s: '#d8d2bd' },
  scale: 1.3,
  hp: [135, 145],
  speed: 1,
  tier: 'elite',
  moves: {
    advance: ADV,
    raise: { kind: 'summon', summon: ['skeletonWarrior', 'skeletonWarrior'], name: L('Ölüleri Kaldır', 'Raise Dead') },
    drain: { kind: 'attack', dmg: 12, range: 5, lifesteal: true, fx: 'soul', name: L('Ruh Sifonu', 'Soul Siphon') },
    curse: { kind: 'debuff', target: { weak: 2, vulnerable: 2 }, fx: 'curse', name: L('Kara Lanet', 'Black Curse') },
  },
  ai: (c) => (c.allies.length < 2 && c.last !== 'raise' && c.freeTiles > 2 ? 'raise' : weighted(c, { drain: 3, curse: 1 }, 1)),
});

/* ---- act 3 bosses */
E({
  id: 'ashDragon',
  name: L('Kül Ejderi', 'Ash Dragon'),
  sprite: 'dragon',
  scale: 2,
  hp: [320, 320],
  speed: 1,
  tier: 'boss',
  moves: {
    advance: ADV,
    breath: { kind: 'area', dmg: 14, front: 5, target: { burn: 3 }, fx: 'fire', name: L('Kül Nefesi', 'Ashen Breath') },
    tail: { kind: 'area', dmg: 16, radius: 1, push: 3, fx: 'slam', name: L('Kuyruk Savurma', 'Tail Sweep') },
    gust: { kind: 'attack', dmg: 6, range: 7, push: 3, fx: 'wind', name: L('Kanat Rüzgârı', 'Wing Gust') },
    roar: { kind: 'buff', self: { strength: 3 }, block: 20, fx: 'sound', name: L('Kükreme', 'Roar') },
    bite: { kind: 'attack', dmg: 22, fx: 'bite', name: L('Ejder Isırığı', 'Dragon Bite') },
  },
  ai: (c) => {
    if (c.turn % 5 === 0) return 'roar';
    if (c.dist <= 1) return weighted(c, { tail: 2, bite: 2 }, 1);
    if (c.last === 'breath') return 'gust';
    return weighted(c, { breath: 3, gust: 1 }, 1);
  },
});

E({
  id: 'paleSovereign',
  name: L('Solgun Hükümdar', 'Pale Sovereign'),
  sprite: 'lich',
  scale: 1.9,
  hp: [300, 300],
  speed: 1,
  tier: 'boss',
  start: { ward: 1 },
  moves: {
    advance: ADV,
    rend: { kind: 'attack', dmg: 12, times: 2, range: 6, fx: 'soul', name: L('Ruh Yırtma', 'Soul Rend') },
    raise: { kind: 'summon', summon: ['skeletonWarrior', 'skeletonWarrior'], name: L('Ordu Kaldır', 'Raise Legion') },
    nova: { kind: 'area', dmg: 18, radius: 3, fx: 'soul', name: L('Ölüm Novası', 'Death Nova') },
    phylactery: { kind: 'block', block: 25, self: { ward: 2, strength: 2 }, name: L('Filakteri', 'Phylactery') },
    curse: { kind: 'debuff', target: { weak: 2, frail: 2 }, addCards: { card: 'daze', n: 2, to: 'draw' }, fx: 'curse', name: L('Hükümdarın Laneti', "Sovereign's Curse") },
  },
  ai: cycle('rend', 'raise', 'curse', 'nova', 'phylactery', 'rend', 'nova'),
});

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(ALL.map((e) => [e.id, e]));
export const ENEMY_LIST = ALL;
