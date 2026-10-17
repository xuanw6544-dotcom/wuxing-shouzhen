const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts', 'map-dais');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-webgl']
  });
  try {
    for (const [width, height] of [[1280, 720], [844, 390], [640, 360]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, attributes) {
          return getContext.call(this, type, type.startsWith('webgl') ? { ...attributes, preserveDrawingBuffer: true } : attributes);
        };
      });
      await page.goto(process.env.GAME_URL || pathToFileURL(path.join(root, 'index.html')).href);
      await page.click('#open-menu-button');
      await page.waitForFunction(() => [...document.querySelectorAll('.map-art')].every(i => i.complete && i.naturalWidth > 0));
      assert.equal(await page.locator('.map-media').count(), 4);
      const mediaHeights = await page.locator('.map-media').evaluateAll(items => items.map(e => e.getBoundingClientRect().height));
      assert(mediaHeights.every(h => h > 60), 'map artwork must occupy visible space inside each card');
      for (const map of ['qinglan', 'shuangxi', 'huihuan', 'wuxingchi']) {
        await page.click(`[data-map="${map}"]`);
        assert.equal(await page.locator(`[data-map="${map}"]`).getAttribute('aria-pressed'), 'true');
      }
      await page.click('[data-map="qinglan"]');
      await page.screenshot({ path: path.join(output, `maps-${width}.png`) });
      await page.click('#map-next-button');
      await page.click('#origin-choices [data-element="metal"]');
      await page.click('#enter-button');
      await page.waitForFunction(() => document.body.classList.contains('dais-ready') && window.Wuxing3D);
      await page.evaluate(() => {
        const s = WuxingGame.state;
        s.paused = true;
        s.inventory = ['wood', 'water', 'fire', 'earth', 'metal', 'wood'].map((element, i) => ({ element, id: 100 + i }));
        document.getElementById('cancel-core-button').click();
      });
      await page.waitForTimeout(900);
      const framing = await page.locator('.dais-canvas').evaluate(c => {
        const gl = c.getContext('webgl2'), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let first = h;
        for (let y = h - 1; y >= 0 && first === h; y--) {
          for (let x = 0; x < w; x++) if (pixels[(y * w + x) * 4 + 3] > 10) { first = h - 1 - y; break; }
        }
        return { first, bufferHeight: h, canvasHeight: c.clientHeight, dockHeight: c.parentElement.clientHeight };
      });
      assert(framing.first > 3 && framing.first < framing.bufferHeight / 2, `tower tops must have a visible transparent margin: ${JSON.stringify(framing)}`);
      assert(framing.canvasHeight > framing.dockHeight, 'canvas extends upward without enlarging dock');
      assert(framing.dockHeight / height < .2, 'dock remains compact');
      await page.screenshot({ path: path.join(output, `warehouse-${width}.png`) });
      const gold = await page.evaluate(() => WuxingGame.state.gold);
      await page.locator('#element-inventory button').first().click();
      await page.click('#sell-core-button');
      assert.equal(await page.evaluate(() => WuxingGame.state.gold), gold + 30);
      assert.equal(await page.locator('#element-inventory button').count(), 5);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
      assert.deepEqual(errors, []);
      console.log('PASS map selection, full-height warehouse models and sale', { width, height, ...framing });
      await page.close();
    }
  } finally { await browser.close(); }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
