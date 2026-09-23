import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// Visual-only renderer: game.js remains the authority for movement, combat and input.
const host = document.querySelector(".battlefield");
if (!host || !window.WuxingGame || !window.GameWorld) throw new Error("Three.js renderer host is unavailable");

const canvas = document.createElement("canvas");
canvas.id = "three-canvas";
host.prepend(canvas);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x8faea4, 0.018);
const camera = new THREE.OrthographicCamera(-12, 12, 7, -7, 0.1, 100);
camera.position.set(13, 17, 16);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xd9efdc, 0x183235, 2.1));
const sun = new THREE.DirectionalLight(0xffdfad, 3.3);
sun.position.set(-8, 16, 10); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
scene.add(sun);

const mapGroup = new THREE.Group();
const towerGroup = new THREE.Group();
const enemyGroup = new THREE.Group();
const projectileGroup = new THREE.Group();
scene.add(mapGroup, towerGroup, enemyGroup, projectileGroup);
const towerMeshes = new Map();
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
  return new THREE.Vector3((nx - .5) * 22, height, (.5 - ny) * 12);
}

function addBox(parent, size, position, color, bevel = 0) {
  const geometry = new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .84 }));
  mesh.position.copy(position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function addRoadSegment(route, a, b, index) {
  const p1 = worldPosition(a[0], a[1], index % 2 ? .35 : .05);
  const p2 = worldPosition(b[0], b[1], index % 2 ? .35 : .05);
  const dx = p2.x - p1.x, dz = p2.z - p1.z, length = Math.hypot(dx, dz);
  const road = addBox(mapGroup, [length, .42, 1.55], new THREE.Vector3((p1.x+p2.x)/2, p1.y, (p1.z+p2.z)/2), 0x9f9670);
  road.rotation.y = Math.atan2(dz, dx); road.name = `bridge-${route}-${index}`;
  const support = addBox(mapGroup, [length + .12, .8, 1.72], new THREE.Vector3((p1.x+p2.x)/2, p1.y-.55, (p1.z+p2.z)/2), 0x3b5755);
  support.rotation.y = road.rotation.y;
  for (let i = 1; i < Math.max(2, Math.floor(length / 2.4)); i++) {
    const t = i / Math.max(2, Math.floor(length / 2.4));
    const x = p1.x + dx*t, z = p1.z + dz*t;
    const post = addBox(mapGroup, [.12, 1.25, .12], new THREE.Vector3(x, p1.y+.45, z-0.78), 0x4b3c2e);
    post.castShadow = true;
  }
}

function buildMap(map) {
  mapGroup.clear();
  addBox(mapGroup, [30, .8, 18], new THREE.Vector3(0, -1.3, 0), map.feature === "array" ? 0x315b5a : 0x355b55);
  for (const [routeIndex, route] of map.routes.entries()) {
    for (let i=0;i<route.length-1;i++) addRoadSegment(routeIndex, route[i], route[i+1], i);
  }
  map.slots.forEach(([x,y], index) => {
    const p = worldPosition(x,y,.48 + (index % 3 === 0 ? .22 : 0));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(.78,.92,.28,8), new THREE.MeshStandardMaterial({ color: 0x6c806b, roughness: .9 }));
    pad.position.copy(p); pad.castShadow = true; pad.receiveShadow = true; pad.name = `slot-${index}`; mapGroup.add(pad);
  });
  if (map.feature === "array") {
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, .12, 48), new THREE.MeshPhysicalMaterial({ color: 0x438e99, roughness: .18, metalness: .1, transmission: .15, transparent: true, opacity: .82 }));
    water.position.set(0, .03, 0); water.receiveShadow = true; mapGroup.add(water);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.85, .06, 8, 64), new THREE.MeshBasicMaterial({ color: 0xe0c77a, transparent: true, opacity: .7 }));
    ring.rotation.x = Math.PI/2; ring.position.y = .12; mapGroup.add(ring);
  }
}

function buildTower(tower) {
  const kind = tower.element;
  const group = new THREE.Group();
  const levelScale = 1 + (tower.level - 1) * .18;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.62*levelScale,.82*levelScale,.32*levelScale,8), material("earth"));
  base.castShadow = true; base.receiveShadow = true; group.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.36*levelScale,.48*levelScale,1.05*levelScale,6), material(kind));
  body.position.y = .65*levelScale; body.castShadow = true; group.add(body);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.35*levelScale, 0), material(kind, true));
  core.position.y = 1.38*levelScale; core.castShadow = true; group.add(core);
  const aura = new THREE.Mesh(new THREE.TorusGeometry(.66*levelScale,.025,6,32), new THREE.MeshBasicMaterial({ color: elementColors[kind], transparent: true, opacity: .75 }));
  aura.rotation.x = Math.PI/2; aura.position.y = .2; group.add(aura);
  const [x,y] = window.WuxingGame.getMap().slots[tower.slot] || [.5,.5];
  group.position.copy(worldPosition(x,y,.7 + (tower.slot % 3 === 0 ? .22 : 0)));
  group.userData.tower = tower; group.userData.phase = tower.slot * .7;
  return group;
}

function syncTowers() {
  const state = window.WuxingGame.state;
  const live = new Set(state.towers);
  state.towers.forEach(tower => {
    let mesh = towerMeshes.get(tower);
    if (!mesh) { mesh = buildTower(tower); towerMeshes.set(tower, mesh); towerGroup.add(mesh); }
    const [x,y] = window.WuxingGame.getMap().slots[tower.slot] || [.5,.5];
    mesh.position.copy(worldPosition(x,y,.7 + (tower.slot % 3 === 0 ? .22 : 0)));
    const scale = 1 + (tower.level - 1) * .18;
    mesh.scale.setScalar(scale * (tower.hp <= 0 ? .72 : 1));
    mesh.rotation.y += .002;
    mesh.children[2].rotation.y += .02;
  });
  for (const [tower, mesh] of towerMeshes) if (!live.has(tower)) { towerGroup.remove(mesh); towerMeshes.delete(tower); }
}

function syncEnemies() {
  enemyGroup.clear();
  const state = window.WuxingGame.state;
  state.enemies.slice(0, 90).forEach(enemy => {
    const nx = enemy.x / Math.max(1,state.width), ny = enemy.y / Math.max(1,state.height);
    const color = elementColors[enemy.element] || 0xd9d0b5;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(enemy.boss ? .42 : enemy.elite ? .3 : .22, 1), new THREE.MeshStandardMaterial({ color, roughness: .65, emissive: color, emissiveIntensity: enemy.boss ? .4 : .12 }));
    mesh.position.copy(worldPosition(nx,ny,.72)); mesh.castShadow = true; enemyGroup.add(mesh);
  });
}

function resize() {
  const rect = host.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const aspect = rect.width / rect.height, size = 13;
  camera.left = -size * aspect; camera.right = size * aspect; camera.top = size; camera.bottom = -size;
  camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false);
}

function frame(time) {
  const state = window.WuxingGame.state;
  if (state.mapId !== lastMapId) { buildMap(window.WuxingGame.getMap()); lastMapId = state.mapId; }
  if (!host.hidden && state.scene === "battle") { syncTowers(); syncEnemies(); }
  mapGroup.rotation.y = Math.sin(time * .00008) * .008;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
document.body.classList.add("three-ready");
resize();
requestAnimationFrame(frame);
