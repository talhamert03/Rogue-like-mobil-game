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
C('arcaneBolt', Z, 'starter', 'bolt', 'Büyü Oku', 'Arcane Bolt', (u) => atk(1, 4, [D(v(u, 6, 9), { fx: 'arcane' })]));
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
C('toxicBlade', A, 'starter', 'poisonDagger', 'Zehirli Bıçak', 'Toxic Blade', (u) => atk(1, 1, [D(v(u, 3, 4)), S('poison', v(u, 4, 6))]));
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
C('shadowBolt', N, 'starter', 'shadowBolt', 'Gölge Oku', 'Shadow Bolt', (u) => atk(1, 3, [D(v(u, 6, 9), { fx: 'shadow' })]));
C('boneArmor', N, 'starter', 'bone', 'Kemik Zırh', 'Bone Armor', (u) => skl(1, [B(v(u, 5, 8))]));
C('raiseSkeleton', N, 'starter', 'skull', 'İskelet Dirilt', 'Raise Skeleton', (u) => skl(1, [SUMMON('skeleton')], { target: 'empty', range: 2 }));
C('drainLife', N, 'starter', 'drain', 'Can Emme', 'Drain Life', (u) => atk(1, 3, [D(v(u, 7, 10), { fx: 'soul', lifesteal: 0.5 })]));
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
C('buildTurret', E, 'starter', 'turret', 'Taret Kur', 'Build Turret', (u) => skl(v(u, 2, 1), [SUMMON('turret')], { target: 'empty', range: 2 }));
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
C('flyingKick', M, 'starter', 'kick', 'Uçan Tekme', 'Flying Kick', (u) => atk(1, 3, [DASH(2), D(v(u, 6, 9), { fx: 'fist' }), PUSH(1), SELF('ki', 1)]));
C('meditate', M, 'common', 'lotus', 'Meditasyon', 'Meditate', (u) => skl(1, [SELF('ki', v(u, 2, 3)), B(v(u, 3, 4))]));
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

/* =============================================================== SHAMAN */
const SH = 'shaman';
const totemNote = (u: boolean, hp: number, up: number, tr: string, en: string) =>
  L(`${tr} (${u ? hp + up : hp} can). Her tur titreşir.`, `${en} (${u ? hp + up : hp} HP). Pulses every turn.`);
