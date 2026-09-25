const { chromium } = require('playwright-core');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const maps=['qinglan','shuangxi','huihuan','wuxingchi'];

async function enter(page,mapId){
  await page.goto(pathToFileURL(path.resolve(__dirname,'..','index.html')).href);
  await page.locator('#open-menu-button').click();
  await page.locator(`#map-choices [data-map="${mapId}"]`).click();
  await page.locator('#map-next-button').click();
  await page.locator('#origin-choices [data-element="earth"]').click();
  await page.locator('#enter-button').click();
  await page.locator('body.in-battle').waitFor();
  await page.waitForTimeout(700);
}

(async()=>{
  const output=path.resolve(__dirname,'..','artifacts','terrain-choice');fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--allow-file-access-from-files','--use-angle=swiftshader','--enable-webgl']});
  try{
    for(const mapId of maps){
      const page=await browser.newPage({viewport:{width:1280,height:720}});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await enter(page,mapId);
      assert.equal(errors.length,0,`${mapId} page errors: ${errors.join('; ')}`);
      const result=await page.evaluate(()=>{
        const game=window.WuxingGame,map=game.getMap(),types=new Set(map.slotTypes),coverage=map.slots.map((_,index)=>game.getRouteCoverage(index));
        const high=map.slotTypes.indexOf('high'),base=game.state.width*(.18+.008);
        return {types:[...types],coverage,highMultiplier:game.getTowerRange({slot:high,level:1})/base};
      });
      assert.deepEqual(new Set(result.types),new Set(['high','spring','ley','choke']),`${mapId} must use all terrain choices`);
      assert(Math.abs(result.highMultiplier-1.18)<.001,'high ground range bonus must be 18%');
      assert(result.coverage.every(value=>value>=0&&value<=100),'coverage must be a percentage');
      await page.screenshot({path:path.join(output,`${mapId}.png`)});
      if(mapId==='qinglan'){
        const slot=await page.evaluate(()=>window.Wuxing3D.projectSlot(window.WuxingGame.getMap().slotTypes.indexOf('high')));
        await page.mouse.click(slot.x,slot.y);await page.waitForTimeout(120);
        assert.match(await page.locator('#hint-text').textContent(),/高台.*射程.*覆盖/);
        assert.equal(await page.locator('#combat-feedback-canvas').evaluate(node=>getComputedStyle(node).pointerEvents),'none');
        await page.screenshot({path:path.join(output,'qinglan-range-preview.png')});
        const terrainSlots=await page.evaluate(()=>{
          const state=window.WuxingGame.state,map=window.WuxingGame.getMap(),ley=map.slotTypes.indexOf('ley'),spring=map.slotTypes.indexOf('spring');
          state.pendingBuildSlot=null;state.previewBuild=null;state.buildElement=null;
          state.towers.push({slot:ley,element:'earth',secondary:null,level:1,hp:100,maxHp:100,cooldown:0,burnUntil:0,invested:50,shotCount:0});
          state.towers.push({slot:spring,element:'metal',secondary:null,level:1,hp:100,maxHp:100,cooldown:0,burnUntil:0,invested:50,shotCount:0});
          return {ley,spring};
        });
        await page.waitForTimeout(100);
        const leyPoint=await page.evaluate(slot=>window.Wuxing3D.projectSlot(slot),terrainSlots.ley);await page.mouse.click(leyPoint.x,leyPoint.y);
        assert.equal(await page.locator('#selected-attack').textContent(),'26','ley line must raise earth damage by 25%');
        assert.match(await page.locator('#selected-detail').textContent(),/地脉.*土系伤害/);
        const springPoint=await page.evaluate(slot=>window.Wuxing3D.projectSlot(slot),terrainSlots.spring);await page.mouse.click(springPoint.x,springPoint.y);
        assert.equal(await page.locator('#selected-speed').textContent(),'0.91s','spring must reduce the attack interval by 15%');
      }
      await page.close();
    }
    console.log('PASS: four terrain types, map-specific placement, range bonus, route coverage, and touch-safe preview.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
