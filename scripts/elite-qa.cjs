const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const sharp=require('sharp');
const kinds=['metal','wood','water','fire','earth'];
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});try{
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/elite-preview.html');await page.waitForSelector('canvas');
  for(const kind of kinds){
   await page.selectOption('#boss-kind',kind);await page.uncheck('#compare');await page.uncheck('#casting');await page.waitForTimeout(80);
   await page.screenshot({path:`artifacts/elite-${kind}-${viewport.width}.png`});
   const a=await page.locator('canvas').screenshot();assert((await sharp(a).stats()).channels.some(c=>c.stdev>12));
   await page.check('#casting');await page.waitForTimeout(100);assert(!a.equals(await page.locator('canvas').screenshot()));
   await page.uncheck('#casting');await page.check('#compare');await page.waitForTimeout(80);await page.screenshot({path:`artifacts/elite-compare-${kind}-${viewport.width}.png`});
  }
  await page.uncheck('#compare');await page.selectOption('#boss-kind','all');await page.waitForTimeout(80);await page.screenshot({path:`artifacts/elite-lineup-${viewport.width}.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const sizes=await page.evaluate(async()=>{
   const T=await import('/assets/three.module.js'),{createElite,animateElite}=await import('/elite-models.js'),{createBoss,animateBoss}=await import('/enemy-models.js'),{createSpirit,animateSpirit}=await import('/spirit-models.js');
   return ['metal','wood','water','fire','earth'].map(element=>{const a=createSpirit(element),b=createElite(element),c=createBoss(element),e={element,hp:100,casting:false};animateSpirit(a,1);animateElite(b,e,1,.016,true);animateBoss(c,e,1,.016,true);const sizes=[a,b,c].map(m=>new T.Box3().setFromObject(m).getSize(new T.Vector3()).y);e.casting=true;animateElite(b,e,1.1,.016,true);const casting=b.userData.eliteVisual.arms[0].rotation.x===-.55;e.hp=80;animateElite(b,e,1.2,.016,true);return {element,sizes,casting,hit:b.userData.hit>0};});
  });
  assert(sizes.every(s=>s.casting&&s.hit&&s.sizes[1]>s.sizes[0]&&s.sizes[1]<s.sizes[2]),JSON.stringify(sizes));
  await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.Wuxing3D);await page.click('#open-menu-button');await page.click('[data-map="wuxingchi"]');await page.click('#map-next-button');await page.click('#enter-button');
  await page.evaluate(()=>{const s=WuxingGame.state;s.paused=true;s.nextWaveReadyAt=10000;});await page.waitForTimeout(100);const baseline=await page.evaluate(()=>Wuxing3D.stats().geometries);
  await page.evaluate(kinds=>{const s=WuxingGame.state;s.enemies=kinds.map((element,i)=>({element,elite:true,boss:false,hp:300,maxHp:300,shield:50,casting:true,x:(.25+i*.12)*s.width,y:.42*s.height,dead:false}));},kinds);
  await page.waitForTimeout(150);await page.screenshot({path:`artifacts/elites-battle-${viewport.width}.png`});assert(await page.evaluate(()=>Wuxing3D.stats().geometries)>baseline+40);
  await page.evaluate(()=>{WuxingGame.state.enemies.forEach(e=>e.dead=true);WuxingGame.state.enemies=[];});
  for(let i=0;i<7;i++){await page.evaluate(()=>WuxingGame.state.time+=.1);await page.waitForTimeout(50);}
  assert(await page.evaluate(()=>Wuxing3D.stats().geometries)<=baseline+1,'actor resources released');assert.deepEqual(errors,[]);console.log('PASS five elites, intermediate size, casting/hit, cleanup',viewport);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
