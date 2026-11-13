// Adegan: eskalator meluncur turun bila brek gagal / pad brek haus / rantai pemacu utama putus.
// Model 3D WebGL = model "Eskalator 3D" (geometri v9 yang diaudit), dilukis ke kanvas luar skrin
// dan disalin ke kanvas video. Kontrak: window.VIDEO = { width, height, fps, duration, loop, beats, draw }
(function(){
'use strict';
const W=1080,H=1920,D=24.2;
const BEATS=[.3,5.5,10.2,13.9,17.8,21.1];
const cv=document.createElement('canvas');cv.width=W;cv.height=H;
const gl=cv.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
const {sin,cos,PI,atan2,hypot,round,max,min,acos,tan}=Math;

/* ================= Geometri laluan (eska.py v9 yang diaudit) ================= */
const DS=0.005,r=0.70,P=0.40,L1=1.6,R1=2.0,R2=1.5,L2=1.6,RISE=3.5,A=PI/6;
const LINC=(RISE-R1*(1-cos(A))-R2*(1-cos(A)))/sin(A);
const C=[];
(function(){let x=0,y=r,th=0;const add=()=>C.push([x,y,th]);add();
  for(let i=0;i<round(L1/DS);i++){x+=DS;add();}
  let n=round(R1*A/DS);for(let i=0;i<n;i++){th+=A/n;x+=R1*A/n*cos(th);y+=R1*A/n*sin(th);add();}
  n=round(LINC/DS);const dl=LINC/n;for(let i=0;i<n;i++){x+=dl*cos(th);y+=dl*sin(th);add();}
  n=round(R2*A/DS);for(let i=0;i<n;i++){th-=A/n;x+=R2*A/n*cos(th);y+=R2*A/n*sin(th);add();}
  th=0;for(let i=0;i<round(L2/DS);i++){x+=DS;add();}
})();
const NC=C.length,XE=C[NC-1][0],YE=C[NC-1][1];
const TOPC=[XE,YE-r];
const EXTB=1.3,EXTT=2.2,EX=[];
const nB=round(EXTB/DS),nT=round(EXTT/DS);
for(let i=nB;i>=1;i--)EX.push([-i*DS,r,0]);
for(const p of C)EX.push(p);
for(let i=1;i<=nT;i++)EX.push([XE+i*DS,YE,0]);
const i0=nB,iEnd=i0+NC-1,NE=EX.length;
const ex=(i,k)=>[EX[i][0]-k*sin(EX[i][2]),EX[i][1]+k*cos(EX[i][2])];
const ixT=dx=>iEnd+round(dx/DS), ixB=x=>i0+round(x/DS);

const LX=[],LY=[],LA=[];
for(let i=0;i<NC;i++){LX.push(C[i][0]);LY.push(C[i][1]);LA.push(0);}
const NTURN=200;
for(let i=1;i<=NTURN;i++){const a=PI/2-PI*i/NTURN;LX.push(TOPC[0]+r*cos(a));LY.push(TOPC[1]+r*sin(a));LA.push(-PI*i/NTURN);}
for(let i=NC-1;i>=0;i--){LX.push(C[i][0]+2*r*sin(C[i][2]));LY.push(C[i][1]-2*r*cos(C[i][2]));LA.push(-PI);}
for(let i=1;i<NTURN;i++){const a=-PI/2-PI*i/NTURN;LX.push(r*cos(a));LY.push(r*sin(a));LA.push(-PI-PI*i/NTURN);}
const NL=LX.length,SEG=new Float64Array(NL),LS=new Float64Array(NL);
let LTOT=0;for(let i=0;i<NL;i++){const j=(i+1)%NL;SEG[i]=hypot(LX[j]-LX[i],LY[j]-LY[i]);LS[i]=LTOT;LTOT+=SEG[i];}
const NST=Math.floor(LTOT/P),PE=LTOT/NST;
const SC=LS[NC-1],SB=LS[NC-1+NTURN+NC-1];
function at(s){s=((s%LTOT)+LTOT)%LTOT;let lo=0,hi=NL-1;while(lo<hi){const m=(lo+hi+1)>>1;if(LS[m]<=s)lo=m;else hi=m-1;}
  const i=lo,j=(i+1)%NL,f=SEG[i]>1e-9?(s-LS[i])/SEG[i]:0;const aj=j===0?-2*PI:LA[j];
  return [LX[i]+(LX[j]-LX[i])*f,LY[i]+(LY[j]-LY[i])*f,LA[i]+(aj-LA[i])*f];}
const rot=(px,py,a)=>[px*cos(a)-py*sin(a),px*sin(a)+py*cos(a)];

const TREAD=0.06,ROLLER=[-0.31,-0.40],HW=0.5;
const ZCH=0.545,ZTR=0.435,ZHR=0.61,ZSH=0.85,ZDRV=0.70;

/* pemegang tangan */
const KH=0.92,RN=0.40,KC=KH-RN,KR=KC-RN,NEW=0.45,SHV_R=0.38;
const ia=ixB(-NEW),ib=ixT(NEW),RNi=round(RN/DS);
const SJ=iEnd-round((L2+R2*A+0.25)/DS),SHV=ex(SJ,-0.70);
const iD=ixT(-0.9),iE=SJ-round(1.0/DS),Dp=ex(iD,KR),Ep=ex(iE,KR);
const tp=ph=>[SHV[0]+SHV_R*cos(ph),SHV[1]+SHV_R*sin(ph)];
function tangent(Pt,into){const dx=Pt[0]-SHV[0],dy=Pt[1]-SHV[1],Dd=hypot(dx,dy),base=atan2(dy,dx),g=acos(SHV_R/Dd);
  for(const ph of [base+g,base-g]){const t=tp(ph),hx=cos(ph-PI/2),hy=sin(ph-PI/2);const dot=(t[0]-Pt[0])*hx+(t[1]-Pt[1])*hy;if((dot>0)===into)return ph;}return base;}
const ph_in=tangent(Dp,true);let ph_out=tangent(Ep,false);while(ph_out>ph_in)ph_out-=2*PI;
const HR=[];
for(let i=ia;i<=ib;i+=4)HR.push(ex(i,KH));
{const c=ex(ib,KC);for(let k=1;k<60;k++){const a=PI/2-PI*k/60;HR.push([c[0]+RN*cos(a),c[1]+RN*sin(a)]);}}
for(let i=ib;i>=iD;i-=4)HR.push(ex(i,KR));
for(let k=0;k<=60;k++)HR.push(tp(ph_in+(ph_out-ph_in)*k/60));
for(let i=iE;i>=ia;i-=4)HR.push(ex(i,KR));
{const c=ex(ia,KC);for(let k=1;k<60;k++){const a=-PI/2-PI*k/60;HR.push([c[0]+RN*cos(a),c[1]+RN*sin(a)]);}}
const PM=(ph_in+ph_out)/2,PRS=[SHV[0]+(SHV_R+0.075)*cos(PM),SHV[1]+(SHV_R+0.075)*sin(PM)];
const GBX=[TOPC[0]+1.5,TOPC[1]-0.75],MDS_R=0.27,GB_R=0.11,HSS_R=0.08,HSM_R=HSS_R*r/SHV_R;

/* ================= Pembina mesh ================= */
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const nrm=a=>{const l=hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
class Geo{constructor(){this.d=[];}
  v(p,n,col,m,u){this.d.push(p[0],p[1],p[2],n[0],n[1],n[2],col[0],col[1],col[2],col.length>3?col[3]:1,m||0,u||0);}
  tri(a,b,c,col,m){const n=nrm(crs(sub(b,a),sub(c,a)));this.v(a,n,col,m);this.v(b,n,col,m);this.v(c,n,col,m);}
  quad(a,b,c,d,col,m){this.tri(a,b,c,col,m);this.tri(a,c,d,col,m);}
}
function box(g,cx,cy,cz,sx,sy,sz,col,m,rz){const c=cos(rz||0),s=sin(rz||0),hx=sx/2,hy=sy/2,hz=sz/2;
  const p=(x,y,z)=>[cx+x*c-y*s,cy+x*s+y*c,cz+z];
  const a=p(-hx,-hy,-hz),b=p(hx,-hy,-hz),cc=p(hx,hy,-hz),d=p(-hx,hy,-hz),e=p(-hx,-hy,hz),f=p(hx,-hy,hz),gg=p(hx,hy,hz),h=p(-hx,hy,hz);
  g.quad(a,b,cc,d,col,m);g.quad(e,f,gg,h,col,m);g.quad(a,b,f,e,col,m);g.quad(d,cc,gg,h,col,m);g.quad(a,d,h,e,col,m);g.quad(b,cc,gg,f,col,m);}
function cyl(g,p0,p1,rad,col,m,seg){seg=seg||14;const d=nrm(sub(p1,p0));const ref=Math.abs(d[2])<0.9?[0,0,1]:[1,0,0];
  const e1=nrm(crs(d,ref)),e2=crs(d,e1);
  for(let i=0;i<seg;i++){const a0=2*PI*i/seg,a1=2*PI*(i+1)/seg;
    const n0=[e1[0]*cos(a0)+e2[0]*sin(a0),e1[1]*cos(a0)+e2[1]*sin(a0),e1[2]*cos(a0)+e2[2]*sin(a0)];
    const n1=[e1[0]*cos(a1)+e2[0]*sin(a1),e1[1]*cos(a1)+e2[1]*sin(a1),e1[2]*cos(a1)+e2[2]*sin(a1)];
    const q=(c,n)=>[c[0]+n[0]*rad,c[1]+n[1]*rad,c[2]+n[2]*rad];
    const A0=q(p0,n0),A1=q(p0,n1),B0=q(p1,n0),B1=q(p1,n1);
    g.v(A0,n0,col,m);g.v(A1,n1,col,m);g.v(B1,n1,col,m);g.v(A0,n0,col,m);g.v(B1,n1,col,m);g.v(B0,n0,col,m);
    const nd=[-d[0],-d[1],-d[2]];g.v(p0,nd,col,m);g.v(A1,nd,col,m);g.v(A0,nd,col,m);g.v(p1,d,col,m);g.v(B0,d,col,m);g.v(B1,d,col,m);}}
const cylZ=(g,x,y,z0,z1,rad,col,m,seg)=>cyl(g,[x,y,z0],[x,y,z1],rad,col,m,seg);
function ringZ(g,R0,R1,z0,z1,seg,col,m){for(let i=0;i<seg;i++){const a=2*PI*i/seg,b=2*PI*(i+1)/seg;
  const p=(R,t,z)=>[R*cos(t),R*sin(t),z];
  g.quad(p(R1,a,z0),p(R1,b,z0),p(R1,b,z1),p(R1,a,z1),col,m);g.quad(p(R0,a,z0),p(R0,b,z0),p(R0,b,z1),p(R0,a,z1),col,m);
  g.quad(p(R0,a,z0),p(R0,b,z0),p(R1,b,z0),p(R1,a,z0),col,m);g.quad(p(R0,a,z1),p(R0,b,z1),p(R1,b,z1),p(R1,a,z1),col,m);}}
function ribbon(g,Aa,Bb,col,m){for(let i=0;i<Aa.length-1;i++)g.quad(Aa[i],Aa[i+1],Bb[i+1],Bb[i],col,m);}
function fan(g,c,rad,a0,a1,z,n,col,m){for(let i=0;i<n;i++){const a=a0+(a1-a0)*i/n,b=a0+(a1-a0)*(i+1)/n;
  g.tri([c[0],c[1],z],[c[0]+rad*cos(a),c[1]+rad*sin(a),z],[c[0]+rad*cos(b),c[1]+rad*sin(b),z],col,m);}}
function tube(g,path,ra,rb,ref,col,m,closed,sides){sides=sides||8;const n=path.length,ring=[],us=[];let u=0;
  for(let i=0;i<n;i++){const a=path[closed?(i-1+n)%n:max(i-1,0)],b=path[closed?(i+1)%n:min(i+1,n-1)];
    const t=nrm(sub(b,a)),e1=nrm(crs(ref,t)),e2=nrm(crs(t,e1)),rg=[];
    for(let k=0;k<sides;k++){const an=2*PI*k/sides,cx=cos(an),sx=sin(an);
      const nn=nrm([e1[0]*cx/ra+e2[0]*sx/rb,e1[1]*cx/ra+e2[1]*sx/rb,e1[2]*cx/ra+e2[2]*sx/rb]);
      rg.push([[path[i][0]+e1[0]*ra*cx+e2[0]*rb*sx,path[i][1]+e1[1]*ra*cx+e2[1]*rb*sx,path[i][2]+e1[2]*ra*cx+e2[2]*rb*sx],nn]);}
    ring.push(rg);us.push(u);const nx=path[(i+1)%n];u+=hypot(nx[0]-path[i][0],nx[1]-path[i][1],nx[2]-path[i][2]);}
  const cnt=closed?n:n-1;
  for(let i=0;i<cnt;i++){const j=(i+1)%n,u0=us[i],u1=(j===0)?u:us[j];
    for(let k=0;k<sides;k++){const k2=(k+1)%sides,a=ring[i][k],b=ring[i][k2],c=ring[j][k2],d=ring[j][k];
      g.v(a[0],a[1],col,m,u0);g.v(b[0],b[1],col,m,u0);g.v(c[0],c[1],col,m,u1);g.v(a[0],a[1],col,m,u0);g.v(c[0],c[1],col,m,u1);g.v(d[0],d[1],col,m,u1);}}
  return u;}
function wheel(g,R,z0,z1,teeth,base,col,tcol,spokes){ringZ(g,R-0.075,R-0.012,z0,z1,36,col,5);
  cylZ(g,0,0,z0-0.01,z1+0.01,min(0.1,R*0.45),col,5,14);const zc=(z0+z1)/2,th=z1-z0;
  for(let k=0;k<(spokes||6);k++){const a=2*PI*k/(spokes||6),L=R-0.05;box(g,cos(a)*L/2,sin(a)*L/2,zc,L,0.05,th*0.7,col,5,a);}
  for(let k=0;k<teeth;k++){const a=base-(k+0.5)*2*PI/teeth;box(g,cos(a)*(R+0.004),sin(a)*(R+0.004),zc,0.05,0.032,th,tcol||col,5,a);}}

/* ================= Warna (latar gelap) ================= */
const STEEL=[.74,.76,.78],SHELL=[.5,.53,.56],YEL=[.97,.76,.1],BLUE=[.08,.5,.82],AMB=[.98,.64,.16],
  RAIL=[.055,.055,.065],TRACK=[.42,.46,.52],TRUSS=[.27,.31,.37],PURP=[.62,.46,.93],PLATE=[.2,.22,.25],ALU=[.6,.62,.65],
  RED=[.86,.16,.13],GLASS=[.72,.9,.93,.11],FLOOR=[.2,.23,.28],WOOD=[.26,.24,.24],GBOX=[.34,.42,.5],MOTOR=[.2,.36,.48],SPRING=[.85,.87,.9];

/* ---- anak tangga ---- */
const gStep=new Geo();
const SCOL=[.15,.15,.16],YOKE=[.07,.07,.08];
const bar=(g,p,q,th,zc,zw,col,m)=>{const L=hypot(q[0]-p[0],q[1]-p[1]);box(g,(p[0]+q[0])/2,(p[1]+q[1])/2,zc,L,th,zw,col,m,atan2(q[1]-p[1],q[0]-p[0]));};
box(gStep,-0.195,TREAD-0.012,0,0.39,0.024,2*HW,SCOL,1);
{const Aa=[],Bb=[];for(let i=0;i<=10;i++){const ph=0.66*i/10,x=-0.39*cos(ph),y=TREAD-0.39*sin(ph);Aa.push([x,y,-HW]);Bb.push([x,y,HW]);}ribbon(gStep,Aa,Bb,SCOL,1);}
box(gStep,-0.015,TREAD+0.002,0,0.03,0.006,2*HW,YEL,1);
for(const s of [-1,1])box(gStep,-0.195,TREAD+0.002,s*(HW-0.014),0.39,0.006,0.028,YEL,1);
cylZ(gStep,0,0,-ZCH-0.03,ZCH+0.03,0.02,STEEL,5,10);
const RB=[-0.39*cos(0.66),TREAD-0.39*sin(0.66)];
for(const s of [-1,1]){const zc=s*0.455;
  bar(gStep,[0,0],ROLLER,0.035,zc,0.03,YOKE,0);bar(gStep,ROLLER,RB,0.035,zc,0.03,YOKE,0);bar(gStep,[-0.39,TREAD-0.03],[0,TREAD-0.03],0.035,zc,0.03,YOKE,0);
  box(gStep,0.0,0.0,s*0.49,0.07,0.07,0.04,[.8,.82,.84],5);
  cylZ(gStep,ROLLER[0],ROLLER[1],s*ZTR-0.018,s*ZTR+0.018,0.04,AMB,0,14);
  cylZ(gStep,ROLLER[0],ROLLER[1],s*ZTR,s*0.47,0.012,STEEL,5,8);}
const CP=PE/3,NLINK=NST*3;
const gLink=new Geo();cylZ(gLink,0,0,-0.016,0.016,0.038,BLUE,0,12);
for(const s of [-1,1])box(gLink,CP/2,0,s*0.022,CP+0.03,0.03,0.005,PLATE,5);
const gDot=new Geo();cylZ(gDot,0,0,-0.014,0.014,0.017,[.75,.78,.82],5,8);
const NTEETH=33;
const gMain=new Geo();
for(const s of [-1,1])wheel(gMain,r,s*ZCH-0.014,s*ZCH+0.014,NTEETH,PI/2,[.5,.55,.62],[.6,.65,.72]);
cylZ(gMain,0,0,-0.78,0.78,0.055,STEEL,5,14);
wheel(gMain,MDS_R,ZDRV-0.015,ZDRV+0.015,20,0,[.9,.45,.2],[.9,.45,.2],4);
wheel(gMain,HSM_R,-ZDRV-0.012,-ZDRV+0.012,12,0,PURP,PURP,3);
const gBot=new Geo();
for(const s of [-1,1]){ringZ(gBot,0.10,r-0.04,s*ZCH-0.012,s*ZCH+0.012,48,[.66,.67,.67],5);
  for(let k=0;k<6;k++){const a=2*PI*k/6+0.3;cylZ(gBot,0.46*cos(a),0.46*sin(a),s*ZCH-0.014,s*ZCH+0.014,0.035,[.2,.21,.23],0,10);}}
cylZ(gBot,0,0,-0.76,0.76,0.045,[.45,.45,.44],0,14);
const gHS=new Geo();
for(const s of [-1,1])wheel(gHS,SHV_R-0.02,s*ZHR-0.03,s*ZHR+0.03,0,0,PURP,PURP,5);
cylZ(gHS,0,0,-0.78,0.78,0.04,STEEL,5,12);wheel(gHS,HSS_R,-ZDRV-0.012,-ZDRV+0.012,8,0,PURP,PURP,3);
const gGB=new Geo();wheel(gGB,GB_R,ZDRV-0.015,ZDRV+0.015,10,0,[.9,.45,.2],[.9,.45,.2],3);cylZ(gGB,0,0,0.45,ZDRV+0.03,0.03,STEEL,5,10);

/* ---- penumpang: penuh di setiap anak tangga, kiri & kanan ---- */
function sphere(g,c,rad,col,m){const NA=8,NB=12;const Pp=(i,j)=>{const th=PI*i/NA,ph=2*PI*j/NB,n=[sin(th)*cos(ph),cos(th),sin(th)*sin(ph)];return [[c[0]+n[0]*rad,c[1]+n[1]*rad,c[2]+n[2]*rad],n];};
  for(let i=0;i<NA;i++)for(let j=0;j<NB;j++){const a=Pp(i,j),b=Pp(i+1,j),cc=Pp(i+1,j+1),d=Pp(i,j+1);
    g.v(a[0],a[1],col,m);g.v(b[0],b[1],col,m);g.v(cc[0],cc[1],col,m);g.v(a[0],a[1],col,m);g.v(cc[0],cc[1],col,m);g.v(d[0],d[1],col,m);}}
const PALS=[{sh:[.1,.55,.6],pa:[.16,.18,.24],sk:[.78,.58,.44],ha:[.08,.06,.05]},{sh:[.9,.42,.3],pa:[.3,.3,.33],sk:[.62,.44,.32],ha:[.05,.04,.04]},
  {sh:[.93,.76,.25],pa:[.2,.24,.34],sk:[.86,.68,.54],ha:[.16,.1,.06]},{sh:[.2,.28,.5],pa:[.5,.44,.34],sk:[.7,.5,.37],ha:[.04,.04,.05]},
  {sh:[.85,.85,.88],pa:[.12,.13,.16],sk:[.66,.47,.35],ha:[.06,.05,.05]},{sh:[.55,.2,.45],pa:[.25,.27,.3],sk:[.8,.62,.48],ha:[.1,.07,.05]}];
const PAXM=PALS.map(p=>{const t=new Geo();cyl(t,[0,0.88,0],[0,1.40,0],0.14,p.sh,0,14);sphere(t,[0,0.88,0],0.14,p.pa,0);
  for(const s of [-1,1])sphere(t,[0,1.37,s*0.17],0.07,p.sh,0);cyl(t,[0,1.40,0],[0,1.52,0],0.045,p.sk,0,8);sphere(t,[0.012,1.60,0],0.105,p.sk,0);sphere(t,[-0.02,1.63,0],0.108,p.ha,0);
  const l=new Geo();cyl(l,[0,0,0],[0,-0.80,0],0.062,p.pa,0,10);box(l,0.045,-0.825,0,0.21,0.07,0.1,[.1,.1,.11],0);
  const ad=new Geo();cyl(ad,[0,0,0],[0,-0.27,0],0.046,p.sh,0,8);cyl(ad,[0,-0.27,0],[0,-0.54,0],0.04,p.sk,0,8);sphere(ad,[0,-0.57,0],0.048,p.sk,0);
  const ah=[-1,1].map(sg=>{const h=new Geo();cyl(h,[0,1.37,sg*0.2],[0.1,1.13,sg*0.28],0.046,p.sh,0,8);cyl(h,[0.1,1.13,sg*0.28],[0.2,1.0,sg*0.37],0.04,p.sk,0,8);sphere(h,[0.2,0.99,sg*0.37],0.05,p.sk,0);return h;});
  return {t,l,ad,ah};});
const PAX=[];
for(let i=0;i<NST;i++){PAX.push({i,z:0.24,c:(i*5)%PALS.length});PAX.push({i,z:-0.24,c:(i*5+3)%PALS.length});}

/* ---- pemegang tangan, kaca, badan, kulit ---- */
const gRail=new Geo();
for(const s of [-1,1])tube(gRail,HR.map(p=>[p[0],p[1],s*ZHR]),0.02,0.045,[0,0,1],RAIL,4,true,8);
const gGlass=new Geo();
for(const s of [-1,1]){const Aa=[],Bb=[];for(let i=ia;i<=ib;i+=8){const a=ex(i,0.16),b=ex(i,0.88);Aa.push([a[0],a[1],s*ZHR]);Bb.push([b[0],b[1],s*ZHR]);}
  ribbon(gGlass,Aa,Bb,GLASS,6);fan(gGlass,ex(ia,KC),0.36,PI/2,3*PI/2,s*ZHR,20,GLASS,6);fan(gGlass,ex(ib,KC),0.36,-PI/2,PI/2,s*ZHR,20,GLASS,6);}
const gBody=new Geo();
const yFloorB=r+TREAD+0.012,yFloorT=YE+TREAD+0.012;
for(const s of [-1,1]){const A1=[],B1=[],A2=[],B2=[];
  for(let i=ia-40;i<=ib+40;i+=8){const a=ex(i,-0.03),b=ex(i,0.10),c=ex(i,0.17);
    A1.push([a[0],a[1],s*0.506]);B1.push([b[0],b[1],s*0.506]);A2.push([b[0],b[1],s*0.506]);B2.push([c[0],c[1],s*0.60]);}
  ribbon(gBody,A1,B1,[.16,.16,.18],0);ribbon(gBody,A2,B2,STEEL,5);
  for(let i=ia;i<=ib;i+=110){const p=ex(i,0.14);box(gBody,p[0],p[1],s*0.56,0.03,0.012,0.03,[.85,.93,1],3,EX[i][2]);}}
box(gBody,0.445,yFloorB-0.004,0,0.09,0.014,2*HW,YEL,1);box(gBody,XE-0.445,yFloorT-0.004,0,0.09,0.014,2*HW,YEL,1);
const gShell=new Geo();
const iMid=i0+round((L1+R1*A+LINC/2)/DS),pMid=ex(iMid,-1.75);
const yb=x=>max(r-1.75,min(YE-1.75,pMid[1]+(x-pMid[0])*tan(A)));
const ktop=i=>(i>=ia-RNi&&i<=ib+RNi)?0.20:TREAD+0.012;
for(const s of [-1,1]){const Aa=[],Bb=[];for(let i=0;i<NE;i+=8){const t=ex(i,ktop(i));Aa.push([t[0],t[1],s*ZSH]);Bb.push([t[0],yb(t[0]),s*ZSH]);}
  {const t=ex(NE-1,ktop(NE-1));Aa.push([t[0],t[1],s*ZSH]);Bb.push([t[0],yb(t[0]),s*ZSH]);}
  ribbon(gShell,Aa,Bb,SHELL,5);
  const D1=[],D2=[];for(let i=ia-RNi;i<=ib+RNi;i+=8){const t=ex(i,0.20);D1.push([t[0],t[1],s*0.62]);D2.push([t[0],t[1],s*ZSH]);}
  ribbon(gShell,D1,D2,STEEL,5);
  for(const [x0,x1,y] of [[-EXTB,EX[ia-RNi][0],yFloorB],[EX[ib+RNi][0],XE+EXTT,yFloorT]])
    gShell.quad([x0,y,s*HW],[x1,y,s*HW],[x1,y,s*ZSH],[x0,y,s*ZSH],ALU,2);
  for(const [ii,dir,yy,lamp] of [[ia,-1,yFloorB,[.2,1,.45]],[ib,1,yFloorT,[1,.2,.15]]]){const cx=EX[ii][0]+dir*RN*0.62;
    box(gShell,cx,yy+0.13,s*0.675,0.62,0.26,0.35,[.12,.13,.16],0);box(gShell,cx-dir*0.2,yy+0.13,s*0.496,0.07,0.035,0.01,lamp,3);}}
{const Aa=[],Bb=[];for(let x=-EXTB;x<=XE+EXTT+1e-6;x+=0.05){Aa.push([x,yb(x),-ZSH]);Bb.push([x,yb(x),ZSH]);}ribbon(gShell,Aa,Bb,SHELL,5);}
gShell.quad([-EXTB,r-1.75,-ZSH],[-EXTB,r-1.75,ZSH],[-EXTB,yFloorB,ZSH],[-EXTB,yFloorB,-ZSH],SHELL,5);
gShell.quad([XE+EXTT,YE-1.75,-ZSH],[XE+EXTT,YE-1.75,ZSH],[XE+EXTT,yFloorT,ZSH],[XE+EXTT,yFloorT,-ZSH],SHELL,5);
gShell.quad([-EXTB,yFloorB,-HW],[0.40,yFloorB,-HW],[0.40,yFloorB,HW],[-EXTB,yFloorB,HW],ALU,2);
gShell.quad([XE-0.40,yFloorT,-HW],[XE+EXTT,yFloorT,-HW],[XE+EXTT,yFloorT,HW],[XE-0.40,yFloorT,HW],ALU,2);
{let xh=-EXTB;while(yb(xh)<yFloorB-0.02&&xh<XE)xh+=0.02;const y=yFloorB-0.006,X0=-7,X1=XE+8,Z=5;
  gShell.quad([X0,y,-Z],[-EXTB,y,-Z],[-EXTB,y,Z],[X0,y,Z],FLOOR,7);gShell.quad([xh,y,-Z],[X1,y,-Z],[X1,y,Z],[xh,y,Z],FLOOR,7);
  gShell.quad([-EXTB,y,ZSH],[xh,y,ZSH],[xh,y,Z],[-EXTB,y,Z],FLOOR,7);gShell.quad([-EXTB,y,-ZSH],[xh,y,-ZSH],[xh,y,-Z],[-EXTB,y,-Z],FLOOR,7);
  const xs=XE-1.3,yt=yFloorT-0.006,tk=0.4;
  box(gShell,(xs+X1)/2,yt-tk/2,(ZSH+Z)/2,X1-xs,tk,Z-ZSH,WOOD,7);box(gShell,(xs+X1)/2,yt-tk/2,-(ZSH+Z)/2,X1-xs,tk,Z-ZSH,WOOD,7);
  box(gShell,(XE+EXTT+X1)/2,yt-tk/2,0,X1-XE-EXTT,tk,2*ZSH,WOOD,7);}

/* ---- mekanikal statik ---- */
const gMech=new Geo();
const TRKc=[],TRKr=[];
for(let s=0;s<=SC;s+=0.03){const p=at(s),d=rot(ROLLER[0],ROLLER[1],p[2]);TRKc.push([p[0]+d[0],p[1]+d[1]-0.052]);}
for(let s=SC+PI*r;s<=SB;s+=0.03){const p=at(s),d=rot(ROLLER[0],ROLLER[1],p[2]);TRKr.push([p[0]+d[0],p[1]+d[1]-0.052]);}
const CHc=[],CHr=[];for(let i=0;i<NC;i+=6){CHc.push([C[i][0],C[i][1]-0.05]);const q=ex(i0+i,-2*r);CHr.push([q[0],q[1]-0.05]);}
for(const s of [-1,1]){
  tube(gMech,CHc.map(p=>[p[0],p[1],s*ZCH]),0.012,0.028,[0,0,1],TRACK,5,false,4);tube(gMech,CHr.map(p=>[p[0],p[1],s*ZCH]),0.012,0.028,[0,0,1],TRACK,5,false,4);
  tube(gMech,TRKc.map(p=>[p[0],p[1],s*ZTR]),0.012,0.028,[0,0,1],[.6,.5,.34],5,false,4);tube(gMech,TRKr.map(p=>[p[0],p[1],s*ZTR]),0.012,0.028,[0,0,1],[.6,.5,.34],5,false,4);
  const up=[],lo=[];for(let x=-EXTB+0.05;x<=XE+EXTT-0.04;x+=0.1){lo.push([x,yb(x)+0.05,s*0.80]);}
  for(let i=4;i<NE-4;i+=10){const t=ex(i,-0.2);up.push([t[0],t[1],s*0.80]);}
  tube(gMech,up,0.028,0.028,[0,0,1],TRUSS,0,false,4);tube(gMech,lo,0.028,0.028,[0,0,1],TRUSS,0,false,4);
  let prev=null,k=0;for(let i=4;i<NE-4;i+=200){const t=ex(i,-0.2),b=[t[0],yb(t[0])+0.05];
    cyl(gMech,[t[0],t[1],s*0.80],[b[0],b[1],s*0.80],0.022,TRUSS,0,6);
    if(prev)cyl(gMech,(k%2?[prev[0],prev[1],s*0.80]:[prev[2],prev[3],s*0.80]),(k%2?[b[0],b[1],s*0.80]:[t[0],t[1],s*0.80]),0.016,TRUSS,0,6);
    prev=[t[0],t[1],b[0],b[1]];k++;}
  box(gMech,-0.12,0,s*0.70,0.75,0.2,0.03,PLATE,5);box(gMech,-0.95,0,s*0.70,0.05,0.26,0.16,PLATE,5);
  cyl(gMech,[-0.5,0,s*0.70],[-1.02,0,s*0.70],0.012,STEEL,5,8);
  {const hp=[];for(let i=0;i<=140;i++){const t=i/140,a=2*PI*9*t;hp.push([-0.5-0.42*t,0.05*cos(a),s*0.70+0.05*sin(a)]);}tube(gMech,hp,0.009,0.009,[1,0,0],SPRING,5,false,6);}
  box(gMech,-0.36,0.16,s*0.70,0.08,0.06,0.06,RED,0);
  box(gMech,0.5,r-0.06,s*0.47,0.07,0.05,0.04,RED,0);box(gMech,XE-0.5,YE-0.06,s*0.47,0.07,0.05,0.04,RED,0);
  cylZ(gMech,Dp[0],Dp[1]+0.07,s*ZHR-0.03,s*ZHR+0.03,0.045,STEEL,5,12);cylZ(gMech,Ep[0],Ep[1]+0.07,s*ZHR-0.03,s*ZHR+0.03,0.045,STEEL,5,12);
  cylZ(gMech,PRS[0],PRS[1],s*ZHR-0.035,s*ZHR+0.035,0.05,[.95,.4,.6],0,14);
}
box(gMech,-0.95,0,0,0.05,0.12,1.4,PLATE,5);
/* motor menegak di atas gearbox */
const MZ=0.25,MTOP=GBX[1]+0.84;
box(gMech,GBX[0],GBX[1],MZ,0.5,0.42,0.42,GBOX,5);box(gMech,GBX[0],GBX[1]-0.25,MZ,0.7,0.06,0.6,PLATE,0);
cyl(gMech,[GBX[0],GBX[1]+0.21,MZ],[GBX[0],GBX[1]+0.72,MZ],0.17,MOTOR,5,20);
for(let k=0;k<10;k++){const a=2*PI*k/10;box(gMech,GBX[0]+0.175*cos(a),GBX[1]+0.46,MZ+0.175*sin(a),0.02,0.44,0.02,[.16,.3,.4],0);}
cyl(gMech,[GBX[0],GBX[1]+0.72,MZ],[GBX[0],MTOP,MZ],0.12,[.3,.32,.36],5,16);
box(gMech,XE+1.75,YE-0.9,-0.42,0.5,0.9,0.28,[.82,.82,.8],0);box(gMech,XE+1.75,YE-0.7,-0.275,0.12,0.12,0.02,RED,0);
/* brek: dram di atas motor + rangka magnet */
const BRK={x:GBX[0],y:MTOP+0.08,z:MZ,R:0.14};
cyl(gMech,[BRK.x,MTOP,MZ],[BRK.x,MTOP+0.16,MZ],BRK.R,[.62,.64,.68],5,24);
box(gMech,BRK.x,MTOP+0.25,MZ,0.56,0.07,0.2,[.25,.27,.3],5);                  // palang atas (solenoid)
box(gMech,BRK.x,MTOP+0.31,MZ,0.18,0.09,0.16,[.75,.2,.16],0);                  // magnet brek
for(const sg of [-1,1])box(gMech,BRK.x+sg*0.27,MTOP+0.08,MZ,0.03,0.3,0.03,STEEL,5); // tiang pivot
/* pad brek (baru dan haus) + lengan kasut */
const gPadN=new Geo();box(gPadN,0,0,0,0.04,0.13,0.17,AMB,0);
const gPadW=new Geo();box(gPadW,0,0,0,0.012,0.13,0.17,[.42,.24,.14],0);
const gShoe=new Geo();box(gShoe,0,0,0,0.03,0.2,0.21,[.36,.39,.44],5);
/* rantai pemacu utama: utuh & putus */
function belt(c1,r1,c2,r2){const dx=c2[0]-c1[0],dy=c2[1]-c1[1],Dd=hypot(dx,dy),base=atan2(dy,dx),g=acos((r1-r2)/Dd),o=[];
  for(const sg of [1,-1]){const a=base+sg*g;o.push([[c1[0]+r1*cos(a),c1[1]+r1*sin(a)],[c2[0]+r2*cos(a),c2[1]+r2*sin(a)]]);}return o;}
const BELT1=belt(TOPC,MDS_R,GBX,GB_R),BELT2=belt(TOPC,HSM_R,SHV,HSS_R);
for(const [p,q] of BELT2)cyl(gMech,[p[0],p[1],-ZDRV],[q[0],q[1],-ZDRV],0.009,PLATE,5,6);
const CHAINCOL=[.85,.87,.9];
const gBeltOK=new Geo(),gBeltBrk=new Geo();
for(const [p,q] of BELT1)cyl(gBeltOK,[p[0],p[1],ZDRV],[q[0],q[1],ZDRV],0.016,CHAINCOL,5,8);
{const [p,q]=BELT1[1];cyl(gBeltBrk,[p[0],p[1],ZDRV],[q[0],q[1],ZDRV],0.016,CHAINCOL,5,8);
 const [a,b]=BELT1[0],lerp2=(u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];
 const pa=[a],pb=[b];
 for(let k=1;k<=10;k++){const u=0.42*k/10,P0=lerp2(u);pa.push([P0[0],P0[1]-0.55*(k/10)*(k/10)]);}
 for(let k=1;k<=10;k++){const u=1-0.4*k/10,P0=lerp2(u);pb.push([P0[0],P0[1]-0.45*(k/10)*(k/10)]);}
 tube(gBeltBrk,pa.map(p=>[p[0],p[1],ZDRV]),0.016,0.016,[0,0,1],CHAINCOL,5,false,6);
 tube(gBeltBrk,pb.map(p=>[p[0],p[1],ZDRV]),0.016,0.016,[0,0,1],CHAINCOL,5,false,6);}

/* ================= WebGL ================= */
const VS=`attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;attribute vec2 aE;uniform mat4 uVP,uM;
varying vec3 vN,vW,vL;varying vec4 vC;varying vec2 vE;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vL=aP;vN=mat3(uM)*aN;vC=aC;vE=aE;gl_Position=uVP*w;}`;
const FS=`precision highp float;uniform vec3 uEye;uniform float uAlpha,uTravel;
varying vec3 vN,vW,vL;varying vec4 vC;varying vec2 vE;
void main(){vec3 n=normalize(vN),v=normalize(uEye-vW);if(dot(n,v)<0.)n=-n;float m=vE.x,d=length(uEye-vW);vec3 b=vC.rgb;float sp=.10,al=vC.a*uAlpha;
 if(m>2.5&&m<3.5){gl_FragColor=vec4(b,al);return;}
 if(m>.5&&m<1.5){float k=clamp(5./d,0.,1.);b*=1.-.42*k*step(.5,fract(vL.z*42.));sp=.18;}
 else if(m>1.5&&m<2.5){float k=clamp(6./d,0.,1.);b*=1.-.22*k*step(.55,fract(vW.x*36.));sp=.35;}
 else if(m>3.5&&m<4.5){float f=fract((vE.y-uTravel)/.5);b+=vec3(.06)*step(.93,f);sp=.45;}
 else if(m>4.5&&m<5.5){sp=.5;}
 else if(m>5.5&&m<6.5){sp=.9;}
 else if(m>6.5){vec2 t=fract(vW.xz/1.2);float ln=step(.985,t.x)+step(.985,t.y);b*=1.-.12*clamp(ln,0.,1.)*clamp(14./d,0.,1.);sp=.06;}
 vec3 L=normalize(vec3(.35,.9,.55)),L2=normalize(vec3(-.5,.35,-.6));
 float df=max(dot(n,L),0.),d2=max(dot(n,L2),0.),hm=.5+.5*n.y;
 vec3 c=b*(.34+.24*hm+.56*df+.14*d2);
 float s=pow(max(dot(n,normalize(L+v)),0.),40.)*sp+pow(1.-max(dot(n,v),0.),3.)*sp*.25;
 c+=vec3(s);if(m>5.5&&m<6.5)al=min(1.,al+s*.8);
 float fog=clamp((d-16.)/18.,0.,1.);c=mix(c,vec3(.04,.06,.1),fog*.7);
 gl_FragColor=vec4(c,al);}`;
function sh(t,src){const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));
gl.bindAttribLocation(prog,0,'aP');gl.bindAttribLocation(prog,1,'aN');gl.bindAttribLocation(prog,2,'aC');gl.bindAttribLocation(prog,3,'aE');
gl.linkProgram(prog);gl.useProgram(prog);
const U={};for(const n of ['uVP','uM','uEye','uAlpha','uTravel'])U[n]=gl.getUniformLocation(prog,n);
for(let i=0;i<4;i++)gl.enableVertexAttribArray(i);
function mesh(g){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.d),gl.STATIC_DRAW);return {b,n:g.d.length/12};}
function bind(m){gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.vertexAttribPointer(0,3,gl.FLOAT,false,48,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,48,12);gl.vertexAttribPointer(2,4,gl.FLOAT,false,48,24);gl.vertexAttribPointer(3,2,gl.FLOAT,false,48,40);}
const MM=new Float32Array(16);MM[10]=1;MM[15]=1;
function inst(m,x,y,z,a){const c=cos(a),s=sin(a);MM[0]=c;MM[1]=s;MM[4]=-s;MM[5]=c;MM[12]=x;MM[13]=y;MM[14]=z;gl.uniformMatrix4fv(U.uM,false,MM);gl.drawArrays(gl.TRIANGLES,0,m.n);}
const mStep=mesh(gStep),mLink=mesh(gLink),mDot=mesh(gDot),mMain=mesh(gMain),mBot=mesh(gBot),mHS=mesh(gHS),mGB=mesh(gGB),
  mRail=mesh(gRail),mGlass=mesh(gGlass),mBody=mesh(gBody),mShell=mesh(gShell),mMech=mesh(gMech),
  mPadN=mesh(gPadN),mPadW=mesh(gPadW),mShoe=mesh(gShoe),mBeltOK=mesh(gBeltOK),mBeltBrk=mesh(gBeltBrk);
