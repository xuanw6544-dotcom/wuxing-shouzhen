import * as THREE from './assets/three.module.js';

// Geometry and materials are actor-owned, matching the renderer's disposal contract.
function sculpt(kind, colors) {
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  root.name=`${kind}-sovereign`;root.userData.model=`${kind}-boss`;root.userData.healthHeight=2.85;
  const materials=[];
  const material=(color,metalness=.25,roughness=.55,emissive=0)=>{
    const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:1.1});materials.push(m);return m;
  };
  const armor=material(colors[0]),dark=material(colors[1]),trim=material(colors[2],.65,.3),light=material(colors[3],.2,.22,colors[4]);
  const mesh=(parent,geometry,mat,x=0,y=0,z=0)=>{
    const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const plate=(parent,points,depth,mat,x=0,y=0,z=0)=>{
    const s=new THREE.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
    return mesh(parent,new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1}),mat,x,y,z-depth/2);
  };
  const box=(parent,w,h,d,mat,x=0,y=0,z=0)=>{
    const c=Math.min(w,h)*.19;
    return plate(parent,[[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]],d,mat,x,y,z);
  };
  const tube=(parent,points,radius,mat)=>mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,radius,6,false),mat);
  const gem=(parent,r,x,y,z)=>{
    const socket=mesh(parent,new THREE.OctahedronGeometry(r*1.22),trim,x,y,z);socket.scale.set(.8,1.3,.5);
    const core=mesh(parent,new THREE.OctahedronGeometry(r),light,x,y,z+.05);core.scale.set(.75,1.3,.5);return core;
  };
  const ring=(parent,r,y,mat=light)=>{const m=mesh(parent,new THREE.TorusGeometry(r,.025,6,56),mat,0,y,0);m.rotation.x=Math.PI/2;return m;};
  const arms=[],feet=[],ornaments=[];
  const limb=(side,y=1.3)=>{const g=new THREE.Group();g.position.set(side*.67,y,0);body.add(g);arms.push(g);return g;};
  const eyes=(y,z)=>{box(body,.76,.21,.06,dark,0,y,z);for(const side of [-1,1]){const e=box(body,.18,.035,.045,light,side*.21,y,z+.06);e.rotation.z=side*.13;}};
  const foot=(side)=>{const f=box(root,.4,.27,.55,dark,side*.3,.18,.07);feet.push(f);return f;};
  root.userData.parts={body,materials,light,arms,feet,ornaments};
  return {root,body,armor,dark,trim,light,material,mesh,plate,box,tube,gem,ring,limb,eyes,foot,ornaments};
}

function woodBoss() {
  const b=sculpt('wood',[0x785639,0x293e2c,0xc4a963,0xb6ffad,0x409d47]);
  const {root,body,armor,dark,trim,light,mesh,box,tube,gem,limb,eyes,foot,ornaments}=b;
  const leafMat=b.material(0x479b54,.1,.65);
  mesh(body,new THREE.CylinderGeometry(.48,.59,1.25,9),armor,0,.98,0);
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7;const bark=box(body,.19,1.1,.17,i%2?dark:armor,Math.sin(a)*.48,.96,Math.cos(a)*.48);bark.rotation.y=a;
  }
  box(body,.9,.36,.54,armor,0,1.48,.06);eyes(1.49,.37);gem(body,.2,0,1.02,.54);
  const leaf=(parent,x,y,z,a,size=.22)=>{const m=mesh(parent,new THREE.OctahedronGeometry(size),leafMat,x,y,z);m.scale.set(.5,1,.22);m.rotation.z=a;return m;};
  for(const side of [-1,1]){
    foot(side);tube(body,[[side*.37,1.57,0],[side*.52,1.91,0],[side*.45,2.25,-.02],[side*.73,2.48,-.02]],.095,armor);
    tube(body,[[side*.51,1.95,0],[side*.81,2.08,.03],[side*.88,2.3,.01]],.052,trim);
    leaf(body,side*.8,2.18,.04,-side*.7);leaf(body,side*.56,2.32,.02,side*.6);
    const arm=limb(side);box(arm,.47,.36,.52,dark);box(arm,.29,.66,.34,armor,0,-.35,.04);gem(arm,.095,0,-.5,.24);
    for(let i=0;i<3;i++)leaf(arm,side*(.08+i*.1),.13+i*.04,.1,-side*.85);
    const vine=new THREE.Group();arm.add(vine);
    tube(vine,[[0,-.42,.09],[side*.24,-.66,.27],[side*.39,-.38,.39],[side*.31,-.1,.36]],.042,leafMat);ornaments.push(vine);
    for(let i=0;i<3;i++)tube(root,[[side*.25,.36,0],[side*(.38+i*.1),.14,.17],[side*(.47+i*.1),.08,.4]],.055,armor);
  }
  tube(body,[[-.4,.47,.43],[-.48,.79,.54],[0,1.05,.58],[.38,1.28,.48]],.043,leafMat);
  gem(body,.12,0,1.88,.16);
  const aura=b.ring(root,.93,.14,light);root.userData.parts.aura=aura;
  return root;
}

