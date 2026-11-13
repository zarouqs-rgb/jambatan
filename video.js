(function(){
const W=1080,H=1920,D=18,HOR=760,GY=1380,VPX=540;
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const sm=x=>{x=cl(x);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a+(b-a)*t;
const seg=(t,a,b)=>sm((t-a)/(b-a));
const eo=p=>1-Math.pow(1-cl(p),2.2), ei=p=>Math.pow(cl(p),2);
const LEDGE=t=>VPX-310*(t-HOR)/(GY-HOR), REDGE=t=>VPX+310*(t-HOR)/(GY-HOR);

// ---------- latar langit & bangunan (dilukis sekali) ----------
let sky=null;
function buildSky(){
  const c=document.createElement('canvas');c.width=W;c.height=HOR+4;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,HOR);gr.addColorStop(0,'#050507');gr.addColorStop(.7,'#101015');gr.addColorStop(1,'#2a2a33');
  g.fillStyle=gr;g.fillRect(0,0,W,HOR+4);
  let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  let x=-20;
  while(x<W){
    const w=70+r()*110,h=130+r()*300,top=HOR-h;
    g.fillStyle='#0b0b0f';g.fillRect(x,top,w,h+4);
    g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x,top,3,h);
    for(let yy=top+16;yy<HOR-14;yy+=26)for(let xx=x+10;xx<x+w-10;xx+=22){
      if(r()<.22){g.fillStyle='rgba(255,240,200,'+(.15+r()*.3)+')';g.fillRect(xx,yy,9,12)}
    }
    x+=w+4+r()*10;
  }
  const hz=g.createLinearGradient(0,HOR-120,0,HOR);hz.addColorStop(0,'rgba(255,255,255,0)');hz.addColorStop(1,'rgba(200,205,230,.16)');
  g.fillStyle=hz;g.fillRect(0,HOR-120,W,124);
  sky=c;
}

// ---------- IK dua tulang ----------
function ik(sx,sy,tx,ty,l1,l2,bend){
  let dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy);const m=l1+l2-1;
  if(d>m){dx*=m/d;dy*=m/d;d=m}
  d=Math.max(d,24);
  const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  return [sx+dx*a/d-dy/d*h*bend, sy+dy*a/d+dx/d*h*bend, sx+dx, sy+dy];
}
const LEG=88,TOR=140,ARM=80;
// kedudukan bahu (koordinat dunia)
function shoulder(o){
  const hipY=-(2*LEG)*0.955;
  const nx=Math.sin(o.lean)*TOR,ny=hipY-Math.cos(o.lean)*TOR;
  return [o.x+nx*o.s, o.y+(ny+8)*o.s];
}
function line(c,pts,w){c.lineWidth=w;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke()}

// o: {x,y,s,col,ph,amp,lean,head,armA:[wx,wy]|null,armB:[wx,wy]|null,stick,glow}
function fig(c,o,refl){
  c.save();c.translate(o.x,o.y);c.scale(o.s,o.s);
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=o.col;c.fillStyle=o.col;
  if(o.glow&&!refl){c.shadowColor='rgba(255,255,255,.55)';c.shadowBlur=22}
  const ph=o.ph,amp=o.amp;
  const hipY=-(2*LEG)*0.955-Math.abs(Math.sin(ph))*5*amp,hip=[0,hipY];
  const lw=14;
  // kaki
  for(const k of [0,1]){
    const p=ph+k*Math.PI;
    const foot=[Math.sin(p)*58*amp, -Math.max(0,Math.cos(p))*26*amp];
    const e=ik(hip[0],hip[1],foot[0],foot[1],LEG,LEG,-1);
    c.globalAlpha=(refl?1:1)*(k?.78:1);
    line(c,[[hip[0],hip[1]],[e[0],e[1]],[e[2],e[3]],[e[2]+14,e[3]]],lw);
  }
  c.globalAlpha=1;
  // badan
  const neck=[Math.sin(o.lean)*TOR,hipY-Math.cos(o.lean)*TOR];
  line(c,[hip,neck],lw+2);
  // kepala
  const hd=o.lean+o.head;
  const hc=[neck[0]+Math.sin(hd)*44,neck[1]-Math.cos(hd)*44];
  c.beginPath();c.arc(hc[0],hc[1],30,0,7);c.fill();
  // lengan
  const sh=[neck[0],neck[1]+8];
  const arms=[o.armA,o.armB];
  for(let k=0;k<2;k++){
    let tgt;
    if(arms[k]){tgt=[(arms[k][0]-o.x)/o.s,(arms[k][1]-o.y)/o.s]}
    else{const p=ph+(k?0:Math.PI);tgt=[sh[0]+Math.sin(p)*46*amp+4,sh[1]+148-Math.abs(Math.cos(p))*8*amp]}
    const e=ik(sh[0],sh[1],tgt[0],tgt[1],ARM,ARM,1);
    c.globalAlpha=k?.78:1;
    line(c,[sh,[e[0],e[1]],[e[2],e[3]]],lw-2);
    if(k===0&&o.stick){
      c.globalAlpha=1;c.strokeStyle='#b8b8c0';
      line(c,[[e[2],e[3]-6],[e[2]+22,0]],7);
      c.strokeStyle=o.col;
    }
  }
  c.restore();
}

