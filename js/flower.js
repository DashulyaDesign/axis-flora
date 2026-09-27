/* =========================================================
   PARTICLE FLOWER — volumetric
   The photo (1.jpg) is sampled into a grid. Every non-black
   cell becomes a particle drawn as "+", "▪", "–" or "·" depending
   on its brightness (the look of "цветок из частиц 1.mp4").
   Particles fly in from all sides and assemble the flower.

   Volume: every particle also gets a depth depending on the part of
   the flower it belongs to — the sepals form a bowl and are cupped and
   twisted, the white petals stick out toward the viewer, the stamens
   sit in front, the spurs go far back, the stem bends in depth, leaves
   fan out, the bud is round. Extra particles placed straight behind the
   visible ones give every part a body, so it is not flat from the side.
   Seen from the front it is exactly the photo.

   Rotation. abhishekjha.me does:
       rotation.y += (0.01 + g) * m
   where m = -1/+1 depending on the cursor's side of the screen and
   g grows with the distance from the centre. It never stops.
   Here the same idea is driven by the cursor *velocity* instead:
   moving left spins it left, moving right spins it right, and when
   the cursor stops the spin damps to zero. The flower also leans a
   little toward the cursor, so the volume is visible all the time.
   ========================================================= */
(function () {
  const canvas = document.getElementById('flowerCanvas');
  if (!canvas || !window.FLOWER_SRC) return;
  const ctx = canvas.getContext('2d');
  const hero = document.getElementById('hero');
  const rotOut = document.getElementById('rotReadout');
  const partOut = document.getElementById('partReadout');

  const SAMPLE_W = 118;                     // grid columns sampled from the photo
  const ASSEMBLE_DUR = 1.7;                 // seconds each particle travels
  const AXIS_X = 0.043;                     // rotation axis runs through the blossom (photo units)
  const BAND_ALPHA = [0.42, 0.62, 0.82, 1]; // parts turned away from the viewer get dimmer

  let W = 0, H = 0, dpr = 1;
  let sw = 0, sh = 0;
  let buckets = [];                         // [{color, items: []}] batched by colour
  let total = 0;
  let glow = null;
  let startT = null, assembleEnd = 0, assembled = false;

  let spin = 0, vel = 0, targetVel = 0, lastMove = 0, lastX = null;
  let mx = 0.5, my = 0.5, leanX = 0, leanY = 0;
  let visible = true, frame = 0;

  /* ---------------------------------------------------------
     depth model — photo units: height = 1, origin = photo centre,
     x to the right, y up. Positions are read off 1.jpg.
     --------------------------------------------------------- */
  const C = { x: 0.043, y: 0.233 };                                   // centre of the blossom
  const planeZ = (x, y) => -(0.2 * (x - C.x) + 0.44 * (y - C.y));    // blossom faces us, tilted up-right
  // the stem and the bud stalk bend in depth (an S-curve), so from the side they are curves, not a line
  const STEM = [[0.041, 0.215, -0.06], [0.04, 0.16, -0.085], [0.03, 0.09, -0.07], [0.024, -0.02, -0.02],
    [0.022, -0.1, 0.03], [0.011, -0.19, 0.06], [-0.034, -0.297, 0.055], [-0.107, -0.37, 0.02],
    [-0.17, -0.442, -0.02], [-0.25, -0.53, -0.05]];
  const BUD_STEM = [[-0.075, -0.355, 0.03], [-0.01, -0.315, 0.07], [0.07, -0.26, 0.1],
    [0.13, -0.205, 0.11], [0.158, -0.19, 0.11], [0.168, -0.207, 0.11]];
  const BUD_Z = 0.11, BUD_R = 0.032;

  const SEPAL_DIRS = [18, 97, 172, 238, 305];    // screen angles of the five sepals (deg)

  // extra particles right behind the visible ones (same x/y → hidden from the front,
  // visible from the side): they give every part a body instead of a flat sheet
  const rr = (a, b) => a + Math.random() * (b - a);
  function extrude(part) {
    switch (part) {
      case 'sepal': return [-rr(0.008, 0.06), -rr(0.008, 0.06)];
      case 'petal': return [-rr(0.01, 0.06), -rr(0.01, 0.06)];
      case 'stamen': return [-rr(0.01, 0.06), -rr(0.01, 0.06)];
      case 'spur': return [0.018, -0.018];                         // round tube
      case 'leaf': return [rr(-0.02, 0.02)];
      default: return [];
    }
  }

  function nearest(px, py, pts) {
    let best = { d: Infinity, x: 0, y: 0, z: 0 };
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay, az] = pts[i], [bx, by, bz] = pts[i + 1];
      const vx = bx - ax, vy = by - ay;
      let t = ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1e-9);
      t = Math.max(0, Math.min(1, t));
      const qx = ax + vx * t, qy = ay + vy * t;
      const d = Math.hypot(px - qx, py - qy);
      if (d < best.d) best = { d, x: qx, y: qy, z: az + (bz - az) * t };
    }
    return best;
  }

  // stem is a thin tube; leaves fan out in depth on both sides of it
  function stemLeafZ(x, y, rnd) {
    const a = nearest(x, y, STEM), b = nearest(x, y, BUD_STEM);
    const n = a.d <= b.d ? a : b;
    if (n.d < 0.012) return n.z + rnd * 0.004;
    const dx = x - n.x, dy = y - n.y;
    return n.z + Math.abs(dx) * (dx < 0 ? 0.7 : -0.6) + dy * 0.3 + rnd * 0.015;
  }

  function partOf(cls, x, y) {
    const r = Math.hypot(x - C.x, y - C.y);
    if (cls === 'bud') return 'bud';
    if (cls === 'green' || r > 0.36) {
      const a = nearest(x, y, STEM), b = nearest(x, y, BUD_STEM);
      return Math.min(a.d, b.d) < 0.012 ? 'stem' : 'leaf';
    }
    if (cls === 'yellow') return 'stamen';
    if (cls === 'white') return 'petal';
    if (y < C.y - 0.1 && x < C.x + 0.02 && y > -0.12) return 'spur';
    return 'sepal';
  }

  function depthOf(part, x, y, rnd) {
    const r = Math.hypot(x - C.x, y - C.y);
    switch (part) {
      case 'bud': {
        const axisX = 0.155 - (y + 0.21) * 0.05;        // the bud hangs slightly to the left
        const dx = x - axisX;
        return BUD_Z + Math.sqrt(Math.max(0, BUD_R * BUD_R - dx * dx));
      }
      case 'stem':
      case 'leaf': return stemLeafZ(x, y, rnd);
      case 'stamen': return planeZ(x, y) + 0.09 + rnd * 0.04;                   // stamens stick out in front
      case 'petal': return planeZ(x, y) + 0.03 + 1.1 * Math.min(r, 0.13);       // white petals: a cone toward us
      case 'spur': {                                                           // spurs go far back
        const t = Math.max(0, Math.min(1, (C.y - 0.1 - y) / 0.25));
        return -0.06 - 0.26 * t + rnd * 0.015;
      }
      default: {                                                               // sepals: a bowl opening toward us,
        const phi = Math.atan2(y - C.y, x - C.x) * 180 / Math.PI;              // each sepal cupped across its width
        let delta = 180;                                                       // and twisted along its length,
        SEPAL_DIRS.forEach(dir => {                                            // so from the side its face shows
          const d = ((phi - dir + 540) % 360) - 180;
          if (Math.abs(d) < Math.abs(delta)) delta = d;
        });
        const w = r * Math.sin(Math.max(-60, Math.min(60, delta)) * Math.PI / 180);
        const twist = 1.1 * w * Math.min(1, r / 0.15);
        return planeZ(x, y) + 0.55 * r - 0.45 * r * r + 11 * w * w + twist + rnd * 0.03;
      }
    }
  }

  const img = new Image();
  img.onload = init;
  img.src = window.FLOWER_SRC;

  function init() {
    sw = SAMPLE_W;
    sh = Math.round(img.height * sw / img.width);
    const oc = document.createElement('canvas');
    oc.width = sw; oc.height = sh;
    const o = oc.getContext('2d', { willReadFrequently: true });
    o.drawImage(img, 0, 0, sw, sh);
    const data = o.getImageData(0, 0, sw, sh).data;

    const cx = sw * 0.5;
    const axis = AXIS_X * sh;
    const map = new Map();
    const q = v => Math.min(255, Math.round(v / 20) * 20);
    const add = (col, p) => {
      if (!map.has(col)) map.set(col, []);
      map.get(col).push(p);
      total++;
    };

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const maxc = Math.max(r, g, b);
        if (maxc < 44) continue;                      // drop the black background
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const type = lum > 185 ? 0 : lum > 125 ? 1 : lum > 75 ? 2 : 3;

        // tint slightly toward cream so it reads like the reference
        const k = 0.22;
        const col = `rgb(${q(r + (244 - r) * k)},${q(g + (238 - g) * k)},${q(b + (214 - b) * k)})`;

        // which part of the flower this cell belongs to
        const mn = Math.min(r, g, b);
        const sat = (maxc - mn) / (maxc || 1);
        let cls;
        if (g > r * 1.02 && g >= b * 0.9) cls = 'green';
        else if (r > 165 && g > 135 && b < 115 && r - b > 80) cls = 'yellow';
        else if (lum > 165 && sat < 0.3) cls = 'white';
        else if (y / sh > 0.66 && x / sw > 0.58) cls = 'bud';
        else cls = 'pink';

        const xn = (x - cx) / sh, yn = (sh / 2 - y) / sh;
        const part = partOf(cls, xn, yn);
        const z = depthOf(part, xn, yn, Math.random() - 0.5) * sh;

        // start position: scattered far around the flower
        const a = Math.random() * Math.PI * 2;
        const rad = sw * (0.8 + Math.random() * 1.6);
        const distC = Math.hypot(xn - C.x, yn - C.y);

        const p = {
          x: x - cx - axis, y: y - sh / 2, z,
          sx: Math.cos(a) * rad, sy: Math.sin(a) * rad * 0.8,
          d: Math.random() * 0.9 + distC * 0.8,        // delay
          rx: Math.cos(a), ry: Math.sin(a),             // scroll dispersion
          type,
          seed: (Math.random() * 997) | 0
        };
        assembleEnd = Math.max(assembleEnd, p.d + ASSEMBLE_DUR);
        add(col, p);

        // the bud is round: its back half gets particles too
        if (part === 'bud') {
          add(col, Object.assign({}, p, { z: (2 * BUD_Z * sh) - z, seed: (Math.random() * 997) | 0 }));
        }
        // body / tubes: copies straight behind (hidden from the front, visible from the side)
        extrude(part).forEach(off => {
          add(col, Object.assign({}, p, { z: z + off * sh, seed: (Math.random() * 997) | 0 }));
        });
      }
    }
    buckets = [...map.entries()].map(([color, items]) => ({ color, items }));

    // soft coloured glow under the particles
    // (black background → transparent, otherwise it shows as a dark box)
    const gw = sw * 2, gh = sh * 2;
    const keyed = document.createElement('canvas');
    keyed.width = gw; keyed.height = gh;
    const kc = keyed.getContext('2d', { willReadFrequently: true });
    kc.drawImage(img, 0, 0, gw, gh);
    const kd = kc.getImageData(0, 0, gw, gh);
    for (let i = 0; i < kd.data.length; i += 4) {
      const m = Math.max(kd.data[i], kd.data[i + 1], kd.data[i + 2]);
      kd.data[i + 3] = Math.max(0, Math.min(255, (m - 40) * 2.2));
    }
    kc.putImageData(kd, 0, 0);
    glow = document.createElement('canvas');
    glow.width = gw; glow.height = gh;
    const g = glow.getContext('2d');
    g.filter = 'blur(10px)';
    g.drawImage(keyed, 0, 0);

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(loop);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth * dpr;
    H = canvas.clientHeight * dpr;
    canvas.width = W; canvas.height = H;
  }

  /* ---------- cursor → rotation ---------- */
  function push(clientX, clientY) {
    if (lastX !== null) {
      const dx = clientX - lastX;
      targetVel = Math.max(-0.09, Math.min(0.09, dx * 0.0022));
      lastMove = performance.now();
    }
    lastX = clientX;
    mx = clientX / (window.innerWidth || 1);
    my = clientY / (window.innerHeight || 1);
  }
  window.addEventListener('mousemove', e => push(e.clientX, e.clientY), { passive: true });
  window.addEventListener('mouseleave', () => { targetVel = 0; lastX = null; });
  hero.addEventListener('touchstart', e => { lastX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchmove', e => push(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  hero.addEventListener('touchend', () => { targetVel = 0; lastX = null; });

  new IntersectionObserver(en => { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(hero);

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) return;
    if (startT === null) startT = now;
    const t = (now - startT) / 1000;
    frame++;

    if (!assembled && t > assembleEnd) assembled = true;

    // velocity damping: cursor stopped → no rotation
    if (now - lastMove > 70) targetVel = 0;
    vel += (targetVel - vel) * 0.12;
    if (Math.abs(vel) < 0.00005) vel = 0;
    if (assembled) {
      spin += vel;
      leanY += ((mx - 0.5) * 0.5 - leanY) * 0.06;   // turns a little toward the cursor
      leanX += ((my - 0.5) * 0.3 - leanX) * 0.06;
    }
    const yaw = spin + leanY, pitch = leanX;

    // scroll: flower drifts up & particles disperse while leaving the hero
    const sp = Math.max(0, Math.min(1, window.scrollY / (window.innerHeight || 1)));

    ctx.clearRect(0, 0, W, H);
    const s = Math.min(H * 0.8 / sh, W * 0.92 / sw);
    const ox = W / 2 + AXIS_X * sh * s;               // screen x of the rotation axis
    const oy = H / 2 + H * 0.02 - sp * H * 0.28;
    const ca = Math.cos(yaw), sa = Math.sin(yaw);
    const cb = Math.cos(pitch), sb = Math.sin(pitch);
    const F = sh * 2.4;                               // perspective (in photo sample units)

    // glow — squashed with the rotation
    const gA = Math.min(1, t / 2.6) * 0.42 * (1 - sp) * (0.4 + 0.6 * Math.abs(ca));
    if (gA > 0.01) {
      ctx.save();
      ctx.globalAlpha = gA;
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(ox, oy);
      ctx.scale(Math.max(0.25, Math.abs(ca)), 1);
      ctx.drawImage(glow, (-sw / 2 - AXIS_X * sh) * s, -sh * s / 2, sw * s, sh * s);
      ctx.restore();
    }

    const baseA = 1 - sp * 0.75;
    const gsz = s * 0.78;
    const line = Math.max(1, dpr * 0.9);
    const spread = sp * s * 70;

    for (let b = 0; b < buckets.length; b++) {
      const bucket = buckets[b];
      const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      let used = 0;
      const items = bucket.items;
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        // yaw (vertical axis), then pitch (horizontal axis; y is screen-down)
        const X1 = p.x * ca + p.z * sa;
        const Z1 = -p.x * sa + p.z * ca;
        const Y2 = p.y * cb + Z1 * sb;
        const Z2 = -p.y * sb + Z1 * cb;
        // perspective relative to the rest pose → from the front it is exactly the photo
        const pz = (F - p.z) / (F - Z2);
        let fx = ox + X1 * s * pz + p.rx * spread;
        let fy = oy + Y2 * s * pz + p.ry * spread;

        if (!assembled) {
          const k = easeOut(Math.max(0, Math.min(1, (t - p.d) / ASSEMBLE_DUR)));
          if (k <= 0) continue;
          const sx = ox + p.sx * s, sy = oy + p.sy * s;
          fx = sx + (fx - sx) * k;
          fy = sy + (fy - sy) * k;
        }

        // parts that turned away from the viewer get dimmer
        const dz = (Z2 - p.z) / sh;
        const band = dz < -0.12 ? 0 : dz < -0.05 ? 1 : dz < -0.015 ? 2 : 3;
        const path = paths[band];
        used |= 1 << band;

        const g = gsz * pz;
        // shimmer: a few cells flip to crosses each frame
        const type = ((p.seed + frame) % 131 === 0) ? 0 : p.type;
        switch (type) {
          case 0: // +
            path.rect(fx - g / 2, fy - line / 2, g, line);
            path.rect(fx - line / 2, fy - g / 2, line, g);
            break;
          case 1: // ▪
            path.rect(fx - g * 0.3, fy - g * 0.3, g * 0.6, g * 0.6);
            break;
          case 2: // –
            path.rect(fx - g / 2, fy - line / 2, g, line);
            break;
          default: // ·
            path.rect(fx - line * 0.6, fy - line * 0.6, line * 1.2, line * 1.2);
        }
      }
      ctx.fillStyle = bucket.color;
      for (let k = 0; k < 4; k++) {
        if (!(used & (1 << k))) continue;
        ctx.globalAlpha = baseA * BAND_ALPHA[k];
        ctx.fill(paths[k]);
      }
    }
    ctx.globalAlpha = 1;

    // HUD read-outs
    if (frame % 4 === 0) {
      if (rotOut) {
        const deg = Math.round(((yaw * 180 / Math.PI) % 360 + 360) % 360);
        rotOut.textContent = String(deg).padStart(3, '0') + '°';
      }
      if (partOut) {
        const shown = assembled ? total : Math.round(total * Math.min(1, t / assembleEnd));
        partOut.textContent = String(shown).padStart(4, '0');
      }
    }
  }
})();