C('lightningBolt', SH, 'starter', 'lightning', 'Yıldırım Oku', 'Lightning Bolt', (u) => atk(1, 3, [D(v(u, 6, 9), { fx: 'lightning' })]));
C('earthShield', SH, 'starter', 'shield', 'Toprak Kalkanı', 'Earth Shield', (u) => skl(1, [B(v(u, 5, 8))]));
C('fireTotem', SH, 'starter', 'totem', 'Ateş Totemi', 'Fire Totem', (u) => skl(1, [SUMMON('fireTotem')], {
  target: 'empty',
  range: 2,
  desc: totemNote(u, 7, 4, 'Ateş Totemi dik: 2 kare içindeki düşmanlara 3 hasar ve 1 Yanık', 'Plant a Fire Totem: 3 damage and 1 Burn to enemies within 2'),
}));
C('flameShock', SH, 'starter', 'fire', 'Alev Şoku', 'Flame Shock', (u) => atk(1, 3, [D(v(u, 4, 6), { fx: 'fire' }), S('burn', v(u, 2, 3))]));
C('healingTotem', SH, 'common', 'totem', 'Şifa Totemi', 'Healing Totem', (u) => skl(1, [SUMMON('healTotem')], {
  target: 'empty',
  range: 2,
  desc: totemNote(u, 7, 4, 'Şifa Totemi dik: seni 3, yardımcılarını 2 iyileştirir', 'Plant a Healing Totem: heals you 3 and allies 2'),
}));
C('stormTotem', SH, 'common', 'totem', 'Fırtına Totemi', 'Storm Totem', (u) => skl(v(u, 2, 1), [SUMMON('stormTotem')], {
  target: 'empty',
  range: 2,
  desc: totemNote(false, 7, 0, 'Fırtına Totemi dik: rastgele düşmana 5 hasar', 'Plant a Storm Totem: 5 damage to a random enemy'),
}));
C('earthTotem', SH, 'common', 'totem', 'Toprak Totemi', 'Earth Totem', (u) => skl(1, [SUMMON('earthTotem')], {
  target: 'empty',
  range: 2,
  desc: totemNote(u, 14, 6, 'Toprak Totemi dik: sana 4 blok verir ve düşmanın yolunu keser', 'Plant an Earth Totem: gives you 4 Block and blocks the path'),
}));
C('frostShock', SH, 'common', 'ice', 'Ayaz Şoku', 'Frost Shock', (u) => atk(1, 3, [D(v(u, 5, 7), { fx: 'ice' }), S('root', 1)]));
C('stormstrike', SH, 'common', 'lightning', 'Fırtına Vuruşu', 'Stormstrike', (u) => atk(1, 1, [D(v(u, 4, 5), { times: 2, fx: 'lightning' })]));
C('spiritWalk', SH, 'common', 'wind', 'Ruh Yürüyüşü', 'Spirit Walk', (u) => skl(0, [{ k: 'moveTo' }, B(v(u, 3, 5))], { target: 'empty', range: 3 }));
C('ancestralGuidance', SH, 'common', 'book', 'Ata Rehberliği', 'Ancestral Guidance', (u) => skl(1, [DRAW(v(u, 2, 3)), HEAL(v(u, 2, 3))]));
C('thunderclap', SH, 'common', 'wave', 'Gök Gürültüsü', 'Thunderclap', (u) => atk(1, 0, [D(v(u, 5, 7), { to: 'near', radius: 1, fx: 'lightning' }), PUSH(1, 'near', { radius: 1 })], { target: 'none' }));
C('totemicCall', SH, 'uncommon', 'totem', 'Totem Çağrısı', 'Totemic Call', (u) => skl(v(u, 1, 0), [CUSTOM('totemPulse'), DRAW(1)], {
  desc: L('Tüm totemlerin hemen titreşir. 1 kart çek.', 'All your totems pulse now. Draw 1 card.'),
}));
C('chainHeal', SH, 'uncommon', 'heart', 'Şifa Zinciri', 'Chain Heal', (u) => skl(1, [HEAL(v(u, 4, 6)), { k: 'heal', n: v(u, 4, 6), to: 'allies' }], { exhaust: true }));
C('lightningShield', SH, 'uncommon', 'lightning', 'Yıldırım Kalkanı', 'Lightning Shield', (u) => skl(1, [B(v(u, 6, 9)), SELF('counter', v(u, 4, 5))]));
C('earthquake', SH, 'uncommon', 'explosion', 'Deprem', 'Earthquake', (u) => atk(2, 0, [D(v(u, 7, 10), { to: 'all', fx: 'slam' }), S('root', 1, 'all')], { target: 'none' }));
C('elementalFury', SH, 'uncommon', 'totem', 'Element Öfkesi', 'Elemental Fury', (u) => pwr(v(u, 2, 1), [SELF('totemEcho', 1)]));
C('ancestralSpirit', SH, 'uncommon', 'soul', 'Ata Ruhu', 'Ancestral Spirit', (u) => skl(1, [SELF('regen', v(u, 4, 6)), DRAW(1)]));
C('warDrums', SH, 'rare', 'drum', 'Savaş Davulları', 'War Drums', (u) => skl(v(u, 2, 1), [SELF('strength', 2), CUSTOM('allyStrength', 2)], {
  exhaust: true,
  desc: L('Sen ve tüm yardımcıların 2 Güç kazanır. Tükenir.', 'You and all allies gain 2 Strength. Exhaust.'),
}));
C('stormCaller', SH, 'rare', 'lightning', 'Fırtına Çağıran', 'Storm Caller', (u) => pwr(v(u, 3, 2), [SELF('stormcall', 1)]));
C('spiritLink', SH, 'rare', 'totem', 'Ruh Bağı', 'Spirit Link', (u) => skl(v(u, 3, 2), [SUMMON('fireTotem'), SUMMON('healTotem'), SUMMON('stormTotem')], {
  exhaust: true,
  desc: L('Ateş, Şifa ve Fırtına totemlerini birlikte dik. Tükenir.', 'Plant a Fire, a Healing and a Storm Totem at once. Exhaust.'),
}));

