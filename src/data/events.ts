import { L, type LStr } from '../i18n/i18n';
import type { Rng } from '../core/rng';
import type { RunState } from '../engine/runTypes';

/** Operations an event outcome may perform. Implemented by the run engine. */
export interface EventApi {
  run: RunState;
  rng: Rng;
  vars: Record<string, number | string>;
  gold(n: number): void;
  heal(n: number): void;
  damage(n: number): void;
  maxHp(n: number): void;
  addCard(id: string, up?: boolean): void;
  curse(id?: string): void;
  relic(rarity: 'common' | 'uncommon' | 'rare' | string): string | null;
  potion(id?: string): boolean;
  loseRandomPotion(): boolean;
  upgradeRandom(n: number): void;
  /** opens a deck selection; the event resumes at `after` */
  select(kind: 'remove' | 'upgrade' | 'transform' | 'duplicate', after: string): void;
  cardReward(rareBoost?: boolean): void;
  fight(tier: 'normal' | 'elite', bonusGold?: number): void;
}

export interface EventOption {
  label: LStr;
  hint?: LStr;
  cond?: (api: EventApi) => boolean;
  /** returns next page id, or undefined to leave */
  go: (api: EventApi) => string | void;
}

export interface EventPage {
  text: LStr;
  options: EventOption[];
}

export interface EventDef {
  id: string;
  acts: number[];
  title: LStr;
  art: string;
  setup?: (api: EventApi) => void;
  pages: Record<string, EventPage>;
}

const LEAVE: EventOption = { label: L('Ayrıl', 'Leave'), go: () => undefined };
const cont = (text: LStr): EventPage => ({ text, options: [{ label: L('Devam', 'Continue'), go: () => undefined }] });

const ALL: EventDef[] = [];
const EV = (e: EventDef) => ALL.push(e);

EV({
  id: 'whisperingWell',
  acts: [1, 2, 3],
  title: L('Fısıldayan Kuyu', 'The Whispering Well'),
  art: 'well',
  pages: {
    start: {
      text: L(
        'Yosun tutmuş taşlardan bir kuyu. Derinlerden adını fısıldayan bir ses geliyor. Suyun yüzeyinde altın pullar parlıyor.',
        'A well of moss-covered stones. From the depths, a voice whispers your name. Golden scales glint on the water.',
      ),
      options: [
        {
          label: L('Altın at (25 altın)', 'Toss a coin (25 gold)'),
          hint: L('%60: sıradan tılsım', '60%: common relic'),
          cond: (a) => a.run.gold >= 25,
          go: (a) => {
            a.gold(-25);
            if (a.rng.chance(0.6)) {
              a.relic('common');
              return 'blessed';
            }
            return 'nothing';
          },
        },
        {
          label: L('Sudan iç', 'Drink the water'),
          hint: L('%30 can iyileş, %50: Çürüme laneti', 'Heal 30%, 50%: Rot curse'),
          go: (a) => {
            a.heal(Math.floor(a.run.maxHp * 0.3));
            if (a.rng.chance(0.5)) {
              a.curse('rot');
              return 'cursed';
            }
            return 'refreshed';
          },
        },
        LEAVE,
      ],
    },
    blessed: cont(L('Kuyu memnun bir iç çeker. Suyun dibinden bir şey yüzeye çıkıyor.', 'The well sighs contentedly. Something floats up from the bottom.')),
    nothing: cont(L('Altın karanlıkta kayboluyor. Fısıltılar kıkırdamaya dönüşüyor.', 'The coin vanishes into darkness. The whispers turn into giggles.')),
    refreshed: cont(L('Buz gibi su damarlarında dolaşıyor. Kendini yenilenmiş hissediyorsun.', 'Ice-cold water runs through your veins. You feel renewed.')),
    cursed: cont(L('Su serinletiyor ama ağzında çürük bir tat kalıyor...', 'The water refreshes, but leaves a rotten taste in your mouth...')),
  },
});

