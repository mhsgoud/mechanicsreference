// SI units. Euler–Bernoulli cantilever with a downward point load at x=L.
// This samples an analytical beam field onto a surface mesh; it is not an FE solve.
const L = 1, h = .1, b = .08, E = 200e9, I = b*h**3/12;
const maxLoad = 10000, exaggeration = 50, worldScale = 4;
const slider = document.querySelector('#load');
let redraw = () => {};
function values() {
  const P = maxLoad * Number(slider.value)/100;
  const tip = P*L**3/(3*E*I);
  document.querySelector('#load-value').textContent = `${(P/1000).toFixed(1)} kN`;
  document.querySelector('#stress-value').innerHTML = `${(P*L*h/(2*I)/1e6).toFixed(1)} <small>MPa</small>`;
  document.querySelector('#deflection-value').innerHTML = `${(tip*1000).toFixed(3)} <small>mm</small>`;
  slider.setAttribute('aria-valuetext', `${(P/1000).toFixed(1)} kilonewtons`);
  return {P, tip};
}
slider.addEventListener('input', () => { values(); redraw(); });
values();
try {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  const canvas = document.querySelector('#scene'), viewport = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36,1,.1,40);
  camera.position.set(1.6,1.45,5.6); camera.lookAt(0,-.05,0);
  const model = new THREE.Group(); scene.add(model);
  const geometry = new THREE.BoxGeometry(L*worldScale,h*worldScale,b*worldScale,44,8,4);
  const reference = geometry.attributes.position.array.slice();
  geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(reference.length),3));
  const mesh = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1}));
  model.add(mesh);
  // A coarse visible surface triangulation conveys spatial sampling of the field.
  const wire = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x03172d,wireframe:true,transparent:true,opacity:.24}));
  model.add(wire);
  const support = new THREE.Mesh(new THREE.BoxGeometry(.12,.87,.83),new THREE.MeshBasicMaterial({color:0x34485e}));
  support.position.x = -2.065; model.add(support);
  const supportEdge = new THREE.LineSegments(new THREE.EdgesGeometry(support.geometry),new THREE.LineBasicMaterial({color:0x8eaec3}));
  supportEdge.position.copy(support.position); model.add(supportEdge);
  for(let i=0;i<6;i++) {
    const yy = -.38+i*.13;
    const hatch = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.13,yy,.42),new THREE.Vector3(-2.0,yy+.1,.42)]),new THREE.LineBasicMaterial({color:0x94b4cd,transparent:true,opacity:.5}));
    model.add(hatch);
  }
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(2,1,0),.7,0xe8f6ff,.15,.09); model.add(arrow);
  const baseline = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2,0,.19),new THREE.Vector3(2,0,.19)]),new THREE.LineDashedMaterial({color:0xbed3e5,dashSize:.055,gapSize:.045,transparent:true,opacity:.4}));
  baseline.computeLineDistances(); model.add(baseline);
  const floor = new THREE.GridHelper(6,18,0x173653,0x10283f); floor.position.y=-.95; model.add(floor);
  const stops = ['#2454dc','#18bed3','#8ede95','#f4d15c','#ef6047'].map(c=>new THREE.Color(c));
  const color = new THREE.Color();
  function render() { renderer.render(scene,camera); }
  redraw = () => {
    const {P,tip} = values();
    const positions=geometry.attributes.position, colors=geometry.attributes.color;
    for(let i=0;i<positions.count;i++) {
      const x = (reference[i*3]+2)/worldScale, y = reference[i*3+1]/worldScale;
      const v = -P*x*x*(3*L-x)/(6*E*I);
      const slope = -P*x*(2*L-x)/(2*E*I);
      positions.setXYZ(i,(x-y*slope*exaggeration)*worldScale-2,(y+v*exaggeration)*worldScale,reference[i*3+2]);
      // |sigma_xx| = |M(x)y/I|; reference scale stays fixed at 75 MPa.
      const t = Math.min(1,Math.abs(P*(L-x)*y/I)/75e6);
      const j = Math.min(3,Math.floor(t*4)); color.copy(stops[j]).lerp(stops[j+1],t*4-j);
      colors.setXYZ(i,color.r,color.g,color.b);
    }
    positions.needsUpdate=true; colors.needsUpdate=true;
    geometry.computeBoundingSphere();
    const arrowLength = .35+.45*P/maxLoad;
    arrow.position.set(2,.22-tip*exaggeration*worldScale+arrowLength,0);
    arrow.setLength(arrowLength,.13,.09); arrow.visible=P>0;
    render();
  };
  function resize() { const {width,height}=viewport.getBoundingClientRect(); renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix(); render(); }
  new ResizeObserver(resize).observe(viewport);
  let dragging=false, lastX=0,lastY=0;
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;model.rotation.y=Math.max(-.7,Math.min(.7,model.rotation.y+(e.clientX-lastX)*.006));model.rotation.x=Math.max(-.35,Math.min(.35,model.rotation.x+(e.clientY-lastY)*.004));lastX=e.clientX;lastY=e.clientY;render();});
  ['pointerup','pointercancel','lostpointercapture'].forEach(event=>canvas.addEventListener(event,()=>{dragging=false;}));
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();model.rotation.y=Math.max(-.7,Math.min(.7,model.rotation.y+(e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0)));model.rotation.x=Math.max(-.35,Math.min(.35,model.rotation.x+(e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0)));render();});
  document.querySelector('#reset-view').addEventListener('click',()=>{model.rotation.set(0,0,0);render();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#fallback').hidden=false;});
  canvas.addEventListener('webglcontextrestored',()=>{document.querySelector('#fallback').hidden=true;redraw();});
  resize();redraw();
} catch(error) {
  document.querySelector('#fallback').hidden=false;
  document.querySelector('#reset-view').disabled=true;
  console.error('Beam view could not initialize:',error);
}
