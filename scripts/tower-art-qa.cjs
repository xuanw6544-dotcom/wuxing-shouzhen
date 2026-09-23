const {chromium}=require('playwright-core');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
(async()=>{
  for(const kind of ['metal','wood','water','fire','earth'])for(let level=1;level<=3;level++){
    const {data}=await sharp(path.join(root,`assets/towers/${kind}-${level}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let clear=0,opaque=0;for(let i=3;i<data.length;i+=4){clear+=data[i]===0;opaque+=data[i]===255;}
    assert(clear>100&&opaque>100,`${kind}-${level}: transparent background and intact tower`);
  }
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:1370}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('http://tower.test/**',route=>{
      const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
      let body=fs.readFileSync(path.join(root,name));
      if(name==='game.js')body=Buffer.from(body.toString().replace(/\}\)\(\);\s*$/,'window.__towerQA={state,buildTower};})();'));
      return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html'});
    });
    await page.goto('http://tower.test/tower-review.html');await page.evaluate(()=>ElementArt.ready);await page.waitForTimeout(100);
    const renderedHeights=await page.evaluate(()=>Object.fromEntries(['metal','wood','water','fire','earth'].map(kind=>[kind,[1,2,3].map(level=>{
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;const c=canvas.getContext('2d');ElementArt.tower(c,kind,160,270,64,0,level);
      const data=c.getImageData(0,0,320,320).data;let top=320,bottom=0;for(let y=0;y<320;y++)for(let x=0;x<320;x++)if(data[(y*320+x)*4+3]>20){top=Math.min(top,y);bottom=Math.max(bottom,y)}return bottom-top+1;
    })])));
    for(const [kind,heights] of Object.entries(renderedHeights)){
      assert(heights[0]<heights[1]&&heights[1]<heights[2],`${kind} grows at every level`);
      assert(Math.abs(heights[1]/heights[0]-1.22)<.04&&Math.abs(heights[2]/heights[0]-1.42)<.04,`${kind} follows fire growth curve`);
    }
    const review=page.locator('#review'),reviewBefore=await review.screenshot();await page.waitForTimeout(320);const reviewAfter=await review.screenshot();
    assert(!reviewBefore.equals(reviewAfter),'all level-three elemental effects animate');
    await page.screenshot({path:path.join(root,'artifacts/tower-review-source.png'),fullPage:true});
    await page.setViewportSize({width:960,height:540});await page.goto('http://tower.test/fire-tower-review.html');await page.evaluate(()=>ElementArt.ready);await page.waitForTimeout(250);
    const fireStage=page.locator('#stage'),before=await fireStage.screenshot();await page.waitForTimeout(350);const after=await fireStage.screenshot();
    assert(!before.equals(after),'level-three fire lighting and particles animate');
    await page.screenshot({path:path.join(root,'artifacts/fire-tower-dynamic.png')});
    for(const [width,height] of [[1280,720],[844,390]]){
      await page.setViewportSize({width,height});await page.goto('http://tower.test/');await page.evaluate(()=>ElementArt.ready);
      await page.locator('#open-menu-button').click();await page.locator('#map-next-button').click();await page.locator('#origin-choices [data-element="water"]').click();await page.locator('#enter-button').click();
      await page.evaluate(()=>{const q=__towerQA;q.state.gold=1000;['metal','wood','water','fire','earth'].forEach((kind,i)=>{q.buildTower([0,1,2,5,6][i],kind);q.state.towers[i].level=3;});q.state.nextWaveReadyAt=q.state.time+1000;});
      await page.mouse.move(0,0);await page.waitForTimeout(1500);
      await page.screenshot({path:path.join(root,`artifacts/tower-source-battle-${width}.png`)});
    }
    assert.deepEqual(errors,[]);console.log('PASS: 15 transparent sprites, loaded review and desktop/mobile battle rendering.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
