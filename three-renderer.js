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
const feedbackCanvas = document.createElement("canvas");
feedbackCanvas.id = "combat-feedback-canvas";
feedbackCanvas.setAttribute("aria-hidden", "true");
host.append(feedbackCanvas);
const feedback = feedbackCanvas.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
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
const rangePreview = new THREE.Mesh(
  new THREE.RingGeometry(.965,1,72),
  new THREE.MeshBasicMaterial({color:0xf3d98d,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false,depthTest:false})
);
rangePreview.rotation.x=-Math.PI/2;rangePreview.visible=false;rangePreview.renderOrder=3;towerGroup.add(rangePreview);
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

function spellMaterial(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color), transparent: opacity < 1, opacity,
    blending: THREE.NormalBlending, depthWrite: false, toneMapped: true
  });
}

function createShotVisual(projectile) {
  const kind=projectile.form,color=projectile.color||'#ffffff',group=new THREE.Group();
  const glow=spellMaterial(color,.82),soft=spellMaterial(color,.24);
  let core;
  if(kind==='thunder'){
    core=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),glow);core.scale.y=1.45;
    for(let i=0;i<3;i++){const arc=new THREE.Mesh(new THREE.TorusGeometry(.22+i*.055,.018,4,16,Math.PI*1.45),glow);arc.rotation.set(i*.8,Math.PI/2,i*1.9);arc.userData.spin=(i%2?1:-1)*5;group.add(arc);}
  }else if(kind==='metal'||kind==='spike'||kind==='blade'){
    core=new THREE.Mesh(new THREE.OctahedronGeometry(kind==='blade'?.2:.15),glow);
    core.scale.set(kind==='spike'?1.8:1,kind==='blade'?.35:.5,kind==='blade'?2.6:3.8);
    for(const side of kind==='blade'?[-1,1]:[]){const arc=new THREE.Mesh(new THREE.TorusGeometry(.3,.025,5,18,Math.PI*1.25),glow);arc.rotation.set(Math.PI/2,0,side*.7);arc.position.x=side*.18;group.add(arc);}
  }else if(kind==='water'||kind==='steam'){
    core=new THREE.Mesh(new THREE.SphereGeometry(kind==='steam'?.22:.17,12,8),kind==='steam'?soft:glow);
    for(let i=0;i<2;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.23+i*.08,.018,5,24),glow);ring.rotation.set(Math.PI/2,i*.7,0);ring.userData.spin=(i?1:-1)*3;group.add(ring);}
  }else if(kind==='fire'||kind==='lava'){
    core=new THREE.Mesh(new THREE.TetrahedronGeometry(kind==='lava'?.24:.2,1),glow);core.rotation.z=.5;
    for(let i=0;i<3;i++){const ember=new THREE.Mesh(new THREE.TetrahedronGeometry(.055),soft);ember.position.set((i-1)*.14,.08-i*.06,-.22-i*.12);ember.userData.orbit=i+1;ember.userData.baseY=ember.position.y;group.add(ember);}
  }else if(kind==='earth'||kind==='rock'||kind==='mud'){
    core=new THREE.Mesh(new THREE.DodecahedronGeometry(kind==='rock'?.25:.2,0),new THREE.MeshStandardMaterial({color,emissive:new THREE.Color(color).multiplyScalar(.35),roughness:.72,metalness:.08}));
    const rune=new THREE.Mesh(new THREE.RingGeometry(.18,.27,6),glow);rune.rotation.x=-Math.PI/2;rune.position.y=-.22;group.add(rune);group.userData.groundRune=rune;
  }else if(kind==='wood'||kind==='bog'||kind==='mist'){
    core=new THREE.Mesh(new THREE.IcosahedronGeometry(kind==='wood'?.13:.22,1),kind==='wood'?glow:soft);
    for(let i=0;i<3;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.055,7,5),glow);leaf.scale.set(1.8,.35,.8);leaf.position.set(Math.cos(i*2.1)*.2,Math.sin(i*1.7)*.12,-.1-i*.1);leaf.userData.orbit=i+1;leaf.userData.baseY=leaf.position.y;group.add(leaf);}
  }else if(kind==='ice'){
    core=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),glow);core.scale.y=1.8;
    for(let i=0;i<3;i++){const shard=new THREE.Mesh(new THREE.OctahedronGeometry(.07),soft);shard.position.set((i-1)*.17,.05,-.22);shard.userData.orbit=i+1;shard.userData.baseY=shard.position.y;group.add(shard);}
  }else{
    core=new THREE.Mesh(new THREE.SphereGeometry(.16,10,7),glow);
  }
  group.add(core);group.userData.core=core;
  const aura=new THREE.Mesh(new THREE.SphereGeometry(.28,10,7),soft);group.add(aura);group.userData.aura=aura;
  const trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:true}));
  trail.frustumCulled=false;projectileGroup.add(trail);group.userData.trail=trail;
  group.userData.kind=kind;return group;
}

