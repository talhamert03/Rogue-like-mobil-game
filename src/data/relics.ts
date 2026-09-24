import { L, type LStr } from '../i18n/i18n';
import type { CardInst, CardSpec, ClassId, RelicRarity, Unit } from '../engine/types';
import type { Combat } from '../engine/combat';
import type { RunState } from '../engine/runTypes';
import type { Rng } from '../core/rng';
import { cardSpec, canUpgrade, classCards } from './cards';

export interface RelicDef {
  id: string;
  name: LStr;
  desc: LStr;
  rarity: RelicRarity;
  icon: string;
  tint: string;
  cls?: ClassId;
  /** passive stat bonuses */
  energy?: number;
  mp?: number;
  draw?: number;
  firstDraw?: number;
  potionSlots?: number;
  /** run-level */
  onPickup?: (run: RunState, rng: Rng) => void;
  onCombatEnd?: (run: RunState, won: boolean, tier: string) => void;
  onRest?: (run: RunState) => void;
  shopMult?: number;
  cardChoices?: number;
  onEnterEvent?: (run: RunState) => void;
  /** combat hooks */
  onCombatStart?: (c: Combat) => void;
  onTurnStart?: (c: Combat) => void;
  onTurnEnd?: (c: Combat) => void;
  onShuffle?: (c: Combat) => void;
  onCardPlayed?: (c: Combat, card: CardInst, spec: CardSpec) => void;
  onKill?: (c: Combat, u: Unit) => void;
  onHeroHpLoss?: (c: Combat, n: number) => void;
  onHeroMove?: (c: Combat) => void;
  onExhaust?: (c: Combat) => void;
  onTrap?: (c: Combat) => void;
  atkMod?: (c: Combat, src: Unit, tgt: Unit, d: number) => number;
  /** shows a counter badge */
  counter?: string;
}

const ALL: RelicDef[] = [];
const R = (d: RelicDef) => ALL.push(d);
const flash = (c: Combat, id: string) => c.relicFlash(id);

