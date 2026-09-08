// Geometry regressions without a GPU: execute the production surface builder.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=join(__dirname,'..');
const source=readFileSync(join(root,'contact-beam.js'),'utf8');
const dataContext={window:{}};
vm.runInNewContext(readFileSync(join(root,'contact-beam-data.js'),'utf8'),dataContext);
const data=dataContext.window.EMBEDDED_FEA;
class Attribute {
  constructor(array,size){this.array=array;this.itemSize=size;}
  setUsage(){return this;}
}
class Geometry {
  constructor(){this.attributes={};}
  setIndex(index){this.index=index;}
  setAttribute(name,attr){this.attributes[name]=attr;}
  computeBoundingSphere(){}
  clone(){const g=new Geometry();g.index=this.index;for(const [k,a] of Object.entries(this.attributes))g.setAttribute(k,new Attribute(a.array.slice(),a.itemSize));return g;}
}
class Mesh {constructor(geometry,material){this.geometry=geometry;this.material=material;}}
const context={meshData:data,THREE:{BufferGeometry:Geometry,BufferAttribute:Attribute,Mesh,LineSegments:Mesh,LineBasicMaterial:class{}},MATS:{steel:{}},root:{add(){}},ghostMaterial:{}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('        const HEX_FACES'),source.indexOf('        const container')),context);
vm.runInContext(source.slice(source.indexOf('        function makeSurface'),source.indexOf('        function rebuild(){')),context);
const surfaces=['slave','master'].map(part=>context.makeSurface(part));
assert.equal(surfaces.reduce((sum,p)=>sum+p.geo.index.length/3,0),1564);
for(const p of surfaces){
  const buffer=p.geo.attributes.position.array;
  for(const scale of [0,.3,1,1.5]){
    context.updatePositions(p.geo,p.ids,scale);
    assert.equal(p.geo.attributes.position.array,buffer,'deformation must reuse the GPU buffer');
    for(let i=0;i<p.ids.length;i++)for(let k=0;k<3;k++){
      const id=p.ids[i], expected=data.nodes[id][k]+scale*data.disp[id][k];
      assert.ok(Math.abs(buffer[i*3+k]-expected)<1e-5,'surface must preserve solver displacements');
    }
  }
  const edgeCounts=new Map();
  for(let i=0;i<p.geo.index.length;i+=3){
    const ids=p.geo.index.slice(i,i+3).map(index=>p.ids[index]);
    for(let k=0;k<3;k++){
      const key=[ids[k],ids[(k+1)%3]].sort((a,b)=>a-b).join(':');
      edgeCounts.set(key,(edgeCounts.get(key)||0)+1);
    }
  }
  assert.ok([...edgeCounts.values()].every(n=>n===2),'surface must be closed with no missing or interior faces');
}
// The existing load-path interpolation remains authoritative for all frames.
vm.runInContext(source.slice(source.indexOf('        function samplePath'),source.indexOf('        const chartCanvas')),context);
for(const row of data.loadPath){
  const sample=context.samplePath(row.lambda);
  assert.ok(Math.abs(sample.tipU2-row.tipU2)<1e-7);
  assert.ok(Math.abs(sample.F_kN-row.F_kN)<1e-7);
}
assert.equal(context.samplePath(0).F_kN,0);
assert.equal(context.samplePath(0).tipU2,0);
console.log('PASS: closed exterior topology, 1564 triangles, buffer reuse, solver displacement and load-path preservation');
