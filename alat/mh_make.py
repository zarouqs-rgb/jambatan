import sys;sys.path.insert(0,'.')
from mh_build import *
def eyeinfo(head):
    e=(head['eye.L']+head['eye.R'])/2;return e
def hair_shape(P,head):
    e=(head['eye.L']+head['eye.R'])/2;c=np.array([0,e[1]+.05,e[2]-.75]);R=np.array([.84,1.12,1.06])
    out=P.copy()
    for i,p in enumerate(P):
        d=p-c;r=np.linalg.norm(d);u=d/(r+1e-9);re=1/np.sqrt(((u/R)**2).sum())
        out[i]=c+u*max(r+.08,re*(1 if d[1]>.3 else max(.0,min(1,(d[1]+.4)/.7))))
    return out
def man_spec(shirt_c=(.18,.33,.6),pants_c=(.13,.14,.18),shoe_c=(.92,.92,.9),skin=(.78,.57,.44),eth='asian',old=False):
    def shirt(dom,V,head):
        cy=head['upperleg01.L'][1]
        return lambda v:dom[v] in TORSO or dom[v] in UARM or (dom[v] in LEGS and V[v][1]>cy-.2)
    def trousers(dom,V,head):
        cy=head['upperleg01.L'][1]
        return lambda v:dom[v] in LEGS or (dom[v] in ('root','spine05','spine04') and V[v][1]<cy+1.3)
    def shoes(dom,V,head):return lambda v:FOOT(dom[v])
    def hair(dom,V,head):
        e=eyeinfo(head)
        return lambda v:HEADB(dom[v]) and (V[v][1]>e[1]+.4 or (V[v][2]<e[2]-.85 and V[v][1]>e[1]-.55))
    return {'targets':[('macrodetails/universal-male-young-averagemuscle-averageweight.target',1),('macrodetails/%s-male-young.target'%eth,1)],
      'skin':list(skin),'lip':[.66,.4,.37],'brow':[.1,.07,.06],'iris':[.25,.15,.08],
      'clothes':[{'name':'shirt','pred':shirt,'col':list(shirt_c),'off':.1},{'name':'trousers','pred':trousers,'col':list(pants_c),'off':.07},
                 {'name':'shoes','pred':shoes,'col':list(shoe_c),'off':.12},{'name':'hair','pred':hair,'col':[.05,.04,.04],'off':.1,'reshape':hair_shape}]}
def skirt_shape(P,head):
    hy=head['upperleg01.L'][1]+.6;out=P.copy();zc=head['root'][2]
    for i,p in enumerate(P):
        h=hy-p[1]
        if h<=0:continue
        k=min(1,h/1.5)
        rx=1.55+.5*h/8;rz=1.25+.4*h/8
        d=np.array([p[0],0,p[2]-zc]);u=d/(np.hypot(d[0]/rx,d[2]/rz)+1e-9)
        tgt=np.array([u[0],p[1],u[2]+zc])
        if np.hypot(p[0]/rx,(p[2]-zc)/rz)<1: out[i]=p*(1-k)+tgt*k
    return out
def drape_shape(P,head):
    out=P.copy()
    D2=((P[:,None,:]-P[None,:,:])**2).sum(-1)
    Wm=np.exp(-D2/(.3**2));Wm/=Wm.sum(1,keepdims=True)
    for _ in range(3): out=Wm@out
    # jangan masuk ke dalam: kekal sekurang-kurangnya pada kedudukan asal arah ke depan
    out[:,2]=np.maximum(out[:,2],P[:,2]-.05)
    return out
