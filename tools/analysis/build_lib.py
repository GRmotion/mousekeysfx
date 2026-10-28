import numpy as np, json, wave, base64, os
import bank, extract_helpers as eh
SR=44100; NB=bank.NB
REF='/tmp/claude-0/-home-user-mousekeysfx/1ce88e73-697c-55ed-91e9-2d821ba2e0dc/scratchpad/ref/'
m=np.load(REF+'kb_L.npy'); eh.set_floor(m); on=np.load(REF+'on2.npy'); pairs=np.load(REF+'pairs.npy'); press=np.load(REF+'press.npy')
def rms_win(x,c,ms=10): s=c-int(0.001*SR); y=x[s:s+int(ms*SR/1000)]; return float(np.sqrt((y**2).mean()))
def feats(x,c):
    s=c-int(0.001*SR); y=x[s:s+int(0.040*SR)]; X=np.abs(np.fft.rfft(y*np.hanning(len(y)),4096))**2; f=np.fft.rfftfreq(4096,1/SR); t=X.sum()
    return X[f<300].sum()/t,(X*f).sum()/t
def pick(idx,k,key):
    idx=sorted(idx,key=key)
    return idx if len(idx)<=k else [idx[int(round(i*(len(idx)-1)/(k-1)))] for i in range(k)]
def pack(tpls):
    q=np.concatenate([np.clip(np.round((T+110)*2),0,255).astype(np.uint8).flatten() for T,_ in tpls])
    return {'n':len(tpls),'r':[float('%.6g'%r) for _,r in tpls],'d':base64.b64encode(q.tobytes()).decode()}
Fp={i:feats(m,on[i]) for i in press}
thr=np.percentile([Fp[i][0] for i in press],85)
big=[i for i in press if Fp[i][0]>=thr]; reg=[i for i in press if Fp[i][0]<thr]
selreg=pick(reg,20,lambda i:Fp[i][1]); selbig=pick(big,8,lambda i:Fp[i][1])
rels=[j for _,j in pairs]; Fr={j:feats(m,on[j]) for j in rels}; selrel=pick(rels,16,lambda j:Fr[j][1])
mk=lambda ids,clean:[(eh.template(m,on[i],clean),rms_win(m,on[i])) for i in ids]
ref_rms=float(np.mean([rms_win(m,on[i]) for i in press]))
floorv=[float('%.4g'%v) for v in np.sqrt(eh.FLOOR)]
lib={'floor':floorv,'grid':eh.GRID.tolist(),'nb':NB,'fc':[round(float(v),2) for v in bank.FC],'pre':eh.PRE,'refRms':ref_rms,
     'kbDown':pack(mk(selreg,42)),'kbBig':pack(mk(selbig,42)),'kbUp':pack(mk(selrel,36))}
# mouse (separate recording, no floor subtraction)
eh.FLOOR=None
w=wave.open(REF+'mouse_ref.wav'); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16)/32768.0
modes=json.load(open('mouse_modes.json'))
cd,cu=int(0.037528*SR),int(0.106054*SR)
def resid(c,ms):
    y=x.copy(); n0=c+int(0.0015*SR); t=np.arange(len(y)-n0)/SR
    for mo in ms:
        y[n0:]-=mo['amp']*np.exp(-t/mo['tau'])*np.cos(2*np.pi*mo['f']*t+mo['ph'])
    return y
# note: lsq_mode's model a*cos+b*sin with ph=arctan2(-b,a): a*cos(wt)+b*sin(wt)=amp*cos(wt+ph)
for name,c,clean in (('mDown',cd,64),('mUp',cu,70)):
    ms=modes['down' if name=='mDown' else 'up']; y=resid(c,ms)
    T=eh.template(y,c,clean); r=rms_win(x,c)
    lib[name]={'n':1,'r':[float('%.6g'%r)],'d':pack([(T,r)])['d'],'modes':[{k:float('%.5g'%v) for k,v in mo.items() if k!='expl'} for mo in ms]}
json.dump(lib,open('lib.json','w'),separators=(',',':'))
print('lib KB',os.path.getsize('lib.json')/1024,'refRms dB',20*np.log10(ref_rms),'mouse rms dB',[20*np.log10(lib[k]['r'][0]) for k in ('mDown','mUp')])
