// Adegan 3D: perlawanan baseball waktu malam. Pembaling, pemukul, penangkap, home run.
// WebGL dilukis ke kanvas luar skrin, disalin ke kanvas video, teks di atasnya.
(function(){
'use strict';
const W=1080,H=1920,D=19.6;
const BEATS=[.3,4.4,8.0,11.4,13.2,15.0,19.0]; // 6 ayat + penanda tamat
const cv=document.createElement('canvas');cv.width=W;cv.height=H;
const gl=cv.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});
const {sin,cos,PI,atan2,hypot,max,min,sqrt,tan,abs}=Math;
const cl=(x,a=0,b=1)=>max(a,min(b,x));
const sm=x=>{x=cl(x);return x*x*(3-2*x)};
const seg=(t,a,b)=>sm((t-a)/(b-a));
const win=(t,a,b,f=.25)=>seg(t,a,a+f)*(1-seg(t,b-f,b));
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mulv=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>hypot(a[0],a[1],a[2]),nrm=a=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l]};
const lerp=(a,b,k)=>a+(b-a)*k,lerpv=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;

/* ================= Pembina geometri ================= */
class Geo{constructor(){this.d=[];}
  v(p,n,c,m){this.d.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],m||0);}
  tri(a,b,c,col,m){const n=nrm(crs(sub(b,a),sub(c,a)));this.v(a,n,col,m);this.v(b,n,col,m);this.v(c,n,col,m);}
  quad(a,b,c,d,col,m){this.tri(a,b,c,col,m);this.tri(a,c,d,col,m);}}
function box(g,c,s,col,m,ry){const hx=s[0]/2,hy=s[1]/2,hz=s[2]/2,cs=cos(ry||0),sn=sin(ry||0);
  const p=(x,y,z)=>[c[0]+x*cs+z*sn,c[1]+y,c[2]-x*sn+z*cs];
  const a=p(-hx,-hy,-hz),b=p(hx,-hy,-hz),cc=p(hx,hy,-hz),d=p(-hx,hy,-hz),e=p(-hx,-hy,hz),f=p(hx,-hy,hz),gg=p(hx,hy,hz),h=p(-hx,hy,hz);
  g.quad(d,cc,b,a,col,m);g.quad(e,f,gg,h,col,m);g.quad(a,b,f,e,col,m);g.quad(h,gg,cc,d,col,m);g.quad(a,e,h,d,col,m);g.quad(b,cc,gg,f,col,m);}
function cyl(g,p0,p1,r0,col,m,sg,r1){sg=sg||10;r1=r1===undefined?r0:r1;const d=nrm(sub(p1,p0)),ref=abs(d[1])<.9?[0,1,0]:[1,0,0];
  const e1=nrm(crs(d,ref)),e2=crs(d,e1);
  for(let i=0;i<sg;i++){const a0=2*PI*i/sg,a1=2*PI*(i+1)/sg;
    const n0=add(mulv(e1,cos(a0)),mulv(e2,sin(a0))),n1=add(mulv(e1,cos(a1)),mulv(e2,sin(a1)));
    const A0=add(p0,mulv(n0,r0)),A1=add(p0,mulv(n1,r0)),B0=add(p1,mulv(n0,r1)),B1=add(p1,mulv(n1,r1));
    g.v(A0,n0,col,m);g.v(A1,n1,col,m);g.v(B1,n1,col,m);g.v(A0,n0,col,m);g.v(B1,n1,col,m);g.v(B0,n0,col,m);
    g.v(p1,d,col,m);g.v(B0,d,col,m);g.v(B1,d,col,m);}}
function sphere(g,c,r,col,m,na,nb){na=na||6;nb=nb||9;const P=(i,j)=>{const th=PI*i/na,ph=2*PI*j/nb,n=[sin(th)*cos(ph),cos(th),sin(th)*sin(ph)];return [add(c,mulv(n,r)),n]};
  for(let i=0;i<na;i++)for(let j=0;j<nb;j++){const a=P(i,j),b=P(i+1,j),cc=P(i+1,j+1),d=P(i,j+1);
    g.v(a[0],a[1],col,m);g.v(b[0],b[1],col,m);g.v(cc[0],cc[1],col,m);g.v(a[0],a[1],col,m);g.v(cc[0],cc[1],col,m);g.v(d[0],d[1],col,m);}}

