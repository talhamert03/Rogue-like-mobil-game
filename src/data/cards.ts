import { L } from '../i18n/i18n';
import type { CardDef, CardPool, CardSpec, Effect, Num, Rarity, Sel, Cond } from '../engine/types';

/* ------------------------------------------------------------- builders */

const v = (u: boolean, a: number, b: number) => (u ? b : a);

const D = (n: Num, o: Partial<Extract<Effect, { k: 'dmg' }>> = {}): Effect => ({ k: 'dmg', n, ...o });
const B = (n: Num): Effect => ({ k: 'block', n });
const BA = (n: Num): Effect => ({ k: 'block', n, to: 'allies' });
const S = (s: string, n: Num, to: Sel = 'target', o: { radius?: number; len?: number } = {}): Effect => ({ k: 'status', s, n, to, ...o });
const SELF = (s: string, n: Num): Effect => ({ k: 'status', s, n, to: 'self' });
const DRAW = (n: Num): Effect => ({ k: 'draw', n });
const EN = (n: Num): Effect => ({ k: 'energy', n });
const MP = (n: Num): Effect => ({ k: 'mp', n });
const HEAL = (n: Num): Effect => ({ k: 'heal', n });
const PUSH = (n: number, to: Sel = 'target', o: { radius?: number; stun?: boolean } = {}): Effect => ({ k: 'push', n, to, ...o });
const PULL = (n: number, to: Sel = 'target'): Effect => ({ k: 'pull', n, to });
const DASH = (n: number): Effect => ({ k: 'dash', n });
const RETREAT = (n: number): Effect => ({ k: 'retreat', n });
const SUMMON = (unit: string): Effect => ({ k: 'summon', unit });
const TRAP = (trap: string, n: Num, radius = 0): Effect => ({ k: 'trap', trap, n, radius });
const ADD = (card: string, n: number, to: 'hand' | 'draw' | 'discard' = 'hand'): Effect => ({ k: 'addCard', card, n, to });
const CUSTOM = (id: string, n?: Num, m?: Num): Effect => ({ k: 'custom', id, n, m });
const IF = (cond: Cond, then: Effect[], els?: Effect[]): Effect => ({ k: 'if', cond, then, else: els });

const atk = (cost: number, range: number, effects: Effect[], o: Partial<CardSpec> = {}): CardSpec => ({
  cost,
  type: 'attack',
  target: 'enemy',
  range,
  effects,
  ...o,
});
const skl = (cost: number, effects: Effect[], o: Partial<CardSpec> = {}): CardSpec => ({ cost, type: 'skill', target: 'none', effects, ...o });
const pwr = (cost: number, effects: Effect[], o: Partial<CardSpec> = {}): CardSpec => ({ cost, type: 'power', target: 'none', effects, ...o });

const ALL: CardDef[] = [];
function C(
  id: string,
  pool: CardPool,
  rarity: Rarity,
  art: string,
  tr: string,
  en: string,
  spec: (u: boolean) => CardSpec,
  extra: Partial<CardDef> = {},
): void {
  ALL.push({ id, pool, rarity, art, name: L(tr, en), spec, ...extra });
}

/* ============================================================== WARRIOR */
const W = 'warrior';
C('slash', W, 'starter', 'sword', 'Kılıç Darbesi', 'Slash', (u) => atk(1, 1, [D(v(u, 6, 9))]));
C('guard', W, 'starter', 'shield', 'Kalkan Duruşu', 'Guard', (u) => skl(1, [B(v(u, 5, 8))]));
C('shoulderCharge', W, 'starter', 'charge', 'Omuz Hücumu', 'Shoulder Charge', (u) => atk(1, 4, [DASH(3), D(v(u, 5, 8)), PUSH(1)]));
C('hurl', W, 'starter', 'hurl', 'Savur', 'Hurl', (u) => atk(1, 1, [D(v(u, 5, 7)), PUSH(v(u, 2, 3))]));
C('cleave', W, 'common', 'axe', 'Yarma', 'Cleave', (u) => atk(1, 1, [D(v(u, 7, 10)), D(v(u, 7, 10), { to: 'behind' })]));
C('ironSkin', W, 'common', 'shield', 'Demir Deri', 'Iron Skin', (u) => skl(1, [B(v(u, 7, 10)), PUSH(1, 'adjacent')]));
C('furyStrikes', W, 'common', 'sword', 'Hışım', 'Fury Strikes', (u) => atk(1, 1, [D(v(u, 4, 5), { times: 2 })]));
C('shieldSlam', W, 'common', 'shieldBash', 'Kalkan Vuruşu', 'Shield Slam', (u) => atk(v(u, 1, 0), 1, [CUSTOM('shieldSlam', 0)], {
  desc: L('Bloğun kadar hasar ver.', 'Deal damage equal to your Block.'),
}));
C('challenge', W, 'common', 'chain', 'Meydan Okuma', 'Challenge', (u) => skl(1, [PULL(3), B(v(u, 5, 8))], { target: 'enemy', range: 4 }));
C('bloodPact', W, 'common', 'blood', 'Kan Anlaşması', 'Blood Pact', (u) => skl(0, [{ k: 'loseHp', n: 3 }, EN(1), DRAW(v(u, 1, 2))]));
C('warRoar', W, 'common', 'roar', 'Savaş Narası', 'War Roar', (u) => skl(1, [SELF('strength', v(u, 2, 3))], { exhaust: true }));
C('groundSlam', W, 'common', 'quake', 'Yer Sarsıntısı', 'Ground Slam', (u) => atk(2, 0, [D(v(u, 9, 12), { to: 'near', radius: 2, fx: 'slam' }), S('weak', 1, 'near', { radius: 2 })], { target: 'none' }));
C('bloodlust', W, 'uncommon', 'fang', 'Kan Hırsı', 'Bloodlust', (u) => pwr(v(u, 1, 0), [SELF('bloodlust', 1)]));
C('unyielding', W, 'uncommon', 'wall', 'Kaya Gibi', 'Unyielding', (u) => skl(2, [B(v(u, 13, 17)), SELF('retainBlock', 1)]));
C('boot', W, 'uncommon', 'boot', 'Tekme At', 'Boot', (u) => atk(0, 1, [D(v(u, 3, 5)), PUSH(2)]));
C('rockBreaker', W, 'uncommon', 'hammer', 'Kaya Kırıcı', 'Rockbreaker', (u) => atk(2, 1, [D(v(u, 10, 13), { fx: 'impact' }), PUSH(2, 'target', { stun: true })]));
C('rally', W, 'uncommon', 'banner', 'Toparlan', 'Rally', (u) => skl(1, [B(v(u, 6, 9)), DRAW(1)]));
C('titanForm', W, 'rare', 'fist', 'Titan Gücü', 'Titan Might', (u) => pwr(v(u, 3, 2), [SELF('titan', 2)]));
C('devastate', W, 'rare', 'hammer', 'Yıkım', 'Devastate', (u) => atk(2, 1, [D(v(u, 18, 24), { fx: 'impact' }), PUSH(2)]));
C('lastStand', W, 'rare', 'shield', 'Son Direniş', 'Last Stand', (u) => skl(1, [CUSTOM('lastStand', v(u, 0, 6))], {
  exhaust: true,
  desc: u
    ? L('Eksik canının yarısı +6 kadar blok kazan.', 'Gain Block equal to half your missing HP +6.')
    : L('Eksik canının yarısı kadar blok kazan.', 'Gain Block equal to half your missing HP.'),
}));
C('whirlwind', W, 'rare', 'whirl', 'Çelik Kasırga', 'Steel Whirlwind', (u) => atk(-1, 0, [D(v(u, 5, 7), { to: 'near', radius: 1, times: { b: 0, per: 'x' }, fx: 'slash' })], { target: 'none' }));

