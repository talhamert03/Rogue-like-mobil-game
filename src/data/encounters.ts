export interface EncounterDef {
  id: string;
  act: number;
  tier: 'normal' | 'elite' | 'boss';
  /** easy encounters are used for the first fights of an act */
  easy?: boolean;
  heroPos?: number;
  enemies: { id: string; pos: number }[];
}

const ALL: EncounterDef[] = [];
const enc = (id: string, act: number, tier: EncounterDef['tier'], enemies: [string, number][], easy = false) =>
  ALL.push({ id, act, tier, easy, enemies: enemies.map(([eid, pos]) => ({ id: eid, pos })) });

/* ---- act 1 */
enc('a1_oozes', 1, 'normal', [['slimeGreen', 5], ['slimeGreen', 7]], true);
enc('a1_rats', 1, 'normal', [['rat', 5], ['rat', 6], ['rat', 7]], true);
enc('a1_cultist', 1, 'normal', [['cultist', 6]], true);
enc('a1_zombie', 1, 'normal', [['zombie', 5]], true);
enc('a1_bats', 1, 'normal', [['caveBat', 5], ['caveBat', 7]], true);
enc('a1_archerZombie', 1, 'normal', [['zombie', 5], ['skeletonArcher', 7]]);
enc('a1_thieves', 1, 'normal', [['goblinThief', 5], ['skeletonArcher', 7]]);
enc('a1_spores', 1, 'normal', [['sporeling', 4], ['slimePurple', 6]]);
enc('a1_batSwarm', 1, 'normal', [['caveBat', 5], ['caveBat', 6], ['caveBat', 7]]);
enc('a1_cultArchers', 1, 'normal', [['cultist', 6], ['skeletonArcher', 7]]);
enc('a1_oozePile', 1, 'normal', [['slimePurple', 5], ['slimeGreen', 6], ['slimeGreen', 7]]);
enc('a1_ratPack', 1, 'normal', [['rat', 4], ['rat', 5], ['zombie', 6]]);
enc('a1_e_knight', 1, 'elite', [['boneKnight', 6]]);
enc('a1_e_giantSlime', 1, 'elite', [['giantSlime', 6]]);
enc('a1_e_shaman', 1, 'elite', [['goblinGrunt', 5], ['goblinGrunt', 6], ['goblinShaman', 7]]);
enc('a1_b_warden', 1, 'boss', [['cryptWarden', 6]]);
enc('a1_b_ratKing', 1, 'boss', [['rat', 5], ['ratKing', 6], ['rat', 7]]);

/* ---- act 2 */
enc('a2_spiders', 2, 'normal', [['caveSpider', 5], ['caveSpider', 6]], true);
enc('a2_wolf', 2, 'normal', [['direWolf', 6]], true);
enc('a2_orc', 2, 'normal', [['orcBrute', 5]], true);
enc('a2_mageBomber', 2, 'normal', [['koboldBomber', 6], ['shadowMage', 7]], true);
enc('a2_wolves', 2, 'normal', [['direWolf', 5], ['direWolf', 7]]);
enc('a2_beetleMage', 2, 'normal', [['crystalBeetle', 5], ['shadowMage', 7]]);
enc('a2_gargoyleBomber', 2, 'normal', [['gargoyle', 5], ['koboldBomber', 7]]);
enc('a2_orcSpider', 2, 'normal', [['orcBrute', 5], ['caveSpider', 6]]);
enc('a2_fungus', 2, 'normal', [['fungalBrute', 5], ['sporeling', 7]]);
enc('a2_bombers', 2, 'normal', [['crystalBeetle', 5], ['koboldBomber', 6], ['koboldBomber', 7]]);
enc('a2_gargoyles', 2, 'normal', [['gargoyle', 5], ['gargoyle', 7]]);
enc('a2_e_queen', 2, 'elite', [['spiderling', 5], ['spiderQueen', 6]]);
enc('a2_e_warlord', 2, 'elite', [['orcWarlord', 6]]);
enc('a2_e_golem', 2, 'elite', [['crystalGolem', 6]]);
enc('a2_b_mother', 2, 'boss', [['sporeling', 4], ['myceliumMother', 6]]);
enc('a2_b_troll', 2, 'boss', [['trollKing', 6]]);

/* ---- act 3 */
enc('a3_imps', 3, 'normal', [['imp', 5], ['imp', 7]], true);
enc('a3_hound', 3, 'normal', [['hellhound', 6]], true);
enc('a3_knight', 3, 'normal', [['darkKnight', 5]], true);
enc('a3_wraithImp', 3, 'normal', [['wraith', 5], ['imp', 7]], true);
enc('a3_hounds', 3, 'normal', [['hellhound', 5], ['hellhound', 7]]);
enc('a3_knightPriest', 3, 'normal', [['darkKnight', 5], ['cultPriest', 7]]);
enc('a3_magmaImp', 3, 'normal', [['magmaGolem', 5], ['imp', 7]]);
enc('a3_eyeWraith', 3, 'normal', [['wraith', 5], ['watcherEye', 7]]);
enc('a3_cult', 3, 'normal', [['imp', 4], ['hellhound', 6], ['cultPriest', 7]]);
enc('a3_eyes', 3, 'normal', [['watcherEye', 5], ['watcherEye', 7]]);
enc('a3_magmaKnight', 3, 'normal', [['magmaGolem', 5], ['darkKnight', 6]]);
enc('a3_e_fiend', 3, 'elite', [['pitFiend', 6]]);
enc('a3_e_necro', 3, 'elite', [['skeletonWarrior', 5], ['necroLord', 7]]);
enc('a3_e_gargoyles', 3, 'elite', [['gargoyleAlpha', 5], ['gargoyleAlpha', 7]]);
enc('a3_b_dragon', 3, 'boss', [['ashDragon', 6]]);
enc('a3_b_sovereign', 3, 'boss', [['paleSovereign', 6]]);

export const ENCOUNTERS: Record<string, EncounterDef> = Object.fromEntries(ALL.map((e) => [e.id, e]));
export const ENCOUNTER_LIST = ALL;

export function encountersFor(act: number, tier: EncounterDef['tier'], easy?: boolean): EncounterDef[] {
  return ALL.filter((e) => e.act === act && e.tier === tier && (easy === undefined || !!e.easy === easy));
}

export const BOSSES_BY_ACT: Record<number, string[]> = {
  1: ['a1_b_warden', 'a1_b_ratKing'],
  2: ['a2_b_mother', 'a2_b_troll'],
  3: ['a3_b_dragon', 'a3_b_sovereign'],
};