EV({
  id: 'abandonedCamp',
  acts: [1, 2],
  title: L('Terk Edilmiş Kamp', 'Abandoned Camp'),
  art: 'campfire',
  setup: (a) => {
    a.vars.gold = a.rng.int(40, 65);
  },
  pages: {
    start: {
      text: L(
        'Hâlâ tüten bir ateşin başında yırtık bir çanta duruyor. Sahibinden eser yok, ama karanlıkta bir şey kıpırdıyor olabilir.',
        'A torn pack lies beside a still-smoldering fire. Its owner is nowhere to be seen, but something may be stirring in the dark.',
      ),
      options: [
        {
          label: L('Çantayı karıştır', 'Search the pack'),
          hint: L('{gold} altın, %35: 7 hasar', '{gold} gold, 35%: 7 damage'),
          go: (a) => {
            a.gold(a.vars.gold as number);
            if (a.rng.chance(0.35)) {
              a.damage(7);
              return 'bitten';
            }
            return 'loot';
          },
        },
        { label: L('Ateşte dinlen', 'Rest by the fire'), hint: L('15 can iyileş', 'Heal 15 HP'), go: (a) => { a.heal(15); return 'rest'; } },
        LEAVE,
      ],
    },
    loot: cont(L('Çantada bir kese altın buluyorsun. Sahibinin buna artık ihtiyacı yok gibi.', 'You find a pouch of coins. Its owner seems not to need it anymore.')),
    bitten: cont(L('Altını alırken çantadan bir fare fırlayıp elini ısırıyor!', 'As you grab the coins, a rat leaps out and bites your hand!')),
    rest: cont(L('Kısa ama derin bir uyku. Yaraların biraz kapanıyor.', 'A short but deep sleep. Your wounds close a little.')),
  },
});

EV({
  id: 'oldSmith',
  acts: [1, 2, 3],
  title: L('Yaşlı Demirci', 'The Old Smith'),
  art: 'anvil',
  pages: {
    start: {
      text: L(
        'Kemikleri çıkmış yaşlı bir cüce, sönmek üzere olan bir örsün başında. "Bir işim daha var," diyor, "ama kolum eskisi gibi değil."',
        'A gaunt old dwarf stands over a dying forge. "I\'ve got one more job in me," he says, "but my arm isn\'t what it was."',
      ),
      options: [
        { label: L('Bir kartını geliştir', 'Upgrade a card'), hint: L('Ücretsiz geliştirme', 'Free upgrade'), go: (a) => { a.select('upgrade', 'thanks'); return 'thanks'; } },
        {
          label: L('Körüğü sen çek', 'Work the bellows'),
          hint: L('10 hasar al, rastgele 2 kart geliştir', 'Take 10 damage, upgrade 2 random cards'),
          go: (a) => {
            a.damage(10);
            a.upgradeRandom(2);
            return 'sweat';
          },
        },
        LEAVE,
      ],
    },
    thanks: cont(L('Çekiç son kez iner. Cüce memnun bir şekilde gülümser.', 'The hammer falls one last time. The dwarf smiles, satisfied.')),
    sweat: cont(L('Kıvılcımlar tenini yakıyor ama silahların hiç olmadığı kadar keskin.', 'Sparks sear your skin, but your gear has never been sharper.')),
  },
});

