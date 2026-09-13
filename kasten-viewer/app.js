import {responsePanel} from './response.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const ROOT=new URL('./',import.meta.url),asset=p=>new URL(p,ROOT).href;
const $=id=>document.getElementById(id),d=window.BIEGUNG;
try{
const response=await fetch(asset('frames.json.gz'));if(!response.ok)throw Error('Could not load Kasten animation frames');
window.BIEGUNG_FRAMES=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
const stats=document.querySelectorAll('.stats strong');stats[0].textContent=d.sourceNodes.toLocaleString();stats[1].textContent=d.cells.toLocaleString();
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;$('canvas').appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,2000);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotateSpeed=.7;
scene.add(new THREE.HemisphereLight(0xe4f4ff,0x647689,2.5));const key=new THREE.DirectionalLight(0xffedd8,3);key.position.set(10,-20,30);scene.add(key);const rim=new THREE.DirectionalLight(0x8ecaff,2);rim.position.set(-20,10,5);scene.add(rim);
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(d.points,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(d.points.length).fill(1),3));geo.setIndex(d.triangles);geo.computeVertexNormals();
const material=new THREE.MeshStandardMaterial({color:0xc9dbe2,roughness:.38,metalness:.16,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geo,material);scene.add(mesh);
function edgeGeometry(points){const a=[];for(const i of d.edges)a.push(...points.slice(3*i,3*i+3));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));return g;}
const edges=new THREE.LineSegments(edgeGeometry(d.points),new THREE.LineBasicMaterial({color:0x223e51,transparent:true,opacity:.4}));scene.add(edges);const ghost=new THREE.LineSegments(edgeGeometry(d.reference),new THREE.LineBasicMaterial({color:0xeabe78,transparent:true,opacity:.3,depthWrite:false}));ghost.visible=false;scene.add(ghost);
geo.computeBoundingBox();const box=geo.boundingBox,center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()/2;controls.target.copy(center);controls.minDistance=radius*.1;controls.maxDistance=radius*20;
function view(direction){controls.target.copy(center);const distance=radius/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*1.15;camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(distance));controls.update();}
function resize(){const r=$('canvas').getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe($('canvas'));view([.8,-1.8,.65]);
const stops=[new THREE.Color('#2065a8'),new THREE.Color('#28b5b1'),new THREE.Color('#f3d078'),new THREE.Color('#d84838')];
function color(){const field=$('field').value;material.vertexColors=field!=='solid';material.color.set(field==='solid'?0xc9dbe2:0xffffff);material.needsUpdate=true;$('legend').hidden=field==='solid';if(field==='solid')return;const values=d[field],min=Math.min(...values),max=Math.max(...values),a=geo.attributes.color;const c=new THREE.Color();for(let i=0;i<values.length;i++){const v=(max===min?0:(values[i]-min)/(max-min))*3,j=Math.min(2,Math.floor(v));c.copy(stops[j]).lerp(stops[j+1],v-j);a.setXYZ(i,c.r,c.g,c.b);}a.needsUpdate=true;$('min').textContent=min.toPrecision(4);$('max').textContent=max.toPrecision(4);}
function deform(){const s=+$('scale').value,p=geo.attributes.position.array;for(let i=0;i<p.length;i++)p[i]=d.reference[i]+s*d.displacement[i];geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();const a=edges.geometry.attributes.position;for(let j=0;j<d.edges.length;j++){const i=d.edges[j];a.setXYZ(j,p[3*i],p[3*i+1],p[3*i+2]);}a.needsUpdate=true;edges.geometry.computeBoundingSphere();$('scaleValue').textContent='×'+s;$('scaleLabel').textContent=s===1?'True scale ×1':s===0?'Reference configuration':`Displacement amplified ×${s}`;}
$('scale').oninput=deform;$('true').onclick=()=>{$('scale').value=1;deform();};$('field').onchange=color;$('mesh').onchange=e=>edges.visible=e.target.checked;$('ghost').onchange=e=>ghost.visible=e.target.checked;
$('reset').onclick=$('iso').onclick=()=>view([.8,-1.8,.65]);$('front').onclick=()=>view([0,-1,0]);$('top').onclick=()=>view([0,0,1]);$('spin').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('spin').setAttribute('aria-pressed',String(controls.autoRotate));};
$('info').textContent=`${d.triangles.length/3} surface triangles · Local data · Final saved state`;
const frames=window.BIEGUNG_FRAMES,first=frames[0].time,lastTime=frames.at(-1).time;
let playing=false,simTime=lastTime,loop=true;
const bar=document.createElement('div');bar.className='playback';bar.innerHTML=`<button id="playAnimation" aria-label="Play animation">▶ Play</button><div class="track"><div class="row"><span>SIMULATION HISTORY</span><output id="frameLabel"></output></div><input id="timeline" aria-label="Simulation time" type="range" min="${first}" max="${lastTime}" step="any" value="${lastTime}"></div><select id="speed" aria-label="Playback speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select><button id="loopAnimation" aria-pressed="true">↻ Loop</button>`;document.querySelector('footer').before(bar);
document.querySelector('.note').textContent=`Quadratic shell export · Playback uses all ${frames.length} saved increments. Geometry and fields are smoothly interpolated between solved states. Deformation scale multiplies the current displacement.`;
document.querySelector('.eyebrow').textContent='01 / SIMULATION';
function setPlaying(v){playing=v;$('playAnimation').textContent=v?'Ⅱ Pause':'▶ Play';$('playAnimation').setAttribute('aria-label',v?'Pause animation':'Play animation');}
function showTime(t){simTime=t;updateResponse(t);let b=frames.findIndex(f=>f.time>=t);if(b<0)b=frames.length-1;const a=Math.max(0,b-1),A=frames[a],B=frames[b],mix=a===b?0:(t-A.time)/(B.time-A.time);for(const [key,target] of [['u','displacement'],['stress','stress'],['plastic','plastic']])if(A[key]&&d[target])for(let i=0;i<A[key].length;i++)d[target][i]=A[key][i]+mix*(B[key][i]-A[key][i]);for(let i=0;i<d.nodes;i++)d.magnitude[i]=Math.hypot(...d.displacement.slice(3*i,3*i+3));deform();color();$('timeline').value=t;$('frameLabel').textContent=`t = ${t.toFixed(3)} · ${b+1} / ${frames.length}`;$('info').textContent=`4,864 surface triangles · ${frames.length} solved increments`;} 
$('playAnimation').onclick=()=>{if(simTime>=lastTime)showTime(first);setPlaying(!playing);};$('timeline').oninput=e=>{setPlaying(false);showTime(+e.target.value);};$('loopAnimation').onclick=()=>{loop=!loop;$('loopAnimation').setAttribute('aria-pressed',String(loop));};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();$('playAnimation').click();}});
window.biegungViewer={state:()=>({scale:+$('scale').value,field:$('field').value,triangles:d.triangles.length/3,ghost:ghost.visible,time:simTime,playing,frames:frames.length}),positions:()=>Array.from(geo.attributes.position.array)};
const updateResponse=await responsePanel(); showTime(lastTime);let previous=performance.now();
function render(now=performance.now()){requestAnimationFrame(render);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden)return;if(playing){let next=simTime+dt*(lastTime-first)/18*+$('speed').value;if(next>=lastTime){next=loop?first:lastTime;if(!loop)setPlaying(false);}showTime(next);}controls.update();renderer.render(scene,camera);}render();
}catch(e){$('error').hidden=false;$('error').textContent='Unable to initialize the viewer: '+e.message;console.error(e);}



