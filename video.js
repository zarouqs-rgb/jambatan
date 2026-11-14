// Adegan 3D: dalam MRT, pemuda memberi tempat duduk kepada ibu mengandung.
// Watak penuh: muka (mata, anak mata, kelopak berkelip, kening, hidung, bibir, telinga), tangan lima jari, rambut, tudung.
(function(){
'use strict';
const W=1080,H=1920,D=20.4;
const BEATS=[.3,4.4,7.4,9.8,13.2,16.4];
const cv=document.createElement('canvas');cv.width=W;cv.height=H;
const gl=cv.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
const {sin,cos,PI,atan2,hypot,max,min,sqrt,abs,tan}=Math;
const cl=(x,a=0,b=1)=>max(a,min(b,x)),sm=x=>{x=cl(x);return x*x*(3-2*x)},seg=(t,a,b)=>sm((t-a)/(b-a));
const win=(t,a,b,f=.3)=>seg(t,a,a+f)*(1-seg(t,b-f,b));
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mv=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>hypot(a[0],a[1],a[2]),nrm=a=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l]};
const lerp=(a,b,k)=>a+(b-a)*k,lv=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
const UP=[0,1,0];

/* ================= Pembina geometri dengan rangka ================= */
class Geo{constructor(){this.d=[];}
  v(p,n,c,m){this.d.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],m||0);}
  tri(a,b,c,col,m){const n=nrm(crs(sub(b,a),sub(c,a)));this.v(a,n,col,m);this.v(b,n,col,m);this.v(c,n,col,m);}
  quad(a,b,c,d,col,m){this.tri(a,b,c,col,m);this.tri(a,c,d,col,m);}}
const FR=(o,x,y,z)=>({o,x,y,z});
const fw=(F,p)=>add(F.o,add(add(mv(F.x,p[0]),mv(F.y,p[1])),mv(F.z,p[2])));
const fd=(F,n)=>add(add(mv(F.x,n[0]),mv(F.y,n[1])),mv(F.z,n[2]));
function frameZ(o,z,yh){z=nrm(z);let x=crs(yh||UP,z);if(len(x)<1e-4)x=crs([1,0,0],z);x=nrm(x);return FR(o,x,crs(z,x),z);}
function rotF(F,yaw,pitch,roll){
  let x=F.x,y=F.y,z=F.z;
  if(yaw){const c=cos(yaw),s=sin(yaw);[x,z]=[add(mv(x,c),mv(z,-s)),add(mv(x,s),mv(z,c))];}
  if(pitch){const c=cos(pitch),s=sin(pitch);[y,z]=[add(mv(y,c),mv(z,s)),add(mv(y,-s),mv(z,c))];}
  if(roll){const c=cos(roll),s=sin(roll);[x,y]=[add(mv(x,c),mv(y,s)),add(mv(x,-s),mv(y,c))];}
  return FR(F.o,x,y,z);}
function ell(g,F,c,r,col,m,na,nb,keep){na=na||10;nb=nb||16;
  const P=(i,j)=>{const th=PI*i/na,ph=2*PI*j/nb,u=[sin(th)*cos(ph),cos(th),sin(th)*sin(ph)];
    return [fw(F,[c[0]+u[0]*r[0],c[1]+u[1]*r[1],c[2]+u[2]*r[2]]),nrm(fd(F,[u[0]/r[0],u[1]/r[1],u[2]/r[2]])),u];};
  for(let i=0;i<na;i++)for(let j=0;j<nb;j++){const a=P(i,j),b=P(i+1,j),cc=P(i+1,j+1),d=P(i,j+1);
    if(keep&&!(keep(a[2])&&keep(b[2])&&keep(cc[2])&&keep(d[2])))continue;
    g.v(a[0],a[1],col,m);g.v(b[0],b[1],col,m);g.v(cc[0],cc[1],col,m);g.v(a[0],a[1],col,m);g.v(cc[0],cc[1],col,m);g.v(d[0],d[1],col,m);}}
function cap(g,p0,p1,r0,r1,col,m,sg){sg=sg||12;const d=nrm(sub(p1,p0)),F=frameZ(p0,d,abs(d[1])>.9?[1,0,0]:UP);
  for(let i=0;i<sg;i++){const a0=2*PI*i/sg,a1=2*PI*(i+1)/sg,n0=fd(F,[cos(a0),sin(a0),0]),n1=fd(F,[cos(a1),sin(a1),0]);
    const A0=add(p0,mv(n0,r0)),A1=add(p0,mv(n1,r0)),B0=add(p1,mv(n0,r1)),B1=add(p1,mv(n1,r1));
    g.v(A0,n0,col,m);g.v(A1,n1,col,m);g.v(B1,n1,col,m);g.v(A0,n0,col,m);g.v(B1,n1,col,m);g.v(B0,n0,col,m);}
  ell(g,FR(p0,F.x,F.y,F.z),[0,0,0],[r0,r0,r0],col,m,6,sg);ell(g,FR(p1,F.x,F.y,F.z),[0,0,0],[r1,r1,r1],col,m,6,sg);}