function waterBoss() {
  const b=sculpt('water',[0x326f91,0x17394f,0xa1dce3,0xc6faff,0x238ece]);
  const {root,body,armor,dark,trim,light,mesh,box,plate,tube,gem,limb,eyes,ring,ornaments}=b;
  const water=b.material(0x39badc,.35,.2,0x075368);
  mesh(body,new THREE.CylinderGeometry(.39,.61,1.1,10),armor,0,.95,0);
  for(const side of [-1,1]){
    const robe=plate(body,[[0,.45],[side*.44,.35],[side*.62,-.55],[side*.12,-.39]],.15,dark,0,.91,.33);robe.rotation.z=side*.07;
    tube(body,[[side*.32,1.36,.39],[side*.36,.94,.5],[side*.52,.45,.35]],.028,trim);
    const arm=limb(side);plate(arm,[[-.24,-.11],[.25,-.14],[side*.34,.3],[0,.17]],.4,trim);
    box(arm,.25,.57,.29,armor,0,-.33);box(arm,.27,.2,.32,trim,0,-.61,.04);
    plate(body,[[-.11,0],[0,.51],[.13,.1],[.17,-.09]],.12,trim,side*.37,1.86,0);
  }
  box(body,.77,.47,.57,armor,0,1.58,.01);eyes(1.59,.34);gem(body,.18,0,1.09,.49);
  gem(body,.22,0,2.08,.09);
  const staff=new THREE.Group();body.add(staff);staff.position.set(.96,.57,.15);
  mesh(staff,new THREE.CylinderGeometry(.045,.045,1.8,8),trim,0,.49,0);
  for(const side of [-1,1])tube(staff,[[0,1.02,0],[side*.24,1.18,0],[side*.24,1.52,0]],.04,trim);
  gem(staff,.12,0,1.43,0);
  const tide=new THREE.Group();root.add(tide);root.userData.parts.tide=tide;
  for(let j=0;j<3;j++){
    const points=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*1.6+j*2.1;return [Math.cos(a)*(.58+j*.08),.18+i/24*.24,Math.sin(a)*(.58+j*.08)];});
    tube(tide,points,j===0?.085:.045,j===0?water:trim);
  }
  const halo=ring(body,.8,.92,water);halo.rotation.x=1.08;ornaments.push(halo);
  for(let i=0;i<5;i++){const a=i*1.256;const drop=mesh(root,new THREE.SphereGeometry(.065,8,6),light,Math.cos(a)*.84,.65,Math.sin(a)*.84);ornaments.push(drop);}
  return root;
}