/* ------------------------------------------------------------- starters */
R({
  id: 'bloodOath',
  rarity: 'starter',
  cls: 'warrior',
  icon: 'fang',
  tint: '#d9534f',
  name: L('Kan Yemini', 'Blood Oath'),
  desc: L('Bir düşman öldürdüğünde 3 can iyileş.', 'Whenever you kill an enemy, heal 3 HP.'),
  onKill: (c) => {
    flash(c, 'bloodOath');
    c.heal(c.hero, 3);
  },
});
R({
  id: 'eagleEye',
  rarity: 'starter',
  cls: 'ranger',
  icon: 'eye',
  tint: '#5cb85c',
  name: L('Kartal Gözü', 'Eagle Eye'),
  desc: L('Her tur ilk saldırı kartın hedefe 1 İşaret uygular.', 'Your first attack card each turn applies 1 Mark to its target.'),
  onCardPlayed: (c, card, sp) => {
    if (sp.type !== 'attack' || c.s.attacksThisTurn !== 1) return;
    const ev = [...c.events].reverse().find((e) => e.t === 'play' && e.card.uid === card.uid);
    const tgt = ev && ev.t === 'play' ? c.unit(ev.tgt) : undefined;
    if (tgt && tgt.side === 'enemy') {
      flash(c, 'eagleEye');
      c.applyStatus(tgt, 'mark', 1, c.hero);
    }
  },
});
R({
  id: 'manaCrystal',
  rarity: 'starter',
  cls: 'wizard',
  icon: 'crystal',
  tint: '#5b8def',
  name: L('Mana Kristali', 'Mana Crystal'),
  desc: L('Her savaşın ilk turunda +1 enerji.', 'Gain 1 extra energy on the first turn of each combat.'),
  onTurnStart: (c) => {
    if (c.s.turn === 1) {
      flash(c, 'manaCrystal');
      c.s.energy += 1;
    }
  },
});
R({
  id: 'shadowCloak',
  rarity: 'starter',
  cls: 'assassin',
  icon: 'cloak',
  tint: '#8e5bd6',
  name: L('Gölge Pelerini', 'Shadow Cloak'),
  desc: L('Her savaşa 1 Kaçınma ile başla. Tur başında 1 Zehir uygula rastgele düşmana.', 'Start each combat with 1 Dodge. At the start of your turn, apply 1 Poison to a random enemy.'),
  onCombatStart: (c) => c.applyStatus(c.hero, 'dodge', 1, c.hero),
  onTurnStart: (c) => {
    const foes = c.enemies();
    if (foes.length) c.applyStatus(c.rng.pick(foes), 'poison', 1, c.hero);
  },
});
R({
  id: 'holySymbol',
  rarity: 'starter',
  cls: 'paladin',
  icon: 'sun',
  tint: '#f0c85a',
  name: L('Kutsal Sembol', 'Holy Symbol'),
  desc: L('Savaş başında 1 Işıltı kazan. Savaş sonunda 4 can iyileş.', 'Start combat with 1 Radiance. Heal 4 HP after each combat.'),
  onCombatStart: (c) => c.applyStatus(c.hero, 'radiance', 1, c.hero),
  onCombatEnd: (run, won) => {
    if (won) run.hp = Math.min(run.maxHp, run.hp + 4);
  },
});
R({
  id: 'soulLantern',
  rarity: 'starter',
  cls: 'necromancer',
  icon: 'lantern',
  tint: '#9b6bd6',
  name: L('Ruh Feneri', 'Soul Lantern'),
  desc: L('Savaşa 2 Ruh ile başla. Her düşman öldüğünde 1 Ruh kazan.', 'Start combat with 2 Souls. Gain 1 Soul whenever an enemy dies.'),
  onCombatStart: (c) => c.applyStatus(c.hero, 'souls', 2, c.hero),
});
R({
  id: 'toolkit',
  rarity: 'starter',
  cls: 'engineer',
  icon: 'gear',
  tint: '#e0892f',
  name: L('Alet Çantası', 'Toolkit'),
  desc: L('Her savaşa önünde bir Mini Taret ile başla.', 'Start each combat with a Mini Turret in front of you.'),
  onCombatStart: (c) => {
    flash(c, 'toolkit');
    c.summonAlly('miniTurret', c.hero.pos + c.heroFacing(), false);
  },
});
R({
  id: 'prayerBeads',
  rarity: 'starter',
  cls: 'monk',
  icon: 'beads',
  tint: '#4fc1b0',
  name: L('Nefes Tespihi', 'Breath Beads'),
  desc: L('Savaşa 2 Ki ile başla. Bir düşmanı bir şeye çarptırdığında 1 Ki kazan.', 'Start combat with 2 Ki. Gain 1 Ki whenever you slam an enemy into something.'),
  onCombatStart: (c) => c.applyStatus(c.hero, 'ki', 2, c.hero),
});

