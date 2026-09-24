import { getLang, t, L, type LStr } from '../i18n/i18n';
import type { CardSpec, Cond, Effect, Num, Sel, Unit } from '../engine/types';
import type { Combat } from '../engine/combat';
import { cardSpec, CARDS } from './cards';
import { STATUSES } from './statuses';
import { ALLIES } from './allies';

/**
 * Generates a card's rules text from its effect list, so that data and text
 * never drift apart. Numbers are wrapped in <b> and coloured when modified by
 * the current combat state (strength, weak, radiance...).
 */

const tr = () => getLang() === 'tr';

function num(base: number, shown: number): string {
  const cls = shown > base ? 'num up' : shown < base ? 'num down' : 'num';
  return `<b class="${cls}">${shown}</b>`;
}

function valText(n: Num): string {
  if (typeof n === 'number') return `<b class="num">${n}</b>`;
  const m = n.m ?? 1;
  const per: Record<string, LStr> = {
    x: L('X', 'X'),
    block: L('bloğun', 'your Block'),
    ki: L('Ki', 'Ki'),
    souls: L('Ruh', 'Souls'),
    radiance: L('Işıltı', 'Radiance'),
    targetPoison: L('hedefin Zehri', "target's Poison"),
    targetMark: L('hedefin İşareti', "target's Mark"),
    handSize: L('elindeki kart', 'cards in hand'),
    allies: L('yardımcı', 'allies'),
    exhausted: L('tükenen kart', 'exhausted cards'),
    missingHp: L('eksik can', 'missing HP'),
  };
  const p = t(per[n.per ?? 'x']);
  const mult = m === 1 ? '' : `${m}×`;
  return n.b ? `<b class="num">${n.b}</b> + ${mult}${p}` : `${mult}${p}`;
}

function statusName(s: string): string {
  const meta = STATUSES[s];
  return `<span class="kw" data-status="${s}">${meta ? t(meta.name) : s}</span>`;
}

function who(sel: Sel | undefined, e: { radius?: number; len?: number }): { tr: string; en: string } {
  const r = e.radius ?? 1;
  switch (sel ?? 'target') {
    case 'target':
      return { tr: '', en: '' };
    case 'all':
      return { tr: 'Tüm düşmanlara', en: 'to ALL enemies' };
    case 'random':
      return { tr: 'Rastgele bir düşmana', en: 'to a random enemy' };
    case 'adjacent':
      return { tr: 'Bitişik düşmanlara', en: 'to adjacent enemies' };
    case 'near':
      return { tr: `${r} kare içindeki düşmanlara`, en: `to enemies within ${r} tiles` };
    case 'area':
    case 'areaAll':
      return r === 0 ? { tr: 'Hedef kareye', en: 'to the target tile' } : { tr: `Hedef ve ${r} kare çevresine`, en: `in a ${r}-tile radius` };
    case 'line':
      return { tr: `${e.len ?? 3} kare boyunca hattaki düşmanlara`, en: `to enemies in a ${e.len ?? 3}-tile line` };
    case 'behind':
      return { tr: 'Hedefin arkasındakine', en: 'to the enemy behind the target' };
    case 'allies':
      return { tr: 'Yardımcılarına', en: 'to your allies' };
    case 'self':
      return { tr: '', en: '' };
  }
  return { tr: '', en: '' };
}

function condText(c: Cond): string {
  switch (c.c) {
    case 'targetHas':
      return tr() ? `Hedefte ${statusName(c.s)} varsa` : `If the target has ${statusName(c.s)}`;
    case 'selfHas':
      return tr() ? `${statusName(c.s)} varsa` : `If you have ${statusName(c.s)}`;
    case 'targetDist':
      return tr() ? `Hedef ${c.min ?? 0}+ kare uzaktaysa` : `If the target is ${c.min ?? 0}+ tiles away`;
    case 'killed':
      return tr() ? 'Öldürürse' : 'If this kills';
    case 'hpBelow':
      return tr() ? `Canın %${Math.round(c.pct * 100)} altındaysa` : `If below ${Math.round(c.pct * 100)}% HP`;
  }
}

interface Ctx {
  c?: Combat;
  tgt?: Unit;
  spec: CardSpec;
}

function dmgNum(n: Num, holy: boolean | undefined, ctx: Ctx): string {
  if (typeof n !== 'number') return valText(n);
  if (!ctx.c) return `<b class="num">${n}</b>`;
  return num(n, ctx.c.heroPreview(n, !!holy, ctx.tgt));
}

function blockNum(n: Num, ctx: Ctx): string {
  if (typeof n !== 'number') return valText(n);
  if (!ctx.c) return `<b class="num">${n}</b>`;
  return num(n, ctx.c.heroBlockPreview(n));
}

