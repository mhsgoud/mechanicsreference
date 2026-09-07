const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const repo=path.resolve(__dirname,'..');
const {center,anti,williams}=require(path.join(repo,'fracture-fields.js'));
let checks=0;
function near(a,b,tol=1e-7){assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);checks++;}
for(const r of [.00001,.001,.01]){
 const f=williams(r,0,2,3,4),k=1/Math.sqrt(2*Math.PI*r);
 near(f.yy,2*k);near(f.xy,3*k);near(f.yz,4*k);
 near(williams(r/100,.7,2,3).yy,10*williams(r,.7,2,3).yy);
 for(const theta of [-Math.PI,Math.PI]){const b=williams(r,theta,2,3);near(b.yy,0);near(b.xy,0);}
}
for(const r of [.0001,.01,1,10])near(center(1+r,0).yy,(1+r)/Math.sqrt(r*(2+r)));
near(center(1e4,0).yy,1,1e-7);
for(const x of [-.7,-.2,.2,.7])for(const y of [-1e-6,1e-6]){
 const f=center(x,y);near(f.yy,0,1e-5);near(f.xy,0,1e-5);
 near(anti(x,y,.7,false).ty,0,1e-5);near(anti(x,y,.7,true).w,0,1e-5);
}
for(const [x,y] of [[1.4,.3],[-1.5,.5],[-.4,-.6],[.4,-.3]])for(const rigid of [false,true]){
 const h=1e-5,f=anti(x,y,.7,rigid);
 near(f.tx,(anti(x+h,y,.7,rigid).w-anti(x-h,y,.7,rigid).w)/(2*h));
 near(f.ty,(anti(x,y+h,.7,rigid).w-anti(x,y-h,.7,rigid).w)/(2*h));
 const n=anti(x,y,rigid?Math.PI/2:0,rigid);near(n.tx,rigid?0:1);near(n.ty,rigid?1:0);
}
for(const file of ['hub.html','lefm.html','lefm-center-crack.html','anticrack.html']){
 const html=fs.readFileSync(path.join(repo,file),'utf8');
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/src=|ld\+json/.test(m[1]))new vm.Script(m[2],{filename:file});
}
console.log(`${checks} analytical checks passed; all edited HTML scripts parse.`);
