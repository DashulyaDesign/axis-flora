/* =========================================================
   PARTICLE FLOWER
   The photo (1.jpg) is sampled into a grid. Every non-black
   cell becomes a particle drawn as "+", "▪", "–" or "·" depending
   on its brightness (the look of "цветок из частиц 1.mp4").
   Particles fly in from all sides and assemble the flower.

   Rotation. abhishekjha.me does:
       rotation.y += (0.01 + g) * m
   where m = -1/+1 depending on the cursor's side of the screen and
   g grows with the distance from the centre. It never stops.
   Here the same idea is driven by the cursor *velocity* instead:
   moving left spins it left, moving right spins it right, and when
   the cursor stops the spin damps to zero.
   ========================================================= */
(function () {
  const canvas = document.getElementById('flowerCanvas');
  if (!canvas || !window.FLOWER_SRC) return;
  const ctx = canvas.getContext('2d');
  const hero = document.getElementById('hero');
  const rotOut = document.getElementById('rotReadout');
  const partOut = document.getElementById('partReadout');

  const SAMPLE_W = 118;       // grid columns sampled from the photo
  const ASSEMBLE_DUR = 1.7;   // seconds each particle travels
  const FOCAL = 1700;         // perspective focal length (device px)

  let W = 0, H = 0, dpr = 1;
  let sw = 0, sh = 0;
  let buckets = [];           // [{color, items: []}] batched by colour
  let total = 0;
  let glow = null;
  let startT = null, assembleEnd = 0, assembled = false;

  let angle = 0, vel = 0, targetVel = 0, lastMove = 0, lastX = null;
  let visible = true, frame = 0;

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
    const headY = sh * 0.3;           // centre of the blossom
    const map = new Map();
    const q = v => Math.min(255, Math.round(v / 20) * 20);

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const mx = Math.max(r, g, b);
        if (mx < 44) continue;                        // drop the black background
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const type = lum > 185 ? 0 : lum > 125 ? 1 : lum > 75 ? 2 : 3;

        // tint slightly toward cream so it reads like the reference
        const k = 0.22;
        const col = `rgb(${q(r + (244 - r) * k)},${q(g + (238 - g) * k)},${q(b + (214 - b) * k)})`;

        // depth: blossom is a shallow bowl (centre forward), stem gently curves
        const dx = (x - cx) / sw, dy = (y - headY) / sh;
        let z;
        if (y < sh * 0.6) z = (0.2 - Math.hypot(dx, dy * 0.9)) * 0.85;
        else z = Math.sin(y * 0.06) * 0.05;
        z = (z + (Math.random() - 0.5) * 0.05) * sw;

        // start position: scattered far around the flower
        const a = Math.random() * Math.PI * 2;
        const rad = sw * (0.8 + Math.random() * 1.6);
        const distC = Math.hypot(dx, dy);

        const p = {
          x: x - cx, y: y - sh / 2, z,
          sx: Math.cos(a) * rad, sy: Math.sin(a) * rad * 0.8,
          d: Math.random() * 0.9 + distC * 0.8,        // delay
          rx: Math.cos(a), ry: Math.sin(a),             // scroll dispersion
          type,
          seed: (Math.random() * 997) | 0
        };
        assembleEnd = Math.max(assembleEnd, p.d + ASSEMBLE_DUR);
        if (!map.has(col)) map.set(col, []);
        map.get(col).push(p);
        total++;
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
  function push(clientX) {
    if (lastX !== null) {
      const dx = clientX - lastX;
      targetVel = Math.max(-0.09, Math.min(0.09, dx * 0.0022));
      lastMove = performance.now();
    }
    lastX = clientX;
  }
  window.addEventListener('mousemove', e => push(e.clientX), { passive: true });
  window.addEventListener('mouseleave', () => { targetVel = 0; lastX = null; });
  hero.addEventListener('touchstart', e => { lastX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchmove', e => push(e.touches[0].clientX), { passive: true });
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
    if (assembled) angle += vel;

    // scroll: flower drifts up & particles disperse while leaving the hero
    const sp = Math.max(0, Math.min(1, window.scrollY / (window.innerHeight || 1)));

    ctx.clearRect(0, 0, W, H);
    const s = Math.min(H * 0.8 / sh, W * 0.92 / sw);
    const ox = W / 2;
    const oy = H / 2 + H * 0.02 - sp * H * 0.28;
    const ca = Math.cos(angle), sa = Math.sin(angle);

    // glow — squashed horizontally with the rotation
    const gA = Math.min(1, t / 2.6) * 0.42 * (1 - sp);
    if (gA > 0.01) {
      ctx.save();
      ctx.globalAlpha = gA;
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(ox, oy);
      ctx.scale(Math.max(0.1, Math.abs(ca)), 1);
      ctx.drawImage(glow, -sw * s / 2, -sh * s / 2, sw * s, sh * s);
      ctx.restore();
    }

    ctx.globalAlpha = 1 - sp * 0.75;
    const gsz = s * 0.78;
    const line = Math.max(1, dpr * 0.9);
    const spread = sp * s * 70;

    for (let b = 0; b < buckets.length; b++) {
      const bucket = buckets[b];
      ctx.fillStyle = bucket.color;
      ctx.beginPath();
      const items = bucket.items;
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        // rotate around vertical axis
        const X = p.x * ca + p.z * sa;
        const Z = -p.x * sa + p.z * ca;
        const pz = FOCAL / (FOCAL - Z * s);
        let fx = ox + X * s * pz + p.rx * spread;
        let fy = oy + p.y * s * pz + p.ry * spread;

        if (!assembled) {
          const k = easeOut(Math.max(0, Math.min(1, (t - p.d) / ASSEMBLE_DUR)));
          if (k <= 0) continue;
          const sx = ox + p.sx * s, sy = oy + p.sy * s;
          fx = sx + (fx - sx) * k;
          fy = sy + (fy - sy) * k;
        }

        const g = gsz * pz;
        // shimmer: a few cells flip to crosses each frame
        const type = ((p.seed + frame) % 131 === 0) ? 0 : p.type;
        switch (type) {
          case 0: // +
            ctx.rect(fx - g / 2, fy - line / 2, g, line);
            ctx.rect(fx - line / 2, fy - g / 2, line, g);
            break;
          case 1: // ▪
            ctx.rect(fx - g * 0.3, fy - g * 0.3, g * 0.6, g * 0.6);
            break;
          case 2: // –
            ctx.rect(fx - g / 2, fy - line / 2, g, line);
            break;
          default: // ·
            ctx.rect(fx - line * 0.6, fy - line * 0.6, line * 1.2, line * 1.2);
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // HUD read-outs
    if (frame % 4 === 0) {
      if (rotOut) {
        let deg = Math.round(((angle * 180 / Math.PI) % 360 + 360) % 360);
        rotOut.textContent = String(deg).padStart(3, '0') + '°';
      }
      if (partOut) {
        const shown = assembled ? total : Math.round(total * Math.min(1, t / assembleEnd));
        partOut.textContent = String(shown).padStart(4, '0');
      }
    }
  }
})();