function box(g,c,s,col,m){const hx=s[0]/2,hy=s[1]/2,hz=s[2]/2,p=(x,y,z)=>[c[0]+x,c[1]+y,c[2]+z];
  const a=p(-hx,-hy,-hz),b=p(hx,-hy,-hz),cc=p(hx,hy,-hz),d=p(-hx,hy,-hz),e=p(-hx,-hy,hz),f=p(hx,-hy,hz),gg=p(hx,hy,hz),h=p(-hx,hy,hz);
  g.quad(d,cc,b,a,col,m);g.quad(e,f,gg,h,col,m);g.quad(a,b,f,e,col,m);g.quad(h,gg,cc,d,col,m);g.quad(a,e,h,d,col,m);g.quad(b,cc,gg,f,col,m);}
function ik(s,t,l1,l2,pole){let d=sub(t,s),Dd=len(d);const m=l1+l2-.001;if(Dd>m){d=mv(d,m/Dd);Dd=m;}Dd=max(Dd,.03);
  const dn=mv(d,1/Dd),a=(l1*l1-l2*l2+Dd*Dd)/(2*Dd),h=sqrt(max(0,l1*l1-a*a)),p=nrm(sub(pole,mv(dn,dot(pole,dn))));
  return [add(add(s,mv(dn,a)),mv(p,h)),add(s,d)];}

/* ================= Muka ================= */
const SKIN=[.80,.58,.45],LIP=[.68,.38,.36],WHITE=[.96,.96,.95],BROW=[.12,.08,.06];
function face(g,Hf,o){
  const sk=o.skin||SKIN;
  const zs=(x,y)=>.098*sqrt(max(0,1-(x/.083)**2-(y/.108)**2));    // permukaan tengkorak
  ell(g,Hf,[0,0,0],[.083,.108,.098],sk,4,16,24);
  ell(g,Hf,[0,-.036,.012],[.071,.078,.086],sk,4,14,20);              // rahang (licin)
  ell(g,Hf,[0,-.074,.058],[.028,.022,.024],sk,4,8,10);              // dagu
  ell(g,Hf,[0,-.006,.094],[.011,.03,.014],sk,4,8,10);               // batang hidung
  ell(g,Hf,[0,-.029,.104],[.011,.0095,.011],sk,4,8,10);               // hujung hidung
  for(const s of [-1,1]){ell(g,Hf,[s*.011,-.034,.1],[.008,.006,.007],sk,4,5,8);
    ell(g,Hf,[s*.085,-.005,-.004],[.011,.025,.016],sk,4,6,8);}       // cuping hidung, telinga
  const look=o.look;
  for(const s of [-1,1]){const ex=s*.031,ey=.014,ec=[ex,ey,zs(ex,ey)-.003];
    ell(g,Hf,ec,[.0145,.012,.0125],WHITE,5,8,12);
    let ld=[0,0,1];if(look){const ew=fw(Hf,ec),v=nrm(sub(look,ew));ld=nrm([dot(v,Hf.x),dot(v,Hf.y),max(dot(v,Hf.z),.55)]);}
    const ic=[ec[0]+ld[0]*.006,ec[1]+ld[1]*.005,ec[2]+.0095];
    ell(g,Hf,ic,[.0072,.0072,.004],o.iris||[.3,.18,.09],5,8,12);
    ell(g,Hf,[ic[0],ic[1],ic[2]+.0028],[.0036,.0036,.0018],[.02,.02,.02],5,6,8);
    ell(g,Hf,[ic[0]+.0025,ic[1]+.0025,ic[2]+.0042],[.0013,.0013,.0008],[1,1,1],3,4,6);
    const b=cl(o.blink||0),lidH=.004+.011*b;  // kelopak atas menutup dari atas
    ell(g,Hf,[ec[0],ec[1]+.0125-lidH*.5,ec[2]+.0012],[.0158,lidH,.0128],sk,4,6,12,u=>u[2]>-.2);
    ell(g,Hf,[ec[0],ec[1]-.0115,ec[2]+.0008],[.0155,.0035,.0122],sk,4,5,10,u=>u[2]>-.2);
    const ly=ec[1]+.0125-lidH,lz=ec[2]+.0125;
    cap(g,fw(Hf,[ec[0]-.0145,ly+.001,lz-.004]),fw(Hf,[ec[0]+.0145,ly+.001,lz-.004]),.0016,.0016,[.05,.04,.04],0,5);
    const sad=o.sad||0,hap=o.happy||0,bw=o.browCol||BROW;
    const by=(x,y)=>[x,y,zs(x,y)+.003];
    const b0=by(s*.012,.041+sad*.009+hap*.002),b1=by(s*.03,.044+sad*.002+hap*.004),b2=by(s*.048,.037-sad*.006);
    cap(g,fw(Hf,b0),fw(Hf,b1),.0032,.0042,bw,0,6);cap(g,fw(Hf,b1),fw(Hf,b2),.0042,.0026,bw,0,6);
  }
  const smile=o.smile||0,open=o.talk?(.5+.5*sin(o.talk))*.01:0,w=.022+smile*.005;
  const curve=(x,yo)=>[x,-.058+yo+smile*.01*(x/w)*(x/w)-(o.sad||0)*.004*(x/w)*(x/w),.099-.022*(x/w)*(x/w)];
  if(open>.001)ell(g,Hf,[0,-.06-open*.4,.094],[w*.75,open*.6+.002,.008],[.25,.06,.06],0,6,10);
  let prev=null;for(let k=0;k<=8;k++){const x=-w+2*w*k/8,p=fw(Hf,curve(x,.0035)),q=fw(Hf,curve(x,-.0045-open));
    if(prev){cap(g,prev[0],p,.0028,.0028,LIP,4,6);cap(g,prev[1],q,.0036,.0036,LIP,4,6);}prev=[p,q];}
}

