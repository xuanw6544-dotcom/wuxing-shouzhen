import * as THREE from './assets/three.module.js';

// Deterministic material textures and scenery; no combat coordinates are mutated.
function random(seed=7831) { return () => ((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296); }
function texture(kind) {
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d'),rand=random();
  ctx.fillStyle={stone:'#788480',grass:'#53794b',wood:'#96826a'}[kind];ctx.fillRect(0,0,256,256);
  for(let i=0;i<6500;i++){
    const x=rand()*256,y=rand()*256;
    ctx.fillStyle=i%2?'rgba(242,240,213,.09)':'rgba(15,27,27,.10)';
    ctx.fillRect(x,y,kind==='wood'?rand()*40+4:rand()*5+1,kind==='grass'?rand()*7+1:1+rand()*2);
  }
  if(kind==='stone')for(let i=0;i<18;i++){
    const x=rand()*256,y=rand()*256;ctx.strokeStyle='#34464c66';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12,y+9);ctx.lineTo(x+16,y+27);ctx.stroke();
  }
  if(kind==='wood')for(let i=0;i<24;i++){
    ctx.strokeStyle=i%2?'#f0dca433':'#3c332a55';ctx.beginPath();
    const y=i*11;ctx.moveTo(0,y);ctx.bezierCurveTo(60,y+6,170,y-4,256,y+1);ctx.stroke();
  }
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.repeat.set(kind==='wood'?1:1.4,kind==='wood'?1:1.4);map.anisotropy=4;return map;
}
const textures={stone:texture('stone'),grass:texture('grass'),wood:texture('wood')};
export function surface(kind,color=0xffffff){return new THREE.MeshStandardMaterial({color,map:textures[kind],bumpMap:textures[kind],bumpScale:kind==='wood'?.035:.1,roughness:kind==='wood'?.83:.96});}
function mesh(parent,geometry,mat,x,y,z){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}

export function island(parent,map){
  const shape=new THREE.Shape();
  const outline=[[-12.7,-4.1],[-11.8,-5.7],[-8.5,-6],[-5.4,-5.6],[-2.4,-5.8],[.5,-5.45],[4.2,-5.9],[8.7,-5.4],[12,-5.65],[12.6,-3.3],[12.4,0],[12.8,3.6],[11.5,5.7],[7.4,5.8],[4,5.45],[1,5.8],[-3.2,5.55],[-7.8,6],[-11.9,5.5],[-12.8,3]];
  outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  if(map.feature==='array'){
    const hole=new THREE.Path();hole.absellipse(0,0,2.55,1.08,0,Math.PI*2,true);shape.holes.push(hole);
  }
  const stone=surface('stone',0x697f83),grass=surface('grass',0xd2dfb4);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:1.85,bevelEnabled:true,bevelThickness:.25,bevelSize:.22,bevelSegments:3,steps:1,curveSegments:32});
  const land=new THREE.Mesh(geo,[grass,stone]);land.rotation.x=-Math.PI/2;land.position.y=-2.25;land.receiveShadow=true;land.castShadow=true;parent.add(land);
  const rand=random(562),rockGeo=new THREE.DodecahedronGeometry(1,1),rocks=new THREE.InstancedMesh(rockGeo,stone,outline.length*3),dummy=new THREE.Object3D();
  for(let i=0;i<outline.length*3;i++){
    const p=outline[i%outline.length];dummy.position.set(p[0]*(.92+rand()*.04),-1.5-rand()*.7,p[1]*(.92+rand()*.04));
    dummy.scale.set(.6+rand()*.8,.8+rand(),.45+rand()*.6);dummy.rotation.set(rand(),rand()*3,rand()*.3);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;parent.add(rocks);
  const points=[];
  function roadDistance(x,z){let d=Infinity;for(const route of map.routes)for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i],ax=(a[0]-.5)*22,az=(a[1]-.5)*12,dx=(b[0]-a[0])*22,dz=(b[1]-a[1])*12;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-ax-t*dx,z-az-t*dz));}return d;}
  for(let i=0;i<600;i++){
    const x=(rand()-.5)*23,z=(rand()-.5)*10;
    if(Math.abs(x)<3&&Math.abs(z)<1.5||roadDistance(x,z)<1.2||map.slots.some(p=>Math.hypot(x-(p[0]-.5)*22,z-(p[1]-.5)*12)<1.25))continue;
    points.push([x,z]);
  }
  const grassMesh=new THREE.InstancedMesh(new THREE.ConeGeometry(.08,.45,4),new THREE.MeshStandardMaterial({color:0x79a65b,roughness:1}),points.length*3);
  points.forEach(([x,z],i)=>{for(let j=0;j<3;j++){dummy.position.set(x+j*.08,-.12,z);dummy.scale.setScalar(.6+rand());dummy.rotation.set((rand()-.5)*.5,rand()*6,(j-1)*.3);dummy.updateMatrix();grassMesh.setMatrixAt(i*3+j,dummy.matrix);}});
  grassMesh.receiveShadow=true;parent.add(grassMesh);
  for(let i=0;i<points.length;i+=13){const [x,z]=points[i];const rock=mesh(parent,new THREE.DodecahedronGeometry(.23,1),surface('stone'),x,-.2,z);rock.scale.set(1,.6,.8);}
}

