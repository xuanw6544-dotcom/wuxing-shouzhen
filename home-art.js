(() => {
  "use strict";
  const canvas=document.getElementById("home-canvas"),c=canvas.getContext("2d");
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  let width=1,height=1,pointer=0;
  const poly=(points,color)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
  const line=(points,color,size=2)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=size;c.stroke();};
  function mountain(x,y,w,h,color){
    poly([[x-w*.6,y],[x-w*.48,y-h*.31],[x-w*.3,y-h*.38],[x-w*.22,y-h*.83],[x-w*.06,y-h],[x+w*.15,y-h*.9],[x+w*.2,y-h*.59],[x+w*.43,y-h*.39],[x+w*.55,y]],color);
    poly([[x-w*.06,y-h],[x+w*.15,y-h*.9],[x+w*.2,y-h*.59],[x+w*.43,y-h*.39],[x+w*.55,y],[x+w*.08,y],[x+w*.02,y-h*.52]],"#e2e9d62e");
    line([[x-w*.14,y-h*.78],[x-w*.19,y-h*.44],[x-w*.3,y-h*.23]],"#dae7d140",2);
  }
  function cloud(y,time,color){
    const shift=Math.sin(time*.12)*18;
    c.beginPath();c.moveTo(-40,500);c.lineTo(-40,y);
    for(let x=-40;x<=1050;x+=110)c.bezierCurveTo(x+25+shift,y-15,x+70+shift,y+22,x+110,y+Math.sin(x)*12);
    c.lineTo(1050,500);c.closePath();c.fillStyle=color;c.fill();
  }
  function tree(x,y,scale){
    c.save();c.translate(x,y);c.scale(scale,scale);
    line([[0,0],[-5,-32],[8,-58],[4,-77]],"#354c46",5);
    line([[-3,-30],[-22,-51]],"#354c46",3);
    for(const [a,b,w] of [[-24,-54,27],[9,-71,31],[22,-49,25]]){
      poly([[a-w,b+5],[a-w*.6,b-5],[a-3,b-13],[a+w*.6,b-8],[a+w,b+5]],"#2f6154");
      line([[a-w*.6,b-5],[a-3,b-13],[a+w*.6,b-8]],"#90ad82",2);
    }c.restore();
  }
  function draw(now){
    requestAnimationFrame(draw);
    if(!canvas.isConnected||document.getElementById("home-screen")?.hidden||document.hidden)return;
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    if(rect.width!==width||rect.height!==height){width=rect.width;height=rect.height;canvas.width=width*dpr;canvas.height=height*dpr;}
    c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle="#a9d2cd";c.fillRect(0,0,width,height);
    // A centered, fixed-format world keeps the altar framed on narrow screens.
    const scale=Math.max(width/1000,height/500),offset=(width-1000*scale)/2;
    c.translate(offset,height-500*scale);c.scale(scale,scale);
    const time=reduced.matches?0:now/1000;
    c.save();c.translate(pointer*3,0);
    mountain(65,370,280,340,"#80afa8");mountain(310,365,160,190,"#94bdb1");
    mountain(890,370,280,320,"#83aea7");mountain(715,370,140,230,"#93b9ac");
    cloud(293,time,"#d4e2d5");
    mountain(45,445,215,210,"#467f75");mountain(940,440,220,250,"#487b70");
    tree(52,276,1);tree(908,236,.85);cloud(386,time+9,"#e9eddf");
    c.restore();
    poly([[330,340],[651,340],[709,415],[668,467],[389,474],[296,412]],"#3e6962");
    poly([[296,369],[357,328],[647,328],[709,369],[652,423],[357,423]],"#91a994");
    poly([[315,369],[366,340],[635,340],[691,369],[644,410],[366,410]],"#c5cbb0");
    line([[321,372],[367,401],[641,401],[684,373]],"#e9dfb7",3);
    // Gate columns, dougong brackets and two swept roof tiers.
    for(const x of [408,593]){
      poly([[x-11,337],[x+13,337],[x+16,347],[x-15,347]],"#637c6d");
      c.fillStyle="#88483f";c.fillRect(x-8,220,16,117);c.fillStyle="#c67b58";c.fillRect(x-8,220,4,117);
      c.fillStyle="#e1c88d";c.fillRect(x-10,237,20,5);c.fillRect(x-10,321,20,5);
      poly([[x-18,229],[x+18,229],[x+23,217],[x-23,217]],"#bb8057");
    }
    c.fillStyle="#a26049";c.fillRect(400,218,209,14);
    poly([[365,204],[398,199],[428,181],[574,181],[607,199],[641,204],[621,221],[383,221]],"#355b54");
    line([[365,204],[398,209],[603,209],[641,204]],"#dcc68f",4);
    poly([[394,174],[430,169],[453,154],[550,154],[574,170],[610,174],[589,192],[414,192]],"#426e61");
    line([[394,174],[429,180],[575,180],[610,174]],"#edce87",3);
    for(let x=424;x<590;x+=14)line([[x,183],[x-5,201]],"#71967b",1);
    for(let x=445;x<571;x+=14)line([[x,159],[x-5,176]],"#8da58a",1);
    c.fillStyle="#294f4b";c.fillRect(476,218,51,29);c.strokeStyle="#d6bb76";c.strokeRect(476,218,51,29);
    c.fillStyle="#f4d998";c.textAlign="center";c.font='18px "KaiTi",serif';c.fillText("五行",502,240);
    for(let i=0;i<7;i++){
      const y=420+i*12,w=86+i*14;
      poly([[500-w/2,y],[500+w/2,y],[508+w/2,y+12],[492-w/2,y+12]],i%2?"#b2bca4":"#cdd0b5");
      line([[492-w/2,y+12],[508+w/2,y+12]],"#8b9c89",2);
    }
    c.save();c.translate(502,369);c.scale(1,.38);c.beginPath();c.arc(0,0,102,0,Math.PI*2);c.fillStyle="#547d70";c.fill();c.strokeStyle="#e4cd8c";c.lineWidth=3;c.stroke();
    c.beginPath();c.arc(0,0,77,0,Math.PI*2);c.strokeStyle="#99b19b";c.lineWidth=2;c.stroke();c.restore();
    const positions=[[444,358],[472,334],[530,334],[560,358],[502,390]];
    ["metal","wood","water","fire","earth"].forEach((kind,i)=>{
      const [x,y]=positions[i];window.ElementArt.tower(c,kind,x,y-Math.sin(time+i)*1.5,24,time,3,false);
    });
    tree(339,367,.82);tree(665,367,.85);
    line([[303,389],[303,367],[347,389],[347,408]],"#5d7a68",5);
    line([[657,408],[657,389],[700,367],[700,389]],"#5d7a68",5);
  }
  canvas.addEventListener("pointermove",e=>{if(!reduced.matches)pointer=(e.offsetX/Math.max(width,1)-.5)*2;});
  canvas.addEventListener("pointerleave",()=>{pointer=0;});
  requestAnimationFrame(draw);
})();

