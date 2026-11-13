(function(){
const W=1080,H=1920,D=24.2;
const B=[.3,5.5,10.2,13.9,17.8,21.1];
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const sm=x=>{x=cl(x);return x*x*(3-2*x)};
const seg=(t,a,b)=>sm((t-a)/(b-a));
const win=(t,a,b,f=.25)=>seg(t,a,a+f)*(1-seg(t,b-f,b));
const TW=84,RH=50,SL=RH/TW,Y0=1540,RAIL=330;
const ys=x=>Y0-SL*x;
const RED='#ff4a5a',YEL='#f2c230';

// kedudukan anak tangga (dalam unit anak tangga): + naik, - turun
const V0=.7,TST=B[2]+.2,TD=1.2;
const S1=V0*TST+V0*TD*.5;
function S(t){
  if(t<TST)return V0*t;
  if(t<TST+TD){const p=(t-TST)/TD;return V0*TST+V0*TD*(p-p*p/2)}
  if(t<B[4])return S1;
  const q=t-B[4],a=.45,vm=1.6,tc=vm/a;
  if(q<tc)return S1-.5*a*q*q;
  return S1-.5*a*tc*tc-vm*(q-tc);
}
// peristiwa
const T_BRAKE_ON=TST+TD, T_BRAKE_FAIL=B[2]+2.2, T_WORN=B[3]+.3, T_SNAP=B[3]+2.1;

// geometri jentera
const MD={x:930,y:1240,r:72}, MS={x:860,y:1355,r:26}, DISC={x:700,y:1355,r:46};

function bg(c,t){
  let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b1220');g.addColorStop(.55,'#152238');g.addColorStop(1,'#0a0f1a');
  c.fillStyle=g;c.fillRect(0,0,W,H);
  let rg=c.createRadialGradient(820,520,20,820,520,700);rg.addColorStop(0,'rgba(120,170,255,.2)');rg.addColorStop(1,'rgba(120,170,255,0)');
  c.fillStyle=rg;c.fillRect(0,0,W,H);
}
function truss(c){
  const xa=-200,xb=1300;
  c.beginPath();c.moveTo(xa,ys(xa)+RH);c.lineTo(xb,ys(xb)+RH);c.lineTo(xb,ys(xb)+430);c.lineTo(xa,ys(xa)+430);c.closePath();
  const g=c.createLinearGradient(0,900,0,1900);g.addColorStop(0,'#3a4658');g.addColorStop(1,'#171d29');
  c.fillStyle=g;c.fill();
  c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=3;
  for(let k=-4;k<22;k++){const x1=k*120,x2=x1+120;
    c.beginPath();c.moveTo(x1,ys(x1)+RH+20);c.lineTo(x2,ys(x2)+400);c.moveTo(x2,ys(x2)+RH+20);c.lineTo(x1,ys(x1)+400);c.stroke();}
}
function gear(c,x,y,r,ang,teeth,col){
  c.save();c.translate(x,y);c.rotate(ang);
  c.fillStyle=col;c.beginPath();
  for(let i=0;i<teeth*2;i++){const a=i/(teeth*2)*Math.PI*2,rr=(i%2?r*.86:r*1.08);c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}
  c.closePath();c.fill();
  c.fillStyle='#1b2230';c.beginPath();c.arc(0,0,r*.45,0,7);c.fill();
  c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(r*.38,0);c.stroke();
  c.restore();
}
function chain(c,t,s,snap){
  // tangen luar antara dua gear
  const dx=MD.x-MS.x,dy=MD.y-MS.y,d=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),off=Math.asin((MD.r-MS.r)/d);
  const nA=ang-Math.PI/2-off, nB=ang+Math.PI/2+off;
  const run=n=>[[MS.x+Math.cos(n)*MS.r,MS.y+Math.sin(n)*MS.r],[MD.x+Math.cos(n)*MD.r,MD.y+Math.sin(n)*MD.r]];
  c.lineCap='butt';c.lineWidth=12;c.strokeStyle='#c9d1db';c.setLineDash([14,8]);c.lineDashOffset=-s*70;
  for(const n of [nA,nB]){
    const [p,q]=run(n);
    c.beginPath();
    if(snap<=0){c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1])}
    else if(n===nA){ // larian atas putus dan terkulai
      const e=seg(t,T_SNAP,T_SNAP+.7),mx=p[0]+(q[0]-p[0])*.4,my=p[1]+(q[1]-p[1])*.4;
      c.moveTo(p[0],p[1]);c.quadraticCurveTo(mx,my+60*e,mx+10,my+120*e);
      c.moveTo(q[0],q[1]);const nx=p[0]+(q[0]-p[0])*.62,ny=p[1]+(q[1]-p[1])*.62;c.quadraticCurveTo(nx,ny+40*e,nx-10,ny+90*e);
    }else{c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1])}
    c.stroke();
  }
  c.setLineDash([]);
  if(snap>0){ // percikan
    const k=1-seg(t,T_SNAP,T_SNAP+.5);
    if(k>0){const px=(MS.x+MD.x)/2+10,py=(MS.y+MD.y)/2-10;
      c.save();c.globalAlpha=k;c.shadowColor='#ffb347';c.shadowBlur=40;c.fillStyle='#ffd27a';
      for(let i=0;i<9;i++){const a=i/9*Math.PI*2+t*3,r2=14+60*(1-k);c.beginPath();c.arc(px+Math.cos(a)*r2,py+Math.sin(a)*r2,5,0,7);c.fill()}
      c.restore()}
  }
}
function brake(c,t,s){
  const on=seg(t,TST,T_BRAKE_ON), fail=seg(t,T_BRAKE_FAIL,T_BRAKE_FAIL+.35), worn=seg(t,T_WORN,T_WORN+.7);
  // gap antara pad dan cakera
  const gap=6*(1-on)+on*0+fail*26;
  const th=22-15*worn;
  // cakera
  c.save();c.translate(DISC.x,DISC.y);c.rotate(s*1.6);
  c.fillStyle='#8f9aa8';c.beginPath();c.arc(0,0,DISC.r,0,7);c.fill();
  c.fillStyle='#1b2230';c.beginPath();c.arc(0,0,14,0,7);c.fill();
  c.strokeStyle='rgba(20,26,36,.7)';c.lineWidth=5;for(let i=0;i<6;i++){c.beginPath();c.moveTo(Math.cos(i)*22,Math.sin(i)*22);c.lineTo(Math.cos(i)*DISC.r*.85,Math.sin(i)*DISC.r*.85);c.stroke()}
  c.restore();
  // pad atas & bawah
  const col=worn>.1?'#7a4a3a':'#c27c3a';
  for(const sg of [-1,1]){
    const y=DISC.y+sg*(DISC.r+gap+(sg<0?-th:0));
    c.fillStyle=col;c.fillRect(DISC.x-38,sg<0?y:y,76,th);
    c.fillStyle='#3a4658';c.fillRect(DISC.x-46,sg<0?y-14:y+th,92,14);
  }
  // sorotan merah bila gagal
  const hl=fail*(.55+.45*Math.sin(t*10));
  if(hl>0){c.save();c.strokeStyle=RED;c.globalAlpha=hl;c.lineWidth=7;c.shadowColor=RED;c.shadowBlur=30;
    c.beginPath();c.arc(DISC.x,DISC.y,DISC.r+54,0,7);c.stroke();c.restore()}
}
function machine(c,t,s,zoomT){
  // badan motor dan aci
  c.fillStyle='#46556b';c.fillRect(740,1318,95,74);
  c.fillStyle='#2b3647';c.fillRect(735,1310,8,90);c.fillRect(832,1310,8,90);
  c.strokeStyle='#9aa5b3';c.lineWidth=9;c.beginPath();c.moveTo(DISC.x+DISC.r-4,DISC.y);c.lineTo(740,1355);c.moveTo(835,1355);c.lineTo(MS.x,MS.y);c.stroke();
  const snap=t>=T_SNAP?1:0;
  chain(c,t,s,snap);
  gear(c,MS.x,MS.y,MS.r,s*5,10,'#aab4c2');
  gear(c,MD.x,MD.y,MD.r,s*1.9,16,'#c9d1db');
  brake(c,t,s);
  // gelang sorotan semasa penerangan
  const a=win(t,B[1],B[2]+.2,.4);
  if(a>0){c.save();c.globalAlpha=a*(.6+.4*Math.sin(t*6));c.strokeStyle=YEL;c.lineWidth=6;c.shadowColor=YEL;c.shadowBlur=24;
    c.beginPath();c.arc(DISC.x,DISC.y,DISC.r+34,0,7);c.stroke();
    c.beginPath();c.arc(MD.x,MD.y,MD.r+22,0,7);c.stroke();c.restore()}
}
function steps(c,s){
  const fs=((s%1)+1)%1;
  for(let i=-4;i<17;i++){
    const x=(i+fs)*TW,y=ys(x);
    c.fillStyle='#2a313d';c.fillRect(x,y,10,RH);c.fillStyle=YEL;c.fillRect(x,y,10,5);
    const g=c.createLinearGradient(0,y,0,y+14);g.addColorStop(0,'#cfd6df');g.addColorStop(1,'#8d97a4');
    c.fillStyle=g;c.fillRect(x,y,TW,14);
    c.fillStyle='rgba(40,48,60,.55)';for(let k=1;k<7;k++)c.fillRect(x+k*12,y+2,3,10);
    c.fillStyle=YEL;c.fillRect(x+TW-6,y,6,14);
  }
}
function glass(c,s){
  const gx1=0,gx2=1080;
  c.beginPath();c.moveTo(gx1,ys(gx1)-18);c.lineTo(gx2,ys(gx2)-18);c.lineTo(gx2,ys(gx2)-RAIL+14);c.lineTo(gx1,ys(gx1)-RAIL+14);c.closePath();
  const g=c.createLinearGradient(0,600,1080,1500);g.addColorStop(0,'rgba(170,215,255,.20)');g.addColorStop(.5,'rgba(170,215,255,.07)');g.addColorStop(1,'rgba(170,215,255,.18)');
  c.fillStyle=g;c.fill();
  c.lineCap='round';c.strokeStyle='#10141b';c.lineWidth=30;c.beginPath();c.moveTo(gx1-40,ys(gx1-40)-RAIL);c.lineTo(gx2+40,ys(gx2+40)-RAIL);c.stroke();
  c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=5;c.beginPath();c.moveTo(gx1-40,ys(gx1-40)-RAIL-8);c.lineTo(gx2+40,ys(gx2+40)-RAIL-8);c.stroke();
  const fs=((s%1)+1)%1;c.strokeStyle='rgba(255,255,255,.16)';c.lineWidth=4;c.lineCap='butt';
  for(let i=-2;i<15;i++){const x=(i+fs)*TW,y=ys(x)-RAIL;c.beginPath();c.moveTo(x-4,y+11);c.lineTo(x+4,y-11);c.stroke()}
  c.fillStyle='#9aa5b3';for(let k=0;k<4;k++){const x=90+k*300;c.fillRect(x,ys(x)-RAIL+12,12,RAIL-30)}
}
const PX=[10,125,240,355];
function person(c,x,col){
  const fy=ys(x),hip=fy-92,sh=hip-120,hx=x+30,hy=ys(hx)-RAIL+10;
  c.lineCap='round';c.lineJoin='round';c.lineWidth=11;c.strokeStyle=col;
  c.beginPath();c.moveTo(x-16,fy);c.lineTo(x,hip);c.lineTo(x+16,fy);c.moveTo(x,hip);c.lineTo(x,sh);
  c.moveTo(x,sh+14);c.lineTo(x+14,(sh+hy)/2+10);c.lineTo(hx,hy);c.stroke();
  c.fillStyle=col;c.beginPath();c.arc(x,sh-30,25,0,7);c.fill();
}
function people(c,s){
  const cols=['#e8ecf2','#cfd6df','#e8ecf2','#cfd6df'];
  PX.forEach((x0,i)=>{const x=x0+s*TW;if(x>-60&&x<1140)person(c,x,cols[i])});
}
function txt(c,s,x,y,size,col,a,glow){
  if(a<=0)return;
  c.save();c.globalAlpha=a;c.textAlign='center';c.font='900 '+size+'px "Arial Black",Impact,sans-serif';
  const mw=c.measureText(s).width;if(mw>960){size=Math.floor(size*960/mw);c.font='900 '+size+'px "Arial Black",Impact,sans-serif'}
  c.lineWidth=size*.14;c.strokeStyle='rgba(5,8,14,.9)';c.lineJoin='round';
  if(glow){c.shadowColor=col;c.shadowBlur=28}
  c.strokeText(s,x,y);c.fillStyle=col;c.fillText(s,x,y);c.restore();
}
function tag(c,s,x,y,a){
  if(a<=0||window.VIDEO.hideLabels)return;
  txt(c,s,x,y,38,'#ffffff',a,false);
}