export function landscape(scene){
  // A distant matte avoids spending geometry and shadows on scenery outside the play area.
  const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d');
  const sky=ctx.createLinearGradient(0,0,0,1024);sky.addColorStop(0,'#adcbc9');sky.addColorStop(.55,'#d7e1d7');sky.addColorStop(1,'#8caeb0');ctx.fillStyle=sky;ctx.fillRect(0,0,2048,1024);
  const rand=random(917);
  for(let layer=0;layer<3;layer++){
    const base=220+layer*95;ctx.beginPath();ctx.moveTo(-100,base+170);
    for(let x=-100;x<2150;x+=190){const peak=base-70-rand()*190;ctx.bezierCurveTo(x+40,base,x+66,peak,x+91,peak);ctx.bezierCurveTo(x+120,peak+20,x+130,base+10,x+190,base+45);}
    ctx.lineTo(2200,base+350);ctx.lineTo(-100,base+350);ctx.closePath();
    const wash=ctx.createLinearGradient(0,base-180,0,base+270);wash.addColorStop(0,['#759899','#6f9390','#658d83'][layer]);wash.addColorStop(1,'#c8dad300');ctx.fillStyle=wash;ctx.fill();
  }
  const veil=ctx.createLinearGradient(0,200,0,900);veil.addColorStop(0,'#d8e5dc00');veil.addColorStop(.5,'#d8e5dcbb');veil.addColorStop(1,'#acc8c400');ctx.fillStyle=veil;ctx.fillRect(0,0,2048,1024);
  const matte=new THREE.CanvasTexture(c);matte.colorSpace=THREE.SRGBColorSpace;scene.background=matte;
}

