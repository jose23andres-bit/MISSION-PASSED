(() => {
  'use strict';

  const config = Object.freeze({
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    tokenMint: '',
    links: { x: '', discord: '', telegram: '' },
    ...(window.MISSION_PASSED_CONFIG || {}),
  });

  const allocations = [
    { label: 'Fondo de sorteos · disponible', value: 16, color: '#ff2d9b' },
    { label: 'Fondo de sorteos · vesting', value: 4, color: '#b26bff' },
    { label: 'Compradores · Launch Pool', value: 53.33, color: '#3ff0ff' },
    { label: 'Raydium LP · estimado', value: 26.67, color: '#ffd36e' },
  ];

  const $ = (selector) => document.querySelector(selector);
  const isValidPublicKey = (value) => typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  const shortAddress = (value) => `${value.slice(0, 4)}…${value.slice(-4)}`;
  let provider = null;
  let publicKey = '';
  let toastTimer = 0;

  function showToast(message, type = 'success') {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast visible${type === 'error' ? ' error' : ''}`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.className = 'toast'; }, 3200);
  }

  function getWalletProvider() {
    if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if (window.solflare?.isSolflare) return window.solflare;
    if (window.solana?.connect) return window.solana;
    return null;
  }

  async function readBalance(address) {
    const response = await fetch(config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address, { commitment: 'confirmed' }] }),
    });
    if (!response.ok) throw new Error(`RPC ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || 'RPC error');
    return Number(payload.result.value) / 1_000_000_000;
  }

  function setWalletUI(address, balance) {
    const button = $('#wallet-button');
    const label = $('#wallet-label');
    const status = $('#wallet-status');
    const balanceLabel = $('#wallet-balance');
    const connected = Boolean(address);
    button?.classList.toggle('connected', connected);
    if (label) label.textContent = connected ? shortAddress(address) : 'Conectar wallet';
    if (status) status.textContent = connected ? shortAddress(address) : 'No conectada';
    if (balanceLabel) balanceLabel.textContent = connected
      ? (Number.isFinite(balance) ? `${balance.toLocaleString('es-ES', { maximumFractionDigits: 4 })} SOL · ${config.network}` : `${config.network} · saldo no disponible`)
      : 'Conecta una wallet compatible';
  }

  async function connectWallet() {
    if (publicKey && provider) {
      try { await provider.disconnect?.(); } catch { /* provider controls disconnect */ }
      publicKey = '';
      setWalletUI('', NaN);
      showToast('Wallet desconectada');
      return;
    }

    provider = getWalletProvider();
    if (!provider) {
      showToast('No se detectó una wallet Solana. Abre esta web en el navegador de Phantom o instala una wallet compatible.', 'error');
      window.open('https://solana.com/ecosystem/explore?categories=wallet', '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const result = await provider.connect();
      publicKey = (result?.publicKey || provider.publicKey)?.toString?.() || '';
      if (!isValidPublicKey(publicKey)) throw new Error('La wallet no devolvió una dirección válida');
      setWalletUI(publicKey, NaN);
      const balance = await readBalance(publicKey).catch(() => NaN);
      setWalletUI(publicKey, balance);
      showToast(`Wallet conectada en ${config.network}`);
    } catch (error) {
      publicKey = '';
      setWalletUI('', NaN);
      showToast(error?.message || 'No se pudo conectar la wallet', 'error');
    }
  }

  function setupTokenState() {
    const network = ['devnet', 'testnet', 'mainnet-beta'].includes(config.network) ? config.network : 'devnet';
    const networkName = $('#network-name');
    if (networkName) networkName.textContent = network.toUpperCase();
    const launchTarget = $('#token-launch-at');
    const targetDate = new Date(config.tokenLaunchAt || '');
    if (launchTarget && !Number.isNaN(targetDate.getTime())) launchTarget.textContent = targetDate.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

    const mint = String(config.tokenMint || '').trim();
    const actions = $('#contract-actions');
    if (!isValidPublicKey(mint)) return;

    $('#mint-status').textContent = 'Configurado';
    $('#mint-address').textContent = mint;
    actions.hidden = false;
    const clusterQuery = network === 'mainnet-beta' ? '' : `?cluster=${encodeURIComponent(network)}`;
    const solscan = $('#solscan-link');
    solscan.href = `https://solscan.io/token/${encodeURIComponent(mint)}${clusterQuery}`;
    const dex = $('#dexscreener-link');
    if (network === 'mainnet-beta') {
      dex.href = `https://dexscreener.com/solana/${encodeURIComponent(mint)}`;
      dex.hidden = false;
    }
    $('#copy-mint').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(mint); showToast('Dirección copiada'); }
      catch { showToast('No se pudo copiar. Mantén pulsada la dirección.', 'error'); }
    });
  }

  function setupCommunity() {
    const container = $('#community-links');
    const links = [
      ['X / Twitter', config.links?.x],
      ['Discord', config.links?.discord],
      ['Telegram', config.links?.telegram],
    ].filter(([, url]) => {
      try { return Boolean(url) && ['http:', 'https:'].includes(new URL(url).protocol); }
      catch { return false; }
    });
    links.forEach(([name, url]) => {
      const anchor = document.createElement('a');
      anchor.className = 'button button-ghost';
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.textContent = name;
      container.append(anchor);
    });
  }

  function setupAllocation() {
    const legend = $('#allocation-legend');
    legend.replaceChildren();
    allocations.forEach((item) => {
      const row = document.createElement('li');
      row.innerHTML = `<i style="--legend-color:${item.color}"></i><span>${item.label}</span><b>${item.value}%</b>`;
      legend.append(row);
    });
  }

  function setupMotion() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveals = document.querySelectorAll('.reveal');
    if (reduced || !('IntersectionObserver' in window)) {
      reveals.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 3, 2) * 90}ms`;
      observer.observe(item);
    });
  }

  function setupScroll() {
    const header = $('#site-header');
    const progress = $('#scroll-progress-bar');
    const routeProgress = $('#route-progress');
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      progress.style.width = `${ratio * 100}%`;
      header.classList.toggle('scrolled', window.scrollY > 24);
      if (routeProgress) routeProgress.style.height = `${Math.min(Math.max((ratio - .38) * 270, 0), 100)}%`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function setupMenu() {
    const toggle = $('#menu-toggle');
    const menu = $('#fullmenu');
    const close = $('#fullmenu-close');
    if (!toggle || !menu) return;
    const setOpen = (open) => {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
      if (open) menu.querySelector('.fullmenu-nav a')?.focus();
      else toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(menu.hidden));
    close?.addEventListener('click', () => setOpen(false));
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !menu.hidden) setOpen(false); });
  }

  function setupLaunchCountdown() {
    const target = new Date(config.launchpool?.depositStart || config.tokenLaunchAt || '');
    const box = $('#launch-countdown');
    if (!box || Number.isNaN(target.getTime())) return;
    const ids = ['days', 'hours', 'minutes', 'seconds'].map((k) => $(`#launch-${k}`));
    const render = () => {
      const remaining = Math.max(target.getTime() - Date.now(), 0);
      if (remaining === 0) {
        box.hidden = true;
        $('#launch-bar-sub').textContent = 'Consulta el estado en la página del Launch Pool';
        return false;
      }
      const t = Math.floor(remaining / 1000);
      [Math.floor(t / 86400), Math.floor((t % 86400) / 3600), Math.floor((t % 3600) / 60), t % 60]
        .forEach((value, i) => { ids[i].textContent = String(value).padStart(2, '0'); });
      box.setAttribute('aria-label', `${ids[0].textContent} días, ${ids[1].textContent} horas y ${ids[2].textContent} minutos para la apertura`);
      return true;
    };
    if (render()) window.setInterval(render, 1000);
  }

  function setupCountdown() {
    const target = new Date(2026, 10, 19, 0, 0, 0, 0);
    const nodes = {
      days: $('#countdown-days'), hours: $('#countdown-hours'),
      minutes: $('#countdown-minutes'), seconds: $('#countdown-seconds'),
    };
    const countdown = $('#countdown');
    const released = $('#released-message');
    if (!countdown || !released) return;
    const render = () => {
      const remaining = Math.max(target.getTime() - Date.now(), 0);
      if (remaining === 0) {
        countdown.hidden = true;
        released.hidden = false;
        released.classList.add('release-active');
        return false;
      }
      const totalSeconds = Math.floor(remaining / 1000);
      nodes.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(3, '0');
      nodes.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
      nodes.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      nodes.seconds.textContent = String(totalSeconds % 60).padStart(2, '0');
      countdown.setAttribute('aria-label', `${nodes.days.textContent} días, ${nodes.hours.textContent} horas, ${nodes.minutes.textContent} minutos y ${nodes.seconds.textContent} segundos`);
      return true;
    };
    if (render()) window.setInterval(render, 1000);
  }

  // Flip-clock countdown to the Launch Pool opening, with a siren pulse,
  // a "wanted level" that rises as the date approaches and a time-based load bar.
  function setupMissionClock() {
    const clock = $('#mission-clock');
    const target = new Date(config.launchpool?.depositStart || config.tokenLaunchAt || '');
    if (!clock || Number.isNaN(target.getTime())) return;
    const announced = Date.parse('2026-11-09T00:00:00Z');
    const section = $('#mision');
    const units = Object.fromEntries(['d', 'h', 'm', 's'].map((u) => [u, clock.querySelectorAll(`[data-unit="${u}"] b`)]));
    const stars = [...document.querySelectorAll('#wanted-stars i')];
    const bar = $('#mission-bar');
    const percent = $('#mission-percent');
    const setDigits = (nodes, value) => {
      const text = String(value).padStart(2, '0').slice(-2);
      nodes.forEach((node, i) => {
        if (node.textContent === text[i]) return;
        node.textContent = text[i];
        node.classList.remove('flip');
        void node.offsetWidth;
        node.classList.add('flip');
      });
    };
    const render = () => {
      const now = Date.now();
      const remaining = Math.max(target.getTime() - now, 0);
      if (remaining === 0) {
        clock.hidden = true;
        $('#mission-live').hidden = false;
        section?.classList.add('is-live');
        stars.forEach((s) => s.classList.add('on'));
        if (bar) bar.style.width = '100%';
        if (percent) percent.textContent = '100%';
        return false;
      }
      const t = Math.floor(remaining / 1000);
      const d = Math.floor(t / 86400);
      setDigits(units.d, Math.min(d, 99));
      setDigits(units.h, Math.floor((t % 86400) / 3600));
      setDigits(units.m, Math.floor((t % 3600) / 60));
      setDigits(units.s, t % 60);
      const level = Math.max(0, Math.min(5, 5 - d));
      stars.forEach((s, i) => s.classList.toggle('on', i < level));
      const share = Math.max(0, Math.min(1, (now - announced) / (target.getTime() - announced)));
      if (bar) bar.style.width = `${(share * 100).toFixed(1)}%`;
      if (percent) percent.textContent = `${Math.floor(share * 100)}%`;
      clock.setAttribute('aria-label', `${d} días, ${Math.floor((t % 86400) / 3600)} horas y ${Math.floor((t % 3600) / 60)} minutos para la apertura`);
      section?.classList.toggle('tick', t % 2 === 0);
      return true;
    };
    if (render()) window.setInterval(render, 1000);
  }

  function setupCursorGlow() {
    const glow = $('#cursor-glow');
    if (!glow || window.matchMedia('(pointer: coarse)').matches) return;
    window.addEventListener('pointermove', (event) => {
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    }, { passive: true });
  }

  function setupMarquees() {
    document.querySelectorAll('[data-marquee]').forEach((track) => {
      if (track.dataset.cloned) return;
      [...track.children].forEach((child) => {
        const copy = child.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
        track.append(copy);
      });
      track.dataset.cloned = 'true';
    });
  }

  function playTrailer(button) {
    if (!button || button.classList.contains('playing')) return;
    const src = button.dataset.embed;
    if (!/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]+$/.test(src || '')) return;
    const frame = document.createElement('iframe');
    frame.src = `${src}?autoplay=1&rel=0`;
    frame.title = button.getAttribute('aria-label') || 'Tráiler oficial';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    button.classList.add('playing');
    button.append(frame);
  }

  function setupTrailers() {
    document.querySelectorAll('.mp-trailer').forEach((button) => button.addEventListener('click', () => playTrailer(button)));
    document.querySelectorAll('[data-play-trailer]').forEach((trigger) => trigger.addEventListener('click', () => {
      const main = $('#trailer-main');
      main?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => playTrailer(main), 500);
    }));
  }

  function setupTabs() {
    const tabs = document.querySelectorAll('.mp-tabs [data-filter]');
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      const filter = tab.dataset.filter;
      document.querySelectorAll('.mp-card').forEach((card) => card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.rarity !== filter));
    }));
  }

  function setupGlow() {
    document.addEventListener('pointermove', (event) => {
      const card = event.target.closest?.('.glow-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }, { passive: true });
    const links = [...document.querySelectorAll('.mp-nav a[href^="#"]')];
    const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window) || !sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((section) => observer.observe(section));
  }

  function setupProviderEvents() {
    const detected = getWalletProvider();
    if (!detected?.on) return;
    provider = detected;
    detected.on('disconnect', () => { publicKey = ''; setWalletUI('', NaN); });
    detected.on('accountChanged', (key) => {
      publicKey = key?.toString?.() || '';
      if (!isValidPublicKey(publicKey)) { setWalletUI('', NaN); return; }
      readBalance(publicKey).then((balance) => setWalletUI(publicKey, balance)).catch(() => setWalletUI(publicKey, NaN));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#year').textContent = String(new Date().getFullYear());
    $('#wallet-button').addEventListener('click', connectWallet);
    setupAllocation();
    setupTokenState();
    setupCommunity();
    setupMotion();
    setupScroll();
    setupMenu();
    setupCountdown();
    setupLaunchCountdown();
    setupMissionClock();
    setupMarquees();
    setupTrailers();
    setupTabs();
    setupGlow();
    setupCursorGlow();
    setupProviderEvents();
  });

  window.MissionPassed = { isValidPublicKey, shortAddress };
})();