/* ================================================================ DRUID */
const DR = 'druid';
C('claw', DR, 'starter', 'claw', 'Pençe', 'Rend', (u) => atk(1, 1, [D(v(u, 6, 9), { fx: 'slash' })]));
C('barkskin', DR, 'starter', 'leaf', 'Ağaç Kabuğu', 'Barkskin', (u) => skl(1, [B(v(u, 5, 8))]));
C('bearForm', DR, 'starter', 'bear', 'Ayı Formu', 'Bear Form', (u) => skl(1, [CUSTOM('shiftBear', v(u, 3, 5)), B(v(u, 3, 5))], {
  desc: u
    ? L('<span class="kw">Ayı Formu</span>na gir: tur başında 5 blok kazan. 5 blok kazan.', 'Enter <span class="kw">Bear Form</span>: gain 5 Block each turn. Gain 5 Block.')
    : L('<span class="kw">Ayı Formu</span>na gir: tur başında 3 blok kazan. 3 blok kazan.', 'Enter <span class="kw">Bear Form</span>: gain 3 Block each turn. Gain 3 Block.'),
}));
C('entanglingRoots', DR, 'starter', 'leaf', 'Dolanan Kökler', 'Entangling Roots', (u) => atk(1, 4, [D(v(u, 3, 5), { fx: 'vine' }), S('root', v(u, 1, 2))]));
C('wolfForm', DR, 'common', 'wolf', 'Kurt Formu', 'Wolf Form', (u) => skl(1, [CUSTOM('shiftWolf'), MP(1), ...(u ? [DRAW(1)] : [])], {
  desc: u
    ? L('<span class="kw">Kurt Formu</span>na gir: her tur +1 hareket, saldırılar +2 hasar. 1 hareket kazan. 1 kart çek.', 'Enter <span class="kw">Wolf Form</span>: +1 movement each turn, attacks +2 damage. Gain 1 movement. Draw 1.')
    : L('<span class="kw">Kurt Formu</span>na gir: her tur +1 hareket, saldırılar +2 hasar. 1 hareket kazan.', 'Enter <span class="kw">Wolf Form</span>: +1 movement each turn, attacks +2 damage. Gain 1 movement.'),
}));
C('owlForm', DR, 'common', 'eye', 'Baykuş Formu', 'Owl Form', (u) => skl(v(u, 1, 0), [CUSTOM('shiftOwl'), DRAW(1)], {
  desc: L('<span class="kw">Baykuş Formu</span>na gir: her tur 1 fazla kart çek. 1 kart çek.', 'Enter <span class="kw">Owl Form</span>: draw 1 extra card each turn. Draw 1 card.'),
}));
C('maul', DR, 'common', 'claw', 'Parçalama', 'Maul', (u) => atk(1, 1, [D(v(u, 8, 11), { fx: 'slash' }), IF({ c: 'selfHas', s: 'bearForm' }, [B(v(u, 4, 6))])]));
C('pounce', DR, 'common', 'wolf', 'Atılma', 'Pounce', (u) => atk(1, 3, [DASH(2), D(v(u, 5, 7), { fx: 'slash' }), IF({ c: 'selfHas', s: 'wolfForm' }, [DRAW(1)])]));
C('thornVolley', DR, 'common', 'spikes', 'Diken Yağmuru', 'Thorn Volley', (u) => atk(1, 4, [D(v(u, 3, 4), { times: 2, fx: 'knife' })]));
C('rejuvenate', DR, 'common', 'heart', 'Canlanma', 'Rejuvenate', (u) => skl(1, [SELF('regen', v(u, 3, 5)), B(3)]));
C('vineLash', DR, 'common', 'leaf', 'Sarmaşık Kamçısı', 'Vine Lash', (u) => atk(1, 4, [PULL(2), D(v(u, 5, 7), { fx: 'vine' })]));
C('swipe', DR, 'common', 'claw', 'Savuruş', 'Swipe', (u) => atk(1, 0, [D(v(u, 5, 7), { to: 'adjacent', fx: 'slash' })], { target: 'none' }));
C('summonTreant', DR, 'uncommon', 'tree', 'Ağaç Muhafız', 'Treant', (u) => skl(v(u, 2, 1), [SUMMON('treant')], { target: 'empty', range: 2 }));
C('moonfire', DR, 'uncommon', 'moon', 'Ay Ateşi', 'Moonfire', (u) => atk(1, 5, [D(v(u, 7, 10), { fx: 'holy' }), IF({ c: 'selfHas', s: 'owlForm' }, [DRAW(1)])]));
C('naturesGrasp', DR, 'uncommon', 'leaf', 'Doğanın Pençesi', "Nature's Grasp", (u) => skl(1, [S('root', 1, 'all'), SELF('thorns', v(u, 2, 3))]));
C('feralInstinct', DR, 'uncommon', 'claw', 'Yabani İçgüdü', 'Feral Instinct', (u) => pwr(v(u, 1, 0), [SELF('feral', 1)]));
C('thickHide', DR, 'uncommon', 'bear', 'Kalın Post', 'Thick Hide', (u) => skl(2, [B(v(u, 12, 16)), IF({ c: 'selfHas', s: 'bearForm' }, [SELF('retainBlock', 1)])]));
C('wildGrowth', DR, 'uncommon', 'leaf', 'Yabani Büyüme', 'Wild Growth', (u) => skl(1, [HEAL(3), { k: 'heal', n: 3, to: 'allies' }, SELF('regen', v(u, 2, 3))]));
C('ancientProtector', DR, 'rare', 'tree', 'Kadim Koruyucu', 'Ancient Protector', (u) => skl(v(u, 3, 2), [SUMMON('ancientTreant')], { target: 'empty', range: 2, exhaust: true }));
C('primalFury', DR, 'rare', 'claw', 'İlkel Öfke', 'Primal Fury', (u) => pwr(v(u, 2, 1), [SELF('primal', 1)]));
C('hurricane', DR, 'rare', 'whirl', 'Kasırga', 'Hurricane', (u) => atk(2, 0, [D(v(u, 3, 4), { to: 'all', times: 3, fx: 'wind' })], { target: 'none' }));

