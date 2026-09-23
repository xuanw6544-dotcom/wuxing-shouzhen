const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const sharp=require('sharp');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 try {
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]) {
   const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.Wuxing3D);
   await page.click('#open-menu-button');await page.click('[data-map="wuxingchi"]');await page.click('#map-next-button');await page.click('#enter-button');
   await page.evaluate(()=>{
    const s=WuxingGame.state;s.paused=true;s.nextWaveReadyAt=10000;
    const route=WuxingGame.getMap().routes[0];const p=route[Math.floor(route.length/2)];
    s.enemies=[{element:'metal',boss:true,elite:true,hp:1800,maxHp:1800,shield:400,x:p[0]*s.width,y:p[1]*s.height,casting:false,dead:false}];
   });
   await page.waitForTimeout(300);
   await page.screenshot({path:`artifacts/metal-boss-battle-${viewport.width}.png`});
   const before=await page.locator('#three-canvas').screenshot();
   await page.evaluate(()=>{const s=WuxingGame.state;s.time+=.2;s.enemies[0].hp-=100;s.enemies[0].casting=true;});
   await page.waitForTimeout(100);
   const after=await page.locator('#three-canvas').screenshot();assert(!before.equals(after));
   const stats=await sharp(after).stats();assert(stats.channels.some(c=>c.stdev>15));
   const active=await page.evaluate(()=>Wuxing3D.stats().geometries);
   await page.evaluate(()=>{WuxingGame.state.enemies[0].dead=true;WuxingGame.state.enemies=[];});
   for(let i=0;i<7;i++){await page.evaluate(()=>WuxingGame.state.time+=.1);await page.waitForTimeout(60);}
   assert(await page.evaluate(()=>Wuxing3D.stats().geometries)<active,'retired actor resources released');
   assert.deepEqual(errors,[]);console.log('PASS metal boss',viewport);await page.close();
  }
  const page=await browser.newPage({viewport:{width:960,height:900}});await page.goto('http://127.0.0.1:4173');
  await page.evaluate(async()=>{
   const THREE=await import('/assets/three.module.js');
   const {createMetalBoss,animateMetalBoss}=await import('/enemy-models.js');
   const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(960,900);renderer.setPixelRatio(1);
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;
   const scene=new THREE.Scene();scene.background=new THREE.Color(0x112b30);
   const camera=new THREE.PerspectiveCamera(33,960/900,.1,30);camera.position.set(3.4,3.1,6.8);camera.lookAt(0,1.12,0);
   scene.add(new THREE.HemisphereLight(0xe5f5ff,0x25332c,2));
   const sun=new THREE.DirectionalLight(0xffe8bc,3.5);sun.position.set(-3,6,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
   const rim=new THREE.DirectionalLight(0x6cc7ee,2);rim.position.set(3,3,-3);scene.add(rim);
   const model=createMetalBoss();scene.add(model);
   const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.8,.14,64),new THREE.MeshStandardMaterial({color:0x28464b,roughness:.8,metalness:.3}));floor.position.y=-.06;floor.receiveShadow=true;scene.add(floor);
   animateMetalBoss(model,{hp:1800,shield:400,casting:false},1,.016,false);
   renderer.render(scene,camera);renderer.domElement.id='portrait';renderer.domElement.style.cssText='position:fixed;inset:0;z-index:99999';document.body.append(renderer.domElement);
  });
  await page.locator('#portrait').screenshot({path:'artifacts/metal-boss-portrait.png'});await page.close();
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]) {
   const preview=await browser.newPage({viewport});const errors=[];preview.on('pageerror',e=>errors.push(e.message));
   await preview.goto('http://127.0.0.1:4173/metal-boss-preview.html');await preview.waitForSelector('canvas');
   await preview.waitForTimeout(300);const first=await preview.locator('canvas').screenshot();
   await preview.check('#casting');await preview.waitForTimeout(200);const next=await preview.locator('canvas').screenshot();assert(!first.equals(next));
   await preview.mouse.move(viewport.width/2,viewport.height/2);await preview.mouse.down();await preview.mouse.move(viewport.width/2+100,viewport.height/2+20);await preview.mouse.up();
   await preview.screenshot({path:`artifacts/metal-boss-preview-${viewport.width}.png`});
   assert(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
   console.log('PASS interactive preview',viewport);await preview.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
