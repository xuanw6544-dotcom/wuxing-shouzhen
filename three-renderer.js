import * as THREE from "./assets/three.module.js";
import {surface,island,landscape} from './environment-3d.js';
import {createBoss,animateBoss} from './enemy-models.js';
import {createElite,animateElite} from './elite-models.js';
import {createSpirit,animateSpirit} from './spirit-models.js';
import {createFireTower,animateFireTower} from './fire-tower-model.js';
import {createWaterTower,animateWaterTower} from './water-tower-model.js';
import {createNatureTower,animateNatureTower} from './nature-tower-models.js';
import {createFusionTower,animateFusionTower} from './fusion-tower-models.js';

// Visual-only renderer: game.js remains the authority for movement, combat and input.
const host = document.querySelector(".battlefield");
if (!host || !window.WuxingGame || !window.GameWorld) throw new Error("Three.js renderer host is unavailable");

const canvas = document.createElement("canvas");
canvas.id = "three-canvas";
host.prepend(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fbfc3);
scene.fog = new THREE.FogExp2(0xa6c2c3, 0.012);
const camera = new THREE.OrthographicCamera(-12, 12, 7, -7, 0.1, 100);
// Lower the orthographic camera to give the floating island more depth while
// keeping slot projection stable for touch input.
camera.position.set(7, 15, 24);
camera.lookAt(0, 0.1, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xd9efdc, 0x183235, 2.1));
const sun = new THREE.DirectionalLight(0xffe6c4, 2.5);
sun.position.set(-8, 16, 10); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
scene.add(sun);
landscape(scene);
sun.shadow.normalBias=.035;

const mapGroup = new THREE.Group();
const towerGroup = new THREE.Group();
const enemyGroup = new THREE.Group();
const projectileGroup = new THREE.Group();
scene.add(mapGroup, towerGroup, enemyGroup, projectileGroup);
const towerMeshes = new Map();
const enemyMeshes = new Map();
const retiringEnemies = new Map();
let lastEnemyTime = 0;
const shotMeshes = new Map();
const effectMeshes = new Map();
const pads = [];
const sharedBall = new THREE.SphereGeometry(1, 12, 8);
const healthGeometry = new THREE.PlaneGeometry(1, .085);
const healthMaterial = new THREE.MeshBasicMaterial({color:0x86e6a8,depthTest:false});
const raycaster = new THREE.Raycaster();
let preview = null, previewKey = '';
const waterTime={value:0};
function disposeTree(group) {
  const released=new Set();
  group.traverse(o=>{if(o.geometry && o.geometry!==sharedBall && o.geometry!==healthGeometry)o.geometry.dispose();
    for(const mat of (Array.isArray(o.material)?o.material:[o.material]))if(mat && mat!==healthMaterial && ![...materialCache.values()].includes(mat)&&!released.has(mat)){mat.dispose();released.add(mat);}
    if(o.isInstancedMesh)o.dispose();});
  group.clear();
}
const elementColors = { metal: 0xe7d39b, wood: 0x63c976, water: 0x56c7ed, fire: 0xf0784f, earth: 0xd5a866 };
const elementEmissive = { metal: 0x8f6f20, wood: 0x215c2e, water: 0x126d9b, fire: 0x8f2812, earth: 0x754211 };
const materialCache = new Map();
let lastMapId = "";