const mPax=PAXM.map(p=>({t:mesh(p.t),l:mesh(p.l),ad:mesh(p.ad),ah:[mesh(p.ah[0]),mesh(p.ah[1])]}));
function persp(fov,asp,n,f){const t=1/tan(fov/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;}
function lookAt(e,c,u){const f=nrm(sub(c,e)),s=nrm(crs(f,u)),t=crs(s,f),o=new Float32Array(16);
  o[0]=s[0];o[4]=s[1];o[8]=s[2];o[1]=t[0];o[5]=t[1];o[9]=t[2];o[2]=-f[0];o[6]=-f[1];o[10]=-f[2];
  o[12]=-(s[0]*e[0]+s[1]*e[1]+s[2]*e[2]);o[13]=-(t[0]*e[0]+t[1]*e[1]+t[2]*e[2]);o[14]=f[0]*e[0]+f[1]*e[1]+f[2]*e[2];o[15]=1;return o;}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let rr=0;rr<4;rr++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+rr]*b[c*4+k];o[c*4+rr]=s;}return o;}
gl.enable(gl.DEPTH_TEST);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
const I4=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const lx=new Float64Array(NLINK),ly=new Float64Array(NLINK);

/* ================= Jalan cerita ================= */
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const sm=x=>{x=cl(x);return x*x*(3-2*x)};
const seg=(t,a,b)=>sm((t-a)/(b-a));
const win=(t,a,b,f=.25)=>seg(t,a,a+f)*(1-seg(t,b-f,b));
const V=0.5,TR0=1.2;
const TST=BEATS[2]+.2,TDC=1.0;                         // eskalator berhenti
const T_FAIL=BEATS[2]+2.2,T_WORN=BEATS[3]+.3,T_SNAP=BEATS[3]+2.1,T_SLIDE=BEATS[4];
const TRS=TR0+V*TST+V*TDC/2;
function travelAt(t){
  if(t<TST)return TR0+V*t;
  if(t<TST+TDC){const p=(t-TST)/TDC;return TR0+V*TST+V*TDC*(p-p*p/2);}
  if(t<T_SLIDE)return TRS;
  const q=t-T_SLIDE,a=0.9,vm=2.2,tc=vm/a;
  return q<tc?TRS-.5*a*q*q:TRS-.5*a*tc*tc-vm*(q-tc);
}
/* syot kamera (sasaran, yaw, pitch, jarak) */
const SH_FULL={t:[XE*0.5,(r+YE)/2+0.2,0],yaw:-0.88,pitch:0.28,dist:15.5};
const SH_PIT={t:[XE+0.95,YE-0.55,0.25],yaw:-0.62,pitch:0.30,dist:4.3};
const SH_END={t:[XE*0.5,(r+YE)/2+0.1,0],yaw:-0.78,pitch:0.3,dist:15};
function lerpShot(a,b,k){return {t:[0,1,2].map(i=>a.t[i]+(b.t[i]-a.t[i])*k),yaw:a.yaw+(b.yaw-a.yaw)*k,pitch:a.pitch+(b.pitch-a.pitch)*k,dist:a.dist+(b.dist-a.dist)*k};}
function shotAt(t){
  let s=lerpShot(SH_FULL,SH_PIT,seg(t,BEATS[1]-.2,BEATS[1]+1.6));
  s=lerpShot(s,SH_END,seg(t,T_SLIDE-.3,T_SLIDE+1.6));
  s.yaw+=0.06*sin(t*0.35);
  return s;
}
function drawPax(travel,fall){
  for(const pi of PAX){const q0=(((travel+pi.i*PE+7)%LTOT)+LTOT)%LTOT-7;if(q0<-3.2||q0>SC+3.2)continue;
    let x,y,onStep;
    if(q0<0.55){x=q0-0.2;y=yFloorB;onStep=0;}else if(q0>SC-0.55){x=XE+(q0-SC)-0.2;y=yFloorT;onStep=0;}else{const p=at(q0);x=p[0]-0.2;y=p[1]+TREAD;onStep=1;}
    const M=mPax[pi.c],z=pi.z,sg=z>0?1:0;
    const edge=onStep?1:max(0,1-min(Math.abs(q0-0.55),Math.abs(q0-(SC-0.55)))/0.5),w=onStep?0:(1-edge),sw=0.5*w*sin(q0*2*PI/0.75);
    const lean=onStep?fall*0.28:0;                          // condong ke belakang bila meluncur
    bind(M.t);inst(M.t,x,y,z,lean);bind(M.l);inst(M.l,x,y+0.86,z+0.075,sw);inst(M.l,x,y+0.86,z-0.075,-sw);
    const hold=onStep||(q0>0.2&&q0<=0.55);
    bind(M.ad);inst(M.ad,x,y+1.37,z-(z>0?1:-1)*0.2,sw*0.8+lean);
    if(!hold)inst(M.ad,x,y+1.37,z+(z>0?1:-1)*0.2,-sw*0.8);
    else{bind(M.ah[sg]);inst(M.ah[sg],x,y,z,lean*0.5);}
  }
}
function beltDots(B,z,sp,skip0){for(let q=0;q<2;q++){if(skip0&&q===0)continue;const [p1,p2]=B[q],L=hypot(p2[0]-p1[0],p2[1]-p1[1]),pitch=0.06;
  for(let k=0;k*pitch<L;k++){let t=(((k*pitch+sp)%L)+L)%L/L;if(q===1)t=1-t;inst(mDot,p1[0]+(p2[0]-p1[0])*t,p1[1]+(p2[1]-p1[1])*t,z,0);}}}