/* --------------------------------------------------------------- common */
R({ id: 'oldBuckler', rarity: 'common', icon: 'shield', tint: '#9aa7b8', name: L('Eski Kalkan', 'Old Buckler'), desc: L('Her savaşa 8 blokla başla.', 'Start each combat with 8 Block.'), onCombatStart: (c) => c.gainBlock(c.hero, 8, false) });
R({ id: 'windBoots', rarity: 'common', icon: 'boot', tint: '#9ee37d', name: L('Rüzgâr Çizmeleri', 'Wind Boots'), desc: L('Her savaşın ilk turunda +2 hareket.', 'Gain 2 extra movement on the first turn of each combat.'), onTurnStart: (c) => { if (c.s.turn === 1) c.s.mp += 2; } });
R({ id: 'powerRing', rarity: 'common', icon: 'ring', tint: '#e0533d', name: L('Güç Yüzüğü', 'Ring of Might'), desc: L('Her savaşa 1 Güç ile başla.', 'Start each combat with 1 Strength.'), onCombatStart: (c) => c.applyStatus(c.hero, 'strength', 1, c.hero) });
R({ id: 'featherCharm', rarity: 'common', icon: 'feather', tint: '#4fa3e0', name: L('Tüy Muska', 'Feather Charm'), desc: L('Her savaşa 1 Çeviklik ile başla.', 'Start each combat with 1 Dexterity.'), onCombatStart: (c) => c.applyStatus(c.hero, 'dexterity', 1, c.hero) });
R({ id: 'luckyDice', rarity: 'common', icon: 'dice', tint: '#f5f5f5', firstDraw: 2, name: L('Uğurlu Zar', 'Lucky Dice'), desc: L('Her savaşın ilk turunda 2 fazla kart çek.', 'Draw 2 extra cards on the first turn of each combat.') });
R({ id: 'dewdrop', rarity: 'common', icon: 'drop', tint: '#7ad0ff', name: L('Çiğ Damlası', 'Dewdrop'), desc: L('Kazandığın her savaştan sonra 4 can iyileş.', 'Heal 4 HP after each combat you win.'), onCombatEnd: (run, won) => { if (won) run.hp = Math.min(run.maxHp, run.hp + 4); } });
R({ id: 'fearMask', rarity: 'common', icon: 'mask', tint: '#c07ad9', name: L('Korku Maskesi', 'Mask of Dread'), desc: L('Savaş başında tüm düşmanlara 1 Savunmasız uygula.', 'At the start of combat, apply 1 Vulnerable to all enemies.'), onCombatStart: (c) => { for (const e of c.enemies()) c.applyStatus(e, 'vulnerable', 1, c.hero); } });
R({ id: 'oilLamp', rarity: 'common', icon: 'lamp', tint: '#ffcf5a', name: L('Yağ Kandili', 'Oil Lamp'), desc: L('Her savaşın ilk turunda +1 enerji.', 'Gain 1 extra energy on the first turn of each combat.'), onTurnStart: (c) => { if (c.s.turn === 1) c.s.energy += 1; } });
R({ id: 'goldTooth', rarity: 'common', icon: 'coin', tint: '#ffd35a', name: L('Altın Diş', 'Gold Tooth'), desc: L('Her savaştan sonra 10 fazla altın.', 'Gain 10 extra gold after each combat.'), onCombatEnd: (run, won) => { if (won) run.gold += 10; } });
R({ id: 'spikedMail', rarity: 'common', icon: 'spikes', tint: '#b7a26a', name: L('Dikenli Zırh', 'Spiked Mail'), desc: L('Her savaşa 3 Diken ile başla.', 'Start each combat with 3 Thorns.'), onCombatStart: (c) => c.applyStatus(c.hero, 'thorns', 3, c.hero) });
R({ id: 'venomSac', rarity: 'common', icon: 'drop', tint: '#6cc644', name: L('Zehir Kesesi', 'Venom Sac'), desc: L('Savaş başında tüm düşmanlara 3 Zehir uygula.', 'At the start of combat, apply 3 Poison to all enemies.'), onCombatStart: (c) => { for (const e of c.enemies()) c.applyStatus(e, 'poison', 3, c.hero); } });
R({ id: 'whetstoneRelic', rarity: 'common', icon: 'whetstone', tint: '#c9d1d9', name: L('Bileği Taşı', 'Whetstone'), desc: L('Alındığında rastgele 2 saldırı kartını geliştir.', 'Upon pickup, upgrade 2 random attack cards.'), onPickup: (run, rng) => upgradeRandom(run, rng, 2, 'attack') });
R({ id: 'wardStone', rarity: 'common', icon: 'rune', tint: '#a78bfa', name: L('Koruma Taşı', 'Ward Stone'), desc: L('Alındığında rastgele 2 beceri kartını geliştir.', 'Upon pickup, upgrade 2 random skill cards.'), onPickup: (run, rng) => upgradeRandom(run, rng, 2, 'skill') });
R({ id: 'vitalBerry', rarity: 'common', icon: 'heart', tint: '#e05a7a', name: L('Hayat Meyvesi', 'Vital Berry'), desc: L('Alındığında maksimum canın 7 artar.', 'Upon pickup, raise your Max HP by 7.'), onPickup: (run) => { run.maxHp += 7; run.hp += 7; } });
R({ id: 'wanderersCompass', rarity: 'common', icon: 'compass', tint: '#caa66a', name: L('Gezgin Pusulası', "Wanderer's Compass"), desc: L('Bir olay odasına girdiğinde 20 altın kazan.', 'Whenever you enter an Event room, gain 20 gold.'), onEnterEvent: (run) => { run.gold += 20; } });
R({ id: 'viperFang', rarity: 'common', icon: 'fang', tint: '#6cc644', name: L('Engerek Dişi', 'Viper Fang'), desc: L('Zehir uyguladığında 1 fazla uygula.', 'Whenever you apply Poison, apply 1 more.') });
R({ id: 'emberStone', rarity: 'common', icon: 'fire', tint: '#ff8a2a', name: L('Kor Taşı', 'Ember Stone'), desc: L('Yanık uyguladığında 1 fazla uygula.', 'Whenever you apply Burn, apply 1 more.') });

