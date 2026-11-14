// Adegan 3D MRT: pemuda beri tempat duduk kepada ibu mengandung.
// Watak = model manusia MakeHuman (CC0) yang dikemas dalam model/*.glb, digerakkan melalui rangka tulang (lib/rig.js).
(function(){
'use strict';
const W=1080,H=1920,D=20.4;
const BEATS=[.3,4.4,7.4,9.8,13.2,16.4,19.8]; // 6 ayat = 6 penanda mula + 1 penanda tamat
const {sin,cos,PI,max,min,abs}=Math;
const cl=(x,a=0,b=1)=>max(a,min(b,x)),sm=x=>{x=cl(x);return x*x*(3-2*x)},seg=(t,a,b)=>sm((t-a)/(b-a));
const win=(t,a,b,f=.3)=>seg(t,a,a+f)*(1-seg(t,b-f,b));
const lerp=(a,b,k)=>a+(b-a)*k,lv=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mv=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const fwdOf=y=>[sin(y),0,cos(y)],leftOf=y=>[cos(y),0,-sin(y)];

let T=null,R3,scene,cam,cv,rigs={},bg=[],phones={},winTex,ready=false;
const ZW=1.45,HC=2.25,BAR_Y=1.95,HANDLE_Y=1.74;
const SEAT_Y=.48,HIPS=.57;

async function setup(st){
  for(const l of ['lib/three.min.js','lib/GLTFLoader.js','lib/SkeletonUtils.js','lib/rig.js'])await getLib(l);
  T=window.THREE;
  cv=document.createElement('canvas');cv.width=W;cv.height=H;
  R3=new T.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});
  R3.setSize(W,H,false);R3.outputEncoding=T.sRGBEncoding;R3.toneMapping=T.ACESFilmicToneMapping;R3.toneMappingExposure=1.05;
  R3.shadowMap.enabled=true;R3.shadowMap.type=T.PCFSoftShadowMap;
  scene=new T.Scene();scene.background=new T.Color(0x0b0f16);
  cam=new T.PerspectiveCamera(40,W/H,.03,60);
  buildCar();
  const loader=new T.GLTFLoader(),cache={};
  async function model(n){if(!cache[n]){st&&st('Memuatkan model '+n+'...');const buf=await getBin('model/'+n+'.glb');
    cache[n]=await new Promise((res,rej)=>loader.parse(buf,'',g=>res(g.scene),rej));return cache[n];}
    return T.SkeletonUtils.clone(cache[n]);}
  async function rig(n){const o=await model(n);scene.add(o);return new Rig(o);}
  rigs.ibu=await rig('ibu');rigs.pemuda=await rig('pemuda');
  // penumpang duduk (penuh) dan berdiri
  const seatsNear=[[-1.8,'wanita3'],[-1.2,'lelaki2'],[-.6,'wanita2'],[.6,'lelaki3'],[1.2,'wanita3'],[1.8,'lelaki2']];
  const seatsFar=[[-1.8,'lelaki3'],[-1.2,'wanita2'],[-.6,'lelaki2'],[0,'wanita3'],[.6,'lelaki3'],[1.2,'wanita2'],[1.8,'lelaki2']];
  let k=0;
  for(const [x,n] of seatsNear){const r=await rig(n);bg.push({r,kind:'sit',x,zs:-1,mode:['phone','phone','sleep','phone','look','phone'][k++%6]});}
  for(const [x,n] of seatsFar){const r=await rig(n);bg.push({r,kind:'sit',x,zs:1,mode:['phone','sleep','phone','phone','look','phone','phone'][k++%7]});}
  for(const [x,z,n,y] of [[-1.55,.62,'lelaki2',PI*.95],[-2.25,-.6,'wanita2',PI*.05],[-3.0,.55,'lelaki3',PI*.9],[-3.3,-.5,'wanita3',.1],[2.95,.5,'lelaki3',-PI*.6]]){
    const r=await rig(n);bg.push({r,kind:'stand',x,z,yaw:y});}
  // telefon
  const pm=new T.MeshStandardMaterial({color:0x111216,roughness:.4}),sm2=new T.MeshBasicMaterial({color:0x6aa8ff});
  const mkPhone=()=>{const g=new T.Group(),b=new T.Mesh(new T.BoxGeometry(.075,.008,.155),pm),s=new T.Mesh(new T.PlaneGeometry(.066,.14),sm2);
    s.rotation.x=-PI/2;s.position.y=.0045;g.add(b,s);scene.add(g);return g;};
  phones.man=mkPhone();for(const b of bg)if(b.kind==='stand'||b.mode==='phone')b.phone=mkPhone();
  for(const b of bg)poseBg(b,0);
  ready=true;
}