/* =============================================================== RANGER */
const R = 'ranger';
C('arrowShot', R, 'starter', 'bow', 'Ok Atışı', 'Arrow Shot', (u) => atk(1, 5, [D(v(u, 5, 8), { fx: 'arrow' })]));
C('takeCover', R, 'starter', 'shield', 'Sipere Gir', 'Take Cover', (u) => skl(1, [B(v(u, 5, 8))]));
C('bearTrap', R, 'starter', 'trap', 'Ayı Kapanı', 'Bear Trap', (u) => skl(1, [TRAP('bear', v(u, 8, 12))], { target: 'empty', range: 3, note: L('Tetikleyeni 2 tur Sabitler.', 'Roots the victim for 2 turns.') }));
C('kickBack', R, 'starter', 'boot', 'Tekmele ve Sıçra', 'Kick Back', (u) => atk(1, 1, [D(v(u, 4, 6)), PUSH(1), RETREAT(v(u, 1, 2))]));
C('doubleShot', R, 'common', 'bow', 'Çift Atış', 'Double Shot', (u) => atk(1, 5, [D(v(u, 4, 5), { times: 2, fx: 'arrow' })]));
C('piercingArrow', R, 'common', 'arrow', 'Delici Ok', 'Piercing Arrow', (u) => atk(1, 6, [D(v(u, 6, 9), { to: 'line', len: 6, fx: 'arrow' })]));
C('huntersMark', R, 'common', 'target', 'Avcının İşareti', "Hunter's Mark", (u) => skl(0, [S('mark', v(u, 2, 3))], { target: 'enemy', range: 7 }));
C('spikeTrap', R, 'common', 'spikes', 'Diken Tuzağı', 'Spike Trap', (u) => skl(0, [TRAP('spike', v(u, 6, 9))], { target: 'empty', range: 4 }));
C('quickDraw', R, 'common', 'bow', 'Hızlı Nişan', 'Quick Draw', (u) => atk(0, 4, [D(v(u, 3, 5), { fx: 'arrow' }), DRAW(1)]));
C('camouflage', R, 'common', 'leaf', 'Kamuflaj', 'Camouflage', (u) => skl(1, [SELF('dodge', 1), B(v(u, 4, 7))]));
C('netShot', R, 'common', 'net', 'Ağ Atışı', 'Net Shot', (u) => atk(1, 4, [D(v(u, 3, 5), { fx: 'arrow' }), S('root', 2), ...(u ? [S('weak', 1)] : [])]));
C('windrunner', R, 'common', 'wind', 'Rüzgar Koşucusu', 'Windrunner', (u) => skl(1, [MP(2), B(v(u, 4, 7))]));
C('volley', R, 'uncommon', 'arrows', 'Ok Yağmuru', 'Volley', (u) => atk(2, 0, [D(v(u, 7, 10), { to: 'all', fx: 'arrow' })], { target: 'none' }));
C('explosiveTrap', R, 'uncommon', 'bomb', 'Patlayıcı Tuzak', 'Explosive Trap', (u) => skl(1, [TRAP('explosive', v(u, 8, 11), 1)], { target: 'empty', range: 4 }));
C('trapmaster', R, 'uncommon', 'trap', 'Tuzak Ustası', 'Trapmaster', (u) => pwr(v(u, 1, 0), [SELF('trapmaster', 1)]));
C('sharpshooter', R, 'uncommon', 'target', 'Keskin Nişancı', 'Sharpshooter', (u) => pwr(1, [SELF('sharpshooter', v(u, 2, 3))]));
C('poisonArrow', R, 'uncommon', 'poisonArrow', 'Zehirli Ok', 'Venom Arrow', (u) => atk(1, 5, [D(4, { fx: 'arrow' }), S('poison', v(u, 3, 5))]));
C('frostTrap', R, 'uncommon', 'snow', 'Buz Tuzağı', 'Frost Trap', (u) => skl(0, [TRAP('frost', v(u, 4, 6))], { target: 'empty', range: 4, note: L('Tetikleyeni Sabitler ve Zayıflatır.', 'Roots and Weakens the victim.') }));
C('wolfCompanion', R, 'rare', 'wolf', 'Kurt Yoldaş', 'Wolf Companion', (u) => skl(v(u, 2, 1), [SUMMON('wolf')], { target: 'empty', range: 2 }));
C('deadlyShot', R, 'rare', 'arrow', 'Ölümcül Atış', 'Deadly Shot', (u) => atk(2, 6, [CUSTOM('deadlyShot', v(u, 12, 16), 3)], {
  desc: u
    ? L('16 hasar ver, hedefteki her İşaret için +3. İşareti kaldırır.', 'Deal 16 damage, +3 per Mark on the target. Removes Mark.')
    : L('12 hasar ver, hedefteki her İşaret için +3. İşareti kaldırır.', 'Deal 12 damage, +3 per Mark on the target. Removes Mark.'),
}));
C('windForm', R, 'rare', 'wind', 'Rüzgârla Bir', 'One with the Wind', (u) => pwr(v(u, 1, 0), [SELF('haste', 1)]));

