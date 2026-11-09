// "Radio MP": original synthwave loop generated live with the Web Audio API (no audio files, no third-party music).
// Browsers block sound before the first interaction, so it starts on the visitor's first tap/click or via the button.
(() => {
  const KEY = 'mp-radio';
  const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ } } };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  let ctx, master, timer, step = 0, nextTime = 0, playing = false;
  const BPM = 100, SIX = 60 / BPM / 4;
  // A minor · F · C · G, Vice City night vibe.
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const bass = [33, 29, 36, 31];
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);

  function voice(type, freq, t, dur, gain, cutoff) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, gain, hp) {
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.32);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(step / 16) % 4, s = step % 16, t = nextTime;
      if (s % 4 === 0) kick(t);
      if (s === 4 || s === 12) noise(t, 0.18, 0.35, 1800);
      if (s % 2 === 1) noise(t, 0.05, 0.12, 7000);
      if (s % 2 === 0) voice('sawtooth', hz(bass[bar] + (s % 4 === 2 ? 12 : 0)), t, SIX * 1.8, 0.22, 900);
      if (s === 0) chords[bar].forEach((m) => voice('sawtooth', hz(m), t, SIX * 16, 0.05, 2200));
      const arp = chords[bar][s % 3] + 12;
      if (s % 2 === 0) voice('square', hz(arp), t, SIX * 0.9, 0.035, 3000);
      nextTime += SIX; step += 1;
    }
  }
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'radio-toggle'; btn.setAttribute('translate', 'no');
  const label = () => { btn.innerHTML = `<i aria-hidden="true">${playing ? '❚❚' : '▶'}</i><span>Radio MP</span>`; btn.setAttribute('aria-pressed', String(playing)); btn.setAttribute('aria-label', playing ? 'Pausar música' : 'Activar música'); };
  function start() {
    if (playing) return;
    ctx = ctx || new AC();
    if (!master) { master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination); }
    ctx.resume(); nextTime = ctx.currentTime + 0.05; playing = true;
    timer = window.setInterval(schedule, 50); label(); store.set('on');
  }
  function stop() { playing = false; window.clearInterval(timer); ctx?.suspend(); label(); store.set('off'); }
  btn.addEventListener('click', (e) => { e.stopPropagation(); playing ? stop() : start(); });
  label(); document.body.appendChild(btn);
  // Landing page: GTA-style "press to start" screen so the music begins as you enter.
  if (document.querySelector('.mp-hero')) {
    const intro = document.createElement('div');
    intro.className = 'mp-intro'; intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-label', 'Entrar en MISSION PASSED');
    intro.innerHTML = `<div class="mp-intro-box"><svg class="crown" viewBox="0 0 120 70" aria-hidden="true"><path d="M8 62 L14 14 L40 40 L60 6 L80 40 L106 14 L112 62 Z"/></svg>
      <p class="mp-intro-logo" translate="no"><b>Mission</b><b>Passed</b><i>$MP</i></p>
      <button type="button" class="mp-btn mp-btn-hot mp-intro-go">▶ Pulsa para entrar</button>
      <button type="button" class="mp-intro-mute">Entrar sin música</button>
      <small>Radio MP · música original synthwave</small></div>`;
    document.body.appendChild(intro);
    const close = (withMusic) => { if (withMusic) start(); else stop(); intro.classList.add('out'); window.setTimeout(() => intro.remove(), 600); };
    intro.querySelector('.mp-intro-go').addEventListener('click', (e) => { e.stopPropagation(); close(true); });
    intro.querySelector('.mp-intro-mute').addEventListener('click', (e) => { e.stopPropagation(); close(false); });
    intro.querySelector('.mp-intro-go').focus();
  }
  // Auto-start on first interaction unless the visitor muted it before.
  if (store.get() !== 'off') {
    const first = (e) => { if (e.target.closest?.('.radio-toggle')) return; start(); ['pointerdown', 'keydown'].forEach((ev) => document.removeEventListener(ev, first)); };
    ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, first));
  }
})();
