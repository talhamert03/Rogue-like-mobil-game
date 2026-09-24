import { L, type Lang, type LStr } from '../i18n/i18n';
import type { ClassId } from './types';
import type { GameMode, RunState } from './runTypes';
import { storage, KEYS } from './storage';
import { CLASSES } from '../data/classes';

export interface Settings {
  lang: Lang;
  music: number;
  sfx: number;
  speed: number;
  shake: boolean;
  vibrate: boolean;
  confirmEnd: boolean;
}

export interface HistoryEntry {
  cls: ClassId;
  mode: GameMode;
  hell: number;
  result: 'won' | 'lost' | 'abandoned';
  score: number;
  floor: number;
  act: number;
  date: number;
  killedBy?: string;
}

export interface Profile {
  v: number;
  shards: number;
  totalShards: number;
  unlocked: ClassId[];
  perks: Record<string, number>;
  hellMax: number;
  stats: {
    runs: number;
    wins: number;
    kills: number;
    elites: number;
    bosses: number;
    bestTower: number;
    bestScore: number;
    playTime: number;
    cardsPlayed: number;
    maxHit: number;
  };
  classWins: Partial<Record<ClassId, number>>;
  seenCards: string[];
  seenRelics: string[];
  seenEnemies: string[];
  achievements: string[];
  weeklyBest: Record<string, number>;
  history: HistoryEntry[];
  settings: Settings;
  tutorial: Record<string, boolean>;
}

export function defaultProfile(): Profile {
  let lang: Lang = 'tr';
  try {
    if (typeof navigator !== 'undefined' && navigator.language && !navigator.language.toLowerCase().startsWith('tr')) lang = 'en';
  } catch {
    /* ignore */
  }
  return {
    v: 1,
    shards: 0,
    totalShards: 0,
    unlocked: (Object.keys(CLASSES) as ClassId[]).filter((c) => CLASSES[c].unlock === 0),
    perks: {},
    hellMax: 0,
    stats: { runs: 0, wins: 0, kills: 0, elites: 0, bosses: 0, bestTower: 0, bestScore: 0, playTime: 0, cardsPlayed: 0, maxHit: 0 },
    classWins: {},
    seenCards: [],
    seenRelics: [],
    seenEnemies: [],
    achievements: [],
    weeklyBest: {},
    history: [],
    settings: { lang, music: 0.5, sfx: 0.8, speed: 1, shake: true, vibrate: true, confirmEnd: false },
    tutorial: {},
  };
}

export function loadProfile(): Profile {
  const raw = storage.get(KEYS.profile);
  const def = defaultProfile();
  if (!raw) return def;
  try {
    const p = JSON.parse(raw) as Profile;
    return {
      ...def,
      ...p,
      stats: { ...def.stats, ...p.stats },
      settings: { ...def.settings, ...p.settings },
      unlocked: Array.from(new Set([...def.unlocked, ...(p.unlocked ?? [])])),
    };
  } catch {
    return def;
  }
}

export function saveProfile(p: Profile): void {
  storage.set(KEYS.profile, JSON.stringify(p));
}

/* ------------------------------------------------------------------ perks */

export interface PerkDef {
  id: string;
  name: LStr;
  desc: LStr;
  icon: string;
  costs: number[];
}

