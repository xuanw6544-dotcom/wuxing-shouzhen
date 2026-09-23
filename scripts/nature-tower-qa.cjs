const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const sharp=require('sharp');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});try{
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('THREE.WebGLProgram'))errors.push(m.text());});
  for(const kind of ['earth','metal','wood']){
   await page.goto('http://127.0.0.1:4173/nature-tower-preview.html?element='+kind);await page.waitForSelector('canvas');await page.waitForTimeout(200);
   await page.screenshot({path:`artifacts/${kind}-tower-levels-${viewport.width}.png`});
   const a=await page.locator('canvas').screenshot();await page.waitForTimeout(160);assert(!a.equals(await page.locator('canvas').screenshot()));assert((await sharp(a).stats()).channels.some(c=>c.stdev>20));
   await page.selectOption('#level','3');await page.waitForTimeout(80);await page.screenshot({path:`artifacts/${kind}-tower-detail-${viewport.width}.png`});
  }
  await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.Wuxing3D);await page.click('#open-menu-button');await page.click('[data-map="wuxingchi"]');await page.click('#map-next-button');await page.click('#enter-button');
  await page.evaluate(()=>{const s=WuxingGame.state;s.paused=true;s.nextWaveReadyAt=10000;s.gold=1500;s.towers=['earth','metal','wood'].flatMap((element,j)=>[1,2,3].map((level,i)=>({element,secondary:null,slot:j*3+i,level,hp:100,maxHp:100,cooldown:0,burnUntil:0,invested:50,shotCount:0})));});
  await page.waitForTimeout(200);await page.screenshot({path:`artifacts/nature-towers-battle-${viewport.width}.png`});
  for(const slot of [0,3,6]){const point=await page.evaluate(slot=>{WuxingGame.state.paused=false;return Wuxing3D.projectSlot(slot);},slot);await page.mouse.click(point.x,point.y);await page.click('#upgrade-button');assert.equal(await page.evaluate(slot=>WuxingGame.state.towers.find(t=>t.slot===slot).level,slot),2);await page.mouse.click(10,viewport.height-10);}
  assert.deepEqual(errors,[]);console.log('PASS earth/metal/wood levels, motion, upgrades',viewport);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