/* ================= Tangan lima jari ================= */
function hand(g,Fh,col,curl,thumbIn){
  ell(g,Fh,[0,0,.045],[.038,.016,.05],col,4,8,12);
  const fx=[-.026,-.009,.009,.026],fl=[.042,.048,.046,.036];
  for(let i=0;i<4;i++){let p=fw(Fh,[fx[i]*.95,0,.088]),a=0;const L=fl[i]/2;
    for(let k=0;k<2;k++){a+=curl*(k?1.1:.9);const dir=nrm(add(mv(Fh.z,cos(a)),mv(Fh.y,-sin(a))));const q=add(p,mv(dir,L));
      cap(g,p,q,.0095-k*.0015,.0085-k*.0015,col,4,7);p=q;}}
  const tb=fw(Fh,[.04,-.008,.03]);const td=nrm(add(add(mv(Fh.x,.7),mv(Fh.z,.7)),mv(Fh.y,-.3*(thumbIn||0))));
  const t1=add(tb,mv(td,.03)),td2=nrm(add(td,mv(Fh.z,.5+(thumbIn||0))));cap(g,tb,t1,.012,.0105,col,4,7);cap(g,t1,add(t1,mv(td2,.028)),.0105,.009,col,4,7);
}

/* ================= Badan ================= */
function person(g,st){
  const fwdv=[sin(st.yaw),0,cos(st.yaw)],B=frameZ([0,0,0],fwdv,UP);
  const P=st.pos,lean=st.lean||0;
  const spine=nrm(add(UP,mv(fwdv,lean)));
  const C=add(P,mv(spine,.47)),N=add(C,mv(spine,.14));
  const T=FR(C,B.x,spine,nrm(crs(B.x,spine)));
  const col=st.cols,fem=st.gender==='f';
  const PF=FR(P,B.x,spine,T.z);
  ell(g,PF,[0,.02,0],[fem?.165:.155,.12,.115],col.bottom,0,10,16);
  ell(g,PF,[0,.2,.005],[fem?.135:.145,.17,.11],col.top,0,10,16);
  ell(g,T,[0,.02,0],[fem?.165:.185,.15,.115],col.top,0,10,16);
  if(fem)for(const s of [-1,1])ell(g,T,[s*.065,-.01,.075],[.06,.055,.05],col.top,0,7,10);
  if(st.belly)ell(g,PF,[0,.2,.11],[.15,.165,.15*st.belly],col.top,0,12,18);
  cap(g,add(C,mv(spine,.08)),N,.052,.048,fem&&col.hijab?col.hijab:SKIN,fem&&col.hijab?0:4,10);
  let Hf=frameZ(add(N,mv(spine,.12)),T.z,spine);Hf=rotF(Hf,st.headYaw||0,st.headPitch||0,st.headRoll||0);
  face(g,Hf,st.face||{});
  if(fem&&col.hijab){
    ell(g,Hf,[0,.004,-.004],[.098,.124,.112],col.hijab,0,14,22,u=>!(u[2]>.25&&u[1]<.62&&u[1]>-.98&&abs(u[0])<.8));
    const n0=add(N,mv(spine,.02)),RG=[[-.005,.078,1.3],[-.1,.17,1.12],[-.25,.225,1.02]],NS=32;
    const rp=(a,r)=>add(add(n0,mv(spine,r[0])),add(mv(B.x,cos(a)*r[1]),mv(T.z,sin(a)*r[1]*r[2])));
    for(let q=0;q<RG.length-1;q++)for(let k=0;k<NS;k++){const a0=2*PI*k/NS,a1=2*PI*(k+1)/NS;
      const nA=a=>nrm(add(add(mv(B.x,cos(a)),mv(T.z,sin(a))),mv(spine,.35)));
      const A0=rp(a0,RG[q]),A1=rp(a1,RG[q]),B0=rp(a0,RG[q+1]),B1=rp(a1,RG[q+1]);
      g.v(A0,nA(a0),col.hijab,0);g.v(A1,nA(a1),col.hijab,0);g.v(B1,nA(a1),col.hijab,0);g.v(A0,nA(a0),col.hijab,0);g.v(B1,nA(a1),col.hijab,0);g.v(B0,nA(a0),col.hijab,0);}
  } else if(col.hair){
    ell(g,Hf,[0,.012,-.008],[.09,.115,.106],col.hair,0,12,20,u=>u[1]>.22+.55*max(u[2],0)||(u[2]<-.15&&u[1]>-.55));
  }
  for(const sd of [1,-1]){
    const S=add(add(C,mv(B.x,sd*(fem?.15:.17))),mv(spine,.08)),Hd=sd>0?st.hL:st.hR;
    const pole=add(add(mv(B.x,sd*.5),mv(UP,-.6)),mv(fwdv,-.4));
    const [E,Wr]=ik(S,Hd,.29,.26,pole);
    ell(g,FR(S,B.x,spine,T.z),[0,-.01,0],[.05,.05,.05],col.top,0,7,10);
    cap(g,S,E,.046,.04,col.top,0,10);
    const longS=col.longSleeve;cap(g,E,Wr,.038,.03,longS?col.top:SKIN,longS?0:4,10);
    const palm=(sd>0?st.palmL:st.palmR)||[0,-1,0];
    const fz=nrm(sub(Wr,E));const Fh=frameZ(Wr,fz,mv(palm,-1));
    const Fh2=sd>0?Fh:FR(Fh.o,mv(Fh.x,-1),Fh.y,Fh.z);
    hand(g,FR(add(Wr,mv(fz,-.008)),Fh2.x,Fh2.y,Fh2.z),SKIN,(sd>0?st.curlL:st.curlR)||.35,(sd>0?st.thumbL:st.thumbR)||0);
  }
  for(const sd of [1,-1]){
    const Hp=add(add(P,mv(B.x,sd*.095)),mv(spine,-.05)),Ft=sd>0?st.fL:st.fR;
    const [K,A]=ik(Hp,Ft,.44,.43,add(fwdv,[0,.25,0]));
    cap(g,Hp,K,.075,.055,col.bottom,0,12);cap(g,K,A,.053,.04,col.bottom,0,12);
    ell(g,frameZ(A,fwdv,UP),[0,-.035,.05],[.048,.04,.12],col.shoe,0,8,12);
  }
  if(col.skirt&&!st.sit){const top=add(P,mv(spine,.05)),hem=[P[0],.22,P[2]];
    for(let k=0;k<24;k++){const a0=2*PI*k/24,a1=2*PI*(k+1)/24;
      const r=(a,y,rad)=>add(y,add(mv(B.x,cos(a)*rad),mv(fwdv,sin(a)*rad*1.1)));
      const A0=r(a0,top,.17),A1=r(a1,top,.17),B0=r(a0,hem,.27),B1=r(a1,hem,.27),nn=nrm(add(mv(B.x,cos(a0)),mv(fwdv,sin(a0))));
      g.v(A0,nn,col.bottom,0);g.v(A1,nn,col.bottom,0);g.v(B1,nn,col.bottom,0);g.v(A0,nn,col.bottom,0);g.v(B1,nn,col.bottom,0);g.v(B0,nn,col.bottom,0);}}
}