EV({
  id: 'bloodAltar',
  acts: [1, 2, 3],
  title: L('Kan Sunağı', 'Altar of Blood'),
  art: 'altar',
  setup: (a) => {
    a.vars.cost = Math.floor(a.run.maxHp * 0.2);
  },
  pages: {
    start: {
      text: L(
        'Kurumuş kanla kaplı siyah taştan bir sunak. Ortasındaki oyukta soluk bir ışık atıyor, sanki bir kalp.',
        'An altar of black stone crusted with old blood. In its hollow, a pale light pulses like a heartbeat.',
      ),
      options: [
        {
          label: L('Kanını sun', 'Offer your blood'),
          hint: L('{cost} can kaybet, nadir tılsım kazan', 'Lose {cost} HP, gain a rare relic'),
          cond: (a) => a.run.hp > (a.vars.cost as number),
          go: (a) => {
            a.damage(a.vars.cost as number);
            a.relic('rare');
            return 'accepted';
          },
        },
        {
          label: L('Sunağı parçala', 'Smash the altar'),
          hint: L('100 altın, Pişmanlık laneti', '100 gold, Regret curse'),
          go: (a) => {
            a.gold(100);
            a.curse('regret');
            return 'smashed';
          },
        },
        LEAVE,
      ],
    },
    accepted: cont(L('Kan taşa işliyor. Oyuktan sıcak bir nesne düşüyor avucuna.', 'The blood seeps into the stone. A warm object drops into your palm.')),
    smashed: cont(L('Taş çatlıyor, içinden altınlar dökülüyor. Ama bir şey seni izlemeye başladı.', 'The stone cracks and coins spill out. But something has begun watching you.')),
  },
});

EV({
  id: 'peddler',
  acts: [1, 2, 3],
  title: L('Gezgin Satıcı', 'The Wandering Peddler'),
  art: 'peddler',
  pages: {
    start: {
      text: L(
        'Sırtında kendisinden büyük bir heybeyle kambur bir satıcı. "Gizemli kutu, dostum! Belki hazine, belki çöp. Ya da o kartlarından birini alırım..."',
        'A hunched peddler with a pack larger than himself. "Mystery box, friend! Maybe treasure, maybe junk. Or I\'ll take one of those cards off your hands..."',
      ),
      options: [
        {
          label: L('Gizemli kutu al (60 altın)', 'Buy a mystery box (60 gold)'),
          hint: L('Tılsım ya da iksirler', 'A relic or potions'),
          cond: (a) => a.run.gold >= 60,
          go: (a) => {
            a.gold(-60);
            if (a.rng.chance(0.5)) a.relic('common');
            else {
              a.potion();
              a.potion();
            }
            return 'bought';
          },
        },
        { label: L('Bir kartını sat', 'Sell him a card'), hint: L('Bir kartı çıkar, 50 altın', 'Remove a card, gain 50 gold'), go: (a) => { a.gold(50); a.select('remove', 'sold'); return 'sold'; } },
        LEAVE,
      ],
    },
    bought: cont(L('"İyi alışveriş!" diyerek gözden kayboluyor.', '"Pleasure doing business!" he says, and vanishes.')),
    sold: cont(L('Kartı heybesine atıyor ve sana birkaç parlak sikke uzatıyor.', 'He tosses the card into his pack and hands you a few shiny coins.')),
  },
});

EV({
  id: 'glowingShrooms',
  acts: [1, 2],
  title: L('Parlayan Mantarlar', 'Glowing Mushrooms'),
  art: 'mushroom',
  pages: {
    start: {
      text: L(
        'Mağara duvarında mavi ışık saçan mantarlar. Havada tatlı, baş döndürücü bir koku var.',
        'Mushrooms glowing blue along the cave wall. The air carries a sweet, dizzying scent.',
      ),
      options: [
        {
          label: L('Birini ye', 'Eat one'),
          hint: L('%50: +5 maks. can, %50: 10 hasar', '50%: +5 Max HP, 50%: 10 damage'),
          go: (a) => {
            if (a.rng.chance(0.5)) {
              a.maxHp(5);
              return 'good';
            }
            a.damage(10);
            return 'bad';
          },
        },
        { label: L('Topla', 'Harvest them'), hint: L('Rastgele bir iksir', 'A random potion'), go: (a) => { a.potion(); return 'harvest'; } },
        LEAVE,
      ],
    },
    good: cont(L('Vücudunu sıcak bir güç sarıyor.', 'A warm strength spreads through your body.')),
    bad: cont(L('Midende bir yangın başlıyor. Kötü bir fikirdi.', 'A fire starts in your stomach. Bad idea.')),
    harvest: cont(L('Mantarları dikkatlice bir şişeye sıkıyorsun.', 'You carefully squeeze the mushrooms into a flask.')),
  },
});

