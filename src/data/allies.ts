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
  mech: { id: 'mech', name: L('Savaş Robotu', 'War Mech'), sprite: 'mech', hp: 30, hpUp: 10, speed: 1, dmg: 10, range: 1 },
};
