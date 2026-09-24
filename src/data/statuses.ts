import { L, type LStr } from '../i18n/i18n';

export interface StatusMeta {
  id: string;
  name: LStr;
  desc: LStr; // {n} = stacks
  icon: string;
  color: string;
  kind: 'buff' | 'debuff' | 'power' | 'resource';
  /** hidden from the status bar */
  hidden?: boolean;
}

const S = (
  id: string,
  kind: StatusMeta['kind'],
  icon: string,
  color: string,
  name: LStr,
  desc: LStr,
  hidden = false,
): StatusMeta => ({ id, kind, icon, color, name, desc, hidden });

export const STATUSES: Record<string, StatusMeta> = Object.fromEntries(
  [
    S('strength', 'buff', 'fist', '#e0533d', L('Güç', 'Strength'), L('Saldırılar {n} fazla hasar verir.', 'Attacks deal {n} more damage.')),
    S('dexterity', 'buff', 'shield', '#4fa3e0', L('Çeviklik', 'Dexterity'), L('Kartlardan {n} fazla blok kazanılır.', 'Gain {n} more block from cards.')),
    S('poison', 'debuff', 'drop', '#6cc644', L('Zehir', 'Poison'), L('Tur başında {n} can kaybeder, sonra 1 azalır.', 'Loses {n} HP at the start of its turn, then decreases by 1.')),
    S('burn', 'debuff', 'fire', '#ff8a2a', L('Yanık', 'Burn'), L('Tur sonunda {n} hasar alır, sonra yarıya iner.', 'Takes {n} damage at the end of its turn, then halves.')),
    S('bleed', 'debuff', 'blood', '#c0233a', L('Kanama', 'Bleed'), L('Her hareket ettiğinde {n} can kaybeder.', 'Loses {n} HP whenever it moves.')),
    S('weak', 'debuff', 'weak', '#9b8fb3', L('Zayıf', 'Weak'), L('Saldırılar %25 daha az hasar verir. {n} tur.', 'Attacks deal 25% less damage. {n} turns.')),
    S('vulnerable', 'debuff', 'crack', '#e07a3d', L('Savunmasız', 'Vulnerable'), L('Saldırılardan %50 fazla hasar alır. {n} tur.', 'Takes 50% more damage from attacks. {n} turns.')),
    S('frail', 'debuff', 'shieldBroken', '#8a9bb0', L('Kırılgan', 'Frail'), L('Kartlardan %25 daha az blok kazanır. {n} tur.', 'Gains 25% less block from cards. {n} turns.')),
    S('root', 'debuff', 'chain', '#7ec8e3', L('Sabitlenmiş', 'Rooted'), L('Hareket edemez. {n} tur.', 'Cannot move. {n} turns.')),
    S('stun', 'debuff', 'stars', '#f5d442', L('Sersem', 'Stunned'), L('Sıradaki eylemini kaçırır.', 'Skips its next action.')),
    S('mark', 'debuff', 'target', '#ff5d7a', L('İşaretli', 'Marked'), L('Saldırılardan {n} fazla hasar alır.', 'Takes {n} more damage from attacks.')),
    S('thorns', 'buff', 'spikes', '#b7a26a', L('Diken', 'Thorns'), L('Yakın saldırıya uğradığında saldırgana {n} hasar verir.', 'Deals {n} damage to melee attackers.')),
    S('counter', 'buff', 'spikes', '#e0c95a', L('Karşı Duruş', 'Counter'), L('Sıradaki turuna kadar yakın saldırganlara {n} hasar verir.', 'Until your next turn, deal {n} damage to melee attackers.')),
    S('regen', 'buff', 'heart', '#5fd38d', L('Yenilenme', 'Regeneration'), L('Tur sonunda {n} can kazanır, sonra 1 azalır.', 'Heals {n} HP at the end of its turn, then decreases by 1.')),
    S('dodge', 'buff', 'wind', '#bfe3ff', L('Kaçınma', 'Dodge'), L('Sıradaki {n} saldırıdan kaçar. Kendi turu başında sıfırlanır.', 'Evades the next {n} attacks. Resets at the start of its turn.')),
    S('ward', 'buff', 'rune', '#a78bfa', L('Koruma', 'Ward'), L('Sıradaki {n} zayıflatmayı engeller.', 'Negates the next {n} debuffs.')),
    S('retainBlock', 'buff', 'wall', '#6fa8dc', L('Kaya Gibi', 'Unyielding'), L('Blok sıradaki tur başında sıfırlanmaz.', 'Block is not removed at the start of the next turn.')),
    S('haste', 'buff', 'boot', '#9ee37d', L('Hız', 'Haste'), L('Her tur {n} fazla hareket puanı.', 'Gain {n} extra movement each turn.')),
    S('ritual', 'buff', 'eye', '#c04ae0', L('Ayin', 'Ritual'), L('Tur sonunda {n} Güç kazanır.', 'Gains {n} Strength at the end of its turn.')),
    S('echo', 'buff', 'echo', '#8fd3ff', L('Yankı', 'Echo'), L('Sıradaki {n} saldırı kartı iki kez oynanır.', 'Your next {n} attack card(s) are played twice.')),
    // resources
    S('ki', 'resource', 'ki', '#ffd166', L('Ki', 'Ki'), L('Ki harcayan kartları güçlendirir.', 'Fuels cards that spend Ki.')),
    S('souls', 'resource', 'soul', '#b38cff', L('Ruh', 'Souls'), L('Ruh maliyetli kartlar için harcanır. Düşman ölünce kazanılır.', 'Spent on soul-cost cards. Gained when enemies die.')),
    S('radiance', 'resource', 'sun', '#ffe066', L('Işıltı', 'Radiance'), L('Kutsal hasarı {n} artırır.', 'Holy damage is increased by {n}.')),
    // powers
    S('bloodlust', 'power', 'fang', '#e0533d', L('Kan Hırsı', 'Bloodlust'), L('Can kaybettiğinde {n} Güç kazan.', 'Whenever you lose HP, gain {n} Strength.')),
    S('titan', 'power', 'fist', '#e0533d', L('Titan Gücü', 'Titan Might'), L('Tur başında {n} Güç kazan.', 'At the start of your turn, gain {n} Strength.')),
    S('noxious', 'power', 'drop', '#6cc644', L('Ölümcül Zehir', 'Noxious'), L('Zehir uyguladığında {n} fazla uygula.', 'Whenever you apply Poison, apply {n} more.')),
    S('bladeMaster', 'power', 'dagger', '#c9d1d9', L('Hançer Ustası', 'Blade Master'), L('Tur başında elinize {n} Atış Hançeri ekle.', 'At the start of your turn, add {n} Throwing Knife to your hand.')),
    S('pyromancy', 'power', 'fire', '#ff8a2a', L('Ateş Ustalığı', 'Pyromancy'), L('Yanık uyguladığında {n} fazla uygula.', 'Whenever you apply Burn, apply {n} more.')),
    S('barrier', 'power', 'rune', '#7aa7ff', L('Arkan Bariyer', 'Arcane Barrier'), L('Tur başında {n} blok kazan.', 'At the start of your turn, gain {n} block.')),
    S('sharpshooter', 'power', 'bow', '#9ee37d', L('Keskin Nişancı', 'Sharpshooter'), L('3+ kare uzaktaki hedeflere saldırılar {n} fazla hasar verir.', 'Attacks against targets 3+ tiles away deal {n} more damage.')),
    S('trapmaster', 'power', 'trap', '#caa66a', L('Tuzak Ustası', 'Trapmaster'), L('Bir tuzak tetiklendiğinde {n} kart çek.', 'Whenever a trap triggers, draw {n} card(s).')),
    S('crusader', 'power', 'sun', '#ffe066', L('Haçlı Ruhu', 'Zeal'), L('Tur başında {n} Işıltı kazan.', 'At the start of your turn, gain {n} Radiance.')),
    S('avatar', 'power', 'sun', '#fff1a8', L('Işık Avatarı', 'Avatar of Light'), L('Tur sonunda tüm düşmanlara Işıltın kadar hasar ver ({n} kez).', 'At the end of your turn, deal damage equal to your Radiance to all enemies ({n}x).')),
    S('lichForm', 'power', 'skull', '#b38cff', L('Lich Formu', 'Lich Form'), L('Tur başında {n} İskelet çağır.', 'At the start of your turn, raise {n} Skeleton.')),
    S('drone', 'power', 'gear', '#7fd1b9', L('Tamir Dronu', 'Repair Drone'), L('Tur başında yardımcılarını 3 iyileştir ve {n} blok kazan.', 'At the start of your turn, heal allies 3 and gain {n} block.')),
    S('plating', 'power', 'wall', '#9aa7b8', L('Metal Kaplama', 'Plating'), L('Tur sonunda {n} blok kazan.', 'At the end of your turn, gain {n} block.')),
    S('zen', 'power', 'ki', '#ffd166', L('Zen', 'Zen'), L('Tur başında {n} Ki kazan.', 'At the start of your turn, gain {n} Ki.')),
    S('diamond', 'power', 'gem', '#8fe3ff', L('Elmas Beden', 'Diamond Body'), L('Her hareket ettiğinde {n} blok kazan.', 'Whenever you move, gain {n} block.')),
    S('retribution', 'power', 'spikes', '#ffe066', L('Kefaret', 'Retribution'), L('Kalıcı diken.', 'Permanent thorns.'), true),
    S('construct', 'buff', 'gear', '#9aa7b8', L('Yapı', 'Construct'), L('Hareket etmez.', 'Does not move.'), true),
  ].map((s) => [s.id, s]),
);

/** statuses that decrease by 1 at the end of the owner's turn */
export const DURATION_STATUSES = ['weak', 'vulnerable', 'frail', 'root', 'bleed'];
export const DEBUFFS = new Set(
  Object.values(STATUSES)
    .filter((s) => s.kind === 'debuff')
    .map((s) => s.id),
);
