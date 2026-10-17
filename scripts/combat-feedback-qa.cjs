const { chromium } = require('playwright-core');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-webgl'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
    await page.locator('#open-menu-button').click();
    await page.locator('#map-next-button').click();
    await page.locator('#origin-choices [data-element="metal"]').click();
    await page.locator('#enter-button').click();
    await page.locator('body.in-battle').waitFor();
    await page.waitForTimeout(600);

    await page.evaluate(() => {
      const state=window.WuxingGame.state,map=window.WuxingGame.getMap(),slot=map.slots[0];
      let best={progress:0,distance:Infinity};
      for(let index=0;index<=200;index++){
        const progress=index/200,point=window.GameWorld.pointAt(map,0,progress,state.width,state.height);
        const distance=Math.hypot(point.x-slot[0]*state.width,point.y-slot[1]*state.height);
        if(distance<best.distance)best={progress,distance};
      }
      state.towers.push({slot:0,element:'metal',secondary:null,level:3,hp:140,maxHp:140,cooldown:0,burnUntil:0,invested:200,shotCount:0});
      state.enemies.push({element:'wood',elite:true,boss:false,hp:900,maxHp:900,progress:best.progress,speed:0,route:0,slowUntil:0,rootUntil:0,frozenUntil:0,healBlockedUntil:0,poisonUntil:0,poisonStacks:0,shield:0,dashed:false,vulnerableUntil:0,burningUntil:0,burningDps:0,bogTime:0,mudTime:0,zoneTickAt:0,casting:false,nextSkillAt:state.time+2.5,x:0,y:0,dead:false});
    });

    await page.waitForFunction(() => window.WuxingGame.state.effects.some(effect => effect.kind==='damage'&&effect.counter), null, { timeout: 5000 });
    const artifact=path.resolve(__dirname,'..','artifacts','combat-feedback.png');fs.mkdirSync(path.dirname(artifact),{recursive:true});
    await page.screenshot({path:artifact});
    const feedback = await page.evaluate(() => {
      const canvas=document.querySelector('#combat-feedback-canvas'),context=canvas.getContext('2d');
      const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
      let visible=0;for(let index=3;index<pixels.length;index+=4)if(pixels[index])visible++;
      return {visible,events:window.WuxingGame.state.effects.filter(effect=>effect.kind==='damage').map(effect=>({counter:effect.counter,value:effect.value}))};
    });
    assert(feedback.visible>20, 'combat feedback canvas must render visible pixels');
    assert(feedback.events.some(event=>event.counter&&event.value>0), 'counter hit must expose damage feedback');
    await page.evaluate(()=>{const state=window.WuxingGame.state,enemy=state.enemies.find(item=>item.elite);state.towers.forEach(tower=>tower.cooldown=99);enemy.hp=enemy.maxHp=99999;enemy.casting=true;enemy.nextSkillAt=state.time+.8;});
    await page.waitForTimeout(80);
    assert(await page.evaluate(()=>window.WuxingGame.state.enemies.some(enemy=>enemy.casting)),'elite warning state must remain visible before release');
    assert.equal(await page.locator('#combat-feedback-canvas').evaluate(node => getComputedStyle(node).pointerEvents), 'none', 'feedback must not block touch');
    console.log(JSON.stringify(feedback));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode=1;
});