export function towerDetails(group,kind,level,material,ball){
  const stone=surface('stone',kind==='fire'?0x36464c:0xadb9b3);
  group.children[0].material=stone;
  group.children[1].material=kind==='wood'?surface('wood',0x795637):surface('stone',kind==='fire'?0x343b43:0x899ba0);
  const bright=material(kind,true),gold=new THREE.MeshStandardMaterial({color:0xd6ba76,metalness:.65,roughness:.35});
  for(let i=0;i<2;i++){
    const rim=mesh(group,new THREE.CylinderGeometry(.65-i*.13,.72-i*.13,.12,8),i?gold:stone,0,.18+i*.86,0);
    rim.rotation.y=Math.PI/8;
  }
  const moving=[];
  if(kind==='metal')for(let i=0;i<2+level;i++){
    const a=i/(2+level)*Math.PI*2;
    const blade=mesh(group,new THREE.OctahedronGeometry(.24),bright,Math.cos(a)*.55,1.35,Math.sin(a)*.55);blade.scale.set(.5,1.8,.3);moving.push(blade);
    mesh(group,new THREE.BoxGeometry(.33,.055,.08),gold,Math.cos(a)*.55,1.06,Math.sin(a)*.55);
  }
  if(kind==='wood')for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a)*.65,.05,Math.sin(a)*.65),new THREE.Vector3(Math.cos(a+.5)*.3,.6,Math.sin(a+.5)*.3),new THREE.Vector3(Math.cos(a)*.6,1.2,Math.sin(a)*.6)]);
    mesh(group,new THREE.TubeGeometry(curve,10,.075,6,false),group.children[1].material,0,0,0);
    const leaf=mesh(group,ball,material(kind),Math.cos(a)*.64,1.27,Math.sin(a)*.64);leaf.scale.set(.32,.08,.17);leaf.rotation.z=.4;moving.push(leaf);
  }
  if(kind==='fire')for(let i=0;i<5;i++){
    const flame=mesh(group,new THREE.SphereGeometry(.2,10,8),bright,Math.cos(i*2.4)*.2,1.4,Math.sin(i*2.4)*.2);flame.scale.set(.65,1.8,.65);moving.push(flame);
  }
  if(kind==='earth')for(let i=0;i<3+level;i++){
    const a=i/(3+level)*Math.PI*2;const rock=mesh(group,new THREE.DodecahedronGeometry(.18,1),stone,Math.cos(a)*.7,.9,Math.sin(a)*.7);moving.push(rock);
  }
  if(kind==='water')for(let i=0;i<6;i++){
    const drop=mesh(group,ball,bright,Math.cos(i)*.6,1.1+Math.sin(i)*.3,Math.sin(i)*.6);drop.scale.setScalar(.055);moving.push(drop);
  }
  return moving.map((mesh,i)=>({mesh,y:mesh.position.y,phase:i*1.7}));
}