EV({
  id: 'knightGrave',
  acts: [1, 2, 3],
  title: L('Düşmüş Şövalyenin Mezarı', "A Fallen Knight's Grave"),
  art: 'grave',
  pages: {
    start: {
      text: L(
        'Paslı bir kılıç, üzerine saplandığı toprağı işaret ediyor. Mezar taşında tek bir kelime: "Affet."',
        'A rusted sword marks the earth it is buried in. The headstone bears a single word: "Forgive."',
      ),
      options: [
        {
          label: L('Mezarı kaz', 'Dig up the grave'),
          hint: L('Sıradan tılsım, %50: Şüphe laneti', 'Common relic, 50%: Doubt curse'),
          go: (a) => {
            a.relic('common');
            if (a.rng.chance(0.5)) {
              a.curse('doubt');
              return 'haunted';
            }
            return 'dug';
          },
        },
        { label: L('Dua et', 'Pray'), hint: L('Bir kartı desteden çıkar', 'Remove a card from your deck'), go: (a) => { a.select('remove', 'prayed'); return 'prayed'; } },
        LEAVE,
      ],
    },
    dug: cont(L('Kemiklerin arasında hâlâ parlayan bir nesne buluyorsun.', 'Among the bones, you find something that still gleams.')),
    haunted: cont(L('Ganimeti alırken arkandan soğuk bir nefes hissediyorsun.', 'As you take the prize, you feel a cold breath behind you.')),
    prayed: cont(L('İçindeki bir yük hafifliyor.', 'A burden within you lifts.')),
  },
});

EV({
  id: 'mirrorHall',
  acts: [2, 3],
  title: L('Aynalı Salon', 'Hall of Mirrors'),
  art: 'mirror',
  pages: {
    start: {
      text: L(
        'Sonsuz yansımalar. Aynalardan birinde yansıman sana göz kırpıyor ve elini uzatıyor.',
        'Endless reflections. In one mirror, your reflection winks and reaches out a hand.',
      ),
      options: [
        { label: L('Eline dokun', 'Touch its hand'), hint: L('Bir kartı kopyala', 'Duplicate a card'), go: (a) => { a.select('duplicate', 'twin'); return 'twin'; } },
        {
          label: L('Aynayı kır', 'Shatter the mirror'),
          hint: L('5 hasar, 40 altın', '5 damage, 40 gold'),
          go: (a) => {
            a.damage(5);
            a.gold(40);
            return 'shatter';
          },
        },
        LEAVE,
      ],
    },
    twin: cont(L('Yansıman bir şey fısıldıyor ve kayboluyor. Destende bir tanıdık fazla.', 'Your reflection whispers something and fades. Your deck feels more familiar.')),
    shatter: cont(L('Cam kırıkları arasında gümüş çerçeveden sökülmüş parçalar buluyorsun.', 'Among the shards, you pry loose bits of the silver frame.')),
  },
});

EV({
  id: 'lockedChest',
  acts: [1, 2, 3],
  title: L('Kilitli Sandık', 'The Locked Chest'),
  art: 'chest',
  pages: {
    start: {
      text: L('Zincirlerle sarılmış demir bir sandık. Kilidin etrafında şüpheli çizikler var.', 'An iron chest wrapped in chains. There are suspicious scratches around the lock.'),
      options: [
        {
          label: L('Kilidi zorla', 'Force the lock'),
          hint: L('%70: tılsım, %30: 12 hasar', '70%: relic, 30%: 12 damage'),
          go: (a) => {
            if (a.rng.chance(0.7)) {
              a.relic(a.rng.chance(0.3) ? 'uncommon' : 'common');
              return 'opened';
            }
            a.damage(12);
            return 'trapped';
          },
        },
        { label: L('Tekmele', 'Kick it'), hint: L('3 hasar, 30 altın', '3 damage, 30 gold'), go: (a) => { a.damage(3); a.gold(30); return 'kicked'; } },
        LEAVE,
      ],
    },
    opened: cont(L('Kilit tık diye açılıyor. İçeride seni bekleyen bir ödül var.', 'The lock clicks open. A prize awaits inside.')),
    trapped: cont(L('Bir iğne fırlayıp koluna saplanıyor. Sandık boşmuş!', 'A needle springs out into your arm. The chest was empty!')),
    kicked: cont(L('Sandığın dibi kırılıyor, birkaç sikke yere saçılıyor.', "The chest's bottom breaks and a few coins scatter.")),
  },
});