/* ------------------------------------------------------------- uncommon */
R({ id: 'redSkull', rarity: 'uncommon', icon: 'skull', tint: '#e0533d', name: L('Kızıl Kafatası', 'Crimson Skull'), desc: L('Canın %50 veya altındayken saldırıların 3 fazla hasar verir.', 'While at 50% HP or less, your attacks deal 3 more damage.'), atkMod: (c, _s, _t, d) => (c.hero.hp <= c.hero.maxHp / 2 ? d + 3 : d) });
R({ id: 'travelersMap', rarity: 'uncommon', icon: 'map', tint: '#caa66a', cardChoices: 1, name: L('Gezgin Haritası', "Traveler's Map"), desc: L('Kart ödüllerinde 1 fazla seçenek.', 'Card rewards offer 1 more choice.') });
R({ id: 'crystalOrb', rarity: 'uncommon', icon: 'orb', tint: '#8fe3ff', name: L('Kristal Küre', 'Crystal Orb'), desc: L('Deste karıştırıldığında 5 blok kazan.', 'Whenever your draw pile is reshuffled, gain 5 Block.'), onShuffle: (c) => { flash(c, 'crystalOrb'); c.gainBlock(c.hero, 5, false); } });
R({ id: 'leatherBelt', rarity: 'uncommon', icon: 'belt', tint: '#a0703d', potionSlots: 1, name: L('Deri Kemer', 'Leather Belt'), desc: L('+1 iksir yuvası.', '+1 potion slot.') });
R({ id: 'meditationMat', rarity: 'uncommon', icon: 'lotus', tint: '#4fc1b0', name: L('Meditasyon Minderi', 'Meditation Mat'), desc: L('Dinlendiğinde rastgele bir kartı da geliştir.', 'When you rest, also upgrade a random card.'), onRest: (run) => upgradeRandom(run, undefined, 1) });
R({ id: 'merchantSeal', rarity: 'uncommon', icon: 'seal', tint: '#ffd35a', shopMult: 0.8, name: L('Tüccar Mührü', "Merchant's Seal"), desc: L('Dükkân fiyatları %20 daha ucuz.', 'Shop prices are 20% cheaper.') });
R({ id: 'mirrorShield', rarity: 'uncommon', icon: 'mirror', tint: '#bfe3ff', name: L('Ayna Kalkan', 'Mirror Shield'), desc: L('Bir saldırıyı tamamen bloklarsan saldırgana 3 hasar ver.', 'Whenever you fully block an attack, deal 3 damage to the attacker.') });
R({ id: 'wingedSandals', rarity: 'uncommon', icon: 'boot', tint: '#fff1a8', mp: 1, name: L('Kanatlı Sandalet', 'Winged Sandals'), desc: L('Her tur +1 hareket.', 'Gain 1 extra movement every turn.') });
R({ id: 'hourglass', rarity: 'uncommon', icon: 'hourglass', tint: '#e8c170', counter: 'hourglass', name: L('Kum Saati', 'Hourglass'), desc: L('Her 3 turda bir 1 enerji kazan.', 'Every 3rd turn, gain 1 energy.'), onTurnStart: (c) => { if (c.s.turn % 3 === 0) { flash(c, 'hourglass'); c.s.energy += 1; } } });
R({ id: 'witchEye', rarity: 'uncommon', icon: 'eye', tint: '#c04ae0', name: L('Cadı Gözü', "Witch's Eye"), desc: L('Zayıf düşmanlar %40 daha az hasar verir (%25 yerine).', 'Weakened enemies deal 40% less damage (instead of 25%).') });
R({ id: 'cruelHook', rarity: 'uncommon', icon: 'hook', tint: '#e07a3d', name: L('Zalim Kanca', 'Cruel Hook'), desc: L('Savunmasız düşmanlar %75 fazla hasar alır (%50 yerine).', 'Vulnerable enemies take 75% more damage (instead of 50%).') });
R({ id: 'bloodChalice', rarity: 'uncommon', icon: 'chalice', tint: '#c0233a', name: L('Kan Kadehi', 'Blood Chalice'), desc: L('Bir savaşta ilk kez can kaybettiğinde 1 enerji ve 1 kart kazan.', 'The first time you lose HP each combat, gain 1 energy and draw 1 card.'), onHeroHpLoss: (c) => { if (!c.s.flags.bloodChalice && c.s.phase === 'player') { c.s.flags.bloodChalice = 1; flash(c, 'bloodChalice'); c.s.energy += 1; c.drawCards(1); } } });
R({ id: 'trapKit', rarity: 'uncommon', icon: 'trap', tint: '#caa66a', name: L('Tuzakçı Seti', "Trapper's Kit"), desc: L('Bir tuzak tetiklendiğinde 4 blok kazan.', 'Whenever a trap triggers, gain 4 Block.'), onTrap: (c) => c.gainBlock(c.hero, 4, false) });
R({ id: 'ironBand', rarity: 'uncommon', icon: 'ring', tint: '#9aa7b8', name: L('Demir Bilezik', 'Iron Band'), desc: L('Her tur aldığın ilk saldırı hasarı 3 azalır.', 'The first attack damage you take each turn is reduced by 3.') });
R({ id: 'stormFlask', rarity: 'uncommon', icon: 'lightning', tint: '#8fd3ff', name: L('Fırtına Şişesi', 'Storm Flask'), desc: L('Her 5 kart oynadığında rastgele bir düşmana 5 hasar ver.', 'Every 5 cards you play, deal 5 damage to a random enemy.'), counter: 'stormFlask', onCardPlayed: (c) => { if (c.s.cardsThisCombat % 5 === 0) { const f = c.enemies(); if (f.length) { flash(c, 'stormFlask'); c.dealDamage(null, c.rng.pick(f), 5, { fx: 'lightning' }); } } } });

