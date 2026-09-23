const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const world = require('../world.js');
const root = path.resolve(__dirname, '..');
for (const map of Object.values(world.maps)) {
  assert.equal(map.slots.length, 8);
  assert.equal(map.routes.length, map.entryNames.length);
  assert.equal(new Set([10,20,30,40,50].map(w=>world.wavePlan(map,w).element)).size,5);
  for(let w=1;w<=60;w++) {
    const p=world.wavePlan(map,w);
    assert.equal(p.count,p.enemies.length);
    assert.equal(p.enemies.filter(e=>e.elite).length,1);
    assert.equal(p.enemies.some(e=>e.boss),w%10===0);
    assert.deepEqual(p.attributes,[...new Set(p.enemies.map(e=>e.element))]);
    p.enemies.forEach(e=>assert(map.routes[e.route]));
  }
  map.routes.forEach((r,i)=>{
    assert.deepEqual(world.pointAt(map,i,0,1000,1000),{x:r[0][0]*1000,y:r[0][1]*1000});
    assert.deepEqual(world.pointAt(map,i,2,1000,1000),{x:r.at(-1)[0]*1000,y:r.at(-1)[1]*1000});
  });
}
const a=world.random('trial'),b=world.random('trial');
for(let i=0;i<100;i++)assert.equal(a(),b());
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu']});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('http://wuxing.test/**',route=>{
      const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
      const file=path.join(root,name);
      if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
      let body=fs.readFileSync(file);
      if(name==='game.js')body=Buffer.from(body.toString().replace(/\}\)\(\);\s*$/, 'window.__qa={state,menu,reset,startWave,update,showHome,showBattle,showLoot,finish,buildTower};})();'));
      return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html'});
    });
    await page.goto('http://wuxing.test/');
    for(const id of Object.keys(world.maps)) {
      await page.locator('#open-menu-button').click();
      await page.locator(`[data-map="${id}"]`).click();
      await page.locator('[data-mode="trial"]').click();
      await page.locator('#map-next-button').click();
      page.once('dialog',d=>d.accept());
      await page.locator('#enter-button').click();
      assert.equal(await page.locator('#field-map-name').textContent(),world.maps[id].name);
      await page.evaluate(()=>{__qa.state.paused=true;__qa.startWave();});
      const routes=await page.evaluate(()=>[...new Set(__qa.state.spawnQueue.map(e=>e.route))]);
      assert.equal(routes.length,world.maps[id].routes.length);
      await page.evaluate(()=>{__qa.state.paused=false;for(let i=0;i<50;i++)__qa.update(.05);__qa.state.paused=true;});
      await page.screenshot({path:path.join(root,'artifacts',`map-${id}.png`),fullPage:true});
      for(const [width,height] of [[844,390],[720,360]]){
        await page.setViewportSize({width,height});
        await page.screenshot({path:path.join(root,'artifacts',`map-${id}-${width}.png`),fullPage:true});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      }
      await page.setViewportSize({width:1280,height:720});
      const snapshot=await page.evaluate(()=>({time:__qa.state.time,count:__qa.state.enemies.length}));
      await page.locator('#home-button').click();await page.waitForTimeout(150);
      assert.deepEqual(await page.evaluate(()=>({time:__qa.state.time,count:__qa.state.enemies.length})),snapshot);
      await page.locator('#resume-button').click();
      assert.equal(await page.evaluate(()=>__qa.state.mapId),id);
      const drops=await page.evaluate(()=>{
        function sample(){__qa.reset();const out=[];for(let i=1;i<=4;i++){__qa.state.wave=i;__qa.showLoot();out.push([...__qa.state.lootOptions]);}return out;}
        return [sample(),sample()];
      });
      assert.deepEqual(drops[0],drops[1]);
      await page.evaluate(()=>{__qa.state.wave=7;__qa.state.kills=30;__qa.finish();__qa.showHome();});
    }
    await page.setViewportSize({width:844,height:390});
    await page.evaluate(()=>{__qa.state.result=false;document.getElementById('result-panel').classList.add('hidden');__qa.showBattle();__qa.showLoot();});
    const lootBox=await page.locator('#loot-panel').boundingBox();
    assert(lootBox&&lootBox.x>=0&&lootBox.x+lootBox.width<=844&&lootBox.height<=346,'loot overlay stays inside the horizontal battlefield');
    assert.equal(await page.locator('#element-inventory > *').count(),6);
    await page.screenshot({path:path.join(root,'artifacts','loot-overlay-844.png')});
    const records=JSON.parse(await page.evaluate(()=>localStorage.getItem('wuxing.records.v1')));
    for(const id of Object.keys(world.maps))assert.equal(records[`${id}:trial`].cleared,7);
    await page.reload();await page.locator('#open-menu-button').click();await page.locator('[data-mode="trial"]').click();
    assert.match(await page.locator('#map-record').textContent(),/7/);
    assert.deepEqual(errors,[]);
    console.log('PASS: 180 wave plans, five Boss elements, routes, deterministic drops, map switching, pause/resume, persistent independent records.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

