import * as THREE from './assets/three.module.js';

export const SPIRIT_COLORS={metal:0xffd477,wood:0x7cdd86,water:0x62dcff,fire:0xff8544,earth:0xdbac6c};

// Small actors use geometry and emissive materials, without per-actor lights.
export function createSpirit(kind) {
  const root=new THREE.Group(),body=new THREE.Group(),orbit=new THREE.Group();
  root.add(body);body.add(orbit);root.userData.kind=kind;
  root.userData.model=`${kind}-spirit`;root.userData.healthHeight=1.38;
  const materials=[];
  const mat=(color,emissive=0,metalness=.15)=>{
    const m=new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:1.25,roughness:.32,metalness});materials.push(m);return m;
  };
  const light=mat(SPIRIT_COLORS[kind],SPIRIT_COLORS[kind],.2);
  const pale=mat(0xfff5cf,kind==='fire'?0xffb03c:0x40361b,.35);
  const add=(parent,g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;};
  const tube=(parent,points,r,m)=>add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,5,false),m);
  const core=add(body,new THREE.OctahedronGeometry(.22),light);core.scale.set(.8,1.35,.8);
  const particles=[],moving=[];
  if(kind==='metal'){
    const gold=mat(0xcba54e,0x382507,.8);
    for(let i=0;i<3;i++){
      const g=new THREE.Group(),a=i*Math.PI*2/3;orbit.add(g);g.position.set(Math.cos(a)*.43,0,Math.sin(a)*.43);g.rotation.z=-.35;
      const blade=add(g,new THREE.OctahedronGeometry(.23),gold);blade.scale.set(.38,1.4,.22);
      const edge=add(g,new THREE.OctahedronGeometry(.19),pale,0,.015,.026);edge.scale.set(.15,1.4,.12);
      moving.push(g);
    }
    orbit.rotation.z=.26;
    const band=add(body,new THREE.TorusGeometry(.29,.012,5,32),gold);band.rotation.x=Math.PI/2;
  }else if(kind==='wood'){
    const bark=mat(0x4d6d3a),leaf=mat(0x48a962,0x123b19);
    core.scale.set(.95,1.1,.8);
    tube(body,[[-.2,-.23,0],[-.29,-.02,.14],[-.06,.26,.2],[.12,.3,.03],[.24,.11,-.12]],.038,bark);
    for(const side of [-1,1]){
      const g=new THREE.Group();g.position.set(side*.22,.08,0);g.rotation.z=-side*.8;body.add(g);
      const shape=new THREE.Shape();shape.moveTo(0,-.09);shape.bezierCurveTo(-.17,.07,-.14,.29,0,.44);shape.bezierCurveTo(.17,.2,.16,.02,0,-.09);
      add(g,new THREE.ExtrudeGeometry(shape,{depth:.024,bevelEnabled:true,bevelSegments:1,bevelSize:.008,bevelThickness:.008}),leaf);
      tube(g,[[0,-.05,.03],[0,.14,.04],[0,.36,.035]],.009,light);moving.push(g);
    }
    tube(body,[[0,-.18,0],[-.08,-.34,.05],[.05,-.42,.08]],.019,bark);
  }else if(kind==='water'){
    const shell=new THREE.MeshPhysicalMaterial({color:0x53c8ec,metalness:.1,roughness:.08,transparent:true,opacity:.38,depthWrite:false,side:THREE.FrontSide,clearcoat:1});materials.push(shell);
    const points=[new THREE.Vector2(0,-.33),new THREE.Vector2(.15,-.29),new THREE.Vector2(.28,-.13),new THREE.Vector2(.29,.04),new THREE.Vector2(.21,.23),new THREE.Vector2(.1,.38),new THREE.Vector2(0,.58)];
    const droplet=add(body,new THREE.LatheGeometry(points,24),shell);moving.push(droplet);
    core.scale.set(.65,.95,.65);
    const ripple=add(body,new THREE.TorusGeometry(.29,.013,5,36),light);ripple.rotation.x=1.8;ripple.position.y=-.2;
    for(let i=0;i<3;i++){const p=add(body,new THREE.SphereGeometry(.046-i*.008,8,6),light);particles.push(p);}
  }else if(kind==='fire'){
    const orange=mat(0xfc6524,0xb52906),yellow=mat(0xffe295,0xffbf48);
    core.material=yellow;
    const flame=(x,z,scale,m)=>{
      const g=new THREE.ConeGeometry(.17,.7,9,4);
      const positions=g.attributes.position;
      for(let i=0;i<positions.count;i++){const y=positions.getY(i);positions.setX(i,positions.getX(i)+Math.pow(Math.max(0,y+.1),2)*.7);}
      g.computeVertexNormals();const f=add(body,g,m,x,.1,z);f.scale.setScalar(scale);moving.push(f);return f;
    };
    flame(-.12,-.05,1,orange);flame(.12,-.03,.83,orange);flame(0,.08,.72,yellow);
    const heart=add(body,new THREE.SphereGeometry(.19,12,8),yellow,0,-.08,0);heart.scale.y=.85;
    for(let i=0;i<4;i++)particles.push(add(body,new THREE.OctahedronGeometry(.02),light));
  }else{
    const stone=mat(0x80796a,0,.08),rim=mat(0xb6a17c,0,.1);
    core.scale.set(1,1.15,1);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;const g=new THREE.Group();orbit.add(g);g.position.set(Math.cos(a)*.38,i%2*.1-.05,Math.sin(a)*.38);
      const rock=add(g,new THREE.DodecahedronGeometry(.17),i%2?rim:stone);rock.scale.set(1,.85,1);
      const crack=add(g,new THREE.OctahedronGeometry(.1),light,0,0,.125);crack.scale.set(.13,.8,.18);moving.push(g);
    }
    for(let i=0;i<4;i++)particles.push(add(body,new THREE.IcosahedronGeometry(.018),rim));
  }
  root.userData.parts={body,orbit,core,light,materials,moving,particles};
  moving.forEach(o=>{o.userData.home=o.position.clone();o.userData.baseScale=o.scale.clone();o.userData.baseRotation=o.rotation.clone();});
  return root;
}