/* ----------------------------------------------------------------- rare */
R({ id: 'phoenix', rarity: 'rare', icon: 'feather', tint: '#ff8a2a', name: L('Anka Tüyü', 'Phoenix Feather'), desc: L('Öleceğin zaman %30 canla dirilirsin. Tek kullanımlık.', 'When you would die, revive with 30% HP instead. Single use.') });
R({ id: 'shadowSeal', rarity: 'rare', icon: 'moon', tint: '#8e5bd6', name: L('Gölge Mührü', 'Shadow Seal'), desc: L('Her savaşta ilk saldırın iki kat hasar verir.', 'Your first attack each combat deals double damage.') });
R({ id: 'timeWheel', rarity: 'rare', icon: 'hourglass', tint: '#fff1a8', name: L('Zaman Çarkı', 'Wheel of Time'), desc: L('Her savaşta oynadığın ilk 2+ maliyetli kart bedava.', 'The first card costing 2 or more each combat is free.') });
R({ id: 'dragonScale', rarity: 'rare', icon: 'scale', tint: '#e0533d', name: L('Ejder Pulu', 'Dragon Scale'), desc: L('Turunu 0 blokla bitirirsen 6 blok kazan.', 'If you end your turn with 0 Block, gain 6 Block.'), onTurnEnd: (c) => { if (c.hero.block === 0) { flash(c, 'dragonScale'); c.gainBlock(c.hero, 6, false); } } });
R({ id: 'bloodChain', rarity: 'rare', icon: 'chain', tint: '#c0233a', name: L('Kan Zinciri', 'Blood Chain'), desc: L('Bir düşman öldüğünde diğer tüm düşmanlara 4 hasar ver.', 'Whenever an enemy dies, deal 4 damage to all other enemies.'), onKill: (c) => { const f = c.enemies(); if (f.length) { flash(c, 'bloodChain'); for (const e of f) c.dealDamage(null, e, 4, { fx: 'blood' }); } } });
R({ id: 'crystalHeart', rarity: 'rare', icon: 'heart', tint: '#8fe3ff', name: L('Kristal Kalp', 'Crystal Heart'), desc: L('Alındığında maksimum canın 12 artar ve tamamen iyileşirsin.', 'Upon pickup, raise Max HP by 12 and heal to full.'), onPickup: (run) => { run.maxHp += 12; run.hp = run.maxHp; } });
R({ id: 'alchemistFlask', rarity: 'rare', icon: 'potion', tint: '#6cc644', name: L('Simyacı Şişesi', "Alchemist's Flask"), desc: L('İksirlerin etkisi %50 daha güçlü.', 'Potions are 50% more effective.') });
R({ id: 'battleStandard', rarity: 'rare', icon: 'banner', tint: '#d9534f', name: L('Savaş Sancağı', 'Battle Standard'), desc: L('Her tur başında 3 blok ve yardımcıların 3 blok kazanır.', 'At the start of your turn, you and your allies gain 3 Block.'), onTurnStart: (c) => { c.gainBlock(c.hero, 3, false); for (const a of c.allies()) c.gainBlock(a, 3, false); } });
R({ id: 'sageTome', rarity: 'rare', icon: 'book', tint: '#5b8def', name: L('Bilge Kitabı', "Sage's Tome"), desc: L('Her tur 3. kartını oynadığında 1 kart çek.', 'Whenever you play your 3rd card in a turn, draw 1 card.'), onCardPlayed: (c) => { if (c.s.cardsThisTurn === 3) { flash(c, 'sageTome'); c.drawCards(1); } } });

