// "Radio MP": the official Spotify embed of the campaign song (no audio file is hosted here).
// Browsers block sound until the visitor interacts, so it starts on "Pulsa para entrar" or the Radio MP button.
// Spotify plays a ~30 s preview to visitors who are not logged in to Spotify in that browser.
(() => {
  const TRACK = 'spotify:track:6eZ8Oua1wvG52E19YuvvoH';
  const KEY = 'mp-radio';
  const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ } } };
  let controller = null, wantPlay = false, playing = false, ducked = false;

  const dock = document.createElement('div');
  dock.className = 'radio-dock';
  dock.hidden = true;
  dock.innerHTML = '<div class="radio-dock-head"><span>Radio MP</span><button type="button" class="radio-dock-close" aria-label="Ocultar reproductor">–</button></div><div class="radio-dock-player"><div id="mp-spotify"></div></div>';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'radio-toggle'; btn.setAttribute('translate', 'no');
  const label = () => { btn.innerHTML = `<i aria-hidden="true">${playing ? '❚❚' : '▶'}</i><span>Radio MP</span>`; btn.setAttribute('aria-pressed', String(playing)); btn.setAttribute('aria-label', playing ? 'Pausar música' : 'Activar música'); };
  document.body.append(dock, btn);
  label();

  function play() {
    wantPlay = true; dock.hidden = false; store.set('on');
    if (controller) { controller.resume ? controller.resume() : controller.play(); }
  }
  function pause() { wantPlay = false; controller?.pause(); store.set('off'); }

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    IFrameAPI.createController(document.getElementById('mp-spotify'), { uri: TRACK, width: '100%', height: 80 }, (ctrl) => {
      controller = ctrl;
      ctrl.addListener('playback_update', (event) => { playing = !event.data.isPaused; label(); });
      ctrl.addListener('ready', () => { if (wantPlay) ctrl.play(); });
    });
  };
  const api = document.createElement('script');
  api.src = 'https://open.spotify.com/embed/iframe-api/v1';
  api.async = true;
  document.head.append(api);

  btn.addEventListener('click', (e) => { e.stopPropagation(); if (playing) pause(); else play(); });
  dock.querySelector('.radio-dock-close').addEventListener('click', () => { dock.hidden = true; });

  // Lets the guide character lower the music while it talks.
  window.MPRadio = Object.freeze({
    duck() { if (playing) { ducked = true; controller?.pause(); } },
    unduck() { if (ducked) { ducked = false; controller?.resume(); } },
  });

  // Landing page: GTA-style "press to start" screen so the song begins as you enter.
  if (document.querySelector('.mp-hero')) {
    const intro = document.createElement('div');
    intro.className = 'mp-intro'; intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-label', 'Entrar en MISSION PASSED');
    intro.innerHTML = `<div class="mp-intro-box"><svg class="crown" viewBox="0 0 120 70" aria-hidden="true"><path d="M8 62 L14 14 L40 40 L60 6 L80 40 L106 14 L112 62 Z"/></svg>
      <p class="mp-intro-logo" translate="no"><b>Mission</b><b>Passed</b><i>$MP</i></p>
      <button type="button" class="mp-btn mp-btn-hot mp-intro-go">▶ Pulsa para entrar</button>
      <button type="button" class="mp-intro-mute">Entrar sin música</button>
      <small>Radio MP · suena con Spotify</small></div>`;
    document.body.appendChild(intro);
    const close = (withMusic) => { if (withMusic) play(); else pause(); intro.classList.add('out'); window.setTimeout(() => intro.remove(), 600); document.dispatchEvent(new CustomEvent('mp:entered')); };
    intro.querySelector('.mp-intro-go').addEventListener('click', (e) => { e.stopPropagation(); close(true); });
    intro.querySelector('.mp-intro-mute').addEventListener('click', (e) => { e.stopPropagation(); close(false); });
    intro.querySelector('.mp-intro-go').focus();
  } else if (store.get() === 'on') {
    const first = () => { play(); ['pointerdown', 'keydown'].forEach((ev) => document.removeEventListener(ev, first)); };
    ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, first));
  }
})();