/* ============================================================ BARBARIAN */
const BRB = 'barbarian';
C('axeSwing', BRB, 'starter', 'axe', 'Balta Savuruşu', 'Axe Swing', (u) => atk(1, 1, [D(v(u, 7, 10), { fx: 'slash' }), SELF('fury', 1)]));
C('hideArmor', BRB, 'starter', 'shield', 'Post Zırh', 'Hide Armor', (u) => skl(1, [B(v(u, 6, 9))]));
C('leap', BRB, 'starter', 'boot', 'Sıçrayış', 'Leap', (u) => atk(1, 3, [{ k: 'moveTo' }, D(v(u, 7, 9), { to: 'near', radius: 1, fx: 'slam' }), SELF('fury', 1)], { target: 'empty', range: 3 }));
C('rampage', BRB, 'starter', 'axe', 'Taşkınlık', 'Rampage', (u) => atk(1, 1, [CUSTOM('furyStrike', v(u, 6, 8), v(u, 4, 5))], {
  desc: u
    ? L('Tüm Öfkeni harca: 8 + Öfke başına 5 hasar ver.', 'Spend all Fury: deal 8 + 5 per Fury damage.')
    : L('Tüm Öfkeni harca: 6 + Öfke başına 4 hasar ver.', 'Spend all Fury: deal 6 + 4 per Fury damage.'),
}));
C('recklessSwing', BRB, 'common', 'axe', 'Pervasız Vuruş', 'Reckless Swing', (u) => atk(1, 1, [{ k: 'loseHp', n: 2 }, D(v(u, 12, 16), { fx: 'impact' }), SELF('fury', 1)]));
C('warStomp', BRB, 'common', 'quake', 'Savaş Tepinmesi', 'War Stomp', (u) => atk(1, 0, [D(v(u, 4, 6), { to: 'near', radius: 1, fx: 'slam' }), PUSH(1, 'near', { radius: 1 }), SELF('fury', 1)], { target: 'none' }));
C('bellow', BRB, 'common', 'roar', 'Böğürme', 'Bellow', (u) => skl(1, [SELF('fury', v(u, 3, 4)), B(3)]));
C('doubleChop', BRB, 'common', 'axe', 'Çifte Balta', 'Double Chop', (u) => atk(1, 1, [D(v(u, 4, 5), { times: 2, fx: 'slash' }), SELF('fury', 1)]));
C('brace', BRB, 'common', 'shield', 'Diren', 'Brace', (u) => skl(1, [B(v(u, 6, 9)), SELF('fury', 1)]));
C('hurlAxe', BRB, 'common', 'axe', 'Balta Fırlat', 'Hurl Axe', (u) => atk(1, 4, [D(v(u, 7, 10), { fx: 'axe' })]));
C('bloodScent', BRB, 'common', 'blood', 'Kan Kokusu', 'Blood Scent', (u) => skl(1, [DRAW(v(u, 2, 3)), SELF('fury', 1)]));
C('headbutt', BRB, 'common', 'fist', 'Kafa Atma', 'Headbutt', (u) => atk(1, 1, [D(v(u, 6, 8), { fx: 'impact' }), PUSH(1, 'target', { stun: true })]));
C('unstoppable', BRB, 'uncommon', 'fang', 'Durdurulamaz', 'Unstoppable', (u) => pwr(v(u, 1, 0), [SELF('furyGen', 1)]));
C('berserk', BRB, 'uncommon', 'blood', 'Çılgınlık', 'Berserk', (u) => skl(0, [{ k: 'loseHp', n: v(u, 4, 3) }, EN(2), SELF('fury', 2)], { exhaust: true }));
C('whirlingAxes', BRB, 'uncommon', 'whirl', 'Dönen Baltalar', 'Whirling Axes', (u) => atk(2, 0, [D(v(u, 6, 8), { to: 'near', radius: 2, times: 2, fx: 'slash' })], { target: 'none' }));
C('bloodthirst', BRB, 'uncommon', 'fang', 'Kan Susuzluğu', 'Bloodthirst', (u) => atk(1, 1, [D(v(u, 8, 11), { fx: 'slash', lifesteal: 0.5 })]));
C('crushingLeap', BRB, 'uncommon', 'boot', 'Ezici Sıçrayış', 'Crushing Leap', (u) => atk(2, 4, [{ k: 'moveTo' }, D(v(u, 10, 14), { to: 'near', radius: 1, fx: 'slam' }), PUSH(1, 'near', { radius: 1 })], { target: 'empty', range: 4 }));
C('scarsOfBattle', BRB, 'uncommon', 'blood', 'Yaraların Gücü', 'Scars of Battle', (u) => skl(1, [CUSTOM('furyFromMissing', 0), B(v(u, 5, 8))], {
  desc: u
    ? L('Her 10 eksik can için 1 Öfke kazan. 8 blok kazan.', 'Gain 1 Fury per 10 missing HP. Gain 8 Block.')
    : L('Her 10 eksik can için 1 Öfke kazan. 5 blok kazan.', 'Gain 1 Fury per 10 missing HP. Gain 5 Block.'),
}));
C('unleashedFury', BRB, 'rare', 'axe', 'Serbest Öfke', 'Unleashed Fury', (u) => atk(2, 1, [CUSTOM('furyStrike', v(u, 10, 14), v(u, 5, 6))], {
  desc: u
    ? L('Tüm Öfkeni harca: 14 + Öfke başına 6 hasar ver.', 'Spend all Fury: deal 14 + 6 per Fury damage.')
    : L('Tüm Öfkeni harca: 10 + Öfke başına 5 hasar ver.', 'Spend all Fury: deal 10 + 5 per Fury damage.'),
}));
C('warlordsRoar', BRB, 'rare', 'roar', 'Savaş Beyi Kükremesi', "Warlord's Roar", (u) => skl(1, [SELF('strength', v(u, 2, 3)), SELF('fury', 3)], { exhaust: true }));
C('titanicSlam', BRB, 'rare', 'hammer', 'Dev Çarpması', 'Titanic Slam', (u) => atk(v(u, 3, 2), 2, [D(18, { to: 'area', radius: 1, fx: 'slam' }), PUSH(2, 'area', { radius: 1 })], { target: 'tile' }));