let lastVP=null;
function render(t){
  const travel=travelAt(t),snap=t>=T_SNAP;
  const gbTravel=snap?travelAt(T_SNAP):travel;
  const fall=seg(t,T_SLIDE,T_SLIDE+1.2);
  const s=shotAt(t),cp=cos(s.pitch);
  const eye=[s.t[0]+s.dist*sin(s.yaw)*cp,s.t[1]+s.dist*sin(s.pitch),s.t[2]+s.dist*cos(s.yaw)*cp];
  const VP=mul(persp(35*PI/180,W/H,0.08,140),lookAt(eye,s.t,[0,1,0]));lastVP=VP;
  gl.viewport(0,0,W,H);
  gl.clearColor(.04,.06,.1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(U.uVP,false,VP);gl.uniform3fv(U.uEye,eye);gl.uniform1f(U.uTravel,travel);gl.uniform1f(U.uAlpha,1);
  gl.disable(gl.BLEND);gl.depthMask(true);
  gl.uniformMatrix4fv(U.uM,false,I4);
  bind(mMech);gl.drawArrays(gl.TRIANGLES,0,mMech.n);bind(mBody);gl.drawArrays(gl.TRIANGLES,0,mBody.n);bind(mRail);gl.drawArrays(gl.TRIANGLES,0,mRail.n);
  bind(mStep);for(let i=0;i<NST;i++){const p=at(travel+i*PE);inst(mStep,p[0],p[1],0,p[2]);}
  for(let j=0;j<NLINK;j++){const p=at(travel+j*CP);lx[j]=p[0];ly[j]=p[1];}
  bind(mLink);for(let j=0;j<NLINK;j++){const n=(j+1)%NLINK,a=atan2(ly[n]-ly[j],lx[n]-lx[j]);inst(mLink,lx[j],ly[j],ZCH,a);inst(mLink,lx[j],ly[j],-ZCH,a);}
  drawPax(travel,fall);
  bind(mMain);inst(mMain,TOPC[0],TOPC[1],0,-(travel-SC)/r);
  bind(mBot);inst(mBot,0,0,0,0);
  bind(mHS);inst(mHS,SHV[0],SHV[1],0,-travel/SHV_R);
  bind(mGB);inst(mGB,GBX[0],GBX[1],0,-gbTravel/r*MDS_R/GB_R);
  bind(snap?mBeltBrk:mBeltOK);inst(snap?mBeltBrk:mBeltOK,0,0,0,0);
  bind(mDot);beltDots(BELT1,ZDRV+0.02,gbTravel/r*MDS_R,snap);beltDots(BELT2,-ZDRV,travel/r*HSM_R,false);
  /* brek: tertutup bila berhenti, terbuka bila gagal, pad menipis bila haus */
  const closed=seg(t,TST,TST+TDC)*(1-seg(t,T_FAIL,T_FAIL+.4));
  const worn=t>=T_WORN+.35;
  const thk=worn?0.012:0.04,gap=0.035*(1-closed);
  for(const sg of [-1,1]){
    const xp=BRK.x+sg*(BRK.R+gap+thk/2),xs=BRK.x+sg*(BRK.R+gap+thk+0.015);
    bind(worn?mPadW:mPadN);inst(worn?mPadW:mPadN,xp,BRK.y,BRK.z,0);
    bind(mShoe);inst(mShoe,xs,BRK.y,BRK.z,0);
  }
  gl.enable(gl.BLEND);gl.depthMask(false);gl.uniformMatrix4fv(U.uM,false,I4);
  gl.uniform1f(U.uAlpha,0.12);bind(mShell);gl.drawArrays(gl.TRIANGLES,0,mShell.n);
  gl.uniform1f(U.uAlpha,1);bind(mGlass);gl.drawArrays(gl.TRIANGLES,0,mGlass.n);
  gl.disable(gl.BLEND);gl.depthMask(true);
}
function proj(p){const V2=lastVP,x=V2[0]*p[0]+V2[4]*p[1]+V2[8]*p[2]+V2[12],y=V2[1]*p[0]+V2[5]*p[1]+V2[9]*p[2]+V2[13],w=V2[3]*p[0]+V2[7]*p[1]+V2[11]*p[2]+V2[15];
  return [(x/w*.5+.5)*W,(1-(y/w*.5+.5))*H];}

/* ================= Teks atas video ================= */
const REDC='#ff4a5a',YELC='#f2c230';
function txt(c,s,x,y,size,col,a,glow){
  if(a<=0)return;
  c.save();c.globalAlpha=a;c.textAlign='center';c.font='900 '+size+'px "Arial Black",Impact,sans-serif';
  const mw=c.measureText(s).width;if(mw>980){size=Math.floor(size*980/mw);c.font='900 '+size+'px "Arial Black",Impact,sans-serif';}
  c.lineWidth=size*.14;c.strokeStyle='rgba(5,8,14,.92)';c.lineJoin='round';
  if(glow){c.shadowColor=col;c.shadowBlur=28;}
  c.strokeText(s,x,y);c.fillStyle=col;c.fillText(s,x,y);c.restore();
}
function ring(c,p,rad,col,a){if(a<=0)return;c.save();c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=7;c.shadowColor=col;c.shadowBlur=26;c.beginPath();c.arc(p[0],p[1],rad,0,7);c.stroke();c.restore();}
function tag(c,s,p,dx,dy,a){if(a<=0||window.VIDEO.hideLabels)return;
  c.save();c.globalAlpha=a;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[0]+dx,p[1]+dy);c.stroke();c.restore();
  txt(c,s,p[0]+dx,p[1]+dy-12,40,'#fff',a,false);}

