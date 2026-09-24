import { test, expect, type Page } from '@playwright/test';

async function fresh(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('Yeni Macera')).toBeVisible();
}

async function startRun(page: Page, classIndex = 0) {
  await page.getByText('Yeni Macera').click();
  await page.getByText('Klasik', { exact: true }).click();
  await page.locator('.class-tab').nth(classIndex).click();
  await page.getByText('Maceraya Atıl').click();
  await expect(page.locator('.mapview')).toBeVisible();
}

/** Play the current battle through the UI until it ends. */
async function playBattle(page: Page) {
  const hint = page.locator('.hint-box .btn');
  if (await hint.count()) await hint.click();
  for (let turn = 0; turn < 40; turn++) {
    if (!(await page.locator('.battle').count())) return;
    // wait for input to be accepted
    await page.waitForFunction(() => {
      const w = window as unknown as { __app: { battle: { busy: boolean } | null } };
      return !w.__app.battle || !w.__app.battle.busy;
    });
    if (!(await page.locator('.battle').count())) return;
    let played = 0;
    for (let i = 0; i < 8; i++) {
      const cards = page.locator('.hand .card.playable');
      if (!(await cards.count())) break;
      await cards.first().click({ force: true });
      const target = page.locator('.unit.targetable');
      const tile = page.locator('.tile.target');
      if (await target.count()) await target.first().click({ force: true });
      else if (await tile.count()) await tile.first().click({ force: true });
      else await page.locator('.hand .card.selected').click({ force: true }).catch(() => {});
      await page.waitForFunction(() => {
        const w = window as unknown as { __app: { battle: { busy: boolean } | null } };
        return !w.__app.battle || !w.__app.battle.busy;
      });
      if (!(await page.locator('.battle').count())) return;
      played++;
      // walk toward enemies if nothing is in range
      const walk = page.locator('.tile.walk');
      if ((await walk.count()) && !(await page.locator('.hand .card.playable').count())) break;
    }
    // try to move closer to enemies with remaining movement
    const walk = page.locator('.tile.walk');
    if (await walk.count()) await walk.last().click({ force: true });
    await page.waitForTimeout(100);
    if (!(await page.locator('.battle').count())) return;
    await page.getByText('Turu Bitir').click({ force: true });
    void played;
  }
}

test('title, menus and settings render without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await fresh(page);
  for (const label of ['Kamp', 'Kütüphane', 'İstatistikler', 'Ayarlar', 'Nasıl Oynanır']) {
    await page.getByText(label, { exact: true }).click();
    await expect(page.locator('.header h2')).toBeVisible();
    if (label === 'Kütüphane') {
      for (const tab of ['Tılsımlar', 'İksirler', 'Canavarlar', 'Kartlar']) await page.getByText(tab, { exact: true }).click();
    }
    await page.locator('.header .iconbtn').first().click();
  }
  // language switch
  await page.getByText('Ayarlar', { exact: true }).click();
  await page.getByText('English', { exact: true }).click();
  await page.locator('.header .iconbtn').first().click();
  await expect(page.getByText('New Adventure')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a full battle can be played through the UI and rewards collected', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await fresh(page);
  await startRun(page, 1);
  await page.locator('.mnode.avail').first().click({ force: true });
  await expect(page.locator('.battle')).toBeVisible();
  await playBattle(page);
  // either won (reward) or lost (end screen)
  const reward = page.locator('.reward-item');
  if (await reward.count()) {
    await reward.first().click();
    const cardReward = page.getByText('Destene bir kart ekle');
    if (await cardReward.count()) {
      await cardReward.click();
      await page.locator('.modal .card').first().click();
    }
    await page.getByText('Devam', { exact: true }).click();
    await expect(page.locator('.mapview')).toBeVisible();
  } else {
    await expect(page.locator('.endscreen')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('every room screen renders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await fresh(page);
  await startRun(page, 0);
  const force = async (fn: string) => {
    await page.evaluate((fn) => {
      const w = window as unknown as { __app: any; __dd: any };
      const app = w.__app;
      const run = app.run;
      const dd = w.__dd;
      if (fn === 'shop') {
        run.map.nodes[0].type = 'shop';
        dd.enterNode(run, run.map.nodes.filter((n: any) => n.row === 0)[0].id, app.profile);
      } else if (fn === 'event') {
        // "unknown" rooms can also roll a surprise fight or treasure; retry until we get an event
        for (let i = 0; i < 20 && run.screen !== 'event'; i++) {
          run.combat = null;
          dd.startEvent(run, app.profile);
        }
      }
      else if (fn === 'rest') {
        run.rest = { done: false };
        run.screen = 'rest';
      } else if (fn === 'treasure') {
        run.treasure = { relic: 'oldBuckler', gold: 30, opened: false };
        run.screen = 'treasure';
      } else if (fn === 'boss') dd.startCombat(run, 'a3_b_dragon');
      app.renderRun();
    }, fn);
    await page.waitForTimeout(400);
  };
  await force('rest');
  await expect(page.getByText('Kamp Ateşi').first()).toBeVisible();
  await page.getByText('Dinlen', { exact: true }).click();
  await force('treasure');
  await page.getByText('Sandığı Aç').click();
  await expect(page.getByText('Eski Kalkan')).toBeVisible();
  await force('event');
  await expect(page.locator('.event-opt').first()).toBeVisible();
  await page.locator('.event-opt').last().click();
  await force('boss');
  await expect(page.locator('.battle')).toBeVisible();
  await page.screenshot({ path: 'test-results/boss.png' });
  expect(errors).toEqual([]);
});

test('a run in the middle of combat survives a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await fresh(page);
  await startRun(page, 2);
  await page.locator('.mnode.avail').first().click({ force: true });
  await expect(page.locator('.battle')).toBeVisible();
  const hint = page.locator('.hint-box .btn');
  if (await hint.count()) await hint.click();
  const before = await page.evaluate(() => {
    const w = window as unknown as { __app: { run: { combat: { units: { uid: number; hp: number; pos: number }[]; hand: unknown[] } } } };
    const c = w.__app.run.combat;
    return { units: c.units.map((u) => `${u.uid}:${u.hp}:${u.pos}`).join(','), hand: c.hand.length };
  });
  await page.reload();
  await page.getByText('Devam Et').click();
  await expect(page.locator('.battle')).toBeVisible();
  const after = await page.evaluate(() => {
    const w = window as unknown as { __app: { run: { combat: { units: { uid: number; hp: number; pos: number }[]; hand: unknown[] } } } };
    const c = w.__app.run.combat;
    return { units: c.units.map((u) => `${u.uid}:${u.hp}:${u.pos}`).join(','), hand: c.hand.length };
  });
  expect(after).toEqual(before);
  await expect(page.locator('.hand .card')).toHaveCount(before.hand);
  expect(errors).toEqual([]);
});
