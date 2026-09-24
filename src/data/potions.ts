import { L } from '../i18n/i18n';
import type { PotionDef } from '../engine/types';

const ALL: PotionDef[] = [
  { id: 'healing', rarity: 'common', color: '#e0533d', target: 'none', combatOnly: false, name: L('Can İksiri', 'Healing Potion'), desc: L('Maksimum canının %25’i kadar iyileş.', 'Heal 25% of your Max HP.') },
  { id: 'strength', rarity: 'common', color: '#ff7043', target: 'none', combatOnly: true, name: L('Güç İksiri', 'Strength Potion'), desc: L('2 Güç kazan.', 'Gain 2 Strength.') },
  { id: 'dexterity', rarity: 'common', color: '#4fa3e0', target: 'none', combatOnly: true, name: L('Çeviklik İksiri', 'Dexterity Potion'), desc: L('2 Çeviklik kazan.', 'Gain 2 Dexterity.') },
  { id: 'energy', rarity: 'common', color: '#ffd54f', target: 'none', combatOnly: true, name: L('Enerji İksiri', 'Energy Potion'), desc: L('2 enerji kazan.', 'Gain 2 energy.') },
  { id: 'fire', rarity: 'common', color: '#ff8a2a', target: 'enemy', combatOnly: true, name: L('Ateş Şişesi', 'Fire Flask'), desc: L('Bir düşmana 20 hasar ver.', 'Deal 20 damage to an enemy.') },
  { id: 'frost', rarity: 'common', color: '#8fe3ff', target: 'none', combatOnly: true, name: L('Buz Şişesi', 'Frost Flask'), desc: L('Tüm düşmanlara 2 Sabitlenme ve 1 Zayıf uygula.', 'Apply 2 Rooted and 1 Weak to all enemies.') },
  { id: 'poison', rarity: 'common', color: '#6cc644', target: 'enemy', combatOnly: true, name: L('Zehir Şişesi', 'Poison Flask'), desc: L('Bir düşmana 7 Zehir uygula.', 'Apply 7 Poison to an enemy.') },
  { id: 'stoneskin', rarity: 'common', color: '#9aa7b8', target: 'none', combatOnly: true, name: L('Taş Deri İksiri', 'Stoneskin Potion'), desc: L('14 blok kazan.', 'Gain 14 Block.') },
  { id: 'swift', rarity: 'common', color: '#9ee37d', target: 'none', combatOnly: true, name: L('Hız İksiri', 'Swiftness Potion'), desc: L('3 hareket kazan.', 'Gain 3 movement.') },
  { id: 'insight', rarity: 'uncommon', color: '#b38cff', target: 'none', combatOnly: true, name: L('Kâhin İksiri', 'Seer Potion'), desc: L('3 kart çek.', 'Draw 3 cards.') },
  { id: 'fear', rarity: 'uncommon', color: '#c07ad9', target: 'enemy', combatOnly: true, name: L('Korku İksiri', 'Dread Potion'), desc: L('Bir düşmana 3 Savunmasız uygula.', 'Apply 3 Vulnerable to an enemy.') },
  { id: 'regen', rarity: 'uncommon', color: '#5fd38d', target: 'none', combatOnly: true, name: L('Yenilenme İksiri', 'Regeneration Potion'), desc: L('5 Yenilenme kazan.', 'Gain 5 Regeneration.') },
  { id: 'explosive', rarity: 'uncommon', color: '#ff5a3d', target: 'none', combatOnly: true, name: L('Patlayıcı İksir', 'Explosive Potion'), desc: L('Tüm düşmanlara 10 hasar ver.', 'Deal 10 damage to all enemies.') },
  { id: 'ghost', rarity: 'uncommon', color: '#dfe9f5', target: 'none', combatOnly: true, name: L('Hayalet İksiri', 'Ghost Potion'), desc: L('2 Kaçınma kazan.', 'Gain 2 Dodge.') },
  { id: 'cleanse', rarity: 'uncommon', color: '#7ad0ff', target: 'none', combatOnly: true, name: L('Arınma İksiri', 'Cleansing Potion'), desc: L('Tüm zayıflatmaları kaldır ve 8 blok kazan.', 'Remove all debuffs and gain 8 Block.') },
  { id: 'fairy', rarity: 'rare', color: '#ffb3e6', target: 'none', combatOnly: true, name: L('Peri Şişesi', 'Fairy in a Bottle'), desc: L('Öleceğin zaman kendiliğinden kırılır: %30 canla dirilirsin.', 'When you would die, it breaks automatically: revive with 30% HP.') },
];

export const POTIONS: Record<string, PotionDef> = Object.fromEntries(ALL.map((p) => [p.id, p]));
export const POTION_LIST = ALL;
