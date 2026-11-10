// "Rico", the 2D guide. Original character, created exclusively for MISSION PASSED.
// Slides in after the hero, explains how to buy in short lines and talks with lip-sync.
// Voice: pre-generated ElevenLabs MP3s in /voice/ when available (script.json → "audio": true),
// otherwise the browser's built-in Spanish speech synthesis.
(() => {
  const base = window.MISSION_PASSED_CONFIG?.basePath || '';
  const KEY = 'mp-guide';
  const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } } };
  const onPresale = Boolean(document.getElementById('ps-pay'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SVG = `<svg class="rico" viewBox="0 0 200 240" aria-hidden="true">
    <defs>
      <linearGradient id="rico-lens" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ff6fd0"/><stop offset=".55" stop-color="#8b2cff"/><stop offset="1" stop-color="#3ff0ff"/></linearGradient>
      <linearGradient id="rico-skin" x1="0" x2="1"><stop offset="0" stop-color="#c97f4f"/><stop offset=".5" stop-color="#e3a170"/><stop offset="1" stop-color="#c47a4b"/></linearGradient>
      <linearGradient id="rico-shirt" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#16c6b5"/><stop offset="1" stop-color="#0b7d78"/></linearGradient>
      <clipPath id="rico-torso"><path d="M22 240 C24 196 56 174 100 172 C144 174 176 196 178 240 Z"/></clipPath>
    </defs>
    <ellipse cx="100" cy="236" rx="80" ry="6" fill="#000" opacity=".35"/>
    <g class="rico-body">
      <path d="M22 240 C24 196 56 174 100 172 C144 174 176 196 178 240 Z" fill="url(#rico-shirt)" stroke="#1a0628" stroke-width="4"/>
      <g clip-path="url(#rico-torso)" fill="#ff4fae" stroke="#1a0628" stroke-width="1.5">
        <g transform="translate(46 206)"><circle r="9"/><circle r="3" fill="#ffd36e"/></g>
        <g transform="translate(150 214)"><circle r="10"/><circle r="3" fill="#ffd36e"/></g>
        <g transform="translate(124 234)"><circle r="7"/><circle r="2.5" fill="#ffd36e"/></g>
        <path d="M60 230 q8 -14 18 -4" fill="none" stroke="#0a5552" stroke-width="3"/>
        <path d="M150 190 q10 4 6 16" fill="none" stroke="#0a5552" stroke-width="3"/>
      </g>
      <path d="M80 174 L100 214 L120 174 Z" fill="url(#rico-skin)" stroke="#1a0628" stroke-width="3"/>
      <path d="M76 172 L66 196 L98 210 Z M124 172 L134 196 L102 210 Z" fill="#f7f1e3" stroke="#1a0628" stroke-width="3" stroke-linejoin="round"/>
      <path d="M84 178 Q100 206 116 178" fill="none" stroke="#ffd36e" stroke-width="3.5"/>
      <path d="M95 199 l5 -6 5 6 -2 7 h-6 Z" fill="#ffd36e" stroke="#1a0628" stroke-width="1.5"/>
      <rect x="86" y="150" width="28" height="26" rx="6" fill="url(#rico-skin)" stroke="#1a0628" stroke-width="3"/>
    </g>
    <g class="rico-head">
      <ellipse cx="60" cy="108" rx="9" ry="13" fill="url(#rico-skin)" stroke="#1a0628" stroke-width="3"/>
      <ellipse cx="140" cy="108" rx="9" ry="13" fill="url(#rico-skin)" stroke="#1a0628" stroke-width="3"/>
      <path d="M62 92 C62 52 138 52 138 92 L136 122 C132 150 116 162 100 162 C84 162 68 150 64 122 Z" fill="url(#rico-skin)" stroke="#1a0628" stroke-width="4"/>
      <path d="M70 132 C78 152 122 152 130 132 C124 158 76 158 70 132 Z" fill="#7b4a33" opacity=".35"/>
      <path d="M58 92 C52 50 90 32 118 40 C140 44 150 66 142 92 C136 74 124 66 112 64 C96 74 74 72 66 90 Z" fill="#2a1622" stroke="#1a0628" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M108 44 C124 46 138 58 138 74" fill="none" stroke="#b9a8c4" stroke-width="5" stroke-linecap="round" opacity=".9"/>
      <g class="rico-brows" fill="#2a1622"><path d="M70 90 q14 -8 26 -2 v5 q-12 -4 -26 2 Z"/><path d="M104 88 q12 -6 26 2 v5 q-14 -6 -26 -2 Z"/></g>
      <g class="rico-shades">
        <path d="M66 96 h32 q2 18 -14 20 q-16 0 -18 -20 Z" fill="url(#rico-lens)" stroke="#1a0628" stroke-width="3.5"/>
        <path d="M102 96 h32 q-2 20 -18 20 q-16 -2 -14 -20 Z" fill="url(#rico-lens)" stroke="#1a0628" stroke-width="3.5"/>
        <path d="M98 99 q2 -3 4 0" fill="none" stroke="#1a0628" stroke-width="3"/>
        <path class="rico-glint" d="M72 100 l10 0 M108 100 l10 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".85"/>
      </g>
      <path d="M100 108 q-6 14 -2 18 q4 2 8 0" fill="none" stroke="#8a4d2e" stroke-width="3" stroke-linecap="round"/>
      <path d="M80 132 q10 -8 20 -3 q10 -5 20 3 q-10 2 -20 -1 q-10 3 -20 1 Z" fill="#2a1622" stroke="#1a0628" stroke-width="2"/>
      <g class="rico-mouth" transform="translate(100 141)">
        <ellipse class="rico-mouth-open" rx="11" ry="7" fill="#5a1426" stroke="#1a0628" stroke-width="2.5"/>
        <path d="M-7 3 q7 5 14 0" fill="#ff7a90"/>
        <path class="rico-teeth" d="M-8 -4 h16 v3 h-16 Z" fill="#fff"/>
      </g>
      <path class="rico-smirk" d="M88 141 q14 6 26 -2" fill="none" stroke="#1a0628" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g class="rico-hand">
      <path d="M168 176 C176 160 180 146 178 132" fill="none" stroke="#0b7d78" stroke-width="18" stroke-linecap="round"/>
      <g transform="translate(178 118)">
        <path d="M-12 12 C-14 -2 -10 -14 -4 -16 L-3 -26 q3 -4 6 0 l0 10 l2 -12 q3 -4 6 0 l-1 13 l3 -9 q3 -3 5 1 l-2 14 q4 -6 7 -3 q2 3 -3 10 C10 18 0 22 -12 12 Z" fill="url(#rico-skin)" stroke="#1a0628" stroke-width="3" stroke-linejoin="round"/>
      </g>
    </g>
  </svg>`;

  const root = document.createElement('aside');
  root.className = 'guide';
  root.setAttribute('aria-label', 'Rico, tu guía para comprar $MP');
  root.innerHTML = `
    <div class="guide-bubble" role="dialog" aria-live="polite">
      <button type="button" class="guide-x" aria-label="Cerrar guía">×</button>
      <p class="guide-name">Rico <small>tu guía</small></p>
      <p class="guide-text"></p>
      <div class="guide-dots" aria-hidden="true"></div>
      <div class="guide-actions">
        <button type="button" class="guide-btn guide-listen">▶ Escúchame</button>
        <button type="button" class="guide-btn guide-next">Siguiente ›</button>
        <a class="guide-btn guide-go" href="${base}/presale/" hidden>Ir a la preventa ›</a>
      </div>
    </div>
    <button type="button" class="guide-avatar" aria-label="Abrir la guía de compra"><span class="guide-hint" aria-hidden="true">¿Te ayudo?</span>${SVG}</button>`;

  let lines = [], index = 0, audio = null, ctx = null, analyser = null, raf = 0, speaking = false;
  const $ = (s) => root.querySelector(s);
  const mouth = () => root.querySelector('.rico-mouth');

  function setMouth(open) {
    const m = mouth();
    if (!m) return;
    m.style.transform = `translate(100px,141px) scaleY(${(0.12 + Math.min(1, open) * 0.95).toFixed(3)})`;
    root.querySelector('.rico-smirk').style.opacity = open > 0.08 ? '0' : '1';
  }

  function render() {
    const line = lines[index];
    $('.guide-text').textContent = line.text;
    $('.guide-dots').innerHTML = lines.map((_, i) => `<i class="${i === index ? 'on' : ''}"></i>`).join('');
    const last = index === lines.length - 1;
    $('.guide-next').textContent = last ? 'Repetir ↺' : 'Siguiente ›';
    $('.guide-go').hidden = onPresale || !(last || index >= 2);
  }

  function stopTalking() {
    speaking = false;
    cancelAnimationFrame(raf);
    audio?.pause();
    window.speechSynthesis?.cancel();
    setMouth(0);
    root.classList.remove('talking');
    $('.guide-listen').textContent = '▶ Escúchame';
  }

  function lipSyncFromAnalyser() {
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      if (!speaking) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      setMouth(Math.sqrt(sum / data.length) * 5.5);
      raf = requestAnimationFrame(loop);
    };
    loop();
  }

  function lipSyncFake() {
    const loop = (t) => {
      if (!speaking) return;
      setMouth(0.35 + 0.45 * Math.abs(Math.sin(t / 85)) * Math.abs(Math.sin(t / 230)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function pickVoice() {
    const voices = window.speechSynthesis?.getVoices() || [];
    const es = voices.filter((v) => /^es/i.test(v.lang));
    return es.find((v) => /male|jorge|diego|pablo|carlos|juan|enrique|alvaro|raul/i.test(v.name) && !/female/i.test(v.name)) || es[0] || null;
  }

  function talk() {
    if (speaking) { stopTalking(); return; }
    const line = lines[index];
    speaking = true;
    root.classList.add('talking');
    $('.guide-listen').textContent = '■ Parar';
    const done = () => { if (speaking) stopTalking(); };
    if (line.audio) {
      audio = audio || new Audio();
      audio.src = `${base}/voice/${line.id}.mp3`;
      audio.onended = done;
      audio.onerror = () => { line.audio = false; stopTalking(); talk(); };
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC && !ctx) {
          ctx = new AC();
          const source = ctx.createMediaElementSource(audio);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser).connect(ctx.destination);
        }
        ctx?.resume();
      } catch { analyser = null; }
      audio.play().then(() => (analyser ? lipSyncFromAnalyser() : lipSyncFake())).catch(done);
      return;
    }
    if (!('speechSynthesis' in window)) { done(); return; }
    const utter = new SpeechSynthesisUtterance(line.text);
    utter.lang = 'es-ES';
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.rate = 0.98; utter.pitch = 0.82;
    utter.onend = done; utter.onerror = done;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    lipSyncFake();
  }

  function next() {
    stopTalking();
    index = (index + 1) % lines.length;
    render();
    talk();
  }

  function open() {
    root.classList.add('open');
    root.classList.remove('min');
    store.set('open');
  }
  function minimise() {
    stopTalking();
    root.classList.remove('open');
    root.classList.add('min');
    store.set('min');
  }

  function show() {
    if (root.classList.contains('in')) return;
    root.classList.add('in');
    // Small screens: only the avatar with a hint, so the guide never covers prices or buttons.
    const roomy = window.matchMedia('(min-width: 1100px)').matches;
    if (store.get() !== 'min' && roomy) window.setTimeout(open, reduced ? 0 : 700);
    else root.classList.add('min');
  }

  async function init() {
    try {
      const response = await fetch(`${base}/voice/script.json`, { cache: 'no-cache' });
      lines = (await response.json()).lines.filter((l) => l && typeof l.text === 'string' && /^[a-z0-9-]+$/.test(l.id));
    } catch { return; }
    if (!lines.length) return;
    if (onPresale) index = Math.max(0, lines.findIndex((l) => l.id === 'wallet'));
    document.body.append(root);
    render();
    $('.guide-listen').addEventListener('click', talk);
    $('.guide-next').addEventListener('click', next);
    $('.guide-x').addEventListener('click', minimise);
    $('.guide-avatar').addEventListener('click', () => {
      if (root.classList.contains('open')) talk();
      else { open(); talk(); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('open')) minimise(); });

    // Appear once the visitor scrolls past the hero (or after 2.5 s on the presale page).
    const hero = document.querySelector('.mp-hero, .ps-hero');
    if (!hero || !('IntersectionObserver' in window)) { window.setTimeout(show, 2500); return; }
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) { show(); observer.disconnect(); } }, { threshold: 0.35 });
    observer.observe(hero);
  }

  init();
})();
