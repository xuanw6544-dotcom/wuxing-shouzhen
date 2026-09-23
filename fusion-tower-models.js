import * as THREE from './assets/three.module.js';
import {surface} from './environment-3d.js';

export const FUSION_ART={
 thunder:{name:'雷霆 · 聚雷双柱',pair:['wood','fire'],color:0xab69ee,trim:0xcab5e8},
 bog:{name:'腐沼 · 缠根毒池',pair:['wood','earth'],color:0x9bcb4a,trim:0xa99963},
 spike:{name:'锋木 · 淬金刺木',pair:['metal','wood'],color:0xaac875,trim:0xd4c090},
 mist:{name:'风雾 · 叶冠雾阵',pair:['wood','water'],color:0x7edfc2,trim:0xb5d6c7},
 lava:{name:'熔岩 · 地火熔炉',pair:['fire','earth'],color:0xff702d,trim:0xc8945b},
 blade:{name:'灼刃 · 熔金刀阵',pair:['metal','fire'],color:0xffa442,trim:0xe3bf78},
 steam:{name:'蒸汽 · 双流法釜',pair:['water','fire'],color:0xbcebf3,trim:0xc4a580},
 rock:{name:'重岩 · 镇阵矿碑',pair:['metal','earth'],color:0xe1be72,trim:0xd3b575},
 mud:{name:'泥浆 · 陷地涡池',pair:['water','earth'],color:0xa4b7aa,trim:0xa79770},
 ice:{name:'寒冰 · 霜晶法座',pair:['metal','water'],color:0x77d7ff,trim:0xc3e6ed}
};