/* ------------------------------------------------------------- boss */
R({ id: 'blackSun', rarity: 'boss', icon: 'sun', tint: '#3a2d4f', energy: 1, name: L('Kara Güneş', 'Black Sun'), desc: L('+1 enerji. Kamp ateşinde dinlenemezsin.', '+1 energy. You can no longer rest at campfires.') });
R({ id: 'bloodCrystal', rarity: 'boss', icon: 'crystal', tint: '#c0233a', energy: 1, name: L('Kan Kristali', 'Blood Crystal'), desc: L('+1 enerji. Düşmanlar savaşa 1 Güçle başlar.', '+1 energy. Enemies start combat with 1 Strength.'), onCombatStart: (c) => { for (const e of c.enemies()) c.applyStatus(e, 'strength', 1, e); } });
R({ id: 'soulChain', rarity: 'boss', icon: 'chain', tint: '#b38cff', energy: 1, draw: -1, name: L('Ruh Zinciri', 'Soul Chain'), desc: L('+1 enerji. Her tur 1 kart az çekersin.', '+1 energy. Draw 1 fewer card each turn.') });
R({ id: 'goldenCrown', rarity: 'boss', icon: 'crown', tint: '#ffd35a', energy: 1, cardChoices: -1, name: L('Altın Taç', 'Golden Crown'), desc: L('+1 enerji. Kart ödüllerinde 1 az seçenek.', '+1 energy. Card rewards offer 1 fewer choice.') });
R({ id: 'deepPocket', rarity: 'boss', icon: 'bag', tint: '#a0703d', draw: 1, name: L('Derin Cep', 'Deep Pocket'), desc: L('Her tur 1 fazla kart çek.', 'Draw 1 extra card each turn.') });
R({ id: 'titanHeart', rarity: 'boss', icon: 'heart', tint: '#e0533d', name: L('Titan Kalbi', 'Titan Heart'), desc: L('Alındığında maksimum canın 20 artar ve tamamen iyileşirsin.', 'Upon pickup, raise Max HP by 20 and heal to full.'), onPickup: (run) => { run.maxHp += 20; run.hp = run.maxHp; } });
R({ id: 'stormBoots', rarity: 'boss', icon: 'boot', tint: '#8fd3ff', mp: 1, energy: 1, name: L('Fırtına Çizmeleri', 'Storm Boots'), desc: L('+1 enerji, +1 hareket. Savaşa 2 Zayıf ile başlarsın.', '+1 energy, +1 movement. Start combats with 2 Weak.'), onCombatStart: (c) => c.applyStatus(c.hero, 'weak', 2) });

