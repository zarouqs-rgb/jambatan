import json, struct, sys, numpy as np, os, re
DATA='/tmp/mh/makehuman/data'
def load_obj():
    V=[];F={};g=None
    for line in open(DATA+'/3dobjs/base.obj'):
        if line.startswith('v '):V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('g '):g=line.split()[1].strip();F.setdefault(g,[])
        elif line.startswith('f '):F[g].append([int(t.split('/')[0])-1 for t in line.split()[1:]])
    return np.array(V,np.float64),F
def target(name,w=1.0):
    off={}
    for line in open(DATA+'/targets/'+name):
        if line[0]=='#' or not line.strip():continue
        p=line.split();off[int(p[0])]=np.array([float(x) for x in p[1:4]])*w
    return off
def apply(V,offs):
    V=V.copy()
    for o in offs:
        for i,d in o.items():V[i]+=d
    return V
def tri(faces):
    T=[]
    for f in faces:
        for k in range(1,len(f)-1):T.append([f[0],f[k],f[k+1]])
    return np.array(T,np.int64)
def vnormals(V,T):
    N=np.zeros_like(V);fn=np.cross(V[T[:,1]]-V[T[:,0]],V[T[:,2]]-V[T[:,0]])
    for k in range(3):np.add.at(N,T[:,k],fn)
    return N/(np.linalg.norm(N,axis=1,keepdims=True)+1e-12)

