import * as THREE from './assets/three.module.js';
import {surface} from './environment-3d.js';

export function createFireTower(level=1){
 const root=new THREE.Group();root.name=`fire-furnace-${level}`;
 const stone=surface('stone',0x657071),iron=surface('stone',0x39343b);
 iron.roughness=.67;iron.metalness=.35;iron.bumpScale=.018;stone.bumpScale=.025;
 const bronze=new THREE.MeshStandardMaterial({color:0xad7140,metalness:.78,roughness:.33});
 const gold=new THREE.MeshStandardMaterial({color:0xf2c77b,metalness:.72,roughness:.24});
 const recess=new THREE.MeshStandardMaterial({color:0x171d24,roughness:.8});
 const ember=new THREE.MeshStandardMaterial({color:0xff792e,emissive:0xff3709,emissiveIntensity:1.5,roughness:.24,metalness:.2});
 const heart=new THREE.MeshStandardMaterial({color:0xffe7a0,emissive:0xffa126,emissiveIntensity:1.8,roughness:.18});
 const mesh=(parent,g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const panel=(parent,w,h,d,m,x=0,y=0,z=0,bevel=.025)=>{
  const c=Math.min(w,h)*.12,s=new THREE.Shape();
  [[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]].forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
  return mesh(parent,new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1}),m,x,y,z-d/2);
 };
 const slab=(w,d,y,m)=>{const o=panel(root,w,w,d,m,0,y,0,.035);o.rotation.x=-Math.PI/2;o.position.z=0;return o;};
 // Horizontal slabs are centered after rotating the extrusion around its origin.
 const bottom=slab(1.3,.16,.035,stone);bottom.position.y-=.08;
 const step=slab(1.13,.09,.2,bronze);step.position.y-=.045;
 const upper=slab(1.02,.12,.29,iron);upper.position.y-=.06;
 panel(root,.71,.8,.66,iron,0,.77,0,.045);
 for(const side of [-1,1]){
  for(const back of [-1,1]){
   panel(root,.115,.84,.11,bronze,side*.36,.78,back*.33,.013);
   mesh(root,new THREE.SphereGeometry(.033,8,6),gold,side*.36,.49,back*.4);
   mesh(root,new THREE.SphereGeometry(.033,8,6),gold,side*.36,1.04,back*.4);
   if(level>=2){
    panel(root,.19,.42,.19,stone,side*.52,.48,back*.5);
    panel(root,.2,.07,.2,gold,side*.52,.72,back*.5,.012);
    panel(root,.13,.27,.135,bronze,side*.52,.48,back*.5,.009);
   }
  }
 }
 for(let i=0;i<4;i++){
  const face=new THREE.Group();face.rotation.y=i*Math.PI/2;root.add(face);
  panel(face,.48,.63,.065,recess,0,.78,.372,.013);
  const frame=mesh(face,new THREE.OctahedronGeometry(.21),bronze,0,.8,.405);frame.scale.set(.72,1.4,.32);
  const gem=mesh(face,new THREE.OctahedronGeometry(.16),ember,0,.8,.455);gem.scale.set(.7,1.42,.32);
  const glint=mesh(face,new THREE.OctahedronGeometry(.082),heart,0,.79,.489);glint.scale.set(.48,1.35,.25);
  for(const side of [-1,1]){
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.12,.44,.416),new THREE.Vector3(side*.19,.5,.416),new THREE.Vector3(side*.2,.62,.416)]);
   mesh(face,new THREE.TubeGeometry(curve,8,.012,5,false),gold);
  }
 }
 mesh(root,new THREE.CylinderGeometry(.48,.4,.12,8),bronze,0,1.17,0);
 mesh(root,new THREE.CylinderGeometry(.54,.49,.1,8),gold,0,1.27,0);
 mesh(root,new THREE.CylinderGeometry(.43,.43,.035,24),recess,0,1.33,0);
 mesh(root,new THREE.CylinderGeometry(.31,.33,.018,24),ember,0,1.352,0);
 const rim=mesh(root,new THREE.TorusGeometry(.46,.035,8,48),bronze,0,1.34,0);rim.rotation.x=Math.PI/2;
 if(level===3)for(let i=0;i<6;i++){
  const a=i*Math.PI/3,g=new THREE.Group();g.rotation.y=a;root.add(g);
  const s=new THREE.Shape();s.moveTo(.32,1.27);s.bezierCurveTo(.55,1.35,.63,1.53,.59,1.72);s.bezierCurveTo(.54,1.59,.4,1.5,.32,1.43);s.closePath();
  mesh(g,new THREE.ExtrudeGeometry(s,{depth:.05,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:2}),gold);
 }
 const fireTime={value:0},flames=[];
 const flameMaterial=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
 flameMaterial.onBeforeCompile=shader=>{
  shader.uniforms.fireTime=fireTime;
  shader.vertexShader='uniform float fireTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(position.y*7.0-fireTime*4.1)*pow(max(position.y,0.0),2.0)*0.075; transformed.z += cos(position.y*6.0-fireTime*3.3)*position.y*0.035;');
 };
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.18,.12,0),new THREE.Vector3(.21,.26,0),new THREE.Vector3(.14,.43,0),new THREE.Vector3(.09,.61,0),new THREE.Vector3(.055,.76,0),new THREE.Vector3(0,.98,0)]);
 const geometry=new THREE.LatheGeometry(curve.getPoints(36).map(p=>new THREE.Vector2(Math.max(0,p.x),p.y)),24);
 const colors=[];const low=new THREE.Color(0xfff3b6),mid=new THREE.Color(0xffae27),high=new THREE.Color(0xe84916);
 for(let i=0;i<geometry.attributes.position.count;i++){
  const y=geometry.attributes.position.getY(i),c=y<.42?low.clone().lerp(mid,y/.42):mid.clone().lerp(high,(y-.42)/.56);colors.push(c.r,c.g,c.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 for(let i=0;i<3;i++){
  const f=mesh(root,geometry,flameMaterial,i===0?0:Math.cos(i*2.8)*.19,1.36,i===0?0:Math.sin(i*2.8)*.16);
  const scale=i===0?.84:(.48+level*.035);f.scale.setScalar(scale);f.rotation.z=i===0?-.12:(i===1?.24:-.3);f.castShadow=false;
  flames.push({mesh:f,scale});
 }
 const sparks=[];
 for(let i=0;i<4+level*2;i++){const spark=mesh(root,new THREE.OctahedronGeometry(.016),heart);spark.castShadow=false;sparks.push(spark);}
 root.userData.fireVisual={fireTime,flames,sparks,ember,heart};
 root.userData.healthHeight=2.5;
 return root;
}

export function animateFireTower(root,time){
 const p=root.userData.fireVisual;p.fireTime.value=time;
 p.flames.forEach(({mesh,scale},i)=>mesh.scale.y=scale*(1+Math.sin(time*5+i*2)*.06));
 p.sparks.forEach((s,i)=>{
  const t=(time*.5+i/p.sparks.length)%1,a=i*2.4+time*.22;
  s.position.set(Math.cos(a)*(.16+t*.23),1.42+t*.88,Math.sin(a)*(.16+t*.23));s.scale.setScalar(Math.sin(t*Math.PI));
 });
 p.ember.emissiveIntensity=1.3+Math.sin(time*3)*.2;
}