window.VIDEO={width:W,height:H,fps:30,duration:D,loop:false,beats:B,
draw(c,t,w,h){
  t=cl(t,0,D);const s=S(t);
  c.save();c.clearRect(0,0,W,H);
  bg(c,t);
  // zum ke jentera semasa penerangan
  const z=1+.3*seg(t,B[1],B[1]+1)*(1-seg(t,B[4]-.9,B[4]+.3));
  c.translate(800,1290);c.scale(z,z);c.translate(-800,-1290);
  truss(c);machine(c,t,s,z);
  tag(c,'BREK',700,1255,win(t,B[1]+.3,B[2],.3));
  tag(c,'RANTAI',930,1135,win(t,B[1]+1.2,B[2],.3));
  steps(c,s);people(c,s);glass(c,s);
  c.restore();
  // vinyet
  const vg=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');
  c.fillStyle=vg;c.fillRect(0,0,W,H);
  // tajuk
  const L=(a,b,l1,l2,col,glow)=>{const k=win(t,a,b);txt(c,l1,W/2,300,92,col||'#fff',k,glow);if(l2)txt(c,l2,W/2,410,60,col||'#fff',k,glow)};
  L(B[0],B[1],'KORANG TAHU TAK?','ESKALATOR BOLEH MELUNCUR TURUN');
  L(B[1],B[2],'BREK & RANTAI PENGGERAK','YANG MENAHAN ANAK TANGGA');
  L(B[2],T_BRAKE_FAIL,'ESKALATOR BERHENTI','',RED,true);
  L(T_BRAKE_FAIL,B[3],'BREK GAGAL','',RED,true);
  L(B[3],T_SNAP,'PAD BREK HAUS','',RED,true);
  L(T_SNAP,B[4],'RANTAI PENGGERAK PUTUS','',RED,true);
  L(B[4],B[5],'ANAK TANGGA MENURUN','MENGIKUT BEBAN',RED,true);
  const k=seg(t,B[5],B[5]+.5);txt(c,'JANGAN ABAIKAN',W/2,300,84,'#fff',k,false);txt(c,'SERVIS BERKALA',W/2,410,84,YEL,k,true);
  c.restore();
}};
})();