/* ================= Gerabak MRT (statik) ================= */
const g0=new Geo();
const FLOORC=[.55,.57,.6],WALLC=[.86,.88,.9],SEATC=[.18,.42,.72],POLE=[.82,.84,.86],DOORC=[.7,.72,.75],WINC=[.05,.07,.1];
const ZW=1.45,XL=-7,XR=7,HC=2.25;
g0.quad([XL,0,-ZW],[XL,0,ZW],[XR,0,ZW],[XR,0,-ZW],FLOORC,1);
g0.quad([XL,HC,-ZW],[XR,HC,-ZW],[XR,HC,ZW],[XL,HC,ZW],WALLC,0);
for(const s of [-1,1]){const z=s*ZW;
  g0.quad([XL,0,z],[XR,0,z],[XR,.95,z],[XL,.95,z],WALLC,0);
  g0.quad([XL,1.75,z],[XR,1.75,z],[XR,HC,z],[XL,HC,z],WALLC,0);
  g0.quad([XL,.95,z-s*.01],[XR,.95,z-s*.01],[XR,1.75,z-s*.01],[XL,1.75,z-s*.01],WINC,5);
  for(let x=XL;x<=XR;x+=1.6)box(g0,[x,1.35,z-s*.02],[.08,.8,.04],WALLC,0);
  box(g0,[0,.44,z-s*.24],[9,.08,.48],SEATC,2);box(g0,[0,.22,z-s*.06],[9,.44,.12],[.75,.77,.8],0);
  box(g0,[0,.75,z-s*.03],[9,.6,.06],SEATC,2);
  for(let x=-4.5;x<=4.5;x+=.6)box(g0,[x,.49,z-s*.24],[.01,.02,.46],[.12,.3,.55],0);
  box(g0,[0,1.95,z-s*.85],[12,.035,.035],POLE,3);
  for(let x=-5.88;x<=5.9;x+=.42){const hz=z-s*.85;
    box(g0,[x,1.88,hz],[.025,.13,.012],[.15,.15,.17],0);
    for(let k=0;k<10;k++){const a0=2*PI*k/10,a1=2*PI*(k+1)/10,r=.055,c=[x,1.76,hz];
      const p=a=>[c[0]+cos(a)*r,c[1]+sin(a)*r*.9,c[2]];g0.quad(add(p(a0),[0,0,-.01]),add(p(a1),[0,0,-.01]),add(p(a1),[0,0,.01]),add(p(a0),[0,0,.01]),[.95,.82,.2],0);}}
}
for(const x of [-3.3,3.3])for(const z of [-.55,.55])box(g0,[x,HC/2,z],[.04,HC,.04],POLE,3);
for(const x of [-4.2,4.2])for(const s of [-1,1])box(g0,[x,1.0,s*(ZW-.01)],[1.3,2.0,.02],DOORC,0);
for(const s of [-1,1])box(g0,[0,HC-.02,s*.7],[13,.02,.22],[1,1,.97],7);