/* =============================================================== WIZARD */
const Z = 'wizard';
C('arcaneBolt', Z, 'starter', 'bolt', 'Büyü Oku', 'Arcane Bolt', (u) => atk(1, 4, [D(v(u, 5, 8), { fx: 'arcane' })]));
C('ward', Z, 'starter', 'rune', 'Büyü Kalkanı', 'Ward', (u) => skl(1, [B(v(u, 5, 8))]));
C('fireball', Z, 'starter', 'fireball', 'Ateş Topu', 'Fireball', (u) => atk(2, 5, [D(v(u, 8, 11), { to: 'area', radius: 1, fx: 'fire' }), S('burn', 2, 'area', { radius: 1 })], { target: 'tile' }));
C('frostLance', Z, 'starter', 'ice', 'Buz Mızrağı', 'Frost Lance', (u) => atk(1, 4, [D(v(u, 6, 8), { fx: 'ice' }), S('root', v(u, 1, 2))]));
C('chainLightning', Z, 'common', 'lightning', 'Zincirleme Şimşek', 'Chain Lightning', (u) => atk(2, 4, [D(v(u, 7, 9), { fx: 'lightning' }), CUSTOM('chain', v(u, 7, 9))], {
  desc: u
    ? L('Hedefe ve ona bitişik tüm düşman zincirine 9 hasar ver.', 'Deal 9 damage to the target and every enemy chained next to it.')
    : L('Hedefe ve ona bitişik tüm düşman zincirine 7 hasar ver.', 'Deal 7 damage to the target and every enemy chained next to it.'),
}));
C('flameWave', Z, 'common', 'fire', 'Alev Dalgası', 'Flame Wave', (u) => atk(1, 0, [D(v(u, 4, 6), { to: 'line', len: 3, fx: 'fire' }), S('burn', 2, 'line', { len: 3 })], { target: 'none' }));
C('iceWall', Z, 'common', 'iceWall', 'Buz Duvarı', 'Ice Wall', (u) => skl(1, [B(v(u, 7, 10)), S('root', 1, 'adjacent')]));
C('insight', Z, 'common', 'book', 'Arkan Kavrayış', 'Arcane Insight', (u) => skl(v(u, 1, 0), [DRAW(3)]));
C('spark', Z, 'common', 'spark', 'Kıvılcım', 'Spark', (u) => atk(0, 3, [D(v(u, 4, 6), { fx: 'lightning' })]));
C('ignite', Z, 'common', 'fire', 'Tutuşma', 'Ignite', (u) => skl(1, [S('burn', v(u, 5, 7))], { target: 'enemy', range: 4 }));
C('blink', Z, 'common', 'blink', 'Işınlanma', 'Blink', (u) => skl(0, [{ k: 'moveTo' }, ...(u ? [DRAW(1)] : [])], { target: 'empty', range: v(u, 3, 4) }));
C('manaSurge', Z, 'common', 'crystal', 'Mana Seli', 'Mana Surge', (u) => skl(0, [EN(v(u, 1, 2)), DRAW(1)], { exhaust: true }));
C('blizzard', Z, 'uncommon', 'snow', 'Kutup Fırtınası', 'Blizzard', (u) => atk(2, 0, [D(v(u, 6, 9), { to: 'all', fx: 'ice' }), S('root', 1, 'all'), S('weak', 1, 'all')], { target: 'none' }));
C('pyromancy', Z, 'uncommon', 'fire', 'Ateş Ustalığı', 'Pyromancy', (u) => pwr(1, [SELF('pyromancy', v(u, 1, 2))]));
C('arcaneBarrier', Z, 'uncommon', 'rune', 'Arkan Bariyer', 'Arcane Barrier', (u) => pwr(2, [SELF('barrier', v(u, 4, 6))]));
C('staticCharge', Z, 'uncommon', 'lightning', 'Statik Yük', 'Static Charge', (u) => atk(1, 4, [CUSTOM('staticCharge', v(u, 6, 8))], {
  desc: u
    ? L('8 hasar ver. Hedef Sabitlenmişse iki katı.', 'Deal 8 damage. Double if the target is Rooted.')
    : L('6 hasar ver. Hedef Sabitlenmişse iki katı.', 'Deal 6 damage. Double if the target is Rooted.'),
}));
C('flameRing', Z, 'uncommon', 'fireRing', 'Alev Halkası', 'Ring of Fire', (u) => atk(1, 0, [D(v(u, 3, 4), { to: 'near', radius: 1, fx: 'fire' }), S('burn', v(u, 3, 4), 'near', { radius: 1 })], { target: 'none' }));
C('coldBreath', Z, 'uncommon', 'ice', 'Soğuk Nefes', 'Cold Breath', (u) => atk(1, 3, [D(v(u, 5, 7), { fx: 'ice' }), S('weak', 2)]));
C('meteor', Z, 'rare', 'meteor', 'Meteor', 'Meteor', (u) => atk(3, 7, [D(v(u, 22, 30), { to: 'area', radius: 1, fx: 'explosion' }), S('burn', 3, 'area', { radius: 1 })], { target: 'tile' }));
C('echo', Z, 'rare', 'echo', 'Büyü Yankısı', 'Spell Echo', (u) => skl(v(u, 1, 0), [SELF('echo', 1)], { exhaust: true }));
C('inferno', Z, 'rare', 'fire', 'Cehennem Alevi', 'Inferno', (u) => skl(2, [S('burn', v(u, 6, 9), 'all')]));

