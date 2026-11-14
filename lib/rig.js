// Kawalan rangka untuk model MakeHuman (glb dari jambatan/model). Pose rehat: semua putaran tulang = identiti.
(function(){
const V3=THREE.Vector3,Q=THREE.Quaternion;
const v=(a)=>new V3(a[0],a[1],a[2]);
function yawQ(a){return new Q().setFromAxisAngle(new V3(0,1,0),a);}
class Rig{
  constructor(root,matOpts){
    this.obj=root;this.B={};
    root.traverse(o=>{if(o.isBone)this.B[o.name]=o;if(o.isMesh||o.isSkinnedMesh){
      o.material=new THREE.MeshStandardMaterial(Object.assign({vertexColors:true,roughness:.72,metalness:0,side:THREE.DoubleSide},matOpts||{}));
      o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;}});
    for(const k in this.B){this.B[k].userData.p0=this.B[k].position.clone();}
    root.updateMatrixWorld(true);
    this.R={};for(const k in this.B){this.R[k]=this.B[k].getWorldPosition(new V3());}
    const R=this.R,len=(a,b)=>R[a].distanceTo(R[b]);
    this.arm={L:[len('upperarm01_L','lowerarm01_L'),len('lowerarm01_L','wrist_L')],R:[len('upperarm01_R','lowerarm01_R'),len('lowerarm01_R','wrist_R')]};
    this.leg={L:[len('upperleg01_L','lowerleg01_L'),len('lowerleg01_L','foot_L')],R:[len('upperleg01_R','lowerleg01_R'),len('lowerleg01_R','foot_R')]};
    this.hip0=R['root'].clone();
    this.hand={};
    for(const s of ['L','R']){
      const d=R['finger3-1_'+s].clone().sub(R['wrist_'+s]).normalize();
      const side=R['finger5-1_'+s].clone().sub(R['finger2-1_'+s]).normalize();
      this.hand[s]={d,side};
    }
  }
  reset(){for(const k in this.B){const b=this.B[k];b.quaternion.identity();b.position.copy(b.userData.p0);}}
  wq(b){return this.B[b].getWorldQuaternion(new Q());}
  wp(b){return this.B[b].getWorldPosition(new V3());}
  aim(name,child,target){
    const b=this.B[name];b.parent.updateMatrixWorld(true);
    const rest=this.R[child].clone().sub(this.R[name]).normalize();
    const cur=this.wp(name),d=target.clone().sub(cur).normalize();
    const qp=b.parent.getWorldQuaternion(new Q()).invert();d.applyQuaternion(qp);
    b.quaternion.setFromUnitVectors(rest,d);b.updateMatrixWorld(true);
  }
  setWorldQ(name,qw){const b=this.B[name];b.parent.updateMatrixWorld(true);
    const qp=b.parent.getWorldQuaternion(new Q()).invert();b.quaternion.copy(qp.multiply(qw));b.updateMatrixWorld(true);}
  bendWorld(name,axisW,ang){const b=this.B[name];b.parent.updateMatrixWorld(true);
    const qpw=b.parent.getWorldQuaternion(new Q()),cur=qpw.clone().multiply(b.quaternion);
    const r=new Q().setFromAxisAngle(axisW.clone().normalize(),ang);this.setWorldQ(name,r.multiply(cur));}
  static ik(s,t,l1,l2,pole){let d=t.clone().sub(s),D=d.length();const m=l1+l2-.002;if(D>m){d.multiplyScalar(m/D);D=m;}D=Math.max(D,.02);
    const dn=d.clone().divideScalar(D),a=(l1*l1-l2*l2+D*D)/(2*D),h=Math.sqrt(Math.max(0,l1*l1-a*a));
    const p=pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))).normalize();
    return [s.clone().add(dn.clone().multiplyScalar(a)).add(p.multiplyScalar(h)),s.clone().add(d)];}
  basisQ(d0,s0,d1,n1){ // putaran yang bawa (arah jari, sisi tapak) rehat ke sasaran
    const n0=new V3().crossVectors(d0,s0).normalize(),s0o=new V3().crossVectors(n0,d0).normalize();
    const d=d1.clone().normalize(),n=n1.clone().sub(d.clone().multiplyScalar(n1.dot(d))).normalize(),s=new V3().crossVectors(n,d).normalize();
    const M0=new THREE.Matrix4().makeBasis(d0,s0o,n0),M1=new THREE.Matrix4().makeBasis(d,s,n);
    return new Q().setFromRotationMatrix(M1.multiply(M0.transpose()));}
  // p: {hip:[x,y,z], yaw, lean, twist, side, headYaw, headPitch, headRoll, hand:{L:{p,dir,n,curl,thumb,pole},R:{..}}, foot:{L:{p,yaw},R:{..}}, legPole, jaw, look}
  pose(p){
    this.reset();const B=this.B,yaw=p.yaw||0,yq=yawQ(yaw);
    const fwd=new V3(Math.sin(yaw),0,Math.cos(yaw)),up=new V3(0,1,0),left=new V3(Math.cos(yaw),0,-Math.sin(yaw));
    B.root.position.copy(B.root.userData.p0).add(v(p.hip).sub(this.hip0));
    B.root.quaternion.copy(yq);
    const sp=['spine05','spine04','spine03','spine02','spine01'],k=1/sp.length;
    for(const n of sp){B[n].quaternion.setFromEuler(new THREE.Euler((p.lean||0)*k,(p.twist||0)*k,(p.side||0)*k,'YXZ'));}
    const nk=['neck01','neck02','neck03'];
    for(const n of nk)B[n].quaternion.setFromEuler(new THREE.Euler((p.headPitch||0)*.25,(p.headYaw||0)*.25,(p.headRoll||0)*.25,'YXZ'));
    B.head.quaternion.setFromEuler(new THREE.Euler((p.headPitch||0)*.25,(p.headYaw||0)*.25,(p.headRoll||0)*.25,'YXZ'));
    if(p.jaw)B.jaw.quaternion.setFromAxisAngle(new V3(1,0,0),p.jaw);
    this.obj.updateMatrixWorld(true);
    // kaki
    for(const s of ['L','R']){const f=p.foot&&p.foot[s];if(!f)continue;
      const hip=this.wp('upperleg01_'+s),tgt=v(f.p),pole=f.pole?v(f.pole):fwd.clone().add(new V3(0,.1,0));
      const [kn,an]=Rig.ik(hip,tgt,this.leg[s][0],this.leg[s][1],pole);
      this.aim('upperleg01_'+s,'lowerleg01_'+s,kn);this.aim('lowerleg01_'+s,'foot_'+s,an);
      this.setWorldQ('foot_'+s,yawQ(f.yaw!==undefined?f.yaw:yaw).multiply(new Q().setFromAxisAngle(new V3(1,0,0),f.pitch||0)));}
    // tangan
    for(const s of ['L','R']){const h=p.hand&&p.hand[s];if(!h)continue;
      const sh=this.wp('upperarm01_'+s),tgt=v(h.p);
      const sgn=s==='L'?1:-1;
      const pole=h.pole?v(h.pole):left.clone().multiplyScalar(sgn*.6).add(new V3(0,-.7,0)).add(fwd.clone().multiplyScalar(-.4));
      const [el,wr]=Rig.ik(sh,tgt,this.arm[s][0],this.arm[s][1],pole);
      this.aim('upperarm01_'+s,'lowerarm01_'+s,el);this.aim('lowerarm01_'+s,'wrist_'+s,wr);
      if(h.dir&&h.n){const H=this.hand[s];this.setWorldQ('wrist_'+s,this.basisQ(H.d,H.side,v(h.dir),v(h.n).multiplyScalar(sgn)));}
      const curl=h.curl||0;if(curl){
        const ax=this.hand[s].side.clone().applyQuaternion(this.wq('wrist_'+s)).multiplyScalar(sgn);
        for(const f of [2,3,4,5])for(const j of [1,2,3])this.bendWorld('finger'+f+'-'+j+'_'+s,ax,curl*(j===1?.9:1.1));
        const dw=this.hand[s].d.clone().applyQuaternion(this.wq('wrist_'+s));
        for(const j of [2,3])this.bendWorld('finger1-'+j+'_'+s,dw,-sgn*curl*.5*(h.thumb===undefined?1:h.thumb));
      }}
    if(p.look){for(const s of ['L','R']){const e=this.wp('eye_'+s),d=v(p.look).sub(e).normalize();
      const qp=this.B['eye_'+s].parent.getWorldQuaternion(new Q()).invert();d.applyQuaternion(qp);
      const q=new Q().setFromUnitVectors(new V3(0,0,1),d);const ang=2*Math.acos(Math.min(1,Math.abs(q.w)));
      if(ang<.6)this.B['eye_'+s].quaternion.copy(new Q().slerp(q,Math.min(1,.3/Math.max(ang,1e-3))));}}
    this.obj.updateMatrixWorld(true);
  }
}
window.Rig=Rig;
})();