/* penumpang latar (statik, dibina sekali) */
const BG=new Geo();
const CL={a:{top:[.85,.35,.3],bottom:[.2,.22,.3],shoe:[.1,.1,.1],hair:[.08,.06,.05]},
  b:{top:[.25,.55,.45],bottom:[.15,.15,.2],shoe:[.9,.9,.9],hair:[.1,.07,.05]},
  c:{top:[.95,.8,.3],bottom:[.25,.3,.45],shoe:[.2,.15,.1],hijab:[.45,.25,.45],longSleeve:1},
  d:{top:[.35,.35,.4],bottom:[.12,.12,.14],shoe:[.08,.08,.08],hair:[.15,.15,.15]},
  e:{top:[.5,.7,.9],bottom:[.4,.35,.3],shoe:[.3,.2,.1],hijab:[.2,.4,.6],longSleeve:1}};
function seated(x,zs,cols,gender,opts){opts=opts||{};const yaw=zs<0?0:PI,f=[sin(yaw),0,cos(yaw)],L=[cos(yaw),0,-sin(yaw)];
  const z=zs*(ZW-.36),P=[x,.56,z],knee=add(P,mv(f,.42));
  const ph=opts.phone;
  const hands=ph?[add(add(P,mv(f,.33)),add(mv(L,.05),[0,.2,0])),add(add(P,mv(f,.33)),add(mv(L,-.05),[0,.2,0]))]:[add(add(P,mv(f,.3)),add(mv(L,.14),[0,.05,0])),add(add(P,mv(f,.3)),add(mv(L,-.14),[0,.05,0]))];
  return {pos:P,yaw,lean:-.06,headPitch:ph?.38:(opts.sleep?.3:0),headYaw:opts.hy||0,headRoll:opts.sleep?.18:0,sit:1,gender,cols,
    hL:hands[0],hR:hands[1],fL:add(add(knee,mv(L,.11)),add(mv(f,.05),[0,-.47,0])),fR:add(add(knee,mv(L,-.11)),add(mv(f,.05),[0,-.47,0])),
    palmL:ph?[0,1,0]:[0,-1,0],palmR:ph?[0,1,0]:[0,-1,0],curlL:.5,curlR:.5,face:{blink:opts.sleep?1:.15,smile:.05},phone:ph};}
const BGP=[seated(-.62,-1,CL.a,'m',{phone:1}),seated(.62,-1,CL.c,'f',{}),seated(1.24,-1,CL.d,'m',{sleep:1}),seated(-1.24,-1,CL.e,'f',{phone:1}),
  seated(-.9,1,CL.b,'m',{phone:1}),seated(-.3,1,CL.e,'f',{hy:.3}),seated(.3,1,CL.d,'m',{phone:1}),seated(.9,1,CL.a,'m',{sleep:1})];
for(const s of BGP){person(BG,s);if(s.phone){const c=lv(s.hL,s.hR,.5);box(BG,add(c,[0,.03,0]),[.075,.012,.15],[.05,.05,.06],0);}}

/* ================= WebGL ================= */
const VS=`attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;attribute float aM;uniform mat4 uVP;
varying vec3 vN,vW,vC;varying float vM;void main(){vW=aP;vN=aN;vC=aC;vM=aM;gl_Position=uVP*vec4(aP,1.);}`;
const FS=`precision highp float;uniform vec3 uEye;uniform float uT;varying vec3 vN,vW,vC;varying float vM;
void main(){vec3 n=normalize(vN),v=normalize(uEye-vW);if(dot(n,v)<0.)n=-n;vec3 b=vC;
 if(vM>6.5){gl_FragColor=vec4(1.,1.,.97,1.);return;}
 if(vM>4.5&&vM<5.5){float s=step(.93,fract(vW.x*.25+uT*3.2))*smoothstep(1.,1.6,vW.y)*smoothstep(1.75,1.5,vW.y);gl_FragColor=vec4(b+vec3(1.,.85,.6)*s*.9,1.);return;}
 vec3 L1=normalize(vec3(.15,1.,.25)),L2=normalize(vec3(-.4,.5,.6)),L3=normalize(vec3(.5,.3,-.6));
 float w=.35;
 float d1=max((dot(n,L1)+w)/(1.+w),0.),d2=max(dot(n,L2),0.),d3=max(dot(n,L3),0.);
 float hemi=.5+.5*n.y;
 vec3 c=b*(.30+.18*hemi+.55*d1+.22*d2+.12*d3);
 float sp=vM>3.5&&vM<4.5?.22:(vM>2.5&&vM<3.5?.8:(vM>1.5&&vM<2.5?.25:.08));
 float spw=vM>4.5?120.:(vM>3.5?28.:60.);
 c+=vec3(pow(max(dot(n,normalize(L1+v)),0.),spw)*sp+pow(max(dot(n,normalize(L2+v)),0.),spw)*sp*.5);
 if(vM>3.5&&vM<4.5){float rim=pow(1.-max(dot(n,v),0.),3.);c+=vec3(.9,.5,.4)*rim*.12;c+=vec3(.06,.01,0.)*(1.-d1);}
 if(vM>.5&&vM<1.5){c*=.92+.08*step(.5,fract(vW.x*1.2));}
 gl_FragColor=vec4(pow(c,vec3(.95)),1.);}`;
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;}
const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));
['aP','aN','aC','aM'].forEach((n,i)=>gl.bindAttribLocation(prog,i,n));gl.linkProgram(prog);gl.useProgram(prog);
const U={};for(const n of ['uVP','uEye','uT'])U[n]=gl.getUniformLocation(prog,n);
for(let i=0;i<4;i++)gl.enableVertexAttribArray(i);
function mesh(g){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.d),gl.STATIC_DRAW);return {b,n:g.d.length/10};}
function draw(m){gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.vertexAttribPointer(0,3,gl.FLOAT,false,40,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,40,12);
  gl.vertexAttribPointer(2,3,gl.FLOAT,false,40,24);gl.vertexAttribPointer(3,1,gl.FLOAT,false,40,36);gl.drawArrays(gl.TRIANGLES,0,m.n);}
