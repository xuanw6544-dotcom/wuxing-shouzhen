import * as THREE from './assets/three.module.js';
import {createSpirit,animateSpirit,SPIRIT_COLORS} from './spirit-models.js';

export function createElite(kind){
 const root=createSpirit(kind),parts=root.userData.parts;
 root.name=`${kind}-elite`;root.userData.model=`${kind}-elite`;root.userData.healthHeight=1.95;
 parts.body.scale.setScalar(1.12);
 const material=(color,metalness=.35,emissive=0)=>{
  const m=new THREE.MeshStandardMaterial({color,metalness,roughness:.38,emissive,emissiveIntensity:.7});parts.materials.push(m);return m;
 };
 const colors={metal:[0x53676b,0xd5b266],wood:[0x594b34,0x9ea76c],water:[0x24516d,0x9bced8],fire:[0x383039,0xc2844e],earth:[0x6b6a5c,0xb89c6a]}[kind];
 const armorMat=material(colors[0]),trim=material(colors[1],.65),dark=material(0x152c30),glow=material(SPIRIT_COLORS[kind],.2,SPIRIT_COLORS[kind]);
 const armor=new THREE.Group();root.add(armor);armor.position.y=.81;
 const mesh=(p,g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
 const plate=(p,w,h,d,m,x=0,y=0,z=0)=>{
  const c=Math.min(w,h)*.2,s=new THREE.Shape();
  [[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]].forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:2,steps:1});g.translate(0,0,-d/2);return mesh(p,g,m,x,y,z);
 };
 const tube=(p,points,r,m)=>mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),16,r,6,false),m);
 // A partial visor, shoulder plates and separate bracers leave the energy core exposed.
 plate(armor,.5,.13,.13,dark,0,.2,.34);
 plate(armor,.55,.065,.17,trim,0,.3,.32);
 for(const side of [-1,1])plate(armor,.12,.025,.035,glow,side*.135,.205,.42);
 const arms=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.43,.12,0);armor.add(arm);arms.push(arm);
  const shoulder=plate(arm,.27,.23,.33,armorMat);shoulder.rotation.z=-side*.2;
  plate(arm,.28,.045,.35,trim,0,.07);
  plate(arm,.19,.23,.25,armorMat,side*.04,-.38,.06);
  plate(arm,.2,.045,.27,trim,side*.04,-.27,.06);
  tube(arm,[[0,-.08,0],[side*.07,-.2,.04],[side*.04,-.3,.06]],.025,glow);
 }
 const belt=mesh(armor,new THREE.TorusGeometry(.33,.034,6,24,Math.PI*1.55),trim,0,-.29,0);belt.rotation.x=Math.PI/2;
 const effects=[];
 if(kind==='metal'){
  for(const side of [-1,1]){
   const blade=mesh(arms[side<0?0:1],new THREE.OctahedronGeometry(.16),trim,side*.08,-.32,.23);blade.scale.set(.45,1.6,.22);
   plate(armor,.075,.23,.1,trim,side*.24,.42,.18);
  }
 }else if(kind==='wood'){
  for(const side of [-1,1]){
   tube(armor,[[side*.24,-.3,.08],[side*.36,-.08,.22],[side*.33,.26,.12],[side*.39,.51,.04]],.036,armorMat);
   const whip=new THREE.Group();arms[side<0?0:1].add(whip);
   tube(whip,[[side*.05,-.35,.1],[side*.23,-.55,.18],[side*.31,-.36,.24],[side*.21,-.2,.21]],.022,trim);effects.push(whip);
  }
 }else if(kind==='water'){
  for(const side of [-1,1]){
   const fin=mesh(arms[side<0?0:1],new THREE.OctahedronGeometry(.2),trim,side*.1,.15,-.03);fin.scale.set(.5,1.1,.2);fin.rotation.z=-side*.65;
   tube(armor,[[side*.23,-.15,-.08],[side*.29,-.39,-.12],[side*.13,-.62,-.07]],.026,glow);
  }
 }else if(kind==='fire'){
  for(const side of [-1,1]){
   const horn=mesh(arms[side<0?0:1],new THREE.ConeGeometry(.075,.22,6),trim,side*.07,.22,0);horn.rotation.z=-side*.27;
   plate(arms[side<0?0:1],.035,.13,.025,glow,0,-.38,.202);
  }
 }else{
  for(const side of [-1,1]){
   const fist=mesh(arms[side<0?0:1],new THREE.DodecahedronGeometry(.19),armorMat,side*.04,-.36,.08);fist.scale.set(1.1,.85,1);
   plate(arms[side<0?0:1],.035,.16,.025,glow,side*.04,-.35,.264);
  }
 }
 const auraMaterial=new THREE.MeshBasicMaterial({color:SPIRIT_COLORS[kind],transparent:true,opacity:.25,depthWrite:false});parts.materials.push(auraMaterial);
 const aura=mesh(root,new THREE.TorusGeometry(.69,.012,5,48),auraMaterial,0,.6,0);aura.rotation.x=Math.PI/2;aura.castShadow=false;
 root.userData.eliteVisual={armor,arms,effects,aura,glow,armorMat,baseEmissive:armorMat.emissive.clone()};
 return root;
}

const flash=new THREE.Color(0xf4dfb1);
export function animateElite(root,enemy,time,delta,moving){
 animateSpirit(root,time);
 const p=root.userData.eliteVisual,kind=root.userData.kind;
 const locked=enemy.frozenUntil>time||enemy.rootUntil>time;
 const bob=Math.sin(time*2.4)*.04,cast=Boolean(enemy.casting);
 root.userData.parts.body.position.y+=.12;p.armor.position.y=.8+bob;
 p.arms.forEach((arm,i)=>{arm.rotation.x=cast?-.55:moving&&!locked?Math.sin(time*5+i*Math.PI)*.12:0;arm.rotation.z=cast?(i?-.18:.18):0;});
 p.effects.forEach((m,i)=>m.rotation.z=Math.sin(time*2+i)*.12);
 p.aura.material.opacity=(enemy.shield>0?.55:.09)+(cast?.18:0);
 p.aura.scale.setScalar(1+(cast?Math.sin(time*7)*.035:0));
 if(root.userData.wasCasting&&!cast)root.userData.release=.45;root.userData.wasCasting=cast;
 root.userData.release=Math.max(0,(root.userData.release||0)-delta);
 const release=root.userData.release/.45;
 p.armor.rotation.x=kind==='water'?release*.2:0;
 if(kind==='earth')p.armor.position.y-=Math.sin(release*Math.PI)*.06;
 p.glow.emissiveIntensity=cast?1.8:.7+Math.sin(time*2)*.15;
 if(root.userData.previousHp!==undefined&&enemy.hp<root.userData.previousHp)root.userData.hit=.16;
 root.userData.previousHp=enemy.hp;root.userData.hit=Math.max(0,(root.userData.hit||0)-delta);
 p.armorMat.emissive.copy(p.baseEmissive).lerp(flash,root.userData.hit/.16*.5);
}
