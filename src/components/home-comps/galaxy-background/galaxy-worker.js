let canvas, ctx, w, h, cx, cy;
let config;
let PI2 = Math.PI * 2;
let angA, spdA, offA, alpA, trvA, angB, spdB, offB, alpB, trvB;
let countA = 0,
  countB = 0;
let layerCounts, layerPtr;
let globalRotation = 0;
let drawStride = 1;
let slowFrames = 0;
let lastTime = performance.now();
let progressiveInit = false;
let initBatchSize = 0;
let rndFn = null;
let dtScale = 1;
let ringThicknessPx = 0;

// Trails are drawn analytically each frame instead of accumulated through
// canvas persistence. Persistence fades multiplicatively, and an 8-bit
// canvas can't decrement alpha by less than 0.5/255 per frame, so any fade
// slow enough for a long tail stalls into permanent ghosts. Drawing the
// orbit history explicitly gives exact control: the tail spans one full
// lap, so its faintest end dies exactly where — and when — the comet
// comes back around to redraw it.
// The tail is rendered by stamping overlapping translucent dots along the
// orbit — the same texture the original persistence version produced by
// stamping one dot per frame. Stroked polyline segments were tried first
// and read as bamboo joints: flat hard-edged cross-section, stepped alpha
// between segments, and additive doubling at the joints. Overlapping round
// stamps instead fuse into a ribbon that is bright at the core and soft at
// the edges. DOT_ALPHA_SCALE compensates for the longitudinal overlap
// (each point on the path is covered by ~3.3 stamps).
const DOT_SPACING_RATIO = 0.6;
const DOT_ALPHA_SCALE = 0.34;
const MAX_TAIL_DOTS = 1500;
// Two exponentials in angle-space: a pronounced tail right behind the
// head, and a faint remainder that lives for three full laps — long
// enough that the whole knot outline is always faintly present, not
// erased before the shape completes. The slow term hits ~1/255 of the
// head alpha at 6π. Since the orbit is a closed ellipse, every lap
// overlays the previous one exactly, so instead of drawing the history
// three times we fold the earlier laps' leftover brightness into this
// lap's profile.
const TAIL_W_FAST = 0.85;
const TAIL_K_FAST = 2.3;
const TAIL_W_SLOW = 0.15;
const TAIL_K_SLOW = 0.19;

// `traveled` is how far this comet has actually flown since it spawned:
// the trail is drawn gradually, never as pre-existing history. Each lap's
// contribution only appears once the comet has flown that far, and the
// last ~0.35 rad before the birth point eases out so the trail grows
// from a soft tip instead of a cut edge. Capping traveled at three laps
// makes the steady state identical to the infinite-history profile: the
// oldest lap's ease-out then sits exactly at the 6π vanish point.
const TAIL_LAPS = 3;
const TAIL_BIRTH_EASE = 0.35;

function tailProfile(dTheta, traveled) {
  let sum = 0;
  for (let lap = 0; lap < TAIL_LAPS; lap++) {
    const d = dTheta + lap * PI2;
    if (d > traveled) break;
    const birthEase = Math.min(1, (traveled - d) / TAIL_BIRTH_EASE);
    sum +=
      (TAIL_W_FAST * Math.exp(-TAIL_K_FAST * d) +
        TAIL_W_SLOW * Math.exp(-TAIL_K_SLOW * d)) *
      birthEase;
  }
  return sum;
}

function makeRNG(seed) {
  let s = seed >>> 0 || 1;
  return function rnd() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 0) / 4294967296;
  };
}

function setupCanvas(dprScale) {
  const dpr = dprScale ? self.devicePixelRatio || 1 : 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  cx = w / 2;
  cy = h / 2;
}