const mCar=mesh(g0),mBG=mesh(BG),dynBuf=gl.createBuffer();
function persp(fov,asp,n,f){const t=1/tan(fov/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;}
function lookAt(e,c,u){const f=nrm(sub(c,e)),s=nrm(crs(f,u)),t=crs(s,f),o=new Float32Array(16);
  o[0]=s[0];o[4]=s[1];o[8]=s[2];o[1]=t[0];o[5]=t[1];o[9]=t[2];o[2]=-f[0];o[6]=-f[1];o[10]=-f[2];o[12]=-dot(s,e);o[13]=-dot(t,e);o[14]=dot(f,e);o[15]=1;return o;}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
gl.enable(gl.DEPTH_TEST);

/* ================= Jalan cerita ================= */
const MAN={top:[.2,.35,.6],bottom:[.15,.16,.2],shoe:[.92,.92,.9],hair:[.06,.05,.05]};
const MOM={top:[.93,.6,.62],bottom:[.93,.6,.62],shoe:[.45,.3,.25],hijab:[.98,.92,.85],longSleeve:1,skirt:1};
const SEAT=[0,.56,-(ZW-.36)];
const T_IN0=.6,T_IN1=3.8,T_LOOK=BEATS[2]+.5,T_UP0=BEATS[3]+.2,T_UP1=BEATS[3]+1.3,T_ASIDE=BEATS[3]+2.2,T_GEST=BEATS[3]+2.4,
  T_SIT0=BEATS[4]-.2,T_SIT1=BEATS[4]+1.6;
const HANDLE_M=[-.12,1.75,-.6],HANDLE_Y=[.72,1.75,-.6];
const blinkAt=(t,o,p)=>{const q=(t+o)%p;return q<.14?1-abs(q-.07)/.07:0};
function momState(t){
  const st={yaw:PI,gender:'f',cols:MOM,belly:1.25,lean:-.08,headYaw:0,headPitch:0,sit:0};
  const tired=win(t,BEATS[1]-.3,T_SIT0,.6);
  st.face={blink:max(blinkAt(t,.3,3.7),.3*tired),sad:.9*tired,smile:.6*seg(t,T_SIT0+.6,T_SIT0+1.3),happy:seg(t,T_SIT0+.6,T_SIT0+1.3),talk:(t>BEATS[4]+1.6&&t<BEATS[4]+2.7)?t*18:0};
  const A=[-2.9,.98,.6],Bp=[.05,.98,-.25];
  if(t<T_SIT0){
    const k=seg(t,T_IN0,T_IN1),p=lv(A,Bp,k),walk=t>T_IN0&&t<T_IN1;
    const d0=nrm(sub(Bp,A)),y0=atan2(d0[0],d0[2]);
    st.yaw=walk?y0:(t<T_IN0?y0:lerp(y0,PI,seg(t,T_IN1-.4,T_IN1+.5)));
    if(t>=T_IN1)st.yaw=lerp(y0,PI,seg(t,T_IN1-.4,T_IN1+.5));
    const ph=(t-T_IN0)*5.2,sw=walk?sin(ph):0,f=[sin(st.yaw),0,cos(st.yaw)],L=[cos(st.yaw),0,-sin(st.yaw)];
    st.pos=add(p,[.012*sin(t*1.7),walk?.012*abs(cos(ph)):0,0]);
    st.fL=add(add([p[0],.07+(walk?.06*max(0,sin(ph)):0),p[2]],mv(L,.1)),mv(f,.16*sw));
    st.fR=add(add([p[0],.07+(walk?.06*max(0,-sin(ph)):0),p[2]],mv(L,-.1)),mv(f,-.16*sw));
    st.hR=add(add(st.pos,mv(f,.27)),add(mv(L,-.06),[0,.17,0]));st.palmR=mv(f,-1);st.curlR=.15;
    const hold=seg(t,T_IN1-.2,T_IN1+.5);
    const swingL=add(add(st.pos,mv(L,.24)),add(mv(f,-.12*sw),[0,-.12,0]));
    st.hL=lv(swingL,HANDLE_M,hold);st.palmL=hold>.5?[0,0,-1]:[0,-1,0];st.curlL=lerp(.3,1.25,hold);
    st.headPitch=-.05+.12*tired;st.headYaw=0;
    st.look=t>T_LOOK+.8?[0,1.0,-1.0]:null;
  } else {
    const stand=[.05,.98,-.25];
    st.yaw=lerp(PI,2*PI,seg(t,T_SIT0,T_SIT0+.9));
    const f=[sin(st.yaw),0,cos(st.yaw)],L=[cos(st.yaw),0,-sin(st.yaw)];
    const kk=seg(t,T_SIT0+.5,T_SIT1);
    st.pos=lv(lv(stand,[SEAT[0],.98,SEAT[2]+.32],seg(t,T_SIT0,T_SIT0+.7)),SEAT,kk);
    st.lean=lerp(-.08,-.1,kk)+.3*kk*(1-kk)*4;st.sit=kk>.6;
    const fx=lerp(0,.5,kk);
    st.fL=add(add([st.pos[0],.07,st.pos[2]],mv(L,.11)),mv(f,fx));st.fR=add(add([st.pos[0],.07,st.pos[2]],mv(L,-.11)),mv(f,fx));
    st.hL=add(add(st.pos,mv(f,.27)),add(mv(L,.06),[0,.17,0]));st.palmL=mv(f,-1);st.curlL=.15;
    st.hR=add(add(st.pos,mv(L,-.27)),add(mv(f,.08),[0,-.06+.1*(1-kk),0]));st.palmR=[0,-1,0];st.curlR=.3;
    st.headPitch=lerp(.1,-.08,kk);st.headYaw=-.45*seg(t,T_SIT1-.2,T_SIT1+.6);
    st.look=[.72,1.6,-.6];st.face.sad=0;
  }
  return st;}
function manState(t){
  const st={gender:'m',cols:MAN,yaw:0,lean:-.06,sit:1,headYaw:0,headPitch:.38};
  const notice=seg(t,T_LOOK,T_LOOK+.6);
  st.face={blink:blinkAt(t,1.1,3.1),smile:.12+.6*seg(t,T_GEST,T_GEST+.6),happy:seg(t,T_GEST,T_GEST+.6),
    sad:.0,talk:(t>T_GEST+.1&&t<T_GEST+1.1)?t*17:0};
  const up=seg(t,T_UP0,T_UP1),aside=seg(t,T_UP1,T_ASIDE);
  const f=[0,0,1],L=[1,0,0];
  const sitP=SEAT,standP=[0,.98,-.8],sideP=[.72,.98,-.55];
  st.pos=lv(lv(sitP,standP,up),sideP,aside);st.lean=-.06+.36*up*(1-up)*4;st.sit=up<.5;
  st.yaw=lerp(0,-.95,seg(t,T_UP1,T_GEST+.3));
  const fy=[sin(st.yaw),0,cos(st.yaw)],Ly=[cos(st.yaw),0,-sin(st.yaw)];
  const knee=add(sitP,mv(f,.42));
  const fSit=[add(add(knee,mv(L,.11)),[0,-.47,.05]),add(add(knee,mv(L,-.11)),[0,-.47,.05])];
  const fStand=[add([st.pos[0],.07,st.pos[2]],mv(Ly,.11)),add([st.pos[0],.07,st.pos[2]],mv(Ly,-.11))];
  st.fL=lv(fSit[0],fStand[0],up);st.fR=lv(fSit[1],fStand[1],up);
  const phoneP=add(add(sitP,mv(f,.33)),[0,.2,0]);
  const hPh=[add(phoneP,[.05,-.06*notice,-.03*notice]),add(phoneP,[-.05,-.06*notice,-.03*notice])];
  const restL=add(add(st.pos,mv(Ly,.23)),add(mv(fy,.04),[0,-.12,0])),restR=add(add(st.pos,mv(Ly,-.23)),add(mv(fy,.04),[0,-.12,0]));
  const pk=seg(t,T_UP0-.2,T_UP0+.4);
  st.hL=lv(hPh[0],restL,pk);st.hR=lv(hPh[1],restR,pk);
  st.palmL=pk<.5?[0,1,0]:[0,-1,0];st.palmR=pk<.5?[0,1,0]:[0,-1,0];st.curlL=.5;st.curlR=.5;
  const g=seg(t,T_GEST,T_GEST+.6)*(1-seg(t,T_SIT1-.2,T_SIT1+.5));
  const gest=add(add(st.pos,mv(fy,.36)),add(mv(Ly,.16),[0,.02,0]));
  st.hL=lv(st.hL,gest,g);if(g>.3){st.palmL=nrm([0,1,.2]);st.curlL=.1;}
  const hold=seg(t,T_ASIDE-.3,T_ASIDE+.4);st.hR=lv(st.hR,HANDLE_Y,hold);if(hold>.5){st.palmR=[0,0,-1];st.curlR=1.25;}
  st.headPitch=lerp(.38,-.1,notice)+.06*up;st.headYaw=.1*notice*(1-up);
  st.look=t>T_LOOK?[.05,1.62,-.25]:null;
  if(t>T_SIT1-.2)st.look=[0,1.15,-1.05];
  st.phone=t<T_UP0+.1;st.phonePos=lv(hPh[0],hPh[1],.5);
  return st;}

/* ================= Kamera ================= */
function camAt(t){
  const shake=[.004*sin(t*7.1),.003*sin(t*5.3),0];
  let e,c,f;
  if(t<BEATS[1]){const k=seg(t,0,BEATS[1]);e=lv([2.6,1.55,1.05],[1.9,1.5,.95],k);c=lv([-1.2,1.15,-.2],[-.4,1.1,-.5],k);f=50;}
  else if(t<BEATS[2]){const k=seg(t,BEATS[1],BEATS[2]);e=lv([.45,1.66,-1.25],[.4,1.66,-1.12],k);c=[.05,1.8,-.25];f=32;}
  else if(t<BEATS[3]){const k=seg(t,BEATS[2],BEATS[3]);e=lv([-.72,1.42,-.12],[-.64,1.4,-.2],k);c=[0,1.42,-1.0];f=34;}
  else if(t<BEATS[4]){const k=seg(t,BEATS[3],BEATS[4]);e=lv([2.6,1.55,1.0],[2.4,1.52,.9],k);c=lv([.25,1.25,-.7],[.35,1.3,-.68],k);f=46;}
  else if(t<BEATS[5]){const kk=seg(t,BEATS[4]+1.6,BEATS[4]+2.0);
    e=lv([-.8,1.3,.6],[.34,1.36,-.12],kk);c=lv([0,1.0,-.95],[0,1.44,-1.05],kk);f=lerp(40,32,kk);}
  else{const k=seg(t,BEATS[5],D);e=lv([2.2,1.5,1.0],[3.0,1.7,1.15],k);c=[.2,1.0,-.7];f=46;}
  return {e:add(e,shake),c,f};}

/* ================= Lukis ================= */
let lastVP=null;
function render(t){
  const cm=camAt(t),VP=mul(persp(cm.f*PI/180,W/H,.05,60),lookAt(cm.e,cm.c,UP));lastVP=VP;
  gl.viewport(0,0,W,H);gl.clearColor(.85,.87,.9,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(U.uVP,false,VP);gl.uniform3fv(U.uEye,cm.e);gl.uniform1f(U.uT,t);
  draw(mCar);draw(mBG);
  const g=new Geo(),m=manState(t),w=momState(t);
  person(g,{...m,face:{...m.face,look:m.look}});
  if(m.phone){const c=m.phonePos;box(g,add(c,[0,.02,0]),[.075,.012,.15],[.04,.04,.05],2);box(g,add(c,[0,.027,0]),[.066,.002,.135],[.35,.55,.85],7);}
  person(g,{...w,face:{...w.face,look:w.look}});
  for(const p of [m.pos,w.pos]){const c=[p[0],.004,p[2]];for(let k=0;k<16;k++){const a0=2*PI*k/16,a1=2*PI*(k+1)/16;
    g.tri(c,add(c,[cos(a1)*.32,0,sin(a1)*.26]),add(c,[cos(a0)*.32,0,sin(a0)*.26]),[.4,.42,.45],0);}}
  gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.d),gl.DYNAMIC_DRAW);draw({b:dynBuf,n:g.d.length/10});
}

