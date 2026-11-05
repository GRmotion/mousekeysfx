/* MouseKeysFX sound engine: shared by the web app (index.html) and the After Effects panel.
   Needs window.SOUND_LIB (sound-library.js). Plain global-scope script, no DOM access, ES2015 only. */
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const dB = x => Math.pow(10,x/20);

const DEF = {
  mouse:{preset:'Recorded',speed:50,smooth:0,tone:50,body:50,click:50,release:50,hold:68,human:25,
         repeat:3,interval:450,double:false,dblgap:110,vol:80,denoise:50,room:8,noise:0,seed:3},
  kb:{preset:'Recorded',speed:50,smooth:0,tone:50,depth:50,click:50,release:50,human:35,
      spaceBoost:3,spacePitch:-2,enterBoost:2,enterPitch:-1,rattle:25,
      text:'Hello world,\nthis is a synthetic typing simulation.\nEvery space and enter has its own weight.\n',
      duration:18,rhythm:55,burst:35,pauseSpace:40,pauseEnter:200,pausePunct:80,seed:7,
      vol:80,denoise:50,room:8,noise:0,spread:35,single:'key'},
  exp:{sr:44100,bits:'16',ch:'2',norm:true}
};
const PRESETS = {
  mouse:{
    Recorded:{speed:50,smooth:0, tone:50,body:50,click:50,release:50,hold:68,human:25},
    Soft:    {speed:58,smooth:40,tone:40,body:62,click:30,release:40,hold:80,human:25},
    Bright:  {speed:55,smooth:0, tone:62,body:40,click:72,release:55,hold:60,human:25},
    Heavy:   {speed:45,smooth:15,tone:36,body:76,click:40,release:50,hold:85,human:25}
  },
  kb:{
    Recorded:       {speed:50,smooth:0, tone:50,depth:50,click:50,release:50,human:35},
    Muted:          {speed:58,smooth:45,tone:40,depth:60,click:30,release:35,human:35},
    'Deep thock':   {speed:45,smooth:20,tone:34,depth:80,click:35,release:45,human:35},
    'Bright clicky':{speed:55,smooth:0, tone:64,depth:35,click:75,release:60,human:35},
    'Light & fast': {speed:68,smooth:10,tone:58,depth:32,click:55,release:45,human:30}
  }
};

/* ---------- DSP helpers ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const gauss = r => Math.sqrt(-2*Math.log(1-r()))*Math.cos(2*Math.PI*r());

function makeIR(ctx,len){
  const n=Math.floor(ctx.sampleRate*len), b=ctx.createBuffer(2,n,ctx.sampleRate), r=mulberry32(99);
  for(let c=0;c<2;c++){
    const d=b.getChannelData(c); let lp=0;
    for(let i=0;i<n;i++){ lp+=((r()*2-1)-lp)*0.35; d[i]=lp*Math.pow(1-i/n,3.5); }
  }
  return b;
}
function makeChain(ctx,p){
  const input=ctx.createGain();
  const comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-8; comp.knee.value=8; comp.ratio.value=10; comp.attack.value=0.002; comp.release.value=0.12;
  const master=ctx.createGain(); master.gain.value=Math.pow(p.vol/100,1.6)*1.4;
  input.connect(comp);
  if(p.room>0){
    const conv=ctx.createConvolver(); conv.buffer=makeIR(ctx,0.35);
    const wet=ctx.createGain(); wet.gain.value=p.room/100*0.7;
    input.connect(conv); conv.connect(wet); wet.connect(comp);
  }
  comp.connect(master); master.connect(ctx.destination);
  return {input,out:master};
}

/* ---------- mouse voice ---------- */
function mouseVar(rng,p){
  return {vel:clamp(1+gauss(rng)*p.human/100*0.15,0.6,1.35), pit:1+gauss(rng)*p.human/100*0.03};
}
function mouseEvents(p){
  const rng=mulberry32(p.seed*104729+3), evs=[], lead=0.1;
  for(let i=0;i<p.repeat;i++){
    const base=lead+i*p.interval/1000+(i?gauss(rng)*p.human/100*0.02:0);
    const times=p.double?[base,base+p.dblgap/1000*clamp(1+gauss(rng)*p.human/100*0.15,0.7,1.3)]:[base];
    for(const t of times)
      evs.push(Object.assign({t:Math.max(0,t),kind:'click'},mouseVar(rng,p),{hold:p.hold/1000*clamp(1+gauss(rng)*p.human/100*0.2,0.6,1.5)}));
  }
  return evs;
}