function initData() {
  const { ringLayers, particlesPerLayer, rxBaseRatio } = config;
  const vp = Math.min(w, h);
  ringThicknessPx =
    config.ringThicknessRatio !== undefined &&
    config.ringThicknessRatio !== null
      ? vp * config.ringThicknessRatio
      : config.ringThickness;
  const layerMid = (ringLayers - 1) / 2;
  layerCounts = new Array(ringLayers).fill(0);
  layerPtr = new Array(ringLayers).fill(0);
  for (let layer = 0; layer < ringLayers; layer++) {
    const rel = (layer - layerMid) / layerMid;
    const dist = Math.abs(rel);
    const k = rel < 0 ? 1.9 : 1.2;
    const p = rel < 0 ? 2.6 : 1.8;
    const dAdj = Math.min(1, Math.pow(dist * k, p));
    const density = 0.25 + 0.75 * (1 - dAdj);
    layerCounts[layer] = Math.max(1, Math.round(particlesPerLayer * density));
  }
  const totalTarget = layerCounts.reduce((a, b) => a + b, 0);
  angA = new Float32Array(totalTarget);
  spdA = new Float32Array(totalTarget);
  offA = new Float32Array(totalTarget);
  alpA = new Float32Array(totalTarget);
  trvA = new Float32Array(totalTarget);
  angB = new Float32Array(totalTarget);
  spdB = new Float32Array(totalTarget);
  offB = new Float32Array(totalTarget);
  alpB = new Float32Array(totalTarget);
  trvB = new Float32Array(totalTarget);
  countA = 0;
  countB = 0;
  for (let layer = 0; layer < ringLayers; layer++) {
    const target = layerCounts[layer];
    for (let i = 0; i < target; i++) {
      makeOne(layer, 'A');
      makeOne(layer, 'B');
    }
  }
}

function r() {
  return rndFn ? rndFn() : Math.random();
}

function makeOne(layer, which) {
  const { ringLayers } = config;
  const radiusOffset =
    (layer - (ringLayers - 1) / 2) * ringThicknessPx +
    (r() * ringThicknessPx - ringThicknessPx / 2);
  const angle = r() * PI2;
  const speed = 0.001 + r() * 0.003;
  const alphaBase = 0.3 + r() * 0.5;
  if (which === 'A') {
    const idx = countA++;
    angA[idx] = angle;
    spdA[idx] = speed;
    offA[idx] = radiusOffset;
    alpA[idx] = alphaBase;
  } else {
    const idx = countB++;
    angB[idx] = angle;
    spdB[idx] = speed;
    offB[idx] = radiusOffset;
    alpB[idx] = alphaBase;
  }
}