// Level intentionally is not an input: upgrades only scale this same model.
export function createFusionTower(kind){
 const spec=FUSION_ART[kind],root=new THREE.Group();root.name=`fusion-${kind}`;
 const stone=surface('stone',0x778482);stone.bumpScale=.022;stone.roughness=.73;
 const dark=new THREE.MeshStandardMaterial({color:new THREE.Color(spec.color).multiplyScalar(.23),roughness:.48,metalness:.3});
 const metal=new THREE.MeshStandardMaterial({color:spec.trim,roughness:.28,metalness:.7});
 const light=new THREE.MeshStandardMaterial({color:spec.color,emissive:spec.color,emissiveIntensity:.65,roughness:.23,metalness:.25});
 const bright=new THREE.MeshStandardMaterial({color:0xf0f4d7,emissive:spec.color,emissiveIntensity:.45,roughness:.2});
 const bark=kind==='bog'||kind==='spike'?surface('wood',kind==='bog'?0x65723f:0x6d6344):null;
 const mesh=(p,g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=!m.transparent;p.add(o);return o;};
 const plate=(p,points,d,m,x=0,y=0,z=0)=>{
  const s=new THREE.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.022,bevelThickness:.022,bevelSegments:2,steps:1});g.translate(0,0,-d/2);return mesh(p,g,m,x,y,z);
 };
 const box=(p,w,h,d,m,x=0,y=0,z=0)=>{const c=Math.min(w,h)*.16;return plate(p,[[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]],d,m,x,y,z);};
 const tube=(p,points,r,m)=>mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),24,r,6,false),m);
 const slab=(w,h,y,m)=>{const o=box(root,w,w,h,m,0,y);o.rotation.x=-Math.PI/2;return o;};
 const gem=(p,r,x,y,z)=>{const s=mesh(p,new THREE.OctahedronGeometry(r*1.2),metal,x,y,z);s.scale.set(.75,1.3,.4);const c=mesh(p,new THREE.OctahedronGeometry(r),light,x,y,z+.04);c.scale.set(.68,1.3,.4);return c;};
 const moving=[],rotors=[],pulses=[],particles=[];
 const float=(m,phase=0)=>{moving.push({mesh:m,y:m.position.y,phase});return m;};
 const ring=(p,r,y,m=metal)=>{const o=mesh(p,new THREE.TorusGeometry(r,.02,6,48),m,0,y);o.rotation.x=Math.PI/2;return o;};
 const pedestal=(height=.62)=>{box(root,.69,height,.65,dark,0,.34+height/2);slab(.85,.07,.37+height,metal);for(let i=0;i<4;i++){const g=new THREE.Group();g.rotation.y=i*Math.PI/2;root.add(g);gem(g,.11,0,.34+height*.52,.36);for(const side of [-1,1])box(g,.045,height*.73,.05,metal,side*.27,.34+height/2,.35);}};
 const basin=(height=.65)=>{
  mesh(root,new THREE.LatheGeometry([[.38,-.13],[.48,-.16],[.64,.09],[.61,.14],[.53,.045],[.44,-.08],[.38,-.08]].map(p=>new THREE.Vector2(...p)),32),dark,0,height);
  ring(root,.59,height+.11);const pool=mesh(root,new THREE.CircleGeometry(.49,48),light,0,height-.015);pool.rotation.x=-Math.PI/2;return pool;
 };
 slab(1.32,.17,.015,stone);slab(1.17,.055,.14,metal);slab(1.04,.13,.24,dark);

 if(kind==='thunder'){
  pedestal(.55);
  for(const side of [-1,1]){
   tube(root,[[side*.32,.87,0],[side*.5,1.14,0],[side*.45,1.57,0],[side*.28,1.89,0]],.085,metal);
   box(root,.19,.18,.2,stone,side*.46,1.21,0);gem(root,.085,side*.29,1.87,.04);
  }
  const core=mesh(root,new THREE.OctahedronGeometry(.22),light,0,1.48,0);core.scale.y=1.5;float(core);rotors.push(core);
  const lightningMaterial=new THREE.MeshBasicMaterial({color:0xe2c7ff,transparent:true,opacity:.9});
  for(const side of [-1,1]){
   const arc=tube(root,[[side*.29,1.85,.05],[side*.11,1.73,.08],[side*.23,1.62,.06],[0,1.45,.04]],.012,lightningMaterial);pulses.push(arc);
  }
  ring(root,.48,1.02,light);
 }else if(kind==='bog'){
  basin(.64);
  for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5,g=new THREE.Group();g.rotation.y=a;root.add(g);
   tube(g,[[0,.15,.62],[.1,.48,.55],[-.12,.85,.39],[.06,1.22,.29]],.059,bark);
   const bud=mesh(g,new THREE.SphereGeometry(.105,12,8),light,.06,1.22,.29);bud.scale.y=1.3;float(bud,a);
  }
  const poison=new THREE.MeshPhysicalMaterial({color:0x7eab32,roughness:.2,clearcoat:1});
  for(let i=0;i<5;i++){const a=i*2.4,b=mesh(root,new THREE.SphereGeometry(.09,10,8),poison,Math.cos(a)*.32,.65,Math.sin(a)*.32);float(b,a);}
  gem(root,.13,0,.42,.6);
 }else if(kind==='spike'){
  pedestal(.42);
  tube(root,[[-.14,.8,0],[.12,1.14,0],[-.03,1.5,0],[0,1.82,0]],.12,bark);
  for(let i=0;i<6;i++){
   const g=new THREE.Group(),a=i*Math.PI/3;g.rotation.y=a;root.add(g);
   tube(g,[[0,.94,0],[.27,1.06,.02],[.38,1.35,.02]],.046,bark);
   const spike=plate(g,[[-.07,0],[.07,0],[.04,.24],[0,.62],[-.08,.22]],.07,metal,.35,1.15,0);spike.rotation.z=-.57;
   gem(g,.06,.23,1.05,.07);
  }
  const seed=mesh(root,new THREE.OctahedronGeometry(.19),light,0,1.75,0);float(seed);
 }else if(kind==='mist'){
  pedestal(.67);
  const jade=new THREE.MeshStandardMaterial({color:0x558f78,roughness:.36,metalness:.25,side:THREE.DoubleSide});
  for(let i=0;i<4;i++){
   const g=new THREE.Group();g.rotation.y=i*Math.PI/2;root.add(g);
   const leaf=plate(g,[[0,0],[.29,.12],[.46,.48],[.21,.4],[.04,.21]],.045,jade,0,.95,0);
   tube(g,[[.03,1,.035],[.2,1.16,.04],[.4,1.39,.035]],.012,metal);
  }
  const vapor=new THREE.MeshBasicMaterial({color:0xbde4db,transparent:true,opacity:.23,depthWrite:false});
  for(let j=0;j<3;j++){
   const g=new THREE.Group();root.add(g);g.position.y=1.19+j*.22;rotors.push(g);
   tube(g,Array.from({length:27},(_,i)=>{const a=i/26*Math.PI*1.7;return [Math.cos(a)*(.42-j*.05),Math.sin(a)*.055,Math.sin(a)*(.42-j*.05)];}),.035,vapor);
  }
  const core=mesh(root,new THREE.OctahedronGeometry(.18),light,0,1.56,0);float(core);
 }else if(kind==='lava'){
  const rock=surface('stone',0x44434a);rock.bumpScale=.04;
  mesh(root,new THREE.LatheGeometry([[.52,0],[.62,.15],[.51,.45],[.36,.81],[.26,.86],[.22,.74],[.31,.53]].map(p=>new THREE.Vector2(...p)),9),rock,0,.33,0);
  const lava=mesh(root,new THREE.CircleGeometry(.26,32),light,0,1.08,0);lava.rotation.x=-Math.PI/2;
  for(let i=0;i<5;i++){
   const g=new THREE.Group();g.rotation.y=i*Math.PI*2/5;root.add(g);
   tube(g,[[0,1.18,.3],[.05,.91,.44],[-.08,.66,.54],[0,.43,.62]],.02,light);
   const c=mesh(g,new THREE.DodecahedronGeometry(.095),rock,.2,1.38,.18);gem(c,.04,0,0,.08);float(c,i);
  }
  const ember=mesh(root,new THREE.OctahedronGeometry(.16),light,0,1.38,0);float(ember);
  ring(root,.58,.36,metal);
 }else if(kind==='blade'){
  pedestal(.65);
  for(let i=0;i<3;i++){
   const g=new THREE.Group();root.add(g);g.position.set((i-1)*.35,1.05,i===1?0:-.05);g.rotation.z=-(i-1)*.3;g.scale.setScalar(i===1?1:.76);float(g,i);
   plate(g,[[-.08,0],[.1,0],[.18,.53],[.08,.94],[-.12,1.09],[-.02,.69]],.1,metal);
   plate(g,[[.07,.03],[.125,.5],[.044,.85],[-.095,1.045],[-.024,.69]],.025,light,0,0,.07);
   box(g,.31,.075,.16,metal,0,-.02);box(g,.07,.17,.08,dark,0,-.15);
  }
 }else if(kind==='steam'){
  pedestal(.34);
  mesh(root,new THREE.SphereGeometry(.43,20,12),dark,0,1.02,0);
  ring(root,.435,.97);ring(root,.35,1.28);
  mesh(root,new THREE.CylinderGeometry(.16,.32,.17,16),metal,0,1.4,0);
  const cold=new THREE.MeshStandardMaterial({color:0x66c8df,emissive:0x195564,roughness:.25});
  const hot=new THREE.MeshStandardMaterial({color:0xef8548,emissive:0x90300b,roughness:.3});
  for(const side of [-1,1]){
   tube(root,[[side*.25,.79,0],[side*.53,.9,0],[side*.56,1.24,0],[side*.4,1.36,0]],.049,metal);
   tube(root,[[side*.25,.78,.07],[side*.51,.92,.07],[side*.53,1.22,.07]],.015,side<0?cold:hot);
  }
  gem(root,.11,0,1.02,.43);
  const vapor=new THREE.MeshBasicMaterial({color:0xe8f4ec,transparent:true,opacity:.2,depthWrite:false});
  for(let i=0;i<5;i++){const puff=mesh(root,new THREE.SphereGeometry(.105,12,8),vapor);particles.push(puff);}
 }else if(kind==='rock'){
  pedestal(.45);
  const core=new THREE.Group();root.add(core);core.position.y=1.35;float(core);
  box(core,.59,.94,.46,stone);box(core,.63,.08,.5,metal,0,-.34);box(core,.63,.08,.5,metal,0,.34);
  gem(core,.15,0,0,.265);
  for(const side of [-1,1])box(core,.04,.58,.035,metal,side*.23,0,.25);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,g=new THREE.Group();g.position.set(Math.cos(a)*.55,1,Math.sin(a)*.55);root.add(g);mesh(g,new THREE.DodecahedronGeometry(.15),stone);gem(g,.05,0,0,.13);float(g,a);}
  ring(root,.5,.88,light);
 }else if(kind==='mud'){
  basin(.61);
  const mud=new THREE.MeshStandardMaterial({color:0x67654b,roughness:.23,metalness:.08});
  const pool=mesh(root,new THREE.CircleGeometry(.5,48),mud,0,.62,0);pool.rotation.x=-Math.PI/2;
  const spiral=new THREE.Group();spiral.position.y=.65;root.add(spiral);rotors.push(spiral);
  tube(spiral,Array.from({length:65},(_,i)=>{const t=i/64,a=t*Math.PI*5,r=.05+t*.42;return [Math.cos(a)*r,t*.03,Math.sin(a)*r];}),.014,metal);
  for(const side of [-1,1]){
   box(root,.2,.68,.23,stone,side*.46,.72,0);gem(root,.075,side*.46,.86,.145);
  }
  box(root,1.06,.12,.28,stone,0,1.13,0);
  const seal=gem(root,.16,0,.95,.04);float(seal);
  for(let i=0;i<3;i++){const o=mesh(root,new THREE.SphereGeometry(.068,10,6),mud,Math.sin(i*3)*.3,.62,Math.cos(i*3)*.3);o.scale.y=.5;float(o,i);}
 }else if(kind==='ice'){
  pedestal(.45);
  const frost=new THREE.MeshPhysicalMaterial({color:0x9fe4f5,emissive:0x1a5069,roughness:.12,metalness:.25,clearcoat:1});
  const core=mesh(root,new THREE.OctahedronGeometry(.3),frost,0,1.39,0);core.scale.set(.8,2.1,.8);float(core);
  for(let i=0;i<6;i++){
   const g=new THREE.Group();g.rotation.y=i*Math.PI/3;root.add(g);
   const ice=mesh(g,new THREE.OctahedronGeometry(.2),frost,0,1.02,.46);ice.scale.set(.6,1.85,.6);ice.rotation.x=.36;
   tube(g,[[0,.76,.22],[0,.76,.61]],.016,metal);
   for(const side of [-1,1])tube(g,[[0,.76,.46],[side*.12,.76,.53]],.012,metal);
  }
  for(let i=0;i<5;i++){const p=mesh(root,new THREE.OctahedronGeometry(.026),bright);particles.push(p);}
 }
 root.userData.fusionVisual={kind,moving,rotors,pulses,particles,light};root.userData.healthHeight=2.5;return root;
}

export function animateFusionTower(root,time){
 const p=root.userData.fusionVisual;
 p.moving.forEach(({mesh,y,phase})=>mesh.position.y=y+Math.sin(time*1.7+phase)*.035);
 p.rotors.forEach((m,i)=>m.rotation.y=time*(i%2?-.3:.4));
 p.pulses.forEach((m,i)=>m.material.opacity=.35+Math.pow(Math.max(0,Math.sin(time*8+i)),3)*.65);
 p.particles.forEach((m,i)=>{const t=(time*.35+i/p.particles.length)%1,a=i*2.4;
  if(p.kind==='steam'){m.position.set(Math.sin(a+t*3)*.11,1.48+t*.53,Math.cos(a)*.09);m.scale.setScalar(.35+Math.sin(t*Math.PI)*1.05);}
  else{m.position.set(Math.cos(a+time*.3)*.48,1.05+t*.8,Math.sin(a+time*.3)*.48);m.scale.setScalar(Math.sin(t*Math.PI));}
 });
 p.light.emissiveIntensity=.65+Math.sin(time*2)*.16;
}
