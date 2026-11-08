function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// One frond in local coords: starts at (0,0), runs along +x and droops toward +y.
function frondPath(L, droop, rng) {
  const P0 = [0, 0];
  const P1 = [L * 0.55, -L * 0.06];
  const P2 = [L, L * droop];
  const B = (t) => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  const T = (t) => {
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    const m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  };
  const f = (n) => n.toFixed(1);

  let d = '';

  // Tapered spine
  const left = [];
  const right = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const p = B(t);
    const tg = T(t);
    const w = (1 - t) * L * 0.014 + 0.6;
    left.push([p[0] - tg[1] * w, p[1] + tg[0] * w]);
    right.push([p[0] + tg[1] * w, p[1] - tg[0] * w]);
  }
  d += 'M' + left.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')
     + 'L' + right.reverse().map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';

  // Leaflets: long near the middle, short at the tip, swept toward the tip, sagging down
  const n = 34;
  const leafMax = L * 0.34;
  for (let i = 0; i < n; i++) {
    const t = 0.1 + 0.9 * (i / (n - 1));
    const p = B(t);
    const tg = T(t);
    const ang = Math.atan2(tg[1], tg[0]);
    const env = Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.85));
    const len = leafMax * (0.3 + 0.7 * env) * (1 - t * 0.45) * (0.85 + rng() * 0.3);
    for (const side of [-1, 1]) {
      const spread = (0.78 - 0.3 * t) * side + (rng() - 0.5) * 0.12;
      const a = ang + spread;
      const tip = [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len + len * 0.42];
      const w = L * 0.009 * (1 - t * 0.5) + 0.5;
      const b1 = [p[0] - tg[1] * w, p[1] + tg[0] * w];
      const b2 = [p[0] + tg[1] * w, p[1] - tg[0] * w];
      d += `M${f(b1[0])} ${f(b1[1])}L${f(tip[0])} ${f(tip[1])}L${f(b2[0])} ${f(b2[1])}Z`;
    }
  }
  return d;
}

function buildPalmSymbol() {
  const rng = makeRng(20261119);
  // Fronds fanning from the crown; right-side ones arch clockwise, left-side mirrored.
  const fan = [
    { rot: -112, L: 300, droop: 0.55 },
    { rot: -84, L: 330, droop: 0.62 },
    { rot: -56, L: 340, droop: 0.7 },
    { rot: -28, L: 320, droop: 0.8 },
    { rot: 0, L: 290, droop: 0.95 },
    { rot: 24, L: 250, droop: 1.1 },
  ];
  let fronds = '';
  fan.forEach((fr) => {
    const j = (rng() - 0.5) * 8;
    fronds += `<path transform="rotate(${fr.rot + j})" d="${frondPath(fr.L, fr.droop, rng)}"/>`;
    fronds += `<path transform="scale(-1 1) rotate(${fr.rot - j})" d="${frondPath(fr.L * (0.92 + rng() * 0.16), fr.droop, rng)}"/>`;
  });
  const trunk = 'M-14 -4 C-12 160 -4 330 -26 560 L18 560 C8 330 14 160 14 -4 Z';
  const nuts = '<circle cx="-10" cy="12" r="12"/><circle cx="11" cy="15" r="12"/><circle cx="1" cy="27" r="11"/>';
  return `<symbol id="palm" viewBox="-380 -360 760 760" overflow="visible"><g fill="currentColor">${trunk ? `<path d="${trunk}"/>` : ''}${fronds}${nuts}</g></symbol>`;
}

const artDefs = document.getElementById('artDefs');
if (artDefs) artDefs.innerHTML = buildPalmSymbol();

// Hazy skyline along the bottom: two rows of buildings, back row lighter.
function buildSkyline() {
  const rng = makeRng(777);
  const W = 1600;
  const H = 300;
  const row = (fill, opacity, minH, maxH, minW, maxW) => {
    let x = -20;
    let out = `<g fill="${fill}" opacity="${opacity}">`;
    while (x < W + 20) {
      const w = minW + rng() * (maxW - minW);
      const h = minH + rng() * (maxH - minH);
      const y = H - h;
      out += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 4).toFixed(0)}" rx="2"/>`;
      if (rng() > 0.72) {
        const aw = 3;
        const ah = 14 + rng() * 30;
        out += `<rect x="${(x + w / 2 - aw / 2).toFixed(0)}" y="${(y - ah).toFixed(0)}" width="${aw}" height="${ah.toFixed(0)}"/>`;
      }
      x += w + 4 + rng() * 14;
    }
    return out + '</g>';
  };
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    ${row('#b79bd8', 0.55, 80, 230, 26, 70)}
    ${row('#a98bd0', 0.7, 30, 130, 34, 110)}
  </svg>`;
}

const skyline = document.getElementById('skyline');
if (skyline) skyline.innerHTML = buildSkyline();

