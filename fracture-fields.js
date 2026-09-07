/* Analytical elastic fields. Lengths passed to Williams are in metres.
   Crack/inclusion functions use coordinates normalized by half-length a. */
(function(root){
  'use strict';
  const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
  const div=(a,b)=>{const d=b[0]*b[0]+b[1]*b[1];return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];};
  function rootCut(x,y){
    const u=x*x-y*y-1,v=2*x*y,R=Math.hypot(u,v);
    let re=Math.sqrt(Math.max(0,(R+u)/2)),im=(v<0?-1:1)*Math.sqrt(Math.max(0,(R-u)/2));
    if(x<0||(x===0&&y<0)){re=-re;im=-im;}
    return [re,im];
  }
  function center(x,y){
    const s=rootCut(x,y),q=div([x,y],s),qp=div([-1,0],mul(mul(s,s),s));
    return {xx:q[0]-y*qp[1]-1,yy:q[0]+y*qp[1],xy:-y*qp[0]};
  }
  function anti(x,y,alpha,rigid){
    const s=rootCut(x,y),q=div([x,y],s),A=Math.cos(alpha),B=Math.sin(alpha);
    return rigid?{w:A*s[0]+B*y,tx:A*q[0],ty:B-A*q[1]}:{w:A*x+B*s[1],tx:A+B*q[1],ty:B*q[0]};
  }
  function williams(r,t,ki,kii,kiii=0){
    const f=1/Math.sqrt(2*Math.PI*r),c=Math.cos(t/2),s=Math.sin(t/2),c3=Math.cos(3*t/2),s3=Math.sin(3*t/2);
    return {xx:f*(ki*c*(1-s*s3)-kii*s*(2+c*c3)),yy:f*(ki*c*(1+s*s3)+kii*s*c*c3),xy:f*(ki*s*c*c3+kii*c*(1-s*s3)),xz:-f*kiii*s,yz:f*kiii*c};
  }
  const physics={rootCut,center,anti,williams};
  if(typeof module!=='undefined')module.exports=physics;
  root.FractureFields=physics;
  if(typeof document==='undefined')return;
  const kind=document.body.dataset.figure,main=document.getElementById('field'),plot=document.getElementById('plot'),ui=document.getElementById('controls'),out=document.getElementById('readout');
  let mode=new URLSearchParams(location.search).get('mode')==='Mixed'?'Mixed':'I';
  const cfg={
    tip:{title:'Inside the crack-tip field',sub:'Local Williams field · isotropic linear elasticity',map:'Stress around one tip',chart:'Ahead of the tip · log–log axes'},
    center:{title:'A sharp crack stays singular',sub:'Infinite plate · centre crack of length 2a · remote tension',map:'σyy / σ∞ · exact elastic field',chart:'Exact solution versus near-tip asymptote'},
    anti:{title:'Crack and anticrack',sub:'Exact antiplane comparison · same remote shear on both panels',map:'Shear magnitude |τ| / τ∞',chart:'Stress ahead of the right tip · log–log axes'}
  }[kind];
  document.getElementById('title').textContent=cfg.title;document.getElementById('subtitle').textContent=cfg.sub;
  document.getElementById('mapTitle').textContent=cfg.map;document.getElementById('chartTitle').textContent=cfg.chart;
  const range=(id,name,min,max,step,val)=>`<label for="${id}">${name}<input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  if(kind==='tip')ui.innerHTML='<div class="buttons" role="group" aria-label="Fracture mode">'+['I','II','III','Mixed'].map(m=>`<button data-mode="${m}" aria-pressed="${m==='I'}">${m==='Mixed'?'Mixed I + II':'Mode '+m}</button>`).join('')+'</div>'+range('mix','Mixity ψ (degrees)',-90,90,1,35)+range('intensity','K magnitude (MPa√m)',.5,2,.1,1)+range('probe','Probe distance r · logarithmic',-5,-2,.02,-3);
  if(kind==='center')ui.innerHTML=range('half','Half-length a (mm)',5,50,1,20)+range('remote','Remote tension σ∞ (MPa)',10,100,5,40)+range('probe','Probe distance r/a · logarithmic',-4,1,.02,-2);
  if(kind==='anti')ui.innerHTML=range('angle','Remote shear angle α (degrees)',0,90,1,30)+range('probe','Probe distance r/a · logarithmic',-4,0,.02,-2)+'<div class="buttons"><button data-angle="0">α = 0°</button><button data-angle="45">α = 45°</button><button data-angle="90">α = 90°</button></div>';
  const value=id=>+document.getElementById(id).value;
  function fit(canvas){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w:r.width,h:r.height};}
  function text(c,s,x,y,color='#dce8f4',size=11){c.fillStyle=color;c.font=`${size}px system-ui`;c.fillText(s,x,y);}
  function line(c,x1,y1,x2,y2,color='#b9cadd',width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
  function arrow(c,x,y,dx,dy,color='#e8b75c'){line(c,x,y,x+dx,y+dy,color,1.5);const a=Math.atan2(dy,dx);for(const sign of [-1,1])line(c,x+dx,y+dy,x+dx-6*Math.cos(a+sign*.45),y+dy-6*Math.sin(a+sign*.45),color,1.5);}
  function color(t){t=Math.max(-1,Math.min(1,t));const a=[24,39,59],b=t<0?[71,163,220]:[250,176,75],q=Math.sqrt(Math.abs(t));return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*q)).join(',')})`;}
  function sequential(t){const stops=[[12,21,36],[28,76,130],[54,189,197],[255,190,73]],u=Math.max(0,Math.min(1,t))*3,i=Math.min(2,Math.floor(u)),f=u-i;return `rgb(${stops[i].map((a,k)=>Math.round(a+(stops[i+1][k]-a)*f)).join(',')})`;}
  function dot(c,x,y){c.fillStyle='#ff6f91';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();}
  function heat(c,box,extent,field,cap,signed){const S=Math.min(box.w/(2*extent),box.h/(2*extent*.7)),cx=box.x+box.w/2,cy=box.y+box.h/2;for(let j=0;j<box.h;j+=3)for(let i=0;i<box.w;i+=3){const x=(box.x+i-cx)/S,y=(cy-box.y-j)/S;let v=field(x,y);if(!Number.isFinite(v))continue;c.fillStyle=signed?color(v/cap):sequential(v/cap);c.fillRect(Math.floor(box.x+i),Math.floor(box.y+j),3,3);}return {X:x=>cx+x*S,Y:y=>cy-y*S,S};}
  function legend(c,w,h,cap,signed,unit){const x=18,y=h-24,l=Math.min(150,w*.42);for(let i=0;i<l;i++){c.fillStyle=signed?color(2*i/l-1):sequential(i/l);c.fillRect(x+i,y,l?1:0,7);}text(c,signed?'−'+cap:'0',x,y-5,'#94a3b8',10);text(c,'≥'+cap+' '+unit,x+l+5,y+7,'#94a3b8',10);}
  function graph(curves,probe,xmin,xmax,ymin,ymax,ylabel){const {ctx:c,w,h}=fit(plot);c.fillStyle='#0c1524';c.fillRect(0,0,w,h);const p={l:47,r:18,t:27,b:39},X=x=>p.l+(Math.log10(x)-xmin)/(xmax-xmin)*(w-p.l-p.r),Y=y=>h-p.b-(Math.log10(Math.max(y,10**ymin))-ymin)/(ymax-ymin)*(h-p.t-p.b);
    c.font='10px system-ui';for(let e=Math.ceil(xmin);e<=xmax;e++){const x=X(10**e);line(c,x,p.t,x,h-p.b,'#283a50');text(c,'10^'+e,x-13,h-p.b+16,'#98abc0',10);}for(let e=Math.ceil(ymin);e<=ymax;e++){const y=Y(10**e);line(c,p.l,y,w-p.r,y,'#283a50');text(c,'10^'+e,5,y+3,'#98abc0',10);}text(c,ylabel,8,14,'#b9cadd');text(c,kind==='tip'?'r (m)':'r/a',w/2,h-5,'#b9cadd');
    curves.forEach(q=>{c.strokeStyle=q.color;c.lineWidth=2;c.setLineDash(q.dash?[5,4]:[]);c.beginPath();for(let i=0;i<=160;i++){const x=10**(xmin+(xmax-xmin)*i/160),y=q.f(x);if(i===0)c.moveTo(X(x),Y(y));else c.lineTo(X(x),Y(y));}c.stroke();c.setLineDash([]);dot(c,X(probe),Y(q.f(probe)));});
    line(c,X(probe),p.t,X(probe),h-p.b,'#ff6f91');
  }
  function draw(){const {ctx:c,w,h}=fit(main);c.fillStyle='#0c1524';c.fillRect(0,0,w,h);const probe=10**value('probe');
    if(kind==='tip'){
      document.getElementById('mix').disabled=mode!=='Mixed';const psi=mode==='I'?0:mode==='II'?Math.PI/2:value('mix')*Math.PI/180,K=value('intensity'),ki=mode==='III'?0:K*Math.cos(psi),kii=mode==='III'?0:K*Math.sin(psi),kiii=mode==='III'?K:0;
      const component=mode==='II'?'xy':mode==='III'?'yz':'yy';
      const m=heat(c,{x:0,y:34,w,h:h-80},.025,(x,y)=>Math.hypot(x,y)<.00008?NaN:williams(Math.hypot(x,y),Math.atan2(y,x),ki,kii,kiii)[component],20,true);
      line(c,m.X(-.03),m.Y(0),m.X(0),m.Y(0),'#f6f3e9',3);dot(c,m.X(0),m.Y(0));
      arrow(c,m.X(0),m.Y(0),55,0,'#94a3b8');text(c,'x · ahead',m.X(0)+18,m.Y(0)+18,'#b9cadd',10);text(c,'traction-free faces',10,m.Y(0)-12);
      dot(c,m.X(probe),m.Y(0));line(c,m.X(probe),m.Y(0),w-15,55,'#ff6f91');text(c,'probe',w-60,48,'#ff8aa7');
      if(mode==='III'){text(c,'⊙ upper face   ⊗ lower face',12,20);text(c,'z motion: out of / into screen',12,h-38,'#b9cadd',10);}
      else {const dx=mode==='I'?0:22*Math.sin(psi),dy=mode==='II'?0:22*Math.cos(psi);arrow(c,m.X(-.014),m.Y(.004),dx,-dy);arrow(c,m.X(-.014),m.Y(-.004),-dx,dy);text(c,'Face-motion arrows are schematic',10,20);}
      legend(c,w,h,20,true,'MPa');
      const amplitude=mode==='II'?Math.abs(kii):mode==='III'?Math.abs(kiii):Math.abs(ki);
      graph([{f:r=>Math.max(1e-5,amplitude/Math.sqrt(2*Math.PI*r)),color:'#67d4e6'}],probe,-5,-2,-2,3,'|'+(component==='yy'?'σyy':component==='xy'?'τxy':'τyz')+'| (MPa)');
      out.innerHTML=`KⅠ = ${ki.toFixed(2)}, KⅡ = ${kii.toFixed(2)}, KⅢ = ${kiii.toFixed(2)} MPa√m · r = ${(probe*1000).toFixed(3)} mm · |stress| = ${(amplitude/Math.sqrt(2*Math.PI*probe)).toFixed(2)} MPa<br>Move 100× closer: this leading stress becomes 10× larger. Slope = −½. ${amplitude<1e-8?'This component vanishes ahead of the tip; other components may remain singular.':''}`;
      document.getElementById('key').textContent='Blue: negative · amber: positive · fixed colour range ±20 MPa. Colours saturate; stress does not. This is a local field, not a finite-plate solution.';
    }
    if(kind==='center'){
      const a=value('half'),sigma=value('remote'),K=sigma*Math.sqrt(Math.PI*a/1000),exact=r=>(1+r)/Math.sqrt(r*(2+r)),near=r=>1/Math.sqrt(2*r);
      const m=heat(c,{x:0,y:35,w,h:h-80},2.8,(x,y)=>center(x,y).yy,6,false);
      c.fillStyle='#0c1524';c.beginPath();for(let i=0;i<=60;i++){const x=-1+2*i/60,y=.07*Math.sqrt(Math.max(0,1-x*x));if(i===0)c.moveTo(m.X(x),m.Y(y));else c.lineTo(m.X(x),m.Y(y));}for(let i=60;i>=0;i--){const x=-1+2*i/60;c.lineTo(m.X(x),m.Y(-.07*Math.sqrt(Math.max(0,1-x*x))));}c.closePath();c.fill();c.strokeStyle='#e5edf5';c.lineWidth=1;c.stroke();
      for(const x of [-1.8,-.9,0,.9,1.8]){arrow(c,m.X(x),44,0,-19);arrow(c,m.X(x),h-49,0,19);}text(c,'Remote tension σ∞ · boundary at infinity',12,17);text(c,'−a',m.X(-1)-15,m.Y(0)+20);text(c,'+a',m.X(1)-6,m.Y(0)+20);text(c,'traction-free',m.X(-.65),m.Y(0)-13);
      if(probe<1.7){dot(c,m.X(1+probe),m.Y(0));line(c,m.X(1),m.Y(0)+32,m.X(1+probe),m.Y(0)+32,'#ff6f91');}text(c,'r measured from +a',12,h-38,'#ff8aa7',10);legend(c,w,h,6,false,'σ∞');
      graph([{f:exact,color:'#67d4e6'},{f:near,color:'#fbbf24',dash:true}],probe,-4,1,-1,2,'σyy / σ∞');
      out.innerHTML=`a = ${a} mm · σ∞ = ${sigma} MPa · KⅠ = ${K.toFixed(2)} MPa√m<br>r/a = ${probe.toPrecision(3)} · σyy = ${(sigma*exact(probe)).toFixed(1)} MPa · asymptote error = ${(100*Math.abs(near(probe)/exact(probe)-1)).toFixed(2)}%`;
      document.getElementById('key').textContent='Cyan: exact infinite-plate solution · dashed amber: KⅠ/√(2πr). Both diverge at r = 0; only the exact solution tends to σ∞ far away. Slit width is schematic.';
    }
    if(kind==='anti'){
      const angle=value('angle'),alpha=angle*Math.PI/180,A=Math.cos(alpha),B=Math.sin(alpha),gap=12,pw=(w-gap)/2;
      [false,true].forEach((rigid,i)=>{const bx=i*(pw+gap);text(c,rigid?'ANTICRACK · w = 0':'CRACK · τyz = 0',bx+8,17,rigid?'#fbbf24':'#67d4e6',11);const m=heat(c,{x:bx,y:29,w:pw,h:h-86},2.1,(x,y)=>{const f=anti(x,y,alpha,rigid);return Math.hypot(f.tx,f.ty);},6,false);line(c,m.X(-1),m.Y(0),m.X(1),m.Y(0),rigid?'#fbbf24':'#fff',rigid?5:2);for(const x of [-1,1])dot(c,m.X(x),m.Y(0));text(c,rigid?'bonded rigid line':'two free faces',bx+8,h-44,'#b9cadd',10);});
      legend(c,w,h,6,false,'τ∞');
      const q=r=>(1+r)/Math.sqrt(r*(2+r));graph([{f:r=>Math.hypot(A,B*q(r)),color:'#67d4e6'},{f:r=>Math.hypot(A*q(r),B),color:'#fbbf24'}],probe,-4,0,0,2,'|τ| / τ∞');
      out.innerHTML=`α = ${angle}° · (τxz∞, τyz∞) / τ∞ = (${A.toFixed(2)}, ${B.toFixed(2)})<br>Singular amplitudes / (τ∞√πa): crack = ${B.toFixed(3)} · anticrack = ${A.toFixed(3)}. ${angle===0?'The crack is invisible to this loading.':angle===90?'The rigid inclusion is neutral to this loading.':'Both defects have singular tips.'}`;
      document.getElementById('key').textContent='Cyan curve: crack · amber curve: rigid inclusion. Antiplane displacement w is along z; α specifies the remote shear vector (τxz, τyz), not the in-plane tensile-loading angle in the 2021 paper.';
    }
  }
  ui.addEventListener('input',draw);ui.addEventListener('click',e=>{if(e.target.dataset.mode){mode=e.target.dataset.mode;ui.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));draw();}if(e.target.dataset.angle){document.getElementById('angle').value=e.target.dataset.angle;draw();}});
  ui.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
  new ResizeObserver(draw).observe(document.querySelector('.plots'));draw();
})(typeof globalThis!=='undefined'?globalThis:this);
