import * as THREE from './assets/three.module.js';
import {createElementBoss,animateElementBoss} from './element-boss-models.js';

export function createBoss(kind) {
  return kind==='metal'?createMetalBoss():createElementBoss(kind);
}

export function animateBoss(root,enemy,time,delta,moving) {
  if(enemy.element==='metal')animateMetalBoss(root,enemy,time,delta,moving);
  else animateElementBoss(root,enemy,time,delta,moving);
}

// All resources belong to this actor and can be disposed when it leaves combat.
export function createMetalBoss() {
  const root = new THREE.Group();
  root.name = 'metal-sovereign';
  const body = new THREE.Group();
  root.add(body);
  const mat = (color, metalness, roughness, emissive = 0) => new THREE.MeshStandardMaterial({
    color, metalness, roughness, emissive, emissiveIntensity: 1.1
  });
  const armor = mat(0x66777a, .7, .38);
  const edge = mat(0x253b41, .65, .45);
  const gold = mat(0xd7ad49, .78, .26);
  const paleGold = mat(0xffe7a0, .65, .22);
  const recess = mat(0x071c23, .25, .65);
  const light = mat(0xfff2ba, .25, .18, 0xffc451);
  const auraMat = new THREE.MeshBasicMaterial({color:0xffda77, transparent:true, opacity:.6, depthWrite:false});
  const materials = [armor, edge, gold, paleGold, recess, light];
  const solid = (parent, geometry, material, x=0, y=0, z=0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true;
    parent.add(mesh); return mesh;
  };
  const plate = (parent, points, depth, material, x=0, y=0, z=0, bevel=.035) => {
    const shape = new THREE.Shape();
    points.forEach(([px,py],i)=>i ? shape.lineTo(px,py) : shape.moveTo(px,py));
    shape.closePath();
    return solid(parent, new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled:true, bevelSegments:2, steps:1, bevelSize:bevel, bevelThickness:bevel
    }), material, x,y,z-depth/2);
  };
  const panel = (parent,w,h,d,material,x,y,z) => {
    const c=Math.min(w,h)*.18;
    return plate(parent,[[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],
      [w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]],d,material,x,y,z);
  };
  const gem = (parent,size,x,y,z) => {
    const socket=solid(parent,new THREE.OctahedronGeometry(size*1.28),gold,x,y,z);
    socket.scale.set(.75,1.2,.45);
    const core=solid(parent,new THREE.OctahedronGeometry(size),light,x,y,z+.065);
    core.scale.set(.7,1.2,.45); return core;
  };
  const feet=[];
  for(const side of [-1,1]) {
    feet.push(panel(root,.38,.24,.52,edge,side*.3,.17,.06));
    panel(feet.at(-1),.32,.09,.1,gold,0,.015,.27);
  }
  panel(body,1.16,1.25,.67,edge,0,.96,0);
  panel(body,1.02,1.12,.19,armor,0,.98,.35);
  panel(body,.85,.15,.22,gold,0,.46,.4);
  // Layered brow and dark visor retain the reference's compact, stern face.
  panel(body,.85,.25,.07,recess,0,1.3,.49);
  for(const side of [-1,1]) {
    const eye=panel(body,.2,.045,.035,light,side*.23,1.3,.55);
    eye.rotation.z=side*.09;
    panel(body,.1,.35,.12,gold,side*.48,.98,.44);
    solid(body,new THREE.SphereGeometry(.043,8,6),paleGold,side*.4,.57,.5);
  }
  panel(body,1.04,.12,.22,paleGold,0,1.49,.42);
  const chest=gem(body,.155,0,.85,.51);
  panel(body,.84,.21,.5,edge,0,1.62,-.02);
  const crown = new THREE.Group(); crown.position.y=1.69; body.add(crown);
  solid(crown,new THREE.CylinderGeometry(.49,.47,.13,8),gold);
  const crownOutline=[[-.49,-.01],[-.55,.45],[-.29,.28],[0,.65],[.29,.28],[.55,.45],[.49,-.01]];
  plate(crown,crownOutline,.1,edge,0,0,.24);
  plate(crown,crownOutline.map(([x,y])=>[x*.9,y*.86+.035]),.06,gold,0,0,.31,.018);
  gem(crown,.13,0,.32,.4);
  for(const side of [-1,1]) {
    plate(crown,[[0,0],[.26,.36],[.46,0]],.07,gold,side*.14,.02,-.36,.02);
  }
  const arms=[];
  for(const side of [-1,1]) {
    const arm=new THREE.Group();arm.position.set(side*.7,1.22,0);body.add(arm);arms.push(arm);
    panel(arm,.4,.38,.57,gold,0,0,0);
    panel(arm,.32,.28,.6,armor,0,.035,.025);
    panel(arm,.26,.5,.35,edge,side*.025,-.38,.02);
    panel(arm,.3,.32,.4,armor,side*.03,-.58,.045);
    panel(arm,.31,.08,.42,gold,side*.03,-.47,.045);
  }
  const sword = new THREE.Group(); arms[1].add(sword);sword.position.set(.14,-.62,.22);
  panel(sword,.1,.32,.1,recess,0,.03,0);
  panel(sword,.43,.08,.15,gold,0,.21,0);
  plate(sword,[[-.11,.25],[.11,.25],[.11,.89],[0,1.13],[-.11,.89]],.09,paleGold);
  plate(sword,[[-.022,.28],[.022,.28],[.022,.86],[0,1.01],[-.022,.86]],.018,gold,0,0,.06,.008);
  const shield=panel(arms[0],.42,.58,.14,gold,-.06,-.35,.29);
  panel(shield,.32,.46,.06,armor,0,0,.1);gem(shield,.095,0,0,.16);
  const aura=new THREE.Group();root.add(aura);aura.position.y=1.03;
  const halo=solid(aura,new THREE.TorusGeometry(.99,.014,5,64),auraMat);
  halo.rotation.x=Math.PI/2;
  const cage=solid(aura,new THREE.TorusGeometry(1.22,.013,4,6),auraMat);
  cage.rotation.z=Math.PI/6;
  const motes=[];
  for(let i=0;i<6;i++) {
    const mote=solid(aura,new THREE.OctahedronGeometry(.045),light);
    motes.push(mote);
  }
  root.userData.model='metal-boss';
  root.userData.healthHeight=2.65;
  root.userData.parts={body,feet,arms,chest,aura,cage,motes,materials,light,auraMat};
  root.userData.baseEmissive=materials.map(m=>m.emissive.clone());
  return root;
}