EV({
  id: 'goblinGambler',
  acts: [1, 2, 3],
  title: L('Goblin Kumarbaz', 'The Goblin Gambler'),
  art: 'dice',
  pages: {
    start: {
      text: L(
        'Bir goblin, kemikten zarlarını sallıyor. "Tek zar, çift ya da hiç! Cesaretin var mı yabancı?"',
        'A goblin rattles his bone dice. "One roll, double or nothing! Got the guts, stranger?"',
      ),
      options: [
        {
          label: L('50 altın bas', 'Bet 50 gold'),
          hint: L('%50: +50, %50: -50', '50%: +50, 50%: -50'),
          cond: (a) => a.run.gold >= 50,
          go: (a) => {
            if (a.rng.chance(0.5)) {
              a.gold(50);
              return 'win';
            }
            a.gold(-50);
            return 'lose';
          },
        },
        { label: L('Goblini yakala', 'Grab the goblin'), hint: L('Savaş, ekstra 40 altın', 'Fight, +40 gold'), go: (a) => { a.fight('normal', 40); return undefined; } },
        LEAVE,
      ],
    },
    win: cont(L('"Hile bu!" diye bağırıyor ama keseyi uzatıyor.', '"Cheater!" he screeches, but hands over the purse.')),
    lose: cont(L('Goblin kıkırdayarak altınlarını topluyor ve kayboluyor.', 'The goblin giggles, scoops up your coins and vanishes.')),
  },
});

EV({
  id: 'ruinedLibrary',
  acts: [1, 2, 3],
  title: L('Harap Kütüphane', 'The Ruined Library'),
  art: 'book',
  pages: {
    start: {
      text: L('Yıkık raflar ve toz içindeki kitaplar. Birkaç sayfa hâlâ okunabilir durumda.', 'Collapsed shelves and dust-covered tomes. A few pages are still legible.'),
      options: [
        { label: L('Oku', 'Read'), hint: L('Nadir ağırlıklı kart ödülü', 'Card reward (rare chance up)'), go: (a) => { a.cardReward(true); return 'read'; } },
        { label: L('Kestir', 'Take a nap'), hint: L('%20 can iyileş', 'Heal 20% HP'), go: (a) => { a.heal(Math.floor(a.run.maxHp * 0.2)); return 'nap'; } },
        LEAVE,
      ],
    },
    read: cont(L('Eski bir savaş tekniği zihnine kazınıyor.', 'An ancient technique etches itself into your mind.')),
    nap: cont(L('Kitapların kokusu seni tatlı bir uykuya daldırıyor.', 'The smell of old books lulls you to sleep.')),
  },
});

EV({
  id: 'healingSpring',
  acts: [1, 2, 3],
  title: L('Şifalı Kaynak', 'Healing Spring'),
  art: 'spring',
  pages: {
    start: {
      text: L('Kayaların arasından ılık, ışıltılı bir su fışkırıyor.', 'Warm, shimmering water bubbles up between the rocks.'),
      options: [
        { label: L('Yıkan', 'Bathe'), hint: L('%50 can iyileş', 'Heal 50% HP'), go: (a) => { a.heal(Math.floor(a.run.maxHp * 0.5)); return 'bathed'; } },
        { label: L('Şişe doldur', 'Fill a flask'), hint: L('Can İksiri + 8 can', 'Healing Potion + 8 HP'), go: (a) => { a.potion('healing'); a.heal(8); return 'filled'; } },
        LEAVE,
      ],
    },
    bathed: cont(L('Yorgunluğun suyla birlikte akıp gidiyor.', 'Your weariness washes away with the water.')),
    filled: cont(L('Şişe avucunda sıcacık parlıyor.', 'The flask glows warmly in your palm.')),
  },
});