/* ================= Gerabak ================= */
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;}
function buildCar(){
  const M=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.6},o||{}));
  const box=(w,h,d,m,x,y,z,sh)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.receiveShadow=true;if(sh)o.castShadow=true;scene.add(o);return o;};
  const floorT=canvasTex(512,512,(g,w,h)=>{g.fillStyle='#8b9097';g.fillRect(0,0,w,h);for(let i=0;i<4000;i++){g.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},255,.06)`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}});
  floorT.wrapS=floorT.wrapT=T.RepeatWrapping;floorT.repeat.set(8,2);
  const floor=new T.Mesh(new T.PlaneGeometry(16,ZW*2),M(0xffffff,{map:floorT,roughness:.85}));floor.rotation.x=-PI/2;floor.receiveShadow=true;scene.add(floor);
  const wall=M(0xe4e7ea,{roughness:.5}),seatM=M(0x2a62b8,{roughness:.55}),steel=M(0xd0d4d8,{metalness:.6,roughness:.3}),yel=M(0xf2c230,{roughness:.4});
  box(16,.02,ZW*2,M(0xf1f2f3),0,HC,0);
  winTex=canvasTex(1024,128,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#05070b');gr.addColorStop(.5,'#0d1218');gr.addColorStop(1,'#05070b');g.fillStyle=gr;g.fillRect(0,0,w,h);
    for(let i=0;i<6;i++){const x=i*w/6+40;const lg=g.createLinearGradient(x,0,x+120,0);lg.addColorStop(0,'rgba(255,220,160,0)');lg.addColorStop(.5,'rgba(255,220,160,.9)');lg.addColorStop(1,'rgba(255,220,160,0)');g.fillStyle=lg;g.fillRect(x,h*.45,120,10);}});
  winTex.wrapS=T.RepeatWrapping;winTex.repeat.set(2,1);
  const winM=new T.MeshBasicMaterial({map:winTex});
  for(const s of [-1,1]){const z=s*ZW;
    box(16,.95,.04,wall,0,.475,z);box(16,.5,.04,wall,0,2.0,z);
    const w=new T.Mesh(new T.PlaneGeometry(16,.8),winM);w.position.set(0,1.35,z-s*.03);w.rotation.y=s>0?PI:0;scene.add(w);
    for(let x=-7.2;x<=7.2;x+=1.6)box(.08,.8,.06,wall,x,1.35,z-s*.03);
    box(4.6,.07,.48,seatM,0,SEAT_Y-.035,z-s*.25,1);box(4.6,.44,.06,M(0x9aa0a8),0,.22,z-s*.46,0);box(4.6,.55,.07,seatM,0,.78,z-s*.05,1);
    for(let x=-2.1;x<=2.11;x+=.6)box(.012,.012,.46,M(0x1d4a8f),x+.3,SEAT_Y+.001,z-s*.25);
    box(.04,.6,.5,steel,-2.32,.75,z-s*.25,1);box(.04,.6,.5,steel,2.32,.75,z-s*.25,1);
    // palang & pemegang
    const bz=z-s*.85;const bar=new T.Mesh(new T.CylinderGeometry(.016,.016,16,10),steel);bar.rotation.z=PI/2;bar.position.set(0,BAR_Y,bz);scene.add(bar);
    for(let x=-5.88;x<=5.9;x+=.42){box(.025,.17,.012,M(0x222428),x,BAR_Y-.09,bz);
      const ring=new T.Mesh(new T.TorusGeometry(.055,.011,8,20),yel);ring.position.set(x,HANDLE_Y,bz);scene.add(ring);}
    // pintu
    for(const x of [-3.4,3.4])box(1.3,2.0,.03,M(0xb8bdc4,{metalness:.3,roughness:.35}),x,1.0,z-s*.02);
  }
  for(const x of [-2.6,2.6])for(const z of [-.55,.55]){const p=new T.Mesh(new T.CylinderGeometry(.02,.02,HC,10),steel);p.position.set(x,HC/2,z);p.castShadow=true;scene.add(p);}
  // tanda kerusi keutamaan (ikon umum)
  const sign=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#1d5fd1';g.fillRect(0,0,w,h);g.fillStyle='#fff';
    g.beginPath();g.arc(128,60,22,0,7);g.fill();g.beginPath();g.ellipse(128,130,34,48,0,0,7);g.fill();g.beginPath();g.ellipse(150,140,26,30,0,0,7);g.fill();
    g.fillRect(108,170,16,60);g.fillRect(132,170,16,60);g.font='bold 22px sans-serif';g.textAlign='center';});
  const sg=new T.Mesh(new T.PlaneGeometry(.22,.22),new T.MeshBasicMaterial({map:sign}));sg.position.set(0,1.5,-ZW+.04);scene.add(sg);
  // lampu
  for(const z of [-.7,.7]){const l=new T.Mesh(new T.BoxGeometry(14,.02,.22),new T.MeshBasicMaterial({color:0xffffff}));l.position.set(0,HC-.015,z);scene.add(l);}
  scene.add(new T.HemisphereLight(0xf4f6ff,0x6b6f78,.75));
  const dl=new T.DirectionalLight(0xffffff,1.1);dl.position.set(.6,4,1.2);dl.target.position.set(0,0,-.3);dl.castShadow=true;
  dl.shadow.mapSize.set(2048,2048);Object.assign(dl.shadow.camera,{left:-3.5,right:3.5,top:2.5,bottom:-2.5,near:.5,far:8});dl.shadow.bias=-.0005;dl.shadow.normalBias=.02;
  scene.add(dl,dl.target);
  const fill=new T.DirectionalLight(0xfff0e0,.35);fill.position.set(-2,1.5,2);scene.add(fill);
}

/* ================= Pose ================= */
function seatedPose(x,zs,o){o=o||{};const yaw=zs<0?0:PI,f=fwdOf(yaw),L=leftOf(yaw),z=zs*(ZW-.4);
  const hip=[x,HIPS,z];const knee=add(hip,mv(f,.44));
  const p={hip,yaw,lean:o.lean!==undefined?o.lean:.08,headPitch:o.headPitch||0,headYaw:o.headYaw||0,headRoll:o.headRoll||0,look:o.look,jaw:o.jaw,
    foot:{L:{p:add(add(knee,mv(L,.11)),[0,-.4,.0]).map((v,i)=>i===1?.09:v)},R:{p:add(add(knee,mv(L,-.11)),[0,-.4,0]).map((v,i)=>i===1?.09:v)}},hand:{}};
  p.foot.L.p=add(p.foot.L.p,mv(f,.06));p.foot.R.p=add(p.foot.R.p,mv(f,.06));
  if(o.phone){const c=add(add(hip,mv(f,.3)),[0,.2,0]);
    p.hand.L={p:add(c,mv(L,.05)),dir:add(f,[0,.35,0]),n:[0,-1,0],curl:.55};p.hand.R={p:add(c,mv(L,-.05)),dir:add(f,[0,.35,0]),n:[0,-1,0],curl:.55};p.phoneAt=add(c,[0,.03,0]);}
  else{p.hand.L={p:add(add(hip,mv(f,.3)),add(mv(L,.14),[0,.08,0])),dir:f,n:[0,1,0],curl:.4};p.hand.R={p:add(add(hip,mv(f,.3)),add(mv(L,-.14),[0,.08,0])),dir:f,n:[0,1,0],curl:.4};}
  return p;}
function standPose(r,pos,yaw,o){o=o||{};const f=fwdOf(yaw),L=leftOf(yaw),hy=r.hip0.y-.015;
  const p={hip:[pos[0],hy+(o.bob||0),pos[2]],yaw,lean:o.lean||0,headPitch:o.headPitch||0,headYaw:o.headYaw||0,look:o.look,jaw:o.jaw,
    foot:{L:{p:add([pos[0],.09,pos[2]],mv(L,.11))},R:{p:add([pos[0],.09,pos[2]],mv(L,-.11))}},hand:{}};
  p.hand.L={p:add(add([pos[0],hy,pos[2]],mv(L,.22)),[0,-.12,0]),dir:[0,-1,0],n:L,curl:.35};
  p.hand.R={p:add(add([pos[0],hy,pos[2]],mv(L,-.22)),[0,-.12,0]),dir:[0,-1,0],n:mv(L,-1),curl:.35};
  return p;}
function poseBg(b,t){
  if(b.kind==='sit'){const ph=b.mode==='phone',sl=b.mode==='sleep';
    const p=seatedPose(b.x,b.zs,{phone:ph,headPitch:ph?.55:sl?.45:.05,headRoll:sl?.25:0,headYaw:b.mode==='look'?.3*sin(t*.3):0,lean:sl?-.02:.08});
    b.r.pose(p);if(b.phone)place(b.phone,p.phoneAt,p.yaw);}
  else{const f=fwdOf(b.yaw),L=leftOf(b.yaw);const p=standPose(b.r,[b.x,0,b.z],b.yaw,{headPitch:.45});
    const handle=[Math.round((b.x+5.88)/.42)*.42-5.88,HANDLE_Y,b.z<0?-(ZW-.85):(ZW-.85)];
    p.hand.R={p:handle,dir:[0,1,0],n:f,curl:1.25,pole:add(mv(L,-1),[0,-.3,0])};
    const c=add(add([b.x,1.15,b.z],mv(f,.28)),mv(L,.05));p.hand.L={p:c,dir:add(f,[0,.4,0]),n:[0,-1,0],curl:.55};
    b.r.pose(p);if(b.phone)place(b.phone,add(c,[0,.03,0]),b.yaw);}
}
function place(ph,p,yaw){ph.position.set(p[0],p[1],p[2]);ph.rotation.set(-.35,yaw,0,'YXZ');}

/* ================= Jalan cerita ================= */
const SEAT=[0,HIPS,-(ZW-.4)];
const T_IN0=.4,T_IN1=3.9,T_LOOK=BEATS[2]+.5,T_UP0=BEATS[3]+.2,T_UP1=BEATS[3]+1.4,T_ASIDE=BEATS[3]+2.3,T_GEST=BEATS[3]+2.4,
  T_SIT0=BEATS[4]-.2,T_SIT1=BEATS[4]+1.8;
const MOM_STAND=[.05,0,-.32],MOM_HANDLE=[-.21,HANDLE_Y,-(ZW-.85)];
const MAN_SIDE=[.8,0,-.78],MAN_HANDLE=[.63,HANDLE_Y,-(ZW-.85)];
function momPose(t){
  const r=rigs.ibu,A=[-2.6,0,.35],B=MOM_STAND;
  const tired=win(t,BEATS[1]-.3,T_SIT0,.6);
  const talk=(t>BEATS[4]+2.0&&t<BEATS[4]+3.0)?.08+.08*sin(t*16):0;
  if(t<T_SIT0){
    const k=seg(t,T_IN0,T_IN1),walk=t>T_IN0&&t<T_IN1+.1;
    const pos=lv(A,B,k),dir=[B[0]-A[0],0,B[2]-A[2]],y0=Math.atan2(dir[0],dir[2]);
    const yaw=t<T_IN1-.4?y0:lerp(y0,PI,seg(t,T_IN1-.4,T_IN1+.5));
    const f=fwdOf(yaw),L=leftOf(yaw),ph=(t-T_IN0)*5.6,sw=walk?sin(ph)*seg(t,T_IN0,T_IN0+.4)*(1-seg(t,T_IN1-.3,T_IN1+.1)):0;
    const p=standPose(r,pos,yaw,{bob:walk?-.015+.015*abs(cos(ph)):0,lean:-.05,headPitch:.05+.12*tired,look:t>T_LOOK+.9?[0,1.1,-1.0]:null});
    p.foot.L.p=add(add([pos[0],.09+.06*max(0,sin(ph))*abs(sw),pos[2]],mv(L,.1)),mv(f,.17*sw));
    p.foot.R.p=add(add([pos[0],.09+.06*max(0,-sin(ph))*abs(sw),pos[2]],mv(L,-.1)),mv(f,-.17*sw));
    const hold=seg(t,T_IN1-.1,T_IN1+.6),hipP=p.hip;
    const belly=add(add(hipP,mv(f,.27)),add(mv(L,-.04),[0,.22,0]));
    p.hand.R={p:belly,dir:mv(L,1),n:mv(f,-1),curl:.15};
    const swing=add(add(hipP,mv(L,.22)),add(mv(f,.12*-sw),[0,-.1,0]));
    p.hand.L={p:lv(swing,MOM_HANDLE,hold),dir:hold>.5?[0,1,0]:[0,-1,0],n:hold>.5?f:L,curl:lerp(.35,1.25,hold),pole:hold>.5?add(L,[0,-.3,0]):undefined};
    p.side=.04*sin(t*1.3);
    return p;
  }
  const kk=seg(t,T_SIT0+.6,T_SIT1),turn=seg(t,T_SIT0,T_SIT0+.9);
  const yaw=lerp(PI,2*PI,turn),f=fwdOf(yaw),L=leftOf(yaw);
  const stand=lv(B,[SEAT[0],0,SEAT[2]+.36],seg(t,T_SIT0,T_SIT0+.8));
  const hy=lerp(r.hip0.y-.015,SEAT[1],kk),hz=lerp(stand[2],SEAT[2],kk);
  const p={hip:[lerp(stand[0],SEAT[0],kk),hy,hz],yaw,lean:.35*kk*(1-kk)*4+.06*kk,headPitch:lerp(.12,-.05,kk)-.3*seg(t,T_SIT1-.2,T_SIT1+.6),headYaw:.6*seg(t,T_SIT1-.2,T_SIT1+.6),
    look:headPos(rigs.pemuda),jaw:talk,hand:{},foot:{}};
  const fx=lerp(0,.5,kk),fz=stand[2]*(1-kk)+SEAT[2]*kk;
  p.foot.L={p:add(add([p.hip[0],.09,fz],mv(L,.12)),mv(f,fx))};p.foot.R={p:add(add([p.hip[0],.09,fz],mv(L,-.12)),mv(f,fx))};
  p.hand.R={p:add(add(p.hip,mv(f,.27)),add(mv(L,-.04),[0,.22*(1-kk)+.2*kk,0])),dir:mv(L,1),n:mv(f,-1),curl:.15};
  p.hand.L={p:add(add(p.hip,mv(L,.28)),add(mv(f,.05),[0,-.04,0])),dir:[0,-1,0],n:mv(L,1),curl:.25};
  return p;
}
function manPose(t){
  const r=rigs.pemuda,notice=seg(t,T_LOOK,T_LOOK+.6),up=seg(t,T_UP0,T_UP1),aside=seg(t,T_UP1,T_ASIDE);
  const yaw=lerp(0,-.75,seg(t,T_UP1,T_GEST+.3)),f=fwdOf(yaw),L=leftOf(yaw);
  const sitP=seatedPose(SEAT[0],-1,{phone:true,headPitch:.55});
  const standHip=[0,r.hip0.y-.015,SEAT[2]+.28],sideHip=[MAN_SIDE[0],r.hip0.y-.015,MAN_SIDE[2]];
  const hipStand=lv(standHip,sideHip,aside);
  const p={hip:lv(sitP.hip,hipStand,up),yaw,lean:lerp(.08,0,up)+.45*up*(1-up)*4,
    headPitch:lerp(.55,-.12,notice)*(1-up)+(-.05)*up,headYaw:.12*notice*(1-up),hand:{},foot:{},
    look:t>T_LOOK?headPos(rigs.ibu):null,
    jaw:(t>T_GEST+.1&&t<T_GEST+1.0)?.07+.07*sin(t*15):0};
  const fs=[add([hipStand[0],.09,hipStand[2]],mv(L,.12)),add([hipStand[0],.09,hipStand[2]],mv(L,-.12))];
  const lift=aside*(1-aside)*4*.06;
  p.foot.L={p:lv(sitP.foot.L.p,add(fs[0],[0,lift,0]),up)};p.foot.R={p:lv(sitP.foot.R.p,fs[1],up)};
  // telefon: turun bila perasan, masuk poket bila bangun
  const pk=seg(t,T_UP0-.3,T_UP0+.3);
  const phHL=add(sitP.hand.L.p,[0,-.05*notice,0]),phHR=add(sitP.hand.R.p,[0,-.05*notice,0]);
  const restL=add(add(p.hip,mv(L,.22)),[0,-.1,0]),restR=add(add(p.hip,mv(L,-.22)),[0,-.1,0]);
  p.hand.L={p:lv(phHL,restL,pk),dir:pk<.5?sitP.hand.L.dir:[0,-1,0],n:pk<.5?[0,-1,0]:L,curl:.45};
  p.hand.R={p:lv(phHR,restR,pk),dir:pk<.5?sitP.hand.R.dir:[0,-1,0],n:pk<.5?[0,-1,0]:mv(L,-1),curl:.45};
  const g=seg(t,T_GEST,T_GEST+.6)*(1-seg(t,T_SIT1-.1,T_SIT1+.6));
  const gest=add(add(p.hip,mv(f,.42)),add(mv(L,.18),[0,.1,0]));
  if(g>0){p.hand.L.p=lv(p.hand.L.p,gest,g);if(g>.4){p.hand.L.dir=add(mv(f,1),mv(L,.5));p.hand.L.n=[0,-1,0];p.hand.L.curl=.08;}}
  const hold=seg(t,T_ASIDE-.2,T_ASIDE+.5);
  if(hold>0){p.hand.R.p=lv(p.hand.R.p,MAN_HANDLE,hold);if(hold>.5){p.hand.R.dir=[0,1,0];p.hand.R.n=f;p.hand.R.curl=1.25;p.hand.R.pole=add(mv(L,-1),[0,-.4,.0]);}}
  p.phoneAt=t<T_UP0+.2?add(lv(phHL,phHR,.5),[0,.03,0]):null;
  return p;
}

/* ================= Kamera ================= */
function headPos(r){const v=r.wp('head');return [v.x,v.y+.06,v.z];}
function camAt(t){
  let e,c,f;const k=(a,b)=>seg(t,a,b);
  const mh=headPos(rigs.ibu),ph=headPos(rigs.pemuda);
  if(t<BEATS[1]){e=lv([2.6,1.62,.7],[2.1,1.58,.66],k(0,BEATS[1]));c=lv([-1.4,1.15,-.1],[-.4,1.15,-.35],k(0,BEATS[1]));f=46;}
  else if(t<BEATS[2]){const d=k(BEATS[1],BEATS[2]);c=add(mh,[0,-.08,0]);e=add(mh,[lerp(.42,.36,d),-.1,lerp(-1.25,-1.12,d)]);f=32;}
  else if(t<BEATS[3]){const d=k(BEATS[2],BEATS[3]);c=add(ph,[0,-.08,0]);e=add(ph,[lerp(.66,.6,d),.03,lerp(1.0,.94,d)]);f=32;}
  else if(t<BEATS[4]){e=lv([2.3,1.55,.5],[2.1,1.5,.42],k(BEATS[3],BEATS[4]));c=lv([.2,1.2,-.75],[.35,1.22,-.72],k(BEATS[3],BEATS[4]));f=42;}
  else if(t<BEATS[5]){const kk=k(BEATS[4]+1.9,BEATS[4]+2.3);const e1=[-1.1,1.45,.6],c1=[0,1.0,-.9];
    const dx=mh[0]-ph[0],dz=mh[2]-ph[2],dl=Math.hypot(dx,dz)||1,ux=dx/dl,uz=dz/dl;
    const e2=[ph[0]-ux*.35+uz*.42,ph[1]+.06,ph[2]-uz*.35-ux*.42],c2=add(mh,[0,-.06,0]);e=lv(e1,e2,kk);c=lv(c1,c2,kk);f=lerp(40,32,kk);}
  else{e=lv([2.2,1.6,.75],[2.9,1.75,.9],k(BEATS[5],D));c=[.3,1.05,-.8];f=46;}
  const sh=[.003*sin(t*7.1),.002*sin(t*5.3),0];
  return {e:add(e,sh),c,f};}

/* ================= Lukis ================= */
function render(t){
  winTex.offset.x=(t*.9)%1;
  const m=manPose(t),w=momPose(t);rigs.pemuda.pose(m);rigs.ibu.pose(w);
  if(m.phoneAt){phones.man.visible=true;place(phones.man,m.phoneAt,0);}else phones.man.visible=false;
  for(const b of bg)if(b.mode==='look'||b.kind==='stand')poseBg(b,t);
  const cm=camAt(t);cam.fov=cm.f;cam.updateProjectionMatrix();cam.position.set(...cm.e);cam.lookAt(...cm.c);
  R3.render(scene,cam);
}
function txt(c,s,x,y,size,col,a,glow){if(a<=0)return;c.save();c.globalAlpha=a;c.textAlign='center';
  c.font='900 '+size+'px "Arial Black",Impact,sans-serif';const mw=c.measureText(s).width;if(mw>980){size=Math.floor(size*980/mw);c.font='900 '+size+'px "Arial Black",Impact,sans-serif';}
  c.lineWidth=size*.16;c.strokeStyle='rgba(8,12,20,.92)';c.lineJoin='round';if(glow){c.shadowColor=col;c.shadowBlur=26;}
  c.strokeText(s,x,y);c.fillStyle=col;c.fillText(s,x,y);c.restore();}
function heart(c,x,y,s,a){if(a<=0)return;c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=a;c.shadowColor='rgba(255,60,90,.9)';c.shadowBlur=24;c.fillStyle='#ff4d6d';
  c.beginPath();c.moveTo(0,28);c.bezierCurveTo(-60,-14,-34,-58,0,-26);c.bezierCurveTo(34,-58,60,-14,0,28);c.fill();c.restore();}

let readyP=null;
window.VIDEO={width:W,height:H,fps:30,duration:D,loop:false,beats:BEATS,
ready(st){if(!readyP)readyP=setup(st);return readyP;},
draw(c,t,w,h){
  if(!ready){c.fillStyle='#0b0f16';c.fillRect(0,0,w,h);txt(c,'Memuatkan model 3D...',w/2,h/2,60,'#fff',1);if(!readyP&&window.getLib)this.ready();return;}
  t=cl(t,0,D);render(t);c.drawImage(cv,0,0,w,h);
  const g=c.createLinearGradient(0,0,0,480);g.addColorStop(0,'rgba(6,10,18,.72)');g.addColorStop(1,'rgba(6,10,18,0)');c.fillStyle=g;c.fillRect(0,0,w,480);
  const L=(a,b,s1,s2,col,glow,sz)=>{const k=win(t,a,b);txt(c,s1,w/2,230,sz||96,col||'#fff',k,glow);if(s2)txt(c,s2,w/2,320,54,'#fff',k,false);};
  L(BEATS[0],BEATS[1],'MRT PENUH','SEORANG IBU MENGANDUNG MASUK');
  L(BEATS[1],BEATS[2],'DIA PENAT...','TIADA SIAPA PERASAN','#ffb3b3',false);
  L(BEATS[2],BEATS[3],'ADA YANG PERASAN','',null,false);
  L(BEATS[3],BEATS[4],'BANGUN & BERI','TEMPAT DUDUK','#ffd23a',true);
  L(BEATS[4],BEATS[5],'TERIMA KASIH','',null,false);
  const k=seg(t,BEATS[5],BEATS[5]+.5);txt(c,'UTAMAKAN',w/2,230,104,'#fff',k,false);txt(c,'YANG LEBIH MEMERLUKAN',w/2,330,60,'#ffd23a',k,true);
  heart(c,w*.8,h*.74-80*seg(t,BEATS[4]+2.2,BEATS[4]+3.4),1.6,win(t,BEATS[4]+2.2,BEATS[5]-.1,.4)*.85);
}};
})();