function fireBoss() {
  const b=sculpt('fire',[0x44393e,0x221f2b,0xc27837,0xffdf85,0xff5a17]);
  const {root,body,armor,dark,trim,light,mesh,box,plate,tube,gem,limb,eyes,foot,ornaments}=b;
  const ember=b.material(0xf35c28,.25,.38,0xe93306);
  box(body,1.04,1.17,.7,dark,0,.96,0);
  for(const side of [-1,1]){
    foot(side);plate(body,[[0,-.49],[side*.47,-.38],[side*.53,.46],[side*.12,.38]],.18,armor,0,1.01,.38);
    tube(body,[[side*.4,.59,.51],[side*.25,.8,.52],[side*.34,1.04,.52],[side*.22,1.34,.52]],.024,ember);
    const arm=limb(side);const shoulder=mesh(arm,new THREE.DodecahedronGeometry(.36),armor);shoulder.scale.set(1.1,.8,1);
    box(arm,.32,.54,.38,dark,0,-.37);box(arm,.41,.27,.45,trim,0,-.61,.03);
    const horn=tube(body,[[side*.31,1.62,0],[side*.52,1.93,-.02],[side*.46,2.21,-.02]],.09,trim);
    horn.name='ember-horn';
  }
  box(body,.76,.4,.57,armor,0,1.53,0);eyes(1.53,.34);
  const furnace=mesh(body,new THREE.TorusGeometry(.24,.075,6,8),trim,0,.92,.48);
  gem(body,.23,0,.92,.53);
  const flames=new THREE.Group();flames.position.y=1.75;body.add(flames);root.userData.parts.flames=flames;
  for(let i=0;i<5;i++){
    const x=(i-2)*.15,y=0,z=i%2*.08;
    plate(flames,[[-.1,0],[-.13,.22],[.02,.55+(i===2?.15:0)],[.08,.31],[.14,.15],[.07,0]],.12,i%2?light:ember,x,y,z);
  }
  const orbit=new THREE.Group();root.add(orbit);root.userData.parts.orbit=orbit;
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3;const meteor=new THREE.Group();meteor.position.set(Math.cos(a)*.9,1.6+Math.sin(a)*.13,Math.sin(a)*.7);orbit.add(meteor);
    mesh(meteor,new THREE.IcosahedronGeometry(.13),armor);gem(meteor,.065,0,.01,.11);
    const tail=mesh(meteor,new THREE.ConeGeometry(.1,.4,6),ember,0,.23,0);tail.rotation.z=-.25;ornaments.push(meteor);
  }
  furnace.name='furnace';return root;
}

function earthBoss() {
  const b=sculpt('earth',[0x817965,0x434c48,0xb69a64,0xffe4a4,0xc58a2e]);
  const {root,body,armor,dark,trim,light,mesh,box,tube,gem,limb,eyes,foot,ornaments}=b;
  box(body,1.13,1.17,.76,dark,0,.97,0);box(body,.94,.92,.2,armor,0,.96,.45);
  for(const side of [-1,1]){
    foot(side);const arm=limb(side,1.37);
    const shoulder=mesh(arm,new THREE.DodecahedronGeometry(.43),armor);shoulder.scale.set(1,.8,1);
    box(arm,.4,.48,.42,dark,side*.06,-.37);box(arm,.54,.46,.58,armor,side*.06,-.61,.08);
    box(arm,.57,.08,.6,trim,side*.06,-.46,.08);
    for(let i=0;i<2;i++)box(arm,.075,.26,.06,trim,side*.06+(i-.5)*.19,-.65,.41);
    const peak=mesh(body,new THREE.ConeGeometry(.24,.54,5),armor,side*.33,1.99,0);peak.rotation.z=-side*.15;
    tube(body,[[side*.3,.59,.58],[side*.15,.86,.58],[side*.24,1.08,.58]],.019,light);
  }
  box(body,.85,.39,.59,armor,0,1.55,.02);eyes(1.54,.37);
  box(body,.79,.13,.72,trim,0,1.76,0);gem(body,.2,0,.98,.58);
  mesh(body,new THREE.ConeGeometry(.23,.69,5),trim,0,2.12,-.02);
  const wards=new THREE.Group();root.add(wards);root.userData.parts.wards=wards;
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+Math.PI/4,g=new THREE.Group();g.position.set(Math.sin(a)*1.03,.75,Math.cos(a)*.83);g.rotation.y=a;wards.add(g);
    box(g,.27,.43,.12,dark);box(g,.22,.36,.06,trim,0,0,.08);gem(g,.067,0,0,.13);ornaments.push(g);
  }
  const quake=b.ring(root,.9,.065,light);root.userData.parts.quake=quake;
  return root;
}

