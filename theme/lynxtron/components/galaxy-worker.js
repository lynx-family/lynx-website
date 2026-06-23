let canvas, ctx, w, h, cx, cy;
let config;
let PI2 = Math.PI * 2;
let angA, spdA, offA, alpA, angB, spdB, offB, alpB;
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
let lastAlphaClean = 0;
let dtScale = 1;
let ringThicknessPx = 0;

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

function applyResidueFloor() {
  const initFadeBase = config.fadeAlpha60 || 0.12;
  const quantFloor = (Math.ceil(0.5 / initFadeBase) + 1) / 255;
  ctx.fillStyle = `rgba(255,255,255,${quantFloor})`;
  ctx.fillRect(0, 0, w, h);
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
  angB = new Float32Array(totalTarget);
  spdB = new Float32Array(totalTarget);
  offB = new Float32Array(totalTarget);
  alpB = new Float32Array(totalTarget);
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
  const {
    rxBaseRatio,
    innerInsetRatio,
    ringLayers,
    ringThickness,
    baseParticleRadius,
  } = config;
  const rx = Math.min(w, h) * rxBaseRatio;
  const ryR = rx * Math.cos(ringTilt);
  const roScaleR = ryR / rx;
  const innerInset = rx * innerInsetRatio;
  const ringSpanHalf = (ringLayers * ringThicknessPx) / 2;
  for (let pass = 0; pass < 2; pass++) {
    const front = pass === 1;
    const ang = which === 'A' ? angA : angB;
    const spd = which === 'A' ? spdA : spdB;
    const off = which === 'A' ? offA : offB;
    const alp = which === 'A' ? alpA : alpB;
    const count = which === 'A' ? countA : countB;
    for (let i = 0; i < count; i++) {
      ang[i] += spd[i] * dtScale;
      if (ang[i] > PI2) ang[i] -= PI2;
      const a = ang[i] + globalRotation;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const z = sinA * Math.sin(ringTilt);
      if (front ? z >= 0 : z < 0) {
        if (i % drawStride === 0) {
          const X = (rx + innerInset + off[i]) * cosA;
          const Y = (ryR + innerInset * roScaleR + off[i] * roScaleR) * sinA;
          const x = cx + Math.cos(phi) * X - Math.sin(phi) * Y;
          const y = cy + Math.sin(phi) * X + Math.cos(phi) * Y;
          const zSym = 0.5 + 0.5 * Math.abs(z);
          let axisAlpha = Math.pow(Math.abs(Math.cos(a - axisDelta)), 4.0);
          const rBand = Math.max(-1, Math.min(1, off[i] / ringSpanHalf));
          const radial = (rBand + 1) * 0.5;
          const jitter = r() * 0.06 - 0.03;
          const alpha = Math.min(
            Math.max(
              (alp[i] * (0.35 + 0.65 * zSym) * (0.6 + 0.4 * radial) + jitter) *
                axisAlpha,
              0,
            ),
            1,
          );
          const pairNorm = (Math.cos(2 * (a - phi)) + 1) * 0.5;
          const hue =
            peakSide === 'right'
              ? hues.right * pairNorm + hues.left * (1 - pairNorm)
              : hues.left * pairNorm + hues.right * (1 - pairNorm);
          const sat = 100;
          const lightRaw = 45 + zSym * 18 + (radial - 0.5) * 12;
          const light = Math.min(100, lightRaw * (config.lightScale || 1));
          const vp = Math.min(w, h);
          const baseR =
            config.baseParticleRadiusRatio !== undefined &&
            config.baseParticleRadiusRatio !== null
              ? vp * config.baseParticleRadiusRatio
              : baseParticleRadius;
          const rP = baseR * (0.85 + 0.3 * zSym);
          ctx.fillStyle = `hsla(${hue},${sat}%,${light}%,${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, rP, 0, PI2);
          ctx.fill();
        }
      }
    }
  }
}

function draw() {
  const now = performance.now();
  const dt = now - lastTime;
  dtScale = dt > 0 ? (dt / 1000) * 60 : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const fadeBase = config.fadeAlpha60 || 0.12;
  const fadeAlpha = 1 - Math.pow(1 - fadeBase, dtScale);
  ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
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
    // Re-apply the low-alpha floor after canvas resets so residue
    // pixels decay toward a stable base instead of fully transparent.
    applyResidueFloor();
    initData();
    draw();
  } else if (msg.type === 'resize') {
    w = msg.width;
    h = msg.height;
    setupCanvas(msg.dprScale);
    applyResidueFloor();
    initData();
  }
};