/* ============================================================= ASSASSIN */
const A = 'assassin';
C('stab', A, 'starter', 'dagger', 'Hançer', 'Stab', (u) => atk(1, 1, [D(v(u, 6, 9), { fx: 'slash' })]));
C('evade', A, 'starter', 'cloak', 'Sakınma', 'Evade', (u) => skl(1, [B(v(u, 5, 8))]));
C('toxicBlade', A, 'starter', 'poisonDagger', 'Zehirli Bıçak', 'Toxic Blade', (u) => atk(1, 1, [D(v(u, 3, 4)), S('poison', v(u, 3, 5))]));
C('shadowstep', A, 'starter', 'shadow', 'Gölge Sıçrayışı', 'Shadowstep', (u) => skl(v(u, 1, 0), [{ k: 'behindTarget' }, SELF('dodge', 1)], { target: 'enemy', range: 3 }));
C('throwingKnife', 'token', 'special', 'dagger', 'Atış Hançeri', 'Throwing Knife', (u) => atk(0, 3, [D(v(u, 4, 6), { fx: 'knife' })], { exhaust: true }));
C('bladeFlurry', A, 'common', 'daggers', 'Bıçak Yağmuru', 'Blade Flurry', (u) => skl(1, [ADD('throwingKnife', v(u, 2, 3))]));
C('toxicCloud', A, 'common', 'cloud', 'Zehir Bulutu', 'Toxic Cloud', (u) => skl(1, [S('poison', v(u, 4, 6), 'area', { radius: 1 })], { target: 'tile', range: 3 }));
C('backstab', A, 'common', 'dagger', 'Arkadan Bıçak', 'Backstab', (u) => atk(0, 1, [D(v(u, 9, 13), { fx: 'slash' })], { innate: true, exhaust: true }));
C('smokeBomb', A, 'common', 'smoke', 'Duman Bombası', 'Smoke Bomb', (u) => skl(1, [SELF('dodge', v(u, 1, 2)), RETREAT(2)]));
C('nimble', A, 'common', 'boot', 'Kıvrak', 'Nimble', (u) => skl(1, [B(v(u, 4, 6)), MP(1), DRAW(1)]));
C('serratedEdge', A, 'common', 'blood', 'Tırtıklı Bıçak', 'Serrated Edge', (u) => atk(1, 1, [D(v(u, 5, 7)), S('bleed', v(u, 3, 4))]));
C('poisonNeedle', A, 'common', 'needle', 'Zehirli İğne', 'Poison Needle', (u) => skl(0, [S('poison', v(u, 3, 4))], { target: 'enemy', range: 4 }));
C('cheapShot', A, 'common', 'dagger', 'Kirli Numara', 'Cheap Shot', (u) => atk(1, 1, [D(v(u, 4, 6)), S('weak', 1), S('vulnerable', v(u, 1, 2))]));
C('toxicBurst', A, 'uncommon', 'drop', 'Zehir Patlaması', 'Toxic Burst', (u) => skl(1, [CUSTOM('triggerPoison', v(u, 1, 2))], {
  target: 'enemy',
  range: 4,
  desc: u
    ? L('Hedef, Zehri kadar canı hemen 2 kez kaybeder.', 'Target immediately loses HP equal to its Poison, twice.')
    : L('Hedef, Zehri kadar canı hemen kaybeder.', 'Target immediately loses HP equal to its Poison.'),
}));
C('noxious', A, 'uncommon', 'drop', 'Ölümcül Zehir', 'Noxious Mastery', (u) => pwr(v(u, 1, 0), [SELF('noxious', 1)]));
C('shadowDance', A, 'uncommon', 'shadow', 'Gölge Dansı', 'Shadow Dance', (u) => skl(1, [MP(2), DRAW(v(u, 2, 3))]));
C('lacerate', A, 'uncommon', 'daggers', 'Parçala', 'Lacerate', (u) => atk(1, 1, [D(v(u, 3, 4), { times: 3, fx: 'slash' })]));
C('hook', A, 'uncommon', 'chain', 'Kanca', 'Hook', (u) => skl(1, [PULL(2), S('bleed', v(u, 3, 5))], { target: 'enemy', range: 3 }));
C('mistVeil', A, 'uncommon', 'smoke', 'Sis Perdesi', 'Mist Veil', (u) => skl(2, [SELF('dodge', v(u, 2, 3))], { exhaust: true }));
C('assassinate', A, 'rare', 'skullDagger', 'Suikast', 'Assassinate', (u) => atk(2, 1, [D(v(u, 20, 26), { fx: 'slash' }), CUSTOM('executeKill', 2)], {
  note: L('Öldürürse 2 enerji kazan.', 'If it kills, gain 2 energy.'),
}));
C('deathMark', A, 'rare', 'skull', 'Ölüm İşareti', 'Death Mark', (u) => skl(1, [CUSTOM('multiplyPoison', v(u, 2, 3))], {
  target: 'enemy',
  range: 5,
  exhaust: true,
  desc: u ? L('Hedefin Zehrini üçe katla.', "Triple the target's Poison.") : L('Hedefin Zehrini ikiye katla.', "Double the target's Poison."),
}));
C('bladeMaster', A, 'rare', 'daggers', 'Hançer Ustası', 'Blade Master', (u) => pwr(v(u, 1, 0), [SELF('bladeMaster', 1)]));

/* ============================================================== PALADIN */
const P = 'paladin';
C('justiceStrike', P, 'starter', 'sword', 'Adalet Darbesi', 'Justice Strike', (u) => atk(1, 1, [D(v(u, 6, 9))]));
C('shieldBlock', P, 'starter', 'shield', 'Kalkan Bloğu', 'Shield Block', (u) => skl(1, [B(v(u, 5, 8))]));
C('smite', P, 'starter', 'holy', 'Kutsal Darbe', 'Smite', (u) => atk(1, 2, [D(v(u, 7, 10), { holy: true, fx: 'holy' })]));
C('prayer', P, 'starter', 'pray', 'Dua', 'Prayer', (u) => skl(1, [HEAL(v(u, 3, 5)), SELF('radiance', 2)], { exhaust: true }));
C('aegis', P, 'common', 'shield', 'Işık Kalkanı', 'Aegis', (u) => skl(1, [B(v(u, 7, 10)), SELF('radiance', 1)]));
C('blessing', P, 'common', 'sun', 'Kutsama', 'Blessing', (u) => skl(1, [SELF('radiance', v(u, 2, 3)), DRAW(1)]));
C('holyCharge', P, 'common', 'charge', 'Kutsal Hücum', 'Holy Charge', (u) => atk(1, 4, [DASH(3), D(v(u, 5, 8), { holy: true, fx: 'holy' })]));
C('blindingLight', P, 'common', 'sun', 'Kör Edici Işık', 'Blinding Light', (u) => skl(1, [S('weak', v(u, 2, 3), 'near', { radius: 3 })]));
C('patience', P, 'common', 'shield', 'Sabır', 'Patience', (u) => skl(1, [B(v(u, 6, 9))], { retain: true }));
C('hallowedGround', P, 'common', 'holy', 'Kutsal Zemin', 'Hallowed Ground', (u) => atk(1, 0, [D(v(u, 3, 5), { to: 'near', radius: 2, holy: true, fx: 'holy' })], { target: 'none' }));
C('rebuke', P, 'common', 'shieldBash', 'Azar', 'Rebuke', (u) => atk(1, 1, [D(v(u, 5, 7), { holy: true, fx: 'holy' }), PUSH(2)]));
C('oath', P, 'common', 'pray', 'Kutsal Yemin', 'Holy Oath', (u) => skl(0, [EN(1), SELF('radiance', v(u, 1, 2))], { exhaust: true }));
C('judgment', P, 'uncommon', 'scales', 'Yargı', 'Judgment', (u) => atk(2, 3, [D(v(u, 12, 16), { holy: true, fx: 'holy' }), S('vulnerable', 2)]));
C('holyNova', P, 'uncommon', 'nova', 'Kutsal Nova', 'Holy Nova', (u) => atk(2, 0, [D(v(u, 6, 9), { to: 'near', radius: 2, holy: true, fx: 'holy' }), HEAL(v(u, 2, 3))], { target: 'none' }));
C('crusader', P, 'uncommon', 'sun', 'Haçlı Ruhu', 'Zeal', (u) => pwr(v(u, 2, 1), [SELF('crusader', 1)]));
C('retribution', P, 'uncommon', 'spikes', 'Kefaret', 'Retribution', (u) => pwr(1, [SELF('thorns', v(u, 3, 5))]));
C('healingLight', P, 'uncommon', 'heart', 'Şifa Işığı', 'Healing Light', (u) => skl(2, [HEAL(v(u, 8, 12))], { exhaust: true }));
C('sacredShield', P, 'uncommon', 'shield', 'Kutsal Siper', 'Sacred Bulwark', (u) => skl(1, [B({ b: v(u, 4, 7), per: 'radiance', m: 2 })]));
C('divineShield', P, 'rare', 'wall', 'İlahi Kalkan', 'Divine Shield', (u) => skl(2, [B(v(u, 20, 28))], { exhaust: true }));
C('avatar', P, 'rare', 'sun', 'Işık Avatarı', 'Avatar of Light', (u) => pwr(v(u, 3, 2), [SELF('avatar', 1)]));
C('radiantBurst', P, 'rare', 'nova', 'Işık Patlaması', 'Radiant Burst', (u) => atk(1, 4, [CUSTOM('radiantBurst', v(u, 4, 5), 0)], {
  desc: u
    ? L('Tüm Işıltını harca: her biri için 5 hasar ver.', 'Spend all Radiance: deal 5 damage for each.')
    : L('Tüm Işıltını harca: her biri için 4 hasar ver.', 'Spend all Radiance: deal 4 damage for each.'),
}));

