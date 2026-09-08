
        window.addEventListener('DOMContentLoaded', () => {
        if (!window.THREE || !THREE.OrbitControls) { document.getElementById('statusBadge').textContent = '3D unavailable · reload to retry'; return; }
        // MATLAB jet-like colormap (same stops as ContactFEA PlotStructuralContours)
        const JET = [
            [0, 0, 255], [0, 70, 255], [0, 141, 255], [0, 212, 255],
            [0, 255, 141], [141, 255, 0], [255, 212, 0], [255, 141, 0],
            [255, 70, 0], [255, 0, 0]
        ].map(c => c.map(v => v / 255));

        function jetColor(t) {
            t = Math.min(1, Math.max(0, t));
            const x = t * (JET.length - 1);
            const i = Math.floor(x);
            const f = x - i;
            const a = JET[i], b = JET[Math.min(i + 1, JET.length - 1)];
            return [
                a[0] + (b[0] - a[0]) * f,
                a[1] + (b[1] - a[1]) * f,
                a[2] + (b[2] - a[2]) * f
            ];
        }

        // Hex faces (1-based MATLAB order → 0-based): same as PlotStructuralContours fm
        const HEX_FACES = [
            [0, 1, 5, 4],
            [1, 2, 6, 5],
            [2, 3, 7, 6],
            [3, 0, 4, 7],
            [0, 1, 2, 3],
            [4, 5, 6, 7]
        ];
        const container = document.getElementById('threejs-container');
        const fieldSelectEl = document.getElementById('fieldSelect');
        fieldSelectEl.addEventListener('change', () => {
          document.getElementById('cbarTitle').textContent = fieldSelectEl.options[fieldSelectEl.selectedIndex].text.replace(/\s*\(.*/, '') + ' · λ = 1';
        });
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf3f4f6);

        const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.5, 2000);
        camera.position.set(58, 39, 104);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .9;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = false;
        if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
        if ('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
        container.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.09;
        controls.minDistance = 45;
        controls.maxDistance = 240;
        controls.maxPolarAngle = Math.PI * 0.86;
        controls.target.set(-23, -1, 13);

        // Contour lighting
        const ambientContour = new THREE.AmbientLight(0xffffff, 0.75);
        const keyContour = new THREE.DirectionalLight(0xffffff, 0.55);
        keyContour.position.set(30, 80, 40);
        scene.add(ambientContour);
        scene.add(keyContour);

        // Material lighting — same simple IBL-like trio Three.js demos use (hemi + key + soft fill)
        const ambientMat = new THREE.AmbientLight(0xffffff, 0.15);
        const hemiMat = new THREE.HemisphereLight(0xffffff, 0xb1b1b1, 0.65);
        const keyMat = new THREE.DirectionalLight(0xfff4e5, 1.8);
        keyMat.position.set(-10, 90, 55);
        keyMat.castShadow = true;
        keyMat.shadow.mapSize.set(1024, 1024);
        Object.assign(keyMat.shadow.camera, {left:-95,right:95,top:80,bottom:-80,near:1,far:240});
        keyMat.shadow.normalBias = 0.35;
        keyMat.shadow.bias = -0.0006;
        keyMat.shadow.radius = 3;
        const fillMat = new THREE.DirectionalLight(0xffffff, 0.35);
        fillMat.position.set(-40, 20, -30);
        const matLights = [ambientMat, hemiMat, keyMat, fillMat];
        matLights.forEach((l) => { l.visible = false; scene.add(l); });

        /**
         * World-space triplanar albedo (Three.js node materials expose this as triplanarTexture).
         * Needed for FEA meshes with no authored UVs — avoids stretched side faces.
         */
        function makeTriplanarStandard(map, color, roughness) {
            const mat = new THREE.MeshStandardMaterial({
                color,
                map,
                metalness: 0,
                roughness,
                side: THREE.DoubleSide,
                flatShading: false
            });
            const scale = 0.085;
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.triScale = { value: scale };
                shader.vertexShader = shader.vertexShader
                    .replace(
                        '#include <common>',
                        `#include <common>
                        varying vec3 vTriPos;
                        varying vec3 vTriNor;`
                    )
                    .replace(
                        '#include <begin_vertex>',
                        `#include <begin_vertex>
                        vTriPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
                        vTriNor = normalize(mat3(modelMatrix) * objectNormal);`
                    );
                shader.fragmentShader = shader.fragmentShader
                    .replace(
                        '#include <common>',
                        `#include <common>
                        uniform float triScale;
                        varying vec3 vTriPos;
                        varying vec3 vTriNor;`
                    )
                    .replace(
                        '#include <map_fragment>',
                        `#ifdef USE_MAP
                        {
                            vec3 blend = abs(normalize(vTriNor));
                            blend = pow(blend, vec3(4.0));
                            blend /= dot(blend, vec3(1.0)) + 1e-5;
                            vec3 p = vTriPos * triScale;
                            vec4 cx = texture2D(map, p.yz);
                            vec4 cy = texture2D(map, p.xz);
                            vec4 cz = texture2D(map, p.xy);
                            vec4 texelColor = cx * blend.x + cy * blend.y + cz * blend.z;
                            texelColor = mapTexelToLinear(texelColor);
                            diffuseColor *= texelColor;
                        }
                        #endif`
                    );
            };
            mat.customProgramCacheKey = () => 'triplanar-concrete-v1';
            return mat;
        }

        const MATS = {
            concrete: {
                label: 'Concrete',
                slave: new THREE.MeshStandardMaterial({ color: 0xc8c4bc, metalness: 0, roughness: 0.88, side: THREE.DoubleSide }),
                master: new THREE.MeshStandardMaterial({ color: 0xb8b4ac, metalness: 0, roughness: 0.9, side: THREE.DoubleSide }),
                bg: 0xe8e6e1,
                edge: 0x5c6574
            },
            steel: {
                label: 'Structural steel',
                slave: new THREE.MeshStandardMaterial({
                    color: 0x9ca3af, metalness: 0.75, roughness: 0.4, side: THREE.DoubleSide, flatShading: false
                }),
                master: new THREE.MeshStandardMaterial({
                    color: 0x6b7280, metalness: 0.7, roughness: 0.48, side: THREE.DoubleSide, flatShading: false
                }),
                bg: 0xe5e7eb,
                edge: 0x374151
            },
            aluminum: {
                label: 'Aluminum',
                slave: new THREE.MeshStandardMaterial({
                    color: 0xd1d5db, metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide, flatShading: false
                }),
                master: new THREE.MeshStandardMaterial({
                    color: 0xa8b0b8, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide, flatShading: false
                }),
                bg: 0xe8eef5,
                edge: 0x475569
            }
        };

        // Small deterministic texture: no photograph download or baked-in lighting.
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = grainCanvas.height = 128;
        const grainContext = grainCanvas.getContext('2d');
        const grain = grainContext.createImageData(128, 128);
        let seed = 173;
        for (let i=0; i<grain.data.length; i+=4) {
            seed = (1664525 * seed + 1013904223) >>> 0;
            const v = 207 + (seed >>> 27);
            grain.data[i] = grain.data[i+1] = grain.data[i+2] = v; grain.data[i+3] = 255;
        }
        grainContext.putImageData(grain, 0, 0);
        const grainTexture = new THREE.CanvasTexture(grainCanvas);
        grainTexture.wrapS = grainTexture.wrapT = THREE.RepeatWrapping;
        grainTexture.encoding = THREE.sRGBEncoding;
        MATS.concrete.slave.dispose(); MATS.concrete.master.dispose();
        MATS.concrete.slave = makeTriplanarStandard(grainTexture, 0xc7c1b6, .86);
        MATS.concrete.master = makeTriplanarStandard(grainTexture, 0xb9b3a8, .9);

        // Procedural studio softboxes give metals real environment reflections.
        const studio = new THREE.Scene();
        studio.background = new THREE.Color(0x17191c);
        const cards = [];
        for (const [x,y,z,w,h,intensity] of [[0,85,0,120,65,1.8],[-85,25,35,50,100,1],[65,30,-45,75,90,1.5]]) {
            const card = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(intensity),side:THREE.DoubleSide}));
            card.position.set(x,y,z); card.lookAt(0,0,0); studio.add(card); cards.push(card);
        }
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromScene(studio, .04, .1, 250);
        scene.environment = environment.texture;
        scene.fog = new THREE.Fog(0xe5e7eb, 180, 500);
        pmrem.dispose(); cards.forEach(c => {c.geometry.dispose(); c.material.dispose();});
        MATS.steel.slave.color.setHex(0x9b9d9e); MATS.steel.master.color.setHex(0x74797c);
        MATS.steel.slave.roughness = .22; MATS.steel.master.roughness = .28;
        MATS.steel.slave.metalness = MATS.steel.master.metalness = .92;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000), new THREE.MeshStandardMaterial({color:0xe4e9ed,roughness:.93,metalness:0}));
        floor.rotation.x = -Math.PI/2; floor.position.y = -31; floor.receiveShadow = true; scene.add(floor);

        const root = new THREE.Group();
        scene.add(root);

        // Lab fixture: rigid wall + clamps at fixed end (X = -50)
        const fixture = new THREE.Group();
        scene.add(fixture);

        function addBox(parent, w, h, d, x, y, z, mat) {
            const bevel = Math.min(.32, w/8, h/8, d/8);
            const outline = new THREE.Shape();
            outline.moveTo(-w/2+bevel,-h/2+bevel);outline.lineTo(w/2-bevel,-h/2+bevel);
            outline.lineTo(w/2-bevel,h/2-bevel);outline.lineTo(-w/2+bevel,h/2-bevel);outline.closePath();
            const geometry = new THREE.ExtrudeGeometry(outline,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1,curveSegments:1});
            geometry.translate(0,0,-d/2+bevel);
            const m = new THREE.Mesh(geometry, mat);
            m.position.set(x, y, z);
            m.castShadow = m.receiveShadow = true;
            parent.add(m);
            return m;
        }

        function addBolt(parent, x, y, z, mat) {
            const head = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 6), mat);
            head.rotation.z = Math.PI / 2;
            head.position.set(x, y, z);
            parent.add(head);
        }

        (function buildFixture() {
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x303b43, metalness:.65, roughness:.32 });
            const plateMat = new THREE.MeshStandardMaterial({ color: 0x9daab4, metalness:.8, roughness:.25 });
            const clampMat = new THREE.MeshStandardMaterial({ color: 0x303a42, metalness:.6, roughness:.3 });
            const boltMat = new THREE.MeshStandardMaterial({ color: 0xc4cbd1, metalness:.85, roughness:.22 });
            const baseMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });

            // Thick support wall behind the fixed face
            addBox(fixture, 10, 36, 42, -57.2, 0, 15, wallMat);
            // Face plate the cantilevers mount into
            addBox(fixture, 2.2, 34, 40, -51.1, 0, 15, plateMat);

            // Upper clamp around slave root (Y 5–13.75, Z 5–20)
            addBox(fixture, 6, 2.2, 18, -47, 15.2, 12.5, clampMat);
            addBox(fixture, 6, 2.2, 18, -47, 3.9, 12.5, clampMat);
            addBox(fixture, 6, 14, 2.2, -47, 9.4, 21.2, clampMat);
            addBox(fixture, 6, 14, 2.2, -47, 9.4, 3.8, clampMat);

            // Lower clamp around master root (Y -10–0, Z 0–30)
            addBox(fixture, 6, 2.2, 32, -47, 1.2, 15, clampMat);
            addBox(fixture, 6, 2.2, 32, -47, -11.2, 15, clampMat);
            addBox(fixture, 6, 14, 2.2, -47, -5, 31.2, clampMat);
            addBox(fixture, 6, 14, 2.2, -47, -5, -1.2, clampMat);

            // Bolt heads on clamps
            [[-44, 15.2, 7], [-44, 15.2, 18], [-44, 3.9, 7], [-44, 3.9, 18],
             [-44, 1.2, 5], [-44, 1.2, 15], [-44, 1.2, 25],
             [-44, -11.2, 5], [-44, -11.2, 15], [-44, -11.2, 25]].forEach(p => addBolt(fixture, p[0], p[1], p[2], boltMat));

            // Floor pedestal under the wall
            addBox(fixture, 28, 4, 48, -52, -16, 15, baseMat);
            addBox(fixture, 20, 13, 36, -55, -24.5, 15, wallMat);
        })();

        // Tip loads from ModelInformation_Beam.m: ForceNode = 705:5:735, F_Y = -4e4 each
        // (top edge of slave free tip — not the master)
        const FORCE_NODE_IDS = [705, 710, 715, 720, 725, 730, 735]; // 1-based
        let meshData = null;
        let slaveNodeSet = null;

        // Undeformed clearance callout: facing faces at Y=0 (master) and Y=gap (slave)
        function gapMm() {
            return (meshData && meshData.gap_mm != null) ? meshData.gap_mm : 5;
        }
        let GAP0 = 5;
        const gapDim = new THREE.Group();
        scene.add(gapDim);
        function rebuildGapDimension() {
            while (gapDim.children.length) {
                const c = gapDim.children[0];
                gapDim.remove(c);
                if (c.geometry) c.geometry.dispose();
                if (c.material) {
                    if (c.material.map) c.material.map.dispose();
                    c.material.dispose();
                }
            }
            GAP0 = gapMm();
            const mat = new THREE.LineBasicMaterial({ color: 0xc45c26 });
            const z = 12.5, x = -2;
            gapDim.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, 0, z), new THREE.Vector3(x, GAP0, z)
            ]), mat));
            const tick = 1.2;
            gapDim.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x - tick, 0, z), new THREE.Vector3(x + tick, 0, z)
            ]), mat));
            gapDim.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x - tick, GAP0, z), new THREE.Vector3(x + tick, GAP0, z)
            ]), mat));
            const cv = document.createElement('canvas');
            cv.width = 256; cv.height = 64;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = 'rgba(26,39,64,0.92)';
            ctx.fillRect(0, 0, 256, 64);
            ctx.fillStyle = '#f7f6f2';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('gap = ' + GAP0 + ' mm', 128, 32);
            const tex = new THREE.CanvasTexture(cv);
            const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
            spr.scale.set(10, 2.5, 1);
            spr.position.set(x + 6, GAP0 / 2, z);
            gapDim.add(spr);
        }
        rebuildGapDimension();

        const loadGroup = new THREE.Group();
        scene.add(loadGroup);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const arrowShaftGeo = new THREE.CylinderGeometry(0.35, 0.35, 7, 8);
        const arrowHeadGeo = new THREE.ConeGeometry(1.1, 3, 8);
        const arrowGroup = new THREE.Group();
        loadGroup.add(arrowGroup);
        const platenGroup = new THREE.Group();
        loadGroup.add(platenGroup);

        function makeArrow() {
            const g = new THREE.Group();
            const shaft = new THREE.Mesh(arrowShaftGeo, arrowMat);
            shaft.position.y = 3.5 + 3;
            const head = new THREE.Mesh(arrowHeadGeo, arrowMat);
            head.rotation.x = Math.PI;
            head.position.y = 1.5;
            g.add(shaft);
            g.add(head);
            return g;
        }

        const loadArrows = FORCE_NODE_IDS.map(() => {
            const a = makeArrow();
            arrowGroup.add(a);
            return a;
        });

        (function buildTipLoad() {
            // Textbook-style equivalent: uniform tip traction on the loaded free-end strip.
            // FEA applies 7 nodal forces along Z ∈ [5,20] at the tip top face.
            const steel = new THREE.MeshStandardMaterial({ color: 0x7a828c, metalness: 0.65, roughness: 0.35 });
            const dark = new THREE.MeshStandardMaterial({ color: 0x2f3540, metalness: 0.4, roughness: 0.5 });
            const tractionMat = new THREE.MeshStandardMaterial({
                color: 0xc2410c, metalness: 0.15, roughness: 0.55,
                transparent: true, opacity: 0.55, depthWrite: false
            });
            const markMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, metalness: 0.3, roughness: 0.45 });

            // Bearing plate on tip top (Z 5–20 → length 15, centred at local z=0)
            const plate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 16.2), steel);
            plate.position.set(0, 0.45, 0);
            platenGroup.add(plate);

            // Edge rails so the plate reads as a real fixture piece
            const railGeo = new THREE.BoxGeometry(0.35, 1.4, 16.2);
            [[-2.0, 0.7], [2.0, 0.7]].forEach(([x, y]) => {
                const r = new THREE.Mesh(railGeo, dark);
                r.position.set(x, y, 0);
                platenGroup.add(r);
            });

            // Uniform traction prism (height scales with λ in updateLoads)
            const TRACTION_H = 10;
            const traction = new THREE.Mesh(new THREE.BoxGeometry(3.2, TRACTION_H, 15.2), tractionMat);
            traction.position.set(0, 0.9 + TRACTION_H / 2, 0);
            traction.scale.y = 0.02;
            traction.position.y = 0.9 + (TRACTION_H * 0.02) / 2;
            platenGroup.add(traction);
            platenGroup.userData.traction = traction;
            platenGroup.userData.tractionH = TRACTION_H;

            // Seven load-node stamps along the tip (placed each frame from FORCE_NODE Z)
            const stamps = [];
            for (let k = 0; k < FORCE_NODE_IDS.length; k++) {
                const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 16), markMat);
                disk.position.set(0, 0.95, 0);
                platenGroup.add(disk);
                stamps.push(disk);
            }
            platenGroup.userData.stamps = stamps;

            // End caps of traction block (classic distributed-load outline)
            const capMat = new THREE.MeshBasicMaterial({ color: 0x9a3412, transparent: true, opacity: 0.9 });
            const capL = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 0.15), capMat);
            const capR = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 0.15), capMat);
            platenGroup.add(capL);
            platenGroup.add(capR);
            platenGroup.userData.capL = capL;
            platenGroup.userData.capR = capR;

            // Label
            const cv = document.createElement('canvas');
            cv.width = 420; cv.height = 120;
            const tex = new THREE.CanvasTexture(cv);
            const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
            spr.scale.set(18, 5.2, 1);
            spr.position.set(9, 8, 0);
            spr.userData.canvas = cv;
            spr.userData.tex = tex;
            platenGroup.add(spr);
            platenGroup.userData.forceSprite = spr;
        })();

        function setForceLabel(F_kN, lambda) {
            const spr = platenGroup.userData.forceSprite;
            if (!spr) return;
            const cv = spr.userData.canvas;
            const ctx = cv.getContext('2d');
            ctx.clearRect(0, 0, cv.width, cv.height);
            ctx.fillStyle = 'rgba(26,39,64,0.94)';
            ctx.fillRect(0, 0, cv.width, cv.height);
            ctx.fillStyle = '#f7f6f2';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('Uniform tip traction', 18, 34);
            ctx.font = '22px sans-serif';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('ΣFᵧ = ' + F_kN.toFixed(1) + ' kN', 18, 68);
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText('7 × 40 kN  ·  λ = ' + lambda.toFixed(2), 18, 98);
            spr.userData.tex.needsUpdate = true;
        }

        function tipFinalU2() {
            if (!meshData) return -15.22;
            let s = 0;
            for (const id of FORCE_NODE_IDS) s += meshData.disp[id - 1][1];
            return s / FORCE_NODE_IDS.length;
        }

        function tipContactU2() {
            const path = (meshData && meshData.loadPath) || [];
            const hit = path.find(p => p.nContact > 0);
            return hit ? hit.tipU2 : -GAP0;
        }

        /** Path-consistent morph: pre-contact = slave only; post-contact blends in master. */
        function morphScales(lambda, exaggerate) {
            const sample = samplePath(lambda);
            const tipF = tipFinalU2();
            const tipC = tipContactU2();
            const tipT = sample.tipU2;
            let sSlave = 0, sMaster = 0;
            if (!(tipF < 0)) {
                return { sSlave: 0, sMaster: 0, sample, tipT };
            }
            if (tipT > tipC) {
                // Still above contact: only upper arm moves (true until gap closes)
                sSlave = tipT / tipF;
                sMaster = 0;
            } else {
                const sClose = tipC / tipF;
                const sBoth = (tipT - tipC) / (tipF - tipC);
                sSlave = sClose + sBoth * (1 - sClose);
                sMaster = sBoth;
            }
            return {
                sSlave: sSlave * exaggerate,
                sMaster: sMaster * exaggerate,
                sample,
                tipT
            };
        }

        function ensureSlaveNodes(data) {
            if (slaveNodeSet) return slaveNodeSet;
            slaveNodeSet = new Set();
            const end = data.slaveElems[1];
            for (let e = 0; e < end; e++) {
                for (const nid of data.elems[e]) slaveNodeSet.add(nid);
            }
            return slaveNodeSet;
        }

        function updateLoads(sSlave) {
            if (!meshData) return;
            const style = document.getElementById('loadStyle').value;
            loadGroup.visible = style !== 'off';
            if (style === 'off') return;
            arrowGroup.visible = style === 'arrows';
            platenGroup.visible = style === 'platen';
            const nodes = meshData.nodes;
            const disp = meshData.disp;
            let sx = 0, sy = 0, sz = 0;
            for (let k = 0; k < FORCE_NODE_IDS.length; k++) {
                const i = FORCE_NODE_IDS[k] - 1;
                const n = nodes[i];
                const d = disp[i];
                const x = n[0] + sSlave * d[0];
                const y = n[1] + sSlave * d[1];
                const z = n[2] + sSlave * d[2];
                sx += x; sy += y; sz += z;
                if (style === 'arrows') {
                    loadArrows[k].position.set(x, y, z);
                }
            }
            const m = FORCE_NODE_IDS.length;
            if (style === 'platen') {
                platenGroup.position.set(sx / m, sy / m, sz / m);
                const lambda = parseFloat(document.getElementById('lambdaSlider').value);
                const sample = samplePath(lambda);
                setForceLabel(sample.F_kN, lambda);

                // Place stamps at each load-node Z, relative to tip centroid
                const stamps = platenGroup.userData.stamps || [];
                for (let k = 0; k < FORCE_NODE_IDS.length; k++) {
                    const i = FORCE_NODE_IDS[k] - 1;
                    const n = nodes[i];
                    const d = disp[i];
                    const z = (n[2] + sSlave * d[2]) - sz / m;
                    if (stamps[k]) stamps[k].position.set(0, 0.95, z);
                }

                // Traction block height ∝ λ (textbook distributed-load glyph)
                const H = platenGroup.userData.tractionH || 10;
                const t = Math.max(0.04, lambda);
                const traction = platenGroup.userData.traction;
                if (traction) {
                    traction.scale.y = t;
                    traction.position.y = 0.9 + (H * t) / 2;
                    traction.material.opacity = 0.25 + 0.45 * lambda;
                }
                const topY = 0.9 + H * t;
                if (platenGroup.userData.capL) {
                    platenGroup.userData.capL.position.set(0, topY, -7.6);
                    platenGroup.userData.capR.position.set(0, topY, 7.6);
                }
                if (platenGroup.userData.forceSprite) {
                    platenGroup.userData.forceSprite.position.set(10, Math.max(6, topY * 0.55 + 4), 0);
                }
            }
        }

        let solidMesh = null;
        let edgeLines = null;
        let ghostMesh = null;
        let fieldMin = 0, fieldMax = 1;
        let currentField = 'U2';

        function fieldValue(disp, idx, field) {
            const d = disp[idx];
            if (field === 'U1') return d[0];
            if (field === 'U2') return d[1];
            if (field === 'U3') return d[2];
            return Math.hypot(d[0], d[1], d[2]);
        }

        function isMaterialMode(mode) {
            return mode === 'concrete' || mode === 'steel' || mode === 'aluminum';
        }

        function setLightingMode(mode) {
            const matMode = isMaterialMode(mode);
            floor.visible = matMode;
            scene.environment = matMode ? environment.texture : null;
            renderer.toneMapping = matMode ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
            ambientContour.visible = !matMode;
            keyContour.visible = !matMode;
            matLights.forEach((l) => { l.visible = matMode; });
            scene.background = new THREE.Color(matMode ? MATS[mode].bg : 0xf3f4f6);
            scene.fog.color.copy(scene.background);
            document.getElementById('colorbar').classList.toggle('hidden', matMode);
            document.getElementById('fieldSelect').disabled = matMode;
            document.getElementById('splitToggle').disabled = matMode;
        }

        // Surface topology is built once. Interior hex faces never reach the GPU.
        const parts = [];
        const contourMaterial = new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
        const ghostMaterial = new THREE.MeshBasicMaterial({color:0x678296,wireframe:true,transparent:true,opacity:.1,depthWrite:false});
        let lastShape = '';
        function makeSurface(part) {
            const faces = new Map(), vertices = new Map(), ids = [], indices = [], edgeIds = [], edgeKeys = new Set();
            const start = part === 'slave' ? 0 : meshData.slaveElems[1];
            const end = part === 'slave' ? meshData.slaveElems[1] : meshData.elems.length;
            for(let e=start;e<end;e++) for(let f=0;f<HEX_FACES.length;f++) {
                const face = HEX_FACES[f].map(k=>meshData.elems[e][k]-1);
                const key = [...face].sort((a,b)=>a-b).join(',');
                if(faces.has(key)) faces.delete(key); else faces.set(key,{face,f});
            }
            for(const {face,f} of faces.values()) {
                // Share vertices along each face family for smooth bending, keeping sharp section edges.
                const q = face.map(id=>{
                    const key = id+':'+f;
                    if(!vertices.has(key)){vertices.set(key,ids.length);ids.push(id);}
                    return vertices.get(key);
                });
                // Hex source bottom face has inward winding; correct before averaging normals.
                if(f===4) indices.push(q[0],q[2],q[1],q[0],q[3],q[2]);
                else indices.push(q[0],q[1],q[2],q[0],q[2],q[3]);
                for(let k=0;k<4;k++){
                    const a=face[k], b=face[(k+1)%4], key=Math.min(a,b)+':'+Math.max(a,b);
                    if(!edgeKeys.has(key)){edgeKeys.add(key);edgeIds.push(a,b);}
                }
            }
            const geo = new THREE.BufferGeometry();
            geo.setIndex(indices);
            geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(ids.length*3),3).setUsage(THREE.DynamicDrawUsage));
            geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(ids.length*3),3));
            const edgeGeo = new THREE.BufferGeometry();
            edgeGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(edgeIds.length*3),3).setUsage(THREE.DynamicDrawUsage));
            const mesh = new THREE.Mesh(geo,MATS.steel[part]); mesh.castShadow = mesh.receiveShadow = true;
            const edges = new THREE.LineSegments(edgeGeo,new THREE.LineBasicMaterial({color:0x26485f,transparent:true,opacity:.23,depthWrite:false}));
            const ghostGeo = geo.clone();
            const original = ghostGeo.attributes.position.array;
            ids.forEach((id,i)=>original.set(meshData.nodes[id],i*3));
            ghostGeo.computeBoundingSphere();
            const ghost = new THREE.Mesh(ghostGeo,ghostMaterial);
            root.add(mesh,edges,ghost);
            return {part,ids,edgeIds,geo,edgeGeo,mesh,edges,ghost};
        }
        function updatePositions(geometry,ids,scale){
            const attr=geometry.attributes.position, array=attr.array;
            for(let i=0;i<ids.length;i++){
                const id=ids[i], n=meshData.nodes[id], d=meshData.disp[id];
                for(let k=0;k<3;k++) array[i*3+k]=n[k]+scale*d[k];
            }
            attr.needsUpdate=true;
            geometry.computeBoundingSphere();
        }
        function rebuild(){
            if(!meshData) return;
            if(!parts.length) parts.push(makeSurface('slave'),makeSurface('master'));
            const lambda=+document.getElementById('lambdaSlider').value;
            const exaggerate=+document.getElementById('scaleSlider').value;
            const {sSlave,sMaster,tipT}=morphScales(lambda,exaggerate);
            const mode=document.getElementById('viewMode').value;
            const matMode=isMaterialMode(mode);
            currentField=fieldSelectEl.value;
            setLightingMode(mode);
            document.getElementById('cbarTitle').textContent = fieldSelectEl.options[fieldSelectEl.selectedIndex].text + ' · λ = 1';
            fieldMin=Infinity;fieldMax=-Infinity;
            for(let i=0;i<meshData.nodes.length;i++){
                const value=fieldValue(meshData.disp,i,currentField);
                fieldMin=Math.min(fieldMin,value);fieldMax=Math.max(fieldMax,value);
            }
            if(fieldMax-fieldMin<1e-12){fieldMin-=1;fieldMax+=1;}
            const shape=sSlave+':'+sMaster;
            for(const p of parts){
                if(lastShape!==shape){
                    const scale=p.part==='slave'?sSlave:sMaster;
                    updatePositions(p.geo,p.ids,scale);
                    p.geo.computeVertexNormals();
                    updatePositions(p.edgeGeo,p.edgeIds,scale);
                }
                p.mesh.material=matMode?MATS[mode][p.part]:contourMaterial;
                p.mesh.material.polygonOffset=true;p.mesh.material.polygonOffsetFactor=1;p.mesh.material.polygonOffsetUnits=1;
                if(!matMode){
                    const colors=p.geo.attributes.color;
                    p.ids.forEach((id,i)=>{
                        const c=document.getElementById('splitToggle').checked
                          ? (p.part==='slave'?[.15,.75,.85]:[.95,.65,.15])
                          : jetColor((fieldValue(meshData.disp,id,currentField)-fieldMin)/(fieldMax-fieldMin));
                        colors.setXYZ(i,...c);
                    });
                    colors.needsUpdate=true;
                }
                p.edges.visible=document.getElementById('wireToggle').checked;
                p.ghost.visible=document.getElementById('undefToggle').checked;
            }
            lastShape=shape;
            document.getElementById('scaleValue').textContent=exaggerate.toFixed(2);
            document.getElementById('cbarMax').textContent=fieldMax.toFixed(2);
            document.getElementById('cbarMin').textContent=fieldMin.toFixed(2);
            document.getElementById('cbarMid').textContent=((fieldMin+fieldMax)/2).toFixed(2);
            fixture.visible=document.getElementById('fixtureToggle').checked;
            gapDim.visible=document.getElementById('gapDimToggle').checked&&Math.abs(tipT)<GAP0*.85;
            updateLoads(sSlave);
            syncLambdaUI();
            renderer.shadowMap.needsUpdate=true;
            requestRender();
        }

        function resetCamera() {
            camera.position.set(58, 39, 104);
            controls.target.set(-23, -1, 13);
            controls.update();
        }

        function samplePath(lambda) {
            const path = (meshData && meshData.loadPath) || [];
            if (!path.length) {
                const F = (meshData && meshData.FtotMax_kN || 280) * lambda;
                return { lambda, tipU2: (meshData ? meshData.U2min : 0) * lambda, F_kN: F, pMax: 0, nContact: 0 };
            }
            if (lambda <= 0) return { lambda: 0, tipU2: 0, F_kN: 0, pMax: 0, nContact: 0 };
            if (lambda <= path[0].lambda) {
                const t = lambda / path[0].lambda;
                return {
                    lambda,
                    tipU2: t * path[0].tipU2,
                    F_kN: t * path[0].F_kN,
                    pMax: t * path[0].pMax,
                    nContact: path[0].nContact
                };
            }
            for (let i = 1; i < path.length; i++) {
                if (lambda <= path[i].lambda) {
                    const a = path[i - 1], b = path[i];
                    const t = (lambda - a.lambda) / (b.lambda - a.lambda);
                    return {
                        lambda,
                        tipU2: a.tipU2 + t * (b.tipU2 - a.tipU2),
                        F_kN: a.F_kN + t * (b.F_kN - a.F_kN),
                        pMax: a.pMax + t * (b.pMax - a.pMax),
                        nContact: Math.round(a.nContact + t * (b.nContact - a.nContact))
                    };
                }
            }
            return Object.assign({}, path[path.length - 1], { lambda: 1 });
        }

        const chartCanvas = document.getElementById('ldChart');
        const chartCtx = chartCanvas.getContext('2d');
        function resizeChart() {
            const rect = chartCanvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            if (chartCanvas.width === Math.max(1, Math.floor(rect.width*dpr)) && chartCanvas.height === Math.max(1, Math.floor(rect.height*dpr))) return;
            chartCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
            chartCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
            chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function drawChart(sample) {
            resizeChart();
            const w = chartCanvas.clientWidth;
            const h = chartCanvas.clientHeight;
            const pad = { l: 48, r: 16, t: 14, b: 32 };
            const plotW = w - pad.l - pad.r;
            const plotH = h - pad.t - pad.b;
            const pathPts = (meshData && meshData.loadPath) || [];
            const dMax = Math.max(1, ...pathPts.map(p => -p.tipU2), sample ? -sample.tipU2 : 0);
            const FMax = Math.max(1, (meshData && meshData.FtotMax_kN) || 280);
            const xOf = (d) => pad.l + (d / dMax) * plotW;
            const yOf = (F) => pad.t + plotH - (F / FMax) * plotH;

            chartCtx.clearRect(0, 0, w, h);
            chartCtx.strokeStyle = '#ece8e0';
            chartCtx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = pad.t + (plotH * i) / 5;
                chartCtx.beginPath(); chartCtx.moveTo(pad.l, y); chartCtx.lineTo(pad.l + plotW, y); chartCtx.stroke();
            }
            for (let i = 0; i <= 6; i++) {
                const x = pad.l + (plotW * i) / 6;
                chartCtx.beginPath(); chartCtx.moveTo(x, pad.t); chartCtx.lineTo(x, pad.t + plotH); chartCtx.stroke();
            }
            chartCtx.strokeStyle = '#9aa3b0';
            chartCtx.beginPath();
            chartCtx.moveTo(pad.l, pad.t);
            chartCtx.lineTo(pad.l, pad.t + plotH);
            chartCtx.lineTo(pad.l + plotW, pad.t + plotH);
            chartCtx.stroke();

            chartCtx.fillStyle = '#6b7380';
            chartCtx.font = '11px "Source Sans 3", sans-serif';
            chartCtx.textAlign = 'center';
            chartCtx.fillText('Tip |U2| (mm)', pad.l + plotW / 2, h - 8);
            chartCtx.save();
            chartCtx.translate(14, pad.t + plotH / 2);
            chartCtx.rotate(-Math.PI / 2);
            chartCtx.fillText('Tip force F (kN)', 0, 0);
            chartCtx.restore();

            chartCtx.textAlign = 'center';
            chartCtx.textBaseline = 'top';
            for (let i = 0; i <= 4; i++) {
                const d = (dMax * i) / 4;
                chartCtx.fillText(d.toFixed(0), xOf(d), pad.t + plotH + 4);
            }
            chartCtx.textAlign = 'right';
            chartCtx.textBaseline = 'middle';
            for (let i = 0; i <= 4; i++) {
                const F = (FMax * i) / 4;
                chartCtx.fillText(String(Math.round(F)), pad.l - 6, yOf(F));
            }

            const gap = gapMm();
            if (gap < dMax) {
                chartCtx.setLineDash([4, 4]);
                chartCtx.strokeStyle = '#c45c26';
                chartCtx.beginPath();
                chartCtx.moveTo(xOf(gap), pad.t);
                chartCtx.lineTo(xOf(gap), pad.t + plotH);
                chartCtx.stroke();
                chartCtx.setLineDash([]);
                chartCtx.fillStyle = '#c45c26';
                chartCtx.textAlign = 'left';
                chartCtx.textBaseline = 'top';
                chartCtx.font = '10px "Source Sans 3", sans-serif';
                chartCtx.fillText('close', xOf(gap) + 4, pad.t + 2);
            }

            if (pathPts.length) {
                chartCtx.strokeStyle = '#1e3a5f';
                chartCtx.lineWidth = 2.25;
                chartCtx.lineJoin = 'round';
                chartCtx.beginPath();
                chartCtx.moveTo(xOf(0), yOf(0));
                for (const p of pathPts) chartCtx.lineTo(xOf(-p.tipU2), yOf(p.F_kN));
                chartCtx.stroke();
            }

            if (sample) {
                const cx = xOf(-sample.tipU2), cy = yOf(sample.F_kN);
                chartCtx.setLineDash([3, 3]);
                chartCtx.strokeStyle = '#8a93a3';
                chartCtx.beginPath();
                chartCtx.moveTo(cx, cy); chartCtx.lineTo(cx, pad.t + plotH);
                chartCtx.moveTo(cx, cy); chartCtx.lineTo(pad.l, cy);
                chartCtx.stroke();
                chartCtx.setLineDash([]);
                chartCtx.fillStyle = '#c45c26';
                chartCtx.beginPath();
                chartCtx.arc(cx, cy, 5, 0, Math.PI * 2);
                chartCtx.fill();
                chartCtx.strokeStyle = '#fff';
                chartCtx.lineWidth = 1.5;
                chartCtx.stroke();
                chartCtx.fillStyle = '#1c2430';
                chartCtx.font = '11px "JetBrains Mono", monospace';
                chartCtx.textAlign = 'left';
                chartCtx.textBaseline = 'top';
                chartCtx.fillText(
                    'λ=' + sample.lambda.toFixed(3) + '  F=' + sample.F_kN.toFixed(1) + ' kN  U₂=' + sample.tipU2.toFixed(2) + ' mm',
                    pad.l + 8, pad.t + 4
                );
            }
        }

        function syncLambdaUI() {
            const lambda = parseFloat(document.getElementById('lambdaSlider').value);
            const exaggerate = parseFloat(document.getElementById('scaleSlider').value);
            const sample = samplePath(lambda);
            const { sSlave } = morphScales(lambda, exaggerate);
            document.getElementById('lambdaValue').textContent = lambda.toFixed(2);
            document.getElementById('scaleValue').textContent = exaggerate.toFixed(2);
            document.getElementById('forceVal').textContent = sample.F_kN.toFixed(1) + ' kN';
            document.getElementById('tipU2Val').textContent = sample.tipU2.toFixed(3) + ' mm';
            document.getElementById('pMaxVal').textContent = sample.pMax > 0 ? sample.pMax.toFixed(0) : '0';
            document.getElementById('nContactVal').textContent = String(sample.nContact);
            const badge = document.getElementById('statusBadge');
            if (badge && meshData) badge.textContent = (sample.nContact ? 'Contact engaged' : 'Open gap') + ' · λ = ' + lambda.toFixed(2);

            document.getElementById('dispOverlay').textContent =
                'F = ' + sample.F_kN.toFixed(1) + ' kN · tip U₂ = ' + sample.tipU2.toFixed(2) + ' mm' +
                ' · ' + (sample.nContact ? 'contact engaged' : 'approaching contact') +
                (sample.nContact ? ' · ' + sample.nContact + ' contact pts' : ' · open');
            drawChart(sample);
        }

        async function loadFEA() {
            const badge = document.getElementById('statusBadge');
            try {
                if (window.EMBEDDED_FEA) {
                    meshData = window.EMBEDDED_FEA;
                } else {
                    const res = await fetch('contact_fea_mesh.json');
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    meshData = await res.json();
                }
                badge.textContent = 'ContactFEA · λ = 1';
                badge.className = 'badge'; badge.style.color = '#b7d4c3';
                if (!isMaterialMode(document.getElementById('viewMode').value)) {
                    document.getElementById('colorbar').classList.remove('hidden');
                }
                document.getElementById('nNodeVal').textContent = meshData.nNodes;
                document.getElementById('nElemVal').textContent = meshData.nElems;
                document.getElementById('u2MinVal').textContent = meshData.U2min.toFixed(3) + ' mm';
                if (document.getElementById('gapVal')) {
                    document.getElementById('gapVal').textContent = gapMm() + ' mm';
                }
                slaveNodeSet = null;
                rebuildGapDimension();
                rebuild();
                syncLambdaUI();
            } catch (err) {
                badge.textContent = 'Failed to load mesh JSON';
                badge.className = 'badge'; badge.style.color = '#e2b8ae';
                document.getElementById('dispOverlay').textContent =
                    'Open this file via a local server (fetch needs HTTP). Error: ' + err.message;
                console.error(err);
            }
        }

        let playing = false;
        let playDir = 1;
        document.getElementById('lambdaSlider').addEventListener('input', () => {
            playing = false;
            document.getElementById('playBtn').textContent = 'Animate λ';
            rebuild();
        });
        document.getElementById('scaleSlider').addEventListener('input', () => {
            playing = false;
            document.getElementById('playBtn').textContent = 'Animate λ';
            rebuild();
        });
        document.getElementById('fieldSelect').addEventListener('change', rebuild);
        document.getElementById('viewMode').addEventListener('change', rebuild);
        document.getElementById('fixtureToggle').addEventListener('change', () => {
            fixture.visible = document.getElementById('fixtureToggle').checked;
        });
        document.getElementById('loadStyle').addEventListener('change', () => {
            const lambda = parseFloat(document.getElementById('lambdaSlider').value);
            const exaggerate = parseFloat(document.getElementById('scaleSlider').value);
            updateLoads(morphScales(lambda, exaggerate).sSlave);
        });
        document.getElementById('gapDimToggle').addEventListener('change', () => {
            const lambda = parseFloat(document.getElementById('lambdaSlider').value);
            const tipT = samplePath(lambda).tipU2;
            gapDim.visible = document.getElementById('gapDimToggle').checked && Math.abs(tipT) < GAP0 * 0.85;
        });
        document.getElementById('wireToggle').addEventListener('change', () => {
            if (edgeLines) edgeLines.visible = document.getElementById('wireToggle').checked;
        });
        document.getElementById('undefToggle').addEventListener('change', rebuild);
        document.getElementById('splitToggle').addEventListener('change', rebuild);
        document.getElementById('resetCamBtn').addEventListener('click', resetCamera);
        document.getElementById('playBtn').addEventListener('click', () => {
            playing = !playing;
            document.getElementById('playBtn').textContent = playing ? 'Pause' : 'Animate λ';
        });

        let raf = 0, lastTime = 0, settling = 0, playValue = 1;
        let visible = true;
        function requestRender(){
            if(!raf && visible && !document.hidden) raf=requestAnimationFrame(animate);
        }
        controls.addEventListener('change',()=>{settling=12;requestRender();});
        document.querySelector('.side').addEventListener('input',requestRender);
        document.querySelector('.side').addEventListener('change',()=>{
            parts.forEach(p=>{p.edges.visible=document.getElementById('wireToggle').checked;});
            renderer.shadowMap.needsUpdate=true;requestRender();
        });
        document.getElementById('playBtn').addEventListener('click',()=>{lastTime=0;playValue=+document.getElementById('lambdaSlider').value;requestRender();});
        document.getElementById('resetCamBtn').addEventListener('click',requestRender);
        new ResizeObserver(()=>{
            const w=container.clientWidth,h=container.clientHeight;
            if(!w||!h)return;
            camera.aspect=w/h;camera.zoom=Math.min(1,camera.aspect/1.25);camera.updateProjectionMatrix();renderer.setSize(w,h);
            if(meshData)syncLambdaUI();requestRender();
        }).observe(container);
        new IntersectionObserver(entries=>{
            visible=entries[0].isIntersecting;
            if(!visible&&raf){cancelAnimationFrame(raf);raf=0;}
            lastTime=0;if(visible)requestRender();
        }).observe(container);
        document.addEventListener('visibilitychange',()=>{
            if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}
            lastTime=0;requestRender();
        });
        function animate(time){
            raf=0;
            const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;
            lastTime=time;
            if(playing){
                const sl=document.getElementById('lambdaSlider');
                let v=playValue+playDir*dt*.22;
                if(v>=1){v=1;playDir=-1;}if(v<=0){v=0;playDir=1;}
                playValue=v;sl.value=v;rebuild();
            }
            controls.update();
            renderer.render(scene,camera);
            if(playing||settling>0){settling=Math.max(0,settling-1);requestRender();}
            else lastTime=0;
        }

        loadFEA();
        requestRender();
        });
    