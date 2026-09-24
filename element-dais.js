import * as THREE from './assets/three.module.js';
import {surface} from './environment-3d.js';
import {createNatureTower,animateNatureTower} from './nature-tower-models.js';
import {createFireTower,animateFireTower} from './fire-tower-model.js';
import {createWaterTower,animateWaterTower} from './water-tower-model.js';

const dock=document.querySelector('.bottom-dock');
const canvas=document.createElement('canvas');canvas.className='dais-canvas';canvas.setAttribute('aria-hidden','true');
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'}); } catch { /* Keep the existing accessible inventory when WebGL is unavailable. */ }
if(renderer){
 dock.prepend(canvas);document.body.classList.add('dais-ready');
 dock.parentElement.appendChild(document.querySelector('#core-action-bar'));
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-4,4,1,-1,.1,40);
 camera.position.set(0,9,12);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xe6f3ef,0x263e36,2.4));
 const sun=new THREE.DirectionalLight(0xffe0ad,3);sun.position.set(-4,9,7);scene.add(sun);
 const stone=surface('stone',0x68796e),bronze=new THREE.MeshStandardMaterial({color:0xc2a879,metalness:.65,roughness:.4}),dark=surface('stone',0x283e38);
 function mesh(g,m,x,y,z){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);scene.add(o);return o;}
 mesh(new THREE.BoxGeometry(7.9,.16,1.0),dark,0,-.23,0);
 mesh(new THREE.BoxGeometry(7.85,.035,1.02),bronze,0,-.12,0);
 mesh(new THREE.BoxGeometry(7.8,.12,.96),stone,0,-.04,0);
 const colors={metal:0xf3d58d,wood:0x8bd59a,water:0x70cbeb,fire:0xff9b64,earth:0xe0bf85};
 const slots=Array.from({length:7},(_,i)=>{const x=-3.35+i*1.1;
  mesh(new THREE.CylinderGeometry(.45,.49,.10,8),dark,x,.08,0);
  const ring=mesh(new THREE.TorusGeometry(.38,.018,6,40),bronze.clone(),x,.15,0);ring.rotation.x=Math.PI/2;
  return {x,ring,kind:null,model:null};
 });
 const cache=new Map();
 function modelFor(kind,index){const key=kind+index;if(!cache.has(key)){const m=kind==='fire'?createFireTower(2):kind==='water'?createWaterTower(2):createNatureTower(kind,2);m.scale.setScalar(.38);m.position.set(slots[index].x,.15,0);scene.add(m);cache.set(key,m);}return cache.get(key);}
 let last=0,signature='',width=0,height=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function tick(now){requestAnimationFrame(tick);if(now-last<50||document.hidden)return;last=now;
  const s=window.WuxingGame?.state;
  if(!s||s.scene!=='battle'||s.droppedElement||s.selectedTower)return;
  const kinds=[s.initialElement,...Array.from({length:6},(_,i)=>s.inventory[i]?.element||null)];
  const next=JSON.stringify([kinds,s.pendingCore?.id,s.buildElement,s.gold>=50]);
  if(next!==signature){signature=next;cache.forEach(m=>m.visible=false);slots.forEach((slot,i)=>{
   slot.kind=kinds[i];slot.model=slot.kind?modelFor(slot.kind,i):null;if(slot.model)slot.model.visible=true;
   const active=i===0?!!s.buildElement:!!s.pendingCore&&s.pendingCore.id===s.inventory[i-1]?.id;
   slot.ring.material.color.setHex(slot.kind?colors[slot.kind]:0x8b8d71);
   slot.ring.material.emissive.setHex(active?colors[slot.kind]:0x000000);slot.ring.material.emissiveIntensity=active?1.8:0;
  });}
  const w=dock.clientWidth,h=dock.clientHeight;if(!w||!h)return;
  if(width!==w||height!==h){width=w;height=h;renderer.setSize(w,h,false);camera.left=-3.95;camera.right=3.95;const half=3.95*h/w;camera.top=half+.12;camera.bottom=-half+.12;camera.updateProjectionMatrix();}
  const t=reduced.matches?0:now/1000;
  slots.forEach(slot=>{if(!slot.model)return;if(slot.kind==='fire')animateFireTower(slot.model,t);else if(slot.kind==='water')animateWaterTower(slot.model,t);else animateNatureTower(slot.model,t);});
  renderer.render(scene,camera);
 }
 canvas.addEventListener('webglcontextlost',()=>document.body.classList.remove('dais-ready'));
 requestAnimationFrame(tick);
}