/* ========================================================== NECROMANCER */
const N = 'necromancer';
C('shadowBolt', N, 'starter', 'shadowBolt', 'Gölge Oku', 'Shadow Bolt', (u) => atk(1, 3, [D(v(u, 5, 8), { fx: 'shadow' })]));
C('boneArmor', N, 'starter', 'bone', 'Kemik Zırh', 'Bone Armor', (u) => skl(1, [B(v(u, 5, 8))]));
C('raiseSkeleton', N, 'starter', 'skull', 'İskelet Dirilt', 'Raise Skeleton', (u) => skl(1, [SUMMON('skeleton')], { target: 'empty', range: 2 }));
C('drainLife', N, 'starter', 'drain', 'Can Emme', 'Drain Life', (u) => atk(1, 2, [D(v(u, 5, 8), { fx: 'soul', lifesteal: 0.5 })]));
C('hex', N, 'common', 'eye', 'Lanet', 'Hex', (u) => skl(0, [S('weak', v(u, 1, 2)), S('vulnerable', v(u, 1, 2))], { target: 'enemy', range: 4 }));
C('soulHarvest', N, 'common', 'scythe', 'Ruh Hasadı', 'Soul Harvest', (u) => atk(1, 3, [D(v(u, 6, 9), { fx: 'soul' }), CUSTOM('gainSoulOnKill', 2)], {
  note: L('Öldürürse 2 Ruh kazan.', 'If it kills, gain 2 Souls.'),
}));
C('boneSpear', N, 'common', 'bone', 'Kemik Mızrak', 'Bone Spear', (u) => atk(1, 3, [D(v(u, 6, 9), { to: 'line', len: 3 })]));
C('graveChill', N, 'common', 'ice', 'Mezar Soğuğu', 'Grave Chill', (u) => atk(1, 3, [D(v(u, 4, 6), { fx: 'ice' }), S('root', 1), S('weak', 1)]));
C('soulShield', N, 'common', 'soul', 'Ruh Kalkanı', 'Soul Shield', (u) => skl(1, [B(v(u, 7, 10)), SELF('souls', 1)]));
C('plague', N, 'common', 'cloud', 'Veba', 'Plague', (u) => skl(1, [S('poison', v(u, 3, 4), 'all')]));
C('darkRitual', N, 'common', 'blood', 'Karanlık Ayin', 'Dark Ritual', (u) => skl(0, [{ k: 'loseHp', n: 3 }, SELF('souls', v(u, 2, 3))]));
C('boneWall', N, 'common', 'bone', 'Kemik Duvar', 'Bone Wall', (u) => skl(1, [B(v(u, 5, 7)), BA(v(u, 5, 7))]));
C('corpseExplosion', N, 'uncommon', 'explosion', 'Ceset Patlatma', 'Corpse Explosion', (u) => skl(1, [CUSTOM('corpseExplosion', v(u, 12, 16))], {
  target: 'ally',
  range: 7,
  desc: u
    ? L('Bir yardımcını feda et: çevresindeki düşmanlara 16 hasar ver.', 'Sacrifice an ally: deal 16 damage to enemies around it.')
    : L('Bir yardımcını feda et: çevresindeki düşmanlara 12 hasar ver.', 'Sacrifice an ally: deal 12 damage to enemies around it.'),
}));
C('darkPact', N, 'uncommon', 'soul', 'Karanlık Pakt', 'Dark Pact', (u) => skl(0, [EN(2), DRAW(v(u, 1, 2))], { soulCost: 2 }));
C('boneGolem', N, 'uncommon', 'golem', 'Kemik Golem', 'Bone Golem', (u) => skl(1, [SUMMON('boneGolem')], { target: 'empty', range: 2, soulCost: 3 }));
C('siphon', N, 'uncommon', 'drain', 'Yaşam Sifonu', 'Life Siphon', (u) => atk(2, 0, [D(v(u, 5, 7), { to: 'all', fx: 'soul', lifesteal: 0.5 })], { target: 'none' }));
C('empowerUndead', N, 'uncommon', 'skull', 'Ölüleri Güçlendir', 'Empower Undead', (u) => skl(1, [CUSTOM('allyStrength', v(u, 2, 3)), BA(4)], {
  desc: u
    ? L('Yardımcıların 3 Güç ve 4 blok kazanır.', 'Allies gain 3 Strength and 4 Block.')
    : L('Yardımcıların 2 Güç ve 4 blok kazanır.', 'Allies gain 2 Strength and 4 Block.'),
}));
C('graveCall', N, 'uncommon', 'grave', 'Mezar Çağrısı', 'Grave Call', (u) => skl(v(u, 2, 1), [{ k: 'summon', unit: 'skeleton', n: 2 }], { exhaust: true }));
C('lichForm', N, 'rare', 'skull', 'Lich Formu', 'Lich Form', (u) => pwr(v(u, 3, 2), [SELF('lichForm', 1)]));
C('soulStorm', N, 'rare', 'soul', 'Ruh Fırtınası', 'Soul Storm', (u) => atk(1, 0, [CUSTOM('soulStorm', v(u, 6, 8))], {
  target: 'none',
  desc: u
    ? L('Tüm Ruhlarını harca: her biri rastgele düşmana 8 hasar verir.', 'Spend all Souls: each deals 8 damage to a random enemy.')
    : L('Tüm Ruhlarını harca: her biri rastgele düşmana 6 hasar verir.', 'Spend all Souls: each deals 6 damage to a random enemy.'),
}));
C('deathCoil', N, 'rare', 'drain', 'Ölüm Sarmalı', 'Death Coil', (u) => atk(2, 4, [D(v(u, 14, 18), { fx: 'soul', lifesteal: 1 })], { exhaust: true }));

