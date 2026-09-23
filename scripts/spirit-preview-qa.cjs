const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const sharp=require('sharp');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173/spirit-preview.html');await page.waitForSelector('canvas');await page.waitForTimeout(250);
   await page.screenshot({path:`artifacts/spirits-gallery-${viewport.width}.png`});
   const before=await page.locator('canvas').screenshot();await page.waitForTimeout(200);const after=await page.locator('canvas').screenshot();assert(!before.equals(after));
   assert((await sharp(after).stats()).channels.some(c=>c.stdev>15));
   for(const kind of ['metal','wood','water','fire','earth']){
    await page.selectOption('#element',kind);await page.waitForTimeout(80);
    await page.screenshot({path:`artifacts/spirit-${kind}-${viewport.width}.png`});
   }
   await page.selectOption('#element','all');await page.locator('label').filter({has:page.locator('[value=march]')}).click();await page.waitForTimeout(150);
   await page.screenshot({path:`artifacts/spirits-march-${viewport.width}.png`});
   await page.uncheck('#motion');await page.waitForTimeout(100);const stopped=await page.locator('canvas').screenshot();await page.waitForTimeout(150);assert(stopped.equals(await page.locator('canvas').screenshot()),'pause freezes actors');
   await page.mouse.move(viewport.width/2,viewport.height/2);await page.mouse.down();await page.mouse.move(viewport.width/2+80,viewport.height/2+15);await page.mouse.up();
   assert(!stopped.equals(await page.locator('canvas').screenshot()),'camera drag changes view');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
   console.log('PASS spirits',viewport);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