function material(kind, emissive = false) {
  const key = `${kind}:${emissive}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({
    color: elementColors[kind] || 0x6e9189,
    roughness: emissive ? 0.3 : 0.72,
    metalness: kind === "metal" ? 0.55 : 0.08,
    emissive: emissive ? (elementEmissive[kind] || 0x274d4d) : 0,
    emissiveIntensity: emissive ? 1.8 : 0
  }));
  return materialCache.get(key);
}

function worldPosition(nx, ny, height = 0) {
  return new THREE.Vector3((nx - .5) * 22, height, (ny - .5) * 12);
}

function addBox(parent, size, position, color, bevel = 0) {
  const geometry = new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, surface('wood',color));
  mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function addRoadSegment(route, a, b, index) {
  const p1 = worldPosition(a[0], a[1], .05);
  const p2 = worldPosition(b[0], b[1], .05);
  const dx = p2.x - p1.x, dz = p2.z - p1.z, length = Math.hypot(dx, dz);
  const road = addBox(mapGroup, [length, .42, 1.55], new THREE.Vector3((p1.x+p2.x)/2, p1.y, (p1.z+p2.z)/2), 0x9f9670);
  road.rotation.y = -Math.atan2(dz, dx); road.name = `bridge-${route}-${index}`;
  const support = addBox(mapGroup, [length + .12, .8, 1.72], new THREE.Vector3((p1.x+p2.x)/2, p1.y-.55, (p1.z+p2.z)/2), 0x3b5755);
  support.rotation.y = road.rotation.y;
  const boards=Math.max(2,Math.ceil(length/.38));
  const planks=new THREE.InstancedMesh(new THREE.BoxGeometry(length/boards-.025,.08,1.48),surface('wood',0xd9c8ac),boards);
  const dummy=new THREE.Object3D();
  for(let i=0;i<boards;i++){
    const t=(i+.5)/boards;
    dummy.position.set(p1.x+dx*t,.30,p1.z+dz*t);dummy.rotation.y=road.rotation.y;dummy.updateMatrix();planks.setMatrixAt(i,dummy.matrix);planks.setColorAt(i,new THREE.Color([0xc5b996,0xe5d1b1,0xbeb89c][i%3]));
  }
  planks.castShadow=true;planks.receiveShadow=true;mapGroup.add(planks);
  const nx=-dz/length,nz=dx/length;
  for(const side of [-1,1]){
    const rail=addBox(mapGroup,[length,.07,.07],new THREE.Vector3((p1.x+p2.x)/2+nx*.8*side,.72,(p1.z+p2.z)/2+nz*.8*side),0x625341);rail.rotation.y=road.rotation.y;
  }
  for (let i = 1; i < Math.max(2, Math.floor(length / 2.4)); i++) {
    const t = i / Math.max(2, Math.floor(length / 2.4));
    const x = p1.x + dx*t, z = p1.z + dz*t;
    const post = addBox(mapGroup, [.12, .72, .12], new THREE.Vector3(x+nx*.8, .53, z+nz*.8), 0x4b3c2e);
    post.castShadow = true;
  }
}

function buildMap(map) {
  disposeTree(mapGroup); pads.length=0;
  island(mapGroup,map);
  for (const [routeIndex, route] of map.routes.entries()) {
    for (let i=0;i<route.length-1;i++) addRoadSegment(routeIndex, route[i], route[i+1], i);
    for(const end of [0,route.length-1]){
      const [nx,ny]=route[end],p=worldPosition(nx,ny,.35);
      for(const side of [-1,1])addBox(mapGroup,[.3,1.55,.3],p.clone().add(new THREE.Vector3(0,.6,side*.7)),0x647b7a);
      addBox(mapGroup,[.5,.23,1.85],p.clone().add(new THREE.Vector3(0,1.5,0)),0x355b5c);
      const portal=new THREE.Mesh(new THREE.TorusGeometry(.58,.08,8,32),new THREE.MeshBasicMaterial({color:end?0x8ef4dd:0xc899ff}));portal.rotation.y=Math.PI/2;portal.position.copy(p).y+=.6;mapGroup.add(portal);
    }
  }
  map.slots.forEach(([x,y], index) => {
    const p = worldPosition(x,y,.48 + (index % 3 === 0 ? .22 : 0));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(.78,.92,.28,12), surface('stone',0xc7d5c7));
    pad.position.copy(p); pad.castShadow = true; pad.receiveShadow = true; pad.name = `slot-${index}`; pad.userData.slot=index; mapGroup.add(pad); pads.push(pad);
    const trim=new THREE.Mesh(new THREE.TorusGeometry(.61,.025,6,32),new THREE.MeshStandardMaterial({color:0xe0cf96,metalness:.5,roughness:.5}));trim.rotation.x=Math.PI/2;trim.position.y=.15;pad.add(trim);
    for(const rotate of [0,Math.PI/2]){const mark=new THREE.Mesh(new THREE.BoxGeometry(.26,.018,.04),new THREE.MeshBasicMaterial({color:0xf0ddb0}));mark.position.y=.15;mark.rotation.y=rotate;pad.add(mark);}
  });
  if (map.feature === "array") {
    const waterMaterial=new THREE.ShaderMaterial({uniforms:{time:waterTime},vertexShader:'varying vec2 uvp; void main(){uvp=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uvp;uniform float time;void main(){float d=length((uvp-.5)*2.);float w=sin(d*50.-time*1.4+sin(uvp.x*24.+time)*.4);vec3 c=mix(vec3(.04,.24,.29),vec3(.24,.66,.62),smoothstep(.05,1.,d));c+=pow(max(0.,w),12.)*.06;gl_FragColor=vec4(c,1.);}'});
    const water=new THREE.Mesh(new THREE.CircleGeometry(2.55,64),waterMaterial);water.rotation.x=-Math.PI/2;water.scale.y=1.08/2.55;water.position.y=-.55;mapGroup.add(water);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, .09, 8, 64), surface('stone',0xd0d0b9));
    ring.rotation.x = Math.PI/2;ring.scale.y=1.08/2.55;ring.position.y=-.22; mapGroup.add(ring);
  }
}

function buildTower(tower) {
  const kind=tower.element;
  const group=tower.secondary
    ? createFusionTower(window.WuxingGame.getTowerForm(tower).kind)
    : kind==='fire'?createFireTower(tower.level)
    : kind==='water'?createWaterTower(tower.level):createNatureTower(kind,tower.level);
  group.userData.tower=tower;
  group.userData.signature=`${tower.element}:${tower.secondary}:${tower.level}`;
  group.userData.moving=[];
  const [x,y]=window.WuxingGame.getMap().slots[tower.slot]||[.5,.5];
  group.position.copy(worldPosition(x,y,.7+(tower.slot%3===0?.22:0)));
  const bar=new THREE.Mesh(healthGeometry,healthMaterial);
  bar.position.y=group.userData.healthHeight;bar.renderOrder=5;
  group.add(bar);group.userData.bar=bar;
  return group;
}

function syncTowers() {
  const state = window.WuxingGame.state;
  const live = new Set(state.towers);
  state.towers.forEach(tower => {
    let mesh = towerMeshes.get(tower);
    if(mesh&&mesh.userData.signature!==`${tower.element}:${tower.secondary}:${tower.level}`){towerGroup.remove(mesh);disposeTree(mesh);towerMeshes.delete(tower);mesh=null;}
    if (!mesh) { mesh = buildTower(tower); towerMeshes.set(tower, mesh); towerGroup.add(mesh); }
    const [x,y] = window.WuxingGame.getMap().slots[tower.slot] || [.5,.5];
    mesh.position.copy(worldPosition(x,y,.7 + (tower.slot % 3 === 0 ? .22 : 0)));
    const scale = [1,1.22,1.42][tower.level-1];
    mesh.scale.setScalar(scale * (tower.hp <= 0 ? .72 : 1));
    if(mesh.userData.fireVisual)animateFireTower(mesh,state.time);
    else if(mesh.userData.waterVisual)animateWaterTower(mesh,state.time);
    else if(mesh.userData.natureVisual)animateNatureTower(mesh,state.time);
    else if(mesh.userData.fusionVisual)animateFusionTower(mesh,state.time);
    else{
      mesh.children[2].rotation.y = state.time*.7;
      mesh.children[2].position.y=1.38+Math.sin(state.time*2+tower.slot)*.06;
    }
    mesh.userData.bar.quaternion.copy(camera.quaternion);
    mesh.userData.bar.scale.x=Math.max(.001,tower.hp/tower.maxHp);
    mesh.userData.moving.forEach(({mesh:m,y,phase})=>{m.position.y=y+Math.sin(state.time*1.8+phase)*.055;m.rotation.y=state.time*.3+phase;});
  });
  for (const [tower, mesh] of towerMeshes) if (!live.has(tower)) { towerGroup.remove(mesh); disposeTree(mesh); towerMeshes.delete(tower); }
  const key=state.previewBuild?`${state.previewBuild.slot}:${state.previewBuild.element}`:'';
  if(key!==previewKey){if(preview){towerGroup.remove(preview);disposeTree(preview);}preview=null;previewKey=key;
    if(key){preview=buildTower({...state.previewBuild,level:1});preview.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.45;}});towerGroup.add(preview);}}
  pads.forEach((pad,i)=>pad.material.emissive.setHex(state.pendingBuildSlot===i?0x786b31:0));
}

function syncEnemies() {
  const state = window.WuxingGame.state;
  const reset=state.time<lastEnemyTime;
  const delta=Math.max(0,Math.min(.1,state.time-lastEnemyTime));lastEnemyTime=state.time;
  const live=new Set(state.enemies);
  for(const [enemy,mesh] of enemyMeshes)if(!live.has(enemy)){
    enemyMeshes.delete(enemy);
    if(mesh.userData.model&&enemy.dead){mesh.userData.bar.visible=false;retiringEnemies.set(mesh,0);}
    else{enemyGroup.remove(mesh);disposeTree(mesh);}
  }
  for(const [mesh,age] of retiringEnemies){
    const next=age+delta;
    if(next>.45||reset){enemyGroup.remove(mesh);disposeTree(mesh);retiringEnemies.delete(mesh);}
    else{retiringEnemies.set(mesh,next);mesh.scale.setScalar(1-next/.45);mesh.rotation.z=next*.7;}
  }
  state.enemies.forEach(enemy => {
    const nx = enemy.x / Math.max(1,state.width), ny = enemy.y / Math.max(1,state.height);
    let mesh=enemyMeshes.get(enemy);
    if(!mesh){
      mesh=enemy.boss?createBoss(enemy.element):enemy.elite?createElite(enemy.element):createSpirit(enemy.element);
      const bar=new THREE.Mesh(healthGeometry,healthMaterial);bar.position.y=mesh.userData.healthHeight||1.7;bar.renderOrder=5;
      mesh.add(bar);mesh.userData.bar=bar;enemyMeshes.set(enemy,mesh);enemyGroup.add(mesh);
    }
    const p=worldPosition(nx,ny,mesh.userData.model ? .36 : .72);
    if(mesh.userData.model){
      const previous=mesh.userData.previousPosition;
      const moving=previous&&p.distanceToSquared(previous)>.000001;
      // Keep the face readable while leaning toward the direction of travel.
      const target=moving?Math.atan2(p.x-previous.x,p.z-previous.z)*.22:mesh.rotation.y;
      mesh.rotation.y+=(target-mesh.rotation.y)*Math.min(1,delta*6);
      if(mesh.userData.eliteVisual)animateElite(mesh,enemy,state.time,delta,moving);
      else if(mesh.userData.parts&&mesh.userData.model.endsWith('-spirit'))animateSpirit(mesh,state.time,enemy.routeIndex||0);
      else animateBoss(mesh,enemy,state.time,delta,moving);
      mesh.userData.previousPosition=p.clone();
    }
    mesh.position.copy(p);mesh.castShadow=true;
    mesh.userData.bar.quaternion.copy(mesh.quaternion.clone().invert().multiply(camera.quaternion));
    mesh.userData.bar.scale.x=Math.max(.001,enemy.hp/enemy.maxHp);
  });
  const shots=new Set(state.projectiles);
  for(const [p,m] of shotMeshes)if(!shots.has(p)){projectileGroup.remove(m);shotMeshes.delete(p);}
  state.projectiles.forEach(p=>{let m=shotMeshes.get(p);if(!m){m=new THREE.Mesh(sharedBall,material(p.element,true));m.scale.setScalar(.12);shotMeshes.set(p,m);projectileGroup.add(m);}m.position.copy(worldPosition(p.x/state.width,p.y/state.height,1));});
  const effects=new Set([...state.effects,...state.zones]);
  for(const [effect,m] of effectMeshes)if(!effects.has(effect)){projectileGroup.remove(m);m.geometry.dispose();m.material.dispose();effectMeshes.delete(effect);}
  for(const e of effects){let m=effectMeshes.get(e);
    if(!m){
      if(e.points){const points=e.points.map(p=>worldPosition(p.x/state.width,p.y/state.height,1));m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:e.color,transparent:true}));}
      else{m=new THREE.Mesh(new THREE.RingGeometry(.65,1,32),new THREE.MeshBasicMaterial({color:e.color||0x91b766,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.copy(worldPosition(e.x/state.width,e.y/state.height,.6));}
      projectileGroup.add(m);effectMeshes.set(e,m);
    }
    m.material.opacity=Math.min(.8,e.life/(e.max||2.8));
    if(!e.points)m.scale.setScalar(e.radius?e.radius/state.width*22:.25+(1-e.life/e.max)*1.2);
  }
}

let viewBlend = 0, lastFrameTime = 0;
let viewportWidth = 1, viewportHeight = 1, dockHeight = 76;
function frameCamera() {
  const state = window.WuxingGame.state;
  camera.position.set(3, 18 + 9 * viewBlend, 24 - 5 * viewBlend);
  camera.lookAt(0, 0.1, 0);
  camera.updateMatrixWorld(true);
  // Fit island, entrance gates and tower headroom above the reserved dock strip.
  const bounds = new THREE.Box3();
  const map = window.WuxingGame.getMap();
  const points = [...map.routes.flat(), ...map.slots];
  const xs = points.map(p => (p[0]-.5)*22), zs = points.map(p => (p[1]-.5)*12);
  for(const x of [Math.min(-11,...xs)-.65, Math.max(11,...xs)+.65])
    for(const z of [Math.min(-6,...zs)-.4, Math.max(6,...zs)+.4])
      for(const y of [-1.8,2.8]) bounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const aspect=viewportWidth/viewportHeight;
  const available=Math.max(.35,(viewportHeight-dockHeight-12)/viewportHeight);
  const size=Math.max((bounds.max.x-bounds.min.x)/(2*aspect*.90),(bounds.max.y-bounds.min.y)/(2*available));
  const center=(bounds.min.y+bounds.max.y)/2-(dockHeight/viewportHeight)*size;
  camera.left=-size*aspect;camera.right=size*aspect;
  camera.top=center+size;camera.bottom=center-size;
  camera.updateProjectionMatrix();
}
function resize() {
  const rect = host.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  viewportWidth=rect.width;viewportHeight=rect.height;
  dockHeight=document.querySelector('.bottom-dock')?.getBoundingClientRect().height || 76;
  frameCamera();renderer.setSize(rect.width, rect.height, false);
}

function frame(time) {
  if(!window.Wuxing3D.active)return;
  const state = window.WuxingGame.state;
  const dt=Math.min(.05,Math.max(0,(time-lastFrameTime)/1000));lastFrameTime=time;
  const target=!state.waveActive&&!state.result?1:0;
  viewBlend+=(target-viewBlend)*(1-Math.exp(-dt*7));
  frameCamera();
  waterTime.value=state.time;
  if (state.mapId !== lastMapId) { buildMap(window.WuxingGame.getMap()); lastMapId = state.mapId; }
  if (!host.hidden && state.scene === "battle") { syncTowers(); syncEnemies(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(host);
new ResizeObserver(resize).observe(document.querySelector('.bottom-dock'));
window.Wuxing3D={active:new URLSearchParams(location.search).get('renderer')!=='canvas',
  projectSlot(i){const p=pads[i].position.clone().project(camera),r=host.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},
  input(x,y,touch=false){const r=host.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera);
    const hits=raycaster.intersectObjects([...pads,...towerGroup.children],true);let slot=null;
    for(const hit of hits){let o=hit.object;while(o&&slot===null){if(o.userData.slot!==undefined)slot=o.userData.slot;else if(o.userData.tower)slot=o.userData.tower.slot;o=o.parent;}if(slot!==null)break;}
    if(slot===null){
      let closest=touch?30:18;
      pads.forEach((pad,i)=>{const p=window.Wuxing3D.projectSlot(i),d=Math.hypot(x-p.x,y-p.y);
        if(d<closest){closest=d;slot=i;}
      });
    }
    if(slot===null)return {x:-10000,y:-10000};const [nx,ny]=window.WuxingGame.getMap().slots[slot];return {x:nx*window.WuxingGame.state.width,y:ny*window.WuxingGame.state.height};},
  stats:()=>({...renderer.info.memory,calls:renderer.info.render.calls,
    towerModels:[...towerMeshes.values()].map(mesh=>mesh.name),
    enemyModels:[...enemyMeshes.values()].map(mesh=>mesh.userData.model||mesh.name)})};
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();window.Wuxing3D.active=false;document.body.classList.remove('three-ready');});
if(window.Wuxing3D.active)
document.body.classList.add("three-ready");
resize();
requestAnimationFrame(frame);
