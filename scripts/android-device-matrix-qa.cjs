const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const devices = [
  { name: 'classic-16-9', width: 1280, height: 720, left: 0, right: 0 },
  { name: 'waterdrop-19-5-9', width: 780, height: 360, left: 34, right: 12 },
  { name: 'wide-20-9', width: 800, height: 360, left: 38, right: 12 },
  { name: 'ultrawide-21-9', width: 840, height: 360, left: 42, right: 14 },
  { name: 'legacy-low-res', width: 640, height: 360, left: 0, right: 0 },
];

function inside(box, width, height, left = 0, right = 0) {
  return box.x >= left && box.y >= 0 && box.x + box.width <= width - right && box.y + box.height <= height;
}

async function bounds(page, selector) {
  const box = await page.locator(selector).boundingBox();
  assert(box, `${selector} is not visible`);
  return box;
}

async function checkDevice(browser, device) {
  const page = await browser.newPage({ viewport: { width: device.width, height: device.height }, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(({ left, right }) => {
    document.documentElement.style.setProperty('--safe-left', `${left}px`);
    document.documentElement.style.setProperty('--safe-right', `${right}px`);
  }, device);
  await page.waitForTimeout(450);

  const shell = await bounds(page, '.app-shell');
  assert.equal(Math.round(shell.width), device.width, `${device.name}: home width`);
  assert.equal(Math.round(shell.height), device.height, `${device.name}: home height`);
  assert(inside(await bounds(page, '#open-menu-button'), device.width, device.height), `${device.name}: start button clipped`);
  assert(inside(await bounds(page, '.home-title'), device.width, device.height, device.left, device.right), `${device.name}: title enters cutout`);
  assert(inside(await bounds(page, '.hero-seal'), device.width, device.height, device.left, device.right), `${device.name}: seal enters cutout`);

  await page.locator('#open-menu-button').click();
  const mapBack = await bounds(page, '#map-back-button');
  const mapNext = await bounds(page, '#map-next-button');
  assert(inside(mapBack, device.width, device.height, device.left, device.right), `${device.name}: map back clipped ${JSON.stringify(mapBack)}`);
  assert(inside(mapNext, device.width, device.height, device.left, device.right), `${device.name}: map next clipped ${JSON.stringify(mapNext)}`);
  await page.locator('#map-next-button').click();
  assert(inside(await bounds(page, '#enter-button'), device.width, device.height, device.left, device.right), `${device.name}: battle button clipped`);
  await page.locator('#origin-choices [data-element="metal"]').click();
  await page.locator('#enter-button').click();
  await page.waitForTimeout(700);
  for (const selector of ['.brand-block', '.resources', '#wave-mini-card', '#pause-button', '.bottom-dock']) {
    assert(inside(await bounds(page, selector), device.width, device.height, device.left, device.right), `${device.name}: ${selector} clipped`);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), device.width, `${device.name}: horizontal scroll`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), device.height, `${device.name}: vertical scroll`);
  assert.deepEqual(errors, [], `${device.name}: page errors`);
  await page.close();
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-webgl'],
  });
  try {
    for (const device of devices) await checkDevice(browser, device);

    const rotating = await browser.newPage({ viewport: { width: 360, height: 780 }, hasTouch: true });
    await rotating.goto(url);
    await rotating.setViewportSize({ width: 780, height: 360 });
    await rotating.waitForTimeout(500);
    const size = await rotating.locator('.app-shell').boundingBox();
    assert.equal(Math.round(size.width), 780, 'orientation change width');
    assert.equal(Math.round(size.height), 360, 'orientation change height');
    assert(inside(await bounds(rotating, '#open-menu-button'), 780, 360), 'orientation change start button');
    await rotating.close();
  } finally {
    await browser.close();
  }
  console.log(`PASS: ${devices.length} Android viewport profiles and portrait-to-landscape transition.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
