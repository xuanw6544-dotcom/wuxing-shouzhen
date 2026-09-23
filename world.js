/* Map geometry and wave composition are shared by previews and live battles. */
(() => {
  "use strict";
  const elements = ["metal", "wood", "water", "fire", "earth"];
  const maps = {
    qinglan: {
      id: "qinglan", name: "青岚古阵", category: "折返山道", summary: "单路折返 · 均衡布阵", theme: "jade",
      description: "山道数次折返，十二处阵位可灵活布置。", entryNames: ["西侧山门"],
      routes: [[[-.03,.24],[.18,.24],[.18,.65],[.39,.65],[.39,.36],[.61,.36],[.61,.73],[.81,.73],[.81,.24],[1.04,.24]]],
      slots: [[.09,.47],[.28,.47],[.29,.82],[.5,.58],[.5,.18],[.71,.5],[.71,.86],[.91,.49], [.1,.82],[.35,.13],[.57,.84],[.9,.78]]
    },
    shuangxi: {
      id: "shuangxi", name: "双溪峡谷", category: "双路汇流", summary: "双口进攻 · 末端合流", theme: "river",
      description: "上下两路穿过峡谷，在东侧汇合；十二处阵位可分配火力。", entryNames: ["上游栈桥", "下游渡口"],
      routes: [
        [[-.03,.25],[.19,.25],[.19,.48],[.42,.48],[.42,.31],[.64,.31],[.64,.5],[.82,.5],[.82,.27],[1.04,.27]],
        [[-.03,.76],[.3,.76],[.3,.59],[.52,.59],[.52,.78],[.64,.78],[.64,.5],[.82,.5],[.82,.27],[1.04,.27]]
      ],
      slots: [[.09,.42],[.29,.32],[.09,.61],[.4,.83],[.53,.43],[.72,.65],[.73,.28],[.91,.44], [.24,.13],[.47,.18],[.53,.9],[.88,.8]]
    },
    huihuan: {
      id: "huihuan", name: "回环遗迹", category: "回环内阵", summary: "环绕路线 · 中央火力", theme: "ruins",
      description: "来敌绕行残垣，十二处阵位覆盖多段路径。", entryNames: ["西侧残垣"],
      routes: [[[-.03,.24],[.28,.24],[.28,.72],[.7,.72],[.7,.32],[.48,.32],[.48,.51],[.86,.51],[.86,.24],[1.04,.24]]],
      slots: [[.13,.4],[.15,.65],[.39,.42],[.59,.61],[.6,.19],[.4,.85],[.8,.77],[.94,.41], [.08,.86],[.3,.16],[.73,.12],[.91,.8]]
    }
  };
  function wavePlan(map, waveNo) {
    const index=waveNo-1, stage=index%10+1, chapter=Math.floor(index/10)+1;
    const boss=stage===10;
    const element=boss?elements[(chapter-1)%5]:elements[index%5];
    const secondary=elements[(elements.indexOf(element)+1)%5];
    const count=Math.min(26,6+index*2);
    const pattern=stage<=3?"渐进":stage<=5?"分批":stage===6?"密集":stage<=8?"交错":"合围";
    const hp=70*(1+.14*index+.008*index*index);
    const speed=.03*Math.min(1.8,1+.04*index);
    const enemies=Array.from({length:count},(_,i)=>{
      const elite=i===count-1;
      const mixed=!elite&&i>2&&(stage>=7?i%2===0:i%4===0);
      const route=i%map.routes.length;
      let delay=pattern==="密集"?.43:.78;
      if(pattern==="分批"&&i===Math.floor(count/2))delay=2.6;
      return {element:mixed?secondary:element,route,delay,elite,boss:elite&&boss,
        hp:hp*(elite?(boss?18:3):1),speed:speed*(i%3===1?1.12:1)*(elite&&boss?.68:1)};
    });
    return {element,secondary,boss,count,hp,speed,stage,chapter,pattern:boss?"王者降临":pattern,enemies,
      entryNames:map.entryNames, attributes:[...new Set(enemies.map(e=>e.element))]};
  }
  function pointAt(map, route, progress, width, height) {
    const points=map.routes[route]||map.routes[0];
    const lengths=points.slice(1).map((p,i)=>Math.hypot((p[0]-points[i][0])*width,(p[1]-points[i][1])*height));
    let distance=Math.max(0,progress)*lengths.reduce((a,b)=>a+b,0);
    for(let i=0;i<lengths.length;i++){
      if(distance<=lengths[i]){const t=distance/lengths[i];return {x:(points[i][0]+(points[i+1][0]-points[i][0])*t)*width,y:(points[i][1]+(points[i+1][1]-points[i][1])*t)*height};}
      distance-=lengths[i];
    }
    return {x:points.at(-1)[0]*width,y:points.at(-1)[1]*height};
  }
  function random(seed) {
    let value=2166136261;
    for(const ch of String(seed))value=Math.imul(value^ch.charCodeAt(0),16777619);
    return ()=>{value=(Math.imul(1664525,value)+1013904223)>>>0;return value/4294967296;};
  }
  const api={maps,wavePlan,pointAt,random};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else window.GameWorld=api;
})();
