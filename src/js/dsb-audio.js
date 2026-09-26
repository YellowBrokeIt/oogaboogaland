// Entrance audio: four recordings, quiet ducked music, and pooled walking sounds.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  // All outdoor sources are started once; updates only automate this fixed graph.
  const createAmbience = (context, master) => {
    // Region-aware outdoor soundscape. Noderunner radio remains a separate proximity source.
    const sources=[], nodes=[], layers={}, names=["wind","surf","waterfall","cicadas","town","motor","wildlife"], targets=new Float32Array(7);
    let nextCall=0,calls=0,birdSide=0,enabled=false;
    const bus=context.createGain(); bus.gain.value=0; bus.connect(master); nodes.push(bus);

    const noiseBuffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate), samples=noiseBuffer.getChannelData(0);
    let seed=71931;
    for(let i=0;i<samples.length;i++){ seed=(Math.imul(seed,1664525)+1013904223)|0; samples[i]=(seed>>>0)/2147483648-1; }
    const noise=context.createBufferSource(); noise.buffer=noiseBuffer; noise.loop=true; noise.start(); sources.push(noise);

    for(const name of names){
      const gain=context.createGain(), pan=context.createStereoPanner(); gain.gain.value=0; gain.connect(pan); pan.connect(bus);
      layers[name]={gain,pan}; nodes.push(gain,pan);
    }
    const filter=(name,type,frequency,q)=>{
      const f=context.createBiquadFilter(); f.type=type; f.frequency.value=frequency; f.Q.value=q;
      noise.connect(f); f.connect(layers[name].gain); nodes.push(f); return f;
    };
    const windFilter=filter("wind","bandpass",520,0.35);
    const surfFilter=filter("surf","bandpass",960,0.45);
    const waterfallFilter=filter("waterfall","bandpass",280,0.4);
    const cicadaFilter=filter("cicadas","bandpass",4100,2.2);
    const townFilter=filter("town","bandpass",680,1.2);

    const motorFilter=context.createBiquadFilter(); motorFilter.type="lowpass"; motorFilter.frequency.value=220; motorFilter.connect(layers.motor.gain); nodes.push(motorFilter);
    const motor=context.createOscillator(); motor.type="sawtooth"; motor.frequency.value=58; motor.connect(motorFilter); motor.start(); sources.push(motor);

    const birds=[];
    for(let i=0;i<2;i++){
      const oscillator=context.createOscillator(), gain=context.createGain(); gain.gain.value=0; oscillator.connect(gain); gain.connect(layers.wildlife.gain); oscillator.start();
      birds.push({oscillator,gain}); sources.push(oscillator); nodes.push(gain);
    }

    const attenuate=(distance,range)=>1/(1+(distance/range)**2);
    const panFor=(camera,x,z)=>{
      const dx=x-camera.position.x,dz=z-camera.position.z,fx=camera.target.x-camera.position.x,fz=camera.target.z-camera.position.z;
      const horizontal=Math.hypot(dx,dz),forward=Math.hypot(fx,fz);
      return horizontal>0.01&&forward>0.01?Math.max(-0.85,Math.min(0.85,(-fz*dx+fx*dz)/(horizontal*forward))):0;
    };
    const position=(layer,x,y,z,camera,level,range,index)=>{
      const distance=Math.hypot(x-camera.position.x,y-camera.position.y,z-camera.position.z);
      targets[index]=level*attenuate(distance,range);
      layer.gain.gain.setTargetAtTime(targets[index],context.currentTime,0.3);
      layer.pan.pan.setTargetAtTime(panFor(camera,x,z),context.currentTime,0.25);
    };
    const setWorld=(layer,level,index)=>{
      targets[index]=level;
      layer.gain.gain.setTargetAtTime(level,context.currentTime,0.35);
      layer.pan.pan.setTargetAtTime(0,context.currentTime,0.35);
    };

    const update=(camera,boat,active,muted)=>{
      const at=context.currentTime, p=camera.position;
      enabled=active&&!muted; bus.gain.setTargetAtTime(enabled?1:0,at,0.25);
      if(!enabled){ nextCall=at+2; return; }

      const olympus=Math.hypot(p.x+52,p.z+42);
      const chora=Math.hypot(p.x-32,p.z-60);
      const coastRadius=Math.hypot(p.x,p.z);
      const nearCoast=Math.max(0,Math.min(1,(coastRadius-78)/42));
      const foothill=Math.max(0,1-Math.hypot(p.x-5,p.z-18)/58);

      // Wind dominates high/exposed Olympus and fades toward town.
      const windLevel=0.018+0.055*Math.max(0,1-olympus/55);
      setWorld(layers.wind,windLevel,0);
      windFilter.frequency.setTargetAtTime(420+Math.max(0,1-olympus/60)*420,at,0.4);

      // Surf follows the actual coast rather than a generic circular river.
      const surfLevel=(0.012+0.06*nearCoast)*(0.92+Math.sin(at*0.7)*0.08);
      setWorld(layers.surf,surfLevel,1);
      surfFilter.frequency.setTargetAtTime(820+nearCoast*420,at,0.35);

      // Two authored Olympus waterfalls / runoff.
      position(layers.waterfall,-66,30,-20,camera,0.08,24,2);
      const d2=Math.hypot(p.x+43,p.y-24,p.z-1);
      const second=0.065*attenuate(d2,20);
      layers.waterfall.gain.gain.setTargetAtTime(Math.max(targets[2],second),at,0.25);

      // Cicadas strongest in warm foothills / olive country, weak at exposed summit and seafront.
      const cicadaLevel=0.034*foothill*(1-Math.max(0,1-olympus/42)*0.8)*(1-nearCoast*0.55);
      setWorld(layers.cicadas,cicadaLevel*(0.85+0.15*Math.sin(at*5.2)),3);
      cicadaFilter.frequency.setTargetAtTime(3900+Math.sin(at*1.8)*260,at,0.2);

      // Chora / Agora social murmur.
      const townLevel=0.035*attenuate(chora,35);
      position(layers.town,34,1,60,camera,townLevel?0.055:0,38,4);
      townFilter.frequency.setTargetAtTime(650+Math.sin(at*1.7)*160,at,0.18);

      // Harbor/boat mechanical hum remains local.
      position(layers.motor,boat.x,boat.y,boat.z,camera,0.026*(0.9+Math.sin(at*14)*0.1),18,5);
      motor.frequency.setTargetAtTime(55+Math.sin(at*0.9)*4,at,0.12);

      // Birds / gulls bias toward coast, occasional mountain birds remain audible.
      if(at>=nextCall){
        birdSide=calls%2; const bird=birds[birdSide], base=nearCoast>0.4?(birdSide?1550:1150):(birdSide?2050:1650);
        nextCall=at+5.5+(calls%4)*1.3; calls++;
        bird.oscillator.frequency.cancelScheduledValues(at); bird.oscillator.frequency.setValueAtTime(base,at);
        bird.oscillator.frequency.exponentialRampToValueAtTime(base*1.42,at+0.08); bird.oscillator.frequency.exponentialRampToValueAtTime(base*0.92,at+0.3);
        bird.gain.gain.cancelScheduledValues(at); bird.gain.gain.setValueAtTime(0,at); bird.gain.gain.linearRampToValueAtTime(0.6,at+0.025);
        bird.gain.gain.linearRampToValueAtTime(0,at+0.13); bird.gain.gain.linearRampToValueAtTime(0.42,at+0.19); bird.gain.gain.linearRampToValueAtTime(0,at+0.32);
      }
      const birdLevel=0.012+nearCoast*0.014;
      setWorld(layers.wildlife,birdLevel,6);
    };

    return {
      update,
      get stats(){ return {enabled,calls,sources:sources.length,nodes:nodes.length,wind:targets[0],surf:targets[1],waterfall:targets[2],cicadas:targets[3],town:targets[4],motor:targets[5],wildlife:targets[6],gain:bus.gain.value}; },
      dispose:()=>{ for(const source of sources){ try{source.stop();}catch{} source.disconnect(); } for(const node of nodes) node.disconnect(); }
    };
  };

  const createInteriorAmbience = (context, master) => {
    const bus=context.createGain(); bus.gain.value=0; bus.connect(master);
    const humGain=context.createGain(); humGain.gain.value=0; humGain.connect(bus);
    const hum=context.createOscillator(); hum.type="triangle"; hum.frequency.value=46; hum.connect(humGain); hum.start();

    const buzzGain=context.createGain(); buzzGain.gain.value=0; buzzGain.connect(bus);
    const buzz=context.createOscillator(); buzz.type="sawtooth"; buzz.frequency.value=92; buzz.connect(buzzGain); buzz.start();

    const noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate), samples=noiseBuffer.getChannelData(0);
    let seed=48121;
    for(let i=0;i<samples.length;i++){ seed=(Math.imul(seed,1103515245)+12345)|0; samples[i]=((seed>>>0)/2147483648)-1; }
    const noise=context.createBufferSource(); noise.buffer=noiseBuffer; noise.loop=true;
    const filter=context.createBiquadFilter(); filter.type="bandpass"; filter.frequency.value=1100; filter.Q.value=0.8;
    const noiseGain=context.createGain(); noiseGain.gain.value=0; noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(bus); noise.start();

    let kind="",active=false;
    const update=(nextKind, enabled, muted)=>{
      kind=nextKind||"";
      active=!!kind && enabled && !muted;
      const at=context.currentTime;
      bus.gain.setTargetAtTime(active?1:0,at,0.18);
      if(kind==="meme-factory"){
        humGain.gain.setTargetAtTime(active?0.028:0,at,0.12);
        buzzGain.gain.setTargetAtTime(active?(0.006+0.003*(0.5+0.5*Math.sin(at*1.7))):0,at,0.12);
        noiseGain.gain.setTargetAtTime(active?(0.008+0.004*(0.5+0.5*Math.sin(at*2.3))):0,at,0.12);
        hum.frequency.setTargetAtTime(44+Math.sin(at*0.8)*2,at,0.08);
        buzz.frequency.setTargetAtTime(90+Math.sin(at*3.2)*7,at,0.08);
      } else {
        humGain.gain.setTargetAtTime(0,at,0.12);
        buzzGain.gain.setTargetAtTime(0,at,0.12);
        noiseGain.gain.setTargetAtTime(0,at,0.12);
      }
    };
    return {
      update,
      get stats(){ return {kind,active,gain:bus.gain.value}; },
      dispose:()=>{ for(const src of [hum,buzz,noise]){ try{src.stop();}catch{} src.disconnect(); } filter.disconnect(); humGain.disconnect(); buzzGain.disconnect(); noiseGain.disconnect(); bus.disconnect(); }
    };
  };

  const create = () => {
    let context = null, master = null, musicGain = null, speechGain = null, voice = null, music = null, disposed = false;
    let muted = false, progress = 0, next = 0, queued = 0, musicVersion = 0, cue = -1, outdoors = false, stepAt = 0, stepSide = 0, steps = 0, ready = false, duration = 7, failure = "";
    let foot = null, footGain = null, ambience = null, interiorAmbience = null, interiorKind = "";
    let radioVolume = 0.075;
    let musicEnabled = true, ambientEnabled = true, hidden = false, radio = null, radioTimer = 0, radioWatchdog = 0, radioEpoch = 0, radioStatus = "Radio starts outdoors";
    const radioWanted = () => outdoors && !interiorKind && musicEnabled && !muted && !hidden && !disposed;
    const stopRadio = () => {
      radioEpoch++; clearTimeout(radioTimer); clearTimeout(radioWatchdog); radioTimer = radioWatchdog = 0;
      if (radio) { radio.onplaying = radio.onerror = radio.onended = radio.onwaiting = null; radio.pause(); radio.removeAttribute("src"); radio.load(); }
    };
    const startRadio = () => {
      if (!radioWanted()) return;
      stopRadio(); const epoch = radioEpoch;
      if (!radio) { radio = new Audio(); radio.preload = "none"; }
      radio.volume = radioVolume; radio.muted = false; radioStatus = "Connecting to Noderunners Radio";
      const failed = () => {
        if (epoch !== radioEpoch || !radioWanted()) return;
        stopRadio(); radioStatus = "Radio offline - retrying; ambient sounds available";
        radioTimer = setTimeout(startRadio, 30000);
      };
      radio.onplaying = () => { if (epoch !== radioEpoch) return; clearTimeout(radioWatchdog); radioWatchdog = 0; radioStatus = "Live - Noderunners Radio"; };
      radio.onerror = radio.onended = failed;
      radio.onwaiting = () => { if (!radioWatchdog) radioWatchdog = setTimeout(failed, 12000); };
      radioWatchdog = setTimeout(failed, 12000);
      radio.src = "https://stream.noderunnersradio.com/stream?_=" + Date.now();
      radio.play().catch((error) => {
        if (epoch !== radioEpoch || !radioWanted()) return;
        if (error.name === "NotAllowedError") { stopRadio(); radioStatus = "Press Play radio to enable sound"; }
        else failed();
      });
    };
    const syncRadio = () => {
      if (radioWanted()) startRadio();
      else { stopRadio(); radioStatus = interiorKind ? "Outside radio unavailable indoors" : !outdoors ? "Radio starts outdoors" : !musicEnabled ? "Music off" : muted ? "All sound muted" : "Radio paused"; }
    };
    const clips = [null, null, null, null], versions = new Uint32Array(4), fired = new Uint8Array(4), triggers = new Float64Array([0.2, 0.4, 0.6, 0.8]);
    const mix = () => musicGain.gain.setTargetAtTime((outdoors || interiorKind || !musicEnabled ? 0 : 0.015 + progress * progress * 0.11) * (voice ? 0.144 : 1), context.currentTime, voice ? 0.025 : 0.35);
    const startMusic = (buffer) => {
      if (music) { music.stop(); music.disconnect(); }
      music = context.createBufferSource(); music.buffer = buffer; music.loop = true; music.connect(musicGain); music.start();
    };
    const decode = async (decoder, encoded) => {
      const binary = atob(encoded), bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      return decoder.decodeAudioData(bytes.buffer);
    };
    const schedule = () => {
      let total = 0; for (const clip of clips) if (clip) total += clip.duration;
      duration = Math.max(7, total + 7);
      let at = 2;
      for (let i = 0; i < clips.length; i++) { triggers[i] = at / duration; at += (clips[i] ? clips[i].duration : 0) + 1; }
    };
    const preload = async () => {
      const decoder = context;
      try {
        await Promise.all([
          ...BL.dsbAudioData.voices.map(async (encoded, i) => {
            const buffer = await decode(decoder, encoded);
            if (!disposed && versions[i] === 0) clips[i] = buffer;
          }),
          (async () => {
            const buffer = await decode(decoder, BL.dsbAudioData.music);
            if (!disposed && musicVersion === 0) startMusic(buffer);
          })()
        ]);
      } catch { if (!disposed) failure = "An entrance audio track could not be decoded."; }
      if (!disposed) { schedule(); ready = true; }
    };
    const ensure = () => {
      if (context || disposed || !window.AudioContext || navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
      context = new AudioContext(); master = context.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(context.destination);
      musicGain = context.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
      speechGain = context.createGain(); speechGain.connect(master);
      foot = context.createOscillator(); foot.type = "sine";
      footGain = context.createGain(); footGain.gain.value = 0;
      foot.connect(footGain); footGain.connect(master); foot.start();
      if (outdoors) ambience = createAmbience(context, master);
      if (interiorKind) interiorAmbience = createInteriorAmbience(context, master);
      preload();
    };
    const gesture = () => { ensure(); if (context && context.state === "suspended") context.resume().catch(() => {}); };
    const playNext = () => {
      if (!context || !ready || voice || disposed || muted) return;
      while (next < queued) {
        const buffer = clips[next++];
        if (!buffer) continue;
        voice = context.createBufferSource(); voice.buffer = buffer; voice.connect(speechGain);
        voice.onended = () => { if (disposed) return; voice.disconnect(); voice = null; playNext(); mix(); };
        cue = next - 1; mix(); voice.start(); break;
      }
    };
    const update = (p, elapsed, walking = false) => {
      progress = p;
      if (ready || !window.AudioContext) for (let i = 0; i < 4; i++) if (p >= triggers[i] && !fired[i]) { fired[i] = 1; queued = i + 1; }
      if (muted) next = queued;
      if (!context) return;
      playNext();
      const at = context.currentTime;
      mix();
      if (!walking || muted || !ready) {
        stepAt = elapsed;
        footGain.gain.cancelScheduledValues(at); footGain.gain.setTargetAtTime(0, at, 0.02);
      } else if (elapsed >= stepAt) {
        stepAt = elapsed + 0.52; stepSide ^= 1; steps++;
        foot.frequency.cancelScheduledValues(at); foot.frequency.setValueAtTime(stepSide ? 115 : 100, at);
        foot.frequency.exponentialRampToValueAtTime(48, at + 0.1);
        footGain.gain.cancelScheduledValues(at); footGain.gain.setValueAtTime(0, at);
        footGain.gain.linearRampToValueAtTime(voice ? 0.018 : 0.03, at + 0.012);
        footGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
        footGain.gain.setValueAtTime(0, at + 0.16);
      }
    };
    window.addEventListener("pointerdown", gesture); window.addEventListener("keydown", gesture);
    // Touch activation can arrive on release; ensure reuses the same audio graph.
    window.addEventListener("pointerup", gesture); window.addEventListener("touchend", gesture);
    // A click through the hub has already activated audio; direct visits wait for input.
    ensure();
    const skipTransition = () => {
      // Cancel only the entrance/transition tracks. Outdoor ambience/radio may start normally after arrival.
      fired.fill(1); queued = next = clips.length; progress = 1;
      if (voice) { voice.onended = null; try { voice.stop(); } catch {} voice.disconnect(); voice = null; }
      if (music) { try { music.stop(); } catch {} music.disconnect(); music = null; }
      if (footGain && context) {
        const at = context.currentTime;
        footGain.gain.cancelScheduledValues(at); footGain.gain.setValueAtTime(0, at);
      }
      if (musicGain && context) {
        const at = context.currentTime;
        musicGain.gain.cancelScheduledValues(at); musicGain.gain.setValueAtTime(0, at);
      }
    };
    return { update, gesture, skipTransition, fired, get radioVolume() { return radioVolume; }, environment: (camera, boat, dt = 1 / 60, source = null) => {
      const p = camera.position, distance = source ? Math.hypot(p.x - source.x, p.y - source.y, p.z - source.z) : Infinity;
      const volume = 0.04 + 0.16 / (1 + (distance / 12) ** 2);
      radioVolume += (volume - radioVolume) * (1 - Math.exp(-Math.max(0, dt) * 4));
      if (radio) radio.volume = radioVolume;
      if (ambience) ambience.update(camera, boat, outdoors && !interiorKind && ambientEnabled, muted);
      if (interiorAmbience) interiorAmbience.update(interiorKind, ambientEnabled, muted);
    }, get ambience() { return ambience ? ambience.stats : null; }, get interiorAmbience() { return interiorAmbience ? interiorAmbience.stats : null; },
    arrive: () => { outdoors = true; if (context) { if (!ambience) ambience = createAmbience(context, master); mix(); } syncRadio(); },
    enterInterior: (kind) => {
      interiorKind = kind || "";
      if (context) {
        if (!interiorAmbience) interiorAmbience = createInteriorAmbience(context, master);
        if (ambience) ambience.update({position:{x:0,y:0,z:0},target:{x:0,y:0,z:1}}, {x:0,y:0,z:0}, false, muted);
        interiorAmbience.update(interiorKind, ambientEnabled, muted);
        mix();
      }
      syncRadio();
    },
    leaveInterior: () => {
      interiorKind = "";
      if (context && interiorAmbience) interiorAmbience.update("", false, muted);
      if (context) mix();
      syncRadio();
    }, toggleMusic: () => { gesture(); musicEnabled = !musicEnabled; if (context) mix(); syncRadio(); }, toggleAmbient: () => { gesture(); ambientEnabled = !ambientEnabled; if (interiorAmbience) interiorAmbience.update(interiorKind, ambientEnabled, muted); }, playRadio: () => { gesture(); musicEnabled = true; syncRadio(); }, get musicEnabled() { return musicEnabled; }, get ambientEnabled() { return ambientEnabled; }, get radioStatus() { return radioStatus; }, get cue() { return cue; }, get musicDuration() { return music ? music.buffer.duration : 0; }, get levels() { return { music: musicGain ? musicGain.gain.value : 0, speech: speechGain ? speechGain.gain.value : 0, footsteps: footGain ? footGain.gain.value : 0, steps }; }, get ready() { return ready; }, get duration() { return duration; }, get durations() { return clips.map((clip) => clip ? clip.duration : 0); }, get failure() { return failure; }, visibility: (value) => { hidden = value; syncRadio(); if (!context) return; if (hidden) context.suspend().catch(() => {}); else context.resume().catch(() => {}); }, get pending() { return !muted && (!!voice || next < queued && !!context); }, get muted() { return muted; }, toggle: () => {
      gesture(); muted = !muted;
      if (muted && voice) { voice.onended = null; voice.stop(); voice.disconnect(); voice = null; next = queued; }
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, context.currentTime, 0.03);
      syncRadio(); return muted;
    }, dispose: () => {
      disposed = true; stopRadio(); radio = null; window.removeEventListener("pointerdown", gesture); window.removeEventListener("keydown", gesture);
      window.removeEventListener("pointerup", gesture); window.removeEventListener("touchend", gesture);
      if (voice) { voice.onended = null; voice.stop(); voice.disconnect(); } if (music) { music.stop(); music.disconnect(); }
      if (foot) { foot.stop(); foot.disconnect(); footGain.disconnect(); }
      if (ambience) { ambience.dispose(); ambience = null; }
      if (interiorAmbience) { interiorAmbience.dispose(); interiorAmbience = null; }
      if (context) context.close().catch(() => {});
      clips.fill(null); context = master = musicGain = speechGain = voice = music = foot = footGain = null;
    } };
  };
  BL.dsbAudio = { create };
})();
