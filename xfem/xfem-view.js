import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function turbo(t) {
  t = Math.min(1, Math.max(0, t));
  const r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3)));
  const g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2)));
  const b = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1)));
  return [r, g, b];
}

export function crackSide(x, y, poly) {
  let bestD = Infinity;
  let sgn = 1;
  for (let i = 0; i < poly.length - 1; i++) {
    const ax = poly[i][0], ay = poly[i][1];
    const bx = poly[i + 1][0], by = poly[i + 1][1];
    const abx = bx - ax, aby = by - ay;
    const ab2 = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * abx + (y - ay) * aby) / ab2));
    const px = ax + t * abx, py = ay + t * aby;
    const dx = x - px, dy = y - py;
    const d = Math.hypot(dx, dy);
    const s = Math.sign(abx * (y - ay) - aby * (x - ax)) || 1;
    if (d < bestD) {
      bestD = d;
      sgn = s;
    }
  }
  return { d: bestD, sign: sgn };
}

function williamsStress(r, th, KI, KII) {
  const rt = Math.sqrt(Math.max(r, 1e-12));
  const c2 = Math.cos(th / 2), s2 = Math.sin(th / 2);
  const c32 = Math.cos((3 * th) / 2), s32 = Math.sin((3 * th) / 2);
  const fi = KI / Math.sqrt(2 * Math.PI) / rt;
  const fii = KII / Math.sqrt(2 * Math.PI) / rt;
  const sxxI = fi * c2 * (1 - s2 * s32);
  const syyI = fi * c2 * (1 + s2 * s32);
  const sxyI = fi * s2 * c2 * c32;
  const sxxII = -fii * s2 * (2 + c2 * c32);
  const syyII = fii * s2 * c2 * c32;
  const sxyII = fii * c2 * (1 - s2 * s32);
  return { sxx: sxxI + sxxII, syy: syyI + syyII, sxy: sxyI + sxyII };
}

function williamsDisp(r, th, KI, KII, E, nu, plane) {
  const mu = E / (2 * (1 + nu));
  const k = plane === 2 ? 3 - 4 * nu : (3 - nu) / (1 + nu);
  const rt = Math.sqrt(Math.max(r, 0) / (2 * Math.PI));
  const c2 = Math.cos(th / 2), s2 = Math.sin(th / 2);
  const uxI = (KI / (2 * mu)) * rt * c2 * (k - 1 + 2 * s2 * s2);
  const uyI = (KI / (2 * mu)) * rt * s2 * (k + 1 - 2 * c2 * c2);
  const uxII = (KII / (2 * mu)) * rt * s2 * (k + 1 + 2 * c2 * c2);
  const uyII = (KII / (2 * mu)) * rt * c2 * (1 - k + 2 * s2 * s2);
  return { ux: uxI + uxII, uy: uyI - uyII };
}

function polar(x, y, tip) {
  const dx = x - tip.x, dy = y - tip.y;
  const c = Math.cos(tip.angle), s = Math.sin(tip.angle);
  const xl = c * dx + s * dy;
  const yl = -s * dx + c * dy;
  return { r: Math.hypot(xl, yl), th: Math.atan2(yl, xl) };
}