/* =============================================================== PIRATE */
const PI = 'pirate';
C('cutlass', PI, 'starter', 'sword', 'Pala', 'Cutlass', (u) => atk(1, 1, [D(v(u, 6, 9), { fx: 'slash' })]));
C('barrelCover', PI, 'starter', 'barrel', 'Fıçı Siperi', 'Barrel Cover', (u) => skl(1, [B(v(u, 5, 8))]));
C('flintlock', PI, 'starter', 'pistol', 'Çakmaklı Tabanca', 'Flintlock', (u) => atk(1, 4, [D(v(u, 6, 9), { fx: 'bullet' })]));
C('plunder', PI, 'starter', 'coin', 'Yağma', 'Plunder', (u) => atk(1, 1, [D(v(u, 4, 6), { fx: 'slash' }), CUSTOM('gold', v(u, 8, 12))], {
  note: u ? L('12 altın kazan.', 'Gain 12 gold.') : L('8 altın kazan.', 'Gain 8 gold.'),
}));
C('grapeshot', PI, 'common', 'explosion', 'Saçma Atışı', 'Grapeshot', (u) => atk(1, 0, [D(v(u, 5, 7), { to: 'line', len: 3, fx: 'bullet' })], { target: 'none' }));
C('grog', PI, 'common', 'bottle', 'Grog', 'Grog', (u) => skl(0, [SELF('strength', 1), ...(u ? [] : [SELF('weak', 1)]), HEAL(2)], { exhaust: true }));
C('boardingHook', PI, 'common', 'chain', 'Rampa Kancası', 'Boarding Hook', (u) => atk(1, 4, [PULL(3), D(v(u, 4, 6))]));
C('dirtyFighting', PI, 'common', 'fist', 'Kirli Dövüş', 'Dirty Fighting', (u) => atk(0, 1, [D(v(u, 3, 5)), S('weak', 1)]));
C('swashbuckle', PI, 'common', 'sword', 'Kılıç Oyunu', 'Swashbuckle', (u) => atk(1, 1, [D(v(u, 5, 7), { fx: 'slash' }), MP(1), DRAW(1)]));
C('powderKeg', PI, 'common', 'barrel', 'Barut Fıçısı', 'Powder Keg', (u) => skl(1, [SUMMON(u ? 'barrelUp' : 'barrel')], {
  target: 'empty',
  range: 3,
  note: u ? L('Yok edilince çevresine 14 hasar verir.', 'When destroyed, deals 14 damage around it.') : L('Yok edilince çevresine 10 hasar verir.', 'When destroyed, deals 10 damage around it.'),
}));
C('treasureMap', PI, 'common', 'map', 'Hazine Haritası', 'Treasure Map', (u) => skl(1, [DRAW(v(u, 2, 3)), CUSTOM('gold', 5)], { note: L('5 altın kazan.', 'Gain 5 gold.') }));
C('parry', PI, 'common', 'sword', 'Karşıla', 'Parry', (u) => skl(1, [B(v(u, 5, 8)), SELF('counter', v(u, 3, 4))]));
C('goldenBullet', PI, 'uncommon', 'coin', 'Altın Kurşun', 'Golden Bullet', (u) => atk(1, 5, [CUSTOM('goldShot', v(u, 6, 9))], {
  desc: u
    ? L('9 hasar ver, her 25 altının için +1 (en fazla +20).', 'Deal 9 damage, +1 per 25 gold you have (max +20).')
    : L('6 hasar ver, her 25 altının için +1 (en fazla +20).', 'Deal 6 damage, +1 per 25 gold you have (max +20).'),
}));
C('bribe', PI, 'uncommon', 'coin', 'Rüşvet', 'Bribe', (u) => skl(1, [S('stun', 1)], { target: 'enemy', range: 7, goldCost: v(u, 30, 20), exhaust: true }));
C('broadsideVolley', PI, 'uncommon', 'cannon', 'Top Ateşi', 'Cannon Fire', (u) => atk(2, 6, [D(v(u, 9, 12), { to: 'area', radius: 1, fx: 'explosion' })], { target: 'tile' }));
C('parrotFriend', PI, 'uncommon', 'parrot', 'Papağan Dostu', 'Parrot Companion', (u) => skl(1, [SUMMON('parrot')], { target: 'empty', range: 2 }));
C('seaLegs', PI, 'uncommon', 'anchor', 'Deniz Bacakları', 'Sea Legs', (u) => pwr(v(u, 1, 0), [SELF('haste', 1)]));
C('doubleBarrel', PI, 'uncommon', 'pistol', 'Çift Namlu', 'Double Barrel', (u) => atk(2, 3, [D(v(u, 8, 10), { times: 2, fx: 'bullet' })]));
C('captainsHoard', PI, 'rare', 'chest', 'Kaptanın Hazinesi', "Captain's Hoard", (u) => pwr(v(u, 2, 1), [SELF('hoard', 10)]));
C('broadside', PI, 'rare', 'cannon', 'Borda Ateşi', 'Broadside', (u) => atk(v(u, 3, 2), 0, [D(12, { to: 'all', fx: 'explosion' })], { target: 'none' }));
C('walkThePlank', PI, 'rare', 'anchor', 'Tahtaya Yürüt', 'Walk the Plank', (u) => atk(1, 1, [D(v(u, 6, 9)), PUSH(4, 'target', { stun: true })]));

