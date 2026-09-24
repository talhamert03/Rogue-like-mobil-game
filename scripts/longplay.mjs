// Long UI smoke test: plays many rooms through real clicks and reports page errors.
import { chromium } from '@playwright/test';
const CLS = Number(process.env.CLS ?? 0);
const ROOMS = Number(process.env.ROOMS ?? 18);
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'tr-TR', viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5173/');
await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await page.evaluate(() => { const p = window.__app.profile; p.unlocked = ['warrior','ranger','wizard','assassin','paladin','necromancer','engineer','monk']; p.tutorial.combat = true; });
await page.getByText('Yeni Macera').click();
await page.getByText('Klasik', { exact: true }).click();
await page.locator('.class-tab').nth(CLS).click();
await page.getByText('Maceraya Atıl').click();
const idle = () => page.waitForFunction(() => !window.__app.battle || !window.__app.battle.busy, null, { timeout: 60000 });
const screen = () => page.evaluate(() => window.__app.run?.screen ?? 'none');
const log = [];
for (let step = 0; step < 400 && log.length < ROOMS; step++) {
  const s = await screen();
  if (s === 'none' || s === 'victory' || s === 'defeat') {
    if (await page.locator('.endscreen').count()) { log.push('END'); break; }
  }
  if (s === 'map') {
    const boss = page.locator('.mnode.boss.avail');
    if (await boss.count()) await boss.click({ force: true });
    else {
      const nodes = page.locator('.mnode.avail');
      const n = await nodes.count();
      if (!n) { log.push('no nodes'); break; }
      const pick = nodes.nth(step % n);
      log.push(await pick.getAttribute('data-type'));
      await pick.click({ force: true });
    }
    await page.waitForTimeout(300);
  } else if (s === 'combat') {
    await idle();
    let played = 0;
    for (let i = 0; i < 10; i++) {
      const cards = page.locator('.hand .card.playable');
      if (!(await cards.count()) || (await screen()) !== 'combat') break;
      await cards.first().click({ force: true });
      const target = page.locator('.unit.targetable');
      const tile = page.locator('.tile.target');
      if (await target.count()) await target.first().click({ force: true });
      else if (await tile.count()) await tile.first().click({ force: true });
      else await page.locator('.hand .card.selected').click({ force: true }).catch(() => {});
      await idle();
      played++;
    }
    if ((await screen()) !== 'combat') continue;
    const walk = page.locator('.tile.walk');
    if (await walk.count()) { await walk.last().click({ force: true }); await idle(); }
    if ((await screen()) !== 'combat') continue;
    await page.getByText('Turu Bitir').click({ force: true });
    await page.waitForTimeout(200);
    await idle();
  } else if (s === 'reward') {
    const items = page.locator('.reward-item:not(.taken)');
    const n = await items.count();
    for (let i = 0; i < n; i++) {
      const it = page.locator('.reward-item:not(.taken)').first();
      if (!(await it.count())) break;
      await it.click();
      await page.waitForTimeout(150);
      if (await page.locator('.modal .card').count()) await page.locator('.modal .card').first().click();
      else if (await page.locator('.modal .reward-item').count()) await page.locator('.modal .reward-item').first().click();
      await page.waitForTimeout(150);
      if (await page.locator('.modal-back').count()) await page.locator('.modal .btn.ghost').last().click().catch(() => {});
    }
    await page.getByText('Devam', { exact: true }).click();
  } else if (s === 'shop') {
    const rm = page.locator('.shop-item .round-item').last();
    await rm.click();
    await page.locator('.modal .btn.gold').click({ force: true }).catch(() => {});
    if (await page.locator('.deckgrid .card').count()) {
      await page.locator('.deckgrid .card').first().click();
      await page.locator('.modal .btn.gold').last().click();
    }
    await page.locator('.modal-back').evaluateAll((els) => els.forEach((e) => e.remove()));
    await page.getByText('Dükkândan Ayrıl').click();
  } else if (s === 'rest') {
    const up = page.getByText('Geliştir', { exact: true });
    await up.click();
    if (await page.locator('.deckgrid .card').count()) {
      await page.locator('.deckgrid .card').first().click();
      await page.locator('.modal .btn.gold').last().click();
    }
    await page.waitForTimeout(200);
    await page.locator('.footer .btn').click();
  } else if (s === 'treasure') {
    await page.getByText('Sandığı Aç').click();
    await page.getByText('Devam', { exact: true }).click();
  } else if (s === 'event') {
    const opts = page.locator('.event-opt:not([disabled])');
    await opts.first().click();
    await page.waitForTimeout(250);
    if (await page.locator('.deckgrid .card').count()) {
      await page.locator('.deckgrid .card').first().click();
      await page.locator('.modal .btn.gold').last().click();
    } else if (await page.locator('.modal .card-choice .card').count()) {
      await page.locator('.modal .card-choice .card').first().click();
    }
  }
  await page.waitForTimeout(100);
}
const final = await page.evaluate(() => ({ screen: window.__app.run?.screen, hp: window.__app.run?.hp, floor: window.__app.run?.floor, act: window.__app.run?.act, deck: window.__app.run?.deck.length }));
console.log('rooms:', log.join(' '));
console.log('final:', JSON.stringify(final));
console.log('errors:', errors.length ? errors.join('\n---\n') : 'none');
await browser.close();
