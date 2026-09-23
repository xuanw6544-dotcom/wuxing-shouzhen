/* Shared Canvas artwork for the battlefield and the element portraits. */
(() => {
  "use strict";
  const COLORS = { metal: "#ffe2a0", wood: "#82dd96", water: "#77d8f1", fire: "#ff8966", earth: "#eac17d", thunder: "#b56cff", bog: "#bacb6d", spike: "#cce4b2", mist: "#8ae6ca", lava: "#ff854b", blade: "#ffbc83", steam: "#d7f6ef", rock: "#d8c7a0", mud: "#baa57b", ice: "#b9edff" };
  const ink = "#172a2b";
  const basicKinds = ["metal","wood","water","fire","earth"];
  const spriteVisibleRatio = {
    metal:[139/150,161/174,193/228], wood:[133/150,175/163,198/235], water:[127/159,173/177,191/236],
    fire:[162/145,195/158,233/177], earth:[132/151,156/175,196/237]
  };
  const fireBaseHeight=spriteVisibleRatio.fire[0]*2.12;
  const levelGrowth=spriteVisibleRatio.fire.map((ratio,index)=>ratio*(2.12+index*.22)/fireBaseHeight);
  const towerSprites = new Map();
  const ready = Promise.all(basicKinds.flatMap(kind => [1,2,3].map(level => new Promise((resolve,reject) => {
    const image = new Image();
    towerSprites.set(`${kind}-${level}`, image);
    image.onload = resolve;
    image.onerror = () => reject(new Error(`Tower asset failed: ${kind}-${level}`));
    image.src = `assets/towers/${kind}-${level}.png`;
  }))));
  ready.catch(error => console.error(error));
  function polygon(c, points, fill, stroke = ink, width = 1.5) {
    c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
    if (fill) { c.fillStyle=fill;c.fill(); } if (stroke) {c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  function line(c, points, color, width=1.5) {
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  function ellipse(c,x,y,rx,ry,color,stroke) {
    c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();
    if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
  }
  function crystal(c,x,y,w,h,color) {
    polygon(c,[[x,y-h],[x+w,y-h*.3],[x+w*.6,y+h*.25],[x,y+h*.5],[x-w*.6,y+h*.25],[x-w,y-h*.3]],color);
    polygon(c,[[x,y-h],[x,y+h*.5],[x-w*.6,y+h*.25],[x-w,y-h*.3]],"#ffffff44",null);
    line(c,[[x,y-h],[x+w,y-h*.3],[x,y-h*.13],[x,y+h*.5]],"#ffffff80",.8);
  }
  function flame(c,x,y,s,t,color="#ff8759") {
    c.save();c.translate(x,y);c.scale(s,s);const f=Math.sin(t*7)*2;
    c.beginPath();c.moveTo(-9,2);c.bezierCurveTo(-17,-8,-3,-15,-1,-30-f);c.bezierCurveTo(2,-19,15,-15,8,0);c.quadraticCurveTo(0,10,-9,2);
    c.fillStyle=color;c.fill();c.strokeStyle=ink;c.lineWidth=1;c.stroke();
    c.beginPath();c.moveTo(-4,2);c.quadraticCurveTo(-6,-6,2,-15);c.quadraticCurveTo(1,-6,5,0);c.quadraticCurveTo(0,6,-4,2);c.fillStyle="#fff1b0";c.fill();c.restore();
  }
  function leaf(c,x,y,angle,color) {
    c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-9,-12,0,-19);c.quadraticCurveTo(9,-9,0,0);c.fillStyle=color;c.fill();line(c,[[0,0],[0,-13]],"#e3ffd277",1);c.restore();
  }
  function pedestal(c,color,level=1) {
    ellipse(c,0,18,24,9,"#061b2266");
    polygon(c,[[-23,8],[0,-1],[23,8],[23,16],[0,26],[-23,16]],"#344d50");
    polygon(c,[[-23,8],[0,18],[0,26],[-23,16]],"#243a40");
    polygon(c,[[-23,8],[0,-1],[23,8],[0,18]],"#647b74","#bac5a577");
    line(c,[[-20,14],[0,22],[20,14]],color,1.5);
    for(let i=0;i<level;i++)ellipse(c,-5+(i*5)-(level-1)*2.5,19,1.2,1.2,color);
  }
  function sword(c,x,y,s,color,angle=0) {
    c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);
    polygon(c,[[0,-32],[5,-23],[3,0],[-3,0],[-5,-23]],color);
    polygon(c,[[0,-32],[0,0],[-3,0],[-5,-23]],"#ffffff88",null);
    line(c,[[-9,1],[0,3],[9,1]],"#e9b969",3);line(c,[[0,3],[0,10]],"#734a46",4);c.restore();
  }
  function fireAuraBack(c,x,y,size,time,level=1) {
    if(level<3)return;
    const pulse=.92+Math.sin(time*4.2)*.08;
    c.save();
    c.globalCompositeOperation="lighter";
    c.save();c.translate(x,y+size*.38);c.scale(1,.34);
    const ground=c.createRadialGradient(0,0,2,0,0,size*1.5);
    ground.addColorStop(0,`rgba(255,196,101,${.42*pulse})`);ground.addColorStop(.42,"rgba(255,102,39,.2)");ground.addColorStop(1,"rgba(255,55,20,0)");
    c.fillStyle=ground;c.beginPath();c.arc(0,0,size*1.5,0,Math.PI*2);c.fill();c.restore();
    const flameY=y-size*1.65,glow=c.createRadialGradient(x,flameY,1,x,flameY,size*1.25);
    glow.addColorStop(0,`rgba(255,239,151,${.34*pulse})`);glow.addColorStop(.3,"rgba(255,139,55,.2)");glow.addColorStop(1,"rgba(255,55,22,0)");
    c.fillStyle=glow;c.beginPath();c.arc(x,flameY,size*1.25,0,Math.PI*2);c.fill();
    c.strokeStyle=`rgba(255,177,80,${.22*pulse})`;c.lineWidth=size*.045;c.beginPath();c.ellipse(x,y+size*.36,size*.88,size*.2,0,0,Math.PI*2);c.stroke();
    c.translate(x,flameY+size*.18);c.rotate(time*.22);
    for(let i=0;i<3;i++){
      c.beginPath();c.ellipse(0,0,size*(.72+i*.12),size*(.16+i*.025),i*.45,time*.7+i*.8,time*.7+i*.8+Math.PI*1.32);
      c.strokeStyle=i===0?"rgba(255,235,156,.55)":"rgba(255,111,43,.3)";c.lineWidth=Math.max(1,size*.035);c.stroke();
    }
    c.restore();
  }
  function fireAuraFront(c,x,y,size,time,level=1) {
    if(level<3)return;
    const flameY=y-size*1.72;
    c.save();c.globalCompositeOperation="lighter";c.lineCap="round";
    for(let i=0;i<3;i++){
      const phase=time*(1.35+i*.16)+i*2.1,side=i-1;
      c.beginPath();c.moveTo(x+side*size*.25,y-size*.72);
      c.bezierCurveTo(x+side*size*.55+Math.sin(phase)*3,y-size*1.05,x-side*size*.08,y-size*1.25,x+Math.sin(phase*.7)*size*.14,flameY-size*(.22+i*.09));
      c.strokeStyle=i===1?"rgba(255,244,177,.22)":"rgba(255,103,42,.18)";c.lineWidth=size*(.09-i*.015);c.stroke();
    }
    for(let i=0;i<8;i++){
      const cycle=(time*(.34+i*.013)+i*.137)%1,angle=i*2.399;
      const spread=size*(.22+cycle*.75),px=x+Math.sin(angle)*spread+Math.sin(time*2+i)*2,py=y-size*.78-cycle*size*1.7;
      const alpha=(1-cycle)*(.75-(i%3)*.1),radius=Math.max(.65,size*(.018+(i%2)*.012)*(1-cycle*.45));
      c.fillStyle=i%3===0?`rgba(255,244,166,${alpha})`:`rgba(255,105,43,${alpha})`;c.beginPath();c.arc(px,py,radius,0,Math.PI*2);c.fill();
    }
    c.strokeStyle=`rgba(255,213,120,${.18+Math.sin(time*5)*.05})`;c.lineWidth=1;
    for(let i=0;i<2;i++){
      const offset=Math.sin(time*1.7+i*2.4)*size*.16;c.beginPath();c.moveTo(x-size*.42+offset,y-size*1.07-i*size*.26);
      c.bezierCurveTo(x-size*.7,y-size*1.3,x+size*.66,y-size*1.34,x+size*.4+offset,y-size*1.58-i*size*.18);c.stroke();
    }
    c.restore();
  }
  function elementGroundAura(c,x,y,size,inner,middle,time) {
    c.save();c.globalCompositeOperation="lighter";c.translate(x,y+size*.38);c.scale(1,.32);
    const pulse=.88+Math.sin(time*3.4)*.12,glow=c.createRadialGradient(0,0,1,0,0,size*1.48);
    glow.addColorStop(0,inner.replace("ALPHA",String(.36*pulse)));glow.addColorStop(.48,middle);glow.addColorStop(1,"rgba(0,0,0,0)");
    c.fillStyle=glow;c.beginPath();c.arc(0,0,size*1.48,0,Math.PI*2);c.fill();c.restore();
  }
  function metalAuraBack(c,x,y,size,time,level) {
    if(level<3)return;elementGroundAura(c,x,y,size,"rgba(255,229,143,ALPHA)","rgba(255,183,62,.14)",time);
    c.save();c.globalCompositeOperation="lighter";c.translate(x,y-size*1.52);c.rotate(Math.sin(time*.7)*.07);
    for(let i=0;i<2;i++){c.beginPath();c.ellipse(0,0,size*(.68+i*.18),size*(.1+i*.025),i*.12,time*.65+i*1.8,time*.65+i*1.8+Math.PI*1.28);c.strokeStyle=i?"rgba(255,194,76,.3)":"rgba(255,244,190,.58)";c.lineWidth=Math.max(1,size*.03);c.stroke();}
    c.restore();
  }
  function metalAuraFront(c,x,y,size,time,level) {
    if(level<3)return;c.save();c.globalCompositeOperation="lighter";c.lineCap="round";
    for(let i=0;i<7;i++){
      const phase=(time*.3+i/7)%1,angle=-Math.PI*.82+i*Math.PI*1.64/6,reach=size*(.55+phase*.65),sx=x+Math.cos(angle)*reach,sy=y-size*1.25+Math.sin(angle)*reach*.38-phase*size*.45;
      c.strokeStyle=`rgba(255,220,133,${(1-phase)*.62})`;c.lineWidth=Math.max(.7,size*.025*(1-phase));c.beginPath();c.moveTo(sx-Math.cos(angle)*size*.22,sy-Math.sin(angle)*size*.08);c.lineTo(sx,sy);c.stroke();
    }
    const glint=(Math.sin(time*4.6)+1)/2,gy=y-size*(1.88-glint*.5);c.strokeStyle=`rgba(255,255,224,${.28+glint*.46})`;c.lineWidth=1;c.beginPath();c.moveTo(x-size*.22,gy);c.lineTo(x+size*.22,gy);c.moveTo(x,gy-size*.17);c.lineTo(x,gy+size*.17);c.stroke();c.restore();
  }
  function woodAuraBack(c,x,y,size,time,level) {
    if(level<3)return;elementGroundAura(c,x,y,size,"rgba(131,255,153,ALPHA)","rgba(46,190,92,.13)",time);
    c.save();c.globalCompositeOperation="lighter";const coreY=y-size*1.62,glow=c.createRadialGradient(x,coreY,1,x,coreY,size*.78);glow.addColorStop(0,`rgba(192,255,188,${.28+Math.sin(time*3)*.06})`);glow.addColorStop(.4,"rgba(62,226,125,.13)");glow.addColorStop(1,"rgba(45,174,95,0)");c.fillStyle=glow;c.beginPath();c.arc(x,coreY,size*.78,0,Math.PI*2);c.fill();
    for(const side of [-1,1]){c.strokeStyle="rgba(118,239,136,.24)";c.lineWidth=size*.035;c.beginPath();c.moveTo(x+side*size*.75,y+size*.25);c.bezierCurveTo(x+side*size*1.05,y-size*.35,x+side*size*.65,y-size*.9,x+side*size*.88,y-size*1.4);c.stroke();}c.restore();
  }
  function woodAuraFront(c,x,y,size,time,level) {
    if(level<3)return;c.save();c.globalCompositeOperation="lighter";
    for(let i=0;i<9;i++){
      const cycle=(time*(.12+i*.006)+i*.113)%1,angle=i*2.399+time*.28,px=x+Math.cos(angle)*size*(.48+cycle*.62),py=y-size*.35-cycle*size*1.7+Math.sin(angle*2)*size*.12,rot=angle+cycle*2;
      c.save();c.translate(px,py);c.rotate(rot);c.scale(size*.025,size*.025);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-5,-9,0,-14);c.quadraticCurveTo(7,-7,0,0);c.fillStyle=i%3?`rgba(123,244,128,${(1-cycle)*.7})`:`rgba(218,255,166,${(1-cycle)*.75})`;c.fill();c.restore();
    }
    for(let i=0;i<5;i++){const a=time*.8+i*1.27,px=x+Math.sin(a)*size*.62,py=y-size*(.75+i*.24)+Math.cos(a*1.4)*3;c.fillStyle=`rgba(191,255,178,${.28+Math.sin(a)*.16})`;c.beginPath();c.arc(px,py,Math.max(.6,size*.016),0,Math.PI*2);c.fill();}c.restore();
  }
  function waterAuraBack(c,x,y,size,time,level) {
    if(level<3)return;elementGroundAura(c,x,y,size,"rgba(110,235,255,ALPHA)","rgba(24,145,230,.16)",time);
    c.save();c.globalCompositeOperation="lighter";for(let i=0;i<3;i++){const p=(time*.28+i*.33)%1;c.strokeStyle=`rgba(105,230,255,${(1-p)*.38})`;c.lineWidth=Math.max(.8,size*.025*(1-p));c.beginPath();c.ellipse(x,y+size*.32,size*(.38+p*.95),size*(.09+p*.23),0,0,Math.PI*2);c.stroke();}c.restore();
  }
  function waterAuraFront(c,x,y,size,time,level) {
    if(level<3)return;c.save();c.globalCompositeOperation="lighter";const orbY=y-size*1.44;c.translate(x,orbY);c.rotate(Math.sin(time*.8)*.08);
    for(let i=0;i<2;i++){c.beginPath();c.ellipse(0,0,size*(.66+i*.14),size*(.115+i*.028),i*.1,-time*.55+i*2,-time*.55+i*2+Math.PI*1.38);c.strokeStyle=i?"rgba(73,196,255,.34)":"rgba(187,250,255,.66)";c.lineWidth=Math.max(1,size*.03);c.stroke();}c.restore();
    c.save();c.globalCompositeOperation="lighter";for(let i=0;i<9;i++){const cycle=(time*(.17+i*.004)+i*.109)%1,side=Math.sin(i*4.7),px=x+side*size*(.36+cycle*.65),py=y-size*.46-cycle*size*1.82,r=size*(.018+(i%3)*.009);c.fillStyle=`rgba(175,246,255,${(1-cycle)*.34})`;c.strokeStyle=`rgba(111,221,255,${(1-cycle)*.7})`;c.lineWidth=.8;c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();c.stroke();}c.restore();
  }
  function earthAuraBack(c,x,y,size,time,level) {
    if(level<3)return;elementGroundAura(c,x,y,size,"rgba(255,198,91,ALPHA)","rgba(204,125,35,.12)",time);
    c.save();c.globalCompositeOperation="lighter";c.translate(x,y+size*.3);c.scale(1,.42);c.strokeStyle=`rgba(255,186,69,${.28+Math.sin(time*3.2)*.08})`;c.lineWidth=Math.max(1,size*.028);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4+.25,r=size*(.45+(i%2)*.28);c.beginPath();c.moveTo(Math.cos(a)*size*.12,Math.sin(a)*size*.12);c.lineTo(Math.cos(a)*r*.55,Math.sin(a)*r*.55);c.lineTo(Math.cos(a+.16)*r,Math.sin(a+.16)*r);c.stroke();}c.restore();
  }
  function earthAuraFront(c,x,y,size,time,level) {
    if(level<3)return;c.save();
    for(let i=0;i<6;i++){
      const side=i%2?-1:1,row=Math.floor(i/2),phase=time*(.72+row*.08)+i*1.7,px=x+side*size*(.62+row*.17),py=y-size*(.62+row*.32)+Math.sin(phase)*size*.1,s=size*(.07+row*.018);
      c.save();c.translate(px,py);c.rotate(phase*.22);polygon(c,[[0,-s],[s*.75,-s*.15],[s*.55,s*.7],[-s*.5,s*.55],[-s*.8,-s*.18]],i%3?"#9b8464":"#c29a5d","rgba(255,210,127,.62)",.7);c.restore();
    }
    c.globalCompositeOperation="lighter";for(let i=0;i<8;i++){const cycle=(time*.11+i*.127)%1,px=x+Math.sin(i*3.1)*size*(.35+cycle*.7),py=y+size*.2-cycle*size*1.25;c.fillStyle=`rgba(255,195,96,${(1-cycle)*.38})`;c.beginPath();c.arc(px,py,Math.max(.5,size*.012),0,Math.PI*2);c.fill();}c.restore();
  }
  function towerAuraBack(c,kind,x,y,size,time,level=1) {
    if(kind==="metal")metalAuraBack(c,x,y,size,time,level);else if(kind==="wood")woodAuraBack(c,x,y,size,time,level);else if(kind==="water")waterAuraBack(c,x,y,size,time,level);else if(kind==="fire")fireAuraBack(c,x,y,size,time,level);else if(kind==="earth")earthAuraBack(c,x,y,size,time,level);
  }
  function towerAuraFront(c,kind,x,y,size,time,level=1) {
    if(kind==="metal")metalAuraFront(c,x,y,size,time,level);else if(kind==="wood")woodAuraFront(c,x,y,size,time,level);else if(kind==="water")waterAuraFront(c,x,y,size,time,level);else if(kind==="fire")fireAuraFront(c,x,y,size,time,level);else if(kind==="earth")earthAuraFront(c,x,y,size,time,level);
  }
  function tower(c,kind,x,y,size,time=0,level=1,broken=false) {
    const sprite = towerSprites.get(`${kind}-${level}`);
    if(sprite && !broken) {
      if(sprite.complete && sprite.naturalWidth) {
        const ratios=spriteVisibleRatio[kind],baseHeight=ratios[0]*2.12;
        const width=size*baseHeight*levelGrowth[level-1]/ratios[level-1],height=width*sprite.naturalHeight/sprite.naturalWidth;
        c.drawImage(sprite, x-width/2, y+size*.7-height, width, height);
      }
      return;
    }
    const color=COLORS[kind]||COLORS.metal;
    c.save();c.translate(x,y);c.scale(size/28,size/28);c.lineCap="round";c.lineJoin="round";
    if(broken){pedestal(c,"#7e8b85",level);polygon(c,[[-12,4],[-6,-7],[3,0],[13,-5],[17,8],[1,15]],"#65716e");line(c,[[-7,2],[0,6],[-2,12]],ink,2);c.restore();return;}
    pedestal(c,color,level);
    const bob=Math.sin(time*2+x*.04)*1.7;
    c.translate(0,-3);
    switch(kind){
      case "metal":
        sword(c,0,bob,1,color);
        if(level>1){sword(c,-13,3,.56,color,-.25);sword(c,13,3,.56,color,.25);}break;
      case "wood":
        line(c,[[-13,12],[-4,4],[0,-13],[2,-29]],"#425b37",9);
        line(c,[[0,8],[-1,-11],[2,-29]],"#b4aa68",3);
        line(c,[[-1,-6],[-14,-20]],"#7a9253",4);line(c,[[0,-14],[13,-25]],"#7a9253",4);
        leaf(c,-8,-11,-1.15,color);leaf(c,7,-16,1.1,"#b7ed9b");leaf(c,2,-24,.1,color);leaf(c,11,-3,1.35,"#559f72");break;
      case "water":
        polygon(c,[[-16,-1],[16,-1],[11,10],[-11,10]],"#447e91");ellipse(c,0,-2,17,6,"#24465a",color);
        crystal(c,0,-15+bob,8,18,color);
        c.save();c.rotate(-.25);c.beginPath();c.ellipse(0,-13,21,6,0,.2,Math.PI*1.8);c.strokeStyle="#aef7ee";c.lineWidth=2;c.stroke();c.restore();break;
      case "fire":
        polygon(c,[[-13,-10],[-16,3],[-9,13],[9,13],[16,3],[13,-10]],"#78443c","#e9b476");
        ellipse(c,0,-10,15,5,"#342b2e","#dbb174");flame(c,0,-13,.8,time);line(c,[[-8,3],[0,7],[8,3]],color,2);break;
      case "earth":
        polygon(c,[[-12,12],[-15,-17],[-7,-29],[9,-29],[16,-17],[12,12]],"#8c8270","#dcc99c");
        polygon(c,[[-15,-17],[-7,-29],[-5,9],[-12,12]],"#b3ab8c",null);
        line(c,[[1,-20],[7,-15],[1,-10],[-4,-5],[2,0],[2,7]],"#ffdb8d",2);break;
      case "thunder":
        polygon(c,[[-19,9],[-18,-19],[-11,-25],[-11,4]],"#655183",color);
        polygon(c,[[19,9],[18,-19],[11,-25],[11,4]],"#655183",color);
        crystal(c,0,-16+bob,8,18,color);
        line(c,[[-15,-17],[-5,-10],[3,-23],[6,-6],[15,-17]],"#f5d7ff",1.8+Math.sin(time*12)*.6);break;
      case "ice":
        crystal(c,-13,1,6,20,"#6ba8cc");crystal(c,12,-2,7,25,"#86dce7");crystal(c,0,-3+bob,9,32,color);break;
      case "spike":
        line(c,[[0,10],[-3,-9],[0,-27]],"#5e785d",8);
        for(const side of [-1,1]){sword(c,side*10,-2,.62,color,side*.6);leaf(c,side*10,8,side*1.2,"#568a58");}sword(c,0,-7,.72,"#e6efd6");break;
      case "bog":
        ellipse(c,0,8,19,7,"#718238",color);
        line(c,[[-12,7],[-17,-7],[-10,-21],[-1,-16],[1,-4],[8,2],[15,-10]],"#a4b364",5);
        leaf(c,-11,-16,-.7,"#829f50");crystal(c,4,-4+bob,5,12,"#dbe69a");break;
      case "mist":
        line(c,[[0,10],[0,-22]],"#4b8b78",6);
        for(const [lx,ly,a] of [[-4,-14,-1],[4,-22,1],[-1,-28,0]])leaf(c,lx,ly,a,color);
        for(let i=0;i<3;i++)ellipse(c,Math.sin(time+i*2)*7,3-i*8,19-i*3,4,"#bdffe635");break;
      case "lava":
        polygon(c,[[-21,10],[-15,-8],[-8,-22],[9,-22],[18,-6],[22,11]],"#5e4c4d","#b9856c");
        ellipse(c,0,-20,9,4,"#ffb968");line(c,[[0,-18],[-5,-7],[4,-3],[0,12]],color,3);line(c,[[10,-9],[6,4],[13,10]],"#ffcb7e",2);flame(c,0,-23,.35,time);break;
      case "blade":
        polygon(c,[[-15,10],[-10,-5],[11,-5],[16,10]],"#723f3e");sword(c,-6,-1,1.02,color,-.25);sword(c,7,2,.92,"#f68060",.3);flame(c,0,0,.42,time);break;
      case "steam":
        polygon(c,[[-13,9],[-15,-14],[-8,-20],[9,-20],[15,-14],[13,9]],"#638b8d","#c4dcce");
        ellipse(c,0,-17,13,5,"#415c62","#b2dfd2");ellipse(c,0,-2,6,6,"#1d393d",color);
        line(c,[[-14,-5],[-21,-5],[-21,-16]],"#ccaf83",4);line(c,[[14,-5],[21,-5],[21,-16]],"#ccaf83",4);
        for(let i=0;i<3;i++){const p=(time*.7+i*.33)%1;ellipse(c,Math.sin(i+time)*4,-23-p*15,4+p*5,3+p*3,`rgba(213,246,237,${(1-p)*.7})`);}break;
      case "rock":
        polygon(c,[[-20,8],[-17,-9],[-8,-18],[15,-13],[21,8]],"#7c8582","#c5c8ac");
        crystal(c,-5,-14,7,15,color);crystal(c,9,-3,5,12,"#edf0bd");line(c,[[-14,3],[0,8],[13,2]],"#ccc5a3",3);break;
      case "mud":
        ellipse(c,0,7,20,8,"#756954",color);
        polygon(c,[[-11,8],[-13,-2],[-7,-16],[6,-18],[15,-7],[10,9]],"#9f9276","#d1c49b");
        line(c,[[-6,-9],[6,-9],[2,-1],[7,5]],"#5d6e61",3);ellipse(c,-12,3,5,2,"#b3ceb0");ellipse(c,13,9,4,2,"#aecbb3");break;
    }
    if(level===3){ellipse(c,0,13,22,7,"#00000000",color);for(const side of [-1,1])crystal(c,side*23,7+Math.sin(time*2+side)*2,3,7,color);}
    c.restore();
  }

  function enemy(c,element,x,y,size,time=0,elite=false,boss=false,health=1) {
    const color=COLORS[element];c.save();c.translate(x,y);c.scale(size/18,size/18);c.lineJoin="round";c.lineCap="round";
    const step=Math.sin(time*8+x*.025)*2;
    ellipse(c,0,13,17,6,"#061b2277");
    if(boss){c.save();c.translate(0,0);c.rotate(time*.3);polygon(c,[[0,-31],[27,-16],[27,16],[0,31],[-27,16],[-27,-16]],null,health<.5?"#ff847b":color,.8);c.restore();}
    const plate=element==="metal"?"#a5aba8":element==="wood"?"#52755d":element==="water"?"#387c99":element==="fire"?"#6e4546":"#9a8f78";
    polygon(c,[[-12,5],[-4,6],[-4,15+step],[-15,15+step]],plate);
    polygon(c,[[4,6],[12,5],[15,15-step],[4,15-step]],plate);
    polygon(c,[[-11,-14],[-17,-7],[-15,8],[-7,14],[8,14],[16,7],[16,-8],[9,-15]],plate);
    polygon(c,[[-11,-14],[0,-18],[9,-15],[0,-8],[-12,-5]],color);
    polygon(c,[[-16,-6],[-24,-5],[-22,7],[-15,5]],plate);polygon(c,[[16,-6],[24,-5],[22,7],[15,5]],plate);
    if(element==="metal"){
      polygon(c,[[-11,-13],[-12,-24],[-4,-18],[0,-26],[4,-18],[12,-24],[11,-13]],color);
      sword(c,22,5,.5,"#edf0d6",.3);
    }else if(element==="wood"){
      line(c,[[-7,-15],[-12,-25],[-19,-27]],"#bead7d",2);line(c,[[8,-14],[12,-24],[19,-25]],"#bead7d",2);
      leaf(c,-14,-20,-.6,color);leaf(c,14,-21,.8,"#a9dd92");
    }else if(element==="fire"){
      flame(c,0,-17,.62,time);line(c,[[-9,1],[-3,5],[-6,10]],"#ffbc75",1.5);line(c,[[9,0],[4,6],[8,9]],color,1.5);
    }else if(element==="water"){
      crystal(c,0,-18+Math.sin(time*3),7,12,color);c.beginPath();c.ellipse(0,8,20,5,Math.sin(time)*.2,0,Math.PI);c.strokeStyle="#9be9ee";c.stroke();
    }else{
      polygon(c,[[-16,-11],[-21,-23],[-9,-18],[-6,-10]],color);polygon(c,[[16,-11],[20,-22],[10,-19],[6,-10]],color);
      line(c,[[0,-1],[-3,4],[2,7],[0,11]],"#f6d494",1.5);
    }
    polygon(c,[[-9,-9],[9,-9],[7,-3],[-7,-3]],"#172c32");
    line(c,[[-6,-6],[-3,-6]],"#fff4d6",1.7);line(c,[[3,-6],[6,-6]],"#fff4d6",1.7);
    crystal(c,0,4,3,5,color);
    if(elite){line(c,[[-17,-9],[-20,-15],[-10,-12]],"#fff0b5",2);line(c,[[17,-9],[20,-15],[10,-12]],"#fff0b5",2);}
    if(boss){polygon(c,[[-12,-23],[-13,-34],[-6,-29],[0,-38],[6,-29],[13,-34],[12,-23]],"#d3b878",ink);crystal(c,0,-27,3,5,color);}
    c.restore();
  }

  let terrain, terrainMap;
  function ground(c,w,h,map) {
    // The environment is static; only regenerate its bitmap after a viewport resize.
    if(!terrain||terrainMap!==map.id||terrain.width!==Math.ceil(w*2)||terrain.height!==Math.ceil(h*2)) {
      terrainMap=map.id;
      terrain=document.createElement("canvas");terrain.width=Math.ceil(w*2);terrain.height=Math.ceil(h*2);
      const g=terrain.getContext("2d");g.scale(2,2);
      const palette=map.theme==="river"?["#285965","#477d7b","#284955"]:map.theme==="ruins"?["#505f58","#717c68","#3c5450"]:["#245451","#3c6556","#243f42"];
      const wash=g.createLinearGradient(0,0,w,h);wash.addColorStop(0,palette[0]);wash.addColorStop(.5,palette[1]);wash.addColorStop(1,palette[2]);g.fillStyle=wash;g.fillRect(0,0,w,h);
      let seed=19;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      function nearRoad(x,y){return map.routes.some(route=>route.slice(1).some((p,i)=>{const a=route[i],dx=(p[0]-a[0])*w,dy=(p[1]-a[1])*h;const t=Math.max(0,Math.min(1,((x-a[0]*w)*dx+(y-a[1]*h)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]*w-t*dx,y-a[1]*h-t*dy)<w*.046+8;}));}
      for(let i=0;i<850;i++) {const x=random()*w,y=random()*h;g.fillStyle=i%2?"#d2dec009":"#071f2111";g.fillRect(x,y,random()*20+2,1);}
      for(let i=0;i<145;i++) {
        const x=random()*w,y=random()*h;
        if(nearRoad(x,y)||map.slots.some(p=>Math.hypot(x-p[0]*w,y-p[1]*h)<35))continue;
        const size=3+random()*9;
        if(i%4===0){g.save();g.translate(x,y);polygon(g,[[-size,2],[-size*.4,-size*.7],[size*.6,-size*.9],[size,0],[size*.3,size*.5]],"#779284","#304f4b");line(g,[[-size*.4,-size*.7],[0,0],[size*.3,size*.5]],"#abc1a3",.7);g.restore();}
        else{line(g,[[x-4,y],[x-7,y-6],[x-2,y-3],[x,y-10],[x+2,y-2],[x+6,y-5]],i%3?"#83ac7977":"#aac29166",1);}
      }
      if(map.feature==="array") {
        const cx=w*.5,cy=h*.5,rx=w*.13,ry=h*.115;
        const pool=g.createRadialGradient(cx-rx*.25,cy-ry*.3,2,cx,cy,Math.max(rx,ry));
        pool.addColorStop(0,"#9fd8cfaa");pool.addColorStop(.55,"#4b8e8eaa");pool.addColorStop(1,"#173f4a00");
        g.fillStyle=pool;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.fill();
        g.strokeStyle="#b5ded088";g.lineWidth=2;g.beginPath();g.ellipse(cx,cy,rx*.72,ry*.72,0,0,Math.PI*2);g.stroke();
        g.strokeStyle="#e1ca8177";g.lineWidth=1;g.beginPath();g.ellipse(cx,cy,rx*.43,ry*.43,0,0,Math.PI*2);g.stroke();
        for(let i=0;i<5;i++){
          const angle=-Math.PI/2+i*Math.PI*2/5,x=cx+Math.cos(angle)*rx*.92,y=cy+Math.sin(angle)*ry*.92;
          g.fillStyle=["#e3d5ad","#75c97d","#6ac4e0","#ef7656","#d5a964"][i];g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();
        }
      }
      const segments=new Set();
      for(const route of map.routes)for(let i=0;i<route.length-1;i++) {
        const a=route[i],b=route[i+1],key=JSON.stringify([a,b]);if(segments.has(key))continue;segments.add(key);
        line(g,[[a[0]*w,a[1]*h+3],[b[0]*w,b[1]*h+3]],"#173c38",Math.max(31,w*.065));
        line(g,[[a[0]*w,a[1]*h],[b[0]*w,b[1]*h]],"#768b79",Math.max(27,w*.058));
        line(g,[[a[0]*w,a[1]*h],[b[0]*w,b[1]*h]],"#a0a88a",Math.max(24,w*.051));
        const len=Math.hypot((b[0]-a[0])*w,(b[1]-a[1])*h),n=Math.ceil(len/19),horizontal=a[1]===b[1];
        for(let j=1;j<n;j++){const x=(a[0]+(b[0]-a[0])*j/n)*w,y=(a[1]+(b[1]-a[1])*j/n)*h,r=Math.max(11,w*.024);line(g,horizontal?[[x,y-r],[x-2,y],[x+1,y+r]]:[[x-r,y],[x,y+1],[x+r,y-1]],"#677e6c",1);}
      }
      g.strokeStyle="#c8d4b333";g.lineWidth=1;g.strokeRect(9,9,w-18,h-18);
    }
    c.drawImage(terrain,0,0,w,h);
  }
  function slot(c,x,y,r,color,active,time) {
    c.save();c.translate(x,y);ellipse(c,0,4,r+3,r*.55,"#172e32aa");ellipse(c,0,0,r,r*.55,"#5d7c70",active?color:"#a6baa0");
    c.strokeStyle=active?color:"#b1c4ad77";c.lineWidth=1;c.beginPath();c.ellipse(0,0,r-4,(r-4)*.55,0,0,Math.PI*2);c.stroke();
    line(c,[[-4,0],[4,0]],active?color:"#d5dec2",1);line(c,[[0,-4],[0,4]],active?color:"#d5dec2",1);
    if(active){c.globalAlpha=.55+.2*Math.sin(time*3);for(const s of [-1,1])line(c,[[s*(r+5),-3],[s*(r+5),-9],[s*(r-1),-12]],color,1.4);}c.restore();
  }
  function gate(c,x,y,size,time) {
    c.save();c.translate(x,y);c.scale(size/30,size/30);
    ellipse(c,0,18,29,10,"#132e3977");polygon(c,[[-25,15],[0,5],[25,15],[0,26]],"#8ba597","#c9d0aa");
    for(const side of [-1,1]){polygon(c,[[side*13,14],[side*21,14],[side*21,-22],[side*13,-22]],"#746e64","#d4c297");}
    polygon(c,[[-28,-23],[0,-34],[28,-23],[19,-19],[-19,-19]],"#334e59","#ccd2b0");
    crystal(c,0,-3+Math.sin(time*2)*2,9,18,"#95efda");c.restore();
  }
  const portraits=new Map();
  function portrait(kind) {
    if(basicKinds.includes(kind))return `assets/towers/${kind}-2.png`;
    if(!portraits.has(kind)){const c=document.createElement("canvas");c.width=160;c.height=176;const basic=["metal","wood","water","fire","earth"].includes(kind);tower(c.getContext("2d"),kind,80,basic?124:104,basic?52:59,0,2);portraits.set(kind,c.toDataURL());}
    return portraits.get(kind);
  }
  function decorate(node,kind,className="element-art") {
    const image=document.createElement("img");image.src=portrait(kind);image.className=className;image.alt="";image.draggable=false;node.prepend(image);
  }
  window.ElementArt={tower,towerAuraBack,towerAuraFront,fireAuraBack,fireAuraFront,enemy,ground,slot,gate,portrait,decorate,colors:COLORS,ready};
})();