/* ============================================================= ENGINEER */
const E = 'engineer';
C('wrench', E, 'starter', 'wrench', 'Anahtar Darbesi', 'Wrench Whack', (u) => atk(1, 1, [D(v(u, 6, 9), { fx: 'impact' })]));
C('plating', E, 'starter', 'plate', 'Metal Levha', 'Plating', (u) => skl(1, [B(v(u, 5, 8))]));
C('buildTurret', E, 'starter', 'turret', 'Taret Kur', 'Build Turret', (u) => skl(2, [SUMMON('turret')], { target: 'empty', range: 2 }));
C('throwBomb', E, 'starter', 'bomb', 'Bomba At', 'Throw Bomb', (u) => skl(1, [{ k: 'bomb', n: v(u, 12, 16), radius: 1, timer: 1 }], { target: 'tile', range: 4 }));
C('shockPistol', E, 'common', 'pistol', 'Şok Tabancası', 'Shock Pistol', (u) => atk(1, 4, [D(v(u, 4, 6), { fx: 'lightning' }), S('root', 1)]));
C('landmine', E, 'common', 'mine', 'Kara Mayını', 'Landmine', (u) => skl(0, [TRAP('mine', v(u, 7, 10))], { target: 'empty', range: 3 }));
C('fuelBarrel', E, 'common', 'barrel', 'Yakıt Bidonu', 'Fuel Barrel', (u) => skl(1, [SUMMON(u ? 'barrelUp' : 'barrel')], {
  target: 'empty',
  range: 3,
  note: u
    ? L('Yok edilince çevresine 14 hasar verir.', 'When destroyed, deals 14 damage around it.')
    : L('Yok edilince çevresine 10 hasar verir.', 'When destroyed, deals 10 damage around it.'),
}));
C('magnet', E, 'common', 'magnet', 'Mıknatıs', 'Magnet', (u) => skl(1, [PULL(3), B(v(u, 4, 6))], { target: 'enemy', range: 5 }));
C('rivetGun', E, 'common', 'pistol', 'Perçin Tabancası', 'Rivet Gun', (u) => atk(1, 3, [D(v(u, 3, 4), { times: 2, fx: 'bullet' })]));
C('tinker', E, 'common', 'gear', 'Kurcala', 'Tinker', (u) => skl(0, [B(v(u, 3, 5)), DRAW(1)]));
C('scrapShield', E, 'common', 'plate', 'Hurda Kalkan', 'Scrap Shield', (u) => skl(1, [B(v(u, 6, 9)), BA(v(u, 6, 9))]));
C('steamBlast', E, 'common', 'steam', 'Buhar Püskürtme', 'Steam Blast', (u) => atk(1, 0, [D(v(u, 5, 7), { to: 'adjacent' }), PUSH(2, 'adjacent')], { target: 'none' }));
C('overcharge', E, 'uncommon', 'lightning', 'Aşırı Yükleme', 'Overcharge', (u) => skl(0, [EN(v(u, 2, 3)), ADD('scorch', 1, 'discard')]));
C('repairDrone', E, 'uncommon', 'drone', 'Tamir Dronu', 'Repair Drone', (u) => pwr(1, [SELF('drone', v(u, 3, 4))]));
C('turretUpgrade', E, 'uncommon', 'gear', 'Taret Güçlendirme', 'Overclock', (u) => skl(1, [CUSTOM('allyStrength', v(u, 2, 3))], {
  desc: u ? L('Tüm yardımcıların 3 Güç kazanır.', 'All allies gain 3 Strength.') : L('Tüm yardımcıların 2 Güç kazanır.', 'All allies gain 2 Strength.'),
}));
C('clusterBomb', E, 'uncommon', 'bomb', 'Misket Bombası', 'Cluster Bomb', (u) => skl(2, [{ k: 'bomb', n: v(u, 7, 9), radius: 0, timer: 1, spread: 1 }], { target: 'tile', range: 4 }));
C('detonate', E, 'uncommon', 'detonator', 'Uzaktan Patlat', 'Detonate', (u) => skl(1, [CUSTOM('detonate', v(u, 3, 6)), DRAW(1)], {
  desc: u
    ? L('Tüm bombaları şimdi +6 hasarla patlat. 1 kart çek.', 'Detonate all bombs now with +6 damage. Draw 1 card.')
    : L('Tüm bombaları şimdi +3 hasarla patlat. 1 kart çek.', 'Detonate all bombs now with +3 damage. Draw 1 card.'),
}));
C('rocket', E, 'uncommon', 'rocket', 'Roket', 'Rocket', (u) => atk(2, 6, [D(v(u, 13, 18), { fx: 'explosion' }), PUSH(2)]));
C('teslaCoil', E, 'rare', 'tesla', 'Tesla Bobini', 'Tesla Coil', (u) => skl(2, [SUMMON('tesla')], { target: 'empty', range: 2 }));
C('mechArmor', E, 'rare', 'plate', 'Metal Kaplama', 'Mech Armor', (u) => pwr(2, [SELF('plating', v(u, 4, 6))]));
C('doomEngine', E, 'rare', 'mech', 'Savaş Robotu', 'War Mech', (u) => skl(3, [SUMMON('mech')], { target: 'empty', range: 2, exhaust: true }));