/* ---------- keyboard voice ---------- */
const ROWS=['`1234567890-=','qwertyuiop[]',"asdfghjkl;'",'zxcvbnm,./'], ROWOFF=[0,0.5,0.75,1.25];
function keyX(c,kind){
  if(kind==='space') return 0.5;
  if(kind==='enter') return 0.93;
  const l=c.toLowerCase();
  for(let r=0;r<4;r++){ const i=ROWS[r].indexOf(l); if(i>=0) return (ROWOFF[r]+i+0.5)/14.5; }
  return 0.5;
}
function keyEvent(c,rng,p){
  const kind=c===' '?'space':c==='\n'?'enter':'key';
  return {c,kind,
    tpl:Math.imul(c.codePointAt(0),2654435761)>>>0,
    vel:clamp(1+gauss(rng)*p.human/100*0.18,0.55,1.4),
    pit:1+gauss(rng)*p.human/100*0.02,
    pan:(keyX(c,kind)-0.5)*2*p.spread/100,
    hold:clamp(0.078+gauss(rng)*0.017,0.045,0.14)};
}
function typingEvents(p){
  const rng=mulberry32(p.seed*7919+1);
  const chars=[...p.text.replace(/\r/g,'')], n=chars.length;
  const evs=chars.map(c=>keyEvent(c,rng,p));
  if(!n) return evs;
  const raw=[]; let wm=1, sum=0;
  for(let i=1;i<n;i++){
    const prev=chars[i-1];
    if(prev===' '||prev==='\n') wm=Math.exp(gauss(rng)*p.burst/100*0.5);
    const pause = prev===' ' ? p.pauseSpace/100 : prev==='\n' ? p.pauseEnter/100 : /[.,;:!?]/.test(prev) ? p.pausePunct/100 : 0;
    const g=Math.max(0.2,(1+pause)*wm*Math.exp(gauss(rng)*p.rhythm/100));
    raw.push(g); sum+=g;
  }
  const k=n>1?p.duration/sum:0;
  let t=0.15; evs[0].t=t;
  for(let i=1;i<n;i++){ t+=raw[i-1]*k; evs[i].t=t; }
  for(let i=0;i<n;i++){
    const gap=i<n-1?evs[i+1].t-evs[i].t:0.3;
    evs[i].hold=clamp(evs[i].hold,0.03,Math.max(0.03,gap*0.85));
  }
  return evs;
}

/* ---------- sample-level synthesis from recorded templates ----------
   Hits are rebuilt from band-by-band loudness envelopes measured on real recordings (36 ERB-spaced bands,
   0.5 ms resolution) by shaping band-limited noise, plus the ringing resonances measured on the mouse
   switch. The envelopes are bent by the sliders and randomized per hit, so no two hits are identical. */