export function fieldsAt(x, y, state) {
  const { crack, tips, E, nu, plane, sigma, rMin, hole, inclusion, Em } = state;
  const side = crack && crack.length > 1 ? crackSide(x, y, crack) : { d: 1e9, sign: 1 };
  const yq = y + 1e-7 * side.sign;
  let sxx = 0, syy = sigma, sxy = 0, ux = 0, uy = (sigma / E) * y * (plane === 2 ? (1 + nu) * (1 - 2 * nu) : 1);
  if (tips) {
    for (const tip of tips) {
      const { r, th } = polar(x, yq, tip);
      const rr = Math.max(r, rMin);
      const st = williamsStress(rr, th, tip.KI, tip.KII);
      const w = Math.exp(-r / (tip.blend || Math.max(state.charLen * 0.35, 1e-6)));
      sxx += w * st.sxx;
      syy += w * (st.syy - sigma);
      sxy += w * st.sxy;
      const d = williamsDisp(rr, th, tip.KI, tip.KII, E, nu, plane);
      const cl = Math.cos(tip.angle), sl = Math.sin(tip.angle);
      ux += d.ux * cl - d.uy * sl;
      uy += d.ux * sl + d.uy * cl;
    }
  }
  if (hole) {
    const dx = x - hole.cx, dy = y - hole.cy;
    const rho = Math.hypot(dx, dy) / hole.r;
    if (rho < 0.999) {
      return { ux: 0, uy: 0, sxx: 0, syy: 0, sxy: 0, svm: 0, disp: 0, skip: true };
    }
    const th = Math.atan2(dy, dx);
    const ir2 = 1 / (rho * rho), ir4 = ir2 * ir2;
    const c2 = Math.cos(2 * th), s2 = Math.sin(2 * th);
    sxx = (sigma / 2) * (1 - ir2) + (sigma / 2) * (1 - 4 * ir2 + 3 * ir4) * c2;
    syy = (sigma / 2) * (1 + ir2) - (sigma / 2) * (1 + 3 * ir4) * c2;
    sxy = -(sigma / 2) * (1 + 2 * ir2 - 3 * ir4) * s2;
  }
  if (inclusion) {
    const dx = x - inclusion.cx, dy = y - inclusion.cy;
    const inside = dx * dx + dy * dy <= inclusion.r * inclusion.r;
    const ratio = inside ? inclusion.E / Em : 1;
    const stiff = Math.pow(Em / Math.max(inclusion.E, 1e-9), inside ? 0.35 : 0);
    sxx *= inside ? 1 / Math.max(ratio, 0.2) ** 0.4 : 1;
    syy *= inside ? 1 / Math.max(ratio, 0.2) ** 0.4 : 1;
    sxy *= inside ? 1 / Math.max(ratio, 0.2) ** 0.4 : 1;
    ux *= stiff;
    uy *= stiff;
  }
  const svm = Math.sqrt(Math.max(0, sxx * sxx + syy * syy - sxx * syy + 3 * sxy * sxy));
  return { ux, uy, sxx, syy, sxy, svm, disp: Math.hypot(ux, uy), skip: false, side };
}

function inHole(x, y, hole) {
  if (!hole) return false;
  const dx = x - hole.cx, dy = y - hole.cy;
  return dx * dx + dy * dy < hole.r * hole.r;
}

export function buildPlate(width, height, nx, ny, hole) {
  const hx = width / nx, hy = height / ny;
  const rest = [];
  const indices = [];
  const sides = [];
  const positions = [];
  let v = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x0 = i * hx, y0 = j * hy;
      const x1 = x0 + hx, y1 = y0 + hy;
      const cx = 0.5 * (x0 + x1), cy = 0.5 * (y0 + y1);
      if (inHole(cx, cy, hole) || inHole(x0, y0, hole) || inHole(x1, y0, hole) || inHole(x1, y1, hole) || inHole(x0, y1, hole)) {
        continue;
      }
      const quad = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      for (const [x, y] of quad) {
        rest.push(x, y);
        positions.push(x, y, 0);
        sides.push(cy);
      }
      indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    }
  }
  return { rest, indices, positions, sides, nVert: v, hx, hy };
}

function makeLine(points, color, z = 0.02) {
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], z));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
}

function makeTube(color, emissive = 0x000000) {
  return new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.05,
    })
  );
}

function updateTube(mesh, points, z, radius) {
  mesh.geometry.dispose();
  if (!points || points.length < 2) {
    mesh.visible = false;
    mesh.geometry = new THREE.BufferGeometry();
    return;
  }
  mesh.visible = true;
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], z));
  const curve = pts.length === 2
    ? new THREE.LineCurve3(pts[0], pts[1])
    : new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const segs = Math.max(12, (points.length - 1) * 6);
  mesh.geometry = new THREE.TubeGeometry(curve, segs, radius, 10, false);
}

function polylineLength(poly) {
  let L = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    L += Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
  }
  return L;
}

function prefixPoly(poly, n) {
  return poly.slice(0, Math.max(2, Math.min(poly.length, n)));
}

