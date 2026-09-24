// Builds the game as ONE self-contained HTML page (code, styles and fonts inlined)
// for publishing as a claude.ai artifact.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'dist-artifact/deckdelver.html';
execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, VITE_TARGET: 'artifact' } });
const dir = 'dist-artifact';
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const cssHref = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"/)[1];
const jsSrc = html.match(/<script type="module"[^>]*src="([^"]+)"/)[1];
let css = fs.readFileSync(path.join(dir, cssHref), 'utf8');
// woff2 -> data URI, drop woff fallbacks
css = css.replace(/,\s*url\([^)]+\.woff\)\s*format\("woff"\)/g, '');
css = css.replace(/url\(([^)]+\.woff2)\)/g, (_, u) => {
  const file = path.join(dir, 'assets', path.basename(u));
  return `url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')})`;
});
const js = fs.readFileSync(path.join(dir, jsSrc), 'utf8').replace(/<\/script/gi, '<\\/script');
const page = `<title>Deckdelver</title>
<meta name="description" content="Deckdelver: mobil roguelike kart zindan RPG'si">
<meta name="theme-color" content="#120c18">
<style>${css}
/* artifact host: it already pads :root for safe areas */
:root{color-scheme:dark;--safe-top:0px;--safe-bottom:0px}
html,body{height:100%;background:#07040a;color:#f1e9ff}
#app{height:100%}
</style>
<div id="app"></div>
<script type="module">${js}</script>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`wrote ${out} (${(page.length / 1024).toFixed(0)} KB)`);