let KB_GAIN=3, MOUSE_GAIN=0.5, CAL=0.80;
const PRE_MS=1.0;
function filtInPlace(x,type,f,q,sr){
  const w=2*Math.PI*Math.min(f,sr*0.45)/sr, c=Math.cos(w), s=Math.sin(w), al=s/(2*q), a0=1+al;
  let b0,b1,b2;
  if(type==='lowpass'){b0=(1-c)/2;b1=1-c;b2=b0;}
  else if(type==='highpass'){b0=(1+c)/2;b1=-(1+c);b2=b0;}
  else{b0=al;b1=0;b2=-al;}
  b0/=a0;b1/=a0;b2/=a0; const a1=-2*c/a0, a2=(1-al)/a0;
  let x1=0,x2=0,y1=0,y2=0;
  for(let i=0;i<x.length;i++){
    const v=x[i], y=b0*v+b1*x1+b2*x2-a1*y1-a2*y2;
    x2=x1;x1=v;y2=y1;y1=y;x[i]=y;
  }
}
let LIBD=null;
function getLib(){
  if(LIBD) return LIBD;
  const L=window.SOUND_LIB, nb=L.nb, nf=L.grid.length, per=nf*nb;
  const dec=k=>{
    const o=L[k], bin=atob(o.d), u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
    const tpls=[];
    for(let i=0;i<o.n;i++){
      const q=u.subarray(i*per,(i+1)*per), A=new Float32Array(per), mx=new Float32Array(nb);
      for(let j=0;j<nf;j++) for(let b=0;b<nb;b++){
        const db=q[j*nb+b]/2-110, a=db<=-104?0:Math.pow(10,db/20);
        A[j*nb+b]=a; if(a>mx[b]) mx[b]=a;
      }
      tpls.push({r:o.r[i],A,mx,peak:Math.max(...mx)});
    }
    return {tpls,modes:o.modes||null};
  };
  LIBD={nb,nf,fc:L.fc,kbDown:dec('kbDown'),kbBig:dec('kbBig'),kbUp:dec('kbUp'),mDown:dec('mDown'),mUp:dec('mUp')};
  return LIBD;
}
const bankCache=new Map();
function noiseBank(sr){
  let b=bankCache.get(sr);
  if(b) return b;
  const lib=getLib(), rng=mulberry32(4242), len=Math.floor(sr*1.2);
  b=lib.fc.map(fc=>{
    const x=new Float32Array(len);
    for(let i=0;i<len;i++) x[i]=rng()*2-1;
    filtInPlace(x,'bandpass',fc,fc/(1.6*24.7*(4.37*fc/1000+1)),sr);
    let e=0; for(let i=2000;i<len;i++) e+=x[i]*x[i];
    const k=1/Math.sqrt(e/(len-2000)); for(let i=0;i<len;i++) x[i]*=k;
    return x;
  });
  bankCache.set(sr,b);
  return b;
}
function addMode(d,sr,t,f,tau,amp,ph,att=0.0003){
  const i0=Math.floor(t*sr); if(i0>=d.length) return;
  const len=Math.min(d.length-i0,Math.ceil(tau*7*sr)), w=2*Math.PI*f/sr;
  const cw=Math.cos(w), sw=Math.sin(w), dec=Math.exp(-1/(tau*sr)), na=Math.max(1,att*sr);
  let s=Math.sin(ph), c=Math.cos(ph), env=amp;
  for(let i=0;i<len;i++){
    d[i0+i]+=env*(i<na?i/na:1)*s;
    const ns=s*cw+c*sw; c=c*cw-s*sw; s=ns; env*=dec;
  }
}
function resample(d,r){
  if(Math.abs(r-1)<0.01) return d;
  const n=Math.max(1,Math.floor((d.length-20)/r)), o=new Float32Array(n), cut=Math.min(1,1/r), H=8;
  for(let j=0;j<n;j++){
    const x=j*r+9, i=Math.floor(x); let v=0;
    for(let k=-H+1;k<=H;k++){
      const t=x-(i+k), w=0.5+0.5*Math.cos(Math.PI*t/H), a=Math.PI*t*cut;
      v+=d[i+k]*(Math.abs(a)<1e-6?cut:Math.sin(a)/(Math.PI*t))*w;
    }
    o[j]=v;
  }
  return o;
}
/* o: S time stretch, tilt dB/oct, lf/hf dB, lp Hz, att s, jit dB, db level, st semitones, modes, gain */
function tplHit(tpl,sr,o,rng){
  const lib=getLib(), nb=lib.nb, G=window.SOUND_LIB.grid, bank=noiseBank(sr), S=o.S;
  const N=Math.floor((3+(G[G.length-1]-3)*S)/1000*sr);
  const j0=new Int32Array(N), fr=new Float32Array(N);
  for(let i=0;i<N;i++){
    const ms=i/sr*1000, tau=ms<3?ms:3+(ms-3)/S, idx=Math.min(tau<=20?tau/0.5:40+(tau-20)/2,G.length-1.0001);
    j0[i]=Math.floor(idx); fr[i]=idx-j0[i];
  }
  const out=new Float32Array(N), alpha=o.att>0?1-Math.exp(-1/(o.att*sr)):1;
  let jit=0;
  for(let b=0;b<nb;b++){
    const fc=lib.fc[b];
    jit=jit*0.85+gauss(rng)*o.jit;
    const g=o.tilt*Math.log2(fc/1500)+o.lf/(1+Math.pow(fc/350,3))+o.hf*(1-1/(1+Math.pow(fc/3000,3)))
      -(fc>o.lp?12*Math.log2(fc/o.lp):0)+jit+o.db;
    const gb=Math.pow(10,g/20)*CAL;
    if(tpl.mx[b]*gb<1e-7) continue;
    const nz=bank[b], off=2200+Math.floor(rng()*(nz.length-N-2300)), A=tpl.A;
    const thr=tpl.peak*Math.pow(10,-(60-45*o.nr)/20);   // noise reduction: 2:1 expander below a threshold set against the loudest band
    let s=0;
    for(let i=0;i<N;i++){
      const k=j0[i]*nb+b; let a=A[k]+(A[k+nb]-A[k])*fr[i];
      if(a<thr) a*=a/thr;
      s+=(a-s)*alpha; out[i]+=nz[off+i]*s*gb;
    }
  }
  if(o.modes) for(const m of o.modes)
    addMode(out,sr,(PRE_MS+1.5)/1000,m.f*o.fm,m.tau*S,m.amp*Math.pow(10,o.db/20),m.ph+Math.PI/2);
  const fade=Math.min(128,N);
  for(let i=N-fade;i<N;i++) out[i]*=(N-i)/fade;
  return resample(out,Math.pow(2,o.st/12));
}
function mouseSynth(p,e,rng,up,sr){
  const lib=getLib(), h=p.human/100, tpl=(up?lib.mUp:lib.mDown).tpls[0];
  if(up&&p.release<=0) return null;
  const sm=p.smooth/100;
  const o={S:Math.pow(2,(50-p.speed)/50*0.9)*(1+gauss(rng)*0.05*h), tilt:(p.tone-50)/50*4,
    lf:(p.body-50)/50*10, hf:(p.click-50)/50*10, lp:20000*Math.pow(0.15,sm), att:sm*0.0015, jit:h*1.4, nr:p.denoise/100,
    db:20*Math.log10(e.vel)+(up?(p.release-50)/50*12:0)+gauss(rng)*h*1.2, st:(p.tone-50)/50*3,
    fm:1+gauss(rng)*h*0.01, modes:(up?lib.mUp:lib.mDown).modes};
  const d=tplHit(tpl,sr,o,rng), k=MOUSE_GAIN*(up?1:0.75);   // 0.75: calibrated against the recorded click
  for(let i=0;i<d.length;i++) d[i]*=k;
  return d;
}
function keySynth(p,e,rng,up,sr){
  const lib=getLib(), h=p.human/100, sm=p.smooth/100, big=e.kind!=='key';
  if(up&&p.release<=0) return null;
  const set=up?lib.kbUp:big?lib.kbBig:lib.kbDown;
  const pick=(e.tpl+(rng()<h*0.5?1+Math.floor(rng()*3):0)+(e.kind==='enter'?3:0))%set.tpls.length;
  const bigDb=big?(e.kind==='space'?p.spaceBoost:p.enterBoost):0, bigSt=big?(e.kind==='space'?p.spacePitch:p.enterPitch):0;
  const o={S:Math.pow(2,(50-p.speed)/50*0.9)*(1+gauss(rng)*0.05*h), tilt:(p.tone-50)/50*4,
    lf:(p.depth-50)/50*10, hf:(p.click-50)/50*10, lp:20000*Math.pow(0.15,sm), att:sm*0.0015, jit:h*1.4, nr:p.denoise/100,
    db:20*Math.log10(KB_GAIN*e.vel)+(up?(p.release-50)/50*12:0)+bigDb+gauss(rng)*h*1.2,
    st:(p.tone-50)/50*3+bigSt, modes:null};
  const d=tplHit(set.tpls[pick],sr,o,rng);
  if(big&&!up&&p.rattle>0){
    const bank=noiseBank(sr), n=e.kind==='space'?3:2, r=p.rattle/100, amp=set.tpls[pick].r*KB_GAIN*Math.pow(10,bigDb/20)*0.5*r;
    for(let i=0;i<n;i++){
      const t0=Math.floor((0.012+i*0.007+rng()*0.01)*sr), len=Math.floor(0.006*sr), off=3000+Math.floor(rng()*20000);
      for(let j=0;j<len&&t0+j<d.length;j++){
        let v=0; for(let b=24;b<29;b++) v+=bank[b][off+j];
        d[t0+j]+=v*0.45*amp*Math.exp(-j/sr/0.0012)*Math.min(1,j/(0.0002*sr));
      }
    }
  }
  return d;
}
const synthHit=(g,p,e,rng,up,sr)=>(g==='mouse'?mouseSynth:keySynth)(p,e,rng,up,sr);
function panGains(pan){ const a=(clamp(pan||0,-1,1)+1)*Math.PI/4; return [Math.cos(a),Math.sin(a)]; }
// The two microphones of the reference recording are about 15 mm apart: the right channel arrives ~45 us later.
function stereoHit(d,sr,pan,L,R,o){
  const [gl,gr]=panGains(pan), dl=0.000045*sr, i0=Math.floor(dl), f=dl-i0;
  for(let i=0;i<d.length;i++){
    L[o+i]+=d[i]*gl;
    const k=o+i+i0; if(k<L.length) R[k]+=d[i]*gr*(1-f); if(k+1<L.length) R[k+1]+=d[i]*gr*f;
  }
}

