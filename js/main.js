/* =========================================================
   AXIS FLORA — main interactions
   ========================================================= */
(() => {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = gsap.utils.random;
  const isTouch = matchMedia('(hover: none)').matches;

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
     HEADER — hides on scroll down, returns when the cursor
     enters the top strip of the screen
     ======================================================= */
  const hdr = $('#hdr');
  let hdrShown = true, inZone = false;
  function showHdr() {
    if (hdrShown) return;
    hdrShown = true;
    gsap.killTweensOf(hdr);
    gsap.fromTo(hdr, { yPercent: -110 }, { yPercent: 0, duration: 0.8, ease: 'expo.out' });
    gsap.fromTo(hdr.children, { y: -24, opacity: 0, filter: 'blur(6px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, stagger: 0.1, ease: 'expo.out', delay: 0.05 });
  }
  function hideHdr() {
    if (!hdrShown) return;
    hdrShown = false;
    gsap.killTweensOf(hdr);
    gsap.to(hdr, { yPercent: -110, duration: 0.55, ease: 'power3.in' });
  }
  lenis.on('scroll', ({ scroll, direction }) => {
    hdr.classList.toggle('is-solid', scroll > 40);
    if (scroll < 80) showHdr();
    else if (direction === 1 && !inZone) hideHdr();
    else if (direction === -1 && isTouch) showHdr();
  });
  window.addEventListener('mousemove', e => {
    const z = e.clientY < 110;
    if (z && !inZone) { inZone = true; showHdr(); }
    else if (!z && inZone) { inZone = false; if (lenis.scroll > 80) hideHdr(); }
  }, { passive: true });

  /* =======================================================
     MENU — pearl button, circular reveal from the button
     ======================================================= */
  const menuBtn = $('#menuBtn');
  const menu = $('#menu');
  const menuLinks = $$('.menu__list a');
  const menuFoot = $('.menu__foot');
  let menuOpen = false;

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
    return `<svg viewBox="0 0 100 100"><path d="${petals}" fill="#613c4e"/><path d="${center}" fill="#f4eed6"/><path d="${dot}" fill="#613c4e"/></svg>`;
  }

  /* 3.jpg-like pattern: pink blossoms on black, torn by vertical streaks */
  function drawPattern(cv) {
    const w = cv.width = Math.max(600, Math.round(cv.clientWidth));
    const h = cv.height = Math.max(400, Math.round(cv.clientHeight));
    const g = cv.getContext('2d');
    const rnd = mulberry32(42);
    g.fillStyle = '#1b1116';
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
      if (rnd() < 0.6) { g.fillStyle = '#1b1116'; g.beginPath(); g.arc(x, y, R * 0.12, 0, 7); g.fill(); }
    };
    const cols = ['#e8b3bd', '#eab9c2', '#e3a7b4', '#e8b3bd', '#e7d78b'];
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
      g.fillStyle = rnd() < 0.8 ? '#1b1116' : '#f4eed6';
      const y0 = rnd() < 0.5 ? 0 : rnd() * h;
      g.fillRect(rnd() * w, y0, 1, h - y0);
    }
    // dust
    g.fillStyle = '#1b1116';
    for (let i = 0; i < (w * h) / 300; i++) {
      g.globalAlpha = rnd();
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    g.globalAlpha = 1;
    return cv.toDataURL('image/jpeg', 0.8);
  }

  /* =======================================================
     PROJECT IMAGES
     Put real photos here, e.g. ['img/projects/01.jpg', ...].
     While the list is empty, generated botanical cards are used.
     ======================================================= */
  const PROJECT_PHOTOS = [];

  function projectArt(i) {
    const W = 360, H = 450;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const rnd = mulberry32(i * 977 + 13);
    const pals = [
      ['#6c964b', '#3d5a2a', '#e7d78b', '#613c4e', '#f4eed6'],
      ['#613c4e', '#3a2230', '#e3a7b4', '#6c964b', '#e7d78b'],
      ['#e7d78b', '#cdb96a', '#6c964b', '#613c4e', '#613c4e'],
      ['#26181f', '#1b1116', '#6c964b', '#e7d78b', '#e7d78b'],
      ['#8fae6c', '#6c964b', '#613c4e', '#e7d78b', '#1b1116']
    ];
    const [bg, bg2, a, b, txt] = pals[i % pals.length];
    const types = ['private villa', 'office loft', 'terrace', 'entrance area', 'event installation',
      'winter garden', 'rooftop', 'hotel lobby', 'courtyard', 'custom planters'];
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, bg); gr.addColorStop(1, bg2);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);

    const leaf = (x, y, len, wd, ang, col) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = col; g.beginPath();
      g.moveTo(0, 0); g.quadraticCurveTo(wd, -len / 2, 0, -len); g.quadraticCurveTo(-wd, -len / 2, 0, 0); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len * 0.9); g.stroke();
      g.restore();
    };
    const bloom = (x, y, R, col) => {
      g.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const t = (k / 5) * Math.PI * 2;
        g.beginPath(); g.ellipse(x + Math.cos(t) * R * 0.55, y + Math.sin(t) * R * 0.55, R * 0.5, R * 0.34, t, 0, 7); g.fill();
      }
      g.fillStyle = '#e7d78b'; g.beginPath(); g.arc(x, y, R * 0.22, 0, 7); g.fill();
    };

    const kind = i % 5;
    if (kind === 0) {               // arch + potted plant
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.beginPath(); g.moveTo(80, H); g.lineTo(80, 150); g.arc(180, 150, 100, Math.PI, 0); g.lineTo(280, H); g.fill();
      for (let k = 0; k < 11; k++) leaf(180, 330, 110 + rnd() * 70, 26 + rnd() * 14, -1.3 + (k / 10) * 2.6, k % 2 ? a : b);
      g.fillStyle = b; g.beginPath(); g.moveTo(130, 320); g.lineTo(230, 320); g.lineTo(215, 400); g.lineTo(145, 400); g.fill();
    } else if (kind === 1) {        // hedges
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 300, W, H - 300);
      for (let k = 0; k < 14; k++) {
        g.fillStyle = k % 3 ? a : b; g.globalAlpha = 0.85;
        g.beginPath(); g.arc(rnd() * W, 240 + rnd() * 130, 26 + rnd() * 40, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    } else if (kind === 2) {        // hanging vines
      for (let k = 0; k < 9; k++) {
        const x0 = 20 + k * 40 + rnd() * 10, L = 180 + rnd() * 200;
        g.strokeStyle = a; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 0);
        g.quadraticCurveTo(x0 + 30 * (rnd() - 0.5), L / 2, x0, L); g.stroke();
        for (let y = 20; y < L; y += 22) leaf(x0, y, 20 + rnd() * 10, 8, (y / 22) % 2 ? 2.2 : -2.2, k % 2 ? a : b);
      }
    } else if (kind === 3) {        // flower bed
      for (let k = 0; k < 26; k++) leaf(rnd() * W, 260 + rnd() * 190, 60 + rnd() * 60, 14, (rnd() - 0.5) * 1.4, a);
      for (let k = 0; k < 16; k++) bloom(rnd() * W, 180 + rnd() * 220, 16 + rnd() * 20, k % 2 ? b : txt);
    } else {                        // terrace with planters
      g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.arc(280, 90, 44, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3;
      for (let x = 0; x < W; x += 30) { g.beginPath(); g.moveTo(x, 250); g.lineTo(x, 380); g.stroke(); }
      g.beginPath(); g.moveTo(0, 250); g.lineTo(W, 250); g.stroke();
      for (let k = 0; k < 4; k++) {
        const x = 20 + k * 86;
        g.fillStyle = b; g.fillRect(x, 330, 64, 70);
        g.fillStyle = a; g.beginPath(); g.arc(x + 32, 300, 38 + rnd() * 10, 0, 7); g.fill();
      }
    }
    // grain
    const id = g.getImageData(0, 0, W, H);
    for (let p = 0; p < id.data.length; p += 4) {
      const n = (rnd() - 0.5) * 26;
      id.data[p] += n; id.data[p + 1] += n; id.data[p + 2] += n;
    }
    g.putImageData(id, 0, 0);
    // caption
    g.fillStyle = txt;
    g.font = '700 22px "Cormorant SC", serif';
    g.fillText('project ' + String(i + 1).padStart(2, '0'), 18, H - 38);
    g.font = '500 17px "Cormorant SC", serif';
    g.fillText(types[i % types.length], 18, H - 16);
    return c.toDataURL('image/jpeg', 0.86);
  }

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
  const fontsReady = Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]);
  fontsReady.then(init);

  function splitChars(el, text) {
    el.innerHTML = [...text].map(c => c === ' ' ? '<span class="ch">&nbsp;</span>' : `<span class="ch">${c}</span>`).join('');
    return $$('.ch', el);
  }

  function init() {
    /* ---------- HERO intro ---------- */
    const heroLines = SplitText.create('.hero__tagline', { type: 'lines', mask: 'lines' });
    gsap.timeline({ delay: 0.2 })
      .from('.hdr > *', { y: -30, opacity: 0, duration: 1, stagger: 0.12, ease: 'expo.out' })
      .from('.pearl', { scale: 0, rotate: -200, duration: 1.4, ease: 'expo.out' }, 0.3)
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

    gsap.set('.rhythm__script', { xPercent: -50, yPercent: -50, rotation: -6 });
    const chars = $$('#lively .ch');

    gsap.from(chars, {
      yPercent: 100, opacity: 0, duration: 1.1, stagger: 0.04, ease: 'expo.out',
      scrollTrigger: { trigger: '#rhythm', start: 'top 70%' }
    });
    gsap.from('.rhythm__script', {
      opacity: 0, scale: 0.7, duration: 1.4, ease: 'expo.out', delay: 0.4,
      scrollTrigger: { trigger: '#rhythm', start: 'top 60%' }
    });

    // melt: blur / stretch / fall apart + 3.jpg-like pattern takes over
    const melt = gsap.timeline({
      scrollTrigger: { trigger: '#rhythm', start: 'top top', end: '+=170%', pin: true, scrub: 0.8 }
    });
    melt
      .to('#meltMap', { attr: { scale: 240 }, duration: 1, ease: 'power2.in' }, 0.12)
      .to('#meltNoise', { attr: { baseFrequency: '0.002 0.14' }, duration: 1, ease: 'none' }, 0.12)
      .to(chars, {
        scaleY: () => rand(1.8, 4.2),
        scaleX: () => rand(0.6, 1.4),
        y: () => rand(-10, 45) + 'vh',
        x: () => rand(-10, 10) + 'vw',
        rotation: () => rand(-18, 18),
        opacity: 0,
        transformOrigin: '50% 0%',
        duration: 0.9,
        ease: 'power2.in',
        stagger: { each: 0.03, from: 'random' }
      }, 0.18)
      .to('.rhythm__script', { yPercent: -160, opacity: 0, scale: 1.5, letterSpacing: '0.25em', filter: 'blur(8px)', duration: 0.7, ease: 'power2.in' }, 0.1)
      .to('.ficon', { y: 60, opacity: 0, duration: 0.4 }, 0.3)
      .fromTo(patternCv, { clipPath: 'inset(100% 0% 0% 0%)', scaleY: 1.25, transformOrigin: '50% 100%' },
        { clipPath: 'inset(0% 0% 0% 0%)', scaleY: 1, duration: 0.75, ease: 'power1.inOut' }, 0.5);

    /* ---------- BLOCK 3 · ABOUT ---------- */
    gsap.from('.about__title h2', {
      yPercent: 100, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: '.about__title', start: 'top 85%' }
    });
    gsap.from('.about__title .leaf', {
      scale: 0, opacity: 0, duration: 1, ease: 'back.out(3)', delay: 0.3,
      scrollTrigger: { trigger: '.about__title', start: 'top 85%' }
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
      gsap.from(sl, {
        yPercent: 22, rotation: 5, opacity: 0.3, ease: 'none',
        scrollTrigger: { trigger: sl, containerAnimation: hsTween, start: 'left 100%', end: 'left 62%', scrub: true }
      });
      gsap.from(sl.querySelector('.slide__art'), {
        scale: 0.5, rotation: -25, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: sl, containerAnimation: hsTween, start: 'left 95%', end: 'left 62%', scrub: true }
      });
      sl.querySelectorAll('.draw').forEach(p => {
        const L = p.getTotalLength();
        gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, {
          strokeDashoffset: 0, ease: 'none',
          scrollTrigger: { trigger: sl, containerAnimation: hsTween, start: 'left 90%', end: 'left 62%', scrub: true }
        });
      });
      gsap.from(sl.querySelectorAll('.slide__txt > *'), {
        x: 80, opacity: 0, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: sl, containerAnimation: hsTween, start: 'left 88%', end: 'left 64%', scrub: true }
      });
    });

    /* ---------- BLOCK 4 · SERVICES ---------- */
    const svcChars = splitChars($('#svcTitle'), 'services');
    gsap.fromTo(svcChars, {
      x: () => rand(-0.6, 0.6) * innerWidth,
      y: () => rand(-0.45, 0.8) * innerHeight,
      rotation: () => rand(-260, 260),
      scale: () => rand(0.3, 2.8),
      opacity: 0
    }, {
      x: 0, y: 0, rotation: 0, scale: 1, opacity: 1,
      duration: 1.6, ease: 'expo.out',
      stagger: { each: 0.06, from: 'random' },
      scrollTrigger: { trigger: '#services', start: 'top 65%', toggleActions: 'play none none reverse' }
    });
    gsap.from('.svc__box, .svc__hint, #orderBtn', {
      y: 50, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out', delay: 0.5,
      scrollTrigger: { trigger: '#services', start: 'top 60%' }
    });
    gsap.from('.svc__view', {
      x: -40, opacity: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: '.svc__view', start: 'top 95%' }
    });
    initServiceBox();

    /* ---------- BLOCK 5 · PROJECTS ---------- */
    initProjects();
    const prjChars = SplitText.create('.prj__title', { type: 'chars', mask: 'chars' });
    gsap.from(prjChars.chars, {
      yPercent: 110, duration: 1, stagger: 0.04, ease: 'expo.out',
      scrollTrigger: { trigger: '#projects', start: 'top 70%' }
    });
    gsap.from('.prj__ghost', {
      yPercent: 40, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#projects', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });

    /* ---------- BLOCK 6 · CONTACT ---------- */
    const ctTitle = SplitText.create('.contact__title', { type: 'chars', mask: 'chars' });
    const phone = SplitText.create('.contact__phone', { type: 'chars', mask: 'chars' });
    const ct = gsap.timeline({ scrollTrigger: { trigger: '#contact', start: 'top 65%' } });
    ct.from(ctTitle.chars, { yPercent: 110, duration: 0.9, stagger: 0.04, ease: 'expo.out' })
      .from(phone.chars, { yPercent: 115, duration: 1.1, stagger: 0.025, ease: 'expo.out' }, 0.2)
      .from('.contact__mail', { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.7)
      .from('.contact__social li', { scale: 0, rotate: -90, duration: 0.9, stagger: 0.1, ease: 'back.out(2)' }, 0.85);

    ScrollTrigger.refresh();
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* =======================================================
     Infinite service box
     ======================================================= */
  function initServiceBox() {
    const box = $('#svcBox');
    const list = $('#svcList');
    const COPIES = 5;
    let html = '';
    for (let c = 0; c < COPIES; c++) SERVICES.forEach((s, i) => { html += `<li data-i="${i}">${s}</li>`; });
    list.innerHTML = html;
    const items = [...list.children];
    let setH = 0, cur = 0, target = 0, animating = false, snapT = null;

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
        const raw = Math.abs(c - mid);
        const d = Math.min(1, raw / half);
        li.style.opacity = (1 - d * 0.72).toFixed(3);
        li.style.transform = `scale(${(1 - d * 0.2).toFixed(3)})`;
        if (raw < bestD) { bestD = raw; best = li; }
      });
      items.forEach(li => li.classList.toggle('is-active', li === best));
      if (best) activeService = SERVICES[+best.dataset.i];
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
        target += e.key === 'ArrowDown' ? 60 : -60;
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
      gsap.from($$('.field, .glass-btn--wide', panel), { y: 20, opacity: 0, stagger: 0.07, duration: 0.6, delay: 0.15, ease: 'expo.out' });
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

    $('#orderBtn').addEventListener('click', openModal);
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
     Projects — images spawn under the cursor and fade out
     ======================================================= */
  function initProjects() {
    const section = $('#projects');
    const stage = $('#prjStage');
    const srcs = PROJECT_PHOTOS.length ? PROJECT_PHOTOS : Array.from({ length: 10 }, (_, i) => projectArt(i));
    srcs.forEach(s => { const im = new Image(); im.src = s; }); // preload
    let last = null, idx = 0, z = 1;
    const STEP = innerWidth < 700 ? 60 : 85;

    function spawn(x, y) {
      const im = document.createElement('img');
      im.className = 'trail';
      im.alt = '';
      im.src = srcs[idx++ % srcs.length];
      stage.appendChild(im);
      gsap.set(im, { x, y, xPercent: -50, yPercent: -50, zIndex: z++, rotation: rand(-9, 9) });
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
