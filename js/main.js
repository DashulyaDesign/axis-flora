/* =========================================================
   AXIS FLORA — main interactions
   ========================================================= */
(() => {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = gsap.utils.random;

  // seeded random, so generated patterns look the same on every visit
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* =======================================================
     GRAIN — 1:1 port of the noise from abhishekjha.me
     (their main-*.js: a fixed <canvas class="noise-overlay">,
     a 300×300 tile of random grey pixels with alpha 18/255,
     regenerated every 3rd frame and tiled with createPattern)
     ======================================================= */
  (function grain({ patternSize = 250, patternScaleX = 1, patternScaleY = 1, patternRefreshInterval = 2, patternAlpha = 15 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.className = 'noise-overlay';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;
    const pctx = patternCanvas.getContext('2d');
    const imageData = pctx.createImageData(patternSize, patternSize);
    const len = patternSize * patternSize * 4;
    let frame = 0;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(patternScaleX, patternScaleY);
    };
    const updatePattern = () => {
      for (let i = 0; i < len; i += 4) {
        const v = Math.random() * 255;
        imageData.data[i] = v;
        imageData.data[i + 1] = v;
        imageData.data[i + 2] = v;
        imageData.data[i + 3] = patternAlpha;
      }
      pctx.putImageData(imageData, 0, 0);
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ctx.createPattern(patternCanvas, 'repeat');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    const loop = () => {
      if (frame % patternRefreshInterval === 0) { updatePattern(); draw(); }
      frame++;
      requestAnimationFrame(loop);
    };
    window.addEventListener('resize', resize);
    resize();
    loop();
  })({ patternSize: 300, patternScaleX: 1, patternScaleY: 1, patternRefreshInterval: 3, patternAlpha: 18 });

  /* =======================================================
     SMOOTH SCROLL (Lenis) + ScrollTrigger
     ======================================================= */
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  function goTo(target) {
    lenis.start();
    const el = target === '#hero' ? 0 : $(target);
    lenis.scrollTo(el, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4), force: true });
  }

  /* =======================================================
     HEADER «шторка» — exactly like abhishekjha.me:
       window.scroll → .nav>div>span>span
       scrolling down → y:"-100%", up → y:"0%" (0.5s, power2.out)
     every line slides inside its own overflow:hidden mask.
     Plus: it comes back when the cursor enters the top strip.
     ======================================================= */
  const hdrLines = $$('.nav > div > span > span');
  let lastScroll = 0, inZone = false, hdrHidden = false;
  function curtain(hide) {
    if (hide === hdrHidden) return;
    hdrHidden = hide;
    gsap.to(hdrLines, { y: hide ? '-100%' : '0%', duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
  }
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (!inZone) curtain(y > lastScroll && y > 10);
    lastScroll = y;
  }, { passive: true });
  window.addEventListener('mousemove', e => {
    const z = e.clientY < 110;
    if (z && !inZone) { inZone = true; curtain(false); }
    else if (!z && inZone) { inZone = false; if (window.scrollY > 80) curtain(true); }
  }, { passive: true });

  /* =======================================================
     MENU — glass pearl button, circular reveal from the button
     ======================================================= */
  const menuBtn = $('#menuBtn');
  const menu = $('#menu');
  const menuLinks = $$('.menu__list a');
  const menuFoot = $('.menu__foot');
  let menuOpen = false;

  // the pearl tilts toward the cursor like a real glass bead
  const tilt = (x, y) => gsap.to(menuBtn, { '--rx': `${x}deg`, '--ry': `${y}deg`, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
  menuBtn.addEventListener('pointermove', e => {
    const r = menuBtn.getBoundingClientRect();
    tilt(-((e.clientY - r.top) / r.height - 0.5) * 30, ((e.clientX - r.left) / r.width - 0.5) * 30);
  });
  menuBtn.addEventListener('pointerleave', () => tilt(0, 0));

  function menuCircle(r) {
    const b = menuBtn.getBoundingClientRect();
    return `circle(${r}px at ${b.left + b.width / 2}px ${b.top + b.height / 2}px)`;
  }
  function openMenu() {
    menuOpen = true;
    lenis.stop();
    menuBtn.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close menu');
    menu.setAttribute('aria-hidden', 'false');
    const R = Math.hypot(innerWidth, innerHeight) * 1.05;
    gsap.killTweensOf([menu, menuLinks, menuFoot]);
    gsap.set(menu, { visibility: 'visible' });
    gsap.fromTo(menu, { clipPath: menuCircle(0) }, { clipPath: menuCircle(R), duration: 1.1, ease: 'expo.inOut' });
    gsap.fromTo(menuLinks, { yPercent: 115, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.45 });
    gsap.fromTo(menuFoot, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.8 });
  }
  function closeMenu() {
    menuOpen = false;
    menuBtn.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
    menu.setAttribute('aria-hidden', 'true');
    gsap.killTweensOf([menu, menuLinks, menuFoot]);
    gsap.to(menuLinks, { yPercent: -115, duration: 0.45, stagger: 0.04, ease: 'power3.in' });
    gsap.to(menuFoot, { opacity: 0, duration: 0.3 });
    gsap.to(menu, {
      clipPath: menuCircle(0), duration: 0.8, ease: 'expo.inOut', delay: 0.25,
      onComplete: () => gsap.set(menu, { visibility: 'hidden' })
    });
    lenis.start();
  }
  menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));

  $$('.js-nav').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const target = a.dataset.target || a.getAttribute('href');
    if (menuOpen) { closeMenu(); setTimeout(() => goTo(target), 350); }
    else goTo(target);
  }));

  /* =======================================================
     BLOCK 2 — vector flower icons (from "цветок вектор узор.png")
     ======================================================= */
  function blobPath(cx, cy, R, fn, steps = 200) {
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * Math.PI * 2;
      const r = R * fn(th);
      const x = cx + r * Math.cos(th - Math.PI / 2);
      const y = cy + r * Math.sin(th - Math.PI / 2);
      d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d + 'Z';
  }
  function flowerIcon() {
    const petals = blobPath(50, 50, 46, th =>
      0.72 + 0.28 * Math.pow(Math.abs(Math.cos(2.5 * th)), 0.65) + 0.035 * Math.sin(th * 3 + 1.2));
    const center = blobPath(50, 50, 15, th => 1 + 0.08 * Math.sin(th * 4 + 0.5) + 0.05 * Math.cos(th * 7));
    const dot = blobPath(50, 50, 6.5, th => 0.72 + 0.28 * Math.abs(Math.cos(3 * th)));
    return `<svg viewBox="0 0 100 100"><path d="${petals}" fill="#613c4e"/><path d="${center}" fill="#fbf7f9"/><path d="${dot}" fill="#613c4e"/></svg>`;
  }

  /* 3.jpg-like pattern: blossoms on dark plum, torn by vertical streaks */
  function drawPattern(cv) {
    const w = cv.width = Math.max(600, Math.round(cv.clientWidth));
    const h = cv.height = Math.max(400, Math.round(cv.clientHeight));
    const g = cv.getContext('2d');
    const rnd = mulberry32(42);
    g.fillStyle = '#1c0d16';
    g.fillRect(0, 0, w, h);

    const blossom = (x, y, R, rot, col) => {
      g.fillStyle = col;
      g.beginPath();
      for (let i = 0; i <= 90; i++) {
        const th = (i / 90) * Math.PI * 2;
        const r = R * (0.62 + 0.38 * Math.pow(Math.abs(Math.cos(2.5 * th)), 0.6)) * (0.92 + rnd() * 0.16);
        const px = x + r * Math.cos(th + rot), py = y + r * Math.sin(th + rot);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.fill();
      if (rnd() < 0.6) { g.fillStyle = '#1c0d16'; g.beginPath(); g.arc(x, y, R * 0.12, 0, 7); g.fill(); }
    };
    const cols = ['#e8b3bd', '#eab9c2', '#e3a7b4', '#e8b3bd', '#c9a3d6', '#a9cf87'];
    const n = Math.round((w * h) / 8000);
    for (let i = 0; i < n; i++) {
      const edge = rnd() < 0.3;                       // heavier clusters on the edges, like the reference
      const x = edge ? (rnd() < 0.5 ? rnd() * w * 0.18 : w - rnd() * w * 0.12) : rnd() * w;
      const y = rnd() * h;
      g.globalAlpha = 0.8 + rnd() * 0.2;
      blossom(x, y, w * (0.012 + rnd() * 0.03), rnd() * 6, cols[(rnd() * cols.length) | 0]);
    }
    g.globalAlpha = 1;

    // vertical glitch streaks
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    tmp.getContext('2d').drawImage(cv, 0, 0);
    for (let x = 0; x < w;) {
      const sw = 2 + ((rnd() * 10) | 0);
      if (rnd() < 0.55) g.drawImage(tmp, x, 0, sw, h, x, (rnd() - 0.35) * h * 0.14, sw, h);
      x += sw;
    }
    // pixel smears: one row stretched into a block
    for (let i = 0; i < 70; i++) {
      const bw = 6 + rnd() * 40, bx = rnd() * w, by = rnd() * h;
      g.drawImage(tmp, bx, by, bw, 3, bx, by, bw, 10 + rnd() * 70);
    }
    // thin vertical lines
    for (let i = 0; i < w / 5; i++) {
      g.globalAlpha = 0.3 + rnd() * 0.5;
      g.fillStyle = rnd() < 0.8 ? '#1c0d16' : '#f7f1f4';
      const y0 = rnd() < 0.5 ? 0 : rnd() * h;
      g.fillRect(rnd() * w, y0, 1, h - y0);
    }
    // dust
    g.fillStyle = '#1c0d16';
    for (let i = 0; i < (w * h) / 300; i++) {
      g.globalAlpha = rnd();
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    g.globalAlpha = 1;
    return cv.toDataURL('image/jpeg', 0.8);
  }

  /* =======================================================
     BLOCK 2 — white haze. The cursor blows it away where it
     passes, then it slowly drifts back. Low-res canvas:
     two drifting layers of soft blobs minus a "cleared" mask.
     ======================================================= */
  function initFog() {
    const cv = $('#fogCanvas');
    const stage = $('.rhythm__stage');
    const ctx = cv.getContext('2d');
    const SCALE = 0.25;
    const state = { thick: 0 };            // 0 = light haze, 1 = dense (animated on scroll)
    let w = 0, h = 0, t = 0, visible = false, last = null;

    // tileable texture of soft white blobs
    const tex = document.createElement('canvas');
    tex.width = 512; tex.height = 256;
    const tg = tex.getContext('2d');
    const rnd = mulberry32(7);
    for (let i = 0; i < 150; i++) {
      const x = rnd() * 512, y = rnd() * 256, r = 18 + rnd() * 80, a = 0.05 + rnd() * 0.13;
      for (const dx of [-512, 0, 512]) {
        const gr = tg.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        gr.addColorStop(0, `rgba(255,255,255,${a})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        tg.fillStyle = gr;
        tg.fillRect(x + dx - r, y - r, r * 2, r * 2);
      }
    }
    const mask = document.createElement('canvas');
    const mg = mask.getContext('2d');

    function resize() {
      w = cv.width = mask.width = Math.max(64, Math.round(stage.clientWidth * SCALE));
      h = cv.height = mask.height = Math.max(40, Math.round(stage.clientHeight * SCALE));
    }
    resize();
    window.addEventListener('resize', resize);

    function brush(x, y) {
      const R = 110 * SCALE;
      const gr = mg.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(0,0,0,0.85)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      mg.fillStyle = gr;
      mg.fillRect(x - R, y - R, R * 2, R * 2);
    }
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      const p = { x: (e.clientX - r.left) * SCALE, y: (e.clientY - r.top) * SCALE };
      const a = last || p;
      const n = Math.max(1, Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / 4));
      for (let i = 1; i <= n; i++) brush(a.x + (p.x - a.x) * (i / n), a.y + (p.y - a.y) * (i / n));
      last = p;
    });
    stage.addEventListener('pointerleave', () => { last = null; });

    new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(stage);

    gsap.ticker.add((time, dt) => {
      if (!visible) return;
      t += dt / 1000;
      // the cleared areas slowly fill with haze again
      mg.globalCompositeOperation = 'destination-out';
      mg.fillStyle = 'rgba(0,0,0,0.012)';
      mg.fillRect(0, 0, w, h);
      mg.globalCompositeOperation = 'source-over';

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(255,255,255,${0.04 + state.thick * 0.6})`;
      ctx.fillRect(0, 0, w, h);
      const tw1 = w * 1.4, o1 = (t * 7) % tw1;
      ctx.globalAlpha = 0.75;
      ctx.drawImage(tex, -o1, 0, tw1, h);
      ctx.drawImage(tex, tw1 - o1, 0, tw1, h);
      const tw2 = w * 2.2, o2 = (t * 4) % tw2;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(tex, o2 - tw2, -h * 0.15, tw2, h * 1.3);
      ctx.drawImage(tex, o2, -h * 0.15, tw2, h * 1.3);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    });
    return state;
  }

  /* =======================================================
     BLOCK 2 — "green space specialist" is there when the block
     opens and slowly dissolves while the cursor moves over the
     block: letters near the cursor melt faster, the rest slowly.
     It comes back every time the block is entered again.
     ======================================================= */
  function initScriptDissolve() {
    const el = $('.rhythm__script');
    const stage = $('.rhythm__stage');
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map(c => c === ' '
      ? '<span class="sc sp" aria-hidden="true">&nbsp;</span>'
      : `<span class="sc" aria-hidden="true">${c}</span>`).join('');
    const chars = $$('.sc:not(.sp)', el);
    const state = chars.map(() => ({ d: 0, shown: -1 }));
    let last = null;

    function render() {
      chars.forEach((c, i) => {
        const d = state[i].d;
        if (Math.abs(d - state[i].shown) < 0.003) return;
        state[i].shown = d;
        c.style.opacity = (1 - d).toFixed(3);
        c.style.filter = d > 0.01 ? `blur(${(d * 10).toFixed(2)}px)` : 'none';
        c.style.transform = `translateY(${(-d * 22).toFixed(1)}px)`;
      });
    }
    stage.addEventListener('pointermove', e => {
      if (last) {
        const move = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        chars.forEach((c, i) => {
          const r = c.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          const near = Math.exp(-(dx * dx + dy * dy) / (2 * 170 * 170));
          state[i].d = Math.min(1, state[i].d + move * (0.00006 + 0.00035 * near));
        });
        render();
      }
      last = { x: e.clientX, y: e.clientY };
    });
    stage.addEventListener('pointerleave', () => { last = null; });

    const reset = () => gsap.to(state, { d: 0, duration: 1.4, ease: 'power2.out', overwrite: true, onUpdate: render });
    ScrollTrigger.create({ trigger: '#rhythm', start: 'top 85%', onEnter: reset, onEnterBack: reset });
  }

  /* =======================================================
     BLOCK 4 — "services" made of particles. Where the cursor
     passes, the letters fall apart into dust that slowly drifts
     back (reference: "анимация services.mp4").
     ======================================================= */
  function initServiceTitle() {
    const cv = $('#svcCanvas');
    const section = $('#services');
    const ctx = cv.getContext('2d');
    const WORD = 'services';
    const SOLID = 0xFFF4F1F7;            // ABGR: #f7f1f4, opaque
    let W = 0, H = 0, dpr = 1, step = 2, parts = [], img = null, buf = null;
    let maxOff = 999, visible = false, entered = false, settled = false;
    const mouse = { x: -1e5, y: -1e5, vx: 0, vy: 0, t: 0 };

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = Math.max(10, Math.round(cv.clientWidth * dpr));
      H = cv.height = Math.max(10, Math.round(cv.clientHeight * dpr));
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const o = off.getContext('2d', { willReadFrequently: true });
      o.font = '500 100px "Cormorant SC"';
      const m100 = o.measureText(WORD);
      const k = Math.min((W * 0.94) / m100.width,
        (H * 0.86) / ((m100.actualBoundingBoxAscent + m100.actualBoundingBoxDescent) || 50));
      const fs = 100 * k;
      o.font = `500 ${fs}px "Cormorant SC"`;
      const m = o.measureText(WORD);
      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'alphabetic';
      o.fillText(WORD, W / 2, H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
      const d = o.getImageData(0, 0, W, H).data;
      step = Math.max(1, Math.round(dpr * 1.25));
      parts = [];
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (d[(y * W + x) * 4 + 3] > 110) parts.push({ hx: x, hy: y, x, y, vx: 0, vy: 0 });
        }
      }
      img = ctx.createImageData(W, H);
      buf = new Uint32Array(img.data.buffer);
      maxOff = 999; settled = false;
      if (!entered) scatter(0.35);
    }

    function scatter(power) {
      parts.forEach(p => {
        p.x = p.hx + (Math.random() - 0.5) * 160 * dpr * power;
        p.y = p.hy + (Math.random() - 0.5) * 90 * dpr * power;
      });
      maxOff = 999; settled = false;
    }
    function settle() {
      parts.forEach(p => { p.x = p.hx; p.y = p.hy; p.vx = 0; p.vy = 0; });
    }

    function update() {
      const R = 75 * dpr, R2 = R * R;
      const active = performance.now() - mouse.t < 120;
      let mo = 0;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1, f = 1 - d / R;
            p.vx += (dx / d) * f * 2.2 - (dy / d) * f * 1.3 + mouse.vx * f * 0.22 + (Math.random() - 0.5) * f * 3;
            p.vy += (dy / d) * f * 2.2 + (dx / d) * f * 1.3 + mouse.vy * f * 0.22 + (Math.random() - 0.5) * f * 3;
          }
        }
        const ox = p.hx - p.x, oy = p.hy - p.y;
        const off = Math.abs(ox) + Math.abs(oy);
        p.vx += ox * 0.009; p.vy += oy * 0.009;
        if (off > 6) { p.vx += (Math.random() - 0.5) * 0.3; p.vy += (Math.random() - 0.5) * 0.3; }
        p.vx *= 0.9; p.vy *= 0.9;
        p.x += p.vx; p.y += p.vy;
        if (off > mo) mo = off;
      }
      maxOff = mo;
      mouse.vx *= 0.85; mouse.vy *= 0.85;
    }

    function draw() {
      buf.fill(0);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const xi = p.x | 0, yi = p.y | 0;
        if (xi < 0 || yi < 0 || xi >= W - step || yi >= H - step) continue;
        const off = Math.abs(p.x - p.hx) + Math.abs(p.y - p.hy);
        const col = off < 1.5 ? SOLID : (off > 40 ? 0x88F4F1F7 : 0xCCF4F1F7);
        if (off < 1.5 || dpr > 1) {
          for (let yy = 0; yy < step; yy++) {
            const row = (yi + yy) * W + xi;
            for (let xx = 0; xx < step; xx++) buf[row + xx] = col;
          }
        } else {
          buf[yi * W + xi] = col;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    section.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
      if (performance.now() - mouse.t < 100) { mouse.vx = x - mouse.x; mouse.vy = y - mouse.y; }
      mouse.x = x; mouse.y = y; mouse.t = performance.now();
    });
    section.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e5; });

    new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(cv);
    ScrollTrigger.create({
      trigger: section, start: 'top 70%', once: true,
      onEnter: () => { entered = true; settled = false; }
    });

    let rT;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(build, 200); });

    build();
    draw();
    // physics runs in fixed ~60 Hz steps, so the dust settles at the same speed on any screen
    gsap.ticker.add((time, dt) => {
      if (!visible || !entered) return;
      const active = performance.now() - mouse.t < 120;
      if (!active && maxOff < 1.2) {
        if (!settled) { settle(); draw(); settled = true; }
        return;
      }
      settled = false;
      const steps = Math.min(4, Math.max(1, Math.round(dt / 16.7)));
      for (let s = 0; s < steps; s++) update();
      draw();
    });
  }

  /* =======================================================
     PROJECT PHOTOS (free CC0 photos from StockSnap — replace
     with your own work: same size, just swap the files)
     ======================================================= */
  const PROJECT_PHOTOS = Array.from({ length: 12 }, (_, i) => `img/projects/${String(i + 1).padStart(2, '0')}.jpg`);

  /* =======================================================
     SERVICES
     ======================================================= */
  const SERVICES = [
    'Landscaping of a private property',
    'Office landscaping',
    'Landscaping of the entrance area',
    'Terrace landscaping',
    'Landscaping for events',
    'Custom-made flowers and planters',
    'Plant care'
  ];
  let activeService = SERVICES[0];

  /* =======================================================
     INIT after fonts are ready (so measurements are correct)
     ======================================================= */
  const fontsReady = Promise.race([
    Promise.all([document.fonts.ready, document.fonts.load('500 100px "Cormorant SC"')]),
    new Promise(r => setTimeout(r, 4000))
  ]);
  fontsReady.then(init);

  function splitChars(el, text) {
    el.innerHTML = [...text].map(c => c === ' ' ? '<span class="ch">&nbsp;</span>' : `<span class="ch">${c}</span>`).join('');
    return $$('.ch', el);
  }

  function smallTitle(el) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%' } });
    tl.from(el.querySelector('span'), { yPercent: 100, opacity: 0, letterSpacing: '0.6em', duration: 1.1, ease: 'expo.out' })
      .from(el.querySelectorAll('.leaf'), { scale: 0, opacity: 0, duration: 0.9, ease: 'back.out(3)', stagger: 0.08 }, 0.2);
  }

  function init() {
    /* ---------- HERO intro ---------- */
    const heroLines = SplitText.create('.hero__tagline', { type: 'lines', mask: 'lines' });
    gsap.set(hdrLines, { y: '100%' });
    gsap.timeline({ delay: 0.2 })
      .to(hdrLines, { y: '0%', duration: 1, stagger: 0.1, ease: 'expo.out' })
      .fromTo(menuBtn, { '--s': 0, '--r': '-200deg' }, { '--s': 1, '--r': '0deg', duration: 1.4, ease: 'expo.out' }, 0.3)
      .from('.hud__line--v', { scaleY: 0, duration: 1.6, ease: 'expo.inOut' }, 0.8)
      .from('.hud__line--h1, .hud__line--h2', { scaleX: 0, duration: 1.6, stagger: 0.2, ease: 'expo.inOut' }, 1)
      .from('.hud__tag', { opacity: 0, x: -14, duration: 0.8, stagger: 0.15 }, 1.6)
      .from(heroLines.lines, { yPercent: 110, duration: 1.2, stagger: 0.12, ease: 'expo.out' }, 2.2);

    gsap.to('.hero__tagline, .hud', {
      yPercent: -40, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    /* ---------- BLOCK 2 · LIVELY RHYTHM ---------- */
    $$('.rhythm__row').forEach(r => splitChars(r, r.dataset.text));
    $$('.ficon').forEach(f => (f.innerHTML = flowerIcon()));

    // once per second: left one clockwise, right one counter-clockwise
    gsap.timeline({ repeat: -1 })
      .to('.ficon--left svg', { rotation: '+=72', duration: 0.6, ease: 'back.out(2)' }, 0)
      .to('.ficon--right svg', { rotation: '-=72', duration: 0.6, ease: 'back.out(2)' }, 0)
      .to({}, { duration: 0.4 });

    const patternCv = $('#patternCanvas');
    const patternURL = drawPattern(patternCv);
    $('#about').style.setProperty('--pattern', `url(${patternURL})`);
    const fog = initFog();

    gsap.set('.rhythm__script', { xPercent: -50, yPercent: -50 });
    initScriptDissolve();
    const chars = $$('#lively .ch');

    gsap.from(chars, {
      yPercent: 100, opacity: 0, duration: 1.1, stagger: 0.04, ease: 'expo.out',
      scrollTrigger: { trigger: '#rhythm', start: 'top 70%' }
    });
    gsap.from('.rhythm__script', {
      opacity: 0, filter: 'blur(12px)', duration: 1.6, ease: 'power2.out', delay: 0.5,
      scrollTrigger: { trigger: '#rhythm', start: 'top 60%' }
    });

    // the phrase dissolves into the haze (no scaling), then the big letters
    // slowly melt, spread and deform (the longest part of the scroll),
    // fall apart, and the 3.jpg-like pattern takes over
    const melt = gsap.timeline({
      scrollTrigger: { trigger: '#rhythm', start: 'top top', end: '+=380%', pin: true, scrub: 1.6 }
    });
    melt
      .to(fog, { thick: 0.5, duration: 0.5, ease: 'power1.inOut' }, 0)
      .to('.rhythm__script', { opacity: 0, filter: 'blur(16px)', duration: 0.55, ease: 'power1.in' }, 0.02)
      .to('#meltMap', { attr: { scale: 240 }, duration: 2.3, ease: 'sine.inOut' }, 0.2)
      .to('#meltNoise', { attr: { baseFrequency: '0.002 0.14' }, duration: 2.3, ease: 'sine.inOut' }, 0.2)
      .to(chars, {
        scaleY: () => rand(1.8, 4.2),
        scaleX: () => rand(0.6, 1.4),
        y: () => rand(-10, 45) + 'vh',
        x: () => rand(-10, 10) + 'vw',
        rotation: () => rand(-18, 18),
        transformOrigin: '50% 0%',
        duration: 1.8,
        ease: 'sine.inOut',
        stagger: { each: 0.035, from: 'random' }
      }, 0.35)
      .to(chars, { opacity: 0, duration: 0.8, ease: 'power1.in', stagger: { each: 0.035, from: 'random' } }, 1.55)
      .to('.ficon', { y: 60, opacity: 0, duration: 0.6 }, 0.5)
      .to(fog, { thick: 0.2, duration: 0.6, ease: 'power1.inOut' }, 0.8)
      .fromTo(patternCv, { clipPath: 'inset(100% 0% 0% 0%)', scaleY: 1.25, transformOrigin: '50% 100%' },
        { clipPath: 'inset(0% 0% 0% 0%)', scaleY: 1, duration: 1, ease: 'power1.inOut' }, 2.2);

    /* ---------- BLOCK 3 · ABOUT ---------- */
    $$('.small-title').forEach(smallTitle);
    const read = SplitText.create('.js-read', { type: 'lines,words', mask: 'lines', wordsClass: 'word' });
    gsap.from(read.lines, {
      yPercent: 105, duration: 1.1, stagger: 0.06, ease: 'expo.out',
      scrollTrigger: { trigger: '.js-read', start: 'top 85%' }
    });
    // words light up while reading (dim → white, like the reference)
    gsap.to(read.words, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: '.js-read', start: 'top 72%', end: 'bottom 42%', scrub: true }
    });
    $$('.js-lines').forEach(el => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
      gsap.from(split.lines, {
        yPercent: 110, rotateX: -50, transformOrigin: '50% 0%', duration: 1.1, stagger: 0.08, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 82%' }
      });
    });

    /* ---------- HORIZONTAL SCROLL ---------- */
    const track = $('.hs__track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const SPEED = 1.35; // >1 → horizontal travel is faster than the vertical scroll
    const hsTween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: '#paths',
        start: 'top top',
        end: () => '+=' + dist() / SPEED,
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: self => gsap.set('.hs__progress span', { scaleX: self.progress })
      }
    });
    gsap.from('.hs__intro > *', {
      y: 60, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: '#paths', start: 'top 70%' }
    });
    $$('.slide').forEach(sl => {
      const ca = { containerAnimation: hsTween, trigger: sl, scrub: true };
      gsap.from(sl, { yPercent: 16, rotation: 3, opacity: 0.2, ease: 'none', scrollTrigger: { ...ca, start: 'left 100%', end: 'left 62%' } });
      gsap.fromTo(sl.querySelector('.slide__photo'),
        { clipPath: 'inset(0% 100% 0% 0% round 18px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none', scrollTrigger: { ...ca, start: 'left 92%', end: 'left 58%' } });
      gsap.fromTo(sl.querySelector('.slide__photo img'),
        { xPercent: -6, scale: 1.18 },
        { xPercent: 6, scale: 1.02, ease: 'none', scrollTrigger: { ...ca, start: 'left 100%', end: 'right 0%' } });
      gsap.from(sl.querySelectorAll('.slide__txt > *'), {
        x: 60, opacity: 0, stagger: 0.12, ease: 'none', scrollTrigger: { ...ca, start: 'left 85%', end: 'left 62%' }
      });
    });

    /* ---------- BLOCK 4 · SERVICES ---------- */
    initServiceTitle();
    gsap.from('.svc__box, #orderBtn', {
      y: 50, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out', delay: 0.3,
      scrollTrigger: { trigger: '#services', start: 'top 60%' }
    });
    gsap.from('.svc__view', {
      x: -40, opacity: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: '.svc__view', start: 'top 95%' }
    });
    initServiceBox();

    /* ---------- BLOCK 5 · PROJECTS ---------- */
    initProjects();
    // the big outlined "projects" always fits the screen width (whole word visible)
    const ghost = $('.prj__ghost'), ghostWord = $('.prj__ghost span');
    const fitGhost = () => {
      ghost.style.fontSize = '100px';
      ghost.style.fontSize = (100 * ghost.clientWidth * 0.94 / ghostWord.getBoundingClientRect().width) + 'px';
    };
    fitGhost();
    window.addEventListener('resize', fitGhost);
    gsap.from('.prj__ghost', {
      yPercent: 40, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#projects', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });

    /* ---------- BLOCK 6 · CONTACT ---------- */
    const phone = SplitText.create('.contact__phone', { type: 'chars', mask: 'chars' });
    const logo = SplitText.create('.contact__logo', { type: 'chars', mask: 'chars' });
    const ct = gsap.timeline({ scrollTrigger: { trigger: '#contact', start: 'top 65%' } });
    ct.from(phone.chars, { yPercent: 115, duration: 1.1, stagger: 0.025, ease: 'expo.out' }, 0.2)
      .from('.contact__mail', { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.7)
      .from('.contact__social li', { scale: 0, rotate: -90, duration: 0.9, stagger: 0.1, ease: 'back.out(2)' }, 0.85);
    gsap.timeline({ scrollTrigger: { trigger: '.contact__brand', start: 'top 95%' } })
      .from(logo.chars, { yPercent: 110, duration: 1.2, stagger: 0.05, ease: 'expo.out' })
      .from('.brand-leaf--l', { x: 60, scale: 0, opacity: 0, duration: 1.1, ease: 'back.out(2)' }, 0.3)
      .from('.brand-leaf--r', { x: -60, scale: 0, opacity: 0, duration: 1.1, ease: 'back.out(2)' }, 0.3);

    ScrollTrigger.refresh();
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* =======================================================
     Infinite service list — no visible container; the scroll
     is shown by motion: items roll on a drum (rotateX), blur
     and fade toward the edges, flowers mark the centre one
     ======================================================= */
  function initServiceBox() {
    const box = $('#svcBox');
    const list = $('#svcList');
    const COPIES = 5;
    let html = '';
    for (let c = 0; c < COPIES; c++) {
      SERVICES.forEach((s, i) => { html += `<li data-i="${i}"><span class="flw">✿</span><span>${s}</span><span class="flw">✿</span></li>`; });
    }
    list.innerHTML = html;
    const items = [...list.children];
    let setH = 0, cur = 0, target = 0, animating = false, snapT = null, activeLi = null;

    const measure = () => { setH = items[SERVICES.length].offsetTop - items[0].offsetTop; };
    const centerOf = li => li.offsetTop + li.offsetHeight / 2 - box.clientHeight / 2;

    // keep scrollTop inside copies 2–4 → never reaches an edge, so it loops forever
    const wrap = () => {
      if (cur < setH) { cur += setH; target += setH; }
      else if (cur > setH * 3) { cur -= setH; target -= setH; }
    };

    function highlight() {
      const mid = box.scrollTop + box.clientHeight / 2;
      const half = box.clientHeight / 2;
      let best = null, bestD = Infinity;
      items.forEach(li => {
        const c = li.offsetTop + li.offsetHeight / 2;
        const rel = (c - mid) / half;
        const d = Math.min(1.3, Math.abs(rel));
        if (d > 1.25) { li.style.opacity = '0'; return; }
        li.style.opacity = Math.max(0, 1 - d * 0.92).toFixed(3);
        li.style.transform = `perspective(700px) rotateX(${(-rel * 50).toFixed(2)}deg) scale(${(1 - d * 0.12).toFixed(3)})`;
        li.style.filter = d > 0.08 ? `blur(${(d * 1.8).toFixed(2)}px)` : 'none';
        if (Math.abs(c - mid) < bestD) { bestD = Math.abs(c - mid); best = li; }
      });
      if (best !== activeLi) {
        if (activeLi) activeLi.classList.remove('is-active');
        best.classList.add('is-active');
        activeLi = best;
        activeService = SERVICES[+best.dataset.i];
      }
    }

    function snap() {
      const mid = target + box.clientHeight / 2;
      let bestLi = items[0], bestD = Infinity;
      items.forEach(li => {
        const d = Math.abs(li.offsetTop + li.offsetHeight / 2 - mid);
        if (d < bestD) { bestD = d; bestLi = li; }
      });
      target = centerOf(bestLi);
      animating = true;
    }

    measure();
    cur = target = centerOf(items[SERVICES.length * 2]);
    box.scrollTop = cur;
    highlight();

    box.addEventListener('wheel', e => {
      e.preventDefault();
      e.stopPropagation();
      target += e.deltaY * (e.deltaMode === 1 ? 40 : 1);
      animating = true;
      clearTimeout(snapT);
      snapT = setTimeout(snap, 180);
    }, { passive: false });

    // touch / keyboard native scrolling
    box.addEventListener('scroll', () => {
      if (!animating) {
        if (box.scrollTop < setH) box.scrollTop += setH;
        else if (box.scrollTop > setH * 3) box.scrollTop -= setH;
        cur = target = box.scrollTop;
      }
      highlight();
    }, { passive: true });

    box.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        target += e.key === 'ArrowDown' ? items[0].offsetHeight : -items[0].offsetHeight;
        animating = true;
        clearTimeout(snapT); snapT = setTimeout(snap, 180);
      }
    });

    list.addEventListener('click', e => {
      const li = e.target.closest('li');
      if (!li) return;
      target = centerOf(li);
      animating = true;
    });

    gsap.ticker.add(() => {
      if (!animating) return;
      cur += (target - cur) * 0.14;
      wrap();
      if (Math.abs(target - cur) < 0.4) { cur = target; animating = false; }
      box.scrollTop = cur;
    });

    window.addEventListener('resize', () => { measure(); cur = target = box.scrollTop; highlight(); });

    initOrderModal();
  }

  /* =======================================================
     Droplet buttons: when pressed they wobble a little,
     barely visible, like a drop of water
     ======================================================= */
  function wobble(el) {
    gsap.timeline()
      .to(el, { scaleX: 1.05, scaleY: 0.95, duration: 0.09, ease: 'power1.out', overwrite: 'auto' })
      .to(el, { scaleX: 0.97, scaleY: 1.03, duration: 0.13, ease: 'sine.inOut' })
      .to(el, { scaleX: 1.018, scaleY: 0.985, duration: 0.13, ease: 'sine.inOut' })
      .to(el, { scaleX: 0.995, scaleY: 1.005, duration: 0.13, ease: 'sine.inOut' })
      .to(el, { scaleX: 1, scaleY: 1, duration: 0.16, ease: 'sine.out' });
  }
  $$('.drop-btn').forEach(b => b.addEventListener('click', () => wobble(b)));

  /* =======================================================
     Order modal → e-mail via FormSubmit
     (sends to i@tsypkina-work.ru; the very first submission
     triggers a one-time activation e-mail from FormSubmit)
     ======================================================= */
  function initOrderModal() {
    const ORDER_EMAIL = 'i@tsypkina-work.ru';
    const modal = $('#orderModal');
    const panel = $('.modal__panel', modal);
    const backdrop = $('.modal__backdrop', modal);
    const form = $('#orderForm');
    const status = $('#orderStatus');
    const submit = $('#orderSubmit');
    const F = form.elements;
    let open = false;

    function openModal() {
      open = true;
      $('#orderService').textContent = activeService;
      status.textContent = ''; status.className = 'modal__status';
      modal.setAttribute('aria-hidden', 'false');
      lenis.stop();
      gsap.killTweensOf([modal, panel, backdrop]);
      gsap.set(modal, { visibility: 'visible' });
      gsap.to(backdrop, { opacity: 1, duration: 0.4 });
      gsap.fromTo(panel, { y: 60, scale: 0.94, opacity: 0, rotateX: 12 },
        { y: 0, scale: 1, opacity: 1, rotateX: 0, duration: 0.8, ease: 'expo.out' });
      gsap.from($$('.field, .drop-btn', panel), { y: 20, opacity: 0, stagger: 0.07, duration: 0.6, delay: 0.15, ease: 'expo.out' });
      setTimeout(() => F.name.focus(), 350);
    }
    function closeModal() {
      if (!open) return;
      open = false;
      modal.setAttribute('aria-hidden', 'true');
      gsap.to(panel, { y: 40, opacity: 0, scale: 0.96, duration: 0.35, ease: 'power2.in' });
      gsap.to(backdrop, { opacity: 0, duration: 0.4, onComplete: () => gsap.set(modal, { visibility: 'hidden' }) });
      if (!menuOpen) lenis.start();
      $('#orderBtn').focus();
    }

    // the drop wobbles first, then the form opens
    $('#orderBtn').addEventListener('click', () => setTimeout(openModal, 260));
    $$('[data-close]', modal).forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (open) closeModal();
      else if (menuOpen) closeMenu();
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (F._honey.value) return;
      const name = F.name.value.trim();
      const phone = F.phone.value.trim();
      const email = F.email.value.trim();
      const bad = [];
      if (name.length < 2) bad.push(F.name);
      if (phone.replace(/\D/g, '').length < 10) bad.push(F.phone);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad.push(F.email);
      [F.name, F.phone, F.email].forEach(i => i.classList.toggle('is-invalid', bad.includes(i)));
      if (bad.length) {
        status.textContent = 'Пожалуйста, проверьте выделенные поля';
        status.className = 'modal__status err';
        gsap.fromTo(panel, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        return;
      }

      submit.disabled = true;
      status.textContent = 'Отправляем…';
      status.className = 'modal__status';
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${ORDER_EMAIL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: 'Axis Flora — пришёл новый заказ',
            _template: 'table',
            _captcha: 'false',
            'Уведомление': 'Пришёл новый заказ. Необходимо связаться с клиентом.',
            'Услуга': activeService,
            'Имя': name,
            'Телефон': phone,
            'Почта': email,
            _replyto: email
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || res.status);
        status.textContent = 'Спасибо! Заявка отправлена — мы скоро свяжемся с вами.';
        status.className = 'modal__status ok';
        form.reset();
        setTimeout(closeModal, 2600);
      } catch (err) {
        console.error('Order send failed:', err);
        status.innerHTML = `Не удалось отправить. Напишите нам: <a href="mailto:${ORDER_EMAIL}" style="text-decoration:underline">${ORDER_EMAIL}</a>`;
        status.className = 'modal__status err';
      } finally {
        submit.disabled = false;
      }
    });
  }

  /* =======================================================
     Projects — photos spawn under the cursor and fade out
     ======================================================= */
  function initProjects() {
    const section = $('#projects');
    const stage = $('#prjStage');
    const srcs = PROJECT_PHOTOS;
    srcs.forEach(s => { const im = new Image(); im.src = s; }); // preload
    let last = null, idx = 0, z = 1;
    const STEP = innerWidth < 700 ? 60 : 90;

    function spawn(x, y) {
      const im = document.createElement('img');
      im.className = 'trail';
      im.alt = '';
      im.src = srcs[idx++ % srcs.length];
      stage.appendChild(im);
      gsap.set(im, { x, y, xPercent: -50, yPercent: -50, zIndex: z++, rotation: rand(-8, 8) });
      gsap.timeline({ onComplete: () => im.remove() })
        .fromTo(im, { scale: 0.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'expo.out' })
        .to(im, { scale: 0.55, opacity: 0, y: '+=40', duration: 0.7, ease: 'power2.in' }, '+=0.6');
    }
    function track(cx, cy) {
      const r = section.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      if (!last) { last = { x, y }; spawn(x, y); return; }
      if (Math.hypot(x - last.x, y - last.y) > STEP) { spawn(x, y); last = { x, y }; }
    }
    section.addEventListener('mousemove', e => track(e.clientX, e.clientY));
    section.addEventListener('mouseleave', () => { last = null; });
    section.addEventListener('touchmove', e => track(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    section.addEventListener('touchend', () => { last = null; });
  }
})();