export function animateSpirit(root,time,phase=0) {
  const {body,orbit,core,light,moving,particles}=root.userData.parts;
  const kind=root.userData.kind,t=time+phase;
  body.position.y=.64+Math.sin(t*2.4)*.045;
  core.rotation.y=t*.6;light.emissiveIntensity=1.1+Math.sin(t*2)*.25;
  if(kind==='metal'||kind==='earth'){
    orbit.rotation.y=t*(kind==='metal'?.7:.3);
    moving.forEach((o,i)=>o.position.y=o.userData.home.y+Math.sin(t*2+i*2)*.035);
  }else if(kind==='wood')moving.forEach((o,i)=>o.rotation.z=o.userData.baseRotation.z+Math.sin(t*3+i)*.12);
  else if(kind==='water')moving[0].scale.set(1+Math.sin(t*3)*.025,1-Math.sin(t*3)*.04,1+Math.sin(t*3)*.025);
  else if(kind==='fire')moving.forEach((o,i)=>{o.scale.y=o.userData.baseScale.y*(1+Math.sin(t*7+i*2)*.15);o.rotation.z=Math.sin(t*4+i)*.07;});
  particles.forEach((p,i)=>{
    const progress=(t*.6+i/particles.length)%1;
    if(kind==='water'){p.position.set(-.35-progress*.25,-.16+progress*.06,Math.sin(i*2)*.08);p.scale.setScalar(1-progress*.8);}
    else if(kind==='fire'){p.position.set(Math.sin(i*4+t)*.21,.22+progress*.55,Math.cos(i*3)*.13);p.scale.setScalar(1-progress);}
    else{p.position.set(Math.sin(i*4+t*.3)*.3,-.22-progress*.32,Math.cos(i*3)*.23);p.scale.setScalar(1-progress);}
  });
}

export function disposeSpirit(root){
  const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
  geometries.forEach(g=>g.dispose());root.userData.parts.materials.forEach(m=>m.dispose());root.removeFromParent();
}
