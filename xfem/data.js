/** MXFEM 1.2 benchmark outputs (Pais, 2010) used by the Three.js viewers. */

export const PARIS_AX = [
  0.0100, 0.0102, 0.0103, 0.0105, 0.0107, 0.0109, 0.0111, 0.0113, 0.0115,
  0.0117, 0.0119, 0.0122, 0.0124, 0.0127, 0.0129, 0.0132, 0.0135, 0.0138,
  0.0141, 0.0144, 0.0148, 0.0151, 0.0155, 0.0159, 0.0163, 0.0167, 0.0172,
  0.0177, 0.0182, 0.0187, 0.0193, 0.0199, 0.0205, 0.0212, 0.0219, 0.0227,
  0.0235, 0.0244, 0.0254, 0.0264, 0.0275, 0.0288, 0.0301, 0.0316, 0.0333,
  0.0351, 0.0371, 0.0394, 0.0421, 0.0451,
];

export const PARIS_N = Array.from({ length: 50 }, (_, i) => i * 50);

export const PARIS_PARAMS = {
  ai: 0.01,
  p: 0.06,
  m: 3.8,
  C: 1.5e-10,
  r: 3.25,
  t: 0.00248,
};

export function parisAnalytical(N, p = PARIS_PARAMS) {
  const S = (p.p * p.r * Math.sqrt(Math.PI)) / p.t;
  const exp = 1 - p.m / 2;
  return Math.pow(N * p.C * exp * Math.pow(S, p.m) + Math.pow(p.ai, exp), 1 / exp);
}

/** Bordas 2006 vs MXFEM — hard inclusion (E_inc / E_m = 10). */
export const HARD_BORDAS = [
  [0, 4], [0.5, 4], [0.596, 4.007], [0.696, 4.015], [0.802, 4.022],
  [0.898, 4.031], [0.993, 4.037], [1.099, 4.046], [1.194, 4.055],
  [1.294, 4.066], [1.395, 4.078], [1.496, 4.087], [1.591, 4.097],
  [1.697, 4.103], [1.797, 4.111], [1.893, 4.118], [1.993, 4.128],
  [2.094, 4.134], [2.189, 4.14], [2.289, 4.146], [2.491, 4.152],
  [2.591, 4.156], [2.692, 4.158], [2.793, 4.161], [2.888, 4.163],
  [2.988, 4.163], [3.094, 4.167], [3.195, 4.167], [3.296, 4.167],
  [3.396, 4.169], [3.491, 4.169], [3.592, 4.167], [3.693, 4.169],
];

export const HARD_MXFEM = [
  [0, 4], [0.5, 4], [0.5998, 4.006], [0.6997, 4.0112], [0.7995, 4.018],
  [0.8992, 4.0254], [0.9989, 4.0332], [1.0985, 4.0415], [1.1981, 4.0503],
  [1.2977, 4.0595], [1.3973, 4.0687], [1.4969, 4.0778], [1.5965, 4.0867],
  [1.6961, 4.0955], [1.7957, 4.1038], [1.8954, 4.1116], [1.9952, 4.1188],
  [2.095, 4.1255], [2.1948, 4.1313], [2.2947, 4.1363], [2.3946, 4.1407],
  [2.4945, 4.1444], [2.5944, 4.1476], [2.6944, 4.1501], [2.7944, 4.1522],
  [2.8944, 4.1537], [2.9944, 4.1548], [3.0944, 4.1555], [3.1944, 4.156],
  [3.2944, 4.1562], [3.3944, 4.1562], [3.4944, 4.1562], [3.5944, 4.1561],
  [3.6944, 4.1559], [3.7944, 4.1558], [3.8944, 4.1556],
];

/** Bordas 2006 vs MXFEM — soft inclusion (E_inc / E_m = 0.1). */
export const SOFT_BORDAS = [
  [0, 4], [0.5, 4], [0.601, 3.991], [0.696, 3.98], [0.797, 3.968],
  [0.892, 3.954], [0.998, 3.939], [1.093, 3.922], [1.194, 3.903],
  [1.289, 3.88], [1.389, 3.857], [1.484, 3.833], [1.585, 3.806],
  [1.675, 3.78], [1.781, 3.753], [1.865, 3.723], [1.965, 3.694],
  [2.06, 3.661], [2.161, 3.629], [2.245, 3.599], [2.345, 3.568],
  [2.44, 3.54], [2.535, 3.516], [2.642, 3.492], [2.731, 3.476],
  [2.832, 3.462], [2.932, 3.453], [3.027, 3.453], [3.128, 3.45],
  [3.229, 3.453], [3.329, 3.452], [3.435, 3.454], [3.53, 3.459],
  [3.631, 3.46], [3.732, 3.462],
];

export const SOFT_MXFEM = [
  [0, 4], [0.5, 4], [0.5993, 3.9884], [0.6987, 3.9776], [0.7978, 3.9641],
  [0.8967, 3.9491], [0.9952, 3.9321], [1.0934, 3.9133], [1.1914, 3.8929],
  [1.2888, 3.8704], [1.3859, 3.8465], [1.4825, 3.8208], [1.5787, 3.7935],
  [1.6745, 3.7647], [1.7698, 3.7344], [1.8648, 3.7032], [1.9595, 3.6711],
  [2.054, 3.6384], [2.1484, 3.6055], [2.2429, 3.5727], [2.3378, 3.5411],
  [2.4331, 3.511], [2.5293, 3.4836], [2.6265, 3.4601], [2.7246, 3.4408],
  [2.8236, 3.4261], [2.923, 3.4158], [3.0228, 3.4089], [3.1227, 3.4045],
  [3.2227, 3.4019], [3.3226, 3.4004], [3.4226, 3.3996], [3.5226, 3.3992],
  [3.6226, 3.3988], [3.7226, 3.3984], [3.8226, 3.3979],
];