function effText(e: Effect, ctx: Ctx): string {
  const T = tr();
  switch (e.k) {
    case 'dmg': {
      const w = who(e.to, e);
      const n = dmgNum(e.n, e.holy, ctx);
      const holy = e.holy ? (T ? ' kutsal' : ' holy') : '';
      const times = e.times === undefined ? '' : typeof e.times === 'number' ? (e.times > 1 ? (T ? ` ${e.times} kez` : ` ${e.times} times`) : '') : T ? ` ${valText(e.times)} kez` : ` ${valText(e.times)} times`;
      let s = T ? `${w.tr ? w.tr + ' ' : ''}${n}${holy} hasar${times} ver.` : `Deal ${n}${holy} damage${times}${w.en ? ' ' + w.en : ''}.`;
      if (e.pierce) s += T ? ' Bloğu yok sayar.' : ' Ignores Block.';
      if (e.lifesteal) s += T ? (e.lifesteal >= 1 ? ' Verilen hasar kadar iyileş.' : ' Verilen hasarın yarısı kadar iyileş.') : e.lifesteal >= 1 ? ' Heal for the damage dealt.' : ' Heal for half the damage dealt.';
      return s;
    }
    case 'block':
      if (e.to === 'allies') return T ? `Yardımcıların ${valText(e.n)} blok kazanır.` : `Allies gain ${valText(e.n)} Block.`;
      return T ? `${blockNum(e.n, ctx)} blok kazan.` : `Gain ${blockNum(e.n, ctx)} Block.`;
    case 'status': {
      const meta = STATUSES[e.s];
      const to = e.to ?? 'target';
      if (to === 'self') {
        if (meta && meta.kind === 'power') return t(meta.desc, { n: typeof e.n === 'number' ? `<b class="num">${e.n}</b>` : valText(e.n) });
        return T ? `${valText(e.n)} ${statusName(e.s)} kazan.` : `Gain ${valText(e.n)} ${statusName(e.s)}.`;
      }
      const w = who(to, e);
      if (to === 'target') return T ? `${valText(e.n)} ${statusName(e.s)} uygula.` : `Apply ${valText(e.n)} ${statusName(e.s)}.`;
      return T ? `${w.tr} ${valText(e.n)} ${statusName(e.s)} uygula.` : `Apply ${valText(e.n)} ${statusName(e.s)} ${w.en}.`;
    }
    case 'draw':
      return T ? `${valText(e.n)} kart çek.` : `Draw ${valText(e.n)} card${e.n === 1 ? '' : 's'}.`;
    case 'energy':
      return T ? `${valText(e.n)} <span class="kw">enerji</span> kazan.` : `Gain ${valText(e.n)} <span class="kw">energy</span>.`;
    case 'mp':
      return T ? `${valText(e.n)} <span class="kw">hareket</span> kazan.` : `Gain ${valText(e.n)} <span class="kw">movement</span>.`;
    case 'heal':
      if (e.to === 'allies') return T ? `Yardımcıların ${valText(e.n)} can iyileşir.` : `Heal allies ${valText(e.n)} HP.`;
      return T ? `${valText(e.n)} can iyileş.` : `Heal ${valText(e.n)} HP.`;
    case 'moveTo':
      return ctx.spec.target === 'move' ? (T ? 'Seçilen kareye yürü.' : 'Walk to the chosen tile.') : T ? 'Seçilen kareye ışınlan.' : 'Teleport to the chosen tile.';
    case 'dash':
      return T ? `Hedefe doğru ${e.n} kareye kadar atıl.` : `Dash up to ${e.n} tiles toward the target.`;
    case 'retreat':
      return T ? `${e.n} kare geri çekil.` : `Retreat ${e.n} tile${e.n === 1 ? '' : 's'}.`;
    case 'push': {
      const to = e.to ?? 'target';
      const stun = e.stun ? (T ? ' Bir şeye çarparsa Sersemlet.' : ' Stun it if it collides.') : '';
      if (to === 'target') return (T ? `Hedefi ${e.n} kare <span class="kw">it</span>.` : `<span class="kw">Push</span> the target ${e.n} tiles.`) + stun;
      const w = who(to, e);
      return (T ? `${w.tr.replace(/a$/, 'ı').replace('düşmanlara', 'düşmanları')} ${e.n} kare <span class="kw">it</span>.` : `<span class="kw">Push</span> enemies ${e.n} tiles (${w.en.replace('to ', '')}).`) + stun;
    }
    case 'pull':
      return T ? `Hedefi ${e.n} kare kendine <span class="kw">çek</span>.` : `<span class="kw">Pull</span> the target ${e.n} tiles.`;
    case 'behindTarget':
      return T ? 'Hedefin arkasına ışınlan.' : 'Teleport behind the target.';
    case 'swap':
      return T ? 'Hedefle yer değiştir.' : 'Swap places with the target.';
    case 'summon': {
      const a = ALLIES[e.unit];
      const up = ctx.spec && (ctx as { up?: boolean }).up;
      const hp = a ? a.hp + (up ? a.hpUp ?? 0 : 0) : 0;
      const count = e.n && e.n > 1 ? `${e.n} ` : '';
      const stats = a ? (a.passive ? '' : T ? ` (${hp} can, ${a.dmg} hasar${a.range > 1 ? `, ${a.range} menzil` : ''})` : ` (${hp} HP, ${a.dmg} dmg${a.range > 1 ? `, range ${a.range}` : ''})`) : '';
      return T ? `${count}<span class="kw">${a ? t(a.name) : e.unit}</span> çağır${stats}.` : `Summon ${count}<span class="kw">${a ? t(a.name) : e.unit}</span>${stats}.`;
    }
    case 'trap': {
      const area = e.radius ? (T ? ` (${e.radius} kare alan)` : ` (${e.radius}-tile radius)`) : '';
      return T ? `<span class="kw">Tuzak</span> kur: tetikleyene ${valText(e.n)} hasar${area}.` : `Set a <span class="kw">trap</span>: ${valText(e.n)} damage to whoever triggers it${area}.`;
    }
    case 'bomb': {
      const many = e.spread ? (T ? `${e.spread * 2 + 1} ` : `${e.spread * 2 + 1} `) : '';
      const area = e.radius ? (T ? `${e.radius} kare alana ` : ` in a ${e.radius}-tile radius`) : '';
      return T
        ? `${many}<span class="kw">Bomba</span> yerleştir: düşman turu sonunda ${area}${valText(e.n)} hasar verir (sana yarısı).`
        : `Place ${many}<span class="kw">bomb${e.spread ? 's' : ''}</span>: explodes after the enemy turn for ${valText(e.n)} damage${area} (half to you).`;
    }
    case 'addCard': {
      const name = t(CARDS[e.card]?.name);
      const where = e.to === 'hand' ? (T ? 'Eline' : 'to your hand') : e.to === 'draw' ? (T ? 'Çekme destene' : 'to your draw pile') : T ? 'Iskarta destene' : 'to your discard pile';
      return T ? `${where} ${e.n} <span class="kw">${name}</span> ekle.` : `Add ${e.n} <span class="kw">${name}</span> ${where}.`;
    }
    case 'loseHp':
      return T ? `${valText(e.n)} can kaybet.` : `Lose ${valText(e.n)} HP.`;
    case 'spend':
      return T ? `${e.n === 'all' ? 'Tüm' : e.n} ${statusName(e.s)} harca.` : `Spend ${e.n === 'all' ? 'all' : e.n} ${statusName(e.s)}.`;
    case 'if':
      return `${condText(e.cond)}: ${e.then.map((x) => effText(x, ctx)).join(' ')}`;
    case 'custom':
      return '';
  }
}

