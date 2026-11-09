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
    { label: 'Fondo de sorteos · disponible', value: 16, color: '#d8ff3e' },
    { label: 'Fondo de sorteos · vesting', value: 4, color: '#a58af4' },
    { label: 'Compradores · Launch Pool', value: 53.33, color: '#56d7d7' },
    { label: 'Raydium LP · estimado', value: 26.67, color: '#ff7148' },
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
      const parallax = Math.min(window.scrollY * .12, 100);
      document.querySelectorAll('.city-back').forEach((el) => { el.style.transform = `translateY(${parallax * .35}px)`; });
      document.querySelectorAll('.city-front').forEach((el) => { el.style.transform = `translateY(${parallax * .18}px)`; });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function setupMenu() {
    const toggle = $('#menu-toggle');
    const nav = $('#site-nav');
    toggle.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    }));
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

  function setupCursorGlow() {
    const glow = $('#cursor-glow');
    if (!glow || window.matchMedia('(pointer: coarse)').matches) return;
    window.addEventListener('pointermove', (event) => {
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    }, { passive: true });
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
    setupCursorGlow();
    setupProviderEvents();
  });

  window.MissionPassed = { isValidPublicKey, shortAddress };
})();