/* --------------------------------------------------------------- shop */
R({ id: 'pickaxe', rarity: 'shop', icon: 'pickaxe', tint: '#9aa7b8', name: L('Kazma', 'Pickaxe'), desc: L('Kamp ateşinde bir kartı desteden atabilirsin.', 'You can remove a card at campfires.') });
R({
  id: 'sealedScroll',
  rarity: 'shop',
  icon: 'scroll',
  tint: '#caa66a',
  name: L('Mühürlü Tomar', 'Sealed Scroll'),
  desc: L('Alındığında destene sınıfından 2 rastgele geliştirilmiş sıradışı kart ekler.', 'Upon pickup, add 2 random upgraded uncommon cards of your class to your deck.'),
  onPickup: (run, rng) => {
    for (const d of rng.sample(classCards(run.cls, 'uncommon'), 2)) run.deck.push({ uid: run.nextUid++, id: d.id, up: true });
  },
});
R({ id: 'potionBelt', rarity: 'shop', icon: 'belt', tint: '#6cc644', potionSlots: 2, name: L('İksir Kuşağı', 'Potion Bandolier'), desc: L('+2 iksir yuvası.', '+2 potion slots.') });

/* --------------------------------------------------------------- event */
R({ id: 'cursedIdol', rarity: 'event', icon: 'idol', tint: '#ffd35a', name: L('Lanetli Put', 'Cursed Idol'), desc: L('Her savaştan sonra 25 altın kazan.', 'Gain 25 gold after each combat.'), onCombatEnd: (run, won) => { if (won) run.gold += 25; } });
R({ id: 'ancientCoin', rarity: 'event', icon: 'coin', tint: '#c9a14a', name: L('Kadim Sikke', 'Ancient Coin'), desc: L('Elitleri yendiğinde ek 50 altın.', 'Gain 50 extra gold from elites.'), onCombatEnd: (run, won, tier) => { if (won && tier === 'elite') run.gold += 50; } });

/* --------------------------------------------------------------- helpers */

function upgradeRandom(run: RunState, rng: Rng | undefined, n: number, type?: 'attack' | 'skill'): void {
  const pool = run.deck.filter((c) => canUpgrade(c.id, c.up) && (!type || cardSpec(c.id, false).type === type));
  for (let i = 0; i < n && pool.length; i++) {
    const idx = rng ? rng.int(0, pool.length - 1) : Math.floor(Math.random() * pool.length);
    pool[idx].up = true;
    pool.splice(idx, 1);
  }
}

export const RELICS: Record<string, RelicDef> = Object.fromEntries(ALL.map((r) => [r.id, r]));
export const RELIC_LIST = ALL;

export function relicPassive(run: RunState, key: 'energy' | 'mp' | 'draw' | 'firstDraw' | 'potionSlots' | 'cardChoices'): number {
  let n = 0;
  for (const id of run.relics) n += (RELICS[id]?.[key] as number | undefined) ?? 0;
  return n;
}