export function describeSpec(spec: CardSpec, c?: Combat, tgt?: Unit, up = false): string {
  const ctx = { c, tgt, spec, up } as Ctx;
  const parts: string[] = [];
  const T = tr();
  if (spec.innate) parts.push(T ? '<span class="kw">Doğuştan</span>.' : '<span class="kw">Innate</span>.');
  if (spec.desc) parts.push(t(spec.desc));
  else parts.push(...spec.effects.map((e) => effText(e, ctx)).filter(Boolean));
  if (spec.note) parts.push(t(spec.note));
  if (spec.retain) parts.push(T ? '<span class="kw">Saklı</span>.' : '<span class="kw">Retain</span>.');
  if (spec.ethereal && !spec.desc) parts.push(T ? '<span class="kw">Uçucu</span>.' : '<span class="kw">Ethereal</span>.');
  if (spec.exhaust && !spec.desc?.tr.includes('Tükenir')) parts.push(T ? '<span class="kw">Tükenir</span>.' : '<span class="kw">Exhaust</span>.');
  return parts.join(' ');
}

export function describeCard(id: string, up: boolean, c?: Combat, tgt?: Unit): string {
  return describeSpec(cardSpec(id, up), c, tgt, up);
}

/** keyword glossary shown in tooltips */
export const KEYWORDS: Record<string, { name: LStr; desc: LStr }> = {
  exhaust: { name: L('Tükenir', 'Exhaust'), desc: L('Oynandıktan sonra savaşın geri kalanında kullanılamaz.', 'Removed until end of combat after being played.') },
  ethereal: { name: L('Uçucu', 'Ethereal'), desc: L('Tur sonunda elindeyse tükenir.', 'If in hand at end of turn, it is exhausted.') },
  retain: { name: L('Saklı', 'Retain'), desc: L('Tur sonunda atılmaz.', 'Not discarded at end of turn.') },
  innate: { name: L('Doğuştan', 'Innate'), desc: L('Savaşın ilk elinde hep bulunur.', 'Always in your opening hand.') },
  push: { name: L('İtme', 'Push'), desc: L('Birim bir şeye çarparsa hasar alır.', 'Units that collide with something take damage.') },
  trap: { name: L('Tuzak', 'Trap'), desc: L('Bir düşman kareye girdiğinde tetiklenir.', 'Triggers when an enemy enters the tile.') },
  bomb: { name: L('Bomba', 'Bomb'), desc: L('Düşman turu sonunda patlar ve alandaki herkese vurur.', 'Explodes after the enemy turn, hitting everyone in the area.') },
};
