const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.Wuxing3D);
   await page.click('#open-menu-button');await page.click('[data-map="wuxingchi"]');await page.click('#map-next-button');await page.click('#enter-button');
   await page.waitForTimeout(400);await page.evaluate(()=>WuxingGame.state.nextWaveReadyAt=10000);
   const slots=await page.evaluate(()=>WuxingGame.getMap().slots.map((slot,i)=>{
    const p=Wuxing3D.projectSlot(i),hit=Wuxing3D.input(p.x,p.y),target=document.elementFromPoint(p.x,p.y);
    return {i,error:Math.hypot(hit.x-slot[0]*WuxingGame.state.width,hit.y-slot[1]*WuxingGame.state.height),canvas:target?.id==='game-canvas'};
   }));assert(slots.every(s=>s.error<1&&s.canvas),JSON.stringify(slots));
   const point=await page.evaluate(()=>Wuxing3D.projectSlot(0));
   assert(point.x>0&&point.x<viewport.width&&point.y>44&&point.y<viewport.height-65);
   await page.mouse.click(point.x,point.y);assert.equal(await page.evaluate(()=>WuxingGame.state.pendingBuildSlot),0);
   await page.click('.tower-card[data-element="metal"]');await page.mouse.click(point.x,point.y);
   assert.equal(await page.evaluate(()=>WuxingGame.state.towers.length),1);
   await page.mouse.click(point.x,point.y);await page.click('#upgrade-button');
   const panel=await page.locator('#selection-panel').boundingBox();assert(panel.x>=0&&panel.x+panel.width<=viewport.width,'detail panel inside viewport');
   await page.screenshot({path:`artifacts/three-selected-${viewport.width}.png`});
   assert.equal(await page.evaluate(()=>WuxingGame.state.towers[0].level),2);
   await page.mouse.click(10,viewport.height-10);await page.click('#wave-mini-card');await page.click('#wave-button');
   await page.waitForTimeout(2000);
   await page.screenshot({path:`artifacts/three-battle-${viewport.width}.png`});
   assert.equal(errors.length,0,errors.join('\n'));
   const before=await page.locator('#three-canvas').screenshot();await page.waitForTimeout(250);const after=await page.locator('#three-canvas').screenshot();assert(!before.equals(after),'3D scene moves');
   const stats=await page.evaluate(()=>Wuxing3D.stats());assert(stats.geometries>10);assert.equal(errors.length,0,errors.join('\n'));
   const sharp=require('sharp');const {channels}=await sharp(before).stats();assert(channels.slice(0,3).some(c=>c.stdev>15),'canvas contains varied nonblank pixels');
   await page.evaluate(()=>{const s=WuxingGame.state;s.paused=true;const template=s.towers[0];s.selectedTower=null;
    s.towers=['metal','wood','water','fire','earth'].map((element,i)=>({...template,element,slot:[0,2,6,10,13][i],level:3,hp:175,maxHp:175}));});
   await page.waitForTimeout(400);await page.screenshot({path:`artifacts/three-elements-${viewport.width}.png`});
   await page.evaluate(()=>{const s=WuxingGame.state;const template=s.towers[0];const pairs=[['wood','fire'],['wood','earth'],['metal','wood'],['wood','water'],['fire','earth'],['metal','fire'],['water','fire'],['metal','earth'],['water','earth'],['metal','water']];s.towers=pairs.map((pair,i)=>({...template,element:pair[0],secondary:pair[1],slot:i,level:3,hp:175,maxHp:175}));});
   await page.waitForTimeout(500);await page.screenshot({path:`artifacts/three-fusions-${viewport.width}.png`});
   assert.equal(errors.length,0,errors.join('\n'));
   console.log('PASS',viewport,stats);await page.close();
  }
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4173/?renderer=canvas');await page.waitForFunction(()=>window.Wuxing3D);assert.equal(await page.evaluate(()=>document.body.classList.contains('three-ready')),false);await page.close();console.log('PASS Canvas fallback');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
