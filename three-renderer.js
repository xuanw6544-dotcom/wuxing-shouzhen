import * as THREE from "./assets/three.module.js";
import {surface,island,landscape,towerDetails,fusionDetails} from './environment-3d.js';

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
camera.position.set(7, 19, 22);
camera.lookAt(0, 0, 0);
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
  const kind = tower.element;
  const group = new THREE.Group();
  const levelScale = 1;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.62*levelScale,.82*levelScale,.32*levelScale,8), material("earth"));
  base.castShadow = true; base.receiveShadow = true; group.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.36*levelScale,.48*levelScale,1.05*levelScale,6), material(kind));
  body.position.y = .65*levelScale; body.castShadow = true; group.add(body);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.35*levelScale, 0), material(kind, true));
  core.position.y = 1.38*levelScale; core.castShadow = true; group.add(core);
  if(kind==='metal')core.scale.set(.6,1.8,.6);
  if(kind==='earth')core.scale.set(1.3,1.4,1.1);
  if(kind==='fire')core.scale.set(.8,1.6,.8);
  if(kind==='wood')for(let i=0;i<5;i++){
    const leaf=new THREE.Mesh(sharedBall,material(kind));leaf.scale.set(.38,.13,.2);leaf.position.set(Math.cos(i*2.4)*.4,.6+i*.16,Math.sin(i*2.4)*.4);leaf.rotation.z=i*.7;group.add(leaf);
  }
  if(kind==='water')for(let i=0;i<2;i++){
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(.5+i*.13,.035,8,40),material(kind,true));hoop.rotation.x=1+i*.4;hoop.position.y=.9+i*.3;group.add(hoop);
  }
  const aura = new THREE.Mesh(new THREE.TorusGeometry(.66*levelScale,.025,6,32), new THREE.MeshBasicMaterial({ color: elementColors[kind], transparent: true, opacity: .75 }));
  aura.rotation.x = Math.PI/2; aura.position.y = .2; group.add(aura);
  const [x,y] = window.WuxingGame.getMap().slots[tower.slot] || [.5,.5];
  group.position.copy(worldPosition(x,y,.7 + (tower.slot % 3 === 0 ? .22 : 0)));
  group.userData.tower = tower; group.userData.phase = tower.slot * .7;
  group.userData.signature=`${tower.element}:${tower.secondary}:${tower.level}`;
  // Replace temporary pedestal materials before assigning the detailed set.
  const form=window.WuxingGame.getTowerForm(tower);
  group.userData.moving=tower.secondary?fusionDetails(group,form.kind,tower.level,material,sharedBall):towerDetails(group,kind,tower.level,material,sharedBall);
  const bar=new THREE.Mesh(healthGeometry,healthMaterial);bar.position.y=2;bar.renderOrder=5;group.add(bar);group.userData.bar=bar;
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
    mesh.children[2].rotation.y = state.time*.7;
    mesh.children[2].position.y=1.38+Math.sin(state.time*2+tower.slot)*.06;
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
  const live=new Set(state.enemies);
  for(const [enemy,mesh] of enemyMeshes)if(!live.has(enemy)){enemyGroup.remove(mesh);enemyMeshes.delete(enemy);}
  state.enemies.forEach(enemy => {
    const nx = enemy.x / Math.max(1,state.width), ny = enemy.y / Math.max(1,state.height);
    const color = elementColors[enemy.element] || 0xd9d0b5;
    let mesh=enemyMeshes.get(enemy);
    if(!mesh){mesh=new THREE.Mesh(sharedBall,material(enemy.element));mesh.scale.setScalar(enemy.boss?.65:enemy.elite?.4:.26);const bar=new THREE.Mesh(healthGeometry,healthMaterial);bar.position.y=1.7;bar.renderOrder=5;mesh.add(bar);enemyMeshes.set(enemy,mesh);enemyGroup.add(mesh);}
    mesh.children[0].quaternion.copy(camera.quaternion);mesh.children[0].scale.x=Math.max(.001,enemy.hp/enemy.maxHp);
    mesh.position.copy(worldPosition(nx,ny,.72)); mesh.castShadow = true; enemyGroup.add(mesh);
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

function resize() {
  const rect = host.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const aspect = rect.width / rect.height, size = Math.max(8.9,15/aspect);
  camera.left = -size * aspect; camera.right = size * aspect; camera.top = size; camera.bottom = -size;
  camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false);
}

function frame(time) {
  if(!window.Wuxing3D.active)return;
  const state = window.WuxingGame.state;
  waterTime.value=state.time;
  if (state.mapId !== lastMapId) { buildMap(window.WuxingGame.getMap()); lastMapId = state.mapId; }
  if (!host.hidden && state.scene === "battle") { syncTowers(); syncEnemies(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(host);
window.Wuxing3D={active:new URLSearchParams(location.search).get('renderer')!=='canvas',
  projectSlot(i){const p=pads[i].position.clone().project(camera),r=host.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},
  input(x,y){const r=host.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera);
    const hits=raycaster.intersectObjects([...pads,...towerGroup.children],true);let slot=null;
    for(const hit of hits){let o=hit.object;while(o&&slot===null){if(o.userData.slot!==undefined)slot=o.userData.slot;else if(o.userData.tower)slot=o.userData.tower.slot;o=o.parent;}if(slot!==null)break;}
    if(slot===null)return {x:-10000,y:-10000};const [nx,ny]=window.WuxingGame.getMap().slots[slot];return {x:nx*window.WuxingGame.state.width,y:ny*window.WuxingGame.state.height};},
  stats:()=>({...renderer.info.memory,calls:renderer.info.render.calls})};
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();window.Wuxing3D.active=false;document.body.classList.remove('three-ready');});
if(window.Wuxing3D.active)
document.body.classList.add("three-ready");
resize();
requestAnimationFrame(frame);