// ---------- kereta (pandangan depan) ----------
function car(c,y,lane,pulse){
  const s=(y-HOR)/(GY-HOR);if(s<=0.02||y-170*s>H+40)return;
  const cx=VPX+lane*(y-HOR),w=340*s,h=170*s;
  c.save();
  // cahaya ke lantai
  const lg=c.createLinearGradient(0,y,0,y+260*s);lg.addColorStop(0,'rgba(255,248,225,'+(.22+.1*pulse)+')');lg.addColorStop(1,'rgba(255,248,225,0)');
  c.fillStyle=lg;c.beginPath();c.moveTo(cx-w*.38,y);c.lineTo(cx+w*.38,y);c.lineTo(cx+w*.9,y+260*s);c.lineTo(cx-w*.9,y+260*s);c.closePath();c.fill();
  // badan
  c.fillStyle='#17171d';c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=Math.max(1,3*s);
  c.beginPath();c.roundRect(cx-w/2,y-h*.62,w,h*.62,14*s);c.fill();c.stroke();
  c.beginPath();c.roundRect(cx-w*.36,y-h,w*.72,h*.46,[18*s,18*s,4*s,4*s]);c.fillStyle='#0e0e13';c.fill();c.stroke();
  c.fillStyle='rgba(120,140,170,.18)';c.beginPath();c.roundRect(cx-w*.31,y-h*.94,w*.62,h*.34,10*s);c.fill();
  // roda
  c.fillStyle='#050507';c.fillRect(cx-w*.46,y-h*.1,w*.16,h*.14);c.fillRect(cx+w*.3,y-h*.1,w*.16,h*.14);
  // lampu
  for(const dx of [-.3,.3]){
    const lx=cx+dx*w,ly=y-h*.3,rg=c.createRadialGradient(lx,ly,0,lx,ly,60*s);
    rg.addColorStop(0,'rgba(255,255,240,'+(.95)+')');rg.addColorStop(.25,'rgba(255,245,210,.5)');rg.addColorStop(1,'rgba(255,245,210,0)');
    c.fillStyle=rg;c.beginPath();c.arc(lx,ly,60*s,0,7);c.fill();
    c.fillStyle='#fff';c.beginPath();c.ellipse(lx,ly,15*s,9*s,0,0,7);c.fill();
  }
  c.restore();
}
const CARS=[
  {lane:-.2,  f:t=>HOR+40+(2700-HOR-40)*cl((t-.2)/2.6)},
  {lane:.22,  f:t=>HOR+40+(2700-HOR-40)*cl((t-1.6)/2.8)},
  {lane:-.2,  f:t=>{ if(t<14.9)return lerp(HOR+40,1235,eo((t-5.6)/2.4)); return lerp(1235,2700,ei((t-14.9)/2.8))}},
  {lane:.22,  f:t=>{ if(t<15.3)return lerp(HOR+40,1195,eo((t-6.2)/2.4)); return lerp(1195,2700,ei((t-15.3)/2.8))}}
];