/* ================= Padang (statik) ================= */
const GRASS=[.16,.45,.17],DIRT=[.62,.42,.26],WHITE=[.95,.95,.92],WALL=[.08,.2,.16],SEAT=[.1,.12,.17],DARK=[.06,.07,.09];
const BASE=27.43/Math.SQRT2;
const g0=new Geo();
g0.quad([-300,0,-300],[-300,0,300],[300,0,300],[300,0,-300],GRASS,1);
// tanah infield: kipas dari belakang home plate ke lengkok rumput luar
{const y=.01,Rr=29,c=[0,y,-BASE],pts=[];
 for(let k=0;k<=40;k++){const a=-PI/4-PI/2*k/40;pts.push([c[0]-Rr*sin(a),y,c[2]-Rr*cos(a)]);}
 const H0=[0,y,1.5];for(let k=0;k<pts.length-1;k++)g0.tri(H0,pts[k],pts[k+1],DIRT,2);}
// rumput dalam berlian
{const y=.02,s=BASE-2.6,o=[0,y,-BASE];g0.quad([o[0],y,o[2]+s],[o[0]+s,y,o[2]],[o[0],y,o[2]-s],[o[0]-s,y,o[2]],GRASS,1);}
// bukit pembaling & bulatan pemukul
for(let k=0;k<24;k++){const a=2*PI*k/24,b=2*PI*(k+1)/24,r=2.7,c=[0,.02,-18.44];
  g0.tri([c[0],.25,c[2]],[c[0]+r*cos(b),.03,c[2]+r*sin(b)],[c[0]+r*cos(a),.03,c[2]+r*sin(a)],DIRT,2);
  const rr=4;g0.tri([0,.025,0],[rr*cos(b),.025,rr*sin(b)],[rr*cos(a),.025,rr*sin(a)],DIRT,2);}
box(g0,[0,.26,-18.44],[.61,.02,.15],WHITE,0);
// home plate & bes
g0.tri([0,.04,0],[.22,.04,-.22],[-.22,.04,-.22],WHITE,0);g0.quad([-.22,.04,-.22],[.22,.04,-.22],[.22,.04,-.43],[-.22,.04,-.43],WHITE,0);
for(const p of [[BASE,0,-BASE],[0,0,-2*BASE],[-BASE,0,-BASE]])box(g0,[p[0],.06,p[2]],[.38,.08,.38],WHITE,0,PI/4);
// garisan kapur & kotak pemukul
for(const s of [-1,1]){cyl(g0,[0,.03,0],[s*75,.03,-75],.05,WHITE,0,4);
  box(g0,[s*.95,.03,-.2],[.05,.01,1.8],WHITE,0);box(g0,[s*1.55,.03,-.2],[.05,.01,1.8],WHITE,0);}
// pagar luar, tempat duduk, penonton
const FR=105;
{const N=120;const P=(a,R,y)=>[R*sin(a),y,-R*cos(a)];
 for(let k=0;k<N;k++){const a0=-PI/4-.06+(PI/2+.12)*k/N,a1=-PI/4-.06+(PI/2+.12)*(k+1)/N;
  g0.quad(P(a0,FR,0),P(a1,FR,0),P(a1,FR,3),P(a0,FR,3),WALL,0);
  g0.quad(P(a0,FR,3),P(a1,FR,3),P(a1,FR+.3,3.1),P(a0,FR+.3,3.1),[.9,.75,.15],0);
  g0.quad(P(a0,FR+.3,3),P(a1,FR+.3,3),P(a1,FR+40,26),P(a0,FR+40,26),SEAT,0);}
 const CC=[[.85,.2,.2],[.9,.9,.9],[.2,.35,.8],[.95,.75,.2],[.15,.15,.18],[.3,.6,.35],[.85,.5,.3]];
 for(let row=0;row<22;row++)for(let k=0;k<260;k++){if(rnd()<.18)continue;
   const a=-PI/4-.05+(PI/2+.1)*(k+rnd()*.5)/260,R=FR+1.5+row*1.75,y=3.4+row*1.05;
   const c=CC[(rnd()*CC.length)|0],cx=R*sin(a),cz=-R*cos(a),tx=cos(a)*.22,tz=sin(a)*.22;
   const p=(u,v)=>[cx+tx*u,y+v,cz+tz*u];g0.quad(p(-1,0),p(1,0),p(1,.7),p(-1,.7),c,0);
   const hc=[.55+rnd()*.3,.4+rnd()*.2,.3];const q=(u,v)=>[cx+tx*u*.6,y+.7+v,cz+tz*u*.6];g0.quad(q(-1,0),q(1,0),q(1,.3),q(-1,.3),hc,0);}
 for(let k=0;k<60;k++){const a0=PI*.62+PI*.76*k/60,a1=PI*.62+PI*.76*(k+1)/60;
   g0.quad(P(a0,22,0),P(a1,22,0),P(a1,22,2.5),P(a0,22,2.5),WALL,0);g0.quad(P(a0,22,2.5),P(a1,22,2.5),P(a1,45,18),P(a0,45,18),SEAT,0);}}
