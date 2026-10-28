import numpy as np
from scipy import signal
SR=44100
NB=36; FLO=70.0; FHI=16000.0
def erbn(f): return 21.4*np.log10(4.37*f/1000+1)
def inv_erbn(n): return (10**(n/21.4)-1)/4.37*1000
def centers():
    n=np.linspace(erbn(FLO),erbn(FHI),NB); return inv_erbn(n)
def erb(f): return 24.7*(4.37*f/1000+1)
def coefs(fc,sr=SR):
    q=fc/(1.6*erb(fc))
    w=2*np.pi*fc/sr; c=np.cos(w); s=np.sin(w); al=s/(2*q); a0=1+al
    b=np.array([al,0,-al])/a0; a=np.array([1,-2*c/a0,(1-al)/a0]); return b,a
FC=centers()
def bandpass(x,k,sr=SR):
    b,a=coefs(FC[k],sr); return signal.lfilter(b,a,x)
def bank_resp(sr=SR):
    f=np.fft.rfftfreq(8192,1/sr); tot=np.zeros_like(f)
    for k in range(NB):
        b,a=coefs(FC[k],sr); w,h=signal.freqz(b,a,worN=2*np.pi*f/sr); tot+=np.abs(h)**4
    return f,tot
if __name__=='__main__':
    print(np.round(FC)); f,t=bank_resp(); sel=(f>100)&(f<15000); r=10*np.log10(t[sel]); print('ripple dB',r.min(),r.max(),r.mean())