const builders={wood:woodBoss,water:waterBoss,fire:fireBoss,earth:earthBoss};
export function createElementBoss(kind) {
  const root=builders[kind]();
  root.userData.baseEmissive=root.userData.parts.materials.map(m=>m.emissive.clone());
  root.userData.parts.ornaments.forEach(o=>o.userData.homeY=o.position.y);
  return root;
}

const hitColor=new THREE.Color(0xffe3ae);
export function animateElementBoss(root,enemy,time,delta,moving) {
  const p=root.userData.parts,kind=enemy.element;
  const locked=enemy.frozenUntil>time||enemy.rootUntil>time;
  const stride=moving&&!locked?Math.sin(time*(kind==='earth'?4:6)):0;
  const casting=Boolean(enemy.casting);
  if(root.userData.wasCasting&&!casting)root.userData.release=.65;
  root.userData.wasCasting=casting;
  root.userData.release=Math.max(0,(root.userData.release||0)-delta);
  const release=root.userData.release/.65;
  p.body.position.y=kind==='water'?Math.sin(time*2)*.07:Math.abs(stride)*.04;
  p.body.rotation.z=stride*.025;
  p.feet.forEach((f,i)=>f.position.z=.07+stride*(i?1:-1)*.11);
  p.arms.forEach((a,i)=>{a.rotation.x=casting?-.75:stride*(i?1:-1)*.2;a.rotation.z=casting?(i?-.16:.16):0;});
  p.ornaments.forEach((o,i)=>o.position.y=o.userData.homeY+Math.sin(time*2+i)*.045);
  if(kind==='wood'){
    p.aura.rotation.z=time*.3;p.aura.scale.setScalar(casting?1.1:1);
    p.light.emissiveIntensity=enemy.leechTower?.vineUntil>time?2.6:1.2;
  }else if(kind==='water'){
    p.tide.rotation.y=time*(casting?2.6:.7);p.tide.scale.setScalar(1+release*.16);
    p.body.rotation.x=casting?-.1:release*.22;
  }else if(kind==='fire'){
    p.flames.scale.y=1+Math.sin(time*9)*.06+(casting?.2:0);
    p.orbit.rotation.y=time*.45;p.orbit.position.y=casting?.17:release*.3;
  }else if(kind==='earth'){
    p.wards.rotation.y=Math.sin(time*.6)*.12;p.wards.scale.setScalar(enemy.shield>0?1.12:1);
    p.quake.scale.setScalar(1+(1-release)*.8);p.quake.visible=casting||release>0;
    p.body.position.y-=Math.sin(release*Math.PI)*.14;
  }
  if(root.userData.previousHp!==undefined&&enemy.hp<root.userData.previousHp)root.userData.hit=.18;
  root.userData.previousHp=enemy.hp;root.userData.hit=Math.max(0,(root.userData.hit||0)-delta);
  p.materials.forEach((m,i)=>m.emissive.copy(root.userData.baseEmissive[i]).lerp(hitColor,root.userData.hit/.18*.65));
  if(kind!=='wood'||!enemy.leechTower||enemy.leechTower.vineUntil<=time)p.light.emissiveIntensity=casting?2.5+Math.sin(time*12)*.4:1.1+Math.sin(time*2)*.15;
}