// menara lampu
for(const [x,z] of [[-75,-95],[75,-95],[-60,25],[60,25],[0,-150]]){cyl(g0,[x,0,z],[x,42,z],.6,DARK,0,6);box(g0,[x,44,z],[9,4,.6],[1,1,.92],3,atan2(x,-z));}
box(g0,[-55,22,-125],[22,10,1],[.04,.05,.06],0,.4);
const gBall=new Geo();sphere(gBall,[0,0,0],.037,[1,1,.97],3,6,8);
const gMitt=new Geo();sphere(gMitt,[0,0,0],.11,[.45,.25,.12],0,5,7);

/* ================= WebGL ================= */
const VS=`attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;attribute float aM;uniform mat4 uVP;uniform vec3 uT;uniform float uS;
varying vec3 vN,vW,vC;varying float vM;
void main(){vec3 w=aP*uS+uT;vW=w;vN=aN;vC=aC;vM=aM;gl_Position=uVP*vec4(w,1.);}`;
const FS=`precision highp float;uniform vec3 uEye;varying vec3 vN,vW,vC;varying float vM;
void main(){vec3 n=normalize(vN),v=normalize(uEye-vW);if(dot(n,v)<0.)n=-n;vec3 b=vC;float d=length(uEye-vW);
 if(vM>2.5){gl_FragColor=vec4(b*1.3,1.);return;}
 if(vM>.5&&vM<1.5){float s=step(.5,fract((vW.x+vW.z)/8.));b*=.9+.14*s;}
 if(vM>1.5&&vM<2.5){b*=.94+.06*fract(sin(dot(floor(vW.xz*8.),vec2(12.9,78.2)))*43758.);}
 vec3 L=normalize(vec3(.2,1.,.35)),L2=normalize(vec3(-.6,.7,-.4));
 float df=max(dot(n,L),0.),d2=max(dot(n,L2),0.);
 vec3 c=b*(.32+.62*df+.25*d2);c+=vec3(pow(max(dot(n,normalize(L+v)),0.),30.)*.18);
 float fog=clamp((d-60.)/160.,0.,1.);c=mix(c,vec3(.03,.05,.1),fog);
 gl_FragColor=vec4(c,1.);}`;
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;}
const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));
['aP','aN','aC','aM'].forEach((n,i)=>gl.bindAttribLocation(prog,i,n));gl.linkProgram(prog);gl.useProgram(prog);
const U={};for(const n of ['uVP','uT','uS','uEye'])U[n]=gl.getUniformLocation(prog,n);
for(let i=0;i<4;i++)gl.enableVertexAttribArray(i);
function mesh(g){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.d),gl.STATIC_DRAW);return {b,n:g.d.length/10};}
function draw(m,t,s){gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.vertexAttribPointer(0,3,gl.FLOAT,false,40,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,40,12);
  gl.vertexAttribPointer(2,3,gl.FLOAT,false,40,24);gl.vertexAttribPointer(3,1,gl.FLOAT,false,40,36);
  gl.uniform3fv(U.uT,t||[0,0,0]);gl.uniform1f(U.uS,s||1);gl.drawArrays(gl.TRIANGLES,0,m.n);}
