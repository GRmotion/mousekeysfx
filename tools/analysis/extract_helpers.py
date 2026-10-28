import numpy as np
import bank
SR=44100; NB=bank.NB
GRID=np.r_[np.arange(0,20.01,0.5),np.arange(22,80.01,2)]
PRE=1.0
def band_env(x,k):
    y=bank.bandpass(x,k); fc=bank.FC[k]
    win=int(SR*min(0.006,max(0.0005,1.2/bank.erb(fc))))
    p=np.convolve(y**2,np.hanning(win)/np.hanning(win).sum(),'same'); return np.sqrt(p+1e-20)
FLOOR=None
def set_floor(sig):
    global FLOOR
    FLOOR=np.array([np.median(band_env(sig[:SR*30],k))**2 for k in range(NB)])
def template(x,c,clean_ms,floor_db=None):
    """x full signal, c onset sample"""
    s=c-int((PRE+4)*SR/1000); n=int(0.130*SR); seg=np.zeros(n); part=x[max(s,0):s+n]; seg[:len(part)]=part
    out=np.zeros((len(GRID),NB)); t0=int(4*SR/1000)
    for k in range(NB):
        e=band_env(seg,k)
        if FLOOR is not None: e=np.sqrt(np.maximum(e**2-1.3*FLOOR[k],0.02*e**2))   # remove recording noise floor
        db=20*np.log10(e+1e-12)
        tt=t0+(GRID*SR/1000).astype(int); v=db[np.minimum(tt,len(db)-1)]
        iclean=np.searchsorted(GRID,clean_ms-PRE)
        tail=v[max(0,iclean-8):iclean]; tg=GRID[max(0,iclean-8):iclean]
        sl=min(np.polyfit(tg,tail,1)[0],-0.35) if len(tail)>=3 else -0.8
        for i in range(iclean,len(GRID)): v[i]=v[iclean-1]+sl*(GRID[i]-GRID[iclean-1])
        v=np.maximum(v,-110); v[v<-104]=-120
        out[:,k]=v
    return out