/* =========================================================== RUNEMASTER */
const RU = 'runemaster';
C('runeBolt', RU, 'starter', 'rune', 'Rün Oku', 'Rune Bolt', (u) => atk(1, 4, [D(v(u, 5, 8), { fx: 'arcane' })]));
C('runeWard', RU, 'starter', 'rune', 'Rün Kalkanı', 'Rune Ward', (u) => skl(1, [B(v(u, 5, 8))]));
C('fireRune', RU, 'starter', 'rune', 'Ateş Rünü', 'Fire Rune', (u) => skl(v(u, 1, 0), [SELF('runeFire', 1), DRAW(1)]), { tint: '#ff8a2a' });
C('frostRune', RU, 'starter', 'rune', 'Buz Rünü', 'Frost Rune', (u) => skl(1, [SELF('runeFrost', 1), B(v(u, 3, 6))]), { tint: '#8fe3ff' });
C('stormRune', RU, 'common', 'rune', 'Fırtına Rünü', 'Storm Rune', (u) => skl(v(u, 1, 0), [SELF('runeStorm', 1), DRAW(1)]), { tint: '#ffe066' });
C('glyphStrike', RU, 'common', 'rune', 'Glif Vuruşu', 'Glyph Strike', (u) => atk(1, 1, [D({ b: v(u, 4, 6), per: 'runes', m: 2 }, { fx: 'arcane' })]));
C('runicShield', RU, 'common', 'shield', 'Rünlü Siper', 'Runic Bulwark', (u) => skl(1, [B({ b: v(u, 4, 7), per: 'runes', m: 2 })]));
C('etch', RU, 'common', 'rune', 'Kazıma', 'Etch', (u) => skl(0, [CUSTOM('randomRune', v(u, 1, 2))], {
  desc: u ? L('2 rastgele rün kazan.', 'Gain 2 random runes.') : L('1 rastgele rün kazan.', 'Gain 1 random rune.'),
}));
C('runeFlow', RU, 'common', 'book', 'Rün Akışı', 'Rune Flow', (u) => skl(1, [DRAW(v(u, 2, 3))]));
C('runeSpark', RU, 'common', 'spark', 'Rün Kıvılcımı', 'Rune Spark', (u) => atk(0, 3, [D(v(u, 3, 5), { fx: 'lightning' }), IF({ c: 'selfHas', s: 'runeStorm' }, [D(3, { fx: 'lightning' })])]));
C('sigilBlast', RU, 'common', 'explosion', 'Mühür Patlaması', 'Sigil Blast', (u) => atk(1, 4, [D(v(u, 5, 7), { to: 'area', radius: 1, fx: 'arcane' })], { target: 'tile' }));
C('earthGlyph', RU, 'common', 'rune', 'Toprak Glifi', 'Earth Glyph', (u) => skl(1, [B(v(u, 6, 9)), S('root', 1, 'adjacent')]));
C('invokeRunes', RU, 'uncommon', 'rune', 'Rün Çağrısı', 'Invoke Runes', (u) => atk(1, 4, [CUSTOM('invoke', v(u, 5, 7))], {
  desc: u ? L('Tüm rünlerini harca: rün başına 7 hasar ver.', 'Spend all runes: deal 7 damage per rune.') : L('Tüm rünlerini harca: rün başına 5 hasar ver.', 'Spend all runes: deal 5 damage per rune.'),
}));
C('runicMastery', RU, 'uncommon', 'rune', 'Rün Ustalığı', 'Runic Mastery', (u) => pwr(v(u, 2, 1), [SELF('runeAmp', 1)]));
C('overload', RU, 'uncommon', 'lightning', 'Aşırı Yük', 'Overload', (u) => skl(v(u, 1, 0), [CUSTOM('allRunes')], {
  exhaust: true,
  desc: L('Her türden 1 rün kazan. Tükenir.', 'Gain 1 rune of each type. Exhaust.'),
}));
C('chainSigil', RU, 'uncommon', 'chain', 'Zincir Mühür', 'Chain Sigil', (u) => atk(1, 4, [D(v(u, 6, 8), { fx: 'lightning' }), CUSTOM('chain', v(u, 6, 8))], {
  desc: u
    ? L('Hedefe ve ona bitişik düşman zincirine 8 hasar ver.', 'Deal 8 damage to the target and every enemy chained next to it.')
    : L('Hedefe ve ona bitişik düşman zincirine 6 hasar ver.', 'Deal 6 damage to the target and every enemy chained next to it.'),
}));
C('frostSeal', RU, 'uncommon', 'ice', 'Ayaz Mührü', 'Frost Seal', (u) => skl(1, [S('root', 2), S('weak', 1), IF({ c: 'selfHas', s: 'runeFrost' }, [S('vulnerable', v(u, 1, 2))])], { target: 'enemy', range: 5 }));
C('stormCrown', RU, 'uncommon', 'crown', 'Fırtına Tacı', 'Storm Crown', (u) => atk(2, 0, [D(v(u, 5, 7), { to: 'all', fx: 'lightning' }), SELF('runeStorm', 1)], { target: 'none' }));
C('worldRune', RU, 'rare', 'rune', 'Dünya Rünü', 'World Rune', (u) => pwr(v(u, 3, 2), [SELF('runeGen', 1)]));
C('runeDetonation', RU, 'rare', 'explosion', 'Rün İnfilakı', 'Rune Detonation', (u) => atk(2, 0, [CUSTOM('invokeAll', v(u, 6, 8))], {
  target: 'none',
  desc: u
    ? L('Tüm rünlerini harca: tüm düşmanlara rün başına 8 hasar ver.', 'Spend all runes: deal 8 damage per rune to ALL enemies.')
    : L('Tüm rünlerini harca: tüm düşmanlara rün başına 6 hasar ver.', 'Spend all runes: deal 6 damage per rune to ALL enemies.'),
}));
C('deepCarving', RU, 'rare', 'rune', 'Derin Oyma', 'Deep Carving', (u) => pwr(v(u, 1, 0), [SELF('runeCap', 2), CUSTOM('allRunes')], {
  desc: L('Her rünün üst sınırı 2 artar. Her türden 1 rün kazan.', 'Each rune type can hold 2 more. Gain 1 rune of each type.'),
}));

