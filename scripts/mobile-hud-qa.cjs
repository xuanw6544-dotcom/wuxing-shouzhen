const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const viewports = [
  [1280, 720],
  [1600, 720],
  [1890, 810],
  [844, 390],
];

async function enterBattle(page) {
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
  await page.locator('#open-menu-button').click();
  await page.locator('#map-next-button').click();
  await page.locator('#origin-choices [data-element="fire"]').click();
  await page.locator('#enter-button').click();
  await page.locator('body.in-battle').waitFor();
  await page.waitForTimeout(1200);
}

async function main() {
  const output = path.resolve(__dirname, '..', 'artifacts', 'mobile-hud');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--allow-file-access-from-files'],
  });
  const report = [];

  try {
    for (const [width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await enterBattle(page);

      const metrics = await page.evaluate(() => {
        const rect = selector => {
          const box = document.querySelector(selector).getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
        };
        const dock = rect('.bottom-dock');
        const topbar = rect('.topbar');
        const battlefield = rect('.battlefield');
        return {
          viewport: { width: innerWidth, height: innerHeight },
          document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
          dock,
          topbar,
          battlefield,
          dockRatio: dock.height / innerHeight,
          battlefieldRatio: battlefield.height / innerHeight,
          controls: ['#pause-button', '#wave-mini-card', '.resources', '.brand-block'].map(selector => ({ selector, ...rect(selector) })),
          canvas: rect('#game-canvas'),
        };
      });
      console.log('metrics', width, height, JSON.stringify(metrics));

      assert.equal(metrics.document.width, width, 'page must not scroll horizontally');
      assert.equal(metrics.document.height, height, 'page must not scroll vertically');
      assert.equal(metrics.battlefield.width, width, 'battlefield must fill viewport width');
      assert.equal(metrics.battlefield.height, height, 'battlefield must fill viewport height');
      assert(metrics.dockRatio <= 0.19, `dock is too tall: ${metrics.dockRatio}`);
      assert(metrics.battlefieldRatio >= 0.99, 'battlefield must be the full-screen visual layer');
      for (const control of metrics.controls) {
        assert(control.x >= 0 && control.y >= 0 && control.right <= width && control.bottom <= height, `${control.selector} leaves viewport`);
      }
      assert.equal(errors.length, 0, `page errors: ${errors.join('; ')}`);

      await page.screenshot({ path: path.join(output, `battle-${width}x${height}.png`) });
      const slot = await page.evaluate(() => window.Wuxing3D.projectSlot(0));
      await page.mouse.click(slot.x, slot.y);
      await page.locator('.tower-card[data-element="fire"]').click({ force: true });
      await page.mouse.click(slot.x, slot.y);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => window.WuxingGame.state.towers.length), 1, 'touch path must build a tower');

      await page.mouse.click(slot.x, slot.y);
      await page.locator('#selection-panel:not(.hidden)').waitFor();
      await page.locator('#upgrade-button').click({ force: true });
      assert.equal(await page.evaluate(() => window.WuxingGame.state.towers[0].level), 2, 'tower upgrade must remain available');
      await page.locator('#sell-button').click({ force: true });
      assert.equal(await page.evaluate(() => window.WuxingGame.state.towers.length), 0, 'tower sell must remain available');

      report.push(metrics);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.map(item => ({ viewport: item.viewport, dockRatio: item.dockRatio, battlefieldRatio: item.battlefieldRatio })), null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
