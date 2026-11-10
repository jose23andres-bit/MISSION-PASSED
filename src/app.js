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
    const heroImage = $('.mp-hero-img');
    const sceneImages = [...document.querySelectorAll('.mp-section img, .mp-final-img')];
    const progress = $('#scroll-progress-bar');
    const routeProgress = $('#route-progress');
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      progress.style.width = `${ratio * 100}%`;
      header.classList.toggle('scrolled', window.scrollY > 24);
      if (routeProgress) routeProgress.style.height = `${Math.min(Math.max((ratio - .38) * 270, 0), 100)}%`;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (heroImage) heroImage.style.setProperty('--hero-parallax', `${Math.min(window.scrollY * .12, 115)}px`);
        sceneImages.forEach((img) => {
          const rect = img.getBoundingClientRect();
          const depth = Math.max(-1, Math.min(1, (window.innerHeight * .5 - (rect.top + rect.height * .5)) / window.innerHeight));
          img.style.setProperty('--scene-depth', `${depth * -22}px`);
        });
      }
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
    const target = new Date(2026, 10, 15, 20, 0, 0, 0);
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

  // YouTube player commands through postMessage (needs enablejsapi=1).
  function ytCommand(button, func) {
    const frame = button?.querySelector('iframe');
    frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), 'https://www.youtube-nocookie.com');
  }

  // muted=true is used for scroll autoplay: browsers only allow autoplay without sound.
  function playTrailer(button, muted = false) {
    if (!button) return;
    if (button.classList.contains('playing')) {
      ytCommand(button, 'playVideo');
      if (!muted) ytCommand(button, 'unMute');
      return;
    }
    const src = button.dataset.embed;
    if (!/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]+$/.test(src || '')) return;
    const frame = document.createElement('iframe');
    frame.src = `${src}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&modestbranding=1${muted ? '&mute=1' : ''}&origin=${encodeURIComponent(window.location.origin)}`;
    frame.title = button.getAttribute('aria-label') || 'Tráiler oficial';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    button.classList.add('playing');
    button.append(frame);
  }

  // Trailers start muted when at least 60% visible and pause when scrolled away. Only one plays at a time.
  function setupScrollAutoplay() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection?.saveData;
    if (reduced || saveData || !('IntersectionObserver' in window)) return;
    const trailers = [...document.querySelectorAll('.mp-trailer')];
    const ratios = new Map();
    let current = null;
    const pick = () => {
      let best = null, bestRatio = 0.6;
      ratios.forEach((ratio, el) => { if (ratio >= bestRatio) { best = el; bestRatio = ratio; } });
      if (best === current) return;
      if (current) ytCommand(current, 'pauseVideo');
      current = best;
      if (best) playTrailer(best, true);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => ratios.set(entry.target, entry.intersectionRatio));
      pick();
    }, { threshold: [0, 0.3, 0.6, 0.8, 1] });
    trailers.forEach((el) => observer.observe(el));
  }

  function setupTrailers() {
    setupScrollAutoplay();
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

  function setupPresaleDashboard() {
    const slider = $('#mp-demo-slider');
    const demoPercent = $('#mp-demo-percent');
    const demoAmount = $('#mp-demo-amount');
    const goal = Number(config.campaignGoalEur || 50000);
    const money = (value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
    const pct = (value) => `${Number(value).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
    const renderDemo = () => {
      if (!slider) return;
      const value = Math.max(0, Math.min(100, Number(slider.value) || 0));
      if (demoPercent) demoPercent.textContent = `${value}%`;
      if (demoAmount) demoAmount.textContent = money(goal * value / 100);
      slider.setAttribute('aria-valuetext', `${value}% del objetivo, simulación`);
    };
    slider?.addEventListener('input', renderDemo);
    renderDemo();

    const state = $('#mp-live-state');
    const total = $('#mp-live-eur');
    const caption = $('#mp-live-caption');
    const fill = $('#mp-live-fill');
    const percent = $('#mp-live-percent');
    const solNode = $('#mp-live-sol');
    const updated = $('#mp-live-updated');
    const refresh = $('#mp-live-refresh');
    if (!state || !total) return;

    const setOffline = () => {
      state.textContent = config.network === 'mainnet-beta' ? 'TESORERÍA NO CONFIGURADA' : 'DEVNET · PAGOS BLOQUEADOS';
      total.textContent = money(0);
      caption.textContent = '0 € de recaudación confirmada. No se contabilizan saldos de prueba ni estimaciones como ventas.';
      if (fill) fill.style.width = '0%';
      if (percent) percent.textContent = pct(0);
      if (solNode) solNode.textContent = '—';
      if (updated) updated.textContent = 'Fuente: RPC Solana · sin recaudación Mainnet verificable';
    };

    const validWallet = isValidPublicKey(config.presale?.wallet || '');
    if (config.network !== 'mainnet-beta' || !validWallet) {
      setOffline();
      return;
    }

    const rpc = async (method, params) => {
      const response = await fetch(config.rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      if (!response.ok) throw new Error(`RPC ${response.status}`);
      const body = await response.json();
      if (body.error) throw new Error(body.error.message || 'RPC error');
      return body.result;
    };
    const tokenBalance = async (mint) => {
      const result = await rpc('getTokenAccountsByOwner', [config.presale.wallet, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
      return result.value.reduce((sum, item) => sum + Number(item.account.data.parsed.info.tokenAmount.uiAmountString || 0), 0);
    };
    const readEurRates = async () => {
      const [solResponse, fxResponse] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=eur'),
        fetch('https://api.frankfurter.app/latest?from=USD&to=EUR'),
      ]);
      if (!solResponse.ok || !fxResponse.ok) throw new Error('No se pudieron consultar los tipos de cambio');
      const [sol, fx] = await Promise.all([solResponse.json(), fxResponse.json()]);
      const solEur = Number(sol.solana?.eur), usdEur = Number(fx.rates?.EUR);
      if (!(solEur > 0) || !(usdEur > 0)) throw new Error('Tipos de cambio no válidos');
      return { solEur, usdEur };
    };
    const load = async () => {
      if (refresh) { refresh.disabled = true; refresh.textContent = 'Actualizando…'; }
      state.textContent = 'CONSULTANDO MAINNET';
      try {
        const [balance, stableUsd, rates] = await Promise.all([
          rpc('getBalance', [config.presale.wallet, { commitment: 'confirmed' }]),
          Promise.all([
            tokenBalance('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v').catch(() => 0),
            tokenBalance('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB').catch(() => 0),
          ]).then(values => values.reduce((a, b) => a + b, 0)),
          readEurRates(),
        ]);
        const raisedSol = Math.max(0, Number(balance.value) / 1e9 - Math.max(0, Number(config.presale?.baselineSol) || 0));
        const raisedEur = raisedSol * rates.solEur + stableUsd * rates.usdEur;
        const progress = Math.max(0, Math.min(100, raisedEur / goal * 100));
        state.textContent = 'MAINNET · SALDO NETO';
        total.textContent = money(raisedEur);
        caption.textContent = 'Saldo neto visible en la wallet pública de preventa, convertido a euros con tipos de cambio actuales. No equivale a un recuento de compradores.';
        if (fill) fill.style.width = `${progress}%`;
        if (percent) percent.textContent = pct(progress);
        if (solNode) solNode.textContent = `${raisedSol.toLocaleString('es-ES', { maximumFractionDigits: 3 })} SOL`;
        if (updated) updated.textContent = `Actualizado ${new Date().toLocaleTimeString('es-ES')} · RPC Mainnet + CoinGecko + Frankfurter`;
      } catch (error) {
        state.textContent = 'DATOS NO DISPONIBLES';
        caption.textContent = 'No se puede verificar el saldo ahora mismo. No se muestran estimaciones como si fueran recaudación.';
        if (updated) updated.textContent = `Error de consulta: ${error.message}`;
      } finally {
        if (refresh) { refresh.disabled = false; refresh.textContent = 'Actualizar datos ↻'; }
      }
    };
    refresh?.addEventListener('click', load);
    load();
    window.setInterval(load, 60000);
  }

  function setupNftCollection() {
    const dialog = $('#mp-nft-dialog');
    const image = $('#mp-nft-dialog-image');
    const title = $('#mp-nft-dialog-title');
    const rarity = $('#mp-nft-dialog-rarity');
    const story = $('#mp-nft-dialog-story');
    const traits = $('#mp-nft-dialog-traits');
    const favorite = $('#mp-nft-favorite');
    const cards = [...document.querySelectorAll('[data-nft-open]')];
    if (!dialog || !cards.length) return;
    const collection = [
      { name: 'El Conductor', rarity: 'OG', image: '/photos/nft-1.jpg', story: 'Especialista en rutas imposibles. Su pase representa velocidad, precisión y sangre fría.', traits: ['Distrito: Ocean District', 'Rol: Conductor', 'Nivel: OG', 'Serie: 001'] },
      { name: 'La Jefa', rarity: 'Raro', image: '/photos/nft-2.jpg', story: 'Estratega de la marina. Lee la ciudad como un tablero y siempre mueve primero.', traits: ['Distrito: Golden Mile', 'Rol: Estratega', 'Nivel: Raro', 'Serie: 128'] },
      { name: 'El Socio', rarity: 'Épico', image: '/photos/nft-3.jpg', story: 'Conoce cada atajo del pantano y cada puerta de la ciudad. Su valor está en las conexiones.', traits: ['Distrito: Everglade', 'Rol: Explorador', 'Nivel: Épico', 'Serie: 512'] },
      { name: 'Rico', rarity: 'Legendario', image: '/photos/nft-4.jpg', story: 'El anfitrión de Neon Coast. Su pase está concebido como una pieza insignia de la colección.', traits: ['Distrito: Port Aurora', 'Rol: Anfitrión', 'Nivel: Legendario', 'Serie: 999'] },
    ];
    let active = 0;
    const readFavorites = () => { try { return JSON.parse(localStorage.getItem('mp-nft-favorites') || '[]'); } catch { return []; } };
    const saveFavorites = (items) => { try { localStorage.setItem('mp-nft-favorites', JSON.stringify(items)); } catch { /* storage can be unavailable */ } };
    const renderFavorite = () => {
      const items = readFavorites();
      const saved = items.includes(active);
      favorite.textContent = saved ? '♥ Guardado en favoritos' : '♡ Guardar en favoritos';
      favorite.setAttribute('aria-pressed', String(saved));
    };
    cards.forEach((button) => button.addEventListener('click', () => {
      active = Number(button.dataset.nftOpen);
      const item = collection[active];
      if (!item) return;
      image.src = item.image;
      image.alt = item.name + ' · MISSION PASSED';
      title.textContent = item.name;
      rarity.textContent = item.rarity;
      story.textContent = item.story;
      traits.replaceChildren(...item.traits.map((value) => { const li = document.createElement('li'); li.textContent = value; return li; }));
      renderFavorite();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }));
    favorite.addEventListener('click', () => {
      const items = readFavorites();
      saveFavorites(items.includes(active) ? items.filter((value) => value !== active) : [...items, active]);
      renderFavorite();
    });
    $('#mp-nft-dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
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
    setupPresaleDashboard();
    setupNftCollection();
    setupGlow();
    setupCursorGlow();
    setupProviderEvents();
  });

  window.MissionPassed = { isValidPublicKey, shortAddress };
})();
