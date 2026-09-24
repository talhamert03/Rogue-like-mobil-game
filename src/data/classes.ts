import { L, type LStr } from '../i18n/i18n';
import type { ClassId } from '../engine/types';

export interface ClassDef {
  id: ClassId;
  name: LStr;
  title: LStr;
  desc: LStr;
  mechanic: LStr;
  hp: number;
  mp: number;
  energy: number;
  hand: number;
  relic: string;
  deck: string[];
  color: string;
  unlock: number; // shard cost, 0 = unlocked from the start
}

const rep = (id: string, n: number) => Array.from({ length: n }, () => id);

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    id: 'warrior',
    name: L('Savaşçı', 'Warrior'),
    title: L('Demir İrade', 'Iron Will'),
    desc: L(
      'Ön safın ustası. Ağır darbeler, sağlam blok ve düşmanları duvara çarpan itişlerle savaşır.',
      'Master of the front line. Fights with heavy blows, solid block and shoves that slam foes into walls.',
    ),
    mechanic: L('Güç biriktir, blok kur, düşmanları it.', 'Stack Strength, build Block, shove enemies.'),
    hp: 80,
    mp: 1,
    energy: 3,
    hand: 5,
    relic: 'bloodOath',
    deck: [...rep('slash', 4), ...rep('guard', 4), 'shoulderCharge', 'hurl'],
    color: '#d9534f',
    unlock: 0,
  },
  ranger: {
    id: 'ranger',
    name: L('Korucu', 'Ranger'),
    title: L('Ormanın Gözü', 'Eye of the Wild'),
    desc: L(
      'Mesafeyi koruyan okçu. Tuzaklar kurar, hedefleri işaretler ve düşmanları uzaktan avlar.',
      'An archer who keeps her distance. Lays traps, marks prey and hunts from afar.',
    ),
    mechanic: L('Uzak dur, tuzak kur, işaretle.', 'Keep distance, lay traps, mark targets.'),
    hp: 72,
    mp: 2,
    energy: 3,
    hand: 5,
    relic: 'eagleEye',
    deck: [...rep('arrowShot', 4), ...rep('takeCover', 4), 'bearTrap', 'kickBack'],
    color: '#5cb85c',
    unlock: 0,
  },
  wizard: {
    id: 'wizard',
    name: L('Büyücü', 'Wizard'),
    title: L('Elementlerin Efendisi', 'Master of Elements'),
    desc: L(
      'Kırılgan ama yıkıcı. Ateşle yakar, buzla dondurur, şimşekle zincirleme hasar verir.',
      'Fragile but devastating. Burns with fire, roots with frost and chains lightning.',
    ),
    mechanic: L('Alan büyüleri, Yanık ve Sabitleme.', 'Area spells, Burn and Root.'),
    hp: 62,
    mp: 1,
    energy: 3,
    hand: 5,
    relic: 'manaCrystal',
    deck: [...rep('arcaneBolt', 4), ...rep('ward', 4), 'fireball', 'frostLance'],
    color: '#5b8def',
    unlock: 0,
  },
  assassin: {
    id: 'assassin',
    name: L('Suikastçı', 'Assassin'),
    title: L('Gölgelerin Bıçağı', 'Blade of Shadows'),
    desc: L(
      'Zehir ve hançer ustası. Düşmanın arkasına ışınlanır, saldırılardan kaçar.',
      'Master of poison and daggers. Blinks behind enemies and dodges attacks.',
    ),
    mechanic: L('Zehir biriktir, hançer yağdır, kaç.', 'Stack Poison, rain daggers, dodge.'),
    hp: 70,
    mp: 2,
    energy: 3,
    hand: 5,
    relic: 'shadowCloak',
    deck: [...rep('stab', 4), ...rep('evade', 4), 'toxicBlade', 'shadowstep'],
    color: '#8e5bd6',
    unlock: 150,
  },
  paladin: {
    id: 'paladin',
    name: L('Paladin', 'Paladin'),
    title: L('Işığın Kalkanı', 'Shield of Light'),
    desc: L(
      'Kutsal savaşçı. Işıltı biriktirir, iyileşir ve kutsal darbelerle düşmanı yakar.',
      'A holy warrior. Gathers Radiance, heals and smites with holy strikes.',
    ),
    mechanic: L('Işıltı kutsal hasarı artırır.', 'Radiance boosts holy damage.'),
    hp: 78,
    mp: 1,
    energy: 3,
    hand: 5,
    relic: 'holySymbol',
    deck: [...rep('justiceStrike', 4), ...rep('shieldBlock', 4), 'smite', 'prayer'],
    color: '#f0c85a',
    unlock: 200,
  },
  necromancer: {
    id: 'necromancer',
    name: L('Nekromant', 'Necromancer'),
    title: L('Mezarların Efendisi', 'Lord of Graves'),
    desc: L(
      'Ölüleri diriltir, ruh toplar ve lanetlerle düşmanı çürütür. İskeletleri ona kalkan olur.',
      'Raises the dead, harvests souls and rots foes with curses. Skeletons shield him.',
    ),
    mechanic: L('İskelet çağır, Ruh topla ve harca.', 'Summon skeletons, harvest and spend Souls.'),
    hp: 66,
    mp: 1,
    energy: 3,
    hand: 5,
    relic: 'soulLantern',
    deck: [...rep('shadowBolt', 4), ...rep('boneArmor', 4), 'raiseSkeleton', 'drainLife'],
    color: '#9b6bd6',
    unlock: 250,
  },
  engineer: {
    id: 'engineer',
    name: L('Mühendis', 'Engineer'),
    title: L('Dişli ve Barut', 'Cogs and Powder'),
    desc: L(
      'Taretler kurar, bombalar yerleştirir ve savaş alanını mühendislik harikasına çevirir.',
      'Builds turrets, plants bombs and turns the battlefield into a workshop.',
    ),
    mechanic: L('Taretler, bombalar ve yapılar.', 'Turrets, bombs and constructs.'),
    hp: 70,
    mp: 1,
    energy: 3,
    hand: 5,
    relic: 'toolkit',
    deck: [...rep('wrench', 4), ...rep('plating', 4), 'buildTurret', 'throwBomb'],
    color: '#e0892f',
    unlock: 300,
  },
  monk: {
    id: 'monk',
    name: L('Keşiş', 'Monk'),
    title: L('Rüzgârın Yumruğu', 'Fist of the Wind'),
    desc: L(
      'Çevik dövüşçü. Ki toplar, tekmelerle düşmanları savurur ve kombolarla bitirir.',
      'An agile fighter. Gathers Ki, sends foes flying with kicks and finishes with combos.',
    ),
    mechanic: L('Ki topla, it, bitirici hamleler.', 'Gather Ki, knock back, finishers.'),
    hp: 72,
    mp: 2,
    energy: 3,
    hand: 5,
    relic: 'prayerBeads',
    deck: [...rep('palmStrike', 4), ...rep('ironStance', 4), 'flyingKick', 'meditate'],
    color: '#4fc1b0',
    unlock: 350,
  },
};

export const CLASS_ORDER: ClassId[] = ['warrior', 'ranger', 'wizard', 'assassin', 'paladin', 'necromancer', 'engineer', 'monk'];