/* =============================================================== WARDEN */
const WA = 'warden';
C('spearThrust', WA, 'starter', 'spear', 'Mızrak Dürtmesi', 'Spear Thrust', (u) => atk(1, 2, [D(v(u, 7, 10), { fx: 'slash' })]));
C('towerShield', WA, 'starter', 'shield', 'Kule Kalkanı', 'Tower Shield', (u) => skl(1, [B(v(u, 6, 9))]));
C('chainPull', WA, 'starter', 'chain', 'Zincir', 'Chain Pull', (u) => atk(1, 4, [PULL(3), D(v(u, 5, 7)), S('weak', 1)]));
C('shieldToss', WA, 'starter', 'shield', 'Kalkan Fırlat', 'Shield Toss', (u) => atk(1, 3, [D(v(u, 6, 8), { fx: 'rock' }), B(v(u, 5, 7))]));
C('standGuard', WA, 'common', 'spear', 'Nöbet Tut', 'Stand Guard', (u) => skl(1, [B(v(u, 6, 9)), SELF('vigil', 1)]));
C('spearSweep', WA, 'common', 'spear', 'Mızrak Süpürmesi', 'Spear Sweep', (u) => atk(1, 0, [D(v(u, 5, 7), { to: 'near', radius: 2, fx: 'slash' })], { target: 'none' }));
C('holdTheLine', WA, 'common', 'wall', 'Hattı Koru', 'Hold the Line', (u) => skl(1, [B(v(u, 5, 7)), SELF('retainBlock', 1)]));
C('impale', WA, 'common', 'spear', 'Şişle', 'Impale', (u) => atk(1, 2, [D(v(u, 5, 7), { fx: 'slash' }), S('root', 1)]));
C('provoke', WA, 'common', 'eye', 'Kışkırt', 'Provoke', (u) => skl(0, [PULL(2), S('weak', 1)], { target: 'enemy', range: 5 }));
C('bulwarkBash', WA, 'common', 'shield', 'Siper Darbesi', 'Bulwark Bash', (u) => atk(1, 1, [D(v(u, 5, 7), { fx: 'impact' }), PUSH(2), B(3)]));
C('watchfulEye', WA, 'common', 'eye', 'Gözcü Bakışı', 'Watchful Eye', (u) => skl(1, [DRAW(2), B(v(u, 3, 5))]));
C('fortify', WA, 'common', 'wall', 'Tahkim', 'Fortify', (u) => skl(2, [B(v(u, 12, 16))]));
C('vigilance', WA, 'uncommon', 'spear', 'Uyanıklık', 'Vigilance', (u) => pwr(1, [SELF('vigil', v(u, 2, 3))]));
C('spikedShield', WA, 'uncommon', 'spikes', 'Dikenli Kalkan', 'Spiked Shield', (u) => pwr(1, [SELF('thorns', v(u, 2, 3)), SELF('vigil', 1)]));
C('zoneOfControl', WA, 'uncommon', 'chain', 'Kontrol Bölgesi', 'Zone of Control', (u) => skl(1, [S('root', 1, 'near', { radius: 2 }), B(v(u, 4, 6))]));
C('spearWall', WA, 'uncommon', 'spear', 'Mızrak Duvarı', 'Spear Wall', (u) => atk(2, 3, [D(v(u, 9, 12), { to: 'line', len: 3, fx: 'slash' }), PUSH(1, 'line')]));
C('reassurance', WA, 'uncommon', 'heart', 'Güvence', 'Reassurance', (u) => skl(1, [HEAL(v(u, 4, 6)), B(4)], { exhaust: true }));
C('guardianSpirit', WA, 'uncommon', 'soul', 'Koruyucu Ruh', 'Guardian Spirit', (u) => skl(1, [SELF('dodge', 1), B(v(u, 5, 7))]));
C('unbreakableWall', WA, 'rare', 'wall', 'Kırılmaz Sur', 'Unbreakable Wall', (u) => pwr(v(u, 3, 2), [SELF('bastion', 1)]));
C('judgmentSpear', WA, 'rare', 'spear', 'Hüküm Mızrağı', 'Spear of Judgment', (u) => atk(2, 3, [D({ b: v(u, 8, 12), per: 'block', m: 1 }, { fx: 'holy' })]));
C('wardensVow', WA, 'rare', 'spear', 'Muhafız Yemini', "Warden's Vow", (u) => skl(1, [SELF('vigil', v(u, 4, 6))], { exhaust: true }));

