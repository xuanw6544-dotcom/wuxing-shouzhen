import * as THREE from './assets/three.module.js';
import {surface} from './environment-3d.js';
import {createNatureTower,animateNatureTower} from './nature-tower-models.js';
import {createFireTower,animateFireTower} from './fire-tower-model.js';
import {createWaterTower,animateWaterTower} from './water-tower-model.js';

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#17292b');
scene.fog=new THREE.Fog('#17292b',24,60);
const camera=new THREE.PerspectiveCamera(32,1,.1,100);
scene.add(new THREE.HemisphereLight(0xe5f3ed,0x26363b,2.3));
const sun=new THREE.DirectionalLight(0xffe3b5,3.4);sun.position.set(-5,10,7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:7,bottom:-7});sun.shadow.bias=-.0003;scene.add(sun);
const rim=new THREE.DirectionalLight(0x9fdae7,2);rim.position.set(4,5,-6);scene.add(rim);
const stone=surface('stone',0x758079),dark=surface('stone',0x354643);
const bronze=new THREE.MeshStandardMaterial({color:0xbca16b,metalness:.75,roughness:.34});
const black=new THREE.MeshStandardMaterial({color:0x142b2d,roughness:.65});
const root=new THREE.Group();scene.add(root);
function mesh(geometry,material,x,y,z,parent=root){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function slab(w,d,h,y,mat,x=0){const c=.19,s=new THREE.Shape();[[-w/2+c,-d/2],[w/2-c,-d/2],[w/2,-d/2+c],[w/2,d/2-c],[w/2-c,d/2],[-w/2+c,d/2],[-w/2,d/2-c],[-w/2,-d/2+c]].forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSegments:2,bevelSize:.04,bevelThickness:.025,steps:1});g.rotateX(-Math.PI/2);return mesh(g,mat,x,y,0);}
slab(12.2,2.18,.24,-.2,dark);slab(12.05,2.04,.05,.04,bronze);slab(11.9,1.93,.17,.09,stone);
// Recessed channels and individual stone joints keep the long platform readable.
for(let i=0;i<6;i++){const x=-2.55+i*1.58;mesh(new THREE.BoxGeometry(.018,.012,1.8),black,x-.76,.285,0);}
for(const x of [-5.9,5.9]){mesh(new THREE.BoxGeometry(.1,.28,1.68),bronze,x,.13,0);}
for(let i=0;i<24;i++){const x=-5.7+i*.495;mesh(new THREE.BoxGeometry(.12,.065,.04),bronze,x,-.045,1.105);}
const names=['金','木','水','土','火','金'],kinds=['metal','wood','water','earth','fire','metal'];
const colors=[0xf4d78d,0x83dc96,0x6bccf2,0xd2b182,0xff9156,0xf4d78d];
const slots=[],towers=[];
function tower(kind,level){return kind==='fire'?createFireTower(level):kind==='water'?createWaterTower(level):createNatureTower(kind,level);}
function addSlot(x,index,kind){const radius=index<0?.83:.61;
mesh(new THREE.CylinderGeometry(radius,radius+.07,.12,8),dark,x,.32,0);
mesh(new THREE.CylinderGeometry(radius*.91,radius*.91,.035,48),bronze,x,.395,0);
mesh(new THREE.CylinderGeometry(radius*.82,radius*.82,.04,48),black,x,.42,0);
const mat=new THREE.MeshStandardMaterial({color:index<0?0xffb974:colors[index],emissive:index<0?0xff9252:colors[index],emissiveIntensity:.3,roughness:.4});
const ring=mesh(new THREE.TorusGeometry(radius*.72,.016,6,64),mat,x,.456,0);ring.rotation.x=Math.PI/2;
for(let i=0;i<8;i++){const a=i*Math.PI/4;const mark=mesh(new THREE.BoxGeometry(.04,.015,.095),bronze,x+Math.cos(a)*radius*.96,.425,Math.sin(a)*radius*.96);mark.rotation.y=-a;}
const model=tower(kind,index<0?3:2);model.scale.setScalar(index<0?.68:.48);model.position.set(x,.46,0);root.add(model);towers.push({model,kind});
const hit=mesh(new THREE.BoxGeometry(radius*2,2,radius*2),new THREE.MeshBasicMaterial({visible:false}),x,1,0);hit.userData.index=index;
slots.push({model,ring,hit,index});
}
addSlot(-4.65,-1,'fire');kinds.forEach((kind,i)=>addSlot(-2.55+i*1.58,i,kind));
const floor=mesh(new THREE.PlaneGeometry(200,200),surface('stone',0x344a49),0,-.43,0,scene);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
const arrangement=document.querySelector('#arrangement'),angle=document.querySelector('#angle'),motion=document.querySelector('#motion'),detail=document.querySelector('#detail');
let selected=-1,azimuth=0,time=0;
function update(){slots.forEach(s=>{s.model.visible=s.index<0||arrangement.value==='full'||arrangement.value==='mixed'&&s.index<3;s.ring.material.emissiveIntensity=s.index===selected?2:s.model.visible?.4:.06;});}
arrangement.onchange=()=>{selected=-1;update();detail.innerHTML='<strong>本命 · 赤焰</strong>　建造 50';};update();
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let drag=null;
renderer.domElement.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,last:e.clientX,moved:false};renderer.domElement.setPointerCapture(e.pointerId);};
renderer.domElement.onpointermove=e=>{if(!drag)return;if(Math.abs(e.clientX-drag.x)>8)drag.moved=true;if(drag.moved)azimuth=Math.max(-.45,Math.min(.45,azimuth+(e.clientX-drag.last)*.003));drag.last=e.clientX;};
renderer.domElement.onpointerup=e=>{if(!drag)return;if(!drag.moved){pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(slots.map(s=>s.hit))[0];if(hit){selected=hit.object.userData.index;update();const s=slots.find(s=>s.index===selected);detail.textContent=selected<0?'本命 · 赤焰　建造 50':s.model.visible?`${names[selected]}元素核心 · 已选中`:`仓位 ${selected+1} · 待入灵`;}}drag=null;};
renderer.domElement.onpointercancel=()=>drag=null;
document.querySelector('#reset').onclick=()=>{azimuth=0;angle.value=42;};
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(motion.checked)time+=dt;const distance=Math.max(10,7.25/(Math.tan(THREE.MathUtils.degToRad(16))*camera.aspect));const elevation=THREE.MathUtils.degToRad(+angle.value);camera.position.set(Math.sin(azimuth)*distance,Math.sin(elevation)*distance+.6,Math.cos(elevation)*Math.cos(azimuth)*distance);camera.lookAt(0,.6,0);for(const t of towers){if(!t.model.visible)continue;if(t.kind==='fire')animateFireTower(t.model,time);else if(t.kind==='water')animateWaterTower(t.model,time);else animateNatureTower(t.model,time);}renderer.render(scene,camera);}frame();
window.daisPreview={slots,renderer,camera};
