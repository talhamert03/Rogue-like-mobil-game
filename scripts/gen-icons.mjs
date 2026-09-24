// Renders the app icon / splash screens from the game's own pixel-art renderer.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const res = 'android/app/src/main/res';
const pngSize = (f) => {
  const b = fs.readFileSync(f);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.env.URL ?? 'http://localhost:5173/');
await page.waitForFunction(() => !!window.__gfx);

async function render(kind, w, h) {
  return page.evaluate(
    async ([kind, w, h]) => {
      const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const g = window.__gfx;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      const S = Math.min(w, h);
      const drawIcon = async (cx, cy, size, withBg, round) => {
        if (withBg) {
          const grd = c.createRadialGradient(cx, cy - size * 0.1, size * 0.05, cx, cy, size * 0.75);
          grd.addColorStop(0, '#4a2d6e'); grd.addColorStop(1, '#140c1c');
          c.fillStyle = grd;
          c.beginPath();
          if (round) c.arc(cx, cy, size / 2, 0, Math.PI * 2);
          else c.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.18);
          c.fill();
        }
        // card
        const cw = size * 0.46, ch = size * 0.62;
        c.save();
        c.translate(cx, cy);
        c.rotate(-0.12);
        c.fillStyle = '#140c1c'; c.fillRect(-cw / 2 - size * 0.02, -ch / 2 - size * 0.02, cw + size * 0.04, ch + size * 0.04);
        c.fillStyle = '#f5d442'; c.fillRect(-cw / 2, -ch / 2, cw, ch);
        c.fillStyle = '#5e3494'; c.fillRect(-cw / 2 + size * 0.025, -ch / 2 + size * 0.025, cw - size * 0.05, ch - size * 0.05);
        const sword = await load(g.iconUrl('sword', '#c3c8d4'));
        const shield = await load(g.iconUrl('shield', '#d9534f'));
        const s = size * 0.34;
        c.drawImage(sword, -s * 0.52, -s * 0.72, s * 1.15, s * 1.15);
        c.drawImage(shield, -s * 0.62, s * 0.02, s * 0.62, s * 0.62);
        const gem = await load(g.iconUrl('crystal', '#8fe3ff'));
        c.drawImage(gem, -cw / 2 - size * 0.04, -ch / 2 - size * 0.06, size * 0.16, size * 0.16);
        c.restore();
      };
      if (kind === 'icon') await drawIcon(w / 2, h / 2, S, true, false);
      if (kind === 'round') await drawIcon(w / 2, h / 2, S, true, true);
      if (kind === 'fg') await drawIcon(w / 2, h / 2, S * 0.62, false, false);
      if (kind === 'splash') {
        c.fillStyle = '#120c18'; c.fillRect(0, 0, w, h);
        await drawIcon(w / 2, h * 0.44, S * 0.36, true, false);
        c.fillStyle = '#ffe08a';
        c.font = `bold ${Math.round(S * 0.085)}px monospace`;
        c.textAlign = 'center';
        c.fillText('DECKDELVER', w / 2, h * 0.44 + S * 0.3);
      }
      return cv.toDataURL('image/png');
    },
    [kind, w, h],
  );
}

async function write(file, kind, w, h) {
  const url = await render(kind, w, h);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', file, w, h);
}

for (const dir of fs.readdirSync(res)) {
  const full = path.join(res, dir);
  for (const f of fs.existsSync(full) ? fs.readdirSync(full) : []) {
    const file = path.join(full, f);
    if (!f.endsWith('.png')) continue;
    const [w, h] = pngSize(file);
    if (f === 'ic_launcher.png') await write(file, 'icon', w, h);
    else if (f === 'ic_launcher_round.png') await write(file, 'round', w, h);
    else if (f === 'ic_launcher_foreground.png') await write(file, 'fg', w, h);
    else if (f === 'splash.png') await write(file, 'splash', w, h);
  }
}
await write('public/icon-192.png', 'icon', 192, 192);
await write('public/icon-512.png', 'icon', 512, 512);
await browser.close();