/* ============================================================== CULTIST */
const CU = 'cultist';
C('ritualDagger', CU, 'starter', 'dagger', 'Ayin Hançeri', 'Ritual Dagger', (u) => atk(1, 1, [D(v(u, 6, 9), { fx: 'slash' }), S('doom', v(u, 2, 3))]));
C('darkVeil', CU, 'starter', 'cloak', 'Karanlık Örtü', 'Dark Veil', (u) => skl(1, [B(v(u, 6, 9))]));
C('whisperOfDoom', CU, 'starter', 'skull', 'Kıyamet Fısıltısı', 'Whisper of Doom', (u) => skl(1, [S('doom', v(u, 9, 13))], { target: 'enemy', range: 4 }));
C('bloodPrice', CU, 'starter', 'blood', 'Kan Bedeli', 'Blood Price', (u) => skl(0, [EN(1), DRAW(v(u, 1, 2))], { hpCost: 3 }));
C('hemorrhage', CU, 'common', 'blood', 'Kan Seli', 'Hemorrhage', (u) => atk(1, 3, [D(v(u, 10, 14), { fx: 'blood' })], { hpCost: 2 }));
C('curseOfFrailty', CU, 'common', 'eye', 'Zayıflık Laneti', 'Curse of Frailty', (u) => skl(1, [S('weak', v(u, 2, 3)), S('doom', 3)], { target: 'enemy', range: 4 }));
C('tentacleCall', CU, 'common', 'tentacle', 'Dokunaç', 'Tentacle', (u) => skl(1, [SUMMON('tentacle')], {
  target: 'empty',
  range: 3,
  note: L('Dokunaç vurduğu düşmana 2 Kıyamet uygular.', 'The tentacle applies 2 Doom to enemies it hits.'),
}));
C('markedForDeath', CU, 'common', 'target', 'Ölüme Adanmış', 'Marked for Death', (u) => atk(1, 4, [D(v(u, 4, 6), { fx: 'soul' }), S('doom', v(u, 4, 6))]));
C('sacrifice', CU, 'common', 'blood', 'Kurban', 'Sacrifice', (u) => skl(0, [EN(2)], { hpCost: v(u, 5, 4), exhaust: true }));
C('shadowGrasp', CU, 'common', 'tentacle', 'Gölge Kavrayışı', 'Shadow Grasp', (u) => skl(1, [PULL(2), S('doom', v(u, 3, 5))], { target: 'enemy', range: 5 }));
C('bloodShield', CU, 'common', 'blood', 'Kan Kalkanı', 'Blood Shield', (u) => skl(1, [B(v(u, 10, 14))], { hpCost: 2 }));
C('darkChant', CU, 'common', 'skull', 'Karanlık İlahi', 'Dark Chant', (u) => skl(1, [S('doom', v(u, 3, 4), 'all')]));
C('voidRite', CU, 'uncommon', 'skull', 'Boşluk Ayini', 'Void Rite', (u) => pwr(v(u, 2, 1), [SELF('doomAura', 2)]));
C('reapDoom', CU, 'uncommon', 'scythe', 'Kıyamet Hasadı', 'Reap Doom', (u) => atk(1, 4, [CUSTOM('doomStrike', v(u, 0, 4))], {
  desc: u
    ? L('Hedefin Kıyametini tüket: o kadar + 4 hasar ver.', "Consume the target's Doom: deal that much + 4 damage.")
    : L('Hedefin Kıyametini tüket: o kadar hasar ver.', "Consume the target's Doom: deal that much damage."),
}));
C('bloodFrenzy', CU, 'uncommon', 'blood', 'Kanlı Güç', 'Blood Frenzy', (u) => skl(1, [SELF('strength', v(u, 2, 3))], { hpCost: 3, exhaust: true }));
C('eldritchBlast', CU, 'uncommon', 'tentacle', 'Kadim Patlama', 'Eldritch Blast', (u) => atk(2, 5, [D(v(u, 8, 11), { to: 'area', radius: 1, fx: 'soul' }), S('doom', 3, 'area', { radius: 1 })], { target: 'tile' }));
C('bloodRite', CU, 'uncommon', 'drain', 'Kan Emici Ayin', 'Blood Rite', (u) => atk(1, 2, [D(v(u, 6, 9), { fx: 'soul', lifesteal: 1 })]));
C('twistedPact', CU, 'uncommon', 'eye', 'Çarpık Pakt', 'Twisted Pact', (u) => pwr(v(u, 1, 0), [SELF('painDraw', 1)]));
C('apocalypse', CU, 'rare', 'skull', 'Kıyamet Günü', 'Apocalypse', (u) => skl(v(u, 3, 2), [CUSTOM('doomMult', 2)], {
  exhaust: true,
  desc: L('Tüm düşmanların Kıyametini ikiye katla. Tükenir.', "Double every enemy's Doom. Exhaust."),
}));
C('oldOneWakes', CU, 'rare', 'tentacle', 'Kadim Uyanış', 'The Old One Wakes', (u) => pwr(v(u, 3, 2), [SELF('eldritch', 1)]));
C('bloodMoon', CU, 'rare', 'moon', 'Kanlı Ay', 'Blood Moon', (u) => skl(0, [EN(3)], { hpCost: v(u, 6, 4), exhaust: true }));

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
