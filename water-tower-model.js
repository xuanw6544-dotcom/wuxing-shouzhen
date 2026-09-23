import * as THREE from './assets/three.module.js';
import {surface} from './environment-3d.js';

export function createWaterTower(level=1){
 const root=new THREE.Group();root.name=`water-sanctum-${level}`;
 const stone=surface('stone',0x8dadae);stone.bumpScale=.016;stone.roughness=.7;
 const jade=new THREE.MeshStandardMaterial({color:0x344f60,roughness:.4,metalness:.22});
 const silver=new THREE.MeshStandardMaterial({color:0xc2dcde,metalness:.72,roughness:.23});
 const gold=new THREE.MeshStandardMaterial({color:0xbda878,metalness:.7,roughness:.3});
 const recess=new THREE.MeshStandardMaterial({color:0x142e40,roughness:.45});
 const glow=new THREE.MeshStandardMaterial({color:0x9aeaff,emissive:0x199ec6,emissiveIntensity:.9,metalness:.25,roughness:.17});
 const crystal=new THREE.MeshPhysicalMaterial({color:0x55d3f8,emissive:0x126587,emissiveIntensity:.7,metalness:.25,roughness:.12,clearcoat:1});
 const water=new THREE.MeshPhysicalMaterial({color:0x31b2dc,emissive:0x0a4960,emissiveIntensity:.5,roughness:.1,metalness:.25,clearcoat:1,transparent:true,opacity:.58,depthWrite:false,side:THREE.DoubleSide});
 const foam=new THREE.MeshBasicMaterial({color:0xb5f2ff,transparent:true,opacity:.85,depthWrite:false});
 const mesh=(parent,g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=!m.transparent;parent.add(o);return o;};
 const plate=(parent,w,h,d,m,x=0,y=0,z=0)=>{
  const c=Math.min(w,h)*.18,s=new THREE.Shape();
  [[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]].forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.022,bevelThickness:.022,bevelSegments:3,steps:1});g.translate(0,0,-d/2);return mesh(parent,g,m,x,y,z);
 };
 const slab=(w,h,y,m)=>{const o=plate(root,w,w,h,m,0,y);o.rotation.x=-Math.PI/2;return o;};
 const tube=(parent,points,r,m)=>mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),28,r,6,false),m);
 slab(1.32,.18,.015,stone);slab(1.17,.055,.14,silver);slab(1.05,.14,.235,jade);
 mesh(root,new THREE.CylinderGeometry(.43,.5,.67,8),stone,0,.61,0);
 mesh(root,new THREE.CylinderGeometry(.47,.47,.075,8),gold,0,.36,0);
 mesh(root,new THREE.CylinderGeometry(.48,.43,.08,8),silver,0,.97,0);
 for(let i=0;i<4;i++){
  const face=new THREE.Group();face.rotation.y=i*Math.PI/2;root.add(face);
  plate(face,.32,.47,.045,recess,0,.62,.445);
  const gem=mesh(face,new THREE.OctahedronGeometry(.12),crystal,0,.64,.495);gem.scale.set(.7,1.6,.3);
  for(const side of [-1,1])tube(face,[[side*.04,.41,.49],[side*.13,.5,.49],[side*.13,.7,.49],[side*.08,.81,.49]],.012,silver);
 }
 // A lathed open basin leaves its water surface visible from the game camera.
 const basinProfile=[[.33,0],[.37,-.12],[.47,-.12],[.55,.05],[.53,.08],[.45,.01],[.4,-.06],[.35,-.05]];
 mesh(root,new THREE.LatheGeometry(basinProfile.map(([x,y])=>new THREE.Vector2(x,y)),32),silver,0,1.11,0);
 const pool=mesh(root,new THREE.CircleGeometry(.43,48),water,0,1.105,0);pool.rotation.x=-Math.PI/2;
 const ripples=[];
 for(let i=0;i<3;i++){const ring=mesh(root,new THREE.TorusGeometry(.35,.006,4,48),foam,0,1.115+i*.002,0);ring.rotation.x=Math.PI/2;ripples.push(ring);}
 const core=new THREE.Group();core.position.y=1.65;root.add(core);
 if(level===3){
  mesh(core,new THREE.SphereGeometry(.29,24,16),water);
  const inner=mesh(core,new THREE.OctahedronGeometry(.17),crystal);inner.scale.y=1.2;
  const latitude=mesh(core,new THREE.TorusGeometry(.292,.008,5,48),foam);latitude.rotation.x=Math.PI/2;
  const meridian=mesh(core,new THREE.TorusGeometry(.295,.006,5,48),foam);meridian.rotation.y=.6;
 }else{
  const gem=mesh(core,new THREE.OctahedronGeometry(level===1?.23:.27),crystal);gem.scale.set(.8,1.5,.8);
  const glint=mesh(core,new THREE.OctahedronGeometry(.115),glow,0,-.02,.06);glint.scale.set(.45,1.65,.45);
 }
 const ribbons=[];
 function ribbon(radius,height,offset){
  const group=new THREE.Group();group.position.y=height;group.rotation.z=offset;root.add(group);
  const positions=[],indices=[],edge=[];
  for(let i=0;i<=64;i++){
   const t=i/64,a=t*Math.PI*1.8,w=Math.sin(t*Math.PI)*.09+.005,y=Math.sin(a)*.055;
   positions.push(Math.cos(a)*(radius-w),y,Math.sin(a)*(radius-w),Math.cos(a)*(radius+w),y+.015,Math.sin(a)*(radius+w));
   edge.push([Math.cos(a)*(radius+w),y+.023,Math.sin(a)*(radius+w)]);
   if(i<64){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();mesh(group,g,water);tube(group,edge,.009,foam);ribbons.push(group);
 }
 ribbon(.49,1.49,.24);
 if(level>=2)ribbon(.59,1.3,-.28);
 if(level>=2)for(let i=0;i<4;i++){
  const a=Math.PI/4+i*Math.PI/2,g=new THREE.Group();g.rotation.y=a;root.add(g);
  plate(g,.2,.5,.22,stone,0,.46,.57);plate(g,.22,.06,.24,silver,0,.74,.57);
  const tip=mesh(g,new THREE.OctahedronGeometry(.075),glow,0,.84,.57);tip.scale.y=1.3;
 }
 const falls=[];
 if(level===3)for(const side of [-1,1]){
  const points=[[side*.45,1.1,0],[side*.55,.93,0],[side*.59,.59,.03],[side*.56,.31,.07]];
  const stream=tube(root,points,.034,water);falls.push(stream);
  tube(root,points.map(([x,y,z])=>[x-.014,y,z+.016]),.007,foam);
 }
 const drops=[];
 for(let i=0;i<2+level*2;i++){const drop=mesh(root,new THREE.SphereGeometry(.025,8,6),glow);drop.scale.y=1.25;drop.castShadow=false;drops.push(drop);}
 root.userData.waterVisual={core,ribbons,ripples,drops,falls,glow};root.userData.healthHeight=2.4;
 return root;
}

export function animateWaterTower(root,time){
 const p=root.userData.waterVisual;
 p.core.rotation.y=time*.5;p.core.position.y=1.65+Math.sin(time*1.8)*.045;
 p.ribbons.forEach((r,i)=>r.rotation.y=time*(i?-.47:.6)+i*2);
 p.ripples.forEach((r,i)=>r.scale.setScalar(.16+((time*.3+i/3)%1)*.84));
 p.drops.forEach((d,i)=>{const a=time*.65+i*2.4;d.position.set(Math.cos(a)*.58,1.3+Math.sin(a*1.6)*.29,Math.sin(a)*.58);});
 p.glow.emissiveIntensity=.85+Math.sin(time*2)*.15;
}
