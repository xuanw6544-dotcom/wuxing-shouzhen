import * as THREE from './assets/three.module.js';
import {surface} from './environment-3d.js';

export function createNatureTower(kind,level=1){
 const root=new THREE.Group();root.name=`${kind}-sanctum-${level}`;
 const palette={earth:[0x8d8778,0x555b53,0xd0ad70,0xffbe5a],metal:[0x788786,0x35494e,0xe4c17a,0xffedac],wood:[0x7d9482,0x344e40,0xb8aa72,0x9aef9a]}[kind];
 const stone=surface('stone',palette[0]);stone.bumpScale=.02;stone.roughness=.72;
 const dark=new THREE.MeshStandardMaterial({color:palette[1],roughness:.6,metalness:.2});
 const gold=new THREE.MeshStandardMaterial({color:palette[2],roughness:.28,metalness:.72});
 const glow=new THREE.MeshStandardMaterial({color:palette[3],emissive:palette[3],emissiveIntensity:.65,roughness:.2,metalness:.2});
 const pale=new THREE.MeshStandardMaterial({color:kind==='metal'?0xfff1cb:palette[2],roughness:.25,metalness:.6});
 const mesh=(p,g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
 const plate=(p,points,d,m,x=0,y=0,z=0)=>{
  const s=new THREE.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.022,bevelThickness:.022,bevelSegments:3,steps:1});g.translate(0,0,-d/2);return mesh(p,g,m,x,y,z);
 };
 const box=(p,w,h,d,m,x=0,y=0,z=0)=>{const c=Math.min(w,h)*.18;return plate(p,[[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]],d,m,x,y,z);};
 const slab=(w,h,y,m)=>{const o=box(root,w,w,h,m,0,y);o.rotation.x=-Math.PI/2;return o;};
 const tube=(p,pts,r,m)=>mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v))),20,r,7,false),m);
 const gem=(p,r,x,y,z)=>{const frame=mesh(p,new THREE.OctahedronGeometry(r*1.25),gold,x,y,z);frame.scale.set(.8,1.3,.35);const core=mesh(p,new THREE.OctahedronGeometry(r),glow,x,y,z+.045);core.scale.set(.7,1.3,.35);return core;};
 slab(1.32,.17,.02,stone);slab(1.17,.06,.15,gold);slab(1.05,.13,.245,dark);
 const moving=[],leaves=[],rings=[];
 const float=(o,phase=0)=>{moving.push({mesh:o,y:o.position.y,phase});return o;};
 const ring=(r,y,m=gold)=>{const o=mesh(root,new THREE.TorusGeometry(r,.013,6,48),m,0,y,0);o.rotation.x=Math.PI/2;rings.push(o);return o;};
 if(kind==='metal'){
  box(root,.65,.53,.61,dark,0,.58);slab(.82,.1,.88,stone);slab(.87,.04,.96,gold);
  for(let i=0;i<4;i++){
   const face=new THREE.Group();face.rotation.y=i*Math.PI/2;root.add(face);gem(face,.1,0,.6,.35);
   for(const side of [-1,1])box(face,.045,.38,.045,gold,side*.25,.6,.33);
  }
  const sword=(x,y,z,size,tilt)=>{
   const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(size);g.rotation.z=tilt;root.add(g);
   plate(g,[[-.105,0],[.105,0],[.16,.65],[0,1],[-.16,.65]],.1,gold);
   plate(g,[[-.065,.06],[.065,.06],[.102,.65],[0,.88],[-.102,.65]],.05,pale,0,0,.069);
   plate(g,[[0,.15],[.025,.62],[0,.82],[-.025,.62]],.025,glow,0,0,.108);
   box(g,.4,.06,.16,gold,0,.01);box(g,.07,.2,.085,dark,0,-.12);gem(g,.06,0,-.23,0);
   float(g,x*2);return g;
  };
  sword(0,1.1,0,1,0);
  if(level>=2)for(const side of [-1,1])sword(side*.4,1,.05,.65,-side*.27);
  if(level===3){
   for(const side of [-1,1])sword(side*.58,.94,-.22,.47,-side*.76);
   const halo=ring(.58,1.85,glow);halo.rotation.z=.15;
   for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;box(root,.17,.23,.17,gold,Math.cos(a)*.62,.27,Math.sin(a)*.62);}
  }
 }else if(kind==='earth'){
  mesh(root,new THREE.CylinderGeometry(.43,.6,.61,8),dark,0,.59,0);
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2,g=new THREE.Group();g.rotation.y=a;root.add(g);
   box(g,.39,.48,.2,stone,0,.61,.43);box(g,.045,.37,.045,gold,-.15,.6,.56);gem(g,.12,0,.64,.56);
  }
  slab(.94,.12,.95,stone);slab(.82,.045,1.035,gold);
  const core=mesh(root,new THREE.DodecahedronGeometry(.36,0),stone,0,1.49,0);core.scale.set(.85,1.55,.8);float(core);
  // Small luminous fault lines follow the front of the floating monolith.
  const cracks=new THREE.Group();core.add(cracks);
  tube(cracks,[[.04,.31,.18],[-.025,.15,.31],[.07,.04,.33],[.025,-.12,.33],[.06,-.29,.19]],.012,glow);
  tube(cracks,[[.07,.04,.33],[.2,.12,.27],[.22,.2,.18]],.008,glow);
  if(level>=2)for(let i=0;i<2+level;i++){
   const a=i/(2+level)*Math.PI*2,rock=mesh(root,new THREE.DodecahedronGeometry(.115+(i%2)*.025),i%2?dark:stone,Math.cos(a)*.57,1.26+Math.sin(a)*.18,Math.sin(a)*.57);rock.scale.y=1.3;float(rock,a);
  }
  if(level===3){
   for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,g=new THREE.Group();g.rotation.y=a;root.add(g);plate(g,[[-.12,0],[.12,0],[.09,.55],[0,.72],[-.09,.55]],.2,stone,0,.3,.61);box(g,.035,.39,.03,gold,0,.53,.727);}
   ring(.61,1.14,glow);
  }
 }else{
  const bark=surface('wood',0x947447);bark.bumpScale=.03;
  const barkDark=surface('wood',0x53452e);barkDark.bumpScale=.035;
  const leafMat=new THREE.MeshStandardMaterial({color:0x53a866,roughness:.58,metalness:.05,side:THREE.DoubleSide});
  const leaf=(p,x,y,z,angle,size)=>{
   const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.2,.15,-.15,.35,0,.48);s.bezierCurveTo(.18,.29,.15,.1,0,0);
   const g=new THREE.Group();g.position.set(x,y,z);g.rotation.z=angle;g.scale.setScalar(size);p.add(g);
   mesh(g,new THREE.ExtrudeGeometry(s,{depth:.024,bevelEnabled:true,bevelSize:.007,bevelThickness:.007,bevelSegments:1}),leafMat);
   tube(g,[[0,.02,.037],[0,.2,.04],[0,.42,.03]],.008,gold);leaves.push({mesh:g,angle});return g;
  };
  slab(.94,.07,.36,stone);
  const height=1.35+(level-1)*.13;
  tube(root,[[0,.32,0],[-.1,.66,0],[.11,.99,-.04],[0,height,0]],.13,bark);
  tube(root,[[.15,.35,.09],[.17,.65,.1],[-.12,.97,.04],[0,height,.02]],.07,barkDark);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;tube(root,[[Math.cos(a)*.1,.49,Math.sin(a)*.1],[Math.cos(a)*.35,.33,Math.sin(a)*.35],[Math.cos(a)*.65,.13,Math.sin(a)*.65]],.052,bark);}
  for(let i=0;i<2+level*2;i++){
   const side=i%2?1:-1,y=.74+Math.floor(i/2)*.19,z=(i%3-1)*.16;
   tube(root,[[side*.03,y-.1,0],[side*.25,y+.01,z],[side*.43,y+.18,z]],.029,bark);
   leaf(root,side*.32,y+.09,z,-side*.65,.55+(i%2)*.15);
  }
  const core=mesh(root,new THREE.OctahedronGeometry(.2+level*.025),glow,0,height+.24,0);core.scale.set(.75,1.2,.75);float(core);
  gem(root,.11,0,.43,.49);
  if(level>=2)for(const side of [-1,1]){box(root,.15,.19,.15,stone,side*.49,.37,.48);leaf(root,side*.46,.44,.48,-side*.6,.4);}
  if(level===3){const halo=ring(.38,height+.14,glow);halo.rotation.z=.22;leaf(root,-.15,height-.03,0,.7,.55);leaf(root,.15,height-.03,0,-.7,.55);}
 }
 root.userData.natureVisual={kind,moving,leaves,rings,glow};root.userData.healthHeight=2.55;return root;
}

export function animateNatureTower(root,time){
 const p=root.userData.natureVisual;
 p.moving.forEach(({mesh,y,phase})=>mesh.position.y=y+Math.sin(time*1.7+phase)*.035);
 p.leaves.forEach(({mesh,angle},i)=>mesh.rotation.z=angle+Math.sin(time*1.6+i*.7)*.045);
 p.rings.forEach((m,i)=>m.rotation.z=Math.sin(time*.5+i)*.12);
 p.glow.emissiveIntensity=.6+Math.sin(time*2)*.15;
}