export const PERKS: PerkDef[] = [
  { id: 'vitality', icon: 'heart', costs: [40, 90, 160], name: L('Dayanıklılık', 'Vitality'), desc: L('Her seviye +4 maksimum can.', '+4 Max HP per level.') },
  { id: 'wealth', icon: 'coin', costs: [30, 70, 120], name: L('Servet', 'Wealth'), desc: L('Her seviye +20 başlangıç altını.', '+20 starting gold per level.') },
  { id: 'scholar', icon: 'book', costs: [50, 110], name: L('Bilgin', 'Scholar'), desc: L('Her seviye koşuya 1 geliştirilmiş başlangıç kartıyla başla.', 'Start with 1 upgraded starter card per level.') },
  { id: 'starterPotion', icon: 'potion', costs: [60], name: L('Hazırlıklı', 'Prepared'), desc: L('Koşuya rastgele bir iksirle başla.', 'Start runs with a random potion.') },
  { id: 'bargain', icon: 'seal', costs: [70, 140], name: L('Pazarlık', 'Haggler'), desc: L('Her seviye dükkân fiyatları %8 ucuz.', 'Shop prices 8% cheaper per level.') },
  { id: 'restMastery', icon: 'campfire', costs: [60, 120], name: L('Kamp Ustası', 'Camper'), desc: L('Her seviye dinlenme %10 fazla iyileştirir.', 'Resting heals 10% more per level.') },
  { id: 'reroll', icon: 'dice', costs: [120], name: L('İkinci Şans', 'Second Chance'), desc: L('Her perdede 1 kez kart ödülünü yenile.', 'Reroll a card reward once per act.') },
  { id: 'potionBelt', icon: 'belt', costs: [150], name: L('İksir Kemeri', 'Potion Belt'), desc: L('+1 iksir yuvası.', '+1 potion slot.') },
  { id: 'blessing', icon: 'star', costs: [200], name: L('Kutsanmış', 'Blessed'), desc: L('Koşuya rastgele sıradan bir tılsımla başla.', 'Start runs with a random common relic.') },
  { id: 'insight', icon: 'eye', costs: [250], name: L('Öngörü', 'Foresight'), desc: L('Kart ödüllerinde +1 seçenek.', '+1 choice in card rewards.') },
];

export function perkLevel(p: Profile, id: string): number {
  return p.perks[id] ?? 0;
}

export function buyPerk(p: Profile, id: string): boolean {
  const def = PERKS.find((x) => x.id === id);
  if (!def) return false;
  const lvl = perkLevel(p, id);
  if (lvl >= def.costs.length) return false;
  const cost = def.costs[lvl];
  if (p.shards < cost) return false;
  p.shards -= cost;
  p.perks[id] = lvl + 1;
  saveProfile(p);
  return true;
}

export function unlockClass(p: Profile, cls: ClassId): boolean {
  const cost = CLASSES[cls].unlock;
  if (p.unlocked.includes(cls) || p.shards < cost) return false;
  p.shards -= cost;
  p.unlocked.push(cls);
  saveProfile(p);
  return true;
}

/* ------------------------------------------------------------ achievements */

export interface AchievementDef {
  id: string;
  name: LStr;
  desc: LStr;
  reward: number;
  check: (p: Profile, run?: RunState) => boolean;
}