def build(spec,out):
    V0,F=load_obj()
    offs=[target(t,w) for t,w in spec['targets']]
    V=apply(V0,offs)
    sk=json.load(open(DATA+'/rigs/default.mhskel'))
    J={k:V[v].mean(0) for k,v in sk['joints'].items()}
    bones=sk['bones'];names=[]
    def order(b):
        if b in names:return
        p=bones[b]['parent']
        if p:order(p)
        names.append(b)
    for b in bones:order(b)
    bi={b:i for i,b in enumerate(names)}
    head={b:J[bones[b]['head']] for b in names}
    tail={b:J[bones[b]['tail']] for b in names}
    wts=json.load(open(DATA+'/rigs/default_weights.mhw'))['weights']
    NV=len(V);WL=[[] for _ in range(NV)]
    for b,lst in wts.items():
        for vid,w in lst:WL[vid].append((w,bi[b]))
    JI=np.zeros((NV,4),np.uint16);WW=np.zeros((NV,4),np.float32)
    for i,l in enumerate(WL):
        l=sorted(l,reverse=True)[:4]
        if not l:l=[(1.0,bi['root'])]
        s=sum(w for w,_ in l)
        for k,(w,b) in enumerate(l):JI[i,k]=b;WW[i,k]=w/s
    dom=np.array([names[JI[i,0]] for i in range(NV)])
    S=0.1  # desimeter -> meter
    parts=[]  # (Vidx array, tris(local), colors, offset normal amount)
    bodyT=tri(F['body']);N=vnormals(V,bodyT)
    def region(pred):return np.array([pred(i) for i in range(NV)])
    col=np.tile(np.array(spec['skin'],np.float32),(NV,1))
    # bibir & kening dicat terus pada kulit
    lipb={'oris01','oris02','oris03.L','oris03.R','oris04.L','oris04.R','oris05','oris06','oris06.L','oris06.R','oris07.L','oris07.R'}
    mc=np.mean([head[b] for b in lipb],0)
    for i in range(NV):
        d=V[i]-mc
        if dom[i] in lipb and (d[0]/.26)**2+(d[1]/.11)**2<1 and d[2]>-.15: col[i]=np.array(spec['lip'],np.float32)
    layers=[('body',bodyT,col,0.0,None)]
    # mata
    for side,g in [('L','helper-l-eye'),('R','helper-r-eye')]:
        T=tri(F[g]);vids=np.unique(T);c=np.tile(np.array([.95,.95,.94],np.float32),(NV,1))
        ctr=V[vids].mean(0);fwd=np.array([0,0,1.0])
        for i in vids:
            d=V[i]-ctr;d/=np.linalg.norm(d)+1e-9;a=d@fwd
            if a>.93:c[i]=[.03,.02,.02]
            elif a>.78:c[i]=spec['iris']
        layers.append(('eye'+side,T,c,0.0,None))
    for g in ['helper-upper-teeth','helper-lower-teeth']:
        layers.append((g,tri(F[g]),np.tile(np.array([.92,.9,.85],np.float32),(NV,1)),0.0,None))
    for g in [k for k in F if 'eyelashes' in k]:
        T=tri(F[g]);ok=[t for t in T if min(np.linalg.norm(V[t].mean(0)-head['eye.L']),np.linalg.norm(V[t].mean(0)-head['eye.R']))<.32]
        if ok: layers.append((g,np.array(ok),np.tile(np.array([.05,.04,.04],np.float32),(NV,1)),0.0,None))
    # pakaian = lapisan kulit yang dianjak keluar (ikut rangka yang sama, tak tertanggal)
    def body_sub(pred):
        keep=[t for t in bodyT if all(pred(v) for v in t)]
        return np.array(keep,np.int64)
    for c in spec['clothes']:
        pred=c['pred'](dom,V,head);T=body_sub(pred)
        layers.append((c['name'],T,np.tile(np.array(c['col'],np.float32),(NV,1)),c['off'],c.get('reshape')))
    # kening: tiub nipis atas permukaan kulit, ikut berat verteks terdekat
    extra=[]
    bv=np.unique(bodyT)
    for side in ['L','R']:
        e=head['eye.'+side];sg=np.sign(e[0])
        pts=[]
        for k in range(16):
            xo=-.16+.52*k/15;y=e[1]+.3+.045*(1-((xo-.1)/.28)**2);x=e[0]+xo*sg
            m=(np.abs(V[bv,0]-x)<.12)&(np.abs(V[bv,1]-y)<.12)&(V[bv,2]>e[2]-.3)
            cand=bv[m]
            if len(cand)==0:continue
            dd=np.hypot(V[cand,0]-x,V[cand,1]-y);wv=np.exp(-(dd/.05)**2)+1e-6
            z=(V[cand,2]*wv).sum()/wv.sum();nn=(N[cand]*wv[:,None]).sum(0);nn/=np.linalg.norm(nn)
            vi=cand[np.argmin(dd)];pts.append((np.array([x,y,z])+nn*.03,vi,nn))
        th=lambda k:.022+.02*np.sin(np.pi*min(1,(k+2)/len(pts)))
        for k in range(len(pts)-1):
            (a,va,na),(b,vb,nb)=pts[k],pts[k+1]
            up=np.array([0,1.0,0])
            q=[a-up*th(k),a+up*th(k),b+up*th(k+1),b-up*th(k+1)]
            extra.append((q,[na,na,nb,nb],[va,va,vb,vb]))
    # himpun semua lapisan jadi satu mesh
    P=[];NN=[];C=[];JJ=[];WWl=[];I=[]
    for name,T,c,off,rs in layers:
        if len(T)==0:continue
        vids,inv=np.unique(T,return_inverse=True)
        nl=vnormals(V,T)[vids] if name not in ('body',) else N[vids]
        if name.startswith('eye') or 'teeth' in name or 'eyelash' in name: nl=vnormals(V,T)[vids]
        pos=V[vids]+nl*off
        if rs:
            pos=rs(pos,head);Tl=inv.reshape(-1,3);nl=vnormals(pos,Tl)
        base=len(np.concatenate(P)) if P else 0
        P.append(pos);NN.append(nl);C.append(c[vids]);JJ.append(JI[vids]);WWl.append(WW[vids]);I.append(inv.reshape(-1,3)+base)
    for q,ns,vs in extra:
        base=len(np.concatenate(P))
        P.append(np.array(q));NN.append(np.array(ns));C.append(np.tile(np.array(spec['brow'],np.float32),(4,1)));JJ.append(JI[vs]);WWl.append(WW[vs])
        I.append(np.array([[base,base+1,base+2],[base,base+2,base+3]]))
    if spec.get('skirt'):
        hy=head['upperleg01.L'][1]+.7;ay=head['foot.L'][1]+.35;zc=(head['upperleg01.L'][2]+head['upperleg01.R'][2])/2
        bv2=bodyT.reshape(-1);NR,NA=14,40
        sc=np.array(spec['skirt'],np.float32);base=len(np.concatenate(P))
        pos=[];nor=[];jj=[];ww=[]
        def bidx(n):return names.index(n)
        for r in range(NR):
            k=r/(NR-1);y=hy*(1-k)+ay*k
            band=bv[(np.abs(V[bv,1]-y)<.15)&np.array([not dom[q].startswith(('upperarm','lowerarm','wrist','finger','metacarpal')) for q in bv])]
            for a_i in range(NA):
                a=2*np.pi*a_i/NA;dx,dz=np.cos(a),np.sin(a)
                # jejari: lebih besar daripada badan pada aras ini
                proj=(V[band,0])*dx+(V[band,2]-zc)*dz
                rad=(proj.max() if len(band) else 1.5)+.12+.35*k
                pp=np.array([dx*rad,y,zc+dz*rad]);pos.append(pp);nor.append([dx,0,dz])
                side='L' if dx>0 else 'R';m=min(1,abs(dx)/.5)
                if k<.15: bl=[(bidx('root'),1.0)]
                else:
                    seg='upperleg01' if k<.55 else 'lowerleg01'
                    bl=[(bidx(seg+'.'+side),.5+.5*m),(bidx(seg+'.'+('R' if side=='L' else 'L')),.5-.5*m)]
                    if k<.3: bl=[(b,w*(k-.15)/.15) for b,w in bl]+[(bidx('root'),1-(k-.15)/.15)]
                j4=[0,0,0,0];w4=[0,0,0,0]
                for q,(b,w) in enumerate(bl[:4]):j4[q]=b;w4[q]=w
                sw=sum(w4);jj.append(j4);ww.append([w/sw for w in w4])
        tris=[]
        for r in range(NR-1):
            for a_i in range(NA):
                a0=r*NA+a_i;a1=r*NA+(a_i+1)%NA;b0=a0+NA;b1=a1+NA
                tris+= [[base+a0,base+b0,base+b1],[base+a0,base+b1,base+a1]]
        P.append(np.array(pos));NN.append(np.array(nor));C.append(np.tile(sc,(len(pos),1)));JJ.append(np.array(jj));WWl.append(np.array(ww,np.float32));I.append(np.array(tris))
    P=(np.concatenate(P)*S).astype(np.float32);NN=np.concatenate(NN).astype(np.float32);C=(np.concatenate(C).astype(np.float32))**2.2
    JJ=np.concatenate(JJ).astype(np.uint16);WWl=np.concatenate(WWl).astype(np.float32);I=np.concatenate(I).astype(np.uint32)
    # kaki di lantai
    ymin=P[:,1].min();P[:,1]-=ymin
    H={b:(head[b]*S-np.array([0,ymin,0])) for b in names};TL={b:(tail[b]*S-np.array([0,ymin,0])) for b in names}
    write_glb(out,P,NN,C,JJ,WWl,I,names,bones,H,TL)
    print(out,len(P),'verts',len(I),'tris',len(names),'bones')

