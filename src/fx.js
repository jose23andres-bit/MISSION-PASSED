// MISSION PASSED · motion layer: glitch titles, holo NFT tilt, slice-in images, split-flap text,
// wanted-level HUD and the "Mission passed / Respect +" banner. Everything is skipped or reduced
// when the visitor prefers reduced motion. Only transform/opacity/clip-path are animated.
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const once = (key) => { try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, '1'); } catch { /* storage off */ } return true; };

  // ---------- wanted-level HUD: five stars that fill as you scroll ----------
  function setupWanted() {
    const hud = document.createElement('div');
    hud.className = 'fx-wanted';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
    document.body.append(hud);
    const stars = $$('i', hud);
    let last = -1;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const level = max > 0 ? Math.min(5, Math.floor((window.scrollY / max) * 5.2)) : 0;
      if (level === last) return;
      if (level > last && last >= 0 && !reduced) { hud.classList.remove('bump'); void hud.offsetWidth; hud.classList.add('bump'); }
      last = level;
      stars.forEach((star, i) => star.classList.toggle('on', i < level));
      hud.classList.toggle('max', level === 5);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  if (reduced) { setupWanted(); return; }
  document.documentElement.classList.add('fx-on');

  // ---------- glitch titles ----------
  function setupGlitch() {
    const titles = $$('.mp-title, .mp-cinema-head h2');
    titles.forEach((t) => { t.classList.add('fx-glitch'); if (!t.dataset.text) t.dataset.text = t.textContent.trim(); });
    const burst = (el) => { el.classList.remove('fx-burst'); void el.offsetWidth; el.classList.add('fx-burst'); };
    const visible = new Set();
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { visible.add(e.target); if (!e.target.dataset.fxSeen) { e.target.dataset.fxSeen = '1'; burst(e.target); } }
      else visible.delete(e.target);
    }), { threshold: 0.6 });
    titles.forEach((t) => io.observe(t));
    window.setInterval(() => {
      if (document.hidden || !visible.size) return;
      const list = [...visible];
      burst(list[Math.floor(Math.random() * list.length)]);
    }, 5200);
  }

  // ---------- slice-in "clip" reveal for images ----------
  function setupSlices() {
    const targets = $$('.fx-slice, .mp-card-art, .mp-project-art, .mp-video-frame, .mp-shot');
    targets.forEach((t) => t.classList.add('fx-slice'));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('fx-sliced');
      io.unobserve(e.target);
    }), { threshold: 0.25 });
    targets.forEach((t) => io.observe(t));
  }

  // ---------- 3D tilt + holographic foil (NFT cards and prize cards) ----------
  function setupTilt() {
    if (!finePointer) return;
    $$('.mp-card, .fx-tilt').forEach((card) => {
      card.classList.add('fx-tilt');
      let raf = 0, x = 0.5, y = 0.5;
      const paint = () => {
        raf = 0;
        card.style.setProperty('--rx', `${((0.5 - y) * 14).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((x - 0.5) * 18).toFixed(2)}deg`);
        card.style.setProperty('--px', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--py', `${(y * 100).toFixed(1)}%`);
      };
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        x = (e.clientX - r.left) / r.width; y = (e.clientY - r.top) / r.height;
        card.classList.add('fx-tilting');
        if (!raf) raf = requestAnimationFrame(paint);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('fx-tilting');
        x = 0.5; y = 0.5; if (!raf) raf = requestAnimationFrame(paint);
      });
    });
  }

  // ---------- split-flap departure-board text ----------
  function setupFlaps() {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const flap = (el) => {
      const target = el.dataset.flap || el.textContent;
      let frame = 0;
      const total = 16 + target.length * 2;
      const tick = () => {
        frame += 1;
        el.textContent = [...target].map((c, i) => (c === ' ' || frame > 10 + i * 2 ? c : CHARS[Math.floor(Math.random() * CHARS.length)])).join('');
        if (frame < total) window.setTimeout(tick, 45);
        else el.textContent = target;
      };
      tick();
    };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { flap(e.target); io.unobserve(e.target); } }), { threshold: 0.8 });
    $$('.fx-flap').forEach((el) => io.observe(el));
  }

  // ---------- "Mission passed / Respect +" banner ----------
  function setupBanner() {
    const banner = document.createElement('div');
    banner.className = 'fx-passed';
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<strong>Mission passed</strong><span>Respect +</span>';
    document.body.append(banner);
    let timer = 0;
    const show = (sub) => {
      banner.querySelector('span').textContent = sub;
      banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => banner.classList.remove('show'), 3000);
    };
    const triggers = { sorteos: 'Colección desbloqueada', 'gran-premio': 'Destino: Miami', tokenomics: 'Respect +' };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (once(`mp-fx-${e.target.id}`)) show(triggers[e.target.id]);
    }), { threshold: 0.35 });
    Object.keys(triggers).forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  // ---------- VHS scanline layer with a tracking line ----------
  function setupScan() {
    const scan = document.createElement('div');
    scan.className = 'fx-scan';
    scan.setAttribute('aria-hidden', 'true');
    document.body.append(scan);
  }

  setupWanted();
  setupScan();
  setupGlitch();
  setupSlices();
  setupTilt();
  setupFlaps();
  setupBanner();
})();