/* ================================================================= MONK */
const M = 'monk';
C('palmStrike', M, 'starter', 'fist', 'Avuç Darbesi', 'Palm Strike', (u) => atk(1, 1, [D(v(u, 6, 9), { fx: 'fist' })]));
C('ironStance', M, 'starter', 'stance', 'Demir Duruş', 'Iron Stance', (u) => skl(1, [B(v(u, 5, 8))]));
C('flyingKick', M, 'starter', 'kick', 'Uçan Tekme', 'Flying Kick', (u) => atk(1, 3, [DASH(2), D(v(u, 5, 8), { fx: 'fist' }), PUSH(2)]));
C('meditate', M, 'starter', 'lotus', 'Meditasyon', 'Meditate', (u) => skl(1, [SELF('ki', v(u, 2, 3)), B(v(u, 3, 4))]));
C('windStep', M, 'common', 'wind', 'Rüzgar Adımı', 'Wind Step', (u) => skl(0, [MP(v(u, 1, 2)), SELF('ki', 1)]));
C('sweepKick', M, 'common', 'kick', 'Süpürme Tekmesi', 'Sweep Kick', (u) => atk(1, 0, [D(v(u, 5, 7), { to: 'adjacent', fx: 'fist' }), PUSH(1, 'adjacent')], { target: 'none' }));
C('tigerClaw', M, 'common', 'claw', 'Kaplan Pençesi', 'Tiger Claw', (u) => atk(1, 1, [D(v(u, 3, 4), { times: 3, fx: 'slash' })]));
C('balance', M, 'common', 'lotus', 'Denge', 'Balance', (u) => skl(1, [B(v(u, 5, 8)), SELF('ki', 1)]));
C('spiritPunch', M, 'common', 'fist', 'Ruh Yumruğu', 'Spirit Punch', (u) => atk(0, 1, [D(v(u, 4, 6), { fx: 'fist' }), IF({ c: 'selfHas', s: 'ki' }, [{ k: 'spend', s: 'ki', n: 1 }, D(5, { fx: 'fist' })])]));
C('counterStance', M, 'common', 'stance', 'Karşı Duruş', 'Counter Stance', (u) => skl(1, [B(v(u, 5, 7)), SELF('counter', v(u, 4, 6))]));
C('deflect', M, 'common', 'stance', 'Savuşturma', 'Deflect', (u) => skl(0, [B(v(u, 4, 6))]));
C('roundhouse', M, 'common', 'kick', 'Döner Tekme', 'Roundhouse', (u) => atk(1, 1, [D(v(u, 7, 10), { fx: 'fist' }), PUSH(3)]));
C('dragonFist', M, 'uncommon', 'dragon', 'Ejder Yumruğu', 'Dragon Fist', (u) => atk(1, 1, [CUSTOM('kiStrike', v(u, 6, 8), v(u, 4, 5))], {
  desc: u
    ? L('Tüm Ki’ni harca: 8 + Ki başına 5 hasar ver.', 'Spend all Ki: deal 8 + 5 per Ki damage.')
    : L('Tüm Ki’ni harca: 6 + Ki başına 4 hasar ver.', 'Spend all Ki: deal 6 + 4 per Ki damage.'),
}));
C('shockwavePalm', M, 'uncommon', 'wave', 'Sarsıcı Avuç', 'Shockwave Palm', (u) => atk(1, 1, [D(v(u, 5, 7), { fx: 'fist' }), PUSH(3, 'target', { stun: true })]));
C('zen', M, 'uncommon', 'lotus', 'Zen', 'Zen', (u) => pwr(v(u, 1, 0), [SELF('zen', 1)]));
C('flow', M, 'uncommon', 'wave', 'Akış', 'Flow', (u) => skl(0, [DRAW(v(u, 2, 3))], { exhaust: true }));
C('serenity', M, 'uncommon', 'lotus', 'Sükunet', 'Serenity', (u) => skl(1, [B(v(u, 6, 9)), CUSTOM('cleanse'), SELF('ki', 1)], {
  desc: u
    ? L('9 blok kazan. Tüm zayıflatmaları kaldır. 1 Ki kazan.', 'Gain 9 Block. Remove all debuffs. Gain 1 Ki.')
    : L('6 blok kazan. Tüm zayıflatmaları kaldır. 1 Ki kazan.', 'Gain 6 Block. Remove all debuffs. Gain 1 Ki.'),
}));
C('innerFire', M, 'uncommon', 'fire', 'İç Ateş', 'Inner Fire', (u) => skl(1, [SELF('strength', v(u, 1, 2)), SELF('ki', 1)], { exhaust: true }));
C('hundredFists', M, 'rare', 'fists', 'Yüz Yumruk', 'Hundred Fists', (u) => atk(2, 1, [CUSTOM('hundredFists', v(u, 2, 3), 5)], {
  desc: u
    ? L('Tüm Ki’ni harca: 3 hasarı (5 + Ki) kez ver.', 'Spend all Ki: deal 3 damage (5 + Ki) times.')
    : L('Tüm Ki’ni harca: 2 hasarı (5 + Ki) kez ver.', 'Spend all Ki: deal 2 damage (5 + Ki) times.'),
}));
C('cycloneKick', M, 'rare', 'whirl', 'Kasırga Tekmesi', 'Cyclone Kick', (u) => atk(2, 0, [D(v(u, 10, 14), { to: 'near', radius: 1, fx: 'fist' }), PUSH(2, 'near', { radius: 1 })], { target: 'none' }));
C('diamondBody', M, 'rare', 'gem', 'Elmas Beden', 'Diamond Body', (u) => pwr(2, [SELF('diamond', v(u, 2, 3))]));