function updateShotVisual(group,projectile,state) {
  const followsGround=projectile.form==='earth'||projectile.form==='rock'||projectile.form==='mud';
  const position=worldPosition(projectile.x/state.width,projectile.y/state.height,followsGround?.72:1.15);
  group.position.copy(position);
  const target=worldPosition(projectile.target.x/state.width,projectile.target.y/state.height,1.05),dx=target.x-position.x,dz=target.z-position.z;
  group.rotation.y=Math.atan2(dx,dz);const age=state.time-(projectile.bornAt||state.time);
  group.userData.core.rotation.z+=.16;group.userData.core.rotation.y+=.12;
  group.userData.aura.scale.setScalar(1+Math.sin(state.time*16)*.16);
  group.children.forEach(child=>{if(child.userData.spin)child.rotation.z+=child.userData.spin*.04;if(child.userData.orbit){const phase=child.userData.orbit*2.1+state.time*6;child.position.y=(child.userData.baseY||0)+Math.sin(phase)*.025;child.rotation.y=phase;}});
  if(group.userData.groundRune)group.userData.groundRune.rotation.z=state.time*2.4;
  const points=projectile.trail.map(point=>worldPosition(point.x/state.width,point.y/state.height,.95));
  if(projectile.form==='water'||projectile.form==='wood'||projectile.form==='mist')points.unshift(worldPosition(projectile.originX/state.width,projectile.originY/state.height,1.05));
  if(points.length>1)group.userData.trail.geometry.setFromPoints(points);
  group.userData.trail.material.opacity=Math.max(.16,.52-age*.26);
}