// ---------- zebra, laluan merah, cahaya ----------
function floor(c,t,px){
  c.fillStyle='#08080b';c.fillRect(-1200,HOR,W+2400,H-HOR);
  // kaki lima
  c.fillStyle='#17171c';
  c.beginPath();c.moveTo(-1200,HOR);c.lineTo(VPX,HOR);c.lineTo(LEDGE(H),H);c.lineTo(-1200,H);c.closePath();c.fill();
  c.beginPath();c.moveTo(W+1200,HOR);c.lineTo(VPX,HOR);c.lineTo(REDGE(H),H);c.lineTo(W+1200,H);c.closePath();c.fill();
  // garis tepi
  c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=3;
  c.beginPath();c.moveTo(VPX,HOR);c.lineTo(LEDGE(H),H);c.moveTo(VPX,HOR);c.lineTo(REDGE(H),H);c.stroke();
  // garis tengah putus-putus
  c.strokeStyle='rgba(255,255,255,.35)';
  for(let k=0;k<14;k++){
    const a=HOR+Math.pow(k/14,1.9)*(H-HOR),b=HOR+Math.pow((k+.45)/14,1.9)*(H-HOR);
    c.lineWidth=2+6*(a-HOR)/(H-HOR);c.beginPath();c.moveTo(VPX,a);c.lineTo(VPX,b);c.stroke();
  }
  // zebra
  const ka=(1300-HOR)/(GY-HOR),kb=(1470-HOR)/(GY-HOR);
  for(let x0=250;x0<=830;x0+=70){
    const f=(x0-VPX);
    const xa=VPX+f*ka,xb=VPX+f*kb,wa=18*ka,wb=18*kb;
    c.fillStyle='rgba(236,236,240,.82)';
    c.beginPath();c.moveTo(xa-wa,1300);c.lineTo(xa+wa,1300);c.lineTo(xb+wb,1470);c.lineTo(xb-wb,1470);c.closePath();c.fill();
  }
  // laluan merah mengikut langkah
  if(px>175){
    const x0=175,x1=px,y=GY+14;
    const g=c.createLinearGradient(x0,0,x1,0);g.addColorStop(0,'rgba(255,40,60,0)');g.addColorStop(.25,'rgba(255,40,60,.9)');g.addColorStop(1,'rgba(255,70,90,1)');
    c.save();c.shadowColor='rgba(255,40,60,.9)';c.shadowBlur=18;c.strokeStyle=g;c.lineWidth=5;c.lineCap='round';
    c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();c.restore();
  }
}
function pool(c,x,a){
  c.save();c.translate(x,GY+8);c.scale(1,.2);
  const g=c.createRadialGradient(0,0,0,0,0,330);g.addColorStop(0,'rgba(255,255,255,'+(.36*a)+')');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.beginPath();c.arc(0,0,330,0,7);c.fill();c.restore();
  const bg=c.createLinearGradient(0,0,0,GY);bg.addColorStop(0,'rgba(255,255,255,0)');bg.addColorStop(1,'rgba(255,255,255,'+(.07*a)+')');
  c.fillStyle=bg;c.beginPath();c.moveTo(x-60,0);c.lineTo(x+60,0);c.lineTo(x+280,GY);c.lineTo(x-280,GY);c.closePath();c.fill();
}
function heart(c,x,y,s,a){
  c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=a;
  c.shadowColor='rgba(255,40,70,.95)';c.shadowBlur=30;c.fillStyle='#ff2d4a';
  c.beginPath();c.moveTo(0,28);c.bezierCurveTo(-60,-14,-34,-58,0,-26);c.bezierCurveTo(34,-58,60,-14,0,28);c.fill();c.restore();
}
function label(c,txt,x,y,a){
  if(a<=0)return;
  c.save();c.globalAlpha=a;c.fillStyle='#e8e8ee';c.textAlign='center';
  c.font='600 34px "Courier New",monospace';if('letterSpacing' in c)c.letterSpacing='6px';
  c.fillText(txt,x,y);c.restore();
}

// ---------- keadaan watak ----------
function elderX(t){return t<7.6?170:170+740*seg(t,7.6,14.2)}
function youngX(t){
  if(t<4)return -190;
  if(t<6.2)return lerp(-190,75,seg(t,4,6.2));
  return elderX(t)-95;
}
function spd(f,t){return (f(t+.04)-f(t-.04))/.08}