/** Feddersen finite-width center-crack correction (matches MXFEM KI_theory = 1.9007). */
export function centerCrackKI(sigma, a, W) {
  const xa = (2 * a) / W;
  const Y = (1 - 0.025 * xa * xa + 0.06 * xa ** 4) * Math.sqrt(1 / Math.cos((Math.PI * a) / W));
  return sigma * Math.sqrt(Math.PI * a) * Y;
}

/** Tada edge-crack polynomial (matches MXFEM KI_theory = 3.1655). */
export function edgeCrackKI(sigma, a, W) {
  const x = a / W;
  const Y = 1.12 - 0.231 * x + 10.55 * x * x - 21.72 * x ** 3 + 30.39 * x ** 4;
  return sigma * Math.sqrt(Math.PI * a) * Y;
}

export const SIF_CASES = {
  centerFull: {
    id: "centerFull",
    title: "Center crack — full model",
    subtitle: "MXFEM Benchmark 1 · 6×10 plate · a = 1 · σ = 1 · plane strain",
    width: 6,
    height: 10,
    nx: 48,
    ny: 80,
    E: 10e6,
    nu: 0.3,
    sigma: 1,
    plane: 2,
    crack0: [[2, 5], [4, 5]],
    tips: [
      { x: 4, y: 5, angle: 0, KI: 1.8802, KII: -0.0002002 },
      { x: 2, y: 5, angle: Math.PI, KI: 1.8798, KII: -0.0000608 },
    ],
    KI_mxfem: [1.8802, 1.8798],
    KII_mxfem: [-0.0002002, -0.0000608],
    KI_theory: 1.9007,
    KII_theory: 0,
    jRadius: 3 / 20,
    bc: "Full center crack (BC = 4)",
  },
  centerHalf: {
    id: "centerHalf",
    title: "Center crack — half model",
    subtitle: "MXFEM Benchmark 1 · symmetry · 3×10 plate · a = 1",
    width: 3,
    height: 10,
    nx: 36,
    ny: 80,
    E: 10e6,
    nu: 0.3,
    sigma: 1,
    plane: 2,
    crack0: [[0, 5], [1, 5]],
    tips: [{ x: 1, y: 5, angle: 0, KI: 1.8628, KII: 0.0026 }],
    KI_mxfem: [1.8628],
    KII_mxfem: [0.0026],
    KI_theory: 1.9007,
    KII_theory: 0,
    jRadius: 3 / 20,
    bc: "Half center crack (BC = 3)",
  },
  edge: {
    id: "edge",
    title: "Edge crack in a finite plate",
    subtitle: "MXFEM Benchmark 2 · 3×6 plate · a = 1 · σ = 1",
    width: 3,
    height: 6,
    nx: 48,
    ny: 96,
    E: 10e6,
    nu: 0.3,
    sigma: 1,
    plane: 2,
    crack0: [[0, 3], [1, 3]],
    tips: [{ x: 1, y: 3, angle: 0, KI: 3.1687, KII: 0.0011 }],
    KI_mxfem: [3.1687],
    KII_mxfem: [0.0011],
    KI_theory: 3.1655,
    KII_theory: 0,
    jRadius: 3 / 20,
    bc: "Edge crack (BC = 2)",
  },
  holeAngle: {
    id: "holeAngle",
    title: "Initiation angle at a hole",
    subtitle: "MXFEM Benchmark 7 · max hoop-stress · θ_MXFEM ≈ 0",
    width: 8,
    height: 8,
    nx: 64,
    ny: 64,
    E: 10e6,
    nu: 0.3,
    sigma: 1,
    plane: 2,
    hole: { cx: 4, cy: 4, r: 1 },
    crack0: [[5, 4], [5.35, 4]],
    tips: [{ x: 5.35, y: 4, angle: 0, KI: 1.12 * Math.sqrt(Math.PI * 0.35), KII: 0 }],
    KI_mxfem: [null],
    KII_mxfem: [null],
    KI_theory: null,
    theta_mxfem: -1.7287e-5,
    theta_theory: 0,
    jRadius: 3 / 20,
    bc: "Plate with circular void (BC = 10)",
  },
};

export const PARIS_CASE = {
  id: "paris",
  title: "Paris-law crack growth",
  subtitle: "MXFEM Benchmark 5 · 0.3 × 0.4 m · C = 1.5e-10 · m = 3.8 · ΔN = 50",
  width: 0.3,
  height: 0.4,
  nx: 45,
  ny: 60,
  E: 71.7e9,
  nu: 0.33,
  sigma: 78.629032258064512e6,
  plane: 2,
  yCrack: 0.2,
  jRadius: 3 / 500,
  bc: "Half center crack (BC = 3)",
};

export const INCLUSION_META = {
  width: 4,
  height: 8,
  nx: 40,
  ny: 80,
  nu: 0.3,
  sigma: 1,
  plane: 2,
  inclusion: { cx: 2, cy: 2, r: 1 },
  jRadius: 3 / 20,
  bc: "Edge crack (BC = 2)",
};