window.VIDEO={width:W,height:H,fps:30,duration:D,loop:false,beats:BEATS,
draw(c,t,w,h){
  t=cl(t,0,D);
  render(t);
  c.drawImage(cv,0,0,w,h);
  // gelap atas untuk tajuk
  const g=c.createLinearGradient(0,0,0,620);g.addColorStop(0,'rgba(4,6,10,.85)');g.addColorStop(1,'rgba(4,6,10,0)');
  c.fillStyle=g;c.fillRect(0,0,w,620);
  const pB=proj([BRK.x,BRK.y,BRK.z]),pC=proj([(BELT1[0][0][0]+BELT1[0][1][0])/2,(BELT1[0][0][1]+BELT1[0][1][1])/2,ZDRV]);
  const kE=win(t,BEATS[1]+1.4,BEATS[2]+.3,.3);
  ring(c,pB,95,YELC,kE*(.65+.35*sin(t*6)));ring(c,pC,95,YELC,kE*(.65+.35*sin(t*6+1)));
  tag(c,'BREK',pB,-40,-150,kE);tag(c,'RANTAI PENGGERAK',pC,60,150,kE);
  const kF=win(t,T_FAIL,T_SNAP-.1,.3),kS=win(t,T_SNAP-.1,T_SLIDE+.6,.3);
  ring(c,pB,95,REDC,kF*(.6+.4*sin(t*10)));ring(c,pC,95,REDC,kS*(.6+.4*sin(t*10)));
  if(snap0(t)){const k=1-seg(t,T_SNAP,T_SNAP+.6);if(k>0){c.save();c.globalAlpha=k;c.shadowColor='#ffb347';c.shadowBlur=40;c.fillStyle='#ffd27a';
    for(let i=0;i<12;i++){const a=i/12*PI*2,rr=20+120*(1-k);c.beginPath();c.arc(pC[0]+cos(a)*rr,pC[1]+sin(a)*rr,7,0,7);c.fill();}c.restore();}}
  const L=(a,b,l1,l2,col,glow)=>{const k=win(t,a,b);txt(c,l1,w/2,250,92,col||'#fff',k,glow);if(l2)txt(c,l2,w/2,350,58,col||'#fff',k,glow);};
  L(BEATS[0],BEATS[1],'KORANG TAHU TAK?','ESKALATOR BOLEH MELUNCUR TURUN');
  L(BEATS[1],BEATS[2],'BREK & RANTAI PENGGERAK','YANG MENAHAN ANAK TANGGA');
  L(BEATS[2],T_FAIL,'ESKALATOR BERHENTI','',REDC,true);
  L(T_FAIL,BEATS[3],'BREK GAGAL','',REDC,true);
  L(BEATS[3],T_SNAP,'PAD BREK HAUS','',REDC,true);
  L(T_SNAP,T_SLIDE,'RANTAI PENGGERAK PUTUS','',REDC,true);
  L(T_SLIDE,BEATS[5],'ANAK TANGGA MENURUN','MENGIKUT BEBAN',REDC,true);
  const k=seg(t,BEATS[5],BEATS[5]+.5);txt(c,'JANGAN ABAIKAN',w/2,250,84,'#fff',k,false);txt(c,'SERVIS BERKALA',w/2,350,84,YELC,k,true);
}};
function snap0(t){return t>=T_SNAP;}
})();