function slotHeight(map,index) {
  return {high:.94,spring:.62,ley:.72,choke:.66}[window.GameWorld.slotKind(map,index)]||.68;
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
    const kind=window.GameWorld.slotKind(map,index);
    const colors={high:0xc4c9b5,spring:0x8fb9b1,ley:0xbda56f,choke:0x9d8260};
    const baseHeight={high:.64,spring:.24,ley:.36,choke:.3}[kind],center={high:.25,spring:.46,ley:.5,choke:.47}[kind],p=worldPosition(x,y,center);
    const sides=kind==='ley'?6:kind==='choke'?8:12;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(.78,.94,baseHeight,sides), surface(kind==='choke'?'wood':'stone',colors[kind]));
    pad.position.copy(p); pad.castShadow = true; pad.receiveShadow = true; pad.name = `slot-${index}`; pad.userData.slot=index; mapGroup.add(pad); pads.push(pad);
    pad.userData.slotType=kind;pad.userData.towerHeight=slotHeight(map,index);
    const top=baseHeight/2+.018,accent={high:0xf0dda0,spring:0x7fe1e6,ley:0xffc85c,choke:0xe4b36f}[kind];
    const trim=new THREE.Mesh(new THREE.TorusGeometry(.61,.035,7,36),new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.35,metalness:.45,roughness:.48}));trim.rotation.x=Math.PI/2;trim.position.y=top;pad.add(trim);
    if(kind==='high'){
      for(let tier=0;tier<2;tier++){const step=new THREE.Mesh(new THREE.CylinderGeometry(.68-tier*.1,.82-tier*.08,.14,10),surface('stone',tier?0xd4d0b5:0x8b9589));step.position.y=top+.08+tier*.13;pad.add(step);}
      const crest=new THREE.Mesh(new THREE.TorusGeometry(.36,.032,6,30),new THREE.MeshStandardMaterial({color:accent,emissive:0xb88931,emissiveIntensity:.75,metalness:.45,roughness:.42}));crest.rotation.x=Math.PI/2;crest.position.y=top+.3;pad.add(crest);
    }else if(kind==='spring'){
      const water=new THREE.Mesh(new THREE.CircleGeometry(.56,32),new THREE.MeshStandardMaterial({color:0x62cbd4,emissive:0x1d7180,emissiveIntensity:1.1,transparent:true,opacity:.78,roughness:.2}));water.rotation.x=-Math.PI/2;water.position.y=top+.025;pad.add(water);
      const ripple=new THREE.Mesh(new THREE.TorusGeometry(.34,.022,6,32),new THREE.MeshBasicMaterial({color:0xc9ffff,transparent:true,opacity:.78}));ripple.rotation.x=Math.PI/2;ripple.position.y=top+.04;ripple.userData.ripple=true;pad.add(ripple);
    }else if(kind==='ley'){
      for(let crystal=0;crystal<3;crystal++){const a=crystal*Math.PI*2/3,c=new THREE.Mesh(new THREE.OctahedronGeometry(.12),new THREE.MeshStandardMaterial({color:0xffd36b,emissive:0xd47a18,emissiveIntensity:1.7,roughness:.25}));c.position.set(Math.cos(a)*.55,top+.15,Math.sin(a)*.55);c.scale.y=1.7;pad.add(c);}
    }else{
      for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.1,.38,.1),surface('wood',0x594331));post.position.set(side*.58,top+.18,0);pad.add(post);}
      for(const offset of [-.22,.22]){const mark=new THREE.Mesh(new THREE.BoxGeometry(.3,.025,.055),new THREE.MeshBasicMaterial({color:0xffd28a}));mark.position.set(offset,top+.025,0);mark.rotation.y=offset>0?.45:-.45;pad.add(mark);}
    }
  });
  if(map.feature==='gorge'){
    const stream=new THREE.Mesh(new THREE.PlaneGeometry(18,1.35),new THREE.MeshStandardMaterial({color:0x4a9ca7,emissive:0x164e59,emissiveIntensity:.65,transparent:true,opacity:.82,roughness:.18}));stream.rotation.x=-Math.PI/2;stream.position.set(-1,-.16,0);mapGroup.add(stream);
  }else if(map.feature==='ridge'){
    for(const [x,z,s] of [[-7,-5.1,.72],[0,5.1,.62],[7,-5,.68]]){const ridge=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),surface('stone',0x81918a));ridge.position.set(x,-.12,z);ridge.scale.set(1.15*s,1.35*s,.72*s);ridge.rotation.y=x;ridge.castShadow=true;mapGroup.add(ridge);}
  }else if(map.feature==='ruins'){
    for(const [x,z] of [[-4,-4.9],[0,4.8],[4,-4.8]]){for(const side of [-1,1]){const column=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.8,8),surface('stone',0x8e9487));column.position.set(x+side*.65,.55,z);column.castShadow=true;mapGroup.add(column);}addBox(mapGroup,[1.6,.18,.34],new THREE.Vector3(x,1.42,z),0x756a55);}
  }
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
  group.position.copy(worldPosition(x,y,slotHeight(window.WuxingGame.getMap(),tower.slot)));
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
    mesh.position.copy(worldPosition(x,y,slotHeight(window.WuxingGame.getMap(),tower.slot)));
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
  pads.forEach((pad,i)=>{pad.material.emissive.setHex(state.pendingBuildSlot===i?0x786b31:0);pad.children.forEach(child=>{if(child.userData.ripple){const pulse=1+Math.sin(state.time*3+i)*.12;child.scale.setScalar(pulse);child.material.opacity=.55+Math.sin(state.time*3+i)*.2;}});});
  const focus=state.previewBuild?{slot:state.previewBuild.slot,level:1}:state.selectedTower||(state.pendingBuildSlot!==null?{slot:state.pendingBuildSlot,level:1}:null);
  if(focus){
    const [x,y]=window.WuxingGame.getMap().slots[focus.slot],range=window.WuxingGame.getTowerRange(focus);
    rangePreview.position.copy(worldPosition(x,y,.31));rangePreview.scale.set(range/state.width*22,range/state.height*12,1);rangePreview.visible=true;
    rangePreview.material.color.set(state.previewBuild?0xf3d98d:0x9fe8c2);
  }else rangePreview.visible=false;
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
  for(const [p,m] of shotMeshes)if(!shots.has(p)){
    projectileGroup.remove(m,m.userData.trail);disposeTree(m);
    m.userData.trail?.geometry.dispose();m.userData.trail?.material.dispose();shotMeshes.delete(p);
  }
  state.projectiles.forEach(p=>{let m=shotMeshes.get(p);if(!m){m=createShotVisual(p);shotMeshes.set(p,m);projectileGroup.add(m);}updateShotVisual(m,p,state);});
  const effects=new Set([...state.effects,...state.zones]);
  for(const [effect,m] of effectMeshes)if(!effects.has(effect)){projectileGroup.remove(m);m.geometry.dispose();m.material.dispose();effectMeshes.delete(effect);}
  for(const e of effects){let m=effectMeshes.get(e);
    if(!m){
      if(e.points){
        const points=[];
        e.points.forEach((point,index)=>{if(!index)return;const previous=e.points[index-1];points.push(worldPosition(previous.x/state.width,previous.y/state.height,1.05),worldPosition(point.x/state.width,point.y/state.height,1.05));});
        for(const column of e.columns||[]){const foot=worldPosition(column.x/state.width,column.y/state.height,1.05);points.push(foot.clone().add(new THREE.Vector3(-.18,4,.12)),foot.clone().add(new THREE.Vector3(.12,2.25,-.08)),foot.clone().add(new THREE.Vector3(.12,2.25,-.08)),foot);}
        m=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:e.color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
      }
      else{m=new THREE.Mesh(new THREE.RingGeometry(.65,1,32),new THREE.MeshBasicMaterial({color:e.color||0x91b766,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.copy(worldPosition(e.x/state.width,e.y/state.height,.6));}
      projectileGroup.add(m);effectMeshes.set(e,m);
    }
    m.material.opacity=Math.min(.8,e.life/(e.max||2.8));
    if(!e.points)m.scale.setScalar(e.radius?e.radius/state.width*22:.25+(1-e.life/e.max)*1.2);
  }
}

let viewBlend = 0, lastFrameTime = 0;
let viewportWidth = 1, viewportHeight = 1, dockHeight = 76;
function projectFeedback(x,y,lift=.9) {
  const p=worldPosition(x/Math.max(1,window.WuxingGame.state.width),y/Math.max(1,window.WuxingGame.state.height),lift).project(camera);
  return {x:(p.x+1)*viewportWidth/2,y:(1-p.y)*viewportHeight/2};
}
function drawCombatFeedback(state) {
  feedback.clearRect(0,0,viewportWidth,viewportHeight);
  feedback.textAlign="center";feedback.textBaseline="middle";
  if(state.pendingBuildSlot!==null){
    const slot=state.pendingBuildSlot,[x,y]=window.WuxingGame.getMap().slots[slot],meta=window.WuxingGame.getSlotMeta(slot),coverage=window.WuxingGame.getRouteCoverage(slot);
    const p=projectFeedback(x*state.width,y*state.height,slotHeight(window.WuxingGame.getMap(),slot)+.18),label=`${meta.name}  ${meta.short}  覆盖 ${coverage}%`;
    feedback.font="700 11px Microsoft YaHei";const width=feedback.measureText(label).width+20;
    feedback.fillStyle="rgba(18,51,52,.9)";feedback.strokeStyle="rgba(224,198,129,.8)";feedback.lineWidth=1;
    feedback.beginPath();feedback.roundRect(p.x-width/2,p.y-48,width,25,5);feedback.fill();feedback.stroke();
    feedback.fillStyle="#f6e7b7";feedback.fillText(label,p.x,p.y-35);
  }
  for(const enemy of state.enemies){
    if(enemy.dead)continue;
    const p=projectFeedback(enemy.x,enemy.y,enemy.boss?1.9:enemy.elite?1.45:1.05);
    if(enemy.hitFlashUntil>state.time){
      const alpha=Math.min(1,(enemy.hitFlashUntil-state.time)/.12);
      feedback.globalAlpha=alpha;feedback.strokeStyle="#fff7d4";feedback.lineWidth=2.5;feedback.shadowColor="#fff2a8";feedback.shadowBlur=10;
      feedback.beginPath();feedback.arc(p.x,p.y,enemy.boss?22:enemy.elite?17:12,0,Math.PI*2);feedback.stroke();feedback.shadowBlur=0;
    }
    if(enemy.casting){
      const remain=Math.max(0,enemy.nextSkillAt-state.time),progress=1-Math.min(1,remain);
      const radius=(enemy.boss?29:22)+Math.sin(state.time*14)*2;
      feedback.globalAlpha=.92;feedback.strokeStyle=remain<.3?"#ff8068":"#ffe39a";feedback.lineWidth=3;
      feedback.beginPath();feedback.arc(p.x,p.y,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);feedback.stroke();
      feedback.fillStyle="#fff1ba";feedback.font="800 10px Microsoft YaHei";feedback.fillText(remain<.3?"释放":"蓄力",p.x,p.y-radius-9);
    }
  }
  for(const effect of state.effects){
    if(effect.kind!=="damage"&&effect.kind!=="defeat")continue;
    const t=1-effect.life/effect.max,p=projectFeedback(effect.x,effect.y,effect.kind==="defeat"?1.1:1.4);
    if(effect.kind==="damage"){
      const label=`${effect.counter?"克制 ":""}${effect.value}`;
      feedback.globalAlpha=Math.min(1,effect.life/.18);feedback.font=`${effect.counter||effect.lethal?800:700} ${effect.counter?16:effect.lethal?15:12}px Microsoft YaHei`;
      feedback.lineWidth=3.5;feedback.strokeStyle="rgba(12,31,34,.9)";feedback.strokeText(label,p.x,p.y-18-t*26);
      feedback.fillStyle=effect.color;feedback.fillText(label,p.x,p.y-18-t*26);
    }else{
      feedback.globalAlpha=1-t;feedback.strokeStyle=effect.color;feedback.lineWidth=3;feedback.beginPath();feedback.arc(p.x,p.y,8+t*28,0,Math.PI*2);feedback.stroke();
    }
  }
  feedback.globalAlpha=1;
}
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
  const reserved=Math.min(24,dockHeight*.32);
  const available=Math.max(.62,(viewportHeight-reserved-8)/viewportHeight);
  const size=Math.max((bounds.max.x-bounds.min.x)/(2*aspect*.94),(bounds.max.y-bounds.min.y)/(2*available))*.92;
  const center=(bounds.min.y+bounds.max.y)/2-(reserved/viewportHeight)*size;
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
  const dpr=Math.min(window.devicePixelRatio||1,2);
  feedbackCanvas.width=Math.round(rect.width*dpr);feedbackCanvas.height=Math.round(rect.height*dpr);
  feedbackCanvas.style.width=`${rect.width}px`;feedbackCanvas.style.height=`${rect.height}px`;
  feedback.setTransform(dpr,0,0,dpr,0,0);
}

function frame(time) {
  if(!window.Wuxing3D.active)return;
  const state = window.WuxingGame.state;
  const dt=Math.min(.05,Math.max(0,(time-lastFrameTime)/1000));lastFrameTime=time;
  const target=!state.waveActive&&!state.result?1:0;
  viewBlend+=(target-viewBlend)*(1-Math.exp(-dt*7));
  frameCamera();
  if(!reducedMotion.matches&&state.shakeUntil>state.time){
    const fade=Math.min(1,(state.shakeUntil-state.time)/.12),strength=(state.shakeStrength||0)*fade;
    camera.position.x+=Math.sin(state.time*150)*strength;camera.position.y+=Math.cos(state.time*180)*strength*.55;camera.lookAt(0,.1,0);camera.updateMatrixWorld(true);
  }else if(state.shakeUntil<=state.time)state.shakeStrength=0;
  waterTime.value=state.time;
  if (state.mapId !== lastMapId) { buildMap(window.WuxingGame.getMap()); lastMapId = state.mapId; }
  if (!host.hidden && state.scene === "battle") {
    syncTowers();syncEnemies();renderer.render(scene,camera);drawCombatFeedback(state);
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
window.addEventListener("orientationchange",()=>requestAnimationFrame(resize));
window.visualViewport?.addEventListener("resize",resize);
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
    enemyModels:[...enemyMeshes.values()].map(mesh=>mesh.userData.model||mesh.name),
    shotStyles:[...shotMeshes.values()].map(mesh=>mesh.userData.kind)})};
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();window.Wuxing3D.active=false;document.body.classList.remove('three-ready');});
if(window.Wuxing3D.active)
document.body.classList.add("three-ready");
resize();
requestAnimationFrame(frame);
