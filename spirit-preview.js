import * as THREE from './assets/three.module.js';
import {createSpirit,animateSpirit,disposeSpirit} from './spirit-models.js';

const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x12282d);
const camera=new THREE.PerspectiveCamera(34,1,.1,60);
scene.add(new THREE.HemisphereLight(0xe1f6ff,0x1d312a,2));
const sun=new THREE.DirectionalLight(0xffe5b9,3);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const rim=new THREE.DirectionalLight(0x6cbde1,1.8);rim.position.set(3,3,-4);scene.add(rim);
const floor=new THREE.Mesh(new THREE.BoxGeometry(10,.16,4.4),new THREE.MeshStandardMaterial({color:0x29484b,roughness:.85}));floor.position.y=-.13;floor.receiveShadow=true;scene.add(floor);
const selector=document.querySelector('#element'),motion=document.querySelector('#motion'),zoom=document.querySelector('#zoom');
const kinds=['metal','wood','water','fire','earth'];
let actors=[],mode='gallery',azimuth=.08,elevation=.4,pointer=null,time=0;
function rebuild(){
 actors.forEach(disposeSpirit);actors=[];
 const active=selector.value==='all'?kinds:[selector.value],count=mode==='march'?20:active.length;
 for(let i=0;i<count;i++){const root=createSpirit(active[i%active.length]);root.userData.index=i;actors.push(root);scene.add(root);}
 floor.scale.set(mode==='march'?1:active.length===1?.26:1,1,mode==='march'?1:.65);
}
selector.addEventListener('change',rebuild);
document.querySelectorAll('[name=mode]').forEach(input=>input.addEventListener('change',()=>{mode=input.value;rebuild();}));
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);resize();rebuild();
renderer.domElement.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!pointer)return;azimuth-=(e.clientX-pointer.x)*.005;elevation=Math.max(.15,Math.min(1.1,elevation+(e.clientY-pointer.y)*.004));pointer={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('lostpointercapture',()=>pointer=null);
const clock=new THREE.Clock();
function frame(){
 requestAnimationFrame(frame);const dt=Math.min(.1,clock.getDelta());if(motion.checked)time+=dt;
 const wide=mode==='march'||actors.length>1;
 const distance=Math.max(wide?8:3.8,(wide?20:4.5)/camera.aspect)/Number(zoom.value);
 camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*distance,.5+Math.sin(elevation)*distance,Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(0,.5,0);
 actors.forEach((root,i)=>{
  if(mode==='march'){
   const row=Math.floor(i/5),x=((i%5)*1.7+time*.65+row*.4)%8.6-4.3;
   root.position.set(x,0,(row-1.5)*.92);root.scale.setScalar(.65*Math.min(1,(4.3-Math.abs(x))/.45));
  }else{root.position.set((i-(actors.length-1)/2)*1.8,0,0);root.scale.setScalar(1);}
  animateSpirit(root,time,i*.63);
 });
 renderer.render(scene,camera);
}
frame();