export function fusionDetails(group,kind,level,material,ball){
  const specs={
    thunder:{color:0xb56cff,accent:0xead7ff,shape:'storm'},
    bog:{color:0x899d4a,accent:0xc9db74,shape:'bog'},
    spike:{color:0xb9d67e,accent:0xe9f3ca,shape:'spike'},
    mist:{color:0x77c7a0,accent:0xd4ffe9,shape:'mist'},
    lava:{color:0xff713e,accent:0xffd26d,shape:'lava'},
    blade:{color:0xffad67,accent:0xffedb2,shape:'blade'},
    steam:{color:0xd4e6df,accent:0xffffff,shape:'steam'},
    rock:{color:0xcfb87a,accent:0xffe09a,shape:'rock'},
    mud:{color:0x9a8457,accent:0xd8c28d,shape:'mud'},
    ice:{color:0xb9edff,accent:0xf1ffff,shape:'ice'}
  }[kind];
  if(!specs)return [];
  const glow=new THREE.MeshStandardMaterial({color:specs.color,emissive:specs.color,emissiveIntensity:2.3,roughness:.25,metalness:.12});
  const accent=new THREE.MeshStandardMaterial({color:specs.accent,emissive:specs.color,emissiveIntensity:.65,roughness:.32,metalness:.38});
  const bodyColor=new THREE.Color(specs.color).multiplyScalar(.32);
  const dark=new THREE.MeshStandardMaterial({color:bodyColor,emissive:new THREE.Color(specs.color).multiplyScalar(.08),emissiveIntensity:.7,roughness:.45,metalness:.35});
  const moving=[];
  group.children[1].material=dark;
  const ring=(radius,y,mat=glow)=>{const m=mesh(group,new THREE.TorusGeometry(radius,.045,8,36),mat,0,y,0);m.rotation.x=Math.PI/2;moving.push(m);return m;};
  if(specs.shape==='storm'){
    ring(.65,1.1);ring(.9,1.55,accent);for(let i=0;i<3;i++){const c=mesh(group,new THREE.OctahedronGeometry(.2),glow,Math.cos(i*2.1)*.42,1.55+Math.sin(i)*.18,Math.sin(i*2.1)*.42);c.scale.y=2.2;moving.push(c);}
  } else if(specs.shape==='bog'){
    mesh(group,new THREE.CylinderGeometry(.72,.84,.16,12),dark,0,.35,0);for(let i=0;i<5;i++){const a=i*1.25,b=mesh(group,new THREE.SphereGeometry(.14,10,8),glow,Math.cos(a)*.52, .65+Math.sin(a)*.12,Math.sin(a)*.52);moving.push(b);}ring(.7,.48,accent);
  } else if(specs.shape==='spike'){
    for(let i=0;i<6;i++){const a=i*Math.PI/3,s=mesh(group,new THREE.ConeGeometry(.13,.9,5),accent,Math.cos(a)*.65,.8,Math.sin(a)*.65);s.rotation.z=Math.PI/2; s.rotation.y=-a;moving.push(s);}mesh(group,new THREE.OctahedronGeometry(.27),glow,0,1.45,0);
  } else if(specs.shape==='mist'){
    ring(.58,1.1);ring(.83,1.5,accent);for(let i=0;i<8;i++){const a=i*.8;const d=mesh(group,new THREE.SphereGeometry(.1,10,8),glow,Math.cos(a)*(.35+i%2*.23),1.05+Math.sin(a)*.35,Math.sin(a)*(.35+i%2*.23));d.scale.y=1.7;moving.push(d);}
  } else if(specs.shape==='lava'){
    mesh(group,new THREE.DodecahedronGeometry(.65,1),dark,0,.7,0);for(let i=0;i<5;i++){const a=i*1.27,r=.45;const shard=mesh(group,new THREE.TetrahedronGeometry(.2),glow,Math.cos(a)*r,1.15+Math.sin(a*2)*.12,Math.sin(a)*r);moving.push(shard);}ring(.7,.38,accent);
  } else if(specs.shape==='blade'){
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const blade=mesh(group,new THREE.BoxGeometry(.12,1.35,.3),accent,Math.cos(a)*.55,.95,Math.sin(a)*.55);blade.rotation.y=-a;blade.rotation.z=.35;moving.push(blade);}mesh(group,new THREE.OctahedronGeometry(.3),glow,0,1.65,0);ring(.78,.3,glow);
  } else if(specs.shape==='steam'){
    mesh(group,new THREE.CylinderGeometry(.55,.62,.6,12),dark,0,.65,0);ring(.58,1.1,accent);ring(.82,1.45,glow);for(let i=0;i<3;i++){const puff=mesh(group,new THREE.SphereGeometry(.2,10,8),accent,Math.sin(i)*.25,1.5+i*.18,Math.cos(i)*.2);puff.scale.set(1,.65,1);moving.push(puff);}
  } else if(specs.shape==='rock'){
    for(let i=0;i<5;i++){const a=i*1.26;const rock=mesh(group,new THREE.DodecahedronGeometry(.28+i%2*.08,1),dark,Math.cos(a)*.62, .75+Math.sin(a)*.25,Math.sin(a)*.62);rock.scale.y=1.35;moving.push(rock);}mesh(group,new THREE.OctahedronGeometry(.32),glow,0,1.7,0);ring(.7,.3,accent);
  } else if(specs.shape==='mud'){
    mesh(group,new THREE.CylinderGeometry(.78,.68,.2,16),dark,0,.38,0);for(let i=0;i<6;i++){const a=i*1.05;const blob=mesh(group,new THREE.SphereGeometry(.18,10,8),glow,Math.cos(a)*.5,.65,Math.sin(a)*.5);blob.scale.y=.55;moving.push(blob);}ring(.75,.55,accent);
  } else if(specs.shape==='ice'){
    for(let i=0;i<5;i++){const a=i*1.256;const ice=mesh(group,new THREE.OctahedronGeometry(.28),accent,Math.cos(a)*.55,.95,Math.sin(a)*.55);ice.scale.y=1.7;moving.push(ice);}mesh(group,new THREE.OctahedronGeometry(.34),glow,0,1.65,0);ring(.8,.5,glow);ring(.58,1.15,accent);
  }
  return moving.map((m,i)=>({mesh:m,y:m.position.y,phase:i*1.13}));
}
