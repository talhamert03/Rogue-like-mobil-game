import { BASE_PALETTE, SPRITES } from './sprites';
import { iconRows } from './icons';

const OUTLINE = '#140c1c';
const cache = new Map<string, string>();

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function shade(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(f < 0 ? x * (1 + f) : x + (255 - x) * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/**
 * Rasterize a character grid into a data URL (1 px per cell + 1 px outline).
 */
export function rasterize(rows: string[], palette: Record<string, string>, outline = true, flip = false): string {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const pad = outline ? 1 : 0;
  const cv = document.createElement('canvas');
  cv.width = w + pad * 2;
  cv.height = h + pad * 2;
  const ctx = cv.getContext('2d')!;
  const opaque = (x: number, y: number) => {
    if (y < 0 || y >= h || x < 0 || x >= w) return false;
    const ch = rows[y][x];
    return !!ch && ch !== '.' && ch !== ' ';
  };
  const px = (x: number) => (flip ? w - 1 - x : x);
  if (outline) {
    ctx.fillStyle = OUTLINE;
    for (let y = -1; y <= h; y++)
      for (let x = -1; x <= w; x++) {
        if (opaque(x, y)) continue;
        if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) ctx.fillRect(px(x) + pad, y + pad, 1, 1);
      }
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (!ch || ch === '.' || ch === ' ') continue;
      ctx.fillStyle = palette[ch] ?? BASE_PALETTE[ch] ?? '#ff00ff';
      ctx.fillRect(px(x) + pad, y + pad, 1, 1);
    }
  return cv.toDataURL();
}

export function spriteUrl(id: string, palette?: Record<string, string>, flip = false): string {
  const key = `s:${id}:${palette ? JSON.stringify(palette) : ''}:${flip ? 1 : 0}`;
  let url = cache.get(key);
  if (!url) {
    const def = SPRITES[id] ?? SPRITES.slime;
    url = rasterize(def.rows, { ...BASE_PALETTE, ...(def.palette ?? {}), ...(palette ?? {}) }, true, flip);
    cache.set(key, url);
  }
  return url;
}

export function spriteSize(id: string): { w: number; h: number } {
  const def = SPRITES[id] ?? SPRITES.slime;
  return { w: Math.max(...def.rows.map((r) => r.length)) + 2, h: def.rows.length + 2 };
}

export function iconUrl(id: string, tint = '#c3c8d4', outline = true): string {
  const key = `i:${id}:${tint}:${outline ? 1 : 0}`;
  let url = cache.get(key);
  if (!url) {
    url = rasterize(iconRows(id), { ...BASE_PALETTE, a: tint, b: shade(tint, -0.35), c: shade(tint, 0.5) }, outline);
    cache.set(key, url);
  }
  return url;
}

/** <img> markup for inline use in templates */
export function iconImg(id: string, tint?: string, cls = 'ico'): string {
  return `<img class="${cls}" src="${iconUrl(id, tint)}" alt="" draggable="false">`;
}

/* ------------------------------------------------------------ backgrounds */

interface Theme {
  wall: string;
  wall2: string;
  mortar: string;
  floor: string;
  floor2: string;
  accent: string;
  sky: string;
}

export const ACT_THEMES: Record<number, Theme> = {
  1: { wall: '#3b3140', wall2: '#2e2633', mortar: '#1d1622', floor: '#4a3b35', floor2: '#3a2e29', accent: '#ffb347', sky: '#150f1a' },
  2: { wall: '#1f3a4a', wall2: '#172c38', mortar: '#0d1a22', floor: '#27404a', floor2: '#1d323a', accent: '#6fe3ff', sky: '#08141c' },
  3: { wall: '#4a2622', wall2: '#381c19', mortar: '#1f0d0b', floor: '#3e2a26', floor2: '#2f1f1c', accent: '#ff6a2a', sky: '#1a0806' },
};

/** Procedurally painted pixel-art backdrop for battles. */
export function battleBackdrop(act: number, seed = 1): string {
  const key = `bg:${act}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const th = ACT_THEMES[act] ?? ACT_THEMES[1];
  const W = 160;
  const H = 90;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // wall bricks
  g.fillStyle = th.mortar;
  g.fillRect(0, 0, W, H);
  const bh = 6;
  for (let y = 0; y < 62; y += bh) {
    const off = (y / bh) % 2 ? 6 : 0;
    for (let x = -off; x < W; x += 12) {
      g.fillStyle = rnd() < 0.5 ? th.wall : th.wall2;
      g.fillRect(x + 1, y + 1, 11, bh - 1);
      if (rnd() < 0.12) {
        g.fillStyle = th.mortar;
        g.fillRect(x + 3 + Math.floor(rnd() * 6), y + 2, 1, 2);
      }
    }
  }
  // arches / decorations per act
  if (act === 1) {
    for (const ax of [20, 80, 140]) {
      g.fillStyle = '#120c16';
      g.fillRect(ax - 9, 14, 18, 48);
      g.beginPath();
      g.arc(ax, 14, 9, Math.PI, 0);
      g.fill();
      g.fillStyle = '#2a1f2e';
      for (let i = 0; i < 4; i++) g.fillRect(ax - 7 + i * 4, 20, 1, 42);
    }
    for (const tx of [50, 110]) torch(g, tx, 22, th.accent);
  } else if (act === 2) {
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(rnd() * W);
      const h = 6 + Math.floor(rnd() * 14);
      crystal(g, x, 62 - 0, h, rnd() < 0.5 ? '#6fe3ff' : '#b38cff');
    }
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rnd() * W);
      const h = 4 + Math.floor(rnd() * 10);
      g.fillStyle = '#0d1a22';
      g.fillRect(x, 0, 3, h);
      g.fillRect(x + 1, h, 1, 3);
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const x = 10 + i * 34;
      g.fillStyle = '#1f0d0b';
      g.fillRect(x, 10, 12, 52);
      g.fillStyle = '#5a2a22';
      g.fillRect(x + 1, 10, 10, 2);
    }
    for (const tx of [30, 95, 150]) torch(g, tx, 20, th.accent);
    for (let i = 0; i < 20; i++) {
      g.fillStyle = rnd() < 0.5 ? '#ff6a2a' : '#ffcf5a';
      g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 60), 1, 1);
    }
  }
  // floor
  for (let y = 62; y < H; y += 4) {
    const off = ((y - 62) / 4) % 2 ? 5 : 0;
    for (let x = -off; x < W; x += 10) {
      g.fillStyle = rnd() < 0.5 ? th.floor : th.floor2;
      g.fillRect(x, y, 9, 3);
    }
  }
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const url = cv.toDataURL();
  cache.set(key, url);
  return url;
}

function torch(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const glow = g.createRadialGradient(x, y, 1, x, y, 18);
  glow.addColorStop(0, color + 'aa');
  glow.addColorStop(1, color + '00');
  g.fillStyle = glow;
  g.fillRect(x - 18, y - 18, 36, 36);
  g.fillStyle = '#5a3820';
  g.fillRect(x - 1, y + 2, 3, 7);
  g.fillStyle = '#ffcf5a';
  g.fillRect(x - 1, y - 2, 3, 4);
  g.fillStyle = '#ff8a2a';
  g.fillRect(x, y - 4, 1, 3);
}

function crystal(g: CanvasRenderingContext2D, x: number, base: number, h: number, color: string): void {
  g.fillStyle = color;
  for (let i = 0; i < h; i++) {
    const w = Math.max(1, Math.floor((h - i) / 3));
    g.fillRect(x - Math.floor(w / 2), base - i, w, 1);
  }
  g.fillStyle = '#ffffff88';
  g.fillRect(x, base - h + 2, 1, Math.floor(h / 2));
}

/** Tiny pixel art used behind the title screen */
export function titleBackdrop(): string {
  return battleBackdrop(1, 7);
}