function initStep() {
  const { ringLayers } = config;
  if (!progressiveInit) {
    for (let layer = 0; layer < ringLayers; layer++) {
      const target = layerCounts[layer];
      while (layerPtr[layer] < target) {
        makeOne(layer, 'A');
        makeOne(layer, 'B');
        layerPtr[layer]++;
      }
    }
    return;
  }
  let quota = initBatchSize;
  while (quota > 0) {
    let progressed = false;
    for (let layer = 0; layer < ringLayers && quota > 0; layer++) {
      const target = layerCounts[layer];
      if (layerPtr[layer] < target) {
        makeOne(layer, 'A');
        quota--;
        if (quota <= 0) break;
        makeOne(layer, 'B');
        quota--;
        layerPtr[layer]++;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
}

function renderRing(which, phi, ringTilt, axisDelta, hues, peakSide) {
  const { rxBaseRatio, innerInsetRatio, ringLayers, baseParticleRadius } =
    config;
  const rx = Math.min(w, h) * rxBaseRatio;
  const ryR = rx * Math.cos(ringTilt);
  const roScaleR = ryR / rx;
  const innerInset = rx * innerInsetRatio;
  const ringSpanHalf = (ringLayers * ringThicknessPx) / 2;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const vp = Math.min(w, h);
  const baseR =
    config.baseParticleRadiusRatio !== undefined &&
    config.baseParticleRadiusRatio !== null
      ? vp * config.baseParticleRadiusRatio
      : baseParticleRadius;
  const sat =
    config.saturation !== undefined && config.saturation !== null
      ? config.saturation
      : 100;
  const lightScale = config.lightScale || 1;
  const ang = which === 'A' ? angA : angB;
  const spd = which === 'A' ? spdA : spdB;
  const off = which === 'A' ? offA : offB;
  const alp = which === 'A' ? alpA : alpB;
  const trv = which === 'A' ? trvA : trvB;
  const count = which === 'A' ? countA : countB;

  for (let i = 0; i < count; i++) {
    // x2 keeps the approved pace: the old two-pass loop advanced the
    // angle twice per frame.
    const advance = spd[i] * 2 * dtScale;
    ang[i] += advance;
    if (ang[i] > PI2) ang[i] -= PI2;
    trv[i] = Math.min(trv[i] + advance, TAIL_LAPS * PI2);

    const rBand = Math.max(-1, Math.min(1, off[i] / ringSpanHalf));
    const radial = (rBand + 1) * 0.5;
    const radialAlpha = 0.6 + 0.4 * radial;
    const radiusX = rx + innerInset + off[i];
    const radiusY = ryR + innerInset * roScaleR + off[i] * roScaleR;
    // Angular step that keeps consecutive stamps within a fraction of a
    // dot radius, so they fuse. drawStride widens the spacing on slow
    // devices instead of dropping whole comets.
    const rMax = Math.max(Math.abs(radiusX), Math.abs(radiusY));
    const step = Math.max(
      (DOT_SPACING_RATIO * baseR * drawStride) / rMax,
      PI2 / MAX_TAIL_DOTS,
    );

    const dots = Math.ceil(PI2 / step);
    for (let j = 0; j <= dots; j++) {
      // Nothing exists beyond the birth point yet.
      if (j * step > trv[i]) break;
      const a = ang[i] + globalRotation - j * step;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const z = sinA * Math.sin(ringTilt);
      const X = radiusX * cosA;
      const Y = radiusY * sinA;
      const x = cx + cosPhi * X - sinPhi * Y;
      const y = cy + sinPhi * X + cosPhi * Y;
      const zSym = 0.5 + 0.5 * Math.abs(z);
      const axisAlpha = Math.pow(Math.abs(Math.cos(a - axisDelta)), 4.0);
      const profile = tailProfile(j * step, trv[i]);
      const alpha = Math.min(
        Math.max(alp[i] * (0.35 + 0.65 * zSym) * radialAlpha * axisAlpha, 0) *
          profile,
        1,
      );
      const pairNorm = (Math.cos(2 * (a - phi)) + 1) * 0.5;
      const hue =
        peakSide === 'right'
          ? hues.right * pairNorm + hues.left * (1 - pairNorm)
          : hues.left * pairNorm + hues.right * (1 - pairNorm);
      const lightRaw = 45 + zSym * 18 + (radial - 0.5) * 12;
      const light = Math.min(100, lightRaw * lightScale);
      const rP = baseR * (0.85 + 0.3 * zSym);

      // Overexposure ramp. The original dense field owed its glow to
      // additive channel saturation: enough same-hue stamps piling up
      // clip every channel and the core turns white, leaving color only
      // at the fringes. Eight comets never reach that point, so the
      // clipping is reproduced explicitly — the color climbs toward the
      // hot core tone (near-white in dark, deepest ink in light) as the
      // profile approaches the head, and falls back to the plain hue
      // down the tail.
      const hotMix = Math.min(1, profile) * Math.min(1, profile);
      const coreLight =
        config.coreLight !== undefined && config.coreLight !== null
          ? config.coreLight
          : 96;
      const coreSat =
        config.coreSat !== undefined && config.coreSat !== null
          ? config.coreSat
          : 40;
      const hotLight = light + (coreLight - light) * hotMix;
      const hotSat = sat + (coreSat - sat) * hotMix;

      if (j === 0) {
        // The comet head keeps its little shimmer; the tail stays
        // deterministic so the ribbon reads calm, not noisy.
        const jitter = r() * 0.06 - 0.03;
        const headAlpha = Math.min(Math.max(alpha + jitter, 0), 1);
        // Three layers, like a real light source: wide colored halo,
        // warm mid, hot core.
        ctx.fillStyle = `hsla(${hue},${sat}%,${light}%,${headAlpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(x, y, rP * 3, 0, PI2);
        ctx.fill();
        ctx.fillStyle = `hsla(${hue},${hotSat}%,${hotLight}%,${headAlpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, rP * 1.6, 0, PI2);
        ctx.fill();
        ctx.fillStyle = `hsla(${hue},${coreSat}%,${coreLight}%,${headAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, rP * 0.95, 0, PI2);
        ctx.fill();
      } else if (alpha > 0.0015) {
        // Taper the ribbon along with its fade. alphaBoost lifts only the
        // trail, not the head: on a light page the leftover trace needs
        // extra pigment to read, but the comet itself shouldn't deepen.
        const rDot = rP * (0.45 + 0.55 * Math.sqrt(profile));
        const tailAlpha = Math.min(
          alpha * DOT_ALPHA_SCALE * (config.alphaBoost || 1),
          1,
        );
        // The recently-flown stretch keeps a soft colored halo around
        // its hot line. Halos only glow against a dark page — on a light
        // one they just widen the stroke — so the strength is themed.
        const tailHalo =
          config.tailHalo !== undefined && config.tailHalo !== null
            ? config.tailHalo
            : 0.3;
        if (profile > 0.12 && tailHalo > 0) {
          ctx.fillStyle = `hsla(${hue},${sat}%,${light}%,${tailAlpha * tailHalo})`;
          ctx.beginPath();
          ctx.arc(x, y, rDot * 2.4, 0, PI2);
          ctx.fill();
        }
        ctx.fillStyle = `hsla(${hue},${hotSat}%,${hotLight}%,${tailAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, rDot, 0, PI2);
        ctx.fill();
      }
    }
  }
}

function draw() {
  const now = performance.now();
  const dt = now - lastTime;
  dtScale = dt > 0 ? (dt / 1000) * 60 : 1;
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  globalRotation += 0.0005 * dtScale;
  renderRing(
    'A',
    config.ringRotA,
    config.tilt,
    config.axisDeltaA,
    { left: config.hueLeftA, right: config.hueRightA },
    'right',
  );
  renderRing(
    'B',
    config.ringRotB,
    -config.tilt,
    config.axisDeltaB,
    { left: config.hueLeftB, right: config.hueRightB },
    'left',
  );
  if (config.adaptiveStride) {
    if (dt > 24) {
      slowFrames++;
      if (slowFrames >= 3 && drawStride < 4) {
        drawStride++;
        slowFrames = 0;
      }
    } else if (dt < 16) {
      slowFrames++;
      if (slowFrames >= 6 && drawStride > 1) {
        drawStride--;
        slowFrames = 0;
      }
    } else {
      slowFrames = Math.max(slowFrames - 1, 0);
    }
  }
  lastTime = now;
  requestAnimationFrame(draw);
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') {
    canvas = msg.canvas;
    ctx = canvas.getContext('2d');
    w = msg.width;
    h = msg.height;
    config = msg.config;
    progressiveInit = false;
    initBatchSize = 0;
    rndFn =
      msg.randomSeed !== undefined && msg.randomSeed !== null
        ? makeRNG(msg.randomSeed)
        : null;
    setupCanvas(msg.dprScale);
    initData();
    draw();
  } else if (msg.type === 'resize') {
    w = msg.width;
    h = msg.height;
    setupCanvas(msg.dprScale);
    initData();
  }
};
