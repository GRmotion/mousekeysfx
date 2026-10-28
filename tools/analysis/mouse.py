import numpy as np, wave, json
from scipy import signal
import bank, extract_helpers as eh
SR=44100
REF='/tmp/claude-0/-home-user-mousekeysfx/1ce88e73-697c-55ed-91e9-2d821ba2e0dc/scratchpad/ref/'
w=wave.open(REF+'mouse_ref.wav'); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16)/32768.0
def find_onset(a,b):
    seg=np.abs(x[int(a*SR):int(b*SR)]); i=np.argmax(seg>0.15*seg.max()); return int(a*SR)+i
cd=find_onset(0.030,0.060); cu=find_onset(0.098,0.125); print('down onset',cd/SR*1000,'up onset',cu/SR*1000,'hold ms',(cu-cd)/SR*1000)
def fit_modes(c,dur,K,fmin=300,fmax=16000):
    s=c+int(0.0015*SR); seg=x[s:s+int(dur*SR)]; n=1<<17
    X=np.abs(np.fft.rfft(seg*np.hanning(len(seg)),n)); f=np.fft.rfftfreq(n,1/SR)
    X=20*np.log10(X+1e-12); modes=[]
    sm=np.convolve(X,np.ones(2001)/2001,'same')   # local floor ~ 1.3 kHz? (2001 bins*0.34Hz) narrow, ok
    cand=signal.find_peaks(X,distance=int(60/(SR/n)),prominence=10)[0]
    cand=[i for i in cand if fmin<f[i]<fmax]; cand.sort(key=lambda i:-X[i]); return [(f[i],X[i]) for i in cand[:K]]
def lsq_mode(c,f0,dur=0.06):
    """fit A exp(-t/tau) cos(2pi f t+phi) from onset+1.5ms; refine f,tau"""
    from scipy.optimize import least_squares
    s=c+int(0.0015*SR); seg=x[s:s+int(dur*SR)]; t=np.arange(len(seg))/SR
    # bandpass around f0 to isolate
    sos=signal.butter(4,[f0*0.97,f0*1.03],'bandpass',fs=SR,output='sos'); y=signal.sosfiltfilt(sos,seg)
    def res(p): f,tau,a,b=p; return a*np.exp(-t/tau)*np.cos(2*np.pi*f*t)+b*np.exp(-t/tau)*np.sin(2*np.pi*f*t)-y
    best=None
    for tau0 in (0.004,0.012,0.03):
        r=least_squares(res,[f0,tau0,y[:50].std()*2,0],bounds=([f0*0.98,0.0008,-2,-2],[f0*1.02,0.2,2,2]))
        if best is None or r.cost<best.cost: best=r
    f,tau,a,b=best.x; amp=np.hypot(a,b); ph=np.arctan2(-b,a)
    # energy fraction explained
    return dict(f=float(f),tau=float(tau),amp=float(amp),ph=float(ph),expl=float(1-np.sum(best.fun**2)/np.sum(y**2)))
out={}
for name,c,dur in (('down',cd,0.06),('up',cu,0.06)):
    pk=fit_modes(c,0.04,10); print(name,'peaks',[(round(f),round(d)) for f,d in pk])
    modes=[]
    for f0,_ in pk:
        mo=lsq_mode(c,f0,dur)
        if mo['expl']>0.3: modes.append(mo)
    for mo in modes: print('  mode f=%.0f tau=%.1fms amp=%.4f expl=%.2f'%(mo['f'],mo['tau']*1000,mo['amp'],mo['expl']))
    out[name]=modes
json.dump(out,open('mouse_modes.json','w'))

# second pass: slow-decaying rings, fitted on 8..44 ms after the onset and extrapolated back to the 1.5 ms mark
from scipy.optimize import least_squares
def slow_modes(c,K=4,prom=12):
    s=c+int(0.008*SR); seg=x[s:s+int(0.036*SR)]; n=1<<17; t=np.arange(len(seg))/SR
    X=20*np.log10(np.abs(np.fft.rfft(seg*np.hanning(len(seg)),n))+1e-12); f=np.fft.rfftfreq(n,1/SR)
    pk=[i for i in signal.find_peaks(X,distance=int(60/(SR/n)),prominence=prom)[0] if 300<f[i]<20000]; pk.sort(key=lambda i:-X[i])
    res_modes=[]
    for i in pk[:K]:
        f0=f[i]; y=signal.sosfiltfilt(signal.butter(4,[f0*0.985,f0*1.015],'bandpass',fs=SR,output='sos'),seg)
        def res(p): fr,tau,a,b=p; return np.exp(-t/tau)*(a*np.cos(2*np.pi*fr*t)+b*np.sin(2*np.pi*fr*t))-y
        best=None
        for tau0 in (0.01,0.03,0.08):
            r=least_squares(res,[f0,tau0,y[:100].std()*2,0],bounds=([f0*0.99,0.003,-1,-1],[f0*1.01,0.5,1,1]))
            if best is None or r.cost<best.cost: best=r
        fr,tau,a,b=best.x
        if 1-np.sum(best.fun**2)/np.sum(y**2)<0.5: continue
        shift=0.0065/tau   # 8 ms -> 1.5 ms mark
        # phase referred to the 1.5 ms mark: advance by 6.5 ms
        ph=np.arctan2(-b,a)+2*np.pi*fr*(-0.0065)
        res_modes.append(dict(f=float(fr),tau=float(tau),amp=float(np.hypot(a,b)*np.exp(shift)),ph=float(ph),expl=1.0))
    return res_modes
for name,c in (('down',cd),('up',cu)):
    sm=slow_modes(c); out[name]+=sm; print(name,'slow',[(round(m['f']),round(m['tau']*1000,1),round(m['amp'],4)) for m in sm])
json.dump(out,open('mouse_modes.json','w'))