function addNoiseBed(L,R,sr,gain,rng){
  const bank=noiseBank(sr), fl=window.SOUND_LIB.floor, B=Math.floor(0.6*sr), X=Math.floor(0.005*sr), n=L.length;
  for(const ch of [L,R]) for(let b=0;b<bank.length;b++){
    const a=fl[b]*gain, nz=bank[b];
    for(let s0=0;s0<n;s0+=B-X){
      const off=2200+Math.floor(rng()*(nz.length-B-2300)), len=Math.min(B,n-s0);
      for(let i=0;i<len;i++){
        const w=Math.min(1,i/X,(len-i)/X);
        ch[s0+i]+=nz[off+i]*a*w;
      }
    }
  }
}

async function renderEvents(g,p,evs,sr,tail=0.8){
  const end=evs.reduce((m,e)=>Math.max(m,e.t+e.hold),0)+tail+(p.room>0?0.4:0);
  const total=Math.max(1,Math.ceil(end*sr)), L=new Float32Array(total), R=new Float32Array(total);
  const rng=mulberry32(p.seed*31+5);
  for(const e of evs){
    for(const up of [false,true]){
      const d=synthHit(g,p,e,rng,up,sr); if(!d) continue;
      stereoHit(d,sr,e.pan,L,R,Math.floor((e.t+(up?e.hold:0))*sr));
    }
  }
  if(p.noise>0) addNoiseBed(L,R,sr,(g==='mouse'?1:KB_GAIN)*p.noise/50,rng);
  const oc=new OfflineAudioContext(2,total,sr), dry=oc.createBuffer(2,total,sr), src=oc.createBufferSource();
  dry.copyToChannel(L,0); dry.copyToChannel(R,1);
  src.buffer=dry; src.connect(makeChain(oc,p).input); src.start();
  return {buffer:await oc.startRendering(),events:evs,duration:end};
}