function people(c,t,refl){
  const ex=elderX(t),yx=youngX(t);
  const es=spd(elderX,t),ys=spd(youngX,t);
  const eMove=cl(Math.abs(es)/110)*0.62,yMove=cl(Math.abs(ys)/110)*(t<6.2?0.95:0.62);
  const eph=t<7.6?t*1.4:(ex-170)/70*Math.PI;
  const yph=t<6.2?yx/80*Math.PI:(yx-75)/70*Math.PI+ (75/80*Math.PI);
  const elder={x:ex,y:GY,s:.93,col:'#cfcfd6',ph:eph,amp:t<7.6?.08+.05*Math.sin(t*1.3):Math.max(eMove,.1),
    lean:.30+.03*Math.sin(t*2.2),head:t<4.5?.15+.35*Math.sin(t*1.7):.1,stick:true,glow:false,armA:null,armB:null};
  const young={x:yx,y:GY,s:1,col:'#ffffff',ph:yph,amp:t<4?0:Math.max(yMove,t>=6.2&&t<7.6?0:0.0),lean:.1,head:-.05,glow:true,armA:null,armB:null};
  if(t>=14.3){young.amp=0;elder.amp=Math.max(0,elder.amp*cl(1-(t-14.3)*2))}
  if(t>=6.2&&t<7.6){young.amp=0}
  // tongkat: tangan A orang tua
  let sh=shoulder(elder);
  elder.armA=[sh[0]+70*elder.s,sh[1]+112*elder.s];
  // berpegangan tangan
  const hold=seg(t,6.2,7.0);
  if(hold>0){
    const ys_=shoulder(young),es_=shoulder(elder);
    const P=[(ys_[0]+es_[0])/2+8,Math.max(ys_[1],es_[1])+118];
    const home=[ys_[0]+10,ys_[1]+150];
    young.armA=[lerp(home[0],P[0],hold),lerp(home[1],P[1],hold)];
    elder.armB=[lerp(es_[0]+4,P[0],hold),lerp(es_[1]+138,P[1],hold)];
  }
  // isyarat berhenti: tangan B budak muda
  const stop=seg(t,7.0,7.8)*(1-seg(t,9.0,9.8));
  if(stop>0.001){
    const ys_=shoulder(young);
    young.armB=[ys_[0]+lerp(10,78,stop),ys_[1]+lerp(150,-118,stop)];
  }
  // dua badan sebaris: orang tua di belakang budak muda dari sisi lukisan
  const list=[elder,young];
  if(!refl&&t>=7.0){/* kait merah pada tangan bertaut */}
  for(const o of list)fig(c,o,refl);
  return {elder,young};
}
function crowd(c,t){
  c.save();c.globalAlpha=.3;
  for(let k=0;k<5;k++){
    const x=((t*38+k*320)%(W+1500))-600;
    fig(c,{x:x,y:HOR+58,s:.2,col:'#aeb0b8',ph:t*5+k,amp:.8,lean:.08,head:0,stick:false,glow:false,armA:null,armB:null},true);
  }
  c.restore();
}

window.VIDEO={width:W,height:H,fps:30,duration:D,loop:false,
draw(c,t,w,h){
  if(!sky)buildSky();
  t=cl(t,0,D);
  c.save();
  c.fillStyle='#050507';c.fillRect(0,0,W,H);
  // kamera: zum perlahan dan ikut watak
  const camX=330+.6*(elderX(t)-170);
  const z=1.3+.05*(t/D),ay=1290;
  c.translate(W/2,ay);c.scale(z,z);c.translate(-camX,-ay);
  for(const sx of [-W,0,W])c.drawImage(sky,sx,0);
  crowd(c,t);
  floor(c,t,t>=7.0?elderX(t):0);
  const mid=t<7?170:(youngX(t)+elderX(t))/2;
  pool(c,mid,1);
  const cars=CARS.map(k=>({y:k.f(t),lane:k.lane}));
  const pulse=.5+.5*Math.sin(t*9);
  for(const k of cars.filter(k=>k.y<GY).sort((a,b)=>a.y-b.y))car(c,k.y,k.lane,pulse);
  // pantulan
  c.save();c.translate(0,2*GY+28);c.scale(1,-1);c.globalAlpha=.1;people(c,t,true);c.restore();
  // watak
  const P=people(c,t,false);
  for(const k of cars.filter(k=>k.y>=GY).sort((a,b)=>a.y-b.y))car(c,k.y,k.lane,pulse);
  // hati merah
  const hs=seg(t,14.3,15.1);
  if(hs>0){const x=(youngX(t)+elderX(t))/2+30,pls=1+.08*Math.sin((t-14.3)*5);heart(c,x,GY-560-hs*20,(.4+.6*Math.min(1,hs*1.2))*pls,hs)}
  c.restore();
  // kabus & vinjet
  const vg=c.createRadialGradient(W/2,H*.5,H*.28,W/2,H*.5,H*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.72)');
  c.fillStyle=vg;c.fillRect(0,0,W,H);
  // teks atas
  label(c,'PAKCIK',300,150,seg(t,4.4,5)*(1-seg(t,7.4,8)));
  label(c,'ANAK MUDA',790,150,seg(t,4.7,5.3)*(1-seg(t,7.4,8)));
  label(c,'KEBAIKAN KECIL',W/2,150,seg(t,14.6,15.4)*(1-seg(t,17.2,17.8)));
  // fade
  c.fillStyle='rgba(0,0,0,'+(1-seg(t,0,.5))+')';c.fillRect(0,0,W,H);
  c.fillStyle='rgba(0,0,0,'+seg(t,17.3,18)+')';c.fillRect(0,0,W,H);
}};
})();