/* ============================================================== NEUTRAL */
const X = 'neutral';
C('quickStep', X, 'common', 'boot', 'Hızlı Adım', 'Quick Step', (u) => skl(0, [MP(v(u, 1, 2)), DRAW(1)]));
C('bandage', X, 'common', 'bandage', 'Sargı Bezi', 'Bandage', (u) => skl(0, [HEAL(v(u, 4, 6))], { exhaust: true }));
C('battlePlan', X, 'common', 'scroll', 'Savaş Planı', 'Battle Plan', (u) => skl(1, [DRAW(v(u, 2, 3))]));
C('punch', X, 'common', 'fist', 'Yumruk', 'Punch', (u) => atk(0, 1, [D(v(u, 4, 6), { fx: 'fist' })]));
C('throwRock', X, 'common', 'rock', 'Taş Fırlat', 'Throw Rock', (u) => atk(0, 3, [D(v(u, 3, 5), { fx: 'rock' })]));
C('stoneWall', X, 'common', 'wall', 'Taş Duvar', 'Stone Wall', (u) => skl(2, [B(v(u, 13, 17))]));
C('trip', X, 'common', 'boot', 'Çelme', 'Trip', (u) => skl(0, [S('vulnerable', v(u, 2, 3))], { target: 'enemy', range: 1 }));
C('acrobatics', X, 'common', 'wind', 'Akrobasi', 'Acrobatics', (u) => skl(1, [MP(2), B(v(u, 4, 6))]));
C('desperation', X, 'uncommon', 'blood', 'Çaresizlik', 'Desperation', (u) => skl(0, [EN(2), { k: 'loseHp', n: v(u, 6, 4) }], { exhaust: true }));
C('heavyBlow', X, 'uncommon', 'hammer', 'Ağır Darbe', 'Heavy Blow', (u) => atk(2, 1, [D(v(u, 15, 20), { fx: 'impact' }), PUSH(1)]));
C('swapPlaces', X, 'uncommon', 'swap', 'Yer Değiştir', 'Swap Places', (u) => skl(0, [{ k: 'swap' }], { target: 'enemy', range: 3, exhaust: !u }));
C('adrenaline', X, 'uncommon', 'lightning', 'Adrenalin', 'Adrenaline', (u) => skl(0, [EN(1), DRAW(v(u, 2, 3))], { exhaust: true }));
C('flash', X, 'uncommon', 'sun', 'Parlama', 'Flash', (u) => skl(1, [S('weak', 1, 'near', { radius: 2 }), S('vulnerable', 1, 'near', { radius: 2 })], { exhaust: !u }));
C('firebomb', X, 'uncommon', 'fireball', 'Ateş Bombası', 'Firebomb', (u) => atk(1, 3, [D(v(u, 6, 9), { to: 'area', radius: 1, fx: 'fire' })], { target: 'tile' }));
C('sharpen', X, 'uncommon', 'whetstone', 'Bileme', 'Sharpen', (u) => pwr(1, [SELF('strength', v(u, 1, 2))]));
C('mastery', X, 'rare', 'star', 'Ustalık', 'Mastery', (u) => skl(v(u, 1, 0), [CUSTOM('upgradeHand')], {
  exhaust: true,
  desc: L('Elindeki tüm kartları bu savaş için geliştir.', 'Upgrade all cards in your hand for this combat.'),
}));
C('timeStop', X, 'rare', 'hourglass', 'Zaman Durdur', 'Time Stop', (u) => skl(v(u, 3, 2), [CUSTOM('stunAll')], {
  exhaust: true,
  desc: L('Tüm düşmanları Sersemlet.', 'Stun all enemies.'),
}));
C('secondWind', X, 'rare', 'heart', 'İkinci Nefes', 'Second Wind', (u) => skl(1, [SELF('regen', v(u, 5, 7))], { exhaust: true }));

/* ============================================================ CURSES */
const K = 'curse';
const dead = (): CardSpec => skl(0, [], { unplayable: true, type: 'curse' });
C('regret', K, 'special', 'curse', 'Pişmanlık', 'Regret', () => ({ ...dead(), desc: L('Oynanamaz. Tur sonunda elindeki her kart için 1 can kaybet.', 'Unplayable. At the end of your turn, lose 1 HP per card in hand.') }), { inHand: 'regret', upgradable: false });
C('doubt', K, 'special', 'curse', 'Şüphe', 'Doubt', () => ({ ...dead(), desc: L('Oynanamaz. Tur sonunda 1 Zayıf al.', 'Unplayable. At the end of your turn, gain 1 Weak.') }), { inHand: 'doubt', upgradable: false });
C('shackles', K, 'special', 'chain', 'Pranga', 'Shackles', () => ({ ...dead(), desc: L('Oynanamaz. Elindeyken 1 hareket kaybet.', 'Unplayable. While in hand, lose 1 movement.') }), { inHand: 'shackles', upgradable: false });
C('burden', K, 'special', 'rock', 'Yük', 'Burden', () => ({ ...dead(), desc: L('Oynanamaz.', 'Unplayable.') }), { upgradable: false });
C('rot', K, 'special', 'drop', 'Çürüme', 'Rot', () => ({ ...dead(), desc: L('Oynanamaz. Tur sonunda 2 hasar al.', 'Unplayable. At the end of your turn, take 2 damage.') }), { inHand: 'decay', upgradable: false });
C('parasite', K, 'special', 'worm', 'Parazit', 'Parasite', () => ({ ...dead(), desc: L('Oynanamaz. Desteden çıkarılırsa 3 maksimum can kaybet.', 'Unplayable. If removed from your deck, lose 3 Max HP.') }), { upgradable: false });

/* ============================================================ STATUS */
const T = 'status';
C('wound', T, 'special', 'blood', 'Yara', 'Wound', () => ({ ...skl(0, [], { unplayable: true, type: 'status' }), desc: L('Oynanamaz.', 'Unplayable.') }), { upgradable: false });
C('daze', T, 'special', 'stars', 'Sersemlik', 'Daze', () => ({ ...skl(0, [], { unplayable: true, ethereal: true, type: 'status' }), desc: L('Oynanamaz. Uçucu.', 'Unplayable. Ethereal.') }), { upgradable: false });
C('scorch', T, 'special', 'fire', 'Kor', 'Ember', () => ({ ...skl(0, [], { unplayable: true, type: 'status' }), desc: L('Oynanamaz. Tur sonunda elindeyse 2 hasar al.', 'Unplayable. If in hand at end of turn, take 2 damage.') }), { inHand: 'scorch', upgradable: false });
C('slime', T, 'special', 'slime', 'Balçık', 'Slime', () => ({ ...skl(1, [], { type: 'status', exhaust: true }), desc: L('Tükenir.', 'Exhaust.') }), { upgradable: false });

/* ============================================================== registry */

export const CARDS: Record<string, CardDef> = Object.fromEntries(ALL.map((c) => [c.id, c]));
export const CARD_LIST: CardDef[] = ALL;

const specCache = new Map<string, CardSpec>();
export function cardSpec(id: string, up: boolean): CardSpec {
  const key = id + (up ? '+' : '');
  let s = specCache.get(key);
  if (!s) {
    const def = CARDS[id];
    if (!def) throw new Error('Unknown card ' + id);
    s = def.spec(up && def.upgradable !== false);
    specCache.set(key, s);
  }
  return s;
}

export function canUpgrade(id: string, up: boolean): boolean {
  const d = CARDS[id];
  return !up && !!d && d.upgradable !== false && d.pool !== 'curse' && d.pool !== 'status';
}

export function classCards(pool: CardPool, rarity?: Rarity): CardDef[] {
  return ALL.filter((c) => c.pool === pool && (rarity ? c.rarity === rarity : c.rarity !== 'starter' && c.rarity !== 'special'));
}