const mField=mesh(g0),mBall=mesh(gBall),mMitt=mesh(gMitt);
const dynBuf=gl.createBuffer();
function persp(fov,asp,n,f){const t=1/tan(fov/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;}
function lookAt(e,c,u){const f=nrm(sub(c,e)),s=nrm(crs(f,u)),t=crs(s,f),o=new Float32Array(16);
  o[0]=s[0];o[4]=s[1];o[8]=s[2];o[1]=t[0];o[5]=t[1];o[9]=t[2];o[2]=-f[0];o[6]=-f[1];o[10]=-f[2];
  o[12]=-dot(s,e);o[13]=-dot(t,e);o[14]=dot(f,e);o[15]=1;return o;}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
gl.enable(gl.DEPTH_TEST);

/* ================= Watak bersendi ================= */
function ik(s,t,l1,l2,pole){let d=sub(t,s),Dd=len(d);const m=l1+l2-.001;if(Dd>m){d=mulv(d,m/Dd);Dd=m;}Dd=max(Dd,.05);
  const dn=mulv(d,1/Dd),a=(l1*l1-l2*l2+Dd*Dd)/(2*Dd),h=sqrt(max(0,l1*l1-a*a));
  const p=nrm(sub(pole,mulv(dn,dot(pole,dn))));return [add(add(s,mulv(dn,a)),mulv(p,h)),add(s,d)];}
// rangka tempatan: [kanan, atas, depan]
function frame(base,yaw){const f=[sin(yaw),0,cos(yaw)],r=[-cos(yaw),0,sin(yaw)];
  const dir=p=>add(add(mulv(r,p[0]),[0,p[1],0]),mulv(f,p[2]));return {base,dir,w:p=>add(base,dir(p))};}
const SKIN=[.78,.56,.42];
function person(g,F,P,col){
  const pel=F.w(P.pel),chest=F.w(P.chest),head=F.w(P.head),tw=P.tw||0;
  const shp=k=>F.w(add(P.chest,[k*.2*cos(tw),.02,-k*.2*sin(tw)])),hpp=k=>F.w(add(P.pel,[k*.11*cos(tw*.5),-.03,-k*.11*sin(tw*.5)]));
  cyl(g,pel,chest,.15,col.top,0,10,.17);sphere(g,pel,.15,col.pant,0);
  cyl(g,chest,head,.05,SKIN,0,6);sphere(g,head,.115,SKIN,0);
  sphere(g,add(head,[0,.045,0]),.12,col.cap,0,4,9);cyl(g,add(head,F.dir([0,.035,.05])),add(head,F.dir([0,.03,.17])),.06,col.cap,0,8,.07);
  for(const k of [-1,1]){
    const S=shp(k),[el,hd]=ik(S,F.w(k>0?P.hR:P.hL),.3,.28,F.dir([k*.4,-.6,-.5]));
    cyl(g,S,el,.05,col.top,0,7);cyl(g,el,hd,.042,SKIN,0,7);
    const glove=k<0&&col.glove;sphere(g,hd,glove?.08:.045,glove?[.45,.25,.12]:SKIN,0,4,6);
    const Hp=hpp(k),[kn,ft]=ik(Hp,F.w(k>0?P.fR:P.fL),.46,.46,F.dir([0,.2,1]));
    cyl(g,Hp,kn,.07,col.pant,0,8);cyl(g,kn,ft,.058,col.pant,0,8);
    cyl(g,add(ft,[0,-.03,0]),add(add(ft,F.dir([0,0,.14])),[0,-.03,0]),.045,[.08,.08,.09],0,6);
  }
}
const POSE=o=>Object.assign({pel:[0,.95,0],chest:[0,1.42,0],head:[0,1.7,0],hL:[-.25,.85,.05],hR:[.25,.85,.05],fL:[-.15,.06,0],fR:[.15,.06,0],tw:0},o);
function mix(A,B,k){const o={};for(const key in A)o[key]=Array.isArray(A[key])?lerpv(A[key],B[key],k):lerp(A[key],B[key],k);return o;}
function keys(list,p){if(p<=list[0][0])return list[0][1];
  for(let i=0;i<list.length-1;i++){const [a,A]=list[i],[b,B]=list[i+1];if(p<=b)return mix(A,B,sm((p-a)/(b-a)));}return list[list.length-1][1];}

/* pembaling, menghadap +z ke home plate */
const PIT=frame([0,.25,-18.44],0);
const PK=[
 [0,POSE({hL:[-.05,1.25,.25],hR:[.05,1.25,.25],fL:[-.18,.05,0],fR:[.18,.05,0]})],
 [.45,POSE({pel:[0,1.0,-.05],chest:[.05,1.45,-.12],head:[.05,1.72,-.1],hL:[-.02,1.3,.2],hR:[.08,1.3,.2],fL:[-.12,.72,.25],fR:[.15,.05,0]})],
 [.8,POSE({pel:[0,.82,.45],chest:[.05,1.28,.42],head:[.05,1.55,.5],hL:[-.35,1.4,.75],hR:[.6,1.55,-.55],fL:[-.18,.06,1.1],fR:[.17,.08,.05],tw:-.5})],
 [1,POSE({pel:[0,.8,.62],chest:[0,1.22,.9],head:[0,1.48,1.02],hL:[-.35,1.0,.5],hR:[.22,1.72,1.05],fL:[-.18,.06,1.15],fR:[.15,.12,.15],tw:.4})],
 [1.6,POSE({pel:[0,.78,.8],chest:[-.05,1.1,1.1],head:[-.05,1.35,1.25],hL:[-.3,.95,.6],hR:[-.4,.75,1.15],fL:[-.18,.06,1.15],fR:[.2,.25,.55],tw:.7})],
 [2.6,POSE({pel:[0,.92,.3],chest:[0,1.38,.35],head:[0,1.66,.38],hL:[-.3,1.0,.5],hR:[.25,.9,.4],fL:[-.18,.06,.6],fR:[.18,.06,.1]})]];
/* pemukul tangan kanan, di sisi bes ketiga, menghadap +x */
const BAT=frame([-.95,0,-.15],PI/2);
const BK=[
 [0,POSE({pel:[0,.9,0],chest:[.02,1.36,.06],head:[-.05,1.63,.08],hL:[.2,1.42,.16],hR:[.27,1.5,.15],fL:[-.42,.06,0],fR:[.42,.06,0],tw:.25}),[.35,.85,-.35]],
 [.35,POSE({pel:[-.08,.86,0],chest:[0,1.32,.06],head:[-.08,1.6,.1],hL:[.24,1.45,.08],hR:[.3,1.52,.06],fL:[-.68,.06,.02],fR:[.42,.06,0],tw:.45}),[.45,.8,-.45]],
 [.7,POSE({pel:[-.15,.86,.05],chest:[-.12,1.32,.12],head:[-.16,1.6,.12],hL:[-.12,1.0,.42],hR:[-.06,1.04,.4],fL:[-.68,.06,.02],fR:[.36,.1,0],tw:-.6}),[-.12,0,1]],
 [1,POSE({pel:[-.18,.88,.02],chest:[-.18,1.34,0],head:[-.2,1.6,.05],hL:[-.32,1.45,-.12],hR:[-.26,1.5,-.08],fL:[-.68,.06,.02],fR:[.3,.18,.1],tw:-1.3}),[-.3,.45,-1]]];
function batKey(s){let i=0;while(i<BK.length-2&&s>BK[i+1][0])i++;const [a,A,da]=BK[i],[b,B,db]=BK[i+1],k=sm((s-a)/(b-a));
  return {pose:mix(A,B,k),dir:nrm(lerpv(nrm(da),nrm(db),k))};}
/* penangkap mencangkung, menghadap -z */
const CAT=frame([0,0,1.05],PI);
const CPOSE=POSE({pel:[0,.5,-.1],chest:[0,.95,.05],head:[0,1.2,.1],hL:[-.05,.75,.4],hR:[.25,.55,.2],fL:[-.32,.06,.05],fR:[.32,.06,.05]});
const UMP=frame([0,0,2.2],PI);
const UPOSE=POSE({pel:[0,.75,0],chest:[0,1.2,.1],head:[0,1.48,.15],hL:[-.3,.8,.2],hR:[.3,.8,.2],fL:[-.25,.06,0],fR:[.25,.06,0]});
const FIELDERS=[[BASE+1.5,-BASE-3,-PI*.8],[6,-2*BASE+4,PI],[-6,-2*BASE+4,PI],[-BASE-1.5,-BASE-3,PI*.8],[-30,-70,PI*.9],[0,-80,PI],[30,-70,-PI*.9]];
const FPOSE=POSE({pel:[0,.85,0],chest:[0,1.3,.12],head:[0,1.58,.15],hL:[-.28,.95,.3],hR:[.28,.95,.3],fL:[-.28,.06,0],fR:[.28,.06,0]});

/* ================= Jalan cerita ================= */
// tr = masa bola dilepas, du = masa sampai plat, sl = faktor gerak perlahan
const PITCHES=[
 {tr:2.5,du:.42,sl:1,type:'catch'},
 {tr:6.0,du:2.3,sl:4,type:'catch'},
 {tr:9.9,du:1.1,sl:2,type:'catch'},
 {tr:12.25,du:.42,sl:1,type:'miss'},
 {tr:14.0,du:1.0,sl:2.2,type:'hit'}];
const RELEASE=PIT.w(PK[3][1].hR);
const MITT=CAT.w([-.05,.78,.42]);
const CONTACT=add(lerpv(BAT.w(BK[2][1].hL),BAT.w(BK[2][1].hR),.5),mulv(BAT.dir(nrm(BK[2][2])),.62));
function pitchAt(t){let cur=PITCHES[0];for(const p of PITCHES){if(t>=p.tr-min(p.sl,1.5))cur=p;}return cur;}
function pitcherPose(t){const p=pitchAt(t),wu=min(p.sl,1.5);
  const ph=t<p.tr?cl((t-(p.tr-wu))/wu):1+(t-p.tr)/(.55*p.sl);return keys(PK,min(ph,2.6));}
function pitchPos(p,u){const tgt=p.type==='hit'?CONTACT:MITT;const q=lerpv(RELEASE,tgt,u);q[1]+=.25*sin(PI*u)-.05*u*u;return q;}
const T_HIT=PITCHES[4].tr+PITCHES[4].du,FT=4.0,LAND=[-14,8,-125],G=9.8;
const V0=(()=>{const d=sub(LAND,CONTACT);return [d[0]/FT,(d[1]+.5*G*FT*FT)/FT,d[2]/FT];})();
function flight(tau){tau=cl(tau,0,FT);return [CONTACT[0]+V0[0]*tau,CONTACT[1]+V0[1]*tau-.5*G*tau*tau,CONTACT[2]+V0[2]*tau];}
function ballAt(t){const p=pitchAt(t);if(t<p.tr)return null;const u=(t-p.tr)/p.du;
  if(u<=1)return {pos:pitchPos(p,u),u,p};
  if(p.type!=='hit')return {pos:MITT,u:1,p,held:true};
  return {pos:flight(t-T_HIT),u,p,fly:t-T_HIT};}
function batterState(t){
  for(const p of PITCHES){if(p.type==='catch')continue;const T=.32*p.sl,tc=p.type==='hit'?p.tr+p.du:p.tr+.12;
    const s=(t-(tc-.7*T))/T;if(s>=0&&s<=4)return batKey(min(s,1));}
  const k=batKey(0);k.pose.hR=add(k.pose.hR,[0,.02*sin(t*3),0]);k.pose.hL=add(k.pose.hL,[0,.02*sin(t*3),0]);return k;}

/* ================= Kamera ================= */
function camAt(t){
  if(t<BEATS[1])return {e:[1.2,3.4,-31],c:[0,1.1,-4],f:16};                  // TV, dari belakang pembaling
  if(t<BEATS[2]){const b=ballAt(t);let z=-17;if(b&&!b.held)z=b.pos[2];else if(b&&b.held)z=-.5;
    z=cl(z,-17.5,-.5);return {e:[2.4,1.35,z+1.9],c:[-.1,1.55,z-.4],f:48};}                // dari tepi, ikut bola
  if(t<BEATS[3])return {e:[-.25,2.4,5.2],c:[-.45,1.1,-8],f:40};              // dari belakang pengadil
  if(t<BEATS[4])return {e:[3.2,1.45,2.2],c:[-.6,1.15,-.6],f:46};             // hayun terlalu awal
  if(t<T_HIT+.05)return {e:[2.4,1.05,-2.3],c:[-.4,1.15,-.3],f:42};           // pukulan tepat
  const tau=t-T_HIT,k=sm(tau/.7);
  const e=lerpv([2.4,1.05,-2.3],lerpv([2.5,3.2,8],[-2,7,-20],sm(tau/(FT+.8))),k);
  return {e,c:lerpv([-.4,1.15,-.3],lerpv(flight(tau),[-8,10,-95],.35),k),f:52};
}

/* ================= Lukis 3D ================= */
let lastVP=null;
const COL={pit:{top:[.92,.92,.95],pant:[.9,.9,.92],cap:[.1,.15,.4]},bat:{top:[.55,.57,.62],pant:[.62,.64,.68],cap:[.8,.1,.12]},
  cat:{top:[.15,.17,.22],pant:[.55,.57,.62],cap:[.1,.1,.12],glove:1},fld:{top:[.92,.92,.95],pant:[.9,.9,.92],cap:[.1,.15,.4],glove:1},ump:{top:[.1,.1,.12],pant:[.35,.36,.4],cap:[.1,.1,.12]}};
function render(t){
  const cm=camAt(t),VP=mul(persp(cm.f*PI/180,W/H,.1,600),lookAt(cm.e,cm.c,[0,1,0]));lastVP=VP;
  gl.viewport(0,0,W,H);gl.clearColor(.03,.05,.1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(U.uVP,false,VP);gl.uniform3fv(U.uEye,cm.e);
  draw(mField);
  const g=new Geo(),pp=pitcherPose(t);
  person(g,PIT,pp,COL.pit);
  const bs=batterState(t);person(g,BAT,bs.pose,COL.bat);
  const hc=lerpv(BAT.w(bs.pose.hL),BAT.w(bs.pose.hR),.5),bd=BAT.dir(bs.dir);
  cyl(g,add(hc,mulv(bd,-.12)),add(hc,mulv(bd,.4)),.018,[.75,.55,.3],0,8,.026);cyl(g,add(hc,mulv(bd,.4)),add(hc,mulv(bd,.86)),.026,[.75,.55,.3],0,8,.034);
  person(g,CAT,CPOSE,COL.cat);person(g,UMP,UPOSE,COL.ump);
  for(const [x,z,y] of FIELDERS)person(g,frame([x,0,z],y),FPOSE,COL.fld);
  gl.bindBuffer(gl.ARRAY_BUFFER,dynBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.d),gl.DYNAMIC_DRAW);
  draw({b:dynBuf,n:g.d.length/10});
  draw(mMitt,MITT);
  const b=ballAt(t);
  if(b)draw(mBall,b.pos,b.fly!==undefined?3:(b.p.sl>1?2:1.4));
  else draw(mBall,PIT.w(pp.hR),1.2);
}
function proj(p){const V=lastVP,x=V[0]*p[0]+V[4]*p[1]+V[8]*p[2]+V[12],y=V[1]*p[0]+V[5]*p[1]+V[9]*p[2]+V[13],w=V[3]*p[0]+V[7]*p[1]+V[11]*p[2]+V[15];
  return w>0?[(x/w*.5+.5)*W,(1-(y/w*.5+.5))*H]:null;}

/* ================= Teks & kesan ================= */
const RED='#ff4a5a',YEL='#ffd23a';
function txt(c,s,x,y,size,col,a,glow){if(a<=0)return;c.save();c.globalAlpha=a;c.textAlign='center';
  c.font='900 '+size+'px "Arial Black",Impact,sans-serif';const mw=c.measureText(s).width;if(mw>980){size=Math.floor(size*980/mw);c.font='900 '+size+'px "Arial Black",Impact,sans-serif';}
  c.lineWidth=size*.14;c.strokeStyle='rgba(5,8,14,.92)';c.lineJoin='round';if(glow){c.shadowColor=col;c.shadowBlur=30;}
  c.strokeText(s,x,y);c.fillStyle=col;c.fillText(s,x,y);c.restore();}
function burst(c,x,y,k,col,n,R){if(k<=0||k>=1)return;c.save();c.globalAlpha=1-k;c.fillStyle=col;c.shadowColor=col;c.shadowBlur=20;
  for(let i=0;i<n;i++){const a=i/n*PI*2,r=R*sm(k);c.beginPath();c.arc(x+cos(a)*r,y+sin(a)*r+60*k*k,6,0,7);c.fill();}c.restore();}

window.VIDEO={width:W,height:H,fps:30,duration:D,loop:false,beats:BEATS,
draw(c,t,w,h){
  t=cl(t,0,D);render(t);c.drawImage(cv,0,0,w,h);
  const g=c.createLinearGradient(0,0,0,560);g.addColorStop(0,'rgba(3,5,10,.8)');g.addColorStop(1,'rgba(3,5,10,0)');c.fillStyle=g;c.fillRect(0,0,w,560);
  const b=ballAt(t);
  if(b&&!b.held&&b.fly===undefined){const p=proj(b.pos),p0=proj(pitchPos(b.p,max(0,b.u-.12)));
    if(p&&p0){c.save();c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=6;c.lineCap='round';c.shadowColor='#fff';c.shadowBlur=18;c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p[0],p[1]);c.stroke();c.restore();}}
  if(b&&b.fly!==undefined&&b.fly<FT){c.save();c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=8;c.lineCap='round';c.shadowColor='#fff';c.shadowBlur=24;c.beginPath();
    let first=true;for(let k=0;k<=12;k++){const q=proj(flight(b.fly-.6+.05*k));if(!q)continue;if(first){c.moveTo(q[0],q[1]);first=false}else c.lineTo(q[0],q[1]);}c.stroke();const q=proj(b.pos);if(q){c.fillStyle='#fff';c.beginPath();c.arc(q[0],q[1],14,0,7);c.fill();}c.restore();}
  {const P=PITCHES[1],k=win(t,P.tr-.6,BEATS[2]-.1,.2);if(k>0){const u=cl((t-P.tr)/P.du);txt(c,(u*.42).toFixed(2)+' s',w/2,h-360,130,'#fff',k,false);}}
  {const k=(t-T_HIT)/.5;if(k>0&&k<1){const p=proj(CONTACT);if(p){c.save();c.globalAlpha=1-k;const rg=c.createRadialGradient(p[0],p[1],0,p[0],p[1],320*k+60);
    rg.addColorStop(0,'rgba(255,250,220,1)');rg.addColorStop(1,'rgba(255,250,220,0)');c.fillStyle=rg;c.fillRect(0,0,w,h);c.restore();}}}
  for(let i=0;i<8;i++){const t0=T_HIT+FT-.6+i*.3,k=(t-t0)/1.1;burst(c,180+((i*317)%720),560+((i*211)%460),k,['#ffd23a','#ff4a5a','#5ad1ff','#fff'][i%4],18,170);}
  const L=(a,bb,l1,l2,col,glow,sz)=>{const k=win(t,a,bb);txt(c,l1,w/2,260,sz||104,col||'#fff',k,glow);if(l2)txt(c,l2,w/2,355,56,'#fff',k,false);};
  L(BEATS[0],BEATS[1],'150 KM/J','BALINGAN BOLA BASEBALL',YEL,true,140);
  L(BEATS[1],BEATS[2],'KURANG 0.5 SAAT','DARI PEMBALING KE PEMUKUL');
  L(BEATS[2],BEATS[3],'SEKELIP MATA','BACA ARAH BOLA');
  L(BEATS[3],BEATS[4],'TERLALU AWAL...','',RED,true);
  L(BEATS[4],BEATS[5],'TEPAT PADA MASANYA','',YEL,true);
  txt(c,'HOME RUN!',w/2,300,150,YEL,seg(t,BEATS[5]+.2,BEATS[5]+.6),true);
}};
})();