EV({
  id: 'cultRitual',
  acts: [1, 2, 3],
  title: L('Gizli Ayin', 'The Secret Rite'),
  art: 'altar',
  pages: {
    start: {
      text: L(
        'Kapüşonlu figürler altın bir putun etrafında ilahi söylüyor. Biri seni fark edip yaklaşıyor: "Katıl bize, kardeş."',
        'Hooded figures chant around a golden idol. One notices you and approaches: "Join us, sibling."',
      ),
      options: [
        {
          label: L('Katıl', 'Join them'),
          hint: L('Lanetli Put tılsımı, Pişmanlık laneti', 'Cursed Idol relic, Regret curse'),
          go: (a) => {
            a.relic('cursedIdol');
            a.curse('regret');
            return 'joined';
          },
        },
        { label: L('Ayini boz', 'Disrupt the rite'), hint: L('Savaş, ekstra 60 altın', 'Fight, +60 gold'), go: (a) => { a.fight('normal', 60); return undefined; } },
        LEAVE,
      ],
    },
    joined: cont(L('Put avucunda ağırlaşıyor. Kulaklarında ilahiler yankılanmaya devam ediyor.', 'The idol grows heavy in your hand. The chants keep echoing in your ears.')),
  },
});

EV({
  id: 'cauldron',
  acts: [1, 2, 3],
  title: L('Dönüşüm Kazanı', 'Cauldron of Change'),
  art: 'cauldron',
  pages: {
    start: {
      text: L('Kendi kendine kaynayan dev bir kazan. İçine ne atılırsa başka bir şeye dönüşüyor.', 'A huge cauldron boiling on its own. Whatever goes in comes out as something else.'),
      options: [
        { label: L('Bir kart at', 'Toss in a card'), hint: L('Bir kartı dönüştür', 'Transform a card'), go: (a) => { a.select('transform', 'changed'); return 'changed'; } },
        {
          label: L('Kazandan iç', 'Drink from it'),
          hint: L('6 hasar, 2 rastgele iksir', '6 damage, 2 random potions'),
          go: (a) => {
            a.damage(6);
            a.potion();
            a.potion();
            return 'drank';
          },
        },
        LEAVE,
      ],
    },
    changed: cont(L('Kazandan çıkan kart eskisine hiç benzemiyor.', 'The card that emerges looks nothing like before.')),
    drank: cont(L('Boğazın yanıyor ama kemerin iksirlerle doluyor.', 'Your throat burns, but your belt fills with potions.')),
  },
});

EV({
  id: 'woundedAdventurer',
  acts: [1, 2, 3],
  title: L('Yaralı Maceracı', 'The Wounded Adventurer'),
  art: 'adventurer',
  pages: {
    start: {
      text: L(
        'Duvara yaslanmış, kan kaybeden bir maceracı. "Bir iksirin var mı?" diye inliyor. Yanında dolgun bir kese duruyor.',
        'An adventurer slumped against the wall, bleeding. "Got a potion?" they groan. A fat purse lies beside them.',
      ),
      options: [
        {
          label: L('İksirini ver', 'Give a potion'),
          hint: L('Bir iksir kaybet, sıradışı tılsım kazan', 'Lose a potion, gain an uncommon relic'),
          cond: (a) => a.run.potions.some((p) => p),
          go: (a) => {
            a.loseRandomPotion();
            a.relic('uncommon');
            return 'grateful';
          },
        },
        {
          label: L('Keseyi al', 'Take the purse'),
          hint: L('75 altın, Şüphe laneti', '75 gold, Doubt curse'),
          go: (a) => {
            a.gold(75);
            a.curse('doubt');
            return 'robbed';
          },
        },
        LEAVE,
      ],
    },
    grateful: cont(L('"Bunu al," diyor ve boynundaki tılsımı çıkarıp sana veriyor.', '"Take this," they say, pulling a charm from their neck.')),
    robbed: cont(L('Keseyi alıp uzaklaşıyorsun. Arkandan gelen bakış seni rahatsız ediyor.', "You take the purse and walk away. The stare behind you won't leave your mind.")),
  },
});

