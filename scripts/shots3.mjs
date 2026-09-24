import { chromium } from '@playwright/test';
const out = process.env.SHOTS;
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'tr-TR', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByText('Yeni Macera').click();
await page.getByText('Klasik', { exact: true }).click();
await page.locator('.class-tab').nth(Number(process.env.CLS ?? 2)).click();
await page.getByText('Maceraya Atıl').click();
await page.waitForTimeout(300);
const force = async (fn, arg) => {
  await page.evaluate(([fn, arg]) => {
    const { __app: app, __dd: dd } = window;
    const run = app.run;
    app.profile.tutorial.combat = true;
    if (fn === 'combat') dd.startCombat(run, arg);
    if (fn === 'shop') { const n = run.map.nodes.filter((n) => n.row === 0)[0]; n.type = 'shop'; dd.enterNode(run, n.id, app.profile); }
    if (fn === 'event') { dd.startEvent(run, app.profile); if (run.screen !== 'event') dd.startEvent(run, app.profile); }
    if (fn === 'reward') { const c = dd.getCombat(run); for (const e of c.enemies()) c.dealDamage(c.hero, e, 999, { attack: true }); dd.finishCombat(run, app.profile); }
    app.renderRun();
  }, [fn, arg]);
  await page.waitForTimeout(1500);
};
for (const enc of (process.env.ENCS ?? 'a3_b_dragon,a1_b_ratKing,a2_e_queen').split(',')) {
  await force('combat', enc);
  await page.screenshot({ path: `${out}/c-${enc}.png` });
}
await force('reward');
await page.screenshot({ path: `${out}/r-reward.png` });
await force('shop');
await page.screenshot({ path: `${out}/r-shop.png` });
await force('event');
await page.screenshot({ path: `${out}/r-event.png` });
console.log('errors', errors);
await browser.close();
