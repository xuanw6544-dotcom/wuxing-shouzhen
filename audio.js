/* Original pentatonic score and synthesized battle sounds, with no media downloads. */
(() => {
  "use strict";
  const storageKey = "wuxing.audio.v1";
  const settings = { master: 70, music: 30, effects: 60, muted: false };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved) {
      for (const name of ["master", "music", "effects"]) {
        if (typeof saved[name] === "number" && Number.isFinite(saved[name])) settings[name] = Math.max(0, Math.min(100, saved[name]));
      }
      settings.muted = saved.muted === true;
    }
  } catch { /* Storage can be unavailable in private or local-file sessions. */ }
  let context, master, music, effects, noiseBuffer, compressor;
  let nextBeat = 0, beat = 0, paused = false, lastEffect = -1, activeVoices = 0;
  const button = document.getElementById("sound-button");
  const panel = document.getElementById("sound-panel");
  const mute = document.getElementById("sound-muted");

  function setGains() {
    if (!context) return;
    const t = context.currentTime;
    master.gain.setTargetAtTime(settings.muted ? 0 : settings.master / 100, t, .025);
    music.gain.setTargetAtTime(paused ? 0 : settings.music / 100, t, .1);
    effects.gain.setTargetAtTime(settings.effects / 100, t, .025);
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* Controls still work without persistence. */ }
    button.textContent = settings.muted ? "♩" : "♫";
    button.title = settings.muted ? "声音设置（已静音）" : "声音设置";
    button.setAttribute("aria-label", button.title);
    setGains();
  }
  function voice(frequency, endFrequency, at, duration, volume, type, destination) {
    if (activeVoices > 48) return;
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope); envelope.connect(destination);
    activeVoices++;
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); activeVoices--; };
    oscillator.start(at); oscillator.stop(at + duration + .025);
  }
  function noise(at, duration, cutoff, volume) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noiseBuffer; filter.type = "lowpass"; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(volume,at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    source.connect(filter);filter.connect(gain);gain.connect(effects);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    source.start(at);source.stop(at+duration);
  }
  const melody = [0,2,4,2,1,2,-1,0, 4,5,4,2,1,-1,2,-1, 2,4,6,5,4,2,1,0, 1,2,4,2,0,-1,0,-1];
  const scale = [293.66,329.63,392,440,493.88,587.33,659.25];
  function scheduleMusic() {
    if (!context || context.state !== "running" || paused || document.hidden) return;
    if (nextBeat < context.currentTime) nextBeat = context.currentTime + .06;
    // Schedule slightly ahead so the melody is independent of the render frame rate.
    while (nextBeat < context.currentTime + .35) {
      if (!settings.muted && settings.music > 0 && settings.master > 0) {
        const note = melody[beat % melody.length];
        if (note >= 0) {
          const f = scale[note];
          voice(f,f,nextBeat,1.35,.17,"sine",music);
          voice(f*2,f*2,nextBeat,.38,.032,"triangle",music);
          voice(f,f,nextBeat+.18,.72,.024,"sine",music);
        }
        if (beat % 8 === 0) {
          const root = [146.83,196,164.81,146.83][Math.floor(beat/8)%4];
          voice(root,root,nextBeat,3,.11,"sine",music);
          voice(root*1.5,root*1.5,nextBeat+.025,2.8,.045,"sine",music);
        }
      }
      beat++; nextBeat += .42;
    }
  }
  async function unlock() {
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context = new AudioContext();
        master=context.createGain();music=context.createGain();effects=context.createGain();compressor=context.createDynamicsCompressor();
        compressor.threshold.value=-16;compressor.ratio.value=5;compressor.knee.value=16;
        music.connect(master);effects.connect(master);master.connect(compressor);compressor.connect(context.destination);
        noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);
        const samples=noiseBuffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
        setGains();setInterval(scheduleMusic,100);
      }
      if (context.state === "suspended" && !document.hidden) await context.resume();
      scheduleMusic();
    } catch { /* Audio unavailability must never interrupt a battle. */ }
  }
  function canSound() {
    return context && context.state === "running" && !document.hidden && !settings.muted && settings.effects > 0 && settings.master > 0;
  }
  function attack(kind, special=true) {
    if (!canSound() || paused) return;
    const at=context.currentTime;
    if (at-lastEffect<.055) return;
    lastEffect=at;
    if(kind==="thunder"&&special){noise(at,.34,1700,.22);voice(95,35,at,.45,.24,"sine",effects);}
    else if(kind==="water"||kind==="steam"){voice(650,160,at,.17,.12,"sine",effects);voice(820,340,at+.045,.1,.07,"sine",effects);}
    else if(kind==="fire"||kind==="lava"){noise(at,.2,1800,.14);voice(170,55,at,.16,.1,"triangle",effects);}
    else if(kind==="metal"||kind==="spike"||kind==="blade"){voice(1500,740,at,.13,.055,"triangle",effects);noise(at,.045,4200,.055);}
    else if(kind==="ice"){voice(1800,1000,at,.23,.06,"sine",effects);voice(2300,1550,at+.03,.12,.025,"sine",effects);}
    else if(kind==="earth"||kind==="rock"||kind==="mud"){voice(130,42,at,.22,.19,"sine",effects);noise(at,.08,500,.08);}
    else {voice(380,180,at,.12,.09,"triangle",effects);voice(520,260,at+.03,.08,.05,"sine",effects);}
  }
  function cue(kind) {
    if(!canSound())return;
    const at=context.currentTime;
    const notes=kind==="defeat"?[293.66,246.94,196]:kind==="wave"?[196,293.66]:kind==="fusion"?[392,493.88,587.33,783.99]:[440,587.33];
    notes.forEach((f,i)=>voice(f,f,at+i*.1,.45,.12,"sine",effects));
  }
  function setPaused(value) {paused=value;setGains();if(!paused)scheduleMusic();}
  button.addEventListener("click",()=>{const open=panel.hidden;panel.hidden=!open;button.setAttribute("aria-expanded",String(open));});
  document.addEventListener("pointerdown",event=>{unlock();if(!panel.hidden&&!panel.contains(event.target)&&!button.contains(event.target)){panel.hidden=true;button.setAttribute("aria-expanded","false");}});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!panel.hidden){panel.hidden=true;button.setAttribute("aria-expanded","false");button.focus();}
    if(event.key==="Enter"||event.key===" ")unlock();
  });
  document.addEventListener("visibilitychange",()=>{
    if(!context)return;
    if(document.hidden)context.suspend().catch(()=>{});else unlock();
  });
  for(const name of ["master","music","effects"]){
    const input=document.getElementById(`volume-${name}`),output=document.getElementById(`value-${name}`);
    input.value=settings[name];output.value=`${settings[name]}%`;
    input.addEventListener("input",()=>{settings[name]=Number(input.value);output.value=`${settings[name]}%`;save();unlock();});
  }
  mute.checked=settings.muted;
  mute.addEventListener("change",()=>{settings.muted=mute.checked;save();unlock();});
  save();
  window.ElementAudio={attack,cue,setPaused};
})();
