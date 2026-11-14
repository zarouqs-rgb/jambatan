// Siri KEBAIKAN KECIL #2: budak muda kongsi payung dengan pakcik dalam hujan.
// Gaya sama seperti video "Semua Lalu... Dia Berhenti": stickman putih, malam, bandar, pantulan lantai basah.
(function(){
const W=1080,H=1920,D=20.2,GY=1380,HOR=760;
const BEATS=[.3,3.7,6.9,10.2,13.4,16.6,19.6]; // 6 ayat + penanda tamat
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const sm=x=>{x=cl(x);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a+(b-a)*t;
const seg=(t,a,b)=>sm((t-a)/(b-a));

// ---------- langit & bangunan ----------
let sky=null;
function buildSky(){
  const c=document.createElement('canvas');c.width=W;c.height=HOR+4;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,HOR);gr.addColorStop(0,'#040507');gr.addColorStop(.7,'#0d0f14');gr.addColorStop(1,'#22252e');
  g.fillStyle=gr;g.fillRect(0,0,W,HOR+4);
  let s=11;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  let x=-20;
  while(x<W){
    const w=70+r()*110,h=130+r()*300,top=HOR-h;
    g.fillStyle='#0a0b0f';g.fillRect(x,top,w,h+4);
    g.fillStyle='rgba(255,255,255,.06)';g.fillRect(x,top,3,h);
    for(let yy=top+16;yy<HOR-14;yy+=26)for(let xx=x+10;xx<x+w-10;xx+=22)
      if(r()<.2){g.fillStyle='rgba(255,240,200,'+(.12+r()*.25)+')';g.fillRect(xx,yy,9,12)}
    x+=w+4+r()*10;
  }
  const hz=g.createLinearGradient(0,HOR-160,0,HOR);hz.addColorStop(0,'rgba(255,255,255,0)');hz.addColorStop(1,'rgba(170,180,210,.2)');
  g.fillStyle=hz;g.fillRect(0,HOR-160,W,164);
  sky=c;
}

// ---------- stickman ----------
function ik(sx,sy,tx,ty,l1,l2,bend){
  let dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy);const m=l1+l2-1;
  if(d>m){dx*=m/d;dy*=m/d;d=m}
  d=Math.max(d,24);
  const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  return [sx+dx*a/d-dy/d*h*bend, sy+dy*a/d+dx/d*h*bend, sx+dx, sy+dy];
}
const LEG=88,TOR=140,ARM=80;
function neckW(o){const hipY=-(2*LEG)*0.955;return [o.x+o.dir*Math.sin(o.lean)*TOR*o.s, o.y+(hipY-Math.cos(o.lean)*TOR)*o.s];}
function shoulderW(o){const n=neckW(o);return [n[0],n[1]+8*o.s];}
function line(c,pts,w){c.lineWidth=w;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke()}
// o: {x,y,s,dir(1 kanan/-1 kiri),col,ph,amp,lean,head,armA,armB (dunia),stick,glow,hug}
function fig(c,o,refl){
  c.save();c.translate(o.x,o.y);c.scale(o.s*o.dir,o.s);
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=o.col;c.fillStyle=o.col;
  if(o.glow&&!refl){c.shadowColor='rgba(255,255,255,.55)';c.shadowBlur=22}
  const ph=o.ph,amp=o.amp;
  const hipY=-(2*LEG)*0.955-Math.abs(Math.sin(ph))*5*amp,hip=[0,hipY],lw=14;
  for(const k of [0,1]){
    const p=ph+k*Math.PI,foot=[Math.sin(p)*58*amp,-Math.max(0,Math.cos(p))*26*amp];
    const e=ik(hip[0],hip[1],foot[0],foot[1],LEG,LEG,-1);
    c.globalAlpha=k?.78:1;line(c,[[hip[0],hip[1]],[e[0],e[1]],[e[2],e[3]],[e[2]+14,e[3]]],lw);
  }
  c.globalAlpha=1;
  const neck=[Math.sin(o.lean)*TOR,hipY-Math.cos(o.lean)*TOR];
  line(c,[hip,neck],lw+2);
  const hd=o.lean+o.head,hc=[neck[0]+Math.sin(hd)*44,neck[1]-Math.cos(hd)*44];
  c.beginPath();c.arc(hc[0],hc[1],30,0,7);c.fill();
  const sh=[neck[0],neck[1]+8],arms=[o.armA,o.armB];
  for(let k=0;k<2;k++){
    let tgt;
    if(arms[k])tgt=[(arms[k][0]-o.x)/(o.s*o.dir),(arms[k][1]-o.y)/o.s];
    else if(o.hug){tgt=[sh[0]+(k?26:18),sh[1]+70+(k?6:0)+3*Math.sin(o.shiver*40+k)];}
    else{const p=ph+(k?0:Math.PI);tgt=[sh[0]+Math.sin(p)*46*amp+4,sh[1]+148-Math.abs(Math.cos(p))*8*amp]}
    const e=ik(sh[0],sh[1],tgt[0],tgt[1],ARM,ARM,o.hug?-1:1);
    c.globalAlpha=k?.78:1;line(c,[sh,[e[0],e[1]],[e[2],e[3]]],lw-2);
    if(k===0&&o.stick){c.globalAlpha=1;c.strokeStyle='#b8b8c0';line(c,[[e[2],e[3]-6],[e[2]+22,0]],7);c.strokeStyle=o.col;}
  }
  c.restore();
}
// payung: pemegang di tangan, condong ikut 'tilt' (radian, + ke kanan)
function umbrella(c,hand,tilt,R,col,alpha){
  const L=170,top=[hand[0]+Math.sin(tilt)*L,hand[1]-Math.cos(tilt)*L];
  c.save();c.globalAlpha*=alpha;c.lineCap='round';
  c.strokeStyle='#d8d8de';c.lineWidth=6;
  c.beginPath();c.moveTo(hand[0],hand[1]);c.lineTo(top[0],top[1]);c.stroke();
  c.beginPath();c.arc(hand[0]-10,hand[1],10,0,Math.PI);c.stroke();
  c.translate(top[0],top[1]);c.rotate(tilt);
  c.fillStyle=col;c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=4;
  c.beginPath();c.moveTo(-R,46);c.quadraticCurveTo(-R*.95,-34,0,-48);c.quadraticCurveTo(R*.95,-34,R,46);
  for(let k=4;k>=-4;k--){const x=k/4*R;c.quadraticCurveTo(x+R/8,30,x,46);}
  c.closePath();c.fill();c.stroke();
  c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2;
  for(let k=-3;k<=3;k++){c.beginPath();c.moveTo(0,-48);c.quadraticCurveTo(k*R/5,-20,k*R/4,44);c.stroke();}
  c.restore();
  return {x0:top[0]-R*Math.cos(tilt)-10,x1:top[0]+R*Math.cos(tilt)+10,y:top[1]+20};
}

// ---------- persekitaran ----------
const SHELTER=[-980,-600];
function ground(c,camX){
  c.fillStyle='#0b0c10';c.fillRect(camX-900,HOR,W+1800,240);
  c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=4;c.setLineDash([60,60]);
  c.beginPath();c.moveTo(camX-900,HOR+120);c.lineTo(camX+W+900,HOR+120);c.stroke();c.setLineDash([]);
  const g=c.createLinearGradient(0,HOR+240,0,H);g.addColorStop(0,'#16171d');g.addColorStop(1,'#0c0d11');
  c.fillStyle=g;c.fillRect(camX-900,HOR+240,W+1800,H-HOR-240);
  c.fillStyle='rgba(255,255,255,.12)';c.fillRect(camX-900,HOR+236,W+1800,4);
  for(let x=Math.floor((camX-900)/160)*160;x<camX+W+900;x+=160){c.fillStyle='rgba(255,255,255,.035)';c.fillRect(x,HOR+240,3,H-HOR-240);}
}
function streetLight(c,x){
  c.strokeStyle='#2a2c33';c.lineWidth=10;c.beginPath();c.moveTo(x,GY);c.lineTo(x,GY-760);c.lineTo(x+70,GY-780);c.stroke();
  c.save();c.shadowColor='rgba(255,220,160,.9)';c.shadowBlur=40;c.fillStyle='#ffe2b0';c.fillRect(x+55,GY-788,50,12);c.restore();
  const bg=c.createLinearGradient(0,GY-780,0,GY);bg.addColorStop(0,'rgba(255,220,170,.16)');bg.addColorStop(1,'rgba(255,220,170,.05)');
  c.fillStyle=bg;c.beginPath();c.moveTo(x+60,GY-775);c.lineTo(x+100,GY-775);c.lineTo(x+330,GY);c.lineTo(x-170,GY);c.closePath();c.fill();
  c.save();c.translate(x+80,GY+10);c.scale(1,.18);const pg=c.createRadialGradient(0,0,0,0,0,300);pg.addColorStop(0,'rgba(255,220,170,.3)');pg.addColorStop(1,'rgba(255,220,170,0)');
  c.fillStyle=pg;c.beginPath();c.arc(0,0,300,0,7);c.fill();c.restore();
}
function shelter(c){
  const [x0,x1]=SHELTER;
  c.strokeStyle='#3a3d46';c.lineWidth=12;
  for(const x of [x0+20,x1-20]){c.beginPath();c.moveTo(x,GY);c.lineTo(x,GY-470);c.stroke();}
  c.fillStyle='#22252c';c.beginPath();c.moveTo(x0-40,GY-470);c.lineTo(x1+40,GY-470);c.lineTo(x1+20,GY-500);c.lineTo(x0-20,GY-500);c.closePath();c.fill();
  c.fillStyle='rgba(255,255,255,.18)';c.fillRect(x0-40,GY-472,x1-x0+80,4);
  c.fillStyle='rgba(150,190,255,.08)';c.fillRect(x0+26,GY-440,x1-x0-52,330);
  c.fillStyle='#2b2e36';c.fillRect(x0+60,GY-150,x1-x0-120,16);
  c.fillRect(x0+80,GY-134,10,134);c.fillRect(x1-90,GY-134,10,134);
  c.save();c.shadowColor='rgba(200,225,255,.9)';c.shadowBlur=26;c.fillStyle='rgba(220,235,255,.85)';c.fillRect(x0+40,GY-462,x1-x0-80,6);c.restore();
}
function traffic(c,t,camX){
  for(let k=0;k<4;k++){
    const dirn=k%2?1:-1,sp=520+k*90,m=(t*sp+k*700)%(W+2400);
    const x=dirn>0?m+camX-1200:camX+W+1200-m,y=HOR+(dirn>0?150:70);
    c.save();c.globalAlpha=.55;c.fillStyle='#14161b';c.fillRect(x-110,y-46,220,46);
    const col=dirn>0?'rgba(255,240,210,':'rgba(255,60,60,';
    c.shadowColor=col+'1)';c.shadowBlur=30;c.fillStyle=col+'.95)';
    c.fillRect(x+(dirn>0?92:-104),y-24,14,8);c.restore();
  }
}
const DROPS=[];{let s=5;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<520;i++)DROPS.push([r(),r(),.6+r()*.8,r()]);}
function rain(c,t,camX,shields,front){
  c.save();c.lineCap='round';
  const span=W+600;
  for(let i=0;i<DROPS.length;i++){
    const d=DROPS[i];if((i%3===0)!==front)continue;
    const sp=1500*d[2],len=40+30*d[2];
    const y=((d[1]*(GY+200)+t*sp)%(GY+200))-200;
    const x=camX-300+((d[0]*span-y*.12)%span+span)%span;
    let blocked=false;for(const s of shields){if(x>s.x0&&x<s.x1&&y>s.y)blocked=true;}
    if(blocked||y>GY)continue;
    c.strokeStyle='rgba(210,220,240,'+(front?.42:.22)*d[2]+')';c.lineWidth=front?2.4:1.4;
    c.beginPath();c.moveTo(x,y);c.lineTo(x-len*.12,y+len);c.stroke();
  }
  if(front){c.strokeStyle='rgba(220,230,250,.35)';c.lineWidth=2;
    for(let i=0;i<70;i++){const d=DROPS[i],ph=(t*2.2+d[3])%1,x=camX-300+d[0]*(W+600),y=GY+10+d[1]*420;
      let blocked=false;for(const s of shields){if(s.ground&&x>s.x0&&x<s.x1)blocked=true;}if(blocked)continue;
      c.globalAlpha=1-ph;c.beginPath();c.ellipse(x,y,6+22*ph,2+5*ph,0,0,7);c.stroke();}}
  c.restore();
}
function heart(c,x,y,s,a){
  c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=a;
  c.shadowColor='rgba(255,40,70,.95)';c.shadowBlur=30;c.fillStyle='#ff2d4a';
  c.beginPath();c.moveTo(0,28);c.bezierCurveTo(-60,-14,-34,-58,0,-26);c.bezierCurveTo(34,-58,60,-14,0,28);c.fill();c.restore();
}
function label(c,txt,x,y,a){
  if(a<=0||window.VIDEO.hideLabels)return;
  c.save();c.globalAlpha=a;c.fillStyle='#e8e8ee';c.textAlign='center';
  c.font='600 34px "Courier New",monospace';if('letterSpacing' in c)c.letterSpacing='6px';
  c.fillText(txt,x,y);c.restore();
}

