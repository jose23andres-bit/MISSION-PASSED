// MISSION PASSED · map of every coin. Original neon city (not a game map).
// One blip per character token. With a mint published, price / mcap / 24h volume come live from DexScreener.
(() => {
  'use strict';
  const cfg = window.MISSION_PASSED_CONFIG || {};
  const base = cfg.basePath || '';
  const coins = cfg.characterTokens || [];
  const zones = cfg.mapZones || [];
  const root = document.getElementById('mapa');
  if (!root || !coins.length) return;
  const zoneById = Object.fromEntries(zones.map((z) => [z.id, z]));
  const $ = (s) => root.querySelector(s);
  const isMint = (m) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m || '');
  const money = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${Number(n).toFixed(n < 1 ? 6 : 2)}`);
  const live = {};

  // ---------- blips ----------
  const layer = $('.mp-map-blips');
  coins.forEach((c) => {
    const z = zoneById[c.zone] || { color: '#ff2d9b' };
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mp-blip';
    b.dataset.slug = c.slug;
    b.style.left = `${(c.x / 1000) * 100}%`;
    b.style.top = `${(c.y / 800) * 100}%`;
    b.style.setProperty('--zc', z.color);
    b.innerHTML = `<b style="background-image:url('${base}/tokens/${c.slug}.png')"></b><span>$${c.symbol}</span>`;
    b.setAttribute('aria-label', `${c.name}, $${c.symbol}`);
    b.addEventListener('click', (e) => { e.stopPropagation(); select(c.slug); });
    layer.append(b);
  });
  $('.mp-map-zones').querySelectorAll('[data-zone]').forEach((el) => {
    el.addEventListener('click', () => selectZone(el.dataset.zone));
  });

  // ---------- side panel ----------
  const panel = $('.mp-map-panel');
  function select(slug) {
    const c = coins.find((x) => x.slug === slug);
    if (!c) return;
    const z = zoneById[c.zone] || {};
    root.querySelectorAll('.mp-blip').forEach((b) => b.classList.toggle('on', b.dataset.slug === slug));
    const d = live[c.slug];
    panel.style.setProperty('--zc', z.color || '#ff2d9b');
    panel.innerHTML = `
      <img src="${base}/tokens/${c.slug}.png" alt="" width="120" height="120" />
      <small>${z.name || ''} · ${c.rarity}</small>
      <h3>$${c.symbol}</h3>
      <p>${c.name}</p>
      <dl>
        <div><dt>Precio</dt><dd>${d ? money(d.price) : '—'}</dd></div>
        <div><dt>Mcap</dt><dd>${d ? money(d.mcap) : '—'}</dd></div>
        <div><dt>Vol 24h</dt><dd>${d ? money(d.vol) : '—'}</dd></div>
      </dl>
      ${isMint(c.mint)
        ? `<a class="mp-btn mp-btn-hot" href="https://pump.fun/coin/${encodeURIComponent(c.mint)}" target="_blank" rel="noopener noreferrer">Comprar en Pump.fun <b>›</b></a>
           <code title="${c.mint}">${c.mint.slice(0, 6)}…${c.mint.slice(-6)}</code>`
        : '<span class="mp-map-soon">Próximamente en Pump.fun</span>'}`;
    panel.hidden = false;
  }
  function selectZone(id) {
    const z = zoneById[id];
    const here = coins.filter((c) => c.zone === id);
    root.querySelectorAll('[data-zone]').forEach((el) => el.classList.toggle('on', el.dataset.zone === id));
    if (here.length) { select(here[0].slug); return; }
    panel.style.setProperty('--zc', z.color);
    panel.innerHTML = `<small>Zona</small><h3>${z.name}</h3><p>${z.blurb}</p><span class="mp-map-soon">Sin token todavía</span>`;
    panel.hidden = false;
  }

  // ---------- pan + zoom (drag, wheel, pinch via buttons) ----------
  const view = $('.mp-map-view');
  const stage = $('.mp-map-stage');
  let scale = 1, tx = 0, ty = 0, drag = null;
  const apply = () => { stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
  const clamp = () => {
    const w = view.clientWidth, h = view.clientHeight;
    tx = Math.min(0, Math.max(w - w * scale, tx));
    ty = Math.min(0, Math.max(h - h * scale, ty));
  };
  const zoom = (f, cx = view.clientWidth / 2, cy = view.clientHeight / 2) => {
    const next = Math.min(3, Math.max(1, scale * f));
    tx = cx - ((cx - tx) * next) / scale; ty = cy - ((cy - ty) * next) / scale; scale = next;
    clamp(); apply();
  };
  view.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !root.matches(':hover')) return;
    e.preventDefault();
    const r = view.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  view.addEventListener('pointerdown', (e) => { if (scale > 1 && !e.target.closest('button')) { drag = { x: e.clientX - tx, y: e.clientY - ty }; view.setPointerCapture(e.pointerId); } });
  view.addEventListener('pointermove', (e) => { if (drag) { tx = e.clientX - drag.x; ty = e.clientY - drag.y; clamp(); apply(); } });
  view.addEventListener('pointerup', () => { drag = null; });
  $('[data-zoom="in"]').addEventListener('click', () => zoom(1.3));
  $('[data-zoom="out"]').addEventListener('click', () => zoom(1 / 1.3));
  $('[data-zoom="reset"]').addEventListener('click', () => { scale = 1; tx = 0; ty = 0; apply(); });

  // ---------- live data (DexScreener, read-only) ----------
  async function refresh() {
    const mints = coins.filter((c) => isMint(c.mint)).map((c) => c.mint);
    let mcap = 0, vol = 0;
    if (mints.length) {
      try {
        const r = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mints.join(',')}`);
        const pairs = await r.json();
        for (const c of coins) {
          const best = pairs.filter((p) => p.baseToken?.address === c.mint).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
          if (best) live[c.slug] = { price: Number(best.priceUsd) || 0, mcap: Number(best.marketCap || best.fdv) || 0, vol: Number(best.volume?.h24) || 0 };
        }
      } catch { /* keep last data */ }
    }
    Object.values(live).forEach((d) => { mcap += d.mcap; vol += d.vol; });
    $('[data-stat="mcap"]').textContent = mints.length ? money(mcap) : '—';
    $('[data-stat="vol"]').textContent = mints.length ? money(vol) : '—';
    $('[data-stat="live"]').textContent = `${mints.length} / ${coins.length}`;
    const sel = root.querySelector('.mp-blip.on');
    if (sel) select(sel.dataset.slug);
  }

  select(coins.find((c) => c.slug === 'rico') ? 'rico' : coins[0].slug);
  refresh();
  window.setInterval(() => { if (!document.hidden) refresh(); }, 30000);
})();
