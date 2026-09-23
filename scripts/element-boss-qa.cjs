const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const kinds=['wood','water','fire','earth'];
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 try {
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]) {
   const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173/metal-boss-preview.html?boss=wood');await page.waitForSelector('canvas');
   for(const kind of kinds){
    await page.selectOption('#boss-kind',kind);await page.uncheck('#casting');await page.waitForTimeout(150);
    const before=await page.locator('canvas').screenshot();
    assert((await sharp(before).stats()).channels.some(c=>c.stdev>20),'nonblank model preview');
    await page.screenshot({path:`artifacts/boss-${kind}-${viewport.width}.png`});
    await page.check('#casting');await page.waitForTimeout(150);
    const after=await page.locator('canvas').screenshot();assert(!before.equals(after),'animation changes rendered pixels');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   }
   await page.selectOption('#boss-kind','all');await page.uncheck('#casting');await page.waitForTimeout(150);
   await page.screenshot({path:`artifacts/boss-lineup-${viewport.width}.png`});
   const checks=await page.evaluate(async()=>{
    const THREE=await import('/assets/three.module.js');
    const {createBoss,animateBoss}=await import('/enemy-models.js');
    return ['wood','water','fire','earth'].map(kind=>{
     const model=createBoss(kind),enemy={element:kind,hp:100,shield:10};
     animateBoss(model,enemy,1,.016,true);const idle=model.userData.parts.arms[0].rotation.x;
     enemy.casting=true;animateBoss(model,enemy,1.1,.016,true);const cast=model.userData.parts.arms[0].rotation.x;
     enemy.hp=80;animateBoss(model,enemy,1.2,.016,false);const hit=model.userData.hit;
     enemy.casting=false;animateBoss(model,enemy,1.3,.016,false);const released=model.userData.release>0;
     const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
     return {kind,poseChanged:idle!==cast,hit:hit>0,released,width:size.x,height:size.y};
    });
   });
   assert(checks.every(c=>c.poseChanged&&c.hit&&c.released&&c.width<3&&c.height<3.1),JSON.stringify(checks));
   await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.Wuxing3D);
   await page.click('#open-menu-button');await page.click('[data-map="wuxingchi"]');await page.click('#map-next-button');await page.click('#enter-button');
   await page.evaluate(()=>{WuxingGame.state.paused=true;WuxingGame.state.nextWaveReadyAt=10000;});await page.waitForTimeout(150);
   const baseline=await page.evaluate(()=>Wuxing3D.stats().geometries);
   let retiredBaseline=null;
   for(const kind of kinds){
    await page.evaluate(kind=>{
     const s=WuxingGame.state,route=WuxingGame.getMap().routes[0],p=route[Math.floor(route.length/2)];
     s.enemies=[{element:kind,boss:true,elite:true,hp:1800,maxHp:1800,shield:400,x:p[0]*s.width,y:p[1]*s.height,casting:true,dead:false}];
    },kind);
    await page.waitForTimeout(180);
    assert(await page.evaluate(()=>Wuxing3D.stats().geometries)>baseline+20,'detailed boss is rendered');
    await page.screenshot({path:`artifacts/boss-${kind}-battle-${viewport.width}.png`});
    await page.evaluate(()=>{WuxingGame.state.enemies[0].dead=true;WuxingGame.state.enemies=[];});
    for(let i=0;i<7;i++){await page.evaluate(()=>WuxingGame.state.time+=.1);await page.waitForTimeout(50);}
    const retired=await page.evaluate(()=>Wuxing3D.stats().geometries);
    // The shared health-bar geometry is uploaded on the first actor, then retained.
    if(retiredBaseline===null){assert(retired<=baseline+1);retiredBaseline=retired;}
    assert.equal(retired,retiredBaseline,'actor geometry does not accumulate');
   }
   assert.deepEqual(errors,[]);console.log('PASS four bosses, skills, hit, retirement, preview',viewport);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
