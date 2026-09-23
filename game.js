(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const art = window.ElementArt;
  const audio = window.ElementAudio;
  const world = window.GameWorld;

  const ELEMENTS = {
    metal: { name: "金", color: "#ded7c4", strong: "wood", effect: "穿透", child: "water" },
    wood: { name: "木", color: "#69bd70", strong: "earth", effect: "缠绕", child: "fire" },
    water: { name: "水", color: "#59b8dd", strong: "fire", effect: "减速", child: "wood" },
    fire: { name: "火", color: "#ed6750", strong: "metal", effect: "范围", child: "earth" },
    earth: { name: "土", color: "#d0a253", strong: "water", effect: "重击", child: "metal" }
  };

  const FUSIONS = {
    "wood-fire": { name: "雷霆塔", glyph: "雷", color: "#b56cff", effect: "紫雷柱弹射并灼烧", kind: "thunder" },
    "wood-earth": { name: "腐沼塔", glyph: "沼", color: "#879746", effect: "腐沼减速、中毒、缠绕", kind: "bog" },
    "metal-wood": { name: "锋木塔", glyph: "锋", color: "#b9d67e", effect: "尖刺穿透并禁疗", kind: "spike" },
    "wood-water": { name: "雾林塔", glyph: "雾", color: "#77c7a0", effect: "毒雾持续侵蚀", kind: "mist" },
    "fire-earth": { name: "熔岩塔", glyph: "熔", color: "#ff7b38", effect: "熔岩灼烧并易伤", kind: "lava" },
    "metal-fire": { name: "熔刃塔", glyph: "刃", color: "#ffad67", effect: "升温连斩与斩杀", kind: "blade" },
    "water-fire": { name: "蒸汽塔", glyph: "汽", color: "#d4e6df", effect: "蒸汽爆破并击退", kind: "steam" },
    "metal-earth": { name: "重岩塔", glyph: "岩", color: "#cfb87a", effect: "矿岩范围震晕", kind: "rock" },
    "water-earth": { name: "泥沼塔", glyph: "泥", color: "#9a8457", effect: "泥浆减速并禁锢", kind: "mud" },
    "metal-water": { name: "寒冰塔", glyph: "冰", color: "#b9edff", effect: "冻结后碎冰扩散", kind: "ice" }
  };

  const ORDER = ["metal", "wood", "water", "fire", "earth"];
  const BASE_COST = 50;
  let MAP = world.maps.qinglan;
  const menu = { mapId: "qinglan", element: "metal", mode: "endless" };
  let lootRandom = Math.random, combatRandom = Math.random;
  const recordKey = "wuxing.records.v1";
  let records = {};
  try { const saved=JSON.parse(localStorage.getItem(recordKey)||"{}");if(saved&&typeof saved==="object"&&!Array.isArray(saved))records=saved; } catch { /* Records are optional when storage is unavailable. */ }

  const state = {
    scene: "menu", mapId: "qinglan", runMode: "endless", runSeed: "", combatTime: 0, commanderKilled: false,
    gold: 160, life: 10, wave: 0, waveActive: false, paused: false, result: false,
    initialElement: null, buildElement: null, pendingCore: null, pendingBuildSlot: null, previewBuild: null, droppedElement: null, lootOptions: [],
    selectedTower: null, towers: [], enemies: [], projectiles: [], effects: [], zones: [], inventory: [],
    spawnQueue: [], spawnTimer: 0, time: 0, kills: 0, coreId: 0, nextWaveReadyAt: 12, waveDrawerOpen: false, waveAutoOpenedFor: 0, dpr: 1, width: 1, height: 1
  };

  const ui = {
    gold: document.getElementById("gold-value"), life: document.getElementById("life-value"),
    waveLabel: document.getElementById("wave-label"), threat: document.getElementById("threat-value"),
    waveButton: document.getElementById("wave-button"), pause: document.getElementById("pause-button"),
    toast: document.getElementById("toast"), hint: document.getElementById("hint-text"),
    selection: document.getElementById("selection-panel"), selectedName: document.getElementById("selected-name"),
    selectedDetail: document.getElementById("selected-detail"), sell: document.getElementById("sell-button"),
    selectedAvatar: document.getElementById("selected-avatar"), selectedAttack: document.getElementById("selected-attack"),
    selectedSpeed: document.getElementById("selected-speed"), selectedDps: document.getElementById("selected-dps"), selectedHealth: document.getElementById("selected-health"),
    skill: document.getElementById("skill-button"),
    repair: document.getElementById("repair-button"),
    upgrade: document.getElementById("upgrade-button"), result: document.getElementById("result-panel"),
    resultKicker: document.getElementById("result-kicker"), resultTitle: document.getElementById("result-title"),
    resultCopy: document.getElementById("result-copy"), restart: document.getElementById("restart-button"),
    origin: document.getElementById("origin-panel"), originChoices: [...document.querySelectorAll("#origin-choices button")],
    loot: document.getElementById("loot-panel"), lootTitle: document.getElementById("loot-title"),
    lootOptions: document.getElementById("loot-options"), lootCopy: document.getElementById("loot-copy"),
    stashLoot: document.getElementById("stash-loot"), useLoot: document.getElementById("use-loot"),
    inventory: document.getElementById("element-inventory"), tray: document.querySelector(".tower-tray"),
    skillTooltip: document.getElementById("skill-tooltip"),
    cards: [...document.querySelectorAll(".tower-card")]
  };
  Object.assign(ui, {
    home: document.getElementById("home-screen"), homeButton: document.getElementById("home-button"),
    enter: document.getElementById("enter-button"), resume: document.getElementById("resume-button"),
    openMenu: document.getElementById("open-menu-button"), landingStep: document.getElementById("landing-step"),
    mapStep: document.getElementById("map-step"), originStep: document.getElementById("origin-step"),
    mapBack: document.getElementById("map-back-button"), mapNext: document.getElementById("map-next-button"),
    originBack: document.getElementById("origin-back-button"),
    mapChoices: document.getElementById("map-choices"), mapRecord: document.getElementById("map-record"),
    originName: document.getElementById("home-origin-name"), trialLabel: document.getElementById("home-trial-label"),
    forecast: document.getElementById("wave-forecast"), battlefield: document.querySelector(".battlefield"),
    commands: document.querySelector(".command-panel"), mapName: document.getElementById("field-map-name"),
    modeName: document.getElementById("field-mode-name"), resultHome: document.getElementById("result-home-button"),
    waveMini: document.getElementById("wave-mini-card"), waveMiniNumber: document.getElementById("wave-mini-number"),
    waveCountdown: document.getElementById("wave-countdown"), waveMiniElement: document.getElementById("wave-mini-element"),
    waveDrawer: document.getElementById("wave-drawer"), waveDrawerTitle: document.getElementById("wave-drawer-title"),
    waveClose: document.getElementById("wave-close-button")
  });
  function setWaveDrawer(open) {
    state.waveDrawerOpen=!!open;
    ui.waveDrawer.hidden=!state.waveDrawerOpen;
    ui.waveMini.setAttribute("aria-expanded",String(state.waveDrawerOpen));
    ui.commands.classList.toggle("wave-open",state.waveDrawerOpen);
  }
  function formatDuration(seconds) { const n=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(n/60)}分${n%60}秒`; }
  function saveRecord() {
    if(!state.initialElement)return;
    const key=`${state.mapId}:${state.runMode}`, previous=records[key];
    const record={cleared:state.wave,reached:state.wave+(state.result||state.waveActive?1:0),element:state.initialElement,
      kills:state.kills,seconds:state.combatTime,seed:state.runSeed,
      formation:state.towers.map(t=>({name:towerForm(t).name,level:t.level,slot:t.slot}))};
    if(!previous||record.cleared>previous.cleared||(record.cleared===previous.cleared&&record.kills>=previous.kills)){
      records[key]=record;try{localStorage.setItem(recordKey,JSON.stringify(records));}catch{ /* Keep the session record in memory. */ }
    }
  }
  function renderMenu() {
    const map=world.maps[menu.mapId];
    ui.mapChoices.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.map===menu.mapId)));
    ui.originChoices.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.element===menu.element)));
    document.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===menu.mode)));
    ui.originName.textContent=`${ELEMENTS[menu.element].name} · ${ELEMENTS[menu.element].effect}`;
    ui.trialLabel.textContent=`${map.name} · ${menu.mode==="trial"?"定序试炼 · 壹":"无尽守境"}`;
    const record=records[`${menu.mapId}:${menu.mode}`];
    ui.mapRecord.replaceChildren();
    const summary=document.createElement("p");summary.textContent=map.description;ui.mapRecord.appendChild(summary);
    const best=document.createElement("p");
    best.textContent=record?`最佳守成 ${Number(record.cleared)||0} 波 · 本命${ELEMENTS[record.element]?.name||"—"} · 击退 ${Number(record.kills)||0} · ${formatDuration(record.seconds)}`:"此境尚无战绩";
    ui.mapRecord.appendChild(best);
    if(record&&Array.isArray(record.formation)&&record.formation.length){const formation=document.createElement("small");formation.textContent=`留阵：${record.formation.map(t=>`${String(t.name)}${Number(t.level)||1}阶`).join("、")}`;ui.mapRecord.appendChild(formation);}
    ui.resume.hidden=!state.initialElement||state.result;
  }
  function showMenuStep(step="landing") {
    ui.landingStep.hidden=step!=="landing";
    ui.mapStep.hidden=step!=="map";
    ui.originStep.hidden=step!=="origin";
    document.body.dataset.menuStep=step;
    renderMenu();
  }
  function showHome() {
    saveRecord();state.scene="menu";state.paused=true;hideSkillTooltip();
    ui.home.hidden=false;ui.battlefield.hidden=true;ui.commands.hidden=true;ui.homeButton.hidden=true;
    document.body.classList.add("at-home");document.body.classList.remove("in-battle");audio.setPaused(false);showMenuStep("landing");ui.waveLabel.textContent="山海有灵 · 五行成阵";
  }
  function showBattle() {
    state.scene="battle";state.paused=false;ui.home.hidden=true;ui.battlefield.hidden=false;ui.commands.hidden=false;ui.homeButton.hidden=false;
    document.body.classList.remove("at-home");document.body.classList.add("in-battle");ui.mapName.textContent=MAP.name;ui.modeName.textContent=state.runMode==="trial"?"定序试炼·壹":"无尽守境";
    ui.pause.textContent="Ⅱ";ui.pause.setAttribute("aria-label","暂停");audio.setPaused(false);hideSkillTooltip();resize();updateUI();
  }
  function buildMenu() {
    for(const map of Object.values(world.maps)){
      const button=document.createElement("button");button.type="button";button.dataset.map=map.id;button.setAttribute("aria-pressed",String(map.id===menu.mapId));
      const preview=document.createElement("canvas");preview.width=900;preview.height=510;preview.setAttribute("aria-hidden","true");
      const c=preview.getContext("2d");art.ground(c,900,510,map);
      map.slots.forEach(p=>art.slot(c,p[0]*900,p[1]*510,15,"#e2d396",true,0));button.appendChild(preview);
      const name=document.createElement("strong");name.textContent=map.name;button.appendChild(name);
      const detail=document.createElement("span");detail.textContent=map.summary;button.appendChild(detail);
      button.addEventListener("click",()=>{menu.mapId=map.id;renderMenu();});ui.mapChoices.appendChild(button);
    }
    renderMenu();
  }

  const ELEMENT_SKILLS = {
    metal: "金克木。发射锋锐金刃穿透敌人，并暂时压制木系精英的恢复能力。三级后提高穿透伤害。",
    wood: "木克土。藤蔓命中后缠绕敌人，使其短暂停步。三级后延长控制时间。",
    water: "水克火。水球降低敌人移动速度，并能缩短附近防御塔受到的灼烧。三级后水花分裂减速。",
    fire: "火克金。火球命中产生范围爆燃。三级后爆炸范围扩大。",
    earth: "土克水。重击有概率震住敌人。三级后提高震荡概率。"
  };

  function showSkillTooltip(title, description, clientX, clientY) {
    ui.skillTooltip.innerHTML = `<strong>${title}</strong>${description}`;
    ui.skillTooltip.classList.add("show");
    const viewportWidth = window.innerWidth || 1000;
    const viewportHeight = window.innerHeight || 800;
    const width = ui.skillTooltip.offsetWidth || 220;
    const height = ui.skillTooltip.offsetHeight || 70;
    ui.skillTooltip.style.left = `${Math.max(8, Math.min(clientX + 14, viewportWidth - width - 8))}px`;
    ui.skillTooltip.style.top = `${Math.max(8, Math.min(clientY + 14, viewportHeight - height - 8))}px`;
  }

  function hideSkillTooltip() {
    ui.skillTooltip.classList.remove("show");
  }

  function bindSkillTooltip(node, content) {
    const reveal = event => {
      if (event.pointerType === "touch") return;
      const skill = typeof content === "function" ? content() : content;
      if (skill) showSkillTooltip(skill.title, skill.description, event.clientX, event.clientY);
    };
    node.addEventListener("pointerenter", reveal);
    node.addEventListener("pointermove", reveal);
    node.addEventListener("pointerleave", hideSkillTooltip);
  }

  function resize() {
    if(ui.battlefield.hidden)return;
    const rect = canvas.getBoundingClientRect();
    if(rect.width<2||rect.height<2){requestAnimationFrame(resize);return;}
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * state.dpr);
    canvas.height = Math.round(rect.height * state.dpr);
    state.width = rect.width; state.height = rect.height;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function pointAt(progress, route = 0) {
    return world.pointAt(MAP,route,progress,state.width,state.height);
  }

  function fusionKey(first, second) {
    return [first, second].sort((a,b) => ORDER.indexOf(a)-ORDER.indexOf(b)).join("-");
  }

  function towerMaxHp(tower) {
    return [100,135,175][tower.level-1] + (tower.secondary ? 20 : 0);
  }

  function chooseOrigin(element) {
    if(state.scene==="menu"){menu.element=element;renderMenu();audio.cue("select");return;}
    state.initialElement = element;
    state.buildElement = null;
    ui.tray.classList.add("single");
    ui.cards.forEach(card => {
      const active = card.dataset.element === element;
      card.classList.toggle("locked", !active);
      card.classList.remove("selected");
    });
    ui.hint.textContent = `点击空阵位，再选择${ELEMENTS[element].name}塔`;
    showToast(`${ELEMENTS[element].name}行本命已定`);
    audio.cue("select");
    updateUI();
  }

  function chooseDropElement() {
    const owned = new Set([state.initialElement, ...state.inventory.map(core => core.element)]);
    if(state.runMode==="trial"){owned.clear();owned.add(state.initialElement);state.lootHistory.forEach(e=>owned.add(e));}
    else state.towers.forEach(tower => { owned.add(tower.element); if (tower.secondary) owned.add(tower.secondary); });
    const missing = ORDER.filter(element => !owned.has(element));
    if (state.wave <= 3 && missing.length) return missing[Math.floor(lootRandom()*missing.length)];
    const candidates = ORDER.filter(element => element !== state.initialElement || lootRandom() < .25);
    return candidates[Math.floor(lootRandom()*candidates.length)];
  }

  function showLoot(isBoss = false) {
    audio.cue("fusion");
    const pool=[...ORDER];for(let i=pool.length-1;i>0;i--){const j=Math.floor(lootRandom()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    state.lootOptions = isBoss ? pool.slice(0,3) : [chooseDropElement()];
    state.droppedElement = state.lootOptions[0];
    state.lootHistory.push(...state.lootOptions);
    ui.lootTitle.textContent = isBoss ? "Boss元素三选一" : `获得${ELEMENTS[state.droppedElement].name}元素`;
    ui.lootOptions.innerHTML = "";
    state.lootOptions.forEach(elementName => {
      const element = ELEMENTS[elementName];
      const button = document.createElement("button");
      button.type = "button"; button.textContent = element.name; button.className = `loot-core ${elementName}`;
      button.style.color = element.color; button.classList.toggle("selected", elementName === state.droppedElement);
      art.decorate(button, elementName, "core-art");
      button.addEventListener("click", () => {
        state.droppedElement = elementName;
        [...ui.lootOptions.children].forEach(item => item.classList.toggle("selected", item === button));
      });
      bindSkillTooltip(button, { title: `${element.name}元素核心`, description: ELEMENT_SKILLS[elementName] });
      ui.lootOptions.appendChild(button);
    });
    ui.lootCopy.textContent = isBoss ? "选择一个核心，再收入元素仓库或立即布阵" : "可与已有元素融合，也可放入空阵位";
    ui.stashLoot.disabled = state.inventory.length >= 6;
    ui.loot.classList.remove("hidden");
  }

  function selectCore(core) {
    state.pendingCore = core;
    state.buildElement = null;
    state.selectedTower = null;
    state.previewBuild = state.pendingBuildSlot===null ? null : {slot:state.pendingBuildSlot,element:core.element,core};
    ui.cards.forEach(card => card.classList.remove("selected"));
    ui.hint.textContent = state.previewBuild ? `预览${ELEMENTS[core.element].name}塔：再次点击阵位确认` : `已选${ELEMENTS[core.element].name}核心：点击空阵位预览，或点击已有塔融合`;
    renderInventory();
    updateUI();
  }

  function consumeCore(core) {
    if (core.source === "inventory") state.inventory = state.inventory.filter(item => item.id !== core.id);
    state.pendingCore = null;
    renderInventory();
  }

  function resumeOriginBuild(message = "继续使用本命元素布阵") {
    state.pendingCore = null;
    state.pendingBuildSlot = null;
    state.previewBuild = null;
    state.buildElement = null;
    ui.cards.forEach(card => card.classList.remove("selected"));
    ui.hint.textContent = message;
    renderInventory();
    updateUI();
  }

  function renderInventory() {
    ui.inventory.innerHTML = "";
    state.inventory.forEach(core => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = ELEMENTS[core.element].name;
      art.decorate(button, core.element, "inventory-art");
      button.style.color = ELEMENTS[core.element].color;
      button.classList.toggle("selected", state.pendingCore?.id === core.id);
      button.setAttribute("aria-label", `使用${ELEMENTS[core.element].name}元素`);
      bindSkillTooltip(button, { title: `${ELEMENTS[core.element].name}元素`, description: ELEMENT_SKILLS[core.element] });
      button.addEventListener("click", () => {
        if (state.pendingCore?.id === core.id) resumeOriginBuild("已取消元素核心，继续布置本命塔");
        else selectCore({ ...core, source: "inventory" });
      });
      ui.inventory.appendChild(button);
    });
    for (let i=state.inventory.length;i<6;i++) {
      const empty = document.createElement("i"); empty.textContent = "空"; ui.inventory.appendChild(empty);
    }
  }

  function nextWaveInfo() {
    return world.wavePlan(MAP,state.wave+1);
  }

  function startWave() {
    if (state.scene!=="battle" || state.waveActive || state.result || state.pendingCore || !state.initialElement || !ui.loot.classList.contains("hidden")) return;
    const info = nextWaveInfo();
    state.waveActive = true;
    state.commanderKilled=false;
    audio.cue("wave");
    state.spawnQueue = info.enemies;
    state.spawnTimer = 0;
    setWaveDrawer(false);
    ui.waveButton.disabled = true;
    showToast(info.boss ? `第 ${state.wave + 1} 波：${ELEMENTS[info.element].name}行 Boss 降临` : `第 ${state.wave + 1} 波：${ELEMENTS[info.element].name}行来袭`);
    updateUI();
  }

  function spawnEnemy(spec) {
    state.enemies.push({
      ...spec, maxHp: spec.hp, progress: 0, slowUntil: 0, rootUntil: 0, frozenUntil: 0,
      healBlockedUntil: 0, poisonUntil: 0, poisonStacks: 0, shield: 0, dashed: false,
      vulnerableUntil: 0, burningUntil: 0, burningDps: 0, bogTime: 0, mudTime: 0, zoneTickAt: 0,
      casting: false, nextSkillAt: state.time + (spec.boss ? 3.5 : 4.5), x: 0, y: 0, dead: false
    });
  }

  function buildTower(slot, element) {
    if (state.gold < BASE_COST) return showToast("灵气不足");
    if (state.towers.some(t => t.slot === slot)) return;
    state.gold -= BASE_COST;
    state.towers.push({ slot, element, secondary: null, level: 1, hp: 100, maxHp: 100, cooldown: 0, burnUntil: 0, invested: BASE_COST, shotCount: 0 });
    state.buildElement = null;
    state.pendingBuildSlot = null;
    state.previewBuild = null;
    ui.cards.forEach(card => card.classList.remove("selected"));
    showToast(`${ELEMENTS[element].name}塔落阵`);
    audio.cue("select");
    updateSynergy(); updateUI();
  }

  function useCoreAtSlot(slot) {
    const core = state.pendingCore;
    if (!core) return false;
    const tower = state.towers.find(item => item.slot === slot);
    if (!tower) {
      state.towers.push({ slot, element: core.element, secondary: null, level: 1, hp: 100, maxHp: 100, cooldown: 0, burnUntil: 0, invested: 0, shotCount: 0 });
      showToast(`${ELEMENTS[core.element].name}核心落阵成塔`);
    } else if (tower.secondary) {
      showToast("复合塔暂时不能再次融合");
      return false;
    } else if (tower.element === core.element) {
      if (tower.level >= 3) { showToast("纯元素已淬炼至三级"); return false; }
      tower.level++; const previousMax=tower.maxHp;tower.maxHp=towerMaxHp(tower);tower.hp+=tower.maxHp-previousMax;
      showToast(`${ELEMENTS[core.element].name}元素共鸣，升至${["壹","贰","叁"][tower.level-1]}阶`);
    } else {
      tower.secondary = core.element;
      tower.maxHp=towerMaxHp(tower);tower.hp=Math.min(tower.maxHp,tower.hp+tower.maxHp*.2);
      const form = towerForm(tower);
      showToast(`${ELEMENTS[tower.element].name}+${ELEMENTS[core.element].name}，融合为${form.name}`);
    }
    consumeCore(core);
    audio.cue("fusion");
    updateSynergy();
    resumeOriginBuild("元素已安置，可继续布置本命塔");
    return true;
  }

  function updateSynergy() {
    for (const tower of state.towers) {
      const [sx, sy] = MAP.slots[tower.slot];
      tower.buffed = state.towers.some(other => {
        if (other === tower || ELEMENTS[other.element].child !== tower.element) return false;
        const [ox, oy] = MAP.slots[other.slot];
        return Math.hypot((sx-ox)*state.width, (sy-oy)*state.height) < state.width * .28;
      });
    }
  }

  function selectTower(tower) {
    state.selectedTower = tower;
    state.buildElement = null;
    state.pendingBuildSlot = null;
    state.previewBuild = null;
    ui.cards.forEach(card => card.classList.remove("selected"));
    updateUI();
  }

  function towerForm(tower) {
    if (tower.secondary) return FUSIONS[fusionKey(tower.element, tower.secondary)];
    const element = ELEMENTS[tower.element];
    const pureEffects = {
      metal: "金刃穿透", wood: "藤蔓缠绕", water: "水球迟缓", fire: "火球爆燃", earth: "重击震荡"
    };
    return { name: `${element.name}塔`, glyph: element.name, color: element.color,
      effect: tower.level === 3 ? `纯化·${pureEffects[tower.element]}` : element.effect, kind: tower.element };
  }

  function damageEnemy(enemy, amount, poisonPierce = false) {
    if (enemy.dead) return;
    let damage = amount * (enemy.vulnerableUntil > state.time ? 1.2 : 1);
    if (enemy.shield > 0) {
      const blocked = Math.min(enemy.shield, poisonPierce ? damage * .5 : damage);
      enemy.shield -= blocked;
      damage -= poisonPierce ? blocked * .5 : blocked;
    }
    enemy.hp -= Math.max(0, damage);
  }

  function damageTower(tower, amount, source = "精英") {
    if (!tower || tower.hp <= 0) return;
    tower.hp = Math.max(0, tower.hp - amount);
    if (tower.hp === 0) {
      tower.brokenUntil = state.time + 8;
      tower.burnUntil = 0;
      showToast(`${towerForm(tower).name}被${source}击毁，8秒后应急恢复`);
    }
  }

  function addPoison(enemy, stacks = 1) {
    enemy.poisonStacks = Math.min(3, enemy.poisonStacks + stacks);
    enemy.poisonUntil = state.time + 4;
  }

  function addZone(kind, x, y, tower) {
    const existing = state.zones.find(zone => zone.kind === kind && Math.hypot(zone.x-x,zone.y-y) < 24);
    if (existing) { existing.life = Math.max(existing.life, 2.8); return; }
    state.zones.push({ kind, x, y, radius: kind === "mist" ? 52 : 44, life: 2.8, owner: tower });
  }

  function fireThunder(tower, primary, damage, startX, startY) {
    const targets = [primary];
    while (targets.length < 3) {
      const last = targets.at(-1);
      const next = state.enemies
        .filter(enemy => !enemy.dead && !targets.includes(enemy) && Math.hypot(enemy.x-last.x, enemy.y-last.y) < 95)
        .sort((a,b) => Math.hypot(a.x-last.x,a.y-last.y)-Math.hypot(b.x-last.x,b.y-last.y))[0];
      if (!next) break;
      targets.push(next);
    }
    const points = [{ x: startX, y: startY }];
    targets.forEach((enemy, index) => {
      damageEnemy(enemy, damage * Math.pow(.72, index));
      enemy.burningUntil = Math.max(enemy.burningUntil || 0, state.time + 2.5);
      enemy.burningDps = Math.max(enemy.burningDps || 0, damage * .16);
      if (combatRandom() < .2) enemy.rootUntil = Math.max(enemy.rootUntil, state.time + .45);
      points.push({ x: enemy.x, y: enemy.y });
    });
    state.effects.push({
      kind: "lightning", points, columns: targets.map(enemy => ({ x: enemy.x, y: enemy.y })),
      color: FUSIONS["wood-fire"].color, life: .18, max: .18
    });
  }

  function shoot(tower, enemy) {
    tower.lastShotAt = state.time;
    const [nx, ny] = MAP.slots[tower.slot];
    const form = towerForm(tower);
    const elements = [tower.element, tower.secondary].filter(Boolean);
    const base = (13 + tower.level * 8) * (tower.secondary ? 1.12 : 1);
    const counter = elements.some(element => ELEMENTS[element].strong === enemy.element);
    const weak = elements.every(element => ELEMENTS[enemy.element].strong === element);
    const damage = base * (counter ? (tower.secondary ? 1.65 : 2) : weak ? .55 : 1) * (tower.buffed ? 1.2 : 1);
    tower.shotCount = (tower.shotCount || 0) + 1;
    const thirdHitKinds = new Set(["bog","mist","lava","steam","mud"]);
    const chanceKinds = new Set(["thunder","spike","blade","rock","ice"]);
    const specialChance = .75 + (tower.level-1)*.07;
    const special = thirdHitKinds.has(form.kind) ? tower.shotCount%3===0 : chanceKinds.has(form.kind) ? combatRandom()<specialChance : true;
    audio.attack(form.kind, special);
    if (form.kind === "thunder" && special) {
      fireThunder(tower, enemy, damage, nx * state.width, ny * state.height);
    } else {
      state.projectiles.push({
        x: nx * state.width, y: ny * state.height, target: enemy, element: tower.element,
        form: form.kind, color: form.color, tower, special, damage, life: 1, trail: []
      });
    }
    tower.cooldown = [1.05,.84,.66][tower.level-1] / (tower.buffed ? 1.15 : 1);
  }

  function hitEnemy(projectile) {
    const enemy = projectile.target;
    if (enemy.dead) return;
    const kind = projectile.form;
    const tower = projectile.tower;
    damageEnemy(enemy, projectile.damage, kind === "bog" || kind === "mist");
    if (kind === "metal" || (kind === "spike" && projectile.special)) {
      enemy.healBlockedUntil = state.time + 2.5;
      const next = state.enemies.filter(e => !e.dead && e !== enemy && e.progress < enemy.progress).sort((a,b) => b.progress-a.progress)[0];
      if (next && Math.hypot(next.x-enemy.x,next.y-enemy.y) < 100) damageEnemy(next, projectile.damage * (kind === "spike" ? .55 : .25));
    } else if (kind === "wood") {
      enemy.rootUntil = state.time + (tower.level === 3 ? .65 : .35);
    } else if (kind === "water") {
      enemy.slowUntil = state.time + (tower.level === 3 ? 2.2 : 1.4);
      if (tower.level === 3) state.enemies.forEach(other => { if(other!==enemy&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<35) other.slowUntil=state.time+1.2; });
    } else if (kind === "fire") {
      const radius = tower.level === 3 ? 58 : 44;
      state.enemies.forEach(other => { if (!other.dead && other !== enemy && Math.hypot(other.x-enemy.x, other.y-enemy.y) < radius) damageEnemy(other, projectile.damage * .35); });
      state.effects.push({ kind: "blast", x: enemy.x, y: enemy.y, color: "#ff9b45", life: .36, max: .36 });
    } else if (kind === "earth") {
      if (combatRandom() < (tower.level === 3 ? .32 : .18)) enemy.rootUntil = state.time + .55;
    } else if ((kind === "bog" || kind === "mist" || kind === "lava" || kind === "mud") && projectile.special) {
      addZone(kind, enemy.x, enemy.y, tower);
    } else if (kind === "blade" && projectile.special) {
      enemy.bladeHeat = Math.min(3, (enemy.bladeHeat || 0) + 1);
      damageEnemy(enemy, projectile.damage * enemy.bladeHeat * .18);
      if (enemy.hp < enemy.maxHp * .15) damageEnemy(enemy, enemy.maxHp * .18);
    } else if (kind === "steam" && projectile.special) {
      state.enemies.forEach(other => { if(!other.dead&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<52){damageEnemy(other,projectile.damage*.45);other.progress=Math.max(0,other.progress-.012);} });
      state.effects.push({ kind: "steam", x: enemy.x, y: enemy.y, color: projectile.color, life: .45, max: .45 });
    } else if (kind === "rock" && projectile.special) {
      state.enemies.forEach(other => { if(!other.dead&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<46){damageEnemy(other,projectile.damage*.35);other.rootUntil=Math.max(other.rootUntil,state.time+.45);} });
      const [tx,ty]=MAP.slots[tower.slot];state.towers.forEach(other=>{const [ox,oy]=MAP.slots[other.slot];if(Math.hypot((ox-tx)*state.width,(oy-ty)*state.height)<state.width*.24)other.hasteUntil=state.time+2;});
    } else if (kind === "ice" && projectile.special) {
      if (state.time < enemy.frozenUntil) {
        state.enemies.forEach(other => { if(!other.dead&&other!==enemy&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<48)damageEnemy(other,projectile.damage*.6); });
        enemy.frozenUntil = 0;
        state.effects.push({ kind: "freeze", x: enemy.x, y: enemy.y, color: projectile.color, life: .55, max: .55 });
      } else {
        enemy.chill = (enemy.chill || 0) + (enemy.element === "fire" ? 2 : 1);
        enemy.slowUntil = state.time + 1.8;
        if (enemy.chill >= 3) { enemy.chill=0; enemy.frozenUntil=state.time+1.2; }
      }
    }
    if (enemy.elite && enemy.element === "metal" && enemy.shield > 0) damageTower(tower, enemy.boss ? 5 : 2, "金系反震");
    state.effects.push({ kind: "impact", x: enemy.x, y: enemy.y, color: projectile.color, life: .28, max: .28 });
  }

  function useEliteSkill(enemy) {
    const livingTowers = state.towers.filter(tower => tower.hp > 0);
    const pickTower = () => [...livingTowers].sort((a,b) => (b.secondary?2:0)+b.level-(a.secondary?2:0)-a.level)[0];
    const bossPower = enemy.boss ? 1.8 : 1;
    if (enemy.element === "fire") {
      const candidates = livingTowers.filter(tower => tower.burnUntil <= state.time);
      const tower = candidates[Math.floor(combatRandom() * candidates.length)];
      if (tower) {
        tower.burnUntil = state.time + (enemy.boss ? 7 : 5); tower.burnDps = enemy.boss ? 9 : 5;
        damageTower(tower, enemy.boss ? 12 : 5, enemy.boss ? "陨火" : "火精英");
        const [x,y] = MAP.slots[tower.slot];
        state.effects.push({ kind: "burn", x: x*state.width, y: y*state.height, color: "#ff6b3b", life: enemy.boss?7:5, max: enemy.boss?7:5 });
        showToast(enemy.boss ? "火 Boss 降下陨火" : "火精英灼烧了防御塔");
      }
    } else if (enemy.element === "metal") {
      enemy.shield += enemy.maxHp * (enemy.boss ? .26 : .18);
      const tower=pickTower();if(tower)damageTower(tower,enemy.boss?20:7,enemy.boss?"裂阵斩":"金系反震");
      showToast(enemy.boss ? "金 Boss 发动裂阵斩" : "金精英凝聚反震护甲");
    } else if (enemy.element === "wood") {
      const tower=pickTower();
      if(tower){tower.vineUntil=state.time+(enemy.boss?5:3);tower.vineDps=enemy.boss?8:4;enemy.leechTower=tower;}
      if (enemy.healBlockedUntil <= state.time) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * (enemy.boss?.16:.1));
      showToast(enemy.boss?"木 Boss 缠绕并汲取元素塔":"木精英缠绕元素塔");
    } else if (enemy.element === "water") {
      enemy.progress += enemy.boss ? .085 : .05;
      let targets=livingTowers.filter(tower=>{const [x,y]=MAP.slots[tower.slot];return Math.hypot(x*state.width-enemy.x,y*state.height-enemy.y)<state.width*.3;});
      if(!targets.length&&pickTower())targets=[pickTower()];
      targets.forEach(tower=>{tower.disabledUntil=state.time+(enemy.boss?2.5:1.5);damageTower(tower,enemy.boss?14:5,"激流");});
      showToast(enemy.boss?"水 Boss 发动潮汐冲阵":"水精英发动激流突进");
    } else if (enemy.element === "earth") {
      if(enemy.poisonStacks===0)enemy.shield += enemy.maxHp * (enemy.boss?.28:.18);
      state.enemies.forEach(other=>{if(!other.dead&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<100)other.shield+=other.maxHp*.08;});
      livingTowers.forEach(tower=>{const [x,y]=MAP.slots[tower.slot];if(enemy.boss||Math.hypot(x*state.width-enemy.x,y*state.height-enemy.y)<state.width*.3)damageTower(tower,(enemy.boss?10:4)*bossPower,"地震");});
      showToast(enemy.boss?"土 Boss 引发全阵地震":"土精英震击附近阵位");
    }
    state.effects.push({ kind: "skill", x: enemy.x, y: enemy.y, color: ELEMENTS[enemy.element].color, life: .6, max: .6 });
  }

  function updateElite(enemy) {
    if (!enemy.elite) return;
    if (!enemy.casting && state.time >= enemy.nextSkillAt - 1) enemy.casting = true;
    if (enemy.casting && state.time >= enemy.nextSkillAt) {
      enemy.casting = false;
      useEliteSkill(enemy);
      const phaseTwo = enemy.boss && enemy.hp <= enemy.maxHp*.5;
      enemy.nextSkillAt = state.time + (enemy.boss ? (phaseTwo?4:6) : 7);
    }
  }

  function defeatEnemy(enemy) {
    enemy.dead = true;
    state.kills++;
    if(enemy.elite)state.commanderKilled=true;
    state.gold += enemy.boss ? 180 : enemy.elite ? 45 : 12;
    if (enemy.poisonStacks > 0) {
      state.enemies.forEach(other => {
        if (!other.dead && other !== enemy && Math.hypot(other.x-enemy.x,other.y-enemy.y) < 66) addPoison(other, 1);
      });
      state.effects.push({ kind: "poison", x: enemy.x, y: enemy.y, color: FUSIONS["wood-water"].color, life: .45, max: .45 });
    }
  }

  function update(dt) {
    if (state.scene!=="battle" || state.paused || state.result) return;
    state.time += dt;
    if(state.waveActive)state.combatTime+=dt;
    if (state.waveActive && state.spawnQueue.length) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) { spawnEnemy(state.spawnQueue.shift()); state.spawnTimer = state.spawnQueue[0]?.delay || .78; }
    }

    state.zones.forEach(zone => zone.life -= dt);
    state.zones = state.zones.filter(zone => zone.life > 0);

    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      updateElite(enemy);
      if (state.time < enemy.burningUntil) damageEnemy(enemy, enemy.burningDps * dt);
      let inBog = false, inMud = false;
      state.zones.forEach(zone => {
        if (Math.hypot(enemy.x-zone.x,enemy.y-zone.y) > zone.radius) return;
        if (zone.kind === "bog") {
          inBog = true; enemy.slowUntil = state.time + .12;
          if (enemy.zoneTickAt <= state.time) { addPoison(enemy); enemy.zoneTickAt = state.time + .85; }
        } else if (zone.kind === "mist") {
          if (enemy.zoneTickAt <= state.time) { addPoison(enemy); enemy.zoneTickAt = state.time + .7; }
        } else if (zone.kind === "lava") {
          damageEnemy(enemy, 10 * dt); enemy.vulnerableUntil = state.time + .25;
        } else if (zone.kind === "mud") {
          inMud = true; enemy.slowUntil = state.time + .15;
        }
      });
      enemy.bogTime = inBog ? enemy.bogTime + dt : 0;
      enemy.mudTime = inMud ? enemy.mudTime + dt : 0;
      if (enemy.bogTime > 1.4 || enemy.mudTime > 1.2) {
        enemy.rootUntil = Math.max(enemy.rootUntil, state.time + .65); enemy.bogTime=0; enemy.mudTime=0;
      }
      if (enemy.poisonStacks > 0) {
        if (state.time < enemy.poisonUntil) damageEnemy(enemy, enemy.poisonStacks * 5 * dt, true);
        else enemy.poisonStacks = 0;
      }
      if (enemy.elite && enemy.element === "wood" && enemy.healBlockedUntil <= state.time) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * .015 * dt);
      }
      const immobilized = state.time < enemy.rootUntil || state.time < enemy.frozenUntil;
      const speedFactor = immobilized ? 0 : state.time < enemy.slowUntil ? .55 : 1;
      enemy.progress += enemy.speed * speedFactor * dt;
      const point = pointAt(enemy.progress,enemy.route); enemy.x = point.x; enemy.y = point.y;
      if (enemy.hp <= 0) {
        defeatEnemy(enemy);
      } else if (enemy.progress >= 1) {
        enemy.dead = true; state.life -= enemy.boss ? 5 : enemy.elite ? 2 : 1;
        showToast(enemy.boss ? "Boss 突破，大阵受损 5 点" : enemy.elite ? "精英突破，大阵受损 2 点" : "敌人突破，大阵受损");
        if (state.life <= 0) { finish();return; }
      }
    }

    for (const tower of state.towers) {
      if(tower.hp<=0){if(state.time>=tower.brokenUntil){tower.hp=tower.maxHp*.3;showToast(`${towerForm(tower).name}应急恢复`);}else continue;}
      if(tower.burnUntil>state.time)damageTower(tower,(tower.burnDps||5)*dt,"灼烧");
      if(tower.vineUntil>state.time){const drain=(tower.vineDps||4)*dt;damageTower(tower,drain,"藤蔓汲取");const leech=state.enemies.find(enemy=>!enemy.dead&&enemy.leechTower===tower);if(leech&&leech.healBlockedUntil<=state.time)leech.hp=Math.min(leech.maxHp,leech.hp+drain*1.5);}
      if(tower.hp<=0)continue;
      const attackSpeed=(tower.hasteUntil > state.time ? 1.3 : 1)*(tower.burnUntil>state.time?.5:1);
      tower.cooldown -= dt * attackSpeed;
      const towerElements = [tower.element,tower.secondary];
      if (towerElements.includes("water")) {
        const [wx,wy] = MAP.slots[tower.slot];
        state.towers.forEach(other => {
          if (other.burnUntil <= state.time || Math.hypot((MAP.slots[other.slot][0]-wx)*state.width,(MAP.slots[other.slot][1]-wy)*state.height) >= state.width*.25) return;
          if (towerForm(tower).kind === "ice") {
            other.burnUntil = 0;
            state.effects.push({ kind: "freeze", x: MAP.slots[other.slot][0]*state.width, y: MAP.slots[other.slot][1]*state.height, color: FUSIONS["metal-water"].color, life: .5, max: .5 });
          } else other.burnUntil -= dt * .8;
        });
      }
      if (tower.cooldown > 0 || tower.disabledUntil > state.time || tower.vineUntil > state.time) continue;
      const [sx, sy] = MAP.slots[tower.slot];
      const range = state.width * (.18 + tower.level * .008);
      const target = state.enemies.filter(e => !e.dead && Math.hypot(e.x-sx*state.width,e.y-sy*state.height) < range)
        .sort((a,b) => b.progress-a.progress)[0];
      if (target) shoot(tower, target);
    }

    for (const p of state.projectiles) {
      if (p.target.dead) { p.life = 0; continue; }
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 7) p.trail.shift();
      const dx = p.target.x-p.x, dy = p.target.y-p.y, dist = Math.hypot(dx,dy);
      const move = 430 * dt;
      if (dist <= move) { p.x = p.target.x; p.y = p.target.y; p.life = 0; hitEnemy(p); }
      else { p.x += dx/dist*move; p.y += dy/dist*move; }
    }
    state.projectiles = state.projectiles.filter(p => p.life > 0);
    state.enemies = state.enemies.filter(e => !e.dead);
    state.effects.forEach(e => e.life -= dt); state.effects = state.effects.filter(e => e.life > 0);

    if (state.waveActive && !state.spawnQueue.length && !state.enemies.length) {
      state.waveActive = false; state.wave++;
      state.gold += 32 + state.wave * 4;
      state.nextWaveReadyAt = state.time + 12;
      state.waveAutoOpenedFor = 0;
      const bossCleared=state.wave%10===0;
      saveRecord();
      if(state.commanderKilled){showToast(bossCleared?`第 ${state.wave} 波 Boss 已击败，获得三选一核心`:`第 ${state.wave} 波守住，精英掉落元素核心`);showLoot(bossCleared);}
      else showToast("首领突围，未获得元素核心");
    }
    updateUI();
  }

  function draw() {
    const w = state.width, h = state.height;
    if(w<2||h<2)return;
    ctx.clearRect(0,0,w,h);
    art.ground(ctx,w,h,MAP); drawZones(); drawGate(w,h); drawSlots(w,h); drawBuildPreview(w,h); drawTowers(w,h); drawEnemies(); drawProjectiles(); drawEffects();
    if (state.paused) {
      ctx.fillStyle = "rgba(8,12,9,.68)"; ctx.fillRect(0,0,w,h); ctx.fillStyle = "#f2ead5";
      ctx.textAlign = "center"; ctx.font = "700 24px Microsoft YaHei"; ctx.fillText("阵势暂缓",w/2,h/2);
    }
  }

  function drawZones() {
    const colors = { bog:"#73853c", mist:"#65ae88", lava:"#f05a2f", mud:"#846d49" };
    state.zones.forEach(zone => {
      const pulse = 1 + Math.sin(state.time*4+zone.x)*.05;
      ctx.globalAlpha = Math.min(.46, zone.life*.24);
      ctx.fillStyle = colors[zone.kind];
      ctx.beginPath();ctx.ellipse(zone.x,zone.y,zone.radius*pulse,zone.radius*.55*pulse,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle = colors[zone.kind];ctx.lineWidth=2;ctx.setLineDash([5,6]);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=1;
    });
  }

  function drawGate(w,h) {
    art.gate(ctx,w*.961,h*MAP.routes[0].at(-1)[1],Math.max(18,w*.032),state.time);
    MAP.routes.forEach((route,i)=>{ctx.fillStyle="#e7cc99";ctx.font="600 10px Microsoft YaHei";ctx.textAlign="left";ctx.fillText(`${i+1}号入口`,12,route[0][1]*h-26);});
  }

  function drawSlots(w,h) {
    MAP.slots.forEach((p,index)=>{
      if (state.towers.some(t=>t.slot===index)) return;
      const x=p[0]*w,y=p[1]*h,r=Math.max(14,w*.025);
      const selected=state.pendingBuildSlot===index;
      const activeElement=selected?(state.previewBuild?.element||state.pendingCore?.element||state.initialElement):null;
      art.slot(ctx,x,y,r,activeElement?ELEMENTS[activeElement].color:"#a4b89f",selected,state.time);
      if(selected){ctx.beginPath();ctx.arc(x,y,r+8,0,Math.PI*2);ctx.strokeStyle=activeElement?ELEMENTS[activeElement].color:"#f3d998";ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);}
    });
  }

  function drawBuildPreview(w,h) {
    const preview=state.previewBuild;
    if(!preview||state.towers.some(t=>t.slot===preview.slot))return;
    const [px,py]=MAP.slots[preview.slot],x=px*w,y=py*h,form=towerForm({element:preview.element,secondary:null,level:1});
    ctx.save();ctx.globalAlpha=.62;
    ctx.beginPath();ctx.arc(x,y,w*.18,0,Math.PI*2);ctx.fillStyle="rgba(226,211,153,.08)";ctx.fill();ctx.strokeStyle=form.color;ctx.lineWidth=1.5;ctx.stroke();
    art.tower(ctx,form.kind,x,y,Math.max(19,w*.035),state.time,1,false);
    ctx.globalAlpha=1;ctx.fillStyle="#173638e8";ctx.fillRect(x-45,y+31,90,19);ctx.fillStyle="#f4e6b7";ctx.font="600 10px Microsoft YaHei";ctx.textAlign="center";ctx.fillText("再次点击确认",x,y+44);ctx.restore();
  }

  function drawTowers(w,h) {
    state.towers.forEach(t=>{
      const [px,py]=MAP.slots[t.slot],x=px*w,y=py*h,r=Math.max(17,w*.027),form=towerForm(t);
      if (state.selectedTower===t) { ctx.beginPath();ctx.arc(x,y,w*(.18+t.level*.008),0,Math.PI*2);ctx.fillStyle="rgba(237,221,170,.035)";ctx.fill();ctx.strokeStyle="rgba(237,221,170,.25)";ctx.stroke(); }
      if (t.buffed) { ctx.beginPath();ctx.arc(x,y,r+7,0,Math.PI*2);ctx.strokeStyle="#e9cf73";ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]); }
      const kick=t.lastShotAt===undefined?0:Math.max(0,1-(state.time-t.lastShotAt)/.18)*2;
      art.tower(ctx,form.kind,x,y-kick,Math.max(19,w*.035),state.time,t.level,t.hp<=0);
      ctx.textAlign="center";ctx.font="600 10px Microsoft YaHei";ctx.fillStyle="#112d32dd";ctx.fillRect(x-21,y+r+4,42,14);ctx.fillStyle="#edf5d9";ctx.fillText(`${form.glyph} · ${t.level}`,x,y+r+14);
      ctx.fillStyle="#1b3438";ctx.fillRect(x-17,y+r+20,34,4);ctx.fillStyle=t.hp<=0?"#87978f":"#91d7ad";ctx.fillRect(x-17,y+r+20,34*Math.max(0,t.hp/t.maxHp),4);
      const thirdHit=["bog","mist","lava","steam","mud"].includes(form.kind);
      if(thirdHit){for(let i=0;i<3;i++){ctx.beginPath();const edge=y+r+31>h;ctx.arc(edge?x+26:x-7+i*7,edge?y+i*6:y+r+29,2,0,Math.PI*2);ctx.fillStyle=i<(t.shotCount%3)?form.color:"#243b3b";ctx.fill();}}
      if(t.hp<=0){ctx.strokeStyle="#7d837e";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-r,y-r);ctx.lineTo(x+r,y+r);ctx.moveTo(x+r,y-r);ctx.lineTo(x-r,y+r);ctx.stroke();}
      if (t.burnUntil>state.time) {
        const flicker=Math.sin(state.time*18)*3;
        ctx.fillStyle="rgba(255,91,43,.82)";ctx.beginPath();ctx.moveTo(x-9,y-r+3);ctx.quadraticCurveTo(x-2,y-r-16-flicker,x+1,y-r+1);ctx.quadraticCurveTo(x+9,y-r-12+flicker,x+10,y-r+5);ctx.closePath();ctx.fill();
      }
    });
  }

  function drawEnemies() {
    state.enemies.forEach(enemy=>{
      const r=enemy.boss?22:enemy.elite?15:11,e=ELEMENTS[enemy.element];
      const frozen=state.time<enemy.frozenUntil||state.time<enemy.rootUntil;
      art.enemy(ctx,enemy.element,enemy.x,enemy.y,r,state.time*(frozen?0:1),enemy.elite,enemy.boss,enemy.hp/enemy.maxHp);
      const bw=enemy.boss?56:enemy.elite?38:26,barY=enemy.y-r*(enemy.boss?2.3:1.9)-6;
      ctx.fillStyle="#1a3034";ctx.fillRect(enemy.x-bw/2-1,barY-1,bw+2,5);ctx.fillStyle=enemy.boss?"#f4a093":e.color;ctx.fillRect(enemy.x-bw/2,barY,bw*Math.max(0,enemy.hp/enemy.maxHp),3);
      if(enemy.elite){ctx.font="600 9px Microsoft YaHei";ctx.textAlign="center";ctx.fillStyle="#fff0bb";ctx.fillText(enemy.boss?`${e.name}王`:`${e.name}·精英`,enemy.x,barY-5);}
      if(enemy.shield>0){ctx.beginPath();ctx.arc(enemy.x,enemy.y,r+5,0,Math.PI*2);ctx.strokeStyle="rgba(236,218,147,.75)";ctx.lineWidth=2;ctx.stroke();}
      if(enemy.poisonStacks>0){ctx.fillStyle=FUSIONS["wood-water"].color;ctx.font="700 9px Microsoft YaHei";ctx.fillText(`毒${enemy.poisonStacks}`,enemy.x,enemy.y+r+12);}
      if(state.time<enemy.frozenUntil){ctx.strokeStyle=FUSIONS["metal-water"].color;ctx.lineWidth=3;ctx.strokeRect(enemy.x-r-3,enemy.y-r-3,(r+3)*2,(r+3)*2);}
      if(enemy.casting){const remain=Math.max(0,enemy.nextSkillAt-state.time);ctx.beginPath();ctx.arc(enemy.x,enemy.y,r+10,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-remain));ctx.strokeStyle="#fff0a8";ctx.lineWidth=3;ctx.stroke();}
    });
  }

  function drawProjectiles() {
    state.projectiles.forEach(p=>{
      const color=p.color;
      p.trail.forEach((point,index)=>{ctx.globalAlpha=(index+1)/p.trail.length*.35;ctx.fillStyle=color;ctx.beginPath();ctx.arc(point.x,point.y,1+index*.35,0,Math.PI*2);ctx.fill();});
      ctx.globalAlpha=1;ctx.save();ctx.translate(p.x,p.y);
      if(p.form==="water"){
        const gradient=ctx.createRadialGradient(-2,-2,1,0,0,7);gradient.addColorStop(0,"#d5f7ff");gradient.addColorStop(1,"#368fc9");ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();
      }else if(p.form==="fire"||p.form==="lava"){
        ctx.fillStyle="#ffcf55";ctx.beginPath();ctx.arc(1,0,6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f04d2e";ctx.beginPath();ctx.moveTo(-4,-4);ctx.lineTo(-13,0);ctx.lineTo(-4,4);ctx.fill();
      }else if(p.form==="ice"){
        ctx.fillStyle=color;ctx.rotate(Math.PI/4);ctx.fillRect(-5,-5,10,10);ctx.strokeStyle="#f0fdff";ctx.strokeRect(-5,-5,10,10);
      }else if(p.form==="bog"||p.form==="mist"||p.form==="mud"){
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#5d7e22";ctx.beginPath();ctx.arc(-5,-4,2,0,Math.PI*2);ctx.arc(5,3,2,0,Math.PI*2);ctx.fill();
      }else if(p.form==="metal"||p.form==="spike"||p.form==="blade"){
        ctx.fillStyle=color;ctx.rotate(Math.atan2(p.target.y-p.y,p.target.x-p.x));ctx.fillRect(-8,-2,16,4);
      }else if(p.form==="steam"){
        ctx.fillStyle=color;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(-4,1,6,0,Math.PI*2);ctx.arc(4,-2,7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      }else if(p.form==="rock"){
        ctx.fillStyle=color;ctx.rotate(state.time*8);ctx.fillRect(-6,-6,12,12);
      }else{
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    });
  }
  function drawEffects() {
    state.effects.forEach(e=>{
      const t=1-e.life/e.max;ctx.globalAlpha=1-t;
      if(e.kind==="lightning"){
        ctx.strokeStyle=e.color;ctx.lineWidth=5*(1-t)+1;ctx.shadowColor=e.color;ctx.shadowBlur=12;ctx.beginPath();
        e.points.forEach((point,index)=>{if(!index)ctx.moveTo(point.x,point.y);else{const previous=e.points[index-1];ctx.lineTo((previous.x+point.x)/2+Math.sin(state.time*80+index)*8,(previous.y+point.y)/2);ctx.lineTo(point.x,point.y);}});ctx.stroke();ctx.shadowBlur=0;
        e.columns.forEach((point,index)=>{ctx.beginPath();ctx.moveTo(point.x+Math.sin(state.time*70+index)*5,Math.max(0,point.y-58));ctx.lineTo(point.x-5,point.y-28);ctx.lineTo(point.x+3,point.y);ctx.stroke();});ctx.shadowBlur=0;
      }else if(e.kind==="burn"){
        ctx.fillStyle=e.color;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(e.x-8+i*8,e.y-15-Math.sin(state.time*8+i)*7,3+i,0,Math.PI*2);ctx.fill();}
      }else if(e.kind==="freeze"){
        ctx.strokeStyle=e.color;ctx.lineWidth=2;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(a)*(12+t*18),e.y+Math.sin(a)*(12+t*18));ctx.stroke();}
      }else if(e.kind==="blast"){
        ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,5+t*28,0,Math.PI*2);ctx.fill();
      }else{
        ctx.beginPath();ctx.arc(e.x,e.y,5+t*(e.kind==="skill"?34:24),0,Math.PI*2);ctx.strokeStyle=e.color;ctx.lineWidth=e.kind==="skill"?4:2;ctx.stroke();
      }
      ctx.globalAlpha=1;
    });
  }

  function updateUI() {
    ui.gold.textContent=state.gold; ui.life.textContent=Math.max(0,state.life);
    const info=nextWaveInfo(),e=ELEMENTS[info.element];
    ui.waveLabel.textContent=`第 ${state.wave+1} 波 · ${info.boss?`${e.name}王降临`:`${e.name}势来袭`}`;
    ui.threat.innerHTML=`<i class="element-dot ${info.element}" style="background:${e.color}"></i>${e.name}${info.boss?" Boss":""}`;
    const waveNumber=state.wave+1,wait=Math.max(0,Math.ceil(state.nextWaveReadyAt-state.time));
    ui.waveMiniNumber.textContent=`Wave ${waveNumber}`;
    ui.waveDrawerTitle.textContent=`Wave ${waveNumber}`;
    ui.waveCountdown.textContent=state.waveActive?"战斗中":wait?`${wait}s`:"READY";
    ui.waveMiniElement.textContent=e.name;ui.waveMiniElement.className=`wave-element ${info.element}`;ui.waveMiniElement.setAttribute("aria-label",`${e.name}元素`);
    ui.waveMini.classList.toggle("ready",!state.waveActive&&!wait);
    if(!state.waveActive&&!wait&&!state.result&&ui.loot.classList.contains("hidden")&&state.waveAutoOpenedFor!==waveNumber){state.waveAutoOpenedFor=waveNumber;setWaveDrawer(true);}
    ui.waveButton.textContent=state.waveActive?"迎敌中…":state.pendingCore?"请先安置元素":`开始 Wave ${waveNumber}`;
    ui.waveButton.disabled=state.waveActive||state.result||!state.initialElement||!!state.pendingCore||!ui.loot.classList.contains("hidden");
    ui.cards.forEach(card=>card.disabled=state.gold<BASE_COST || state.result || !!state.pendingCore || card.dataset.element!==state.initialElement);
    ui.commands.classList.toggle("build-mode",state.pendingBuildSlot!==null);
    const previewNumber=state.wave+(state.waveActive?1:1),signature=`${MAP.id}:${previewNumber}`;
    if(ui.forecast.dataset.wave!==signature){
      ui.forecast.dataset.wave=signature;const plan=world.wavePlan(MAP,previewNumber);ui.forecast.replaceChildren();
      const details=[
        ["敌人",`${ELEMENTS[plan.element].name} × ${plan.count-1} · ${plan.boss?"Boss × 1":"精英 × 1"}`],
        ["奖励",`+${32+previewNumber*4} Gold`],
        ["入口",plan.entryNames.join(" / ")],
        ["Boss",plan.boss?`${ELEMENTS[plan.element].name}王`:"无"]
      ];
      for(const [label,value] of details){const row=document.createElement("p"),span=document.createElement("span"),strong=document.createElement("strong");span.textContent=label;strong.textContent=value;row.append(span,strong);ui.forecast.appendChild(row);}
      ui.forecast.classList.toggle("boss-wave",plan.boss);
    }
    if (state.selectedTower && state.towers.includes(state.selectedTower)) {
      const t=state.selectedTower, el=ELEMENTS[t.element], form=towerForm(t), upgradeCost=45+t.level*30;
      ui.selection.classList.remove("hidden");
      ui.commands.classList.add("tower-mode");
      ui.selectedName.textContent=`${form.name} · ${["壹","贰","叁"][t.level-1]}阶${t.buffed?" · 相生":""}`;
      const elementNames=[t.element,t.secondary].filter(Boolean).map(element=>ELEMENTS[element].name).join("+");
      const thirdHit=["bog","mist","lava","steam","mud"].includes(form.kind);
      const chance=["thunder","spike","blade","rock","ice"].includes(form.kind);
      const trigger=thirdHit?" · 每第三击触发":chance?` · ${75+(t.level-1)*7}%触发`:"";
      const attack=(13+t.level*8)*(t.secondary?1.12:1)*(t.buffed?1.2:1),interval=[1.05,.84,.66][t.level-1]/(t.buffed?1.15:1);
      ui.selectedAttack.textContent=Math.round(attack);ui.selectedSpeed.textContent=`${interval.toFixed(2)}s`;ui.selectedDps.textContent=Math.round(attack/interval);ui.selectedHealth.textContent=`${Math.ceil(t.hp)}/${t.maxHp}`;
      ui.selectedDetail.textContent=`${elementNames} · ${form.effect}${trigger}${t.burnUntil>state.time?" · 灼烧减速":""}${t.buffed?" · 威力提升":""}`;
      if(ui.selectedAvatar.dataset.kind!==form.kind){ui.selectedAvatar.replaceChildren();art.decorate(ui.selectedAvatar,form.kind,"selected-art");ui.selectedAvatar.dataset.kind=form.kind;}
      ui.sell.textContent=`出售 +${Math.floor(t.invested*.65)}`;
      ui.upgrade.textContent=t.level>=3?"已至叁阶":`升级 ${upgradeCost}`;
      ui.upgrade.disabled=t.level>=3 || state.gold<upgradeCost;
      const repairCost=20+t.level*12+(t.secondary?10:0);
      ui.repair.classList.toggle("hidden",t.hp>=t.maxHp);
      ui.repair.textContent=`修复 ${repairCost}`;
      ui.repair.disabled=state.waveActive||t.hp>=t.maxHp||state.gold<repairCost;
    } else { ui.selection.classList.add("hidden");ui.commands.classList.remove("tower-mode");state.selectedTower=null; }
  }

  let toastTimer;
  function showToast(message) { ui.toast.textContent=message;ui.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove("show"),1400); }
  function finish() {
    audio.cue("defeat");
    audio.setPaused(true);
    state.result=true;state.waveActive=false;ui.result.classList.remove("hidden");
    saveRecord();
    ui.resultKicker.textContent="无限生存结束";ui.resultTitle.textContent="大阵已破";
    ui.resultCopy.textContent=`${MAP.name} · 守成 ${state.wave} 波 · 击退 ${state.kills} · ${formatDuration(state.combatTime)}`;
  }

  function reset() {
    audio.setPaused(false);
    ui.pause.textContent="Ⅱ";ui.pause.setAttribute("aria-label","暂停");
    Object.assign(state,{gold:160,life:10,wave:0,waveActive:false,paused:false,result:false,initialElement:null,buildElement:null,pendingCore:null,pendingBuildSlot:null,previewBuild:null,droppedElement:null,lootOptions:[],selectedTower:null,towers:[],enemies:[],projectiles:[],effects:[],zones:[],inventory:[],spawnQueue:[],spawnTimer:0,time:0,kills:0,coreId:0,nextWaveReadyAt:12,waveDrawerOpen:false,waveAutoOpenedFor:0});
    MAP=world.maps[menu.mapId];state.mapId=menu.mapId;state.runMode=menu.mode;state.combatTime=0;state.lootHistory=[];state.commanderKilled=false;
    state.runSeed=menu.mode==="trial"?`${menu.mapId}:trial:1`:`${menu.mapId}:${Date.now()}:${Math.random()}`;
    lootRandom=world.random(`${state.runSeed}:loot`);combatRandom=world.random(`${state.runSeed}:combat`);
    ui.result.classList.add("hidden");ui.loot.classList.add("hidden");ui.tray.classList.remove("single");setWaveDrawer(false);
    ui.cards.forEach(c=>{c.classList.remove("selected");c.classList.remove("locked");});renderInventory();updateUI();
    showBattle();chooseOrigin(menu.element);window.scrollTo({top:0,behavior:"instant"});
  }

  ui.originChoices.forEach(button => bindSkillTooltip(button, {
    title: `${ELEMENTS[button.dataset.element].name}元素`, description: ELEMENT_SKILLS[button.dataset.element]
  }));
  ui.cards.forEach(card => bindSkillTooltip(card, {
    title: `${ELEMENTS[card.dataset.element].name}塔`, description: ELEMENT_SKILLS[card.dataset.element]
  }));
  ui.originChoices.forEach(button => art.decorate(button, button.dataset.element));
  ui.cards.forEach(card => art.decorate(card, card.dataset.element));
  canvas.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || !state.towers.length) return;
    const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    const tower=state.towers.find(item=>{
      const [tx,ty]=MAP.slots[item.slot];return Math.hypot(x-tx*state.width,y-ty*state.height)<Math.max(25,state.width*.04);
    });
    if(!tower){hideSkillTooltip();return;}
    const form=towerForm(tower);
    const elements=[tower.element,tower.secondary].filter(Boolean).map(element=>ELEMENTS[element].name).join("+");
    const thirdHit=["bog","mist","lava","steam","mud"].includes(form.kind);
    const chance=["thunder","spike","blade","rock","ice"].includes(form.kind);
    const trigger=thirdHit?"每第三次攻击触发":chance?`${75+(tower.level-1)*7}%概率触发`:"每次攻击生效";
    showSkillTooltip(`${form.name} · ${elements}`,`${form.effect}；${trigger}。当前${["一","二","三"][tower.level-1]}级，生命${Math.ceil(tower.hp)}/${tower.maxHp}。`,event.clientX,event.clientY);
  });
  canvas.addEventListener("pointerleave", hideSkillTooltip);

  canvas.addEventListener("pointerdown",event=>{
    if (state.result || state.paused) return;
    const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    let nearest=-1,distance=Infinity;
    MAP.slots.forEach((p,i)=>{const d=Math.hypot(x-p[0]*state.width,y-p[1]*state.height);if(d<distance){distance=d;nearest=i;}});
    if(distance>Math.max(28,state.width*.045)){state.selectedTower=null;state.pendingBuildSlot=null;state.previewBuild=null;state.buildElement=null;updateUI();return;}
    const tower=state.towers.find(t=>t.slot===nearest);
    if(tower){if(state.pendingCore)useCoreAtSlot(nearest);else selectTower(tower);return;}
    if(state.previewBuild?.slot===nearest){if(state.pendingCore)useCoreAtSlot(nearest);else buildTower(nearest,state.previewBuild.element);return;}
    state.selectedTower=null;state.pendingBuildSlot=nearest;
    if(state.pendingCore){state.previewBuild={slot:nearest,element:state.pendingCore.element,core:state.pendingCore};ui.hint.textContent=`预览${ELEMENTS[state.pendingCore.element].name}塔：再次点击阵位确认`;}
    else{state.previewBuild=null;state.buildElement=null;ui.cards.forEach(card=>card.classList.remove("selected"));ui.hint.textContent="阵位已选：从下方选择元素塔";}
    updateUI();
  });

  ui.cards.forEach(card=>card.addEventListener("click",()=>{
    if(card.dataset.element!==state.initialElement)return;
    if(state.pendingBuildSlot===null){showToast("请先点击一个空阵位");return;}
    state.buildElement=card.dataset.element;state.selectedTower=null;
    state.pendingCore=null;renderInventory();
    state.previewBuild={slot:state.pendingBuildSlot,element:state.buildElement,core:null};
    ui.cards.forEach(c=>c.classList.toggle("selected",c===card));
    ui.hint.textContent=`${ELEMENTS[state.buildElement].name}塔预览中，再次点击阵位确认`;updateUI();
  }));
  ui.waveMini.addEventListener("click",()=>setWaveDrawer(!state.waveDrawerOpen));
  ui.waveClose.addEventListener("click",()=>setWaveDrawer(false));
  ui.waveButton.addEventListener("click",startWave);
  ui.pause.addEventListener("click",()=>{state.paused=!state.paused;audio.setPaused(state.paused);ui.pause.textContent=state.paused?"▶":"Ⅱ";ui.pause.setAttribute("aria-label",state.paused?"继续":"暂停");});
  ui.restart.addEventListener("click",()=>{menu.mapId=state.mapId;menu.mode=state.runMode;menu.element=state.initialElement;reset();});
  ui.homeButton.addEventListener("click",showHome);
  ui.resultHome.addEventListener("click",showHome);
  ui.openMenu.addEventListener("click",()=>showMenuStep("map"));
  ui.mapBack.addEventListener("click",()=>showMenuStep("landing"));
  ui.mapNext.addEventListener("click",()=>showMenuStep("origin"));
  ui.originBack.addEventListener("click",()=>showMenuStep("map"));
  ui.resume.addEventListener("click",()=>{showBattle();window.scrollTo({top:0,behavior:"instant"});});
  ui.enter.addEventListener("click",()=>{
    if(state.initialElement&&!state.result&&!window.confirm("开始新的挑战将结束当前守阵，战绩会保留。继续入阵？"))return;
    saveRecord();reset();
  });
  document.querySelectorAll("[data-mode]").forEach(button=>button.addEventListener("click",()=>{menu.mode=button.dataset.mode;renderMenu();}));
  ui.sell.addEventListener("click",()=>{const t=state.selectedTower;if(!t)return;state.gold+=Math.floor(t.invested*.65);state.towers=state.towers.filter(x=>x!==t);state.selectedTower=null;updateSynergy();updateUI();});
  ui.upgrade.addEventListener("click",()=>{const t=state.selectedTower;if(!t||t.level>=3)return;const cost=45+t.level*30;if(state.gold<cost)return;state.gold-=cost;const previousMax=t.maxHp;t.level++;t.maxHp=towerMaxHp(t);t.hp+=t.maxHp-previousMax;t.invested+=cost;const form=towerForm(t);showToast(`${form.name}升至${["壹","贰","叁"][t.level-1]}阶，攻速与生命提升`);updateUI();});
  ui.skill.addEventListener("click",()=>{ui.selection.classList.toggle("skill-open");ui.skill.setAttribute("aria-pressed",String(ui.selection.classList.contains("skill-open")));});
  ui.repair.addEventListener("click",()=>{const t=state.selectedTower;if(!t||state.waveActive||t.hp>=t.maxHp)return;const cost=20+t.level*12+(t.secondary?10:0);if(state.gold<cost)return;state.gold-=cost;t.hp=t.maxHp;t.brokenUntil=0;showToast(`${towerForm(t).name}已修复`);updateUI();});
  ui.originChoices.forEach(button=>button.addEventListener("click",()=>chooseOrigin(button.dataset.element)));
  ui.stashLoot.addEventListener("click",()=>{
    if(state.inventory.length>=6)return showToast("元素仓库已满，请先使用一个核心");
    state.inventory.push({id:++state.coreId,element:state.droppedElement});state.droppedElement=null;ui.loot.classList.add("hidden");renderInventory();updateUI();
  });
  ui.useLoot.addEventListener("click",()=>{
    const core={id:++state.coreId,element:state.droppedElement,source:"drop"};state.droppedElement=null;ui.loot.classList.add("hidden");selectCore(core);
  });
  window.addEventListener("resize",()=>{resize();updateSynergy();});

  let last=performance.now();
  function loop(now){const dt=Math.min((now-last)/1000,.05);last=now;if(state.scene==="battle"){update(dt);draw();}requestAnimationFrame(loop);}
  buildMenu();renderInventory();showHome();requestAnimationFrame(loop);
})();