def write_glb(out,P,N,C,J,W,I,names,bones,H,TL):
    bufs=[];views=[];acc=[]
    def addbuf(arr,target=None,comp=5126,typ='VEC3',minmax=False):
        b=arr.tobytes();off=sum(len(x) for x in bufs)
        pad=(-len(b))%4;bufs.append(b+b'\0'*pad)
        v={'buffer':0,'byteOffset':off,'byteLength':len(b)}
        if target:v['target']=target
        views.append(v);a={'bufferView':len(views)-1,'componentType':comp,'count':len(arr),'type':typ}
        if minmax:a['min']=arr.min(0).tolist();a['max']=arr.max(0).tolist()
        acc.append(a);return len(acc)-1
    aP=addbuf(P,34962,minmax=True);aN=addbuf(N,34962);aC=addbuf(C,34962);aJ=addbuf(J,34962,5123,'VEC4');aW=addbuf(W,34962,5126,'VEC4')
    aI=addbuf(I.reshape(-1),34963,5125,'SCALAR')
    nodes=[];bi={b:i for i,b in enumerate(names)}
    for b in names:
        p=bones[b]['parent'];t=H[b]-(H[p] if p else 0)
        nodes.append({'name':b.replace('.','_'),'translation':[float(x) for x in t]})
    for b in names:
        ch=[bi[c] for c in names if bones[c]['parent']==b]
        if ch:nodes[bi[b]]['children']=ch
    IBM=np.zeros((len(names),16),np.float32)
    for i,b in enumerate(names):
        m=np.eye(4,dtype=np.float32);m[:3,3]=-H[b];IBM[i]=m.T.reshape(-1)
    aIBM=addbuf(IBM,None,5126,'MAT4')
    mi=len(nodes);nodes.append({'name':'body','mesh':0,'skin':0})
    root=bi['root']
    g={'asset':{'version':'2.0','generator':'jambatan-mh'},'scene':0,'scenes':[{'nodes':[root,mi]}],'nodes':nodes,
       'meshes':[{'primitives':[{'attributes':{'POSITION':aP,'NORMAL':aN,'COLOR_0':aC,'JOINTS_0':aJ,'WEIGHTS_0':aW},'indices':aI,'material':0}]}],
       'materials':[{'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':.75},'doubleSided':True}],
       'skins':[{'joints':list(range(len(names))),'inverseBindMatrices':aIBM,'skeleton':root}],
       'accessors':acc,'bufferViews':views,'buffers':[{'byteLength':sum(len(x) for x in bufs)}],
       'extras':{'tails':{b:[float(x) for x in TL[b]] for b in names}}}
    js=json.dumps(g).encode();js+=b' '*((-len(js))%4);bin_=b''.join(bufs)
    with open(out,'wb') as f:
        f.write(struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bin_)))
        f.write(struct.pack('<II',len(js),0x4E4F534A));f.write(js)
        f.write(struct.pack('<II',len(bin_),0x004E4942));f.write(bin_)

TORSO={'spine01','spine02','spine03','spine04','spine05','clavicle.L','clavicle.R','shoulder01.L','shoulder01.R','breast.L','breast.R','neck01','root'}
UARM={'upperarm01.L','upperarm01.R','upperarm02.L','upperarm02.R'}
LARM={'lowerarm01.L','lowerarm01.R','lowerarm02.L','lowerarm02.R'}
LEGS={'pelvis.L','pelvis.R','upperleg01.L','upperleg01.R','upperleg02.L','upperleg02.R','lowerleg01.L','lowerleg01.R','lowerleg02.L','lowerleg02.R'}
FOOT=lambda d:d.startswith('foot') or d.startswith('toe')
HEADB=lambda d:d in ('head','neck02','neck03','jaw') or d.startswith(('temporalis','special','levator','oculi','orbicularis','risorius','oris','eye','tongue'))