const won = (r?: RunState) => r?.lastResult === 'won';

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstBlood', reward: 5, name: L('İlk Kan', 'First Blood'), desc: L('İlk düşmanını öldür.', 'Slay your first enemy.'), check: (p) => p.stats.kills >= 1 },
  { id: 'eliteSlayer', reward: 10, name: L('Seçkin Avcı', 'Elite Hunter'), desc: L('Bir elit düşmanı yen.', 'Defeat an elite.'), check: (p) => p.stats.elites >= 1 },
  { id: 'act1', reward: 20, name: L('Mahzenlerin Fatihi', 'Cellar Conqueror'), desc: L('1. perde bossunu yen.', 'Defeat the Act 1 boss.'), check: (p) => p.stats.bosses >= 1 },
  { id: 'act2', reward: 30, name: L('Mağaraların Fatihi', 'Cavern Conqueror'), desc: L('Toplam 2 boss yen.', 'Defeat 2 bosses in total.'), check: (p) => p.stats.bosses >= 2 },
  { id: 'victory', reward: 50, name: L('Zafer!', 'Victory!'), desc: L('Bir koşuyu kazan.', 'Win a run.'), check: (p) => p.stats.wins >= 1 },
  ...(Object.keys(CLASSES) as ClassId[]).map((c) => ({
    id: 'win_' + c,
    reward: 25,
    name: L(`${CLASSES[c].name.tr} Efsanesi`, `${CLASSES[c].name.en} Legend`),
    desc: L(`${CLASSES[c].name.tr} ile kazan.`, `Win as the ${CLASSES[c].name.en}.`),
    check: (p: Profile) => (p.classWins[c] ?? 0) >= 1,
  })),
  { id: 'hell1', reward: 40, name: L('Ateşe Adım', 'Into the Fire'), desc: L('Cehennem 1’i kazan.', 'Win on Hell 1.'), check: (_p, r) => won(r) && r!.mode === 'hell' && r!.hellLevel >= 1 },
  { id: 'hell5', reward: 80, name: L('Alevlerin Ortasında', 'Heart of the Flames'), desc: L('Cehennem 5’i kazan.', 'Win on Hell 5.'), check: (_p, r) => won(r) && r!.mode === 'hell' && r!.hellLevel >= 5 },
  { id: 'hell10', reward: 150, name: L('Cehennem Lordu', 'Lord of Hell'), desc: L('Cehennem 10’u kazan.', 'Win on Hell 10.'), check: (_p, r) => won(r) && r!.mode === 'hell' && r!.hellLevel >= 10 },
  { id: 'tower10', reward: 20, name: L('Kule Tırmanıcısı', 'Tower Climber'), desc: L('Kulede 10. kata ulaş.', 'Reach floor 10 in the Tower.'), check: (p) => p.stats.bestTower >= 10 },
  { id: 'tower25', reward: 50, name: L('Bulutların Üstünde', 'Above the Clouds'), desc: L('Kulede 25. kata ulaş.', 'Reach floor 25 in the Tower.'), check: (p) => p.stats.bestTower >= 25 },
  { id: 'tower50', reward: 100, name: L('Sonsuzluk', 'Infinity'), desc: L('Kulede 50. kata ulaş.', 'Reach floor 50 in the Tower.'), check: (p) => p.stats.bestTower >= 50 },
  { id: 'rich', reward: 20, name: L('Ejderin Hazinesi', "Dragon's Hoard"), desc: L('Bir koşuda 500 altına sahip ol.', 'Hold 500 gold in a run.'), check: (_p, r) => !!r && r.gold >= 500 },
  { id: 'bigHit', reward: 20, name: L('Tek Vuruş', 'One Punch'), desc: L('Tek vuruşta 50+ hasar ver.', 'Deal 50+ damage in a single hit.'), check: (p) => p.stats.maxHit >= 50 },
  { id: 'collector', reward: 30, name: L('Koleksiyoncu', 'Collector'), desc: L('Bir koşuda 12 tılsıma sahip ol.', 'Own 12 relics in a single run.'), check: (_p, r) => !!r && r.relics.length >= 12 },
  { id: 'minimalist', reward: 40, name: L('Sade Deste', 'Minimalist'), desc: L('15 veya daha az kartla kazan.', 'Win with 15 or fewer cards.'), check: (_p, r) => won(r) && r!.deck.length <= 15 },
  { id: 'centurion', reward: 20, name: L('Yüzbaşı', 'Centurion'), desc: L('Toplam 100 düşman öldür.', 'Slay 100 enemies in total.'), check: (p) => p.stats.kills >= 100 },
  { id: 'warlord', reward: 60, name: L('Savaş Lordu', 'Warlord'), desc: L('Toplam 1000 düşman öldür.', 'Slay 1000 enemies in total.'), check: (p) => p.stats.kills >= 1000 },
  { id: 'weekly', reward: 30, name: L('Haftanın Kahramanı', 'Hero of the Week'), desc: L('Bir haftalık meydan okumayı tamamla.', 'Complete a weekly challenge.'), check: (_p, r) => won(r) && r!.mode === 'weekly' },
];

export function checkAchievements(p: Profile, run?: RunState): AchievementDef[] {
  const got: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (p.achievements.includes(a.id)) continue;
    if (a.check(p, run)) {
      p.achievements.push(a.id);
      p.shards += a.reward;
      p.totalShards += a.reward;
      got.push(a);
    }
  }
  return got;
}

/* ------------------------------------------------------------------ hell */

export const HELL_LEVELS: LStr[] = [
  L('Elitler daha sık çıkar.', 'Elites appear more often.'),
  L('Düşmanlar %10 fazla hasar verir.', 'Enemies deal 10% more damage.'),
  L('Elitlerin canı %20 fazla.', 'Elites have 20% more HP.'),
  L('Bossların canı %15 fazla.', 'Bosses have 15% more HP.'),
  L('Dinlenme %20 daha az iyileştirir.', 'Resting heals 20% less.'),
  L('Koşuya %10 eksik canla başla.', 'Start runs with 10% less HP.'),
  L('Düşmanların canı %10 fazla.', 'Enemies have 10% more HP.'),
  L('Koşuya bir Yük lanetiyle başla.', 'Start runs with a Burden curse.'),
  L('1 eksik iksir yuvası.', '1 fewer potion slot.'),
  L('Düşmanlar %10 daha fazla hasar verir ve 5 maks. can kaybet.', 'Enemies deal a further 10% damage and lose 5 Max HP.'),
];
