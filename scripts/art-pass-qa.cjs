const { chromium } = require('playwright-core');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async()=>{
  const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts','art-pass');
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--allow-file-access-from-files','--use-angle=swiftshader','--enable-webgl']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.locator('#home-canvas').waitFor();await page.waitForTimeout(250);
    await page.screenshot({path:path.join(output,'01-home.png')});
    await page.click('#open-menu-button');await page.screenshot({path:path.join(output,'02-maps.png')});
    await page.click('#map-next-button');await page.waitForTimeout(120);await page.screenshot({path:path.join(output,'03-origin.png')});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),'setup screens fit viewport');
    await page.click('#enter-button');await page.waitForFunction(()=>window.Wuxing3D&&document.body.classList.contains('three-ready'));
    await page.evaluate(()=>{
      const state=WuxingGame.state,forms=['metal','wood','water','fire','earth','thunder','bog','spike','mist','lava','blade','steam','rock','mud','ice'];
      state.paused=true;state.projectiles=forms.map((form,index)=>{
        const x=state.width*(.22+(index%7)*.09),y=state.height*(.27+Math.floor(index/7)*.28),target={x:x+state.width*.11,y:y+.01,dead:false};
        return {x,y,originX:x-state.width*.07,originY:y,bornAt:state.time,form,color:['#f5d98b','#69db84','#65d8ff','#ff714d','#d8a65c','#b56cff','#8aa74d','#c5e98b','#86e2bb','#ff7c35','#ffbd72','#e3f6ef','#d3bd83','#a78b5e','#c9f3ff'][index],element:['metal','wood','water','fire','earth'][index%5],target,tower:{},special:true,counter:false,weak:false,damage:1,life:1,trail:[{x:x-state.width*.07,y},{x:x-state.width*.04,y},{x:x-state.width*.02,y}]};
      });
      state.effects.push({kind:'lightning',points:[{x:state.width*.22,y:state.height*.72},{x:state.width*.5,y:state.height*.68},{x:state.width*.76,y:state.height*.72}],columns:[{x:state.width*.5,y:state.height*.68}],color:'#b86cff',life:2,max:2});
    });
    await page.waitForTimeout(180);
    const styles=await page.evaluate(()=>Wuxing3D.stats().shotStyles.sort());
    assert.equal(styles.length,15,'all tower attack styles render');
    assert.deepEqual(styles,['blade','bog','earth','fire','ice','lava','metal','mist','mud','rock','spike','steam','thunder','water','wood'].sort());
    await page.screenshot({path:path.join(output,'04-attack-signatures.png')});
    await page.evaluate(()=>{WuxingGame.state.projectiles=[];WuxingGame.state.effects=[];});await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>Wuxing3D.stats().shotStyles.length),0,'expired spell visuals are released');
    assert.deepEqual(errors,[],'no page errors');
    console.log(`PASS: ${styles.length} attack signatures plus thunder columns; three setup screens fit.`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
