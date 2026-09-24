import { L } from '../i18n/i18n';
import type { AllyDef } from '../engine/types';

export const ALLIES: Record<string, AllyDef> = {
  skeleton: { id: 'skeleton', name: L('İskelet', 'Skeleton'), sprite: 'skeleton', palette: { a: '#e8e2cf', b: '#b9b09a' }, hp: 10, hpUp: 4, speed: 1, dmg: 5, range: 1 },
  boneGolem: { id: 'boneGolem', name: L('Kemik Golem', 'Bone Golem'), sprite: 'golem', palette: { a: '#e8e2cf', b: '#b9b09a', c: '#8a826e', e: '#b38cff' }, hp: 25, hpUp: 10, speed: 1, dmg: 8, range: 1 },
  wolf: { id: 'wolf', name: L('Kurt Yoldaş', 'Wolf Companion'), sprite: 'wolf', palette: { a: '#9aa0a8', b: '#6b7079', e: '#9ee37d' }, hp: 14, hpUp: 6, speed: 2, dmg: 5, range: 1 },
  turret: { id: 'turret', name: L('Taret', 'Turret'), sprite: 'turret', hp: 10, hpUp: 4, speed: 0, dmg: 5, range: 4 },
  miniTurret: { id: 'miniTurret', name: L('Mini Taret', 'Mini Turret'), sprite: 'turret', palette: { a: '#8d99a6', b: '#5f6b78' }, hp: 5, speed: 0, dmg: 3, range: 3 },
  tesla: { id: 'tesla', name: L('Tesla Bobini', 'Tesla Coil'), sprite: 'tesla', hp: 12, hpUp: 4, speed: 0, dmg: 3, range: 2, aoe: true },
  barrel: { id: 'barrel', name: L('Yakıt Bidonu', 'Fuel Barrel'), sprite: 'barrel', hp: 1, speed: 0, dmg: 0, range: 0, passive: true, explode: { dmg: 10, radius: 1 } },
  barrelUp: { id: 'barrelUp', name: L('Yakıt Bidonu+', 'Fuel Barrel+'), sprite: 'barrel', hp: 1, speed: 0, dmg: 0, range: 0, passive: true, explode: { dmg: 14, radius: 1 } },
  fireTotem: { id: 'fireTotem', name: L('Ateş Totemi', 'Fire Totem'), sprite: 'totem', palette: { a: '#ff8a2a', b: '#c4561a', e: '#ffe066' }, hp: 7, hpUp: 4, speed: 0, dmg: 3, range: 2, pulse: 'fire' },
  healTotem: { id: 'healTotem', name: L('Şifa Totemi', 'Healing Totem'), sprite: 'totem', palette: { a: '#5fd38d', b: '#2f8a5a', e: '#ffffff' }, hp: 7, hpUp: 4, speed: 0, dmg: 0, range: 0, pulse: 'heal' },
  stormTotem: { id: 'stormTotem', name: L('Fırtına Totemi', 'Storm Totem'), sprite: 'totem', palette: { a: '#34c3e0', b: '#1f6f8a', e: '#ffe066' }, hp: 7, hpUp: 0, speed: 0, dmg: 5, range: 9, pulse: 'storm' },
  earthTotem: { id: 'earthTotem', name: L('Toprak Totemi', 'Earth Totem'), sprite: 'totem', palette: { a: '#b08a5a', b: '#6f5436', e: '#ffcf5a' }, hp: 14, hpUp: 6, speed: 0, dmg: 0, range: 0, pulse: 'earth' },
  treant: { id: 'treant', name: L('Ağaç Muhafız', 'Treant'), sprite: 'treant', hp: 16, hpUp: 6, speed: 1, dmg: 6, range: 1 },
  ancientTreant: { id: 'ancientTreant', name: L('Kadim Koruyucu', 'Ancient Protector'), sprite: 'treant', palette: { a: '#6f5436', b: '#4a3622', g: '#9ee37d', G: '#5fb04a' }, hp: 30, hpUp: 10, speed: 1, dmg: 9, range: 1, scale: 1.3 },
  parrot: { id: 'parrot', name: L('Papağan', 'Parrot'), sprite: 'parrot', hp: 6, hpUp: 3, speed: 2, dmg: 3, range: 3, flying: true, applies: { weak: 1 } },
  tentacle: { id: 'tentacle', name: L('Dokunaç', 'Tentacle'), sprite: 'tentacle', hp: 8, hpUp: 4, speed: 0, dmg: 4, range: 2, applies: { doom: 2 } },
  mech: { id: 'mech', name: L('Savaş Robotu', 'War Mech'), sprite: 'mech', hp: 30, hpUp: 10, speed: 1, dmg: 10, range: 1 },
};
