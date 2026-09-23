const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const elements=['metal','wood','water','fire','earth'];
const pairs=[['wood','fire'],['wood','earth'],['metal','wood'],['wood','water'],['fire','earth'],['metal','fire'],['water','fire'],['metal','earth'],['water','earth'],['metal','water']];

(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&m.text().includes('THREE.WebGLProgram'))errors.push(m.text());});
   await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.Wuxing3D);
   await page.click('#open-menu-button');await page.click('[data-map="wuxingchi"]');await page.click('#map-next-button');await page.click('#enter-button');
   await page.evaluate(()=>{WuxingGame.state.paused=true;WuxingGame.state.nextWaveReadyAt=10000;});

   await page.evaluate(elements=>{const s=WuxingGame.state;s.towers=elements.flatMap((element,j)=>[1,2,3].map((level,i)=>({element,secondary:null,slot:(j*3+i)%WuxingGame.getMap().slots.length,level,hp:100,maxHp:100,cooldown:0,burnUntil:0,invested:50,shotCount:0}))).slice(0,WuxingGame.getMap().slots.length);},elements);
   await page.waitForTimeout(220);
   const baseStats=await page.evaluate(()=>Wuxing3D.stats());
   assert(baseStats.towerModels.every(name=>/^(metal|wood|water|fire|earth)-/.test(name)),JSON.stringify(baseStats.towerModels));
   await page.screenshot({path:`artifacts/integrated-base-towers-${viewport.width}.png`});

   await page.evaluate(pairs=>{const s=WuxingGame.state,template=s.towers[0];s.towers=pairs.map((pair,i)=>({...template,element:pair[0],secondary:pair[1],slot:i,level:i%3+1}));},pairs);
   await page.waitForTimeout(220);
   const fusionStats=await page.evaluate(()=>Wuxing3D.stats());
   assert.equal(fusionStats.towerModels.length,10);assert(fusionStats.towerModels.every(name=>name.startsWith('fusion-')),JSON.stringify(fusionStats.towerModels));
   await page.screenshot({path:`artifacts/integrated-fusion-towers-${viewport.width}.png`});

   for(const stage of ['normal','elite','boss']){
    await page.evaluate(({elements,stage})=>{const s=WuxingGame.state;s.enemies=elements.map((element,i)=>({element,elite:stage!=='normal',boss:stage==='boss',hp:1000,maxHp:1000,shield:stage==='normal'?0:150,casting:stage!=='normal',x:(.24+i*.13)*s.width,y:(.33+(i%2)*.16)*s.height,dead:false,rootUntil:0,frozenUntil:0}));},{elements,stage});
    await page.waitForTimeout(180);
    const stats=await page.evaluate(()=>Wuxing3D.stats());
    const suffix=stage==='normal'?'-spirit':stage==='elite'?'-elite':'-boss';
    assert.equal(stats.enemyModels.length,5);assert(stats.enemyModels.every(name=>name.endsWith(suffix)),JSON.stringify(stats.enemyModels));
    const shot=await page.locator('#three-canvas').screenshot();assert((await sharp(shot).stats()).channels.some(c=>c.stdev>15));
    await page.screenshot({path:`artifacts/integrated-enemies-${stage}-${viewport.width}.png`});
    await page.evaluate(()=>{WuxingGame.state.enemies.forEach(e=>e.dead=true);WuxingGame.state.enemies=[];});
    for(let i=0;i<6;i++){await page.evaluate(()=>WuxingGame.state.time+=.1);await page.waitForTimeout(55);}
    assert.equal((await page.evaluate(()=>Wuxing3D.stats().enemyModels.length)),0);
   }
   assert.deepEqual(errors,[]);
   console.log('PASS all tower and enemy stages integrated',viewport);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
