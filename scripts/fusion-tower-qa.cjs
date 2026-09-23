const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const sharp=require('sharp');
const kinds=['thunder','bog','spike','mist','lava','blade','steam','rock','mud','ice'];
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});try{
 for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('THREE.WebGLProgram'))errors.push(m.text());});
  for(const kind of kinds){
   await page.goto('http://127.0.0.1:4173/fusion-tower-preview.html?element='+kind);await page.waitForSelector('canvas');await page.waitForTimeout(120);
   await page.selectOption('#level','3');await page.waitForTimeout(60);await page.screenshot({path:`artifacts/fusion-${kind}-${viewport.width}.png`});
   const a=await page.locator('canvas').screenshot();await page.waitForTimeout(100);assert(!a.equals(await page.locator('canvas').screenshot()),kind+' animates');assert((await sharp(a).stats()).channels.some(c=>c.stdev>18),kind+' nonblank');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.Wuxing3D);await page.click('#open-menu-button');await page.click('[data-map="wuxingchi"]');await page.click('#map-next-button');await page.click('#enter-button');
  const forms=await page.evaluate(async()=>{const {FUSION_ART}=await import('/fusion-tower-models.js');const s=WuxingGame.state;s.paused=true;s.nextWaveReadyAt=10000;s.gold=1500;s.towers=Object.values(FUSION_ART).map((v,i)=>({element:v.pair[0],secondary:v.pair[1],slot:i,level:1,hp:100,maxHp:100,cooldown:0,burnUntil:0,invested:50,shotCount:0}));return s.towers.map(t=>WuxingGame.getTowerForm(t).kind);});
  assert.deepEqual(forms,kinds);await page.waitForTimeout(200);await page.screenshot({path:`artifacts/fusion-towers-battle-${viewport.width}.png`});
  const before=await page.evaluate(()=>Wuxing3D.stats().geometries);
  const point=await page.evaluate(()=>{WuxingGame.state.paused=false;return Wuxing3D.projectSlot(0);});await page.mouse.click(point.x,point.y);await page.click('#upgrade-button');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>WuxingGame.state.towers[0].level),2);
  assert.equal(await page.evaluate(()=>Wuxing3D.stats().geometries),before,'upgrade preserves mesh structure and releases previous resources');
  assert.deepEqual(errors,[]);console.log('PASS ten fusions, mapping, animation, scale-only upgrade',viewport);await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