function encodeWAV(buf,bits,mono,norm){
  const len=buf.length, sr=buf.sampleRate, nch=mono?1:2;
  const L=buf.getChannelData(0), R=buf.getChannelData(1);
  const ch=[mono?Float32Array.from(L,(v,i)=>(v+R[i])/2):L];
  if(!mono) ch.push(R);
  let gain=1;
  if(norm){ let pk=0; for(const c of ch) for(let i=0;i<len;i++){ const v=Math.abs(c[i]); if(v>pk) pk=v; } if(pk>0) gain=dB(-1)/pk; }
  const flt=bits==='32f', bps=flt?32:+bits, bpf=bps/8;
  const dataLen=len*nch*bpf, extra=flt?12:0;
  const ab=new ArrayBuffer(44+extra+dataLen), v=new DataView(ab);
  let o=0;
  const str=s=>{for(let i=0;i<s.length;i++)v.setUint8(o++,s.charCodeAt(i));};
  const u32=x=>{v.setUint32(o,x,true);o+=4;}, u16=x=>{v.setUint16(o,x,true);o+=2;};
  str('RIFF');u32(36+extra+dataLen);str('WAVE');
  str('fmt ');u32(16);u16(flt?3:1);u16(nch);u32(sr);u32(sr*nch*bpf);u16(nch*bpf);u16(bps);
  if(flt){str('fact');u32(4);u32(len);}
  str('data');u32(dataLen);
  for(let i=0;i<len;i++) for(let c=0;c<nch;c++){
    const s=clamp(ch[c][i]*gain,-1,1);
    if(flt){v.setFloat32(o,s,true);o+=4;}
    else if(bps===16){v.setInt16(o,Math.round(s*32767),true);o+=2;}
    else{const x=Math.round(s*8388607);v.setUint8(o++,x&255);v.setUint8(o++,(x>>8)&255);v.setUint8(o++,(x>>16)&255);}
  }
  return new Blob([ab],{type:'audio/wav'});
}