export function drawChart(canvas, spec) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const pad = { l: 48, r: 12, t: 14, b: 32 };
  const xs = spec.x, ys = spec.series;
  let xmin = spec.xmin ?? Infinity;
  let xmax = spec.xmax ?? -Infinity;
  let ymin = spec.ymin ?? Infinity;
  let ymax = spec.ymax ?? -Infinity;
  if (spec.xmin == null || spec.xmax == null) {
    for (const x of xs || []) {
      xmin = Math.min(xmin, x);
      xmax = Math.max(xmax, x);
    }
  }
  for (const s of ys) {
    if (spec.xmin == null || spec.xmax == null) {
      for (const x of s.x || []) {
        xmin = Math.min(xmin, x);
        xmax = Math.max(xmax, x);
      }
    }
    for (const v of s.y) {
      ymin = Math.min(ymin, v);
      ymax = Math.max(ymax, v);
    }
  }
  if (!(xmax > xmin)) { xmin = 0; xmax = 1; }
  if (!(ymax > ymin)) { ymin = 0; ymax = 1; }
  const xmap = (x) => pad.l + ((x - xmin) / (xmax - xmin)) * (W - pad.l - pad.r);
  const ymap = (y) => pad.t + (1 - (y - ymin) / (ymax - ymin)) * (H - pad.t - pad.b);
  ctx.strokeStyle = "#2a3a66";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, H - pad.b);
  ctx.lineTo(W - pad.r, H - pad.b);
  ctx.stroke();
  ctx.fillStyle = "#9aa8c7";
  ctx.font = "16px Segoe UI, sans-serif";
  ctx.fillText(spec.xlabel || "", W / 2 - 20, H - 8);
  ctx.save();
  ctx.translate(16, H / 2 + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(spec.ylabel || "", 0, 0);
  ctx.restore();
  for (const s of ys) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width || 2.2;
    ctx.beginPath();
    const sx = s.x || xs;
    s.y.forEach((v, i) => {
      const X = xmap(sx[i]), Y = ymap(v);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.stroke();
    if (s.dots) {
      ctx.fillStyle = s.color;
      s.y.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(xmap(sx[i]), ymap(v), 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  if (spec.cursor != null) {
    ctx.strokeStyle = "#ffffff55";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xmap(spec.cursor), pad.t);
    ctx.lineTo(xmap(spec.cursor), H - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawBars(canvas, rows) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const vmax = Math.max(...rows.flatMap((r) => r.values.map((v) => Math.abs(v))), 1e-9);
  const rowH = (H - 24) / rows.length;
  rows.forEach((row, ri) => {
    const y0 = 12 + ri * rowH;
    ctx.fillStyle = "#9aa8c7";
    ctx.font = "15px Segoe UI, sans-serif";
    ctx.fillText(row.label, 10, y0 + 14);
    const n = row.values.length;
    const bw = (W - 160) / n - 8;
    row.values.forEach((v, i) => {
      const x = 110 + i * (bw + 8);
      const h = (Math.abs(v) / vmax) * (rowH - 28);
      ctx.fillStyle = row.colors[i];
      ctx.fillRect(x, y0 + rowH - 18 - h, bw, h);
      ctx.fillStyle = "#d5def0";
      ctx.font = "13px Segoe UI, sans-serif";
      ctx.fillText(v.toFixed(4), x, y0 + rowH - 4);
    });
  });
}

/**
 * Shared Three.js plate + crack viewer.
 * getFrame(i) must return { crack, tips, load, refCrack?, label, statsHTML, chart }.
 */
export function createViewer({ canvas, getFrame, nFrames, extraMeshes, onFrame, msPerFrame = 220 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0x9bb0d4, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(6, 12, 10);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7aa2ff, 0.35);
  fill.position.set(-8, 3, -4);
  scene.add(fill);

  let plate = null;
  let geo = null;
  let colors = null;
  let rest = null;
  let nVert = 0;
  const crackLine = makeTube(0xff3b4e, 0x4a0008);
  const refLine = makeTube(0xffd166, 0x5a3a00);
  refLine.material.transparent = true;
  refLine.material.opacity = 0.9;
  scene.add(crackLine);
  scene.add(refLine);
  refLine.visible = false;

  const extras = new THREE.Group();
  scene.add(extras);

  const frameEl = document.getElementById("frame");
  const warpEl = document.getElementById("warp");
  const fieldEl = document.getElementById("field");
  const playEl = document.getElementById("play");
  const tlabel = document.getElementById("tlabel");
  const wlabel = document.getElementById("wlabel");
  const vminEl = document.getElementById("vmin");
  const vmaxEl = document.getElementById("vmax");
  const plot = document.getElementById("plot");

  let autoWarp = 1;
  let playing = false;
  let lastStep = 0;
  let fitted = false;

  function rebuildPlate(spec) {
    extras.clear();
    if (extraMeshes) extraMeshes(extras, spec);
    const built = buildPlate(spec.width, spec.height, spec.nx, spec.ny, spec.hole);
    rest = built.rest;
    nVert = built.nVert;
    if (plate) {
      scene.remove(plate);
      plate.geometry.dispose();
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(built.positions, 3));
    geo.setIndex(built.indices);
    colors = new Float32Array(nVert * 3);
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.06,
      roughness: 0.46,
      side: THREE.DoubleSide,
    });
    plate = new THREE.Mesh(geo, mat);
    const wire = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        wireframe: true,
        color: 0x1c2744,
        transparent: true,
        opacity: 0.35,
      })
    );
    plate.add(wire);
    scene.add(plate);

    const outline = makeLine(
      [[0, 0], [spec.width, 0], [spec.width, spec.height], [0, spec.height], [0, 0]],
      0x7aa2ff,
      0.02
    );
    extras.add(outline);

    if (!fitted || spec.refit) {
      const cx = spec.width / 2, cy = spec.height / 2;
      const span = Math.max(spec.width, spec.height);
      controls.target.set(cx, cy, 0);
      camera.position.set(cx, cy - span * 0.08, span * 1.35);
      camera.up.set(0, 1, 0);
      fitted = true;
    }
  }

  function apply() {
    const i = Number(frameEl.value);
    const fr = getFrame(i);
    if (!fr) return;
    if (!plate || fr.rebuild) rebuildPlate(fr);
    const pos = geo.getAttribute("position");
    const fieldName = fieldEl.value;
    const rMin = Math.max(fr.width / fr.nx, fr.height / fr.ny) * 0.35;
    const state = {
      crack: fr.crack,
      tips: fr.tips,
      E: fr.E,
      nu: fr.nu,
      plane: fr.plane,
      sigma: (fr.load ?? 1) * fr.sigma,
      rMin,
      hole: fr.hole,
      inclusion: fr.inclusion,
      Em: fr.Em || fr.E,
      charLen: Math.max(fr.width, fr.height),
    };
    const samples = new Float32Array(nVert);
    let uMax = 0;
    const uxs = new Float32Array(nVert);
    const uys = new Float32Array(nVert);
    for (let v = 0; v < nVert; v++) {
      const x = rest[2 * v], y = rest[2 * v + 1];
      const f = fieldsAt(x, y, state);
      uxs[v] = f.ux;
      uys[v] = f.uy;
      uMax = Math.max(uMax, Math.hypot(f.ux, f.uy));
      samples[v] = f[fieldName] ?? f.svm;
    }
    autoWarp = (0.07 * Math.max(fr.width, fr.height)) / Math.max(uMax, 1e-16);
    const warp = Number(warpEl.value) * autoWarp;
    let lo = Infinity, hi = -Infinity;
    for (let v = 0; v < nVert; v++) {
      lo = Math.min(lo, samples[v]);
      hi = Math.max(hi, samples[v]);
    }
    if (!(hi > lo)) { lo = 0; hi = 1; }
    const z = 0.004 * Math.max(fr.width, fr.height);
    for (let v = 0; v < nVert; v++) {
      pos.setXYZ(v, rest[2 * v] + warp * uxs[v], rest[2 * v + 1] + warp * uys[v], z);
      const col = turbo((samples[v] - lo) / (hi - lo));
      colors[3 * v] = col[0];
      colors[3 * v + 1] = col[1];
      colors[3 * v + 2] = col[2];
    }
    pos.needsUpdate = true;
    geo.getAttribute("color").needsUpdate = true;
    geo.computeVertexNormals();

    const span = Math.max(fr.width, fr.height);
    const crackR = 0.0035 * span;
    if (fr.crack && fr.crack.length > 1) {
      updateTube(crackLine, fr.crack, z * 6, crackR);
    } else {
      crackLine.visible = false;
    }

    if (fr.refCrack && fr.refCrack.length > 1) {
      updateTube(refLine, fr.refCrack, z * 4, crackR * 0.55);
    } else {
      refLine.visible = false;
    }

    tlabel.textContent = fr.label;
    wlabel.textContent = Number(warpEl.value).toFixed(2) + " × auto";
    vminEl.textContent = lo.toExponential(2);
    vmaxEl.textContent = hi.toExponential(2);
    if (onFrame) onFrame(fr, { i, lo, hi, uMax, autoWarp });
    if (plot && fr.chart) {
      if (fr.chart.kind === "bars") drawBars(plot, fr.chart.rows);
      else drawChart(plot, fr.chart);
    }
  }

  function setPlaying(on) {
    playing = on;
    playEl.textContent = on ? "Pause" : "Play";
    playEl.setAttribute("aria-pressed", on ? "true" : "false");
  }

  frameEl.max = String(Math.max(0, nFrames - 1));
  playEl.addEventListener("click", () => setPlaying(!playing));
  fieldEl.addEventListener("change", apply);
  frameEl.addEventListener("input", () => { setPlaying(false); apply(); });
  warpEl.addEventListener("input", apply);

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(canvas);
  resize();

  function tick(now) {
    if (playing && now - lastStep >= msPerFrame) {
      lastStep = now;
      const next = (Number(frameEl.value) + 1) % nFrames;
      frameEl.value = String(next);
      apply();
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  const first = getFrame(0);
  rebuildPlate(first);
  apply();
  tick();

  return {
    apply,
    setPlaying,
    rebuildPlate,
    setFrames(n) {
      nFrames = n;
      frameEl.max = String(Math.max(0, n - 1));
    },
    scene,
    camera,
    controls,
    prefixPoly,
    polylineLength,
  };
}