/* ================= Teks ================= */
function txt(c,s,x,y,size,col,a,glow){if(a<=0)return;c.save();c.globalAlpha=a;c.textAlign='center';
  c.font='900 '+size+'px "Arial Black",Impact,sans-serif';const mw=c.measureText(s).width;if(mw>980){size=Math.floor(size*980/mw);c.font='900 '+size+'px "Arial Black",Impact,sans-serif';}
  c.lineWidth=size*.16;c.strokeStyle='rgba(8,12,20,.92)';c.lineJoin='round';if(glow){c.shadowColor=col;c.shadowBlur=26;}
  c.strokeText(s,x,y);c.fillStyle=col;c.fillText(s,x,y);c.restore();}
function heart(c,x,y,s,a){if(a<=0)return;c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=a;c.shadowColor='rgba(255,60,90,.9)';c.shadowBlur=24;c.fillStyle='#ff4d6d';
  c.beginPath();c.moveTo(0,28);c.bezierCurveTo(-60,-14,-34,-58,0,-26);c.bezierCurveTo(34,-58,60,-14,0,28);c.fill();c.restore();}

window.VIDEO={width:W,height:H,fps:30,duration:D,loop:false,beats:BEATS,
draw(c,t,w,h){
  t=cl(t,0,D);render(t);c.drawImage(cv,0,0,w,h);
  const vg=c.createRadialGradient(w/2,h/2,h*.32,w/2,h/2,h*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.35)');c.fillStyle=vg;c.fillRect(0,0,w,h);
  const g=c.createLinearGradient(0,0,0,480);g.addColorStop(0,'rgba(6,10,18,.7)');g.addColorStop(1,'rgba(6,10,18,0)');c.fillStyle=g;c.fillRect(0,0,w,480);
  const L=(a,b,s1,s2,col,glow,sz)=>{const k=win(t,a,b);txt(c,s1,w/2,230,sz||96,col||'#fff',k,glow);if(s2)txt(c,s2,w/2,320,54,'#fff',k,false);};
  L(BEATS[0],BEATS[1],'MRT PENUH','SEORANG IBU MENGANDUNG MASUK');
  L(BEATS[1],BEATS[2],'DIA PENAT...','TIADA SIAPA PERASAN','#ffb3b3',false);
  L(BEATS[2],BEATS[3],'ADA YANG PERASAN','',null,false);
  L(BEATS[3],BEATS[4],'BANGUN & BERI','TEMPAT DUDUK','#ffd23a',true);
  L(BEATS[4],BEATS[5],'TERIMA KASIH','',null,false);
  const k=seg(t,BEATS[5],BEATS[5]+.5);txt(c,'UTAMAKAN',w/2,230,104,'#fff',k,false);txt(c,'YANG LEBIH MEMERLUKAN',w/2,330,60,'#ffd23a',k,true);
  heart(c,w/2,h*.62-80*seg(t,BEATS[4]+.9,BEATS[4]+2.4),2.4,win(t,BEATS[4]+.9,BEATS[5]-.1,.4)*.9);
}};
})();