// ---------- jalan cerita ----------
const EX0=380,YOUNG_IN=BEATS[2]-.2,PASS_X=820,T_STOP=BEATS[2]+1.6,T_BACK=BEATS[2]+2.0,T_ARRIVE=BEATS[3]-.1,T_WALK=BEATS[4],T_SHEL=BEATS[5]-.2;
const SH_X=-860;
function elderX(t){if(t<T_WALK)return EX0;return lerp(EX0,SH_X,seg(t,T_WALK,T_SHEL));}
function youngX(t){
  if(t<YOUNG_IN)return -400;
  if(t<T_STOP){const k=(t-YOUNG_IN)/(T_STOP-YOUNG_IN);return lerp(-400,PASS_X,1-Math.pow(1-k,1.6));}
  if(t<T_BACK)return PASS_X;
  if(t<T_ARRIVE)return lerp(PASS_X,EX0+150,seg(t,T_BACK,T_ARRIVE));
  return elderX(t)+150;
}
function spd(f,t){return (f(t+.04)-f(t-.04))/.08}
function passers(t){
  const out=[],P=[[BEATS[1]-.4,1,'rgba(59,74,102,.9)'],[BEATS[1]+.9,-1,'rgba(90,59,70,.9)'],[BEATS[1]+2.0,1,'rgba(62,90,76,.9)']];
  for(const [t0,dir,col] of P){const k=(t-t0)/3.2;if(k<0||k>1)continue;
    out.push({x:dir>0?lerp(-300,1800,k):lerp(1800,-300,k),dir,col,ph:k*28});}
  return out;
}
function cast(t){
  const ex=elderX(t),yx=youngX(t),ys=spd(youngX,t);
  const walkE=t>=T_WALK&&t<T_SHEL;
  const elder={x:ex,y:GY,s:.93,dir:t>=T_WALK-.3?-1:1,col:'#cfcfd6',ph:walkE?(ex-EX0)/100*Math.PI:t*1.3,amp:walkE?.75:.04,
    lean:.32+(walkE?0:.02*Math.sin(t*9)),head:t<T_ARRIVE?.35:.12,stick:true,glow:false,armA:null,armB:null,
    hug:!walkE&&t<T_ARRIVE+.6,shiver:t};
  const moving=Math.abs(ys)>15,ydir=(t>=T_BACK&&t<T_ARRIVE)?-1:1;
  const passing=t<T_ARRIVE-.6;
  const young={x:yx,y:passing?GY+70:GY,s:passing?1.04:1,dir:ydir,col:'#ffffff',ph:yx/90*Math.PI,amp:moving?.9:0,lean:.1,head:-.05,glow:true,armA:null,armB:null};
  if(t>=T_ARRIVE){young.dir=-1;young.ph=walkE?-(yx-EX0-150)/100*Math.PI:0;young.amp=walkE?.75:0;}
  if(!elder.hug){const es=shoulderW(elder);elder.armA=[es[0]+70*elder.s,es[1]+112*elder.s];}
  const ysh=shoulderW(young);
  let tilt=.08*young.dir,hand=[ysh[0]+young.dir*28,ysh[1]+20];
  const share=seg(t,T_ARRIVE-.2,T_ARRIVE+.5);
  if(share>0){const reach=[ysh[0]-92,ysh[1]-26];hand=[lerp(hand[0],reach[0],share),lerp(hand[1],reach[1],share)];tilt=lerp(tilt,-.5,share);}
  const cu=seg(t,T_SHEL+.8,T_SHEL+1.6);young.armA=cu>.6?null:hand;
  return {elder,young,hand,tilt,closeU:seg(t,T_SHEL+.8,T_SHEL+1.6)};
}