def hijab_shape(P,head):
    c=(head['head']+head['eye.L']*.0+head['eye.R']*.0);e=(head['eye.L']+head['eye.R'])/2
    c=np.array([0,e[1]+.05,e[2]-.75])
    R=np.array([1.08,1.32,1.2])
    out=P.copy()
    for i,p in enumerate(P):
        d=p-c;r=np.linalg.norm(d);u=d/(r+1e-9)
        re=1/np.sqrt(((u/R)**2).sum())
        if d[1]>-1.2: out[i]=c+u*max(r+.12,re*min(1,(d[1]+1.6)/.6))
        else:
            rr=np.hypot(d[0],d[2]-.15);tr=max(rr+.12,.78)
            out[i]=np.array([c[0]+d[0]/(rr+1e-9)*tr,p[1],c[2]+.15+(d[2]-.15)/(rr+1e-9)*tr])
    D2=((out[:,None,:]-out[None,:,:])**2).sum(-1);Wm=np.exp(-D2/(.18**2));Wm/=Wm.sum(1,keepdims=True)
    sm_=Wm@out
    for _ in range(2): sm_=Wm@sm_
    c2=np.array([0,e[1]+.05,e[2]-.75]) if 'e' in dir() else None
    r0=np.linalg.norm(out-c,axis=1);r1=np.linalg.norm(sm_-c,axis=1)
    return c+(sm_-c)*(np.maximum(r0,r1)/(r1+1e-9))[:,None]
def mom_spec(baju_c=(.93,.6,.62),hij_c=(.97,.92,.85),shoe_c=(.2,.18,.22),preg=True,skin=(.8,.6,.47)):
    def baju(dom,V,head):
        cy=head['upperleg01.L'][1]
        return lambda v:(dom[v] in TORSO and dom[v]!='neck01') or dom[v] in UARM or dom[v] in LARM or (dom[v] in LEGS and V[v][1]>cy+.2)
    def legs(dom,V,head):
        cy=head['upperleg01.L'][1]
        return lambda v:dom[v] in LEGS or (dom[v] in ('root','spine05','spine04') and V[v][1]<cy+.9)
    def shoes(dom,V,head):return lambda v:FOOT(dom[v])
    def hijab(dom,V,head):
        e=eyeinfo(head);ch=head['jaw']
        def f(v):
            p=V[v];d=dom[v]
            if d in TORSO and p[1]>e[1]-1.75: return True
            if HEADB(d) or d in ('neck01',):
                yc=e[1]-.3
                face=p[2]>e[2]-.5 and (p[0]/.6)**2+((p[1]-yc)/.72)**2<1
                return not face
            return False
        return f
    def drape(dom,V,head):
        e=eyeinfo(head)
        return lambda v:(dom[v] in TORSO or dom[v] in ('neck01','neck02')) and V[v][1]>e[1]-4.6
    return {'targets':[('macrodetails/universal-female-young-averagemuscle-averageweight.target',1),('macrodetails/asian-female-young.target',1),('breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target',1)]+([('stomach/stomach-pregnant-incr.target',1)] if preg else []),
      'skin':list(skin),'lip':[.72,.4,.4],'brow':[.12,.08,.06],'iris':[.25,.15,.08],
      'clothes':[{'name':'baju','pred':baju,'col':list(baju_c),'off':.08},{'name':'kain','pred':legs,'col':[c*.96 for c in baju_c],'off':.06},
                 {'name':'shoes','pred':shoes,'col':list(shoe_c),'off':.15},{'name':'drape','pred':drape,'col':list(hij_c),'off':.3,'reshape':drape_shape},
                 {'name':'hijab','pred':hijab,'col':list(hij_c),'off':.12,'reshape':hijab_shape}],
      'skirt':list(baju_c)}
if __name__=='__main__':
    import os;D='/home/claude/jambatan/model/';os.makedirs(D,exist_ok=True)
    build(man_spec(),D+'pemuda.glb')
    build(mom_spec(),D+'ibu.glb')
    build(man_spec((.25,.55,.35),(.35,.3,.25),(.15,.12,.1),(.72,.52,.4)),D+'lelaki2.glb')
    build(man_spec((.92,.92,.9),(.25,.3,.42),(.1,.1,.1),(.62,.45,.34),'african'),D+'lelaki3.glb')
    build(mom_spec((.3,.45,.75),(.45,.3,.55),(.1,.1,.12),False),D+'wanita2.glb')
    build(mom_spec((.15,.15,.18),(.55,.55,.6),(.1,.1,.1),False,(.85,.66,.53)),D+'wanita3.glb')