export function animateMetalBoss(root, enemy, time, delta, moving) {
  const p=root.userData.parts;
  const frozen=enemy.frozenUntil>time || enemy.rootUntil>time;
  const stride=moving&&!frozen?Math.sin(time*6):0;
  p.body.position.y=Math.abs(stride)*.045;
  p.body.rotation.z=stride*.025;
  p.feet.forEach((foot,i)=>{foot.position.z=.06+stride*(i?1:-1)*.1;});
  p.arms.forEach((arm,i)=>{arm.rotation.x=enemy.casting?-.65:stride*(i?1:-1)*.2;});
  p.cage.rotation.y=time*.32;
  p.auraMat.opacity=(enemy.shield>0?.55:.14)+(enemy.casting?.25:0);
  p.aura.scale.setScalar(enemy.casting?1+Math.sin(time*10)*.035:1);
  p.motes.forEach((m,i)=>{const a=time*.8+i*Math.PI/3;m.position.set(Math.cos(a)*1.03,Math.sin(a*2)*.23,Math.sin(a)*1.03);});
  if(root.userData.previousHp!==undefined && enemy.hp<root.userData.previousHp)root.userData.hit=.18;
  root.userData.previousHp=enemy.hp;
  root.userData.hit=Math.max(0,(root.userData.hit||0)-delta);
  p.materials.forEach((m,i)=>m.emissive.copy(root.userData.baseEmissive[i]).lerp(new THREE.Color(0xffe3ae),root.userData.hit/.18*.65));
  p.light.emissiveIntensity=enemy.casting?2.5+Math.sin(time*12)*.5:1.15+Math.sin(time*2)*.18;
}
