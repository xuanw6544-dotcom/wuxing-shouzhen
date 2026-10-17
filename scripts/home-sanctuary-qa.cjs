const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'artifacts', 'home-sanctuary');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-webgl']
  });
  try {
    for (const [width, height] of [[1440, 900], [1280, 720], [844, 390], [840, 360], [640, 360]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      const canvas = page.locator('#home-canvas');
      await page.waitForFunction(() => {
        const c = document.getElementById('home-canvas');
        return c.width > 300 && c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data[3] === 255;
      });
      const colorCount = await canvas.evaluate(c => {
        const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const colors = new Set();
        for (let i = 0; i < pixels.length; i += 256) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
        return colors.size;
      });
      assert(colorCount > 500, 'generated scene must render with image detail');
      await page.screenshot({ path: path.join(output, `home-${width}x${height}.png`) });
      const before = await canvas.screenshot();
      await page.waitForTimeout(300);
      assert(!before.equals(await canvas.screenshot()), 'scene has gentle motion');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(150);
      const still = await canvas.screenshot();
      await page.waitForTimeout(120);
      assert(still.equals(await canvas.screenshot()), 'reduced motion freezes scene');
      await page.click('#open-menu-button');
      assert(await page.locator('#map-step').isVisible());
      await page.click('#map-next-button');
      assert(await page.locator('#origin-step').isVisible());
      await page.click('#enter-button');
      await page.locator('body.in-battle').waitFor();
      await page.click('#home-button');
      await page.locator('body.at-home').waitFor();
      assert(await page.locator('#resume-button').isVisible(), 'returning player can resume');
      await page.click('#resume-button');
      await page.locator('body.in-battle').waitFor();
      assert.deepEqual(errors, [], 'menu and gameplay navigation must not error');
      console.log(`PASS home scene and navigation ${width}x${height}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