EV({
  id: 'vault',
  acts: [2, 3],
  title: L('Unutulmuş Hazine', 'The Forgotten Vault'),
  art: 'chest',
  pages: {
    start: {
      text: L('Tavana kadar yığılmış altınlar. Duvarlarda uyarı yazıları: "Açgözlülük ağırlaştırır."', 'Gold piled to the ceiling. Warnings scrawled on the walls: "Greed weighs heavy."'),
      options: [
        { label: L('Taşıyabildiğin kadar al', 'Take all you can carry'), hint: L('120 altın, Yük laneti', '120 gold, Burden curse'), go: (a) => { a.gold(120); a.curse('burden'); return 'greedy'; } },
        { label: L('Bir avuç al', 'Take a handful'), hint: L('40 altın', '40 gold'), go: (a) => { a.gold(40); return 'modest'; } },
        LEAVE,
      ],
    },
    greedy: cont(L('Ceplerin şişiyor, adımların ağırlaşıyor.', 'Your pockets bulge and your steps grow heavy.')),
    modest: cont(L('Ölçülü davranıyorsun. Hazine sessizce seni izliyor.', 'You show restraint. The vault watches silently.')),
  },
});

EV({
  id: 'soulMerchant',
  acts: [2, 3],
  title: L('Ruh Tüccarı', 'The Soul Merchant'),
  art: 'ghost',
  pages: {
    start: {
      text: L(
        'Yarı saydam bir figür mum ışığında belirir. "Canından biraz... ya da anılarından biri. Adil bir takas, değil mi?"',
        'A translucent figure appears in the candlelight. "A bit of your life... or one of your memories. A fair trade, no?"',
      ),
      options: [
        { label: L('Canını sat', 'Sell your vitality'), hint: L('-8 maks. can, 150 altın', '-8 Max HP, 150 gold'), cond: (a) => a.run.maxHp > 20, go: (a) => { a.maxHp(-8); a.gold(150); return 'sold'; } },
        { label: L('Bir anını sat', 'Sell a memory'), hint: L('Bir kartı çıkar', 'Remove a card'), go: (a) => { a.select('remove', 'forgot'); return 'forgot'; } },
        LEAVE,
      ],
    },
    sold: cont(L('Soğuk bir el göğsüne dokunuyor. Biraz daha yorgunsun, ama zenginsin.', 'A cold hand touches your chest. You feel weaker, but richer.')),
    forgot: cont(L('Bir şeyi unuttuğunu biliyorsun. Ama ne olduğunu hatırlamıyorsun.', "You know you've forgotten something. You just can't remember what.")),
  },
});

EV({
  id: 'trainingDummy',
  acts: [1, 2],
  title: L('Eğitim Kuklası', 'The Training Dummy'),
  art: 'dummy',
  pages: {
    start: {
      text: L('Samanla doldurulmuş, yüzü çizilmiş eski bir kukla. Birileri burada uzun süre çalışmış.', 'An old straw dummy with a face scratched onto it. Someone trained here for a long time.'),
      options: [
        { label: L('Antrenman yap', 'Train'), hint: L('Bir kartı geliştir', 'Upgrade a card'), go: (a) => { a.select('upgrade', 'trained'); return 'trained'; } },
        { label: L('Parçala ve ara', 'Tear it apart'), hint: L('25 altın', '25 gold'), go: (a) => { a.gold(25); return 'torn'; } },
        LEAVE,
      ],
    },
    trained: cont(L('Ter içinde kalıyorsun ama hareketlerin daha akıcı.', "You're drenched in sweat, but your moves flow better.")),
    torn: cont(L('Samanların arasında birinin sakladığı sikkeler var.', 'Someone hid coins inside the straw.')),
  },
});

export const EVENTS: Record<string, EventDef> = Object.fromEntries(ALL.map((e) => [e.id, e]));
export const EVENT_LIST = ALL;
