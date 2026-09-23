const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets', 'towers');
const sources = [
  'D:/Users/ASUS/Pictures/Screenshots/微信图片_20260923131613_103_9.jpg',
  'D:/Users/ASUS/Pictures/Screenshots/微信图片_20260923131641_104_9.jpg'
];
const crops = {
  metal: [[265,54,150,156],[470,30,174,182],[689,8,228,205]],
  wood: [[267,306,150,140],[477,263,163,185],[675,252,235,198]],
  water: [[260,544,159,135],[470,490,177,188],[675,488,236,191]],
  fire: [[550,902,145,162],[742,865,158,201],[933,827,177,240]],
  earth: [[266,775,151,144],[472,749,175,170],[677,721,237,198]]
};
// Only remove background connected to the crop boundary, preserving dark interior masonry.
async function extract(kind, level, bounds) {
  const [left,top,width,height] = bounds;
  const {data,info} = await sharp(sources[kind==='fire'?1:0]).extract({left,top,width,height}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const samples = [];
  for(let y=0;y<height;y++)for(const x of [0,1,width-2,width-1]){
    const i=(y*width+x)*3;samples.push([data[i],data[i+1],data[i+2]]);
  }
  const bg=[0,1,2].map(ch=>samples.map(p=>p[ch]).sort((a,b)=>a-b)[Math.floor(samples.length/2)]);
  const distance=i=>Math.max(...bg.map((v,ch)=>Math.abs(data[i*3+ch]-v)));
  const background=i=>{const r=data[i*3],g=data[i*3+1],b=data[i*3+2];return r<45&&g<95&&b<100&&g-r>8&&b-r>8&&Math.abs(g-b)<16;};
  const outside=new Uint8Array(width*height), queue=[];
  const visit=i=>{if(!outside[i]&&(distance(i)<32||background(i))){outside[i]=1;queue.push(i);}};
  for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}
  for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
  for(let n=0;n<queue.length;n++){
    const i=queue[n],x=i%width,y=Math.floor(i/width);
    if(x)visit(i-1);if(x<width-1)visit(i+1);if(y)visit(i-width);if(y<height-1)visit(i+width);
  }
  const rgba=Buffer.alloc(width*height*4);
  for(let i=0;i<outside.length;i++){
    const d=distance(i),alpha=outside[i]?(background(i)?0:Math.max(0,Math.min(1,(d-9)/23))):1;
    for(let ch=0;ch<3;ch++)rgba[i*4+ch]=alpha?Math.max(0,Math.min(255,(data[i*3+ch]-bg[ch]*(1-alpha))/alpha)):0;
    rgba[i*4+3]=Math.round(alpha*255);
  }
  await sharp(rgba,{raw:{width,height,channels:4}}).png().toFile(path.join(output,`${kind}-${level}.png`));
  return {kind,level,width:info.width,height:info.height};
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  for(const [kind,levels] of Object.entries(crops))for(let i=0;i<levels.length;i++)console.log(await extract(kind,i+1,levels[i]));
})().catch(e=>{console.error(e);process.exitCode=1;});