window.VIDEO={width:W,height:H,fps:30,duration:D,loop:false,beats:BEATS,
draw(c,t,w,h){
  if(!sky)buildSky();
  t=cl(t,0,D);
  const S=cast(t);
  const pair=(S.young.x+S.elder.x)/2;
  const mid=t<YOUNG_IN+.8?EX0+120:t<T_ARRIVE?lerp(EX0+120,pair,seg(t,YOUNG_IN+.8,T_ARRIVE)):pair;
  const camX=mid-W/2;
  const z=1.22+.06*(t/D),ay=1250;
  c.save();c.fillStyle='#040507';c.fillRect(0,0,W,H);
  c.translate(W/2,ay);c.scale(z,z);c.translate(-(camX+W/2),-ay);
  const ox=Math.floor(camX/W)*W;for(const k of [-1,0,1,2])c.drawImage(sky,ox+k*W,0);
  ground(c,camX);traffic(c,t,camX);
  shelter(c);streetLight(c,EX0+180);streetLight(c,SHELTER[0]-260);
  const shields=[{x0:SHELTER[0]-40,x1:SHELTER[1]+40,y:GY-470,ground:true}];
  rain(c,t,camX,shields,false);
  for(const p of passers(t)){const o={x:p.x,y:GY-210,s:.6,dir:p.dir,col:'#7d808a',ph:p.ph,amp:.95,lean:.12,head:.05,armA:null,armB:null};
    const sh=shoulderW(o);o.armA=[sh[0]+p.dir*24,sh[1]+30];
    c.save();c.globalAlpha=.35;fig(c,o,true);umbrella(c,o.armA,.05*p.dir,85,p.col,1);c.restore();}
  c.save();c.globalAlpha=.12;for(const o of [S.elder,S.young]){c.save();c.translate(0,2*o.y+28);c.scale(1,-1);fig(c,o,true);c.restore();}c.restore();
  fig(c,S.elder,false);fig(c,S.young,false);
  if(S.closeU<1){c.save();c.globalAlpha=1-S.closeU;const um=umbrella(c,S.hand,S.tilt,165,'rgba(40,46,60,.92)',1);c.restore();if(S.closeU<.5)shields.push(um);}
  rain(c,t,camX,shields,true);
  const wet=seg(t,T_ARRIVE+.3,T_ARRIVE+1)*(1-seg(t,T_SHEL,T_SHEL+.6));
  if(wet>0){const sh=shoulderW(S.young);c.save();c.globalAlpha=wet;c.fillStyle='rgba(190,215,255,.9)';
    for(let k=0;k<4;k++){const p=((t*1.6+k*.25)%1);c.beginPath();c.ellipse(sh[0]+18+k*7,sh[1]-10+p*70,3,5,0,0,7);c.fill();}c.restore();}
  const hs=seg(t,BEATS[5]+.4,BEATS[5]+1.1);
  if(hs>0){const pls=1+.08*Math.sin((t-BEATS[5])*5);heart(c,pair,GY-600-hs*20,(.4+.6*Math.min(1,hs*1.2))*pls,hs*(1-seg(t,19.4,19.9)));}
  c.restore();
  const vg=c.createRadialGradient(W/2,H*.5,H*.28,W/2,H*.5,H*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.72)');
  c.fillStyle=vg;c.fillRect(0,0,W,H);
  label(c,'KEBAIKAN KECIL',W/2,280,seg(t,BEATS[5],BEATS[5]+.6)*(1-seg(t,19.3,19.8)));
  c.fillStyle='rgba(0,0,0,'+(1-seg(t,0,.5))+')';c.fillRect(0,0,W,H);
  c.fillStyle='rgba(0,0,0,'+seg(t,19.5,20.2)+')';c.fillRect(0,0,W,H);
}};
})();
