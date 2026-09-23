const { chromium } = require('playwright-core');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

async function main() {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'artifacts');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true, args: ['--disable-gpu']
  });
  const errors = [];
  try {
    for (const [width,height] of [[1280,720],[844,390],[720,360]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        window.__audioQA = { context: null, master: null, analyser: null, tones: 0 };
        const NativeAudioContext = window.AudioContext;
        window.AudioContext = new Proxy(NativeAudioContext, {
          construct(Target,args) {
            const context = new Target(...args); window.__audioQA.context = context;
            const gain = context.createGain.bind(context), oscillator = context.createOscillator.bind(context);
            context.createGain = () => { const node=gain(); if(!window.__audioQA.master)window.__audioQA.master=node; return node; };
            context.createOscillator = () => { window.__audioQA.tones++; return oscillator(); };
            return context;
          }
        });
      });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      const homeCanvas=page.locator('#home-canvas');
      await homeCanvas.waitFor();
      await page.waitForTimeout(100);
      const homePixels=await homeCanvas.evaluate(c=>{
        const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();
        for(let i=0;i<d.length;i+=64)colors.add(`${d[i]},${d[i+1]},${d[i+2]}`);
        return colors.size;
      });
      assert(homePixels>50,'home sanctuary renders');
      const homeFrame=await homeCanvas.screenshot();await page.waitForTimeout(250);
      assert(!homeFrame.equals(await homeCanvas.screenshot()),'home scene animates');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'home fits viewport');
      assert(await page.locator('#map-step').isHidden(),'map setup is not shown on first screen');
      assert(await page.locator('#origin-step').isHidden(),'origin setup is not shown on first screen');
      await page.screenshot({ path: path.join(output, `landing-${width}.png`) });
      assert(await page.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth > 0)), 'portraits must load');
      assert.equal(await page.evaluate(() => window.__audioQA.context), null, 'no autoplay before user gesture');
      await page.locator('#open-menu-button').click();
      assert(await page.locator('#map-step').isVisible(),'map setup follows landing');
      await page.screenshot({ path: path.join(output, `maps-${width}.png`) });
      await page.locator('#map-next-button').click();
      await page.locator('.origin-choices .element-art').first().waitFor();
      assert(await page.locator('#origin-step').isVisible(),'origin setup follows map setup');
      await page.screenshot({ path: path.join(output, `origin-${width}.png`) });
      await page.locator('#origin-choices [data-element="water"]').click();
      await page.locator('#enter-button').click();
      assert.equal(await page.locator('#element-inventory > *').count(),6,'element warehouse has six slots');
      await page.locator('#sound-button').click();
      for (const [name,value] of [['master','62'],['music','18'],['effects','43']]) await page.locator(`#volume-${name}`).fill(value);
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => window.__audioQA.context.state), 'running', 'user gesture unlocks audio');
      assert(await page.evaluate(() => window.__audioQA.tones > 0), 'music schedules tones');
      const signal = await page.evaluate(async () => {
        const {context,master}=window.__audioQA;
        const analyser=context.createAnalyser();master.connect(analyser);window.__audioQA.analyser=analyser;
        let peak=0;
        for(let i=0;i<12;i++){
          await new Promise(resolve=>setTimeout(resolve,100));
          const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
          peak=Math.max(peak,...samples.map(Math.abs));
        }
        return peak;
      });
      assert(signal>0.00001, 'music produces an actual audio signal');
      await page.locator('#sound-muted').check();
      await page.waitForTimeout(300);
      assert(await page.evaluate(() => window.__audioQA.master.gain.value < .001), 'mute silences master gain');
      await page.screenshot({ path: path.join(output, `audio-${width}.png`), fullPage: true });
      assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('wuxing.audio.v1'))).effects,43);
      await page.reload();
      await page.locator('#open-menu-button').click();
      await page.locator('#map-next-button').click();
      await page.locator('#origin-choices [data-element="water"]').click();
      await page.locator('#enter-button').click();
      await page.locator('#sound-button').click();
      assert.equal(await page.locator('#volume-music').inputValue(),'18','music volume persists across reload');
      assert(await page.locator('#sound-muted').isChecked(),'mute persists');
      await page.locator('#sound-muted').uncheck();
      await page.keyboard.press('Escape');
      const canvas = page.locator('#game-canvas');
      const box = await canvas.boundingBox();
      for (const [x,y] of [[.09,.47],[.28,.47],[.5,.58]]) {
        await page.locator('.tower-card.water').click();
        await page.mouse.click(box.x+x*box.width, box.y+y*box.height);
      }
      await page.locator('#wave-button').click();
      await page.waitForTimeout(4500);
      await page.screenshot({ path: path.join(output, `battle-${width}.png`), fullPage: true });
      const pixels = await canvas.evaluate(c => {
        const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        const colors = new Set(); for(let i=0;i<d.length;i+=64) colors.add(`${d[i]},${d[i+1]},${d[i+2]}`);
        return colors.size;
      });
      assert(pixels > 100, 'battlefield must have rendered detail');
      const beforeMotion=await canvas.screenshot();
      await page.waitForTimeout(250);
      assert(!beforeMotion.equals(await canvas.screenshot()), 'battlefield animation advances');
      await page.mouse.click(box.x+.28*box.width,box.y+.47*box.height);
      await page.screenshot({ path: path.join(output, `selection-${width}.png`), fullPage: true });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
      const clipped = await page.locator('button:visible').evaluateAll(buttons => buttons.filter(b => b.scrollWidth>b.clientWidth+2 || b.scrollHeight>b.clientHeight+2).map(b=>b.textContent));
      assert.deepEqual(clipped, [], 'buttons must fit their labels');
      await page.close();
    }
    const portrait=await browser.newPage({viewport:{width:390,height:844}});
    await portrait.goto(pathToFileURL(path.join(root,'index.html')).href);
    assert(await portrait.locator('.rotate-notice').isVisible(),'portrait requests landscape orientation');
    await portrait.screenshot({path:path.join(output,'rotate-390.png')});
    await portrait.close();
    const sheet = await browser.newPage({ viewport: { width: 1160, height: 1000 } });
    sheet.on('pageerror',e=>errors.push(e.message));
    await sheet.goto(pathToFileURL(path.join(root,'index.html')).href);
    await sheet.evaluate(() => {
      const canvas=document.createElement('canvas');canvas.width=1160;canvas.height=1000;
      document.body.replaceChildren(canvas);document.body.style.cssText='padding:0;margin:0;background:#193a3c';
      const c=canvas.getContext('2d');c.fillStyle='#193a3c';c.fillRect(0,0,1160,1000);
      c.fillStyle='#efe3bc';c.font='bold 28px Microsoft YaHei';c.fillText('五行守阵 · 灵器与元素造物',45,48);
      const kinds=['metal','wood','water','fire','earth','thunder','bog','spike','mist','lava','blade','steam','rock','mud','ice'];
      const names=['金锋 · 悬剑台','青藤 · 灵树','玄水 · 环水坛','赤焰 · 丹炉','厚土 · 镇岳碑','木火 · 雷霆','木土 · 腐沼','金木 · 锋木','木水 · 雾林','火土 · 熔岩','金火 · 熔刃','水火 · 蒸汽','金土 · 重岩','水土 · 泥沼','金水 · 寒冰'];
      kinds.forEach((kind,i)=>{const x=116+(i%5)*230,y=155+Math.floor(i/5)*180;ElementArt.tower(c,kind,x,y,48,1.2,3);c.fillStyle='#d3e3cc';c.font='14px Microsoft YaHei';c.textAlign='center';c.fillText(names[i],x,y+73);});
      ['metal','wood','water','fire','earth'].forEach((kind,i)=>{
        const x=116+i*230;ElementArt.enemy(c,kind,x-35,706,23,1,false,false);ElementArt.enemy(c,kind,x+36,706,28,1,true,false);
        ElementArt.enemy(c,kind,x,876,37,1,true,true);c.fillStyle='#d3e3cc';c.font='13px Microsoft YaHei';c.fillText(['金甲','木灵','水侍','焰灵','岩卫'][i]+' · 精英 / 王',x,963);
      });
    });
    await sheet.screenshot({ path: path.join(output, 'art-roster.png') });
    assert.deepEqual(errors, [], 'browser errors');
    console.log('PASS: staged landing/map/origin flow, 1280/844/720 landscape layouts, portrait rotation notice, gameplay, moving canvas, audio and persisted volumes.');
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
