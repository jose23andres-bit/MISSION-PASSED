// MISSION PASSED presale: live tier price, Phantom / MetaMask / any Wallet Standard Solana wallet, SOL · USDC · USDT.
// The buyer signs every payment in their own wallet. This page never sees a seed or private key.
(() => {
  'use strict';
  const cfg = window.MISSION_PASSED_CONFIG || {};
  const P = cfg.presale || {};
  const T = window.MPPresaleTiers;
  const W3 = window.solanaWeb3;
  const $ = (id) => document.getElementById(id);
  const isKey = (v) => typeof v === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
  const NET = cfg.network === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
  const CHAIN = NET === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet';
  const MINTS = NET === 'mainnet-beta'
    ? { USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }
    : { USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' };
  const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const ATA_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
  const PYTH_SOL_USD = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
  const FEE_RESERVE_SOL = 0.003;
  const tiers = T.normalize(P.tiers || T.parse());
  const fmt = (n, d = 2) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: d });
  const usd = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
  const explorer = (kind, id) => `https://solscan.io/${kind}/${encodeURIComponent(id)}${NET === 'mainnet-beta' ? '' : `?cluster=${NET}`}`;

  const state = { solUsd: 0, raisedSol: 0, currency: 'SOL', wallet: null, account: null, legacy: null, busy: false };
  const start = Date.parse(P.start), end = Date.parse(P.end);
  const isOpen = () => Date.now() >= start && Date.now() < end;
  const enabled = isKey(P.wallet);

  // ---------- RPC + prices ----------
  async function rpc(method, params) {
    const response = await fetch(cfg.rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    if (!response.ok) throw new Error(`RPC ${response.status}`);
    const body = await response.json();
    if (body.error) throw new Error(body.error.message || 'RPC error');
    return body.result;
  }

  async function readSolUsd() {
    try {
      const r = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_SOL_USD}&parsed=true`);
      const p = (await r.json()).parsed[0].price;
      const value = Number(p.price) * 10 ** Number(p.expo);
      if (value > 0 && Date.now() / 1000 - Number(p.publish_time) < 300) return value;
    } catch { /* fall back */ }
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const value = Number((await r.json()).solana.usd);
    if (!(value > 0)) throw new Error('Precio de SOL no disponible');
    return value;
  }

  async function tokenBalance(owner, mint) {
    const result = await rpc('getTokenAccountsByOwner', [owner, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
    return result.value.reduce((sum, item) => sum + Number(item.account.data.parsed.info.tokenAmount.uiAmountString || 0), 0);
  }

  // Raised = presale wallet balance (minus the published baseline) + stablecoins converted at the current SOL price.
  async function readRaised() {
    const lamports = (await rpc('getBalance', [P.wallet, { commitment: 'confirmed' }])).value;
    let stable = 0;
    for (const mint of Object.values(MINTS)) stable += await tokenBalance(P.wallet, mint).catch(() => 0);
    return Math.max(0, lamports / 1e9 - (P.baselineSol || 0)) + (state.solUsd > 0 ? stable / state.solUsd : 0);
  }

  // ---------- price board ----------
  function renderBoard() {
    const index = T.tierAt(state.raisedSol, tiers);
    const tier = tiers[index], next = tiers[index + 1];
    $('ps-price').textContent = usd(tier.priceUsd);
    $('ps-tier').textContent = `Tramo ${index + 1} de ${tiers.length}`;
    $('ps-raised').textContent = enabled ? `${fmt(state.raisedSol, 2)} SOL` : '— SOL';
    $('ps-next').textContent = next ? `Sube a ${usd(next.priceUsd)} cuando se alcancen ${fmt(next.fromSol)} SOL (faltan ${fmt(Math.max(0, next.fromSol - state.raisedSol), 2)} SOL)` : 'Último tramo hasta el lanzamiento';
    $('ps-solusd').textContent = state.solUsd ? `1 SOL ≈ ${usd(state.solUsd.toFixed(2))}` : '';
    const top = (tiers.at(-1).fromSol || 100) * 1.25;
    $('ps-meter-fill').style.width = `${Math.min(100, (state.raisedSol / top) * 100)}%`;
    const marks = $('ps-meter-marks');
    if (!marks.childElementCount) tiers.forEach((t, i) => {
      const mark = document.createElement('span');
      mark.style.left = `${(t.fromSol / top) * 100}%`;
      mark.innerHTML = `<b>${usd(t.priceUsd)}</b><small>${i === 0 ? 'Inicio' : `${fmt(t.fromSol)} SOL`}</small>`;
      marks.append(mark);
    });
    marks.querySelectorAll('span').forEach((mark, i) => mark.classList.toggle('active', i === index));
    renderQuote();
  }

  async function refresh() {
    try { state.solUsd = await readSolUsd(); } catch { /* keep last price */ }
    if (enabled) try { state.raisedSol = await readRaised(); } catch { /* keep last */ }
    renderBoard();
  }

  function setupCountdown() {
    const tick = () => {
      const target = Date.now() < start ? start : end;
      const left = Math.max(0, target - Date.now());
      const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
      $('ps-countdown').textContent = `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
      $('ps-countdown-label').textContent = Date.now() < start ? 'La preventa abre en' : Date.now() < end ? 'La preventa cierra en' : 'Preventa cerrada';
    };
    tick();
    window.setInterval(tick, 1000);
  }

  // ---------- quote ----------
  function amount() { return Number(String($('ps-amount').value).replace(',', '.')); }

  function renderQuote() {
    const out = $('ps-quote');
    const value = amount();
    if (!(value > 0) || !state.solUsd) { out.innerHTML = '<span>Introduce un importe para ver cuántos MP recibes.</span>'; return null; }
    const paymentSol = state.currency === 'SOL' ? value : value / state.solUsd;
    const q = T.quote({ raisedSol: state.raisedSol, paymentSol, solUsd: state.solUsd, tiers });
    const split = q.segments.length > 1 ? `<small>Tu compra cruza un tramo: ${q.segments.map((s) => `${fmt(s.mp, 0)} MP a ${usd(s.priceUsd)}`).join(' + ')}</small>` : '';
    out.innerHTML = `<strong>${fmt(q.mp, 0)} MP</strong><span>≈ ${usd(q.usd.toFixed(2))} · precio medio ${usd(q.averagePriceUsd.toPrecision(3))}</span>${split}`;
    return { ...q, paymentSol };
  }

  // ---------- wallets (Wallet Standard: Phantom, MetaMask, Solflare, Backpack…) ----------
  const wallets = [];
  function registerWallets(...list) {
    for (const wallet of list) {
      const ok = wallet?.features?.['standard:connect'] && wallet.features['solana:signAndSendTransaction'] && (wallet.chains || []).some((c) => c.startsWith('solana:'));
      if (ok && !wallets.some((w) => w.name === wallet.name)) wallets.push(wallet);
    }
    renderWallets();
    return () => {};
  }
  const api = Object.freeze({ register: registerWallets });
  window.addEventListener('wallet-standard:register-wallet', (event) => { try { event.detail(api); } catch { /* bad wallet */ } });
  try { window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: api })); } catch { /* old browser */ }

  function walletButton(name, icon, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ps-wallet';
    if (typeof icon === 'string' && /^(data:image\/|https:\/\/)/.test(icon)) {
      const img = document.createElement('img');
      img.src = icon; img.alt = ''; img.width = 28; img.height = 28;
      button.append(img);
    }
    const label = document.createElement('span');
    label.textContent = name;
    button.append(label);
    button.addEventListener('click', onClick);
    return button;
  }

  function renderWallets() {
    const box = $('ps-wallets');
    if (!box || state.account) return;
    box.replaceChildren();
    wallets.forEach((wallet) => box.append(walletButton(wallet.name, wallet.icon, () => connectStandard(wallet))));
    const names = wallets.map((w) => w.name.toLowerCase());
    const here = encodeURIComponent(window.location.href);
    if (!names.some((n) => n.includes('phantom'))) {
      if (window.phantom?.solana?.isPhantom) box.append(walletButton('Phantom', '', connectLegacy));
      else box.append(walletButton('Abrir en Phantom', '', () => { window.location.href = `https://phantom.app/ul/browse/${here}?ref=${encodeURIComponent(window.location.origin)}`; }));
    }
    if (!names.some((n) => n.includes('metamask'))) {
      box.append(walletButton('Abrir en MetaMask', '', () => { window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`; }));
    }
  }

  async function connectStandard(wallet) {
    try {
      const { accounts } = await wallet.features['standard:connect'].connect();
      const account = (accounts || wallet.accounts).find((a) => (a.chains || []).includes(CHAIN)) || (accounts || wallet.accounts)[0];
      if (!account || !isKey(account.address)) throw new Error('La wallet no devolvió una cuenta de Solana');
      state.wallet = wallet; state.account = account; state.legacy = null;
      onConnected(wallet.name, account.address);
    } catch (error) { status(error?.message || 'Conexión cancelada', 'error'); }
  }

  async function connectLegacy() {
    try {
      const provider = window.phantom.solana;
      const result = await provider.connect();
      const address = (result?.publicKey || provider.publicKey).toString();
      state.legacy = provider; state.wallet = null; state.account = { address };
      onConnected('Phantom', address);
    } catch (error) { status(error?.message || 'Conexión cancelada', 'error'); }
  }

  async function onConnected(name, address) {
    $('ps-wallets').replaceChildren();
    const chip = document.createElement('p');
    chip.className = 'ps-connected';
    chip.textContent = `${name} · ${address.slice(0, 4)}…${address.slice(-4)}`;
    $('ps-wallets').append(chip);
    await showBalance();
    updatePayButton();
    status(`Wallet conectada en ${NET}.`);
  }

  async function showBalance() {
    if (!state.account) return;
    try {
      const sol = (await rpc('getBalance', [state.account.address, { commitment: 'confirmed' }])).value / 1e9;
      const parts = [`${fmt(sol, 4)} SOL`];
      for (const [symbol, mint] of Object.entries(MINTS)) parts.push(`${fmt(await tokenBalance(state.account.address, mint).catch(() => 0), 2)} ${symbol}`);
      $('ps-balance').textContent = `Saldo: ${parts.join(' · ')}`;
      state.balance = sol;
    } catch { $('ps-balance').textContent = 'Saldo no disponible'; }
  }

  // ---------- payment ----------
  function u64(value) {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
    return bytes;
  }

  function ata(owner, mint) {
    return W3.PublicKey.findProgramAddressSync([owner.toBytes(), new W3.PublicKey(TOKEN_PROGRAM).toBytes(), mint.toBytes()], new W3.PublicKey(ATA_PROGRAM))[0];
  }

  function buildTransaction({ payer, value, blockhash, lastValidBlockHeight }) {
    const dest = new W3.PublicKey(P.wallet);
    const tx = new W3.Transaction({ feePayer: payer, blockhash, lastValidBlockHeight });
    if (state.currency === 'SOL') {
      tx.add(W3.SystemProgram.transfer({ fromPubkey: payer, toPubkey: dest, lamports: Math.round(value * 1e9) }));
      return tx;
    }
    const mint = new W3.PublicKey(MINTS[state.currency]);
    const from = ata(payer, mint), to = ata(dest, mint);
    const token = new W3.PublicKey(TOKEN_PROGRAM);
    // Creates the presale wallet's token account only if it does not exist yet (no-op otherwise).
    tx.add(new W3.TransactionInstruction({
      programId: new W3.PublicKey(ATA_PROGRAM),
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true }, { pubkey: to, isSigner: false, isWritable: true },
        { pubkey: dest, isSigner: false, isWritable: false }, { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: W3.SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: token, isSigner: false, isWritable: false },
      ],
      data: Uint8Array.of(1),
    }));
    const data = new Uint8Array(10);
    data[0] = 12; data.set(u64(Math.round(value * 1e6)), 1); data[9] = 6; // TransferChecked, 6 decimals (USDC/USDT)
    tx.add(new W3.TransactionInstruction({
      programId: token,
      keys: [{ pubkey: from, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false }, { pubkey: to, isSigner: false, isWritable: true }, { pubkey: payer, isSigner: true, isWritable: false }],
      data,
    }));
    return tx;
  }

  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function base58(bytes) {
    let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
    let out = ''; while (n > 0n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
    for (const b of bytes) { if (b !== 0) break; out = `1${out}`; }
    return out;
  }

  async function waitForConfirmation(signature, lastValidBlockHeight) {
    for (let i = 0; i < 90; i += 1) {
      const { value } = await rpc('getSignatureStatuses', [[signature], { searchTransactionHistory: true }]);
      const s = value[0];
      if (s?.err) throw new Error('La transacción falló en la red. No se cobró el importe.');
      if (s && ['confirmed', 'finalized'].includes(s.confirmationStatus)) return;
      const height = await rpc('getBlockHeight', [{ commitment: 'confirmed' }]).catch(() => 0);
      if (height > lastValidBlockHeight) throw new Error('La transacción caducó sin confirmarse. Revisa Solscan antes de reintentar.');
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Sin confirmación todavía. Revisa la firma en Solscan antes de reintentar.');
  }

  async function pay() {
    if (state.busy) return;
    const q = renderQuote();
    const value = amount();
    try {
      if (!enabled) throw new Error('La preventa todavía no tiene wallet de cobro publicada.');
      if (!isOpen()) throw new Error('La preventa no está abierta ahora mismo.');
      if (!state.account) throw new Error('Conecta tu wallet primero.');
      if (!$('ps-ack').checked) throw new Error('Marca la casilla de condiciones para continuar.');
      if (!q) throw new Error('Importe inválido.');
      if (q.usd < (P.minUsd || 1)) throw new Error(`Compra mínima: ${usd(P.minUsd || 1)}.`);
      if (state.currency !== 'SOL' && !MINTS[state.currency]) throw new Error(`${state.currency} no está disponible en ${NET}.`);
      if (state.account.address === P.wallet) throw new Error('No puedes pagar desde la wallet de la preventa.');
      await showBalance();
      const needSol = (state.currency === 'SOL' ? value : 0) + FEE_RESERVE_SOL;
      if (state.balance < needSol) throw new Error(`Saldo insuficiente: necesitas ${fmt(needSol, 4)} SOL (incluye comisión de red).`);
      if (state.currency !== 'SOL') {
        const have = await tokenBalance(state.account.address, MINTS[state.currency]);
        if (have < value) throw new Error(`Saldo insuficiente de ${state.currency}: tienes ${fmt(have, 2)}.`);
      }
      state.busy = true; updatePayButton();
      status('Revisa y firma la transacción en tu wallet…');
      const payer = new W3.PublicKey(state.account.address);
      const { blockhash, lastValidBlockHeight } = (await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value;
      const tx = buildTransaction({ payer, value, blockhash, lastValidBlockHeight });
      let signature;
      if (state.legacy) {
        signature = (await state.legacy.signAndSendTransaction(tx)).signature;
      } else {
        const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
        const [result] = await state.wallet.features['solana:signAndSendTransaction'].signAndSendTransaction({ account: state.account, transaction: new Uint8Array(bytes), chain: CHAIN });
        signature = base58(result.signature);
      }
      status('Pago enviado. Esperando confirmación de la red…');
      await waitForConfirmation(signature, lastValidBlockHeight);
      receipt({ signature, value, q });
      status('✅ Pago confirmado.');
      await refresh(); await showBalance();
    } catch (error) {
      status(/reject|cancel|denied/i.test(error?.message || '') ? 'Has cancelado la firma. No se ha cobrado nada.' : (error?.message || 'No se pudo completar el pago'), 'error');
    } finally { state.busy = false; updatePayButton(); }
  }

  function receipt({ signature, value, q }) {
    const entry = { signature, wallet: state.account.address, currency: state.currency, amount: value, mpEstimate: Math.floor(q.mp), at: new Date().toISOString(), network: NET };
    try { const list = JSON.parse(localStorage.getItem('mp-presale') || '[]'); list.unshift(entry); localStorage.setItem('mp-presale', JSON.stringify(list.slice(0, 50))); } catch { /* storage off */ }
    renderReceipts();
  }

  function renderReceipts() {
    const box = $('ps-receipts');
    let list = [];
    try { list = JSON.parse(localStorage.getItem('mp-presale') || '[]'); } catch { /* none */ }
    box.hidden = list.length === 0;
    const ul = box.querySelector('ul');
    ul.replaceChildren();
    for (const item of list) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = explorer('tx', item.signature); a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = `${fmt(item.amount, 4)} ${item.currency} → ≈ ${fmt(item.mpEstimate, 0)} MP · ${new Date(item.at).toLocaleString('es-ES')} ↗`;
      li.append(a);
      ul.append(li);
    }
  }

  function status(message, type = 'info') {
    const box = $('ps-status');
    box.textContent = message;
    box.dataset.type = type;
  }

  function updatePayButton() {
    const button = $('ps-pay');
    const ready = enabled && isOpen() && state.account && !state.busy;
    button.disabled = !ready;
    button.textContent = state.busy ? 'Procesando…' : !enabled ? 'Preventa pendiente de activar' : !isOpen() ? 'Preventa cerrada' : !state.account ? 'Conecta tu wallet' : `Pagar con ${state.currency}`;
  }

  function setupForm() {
    document.querySelectorAll('[data-currency]').forEach((button) => {
      const available = button.dataset.currency === 'SOL' || MINTS[button.dataset.currency];
      button.disabled = !available;
      if (!available) button.title = `No disponible en ${NET}`;
      button.addEventListener('click', () => {
        state.currency = button.dataset.currency;
        document.querySelectorAll('[data-currency]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        $('ps-unit').textContent = state.currency;
        $('ps-amount').step = state.currency === 'SOL' ? '0.01' : '1';
        renderQuote(); updatePayButton();
      });
    });
    $('ps-amount').addEventListener('input', renderQuote);
    document.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => { $('ps-amount').value = b.dataset.quick; renderQuote(); }));
    $('ps-pay').addEventListener('click', pay);
  }

  function setupStatic() {
    $('ps-network').textContent = NET === 'mainnet-beta' ? 'Solana Mainnet' : 'Solana Devnet · modo prueba (sin dinero real)';
    document.body.classList.toggle('ps-test', NET !== 'mainnet-beta');
    const walletBox = $('ps-receiver');
    if (enabled) {
      walletBox.innerHTML = '';
      const code = document.createElement('code'); code.setAttribute('translate', 'no'); code.textContent = P.wallet;
      const link = document.createElement('a'); link.href = explorer('account', P.wallet); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'mp-link'; link.textContent = 'Ver en Solscan ↗';
      walletBox.append(code, ' ', link);
    }
    const ladder = $('ps-ladder');
    tiers.forEach((tier, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${usd(tier.priceUsd)}</b><span>${i === 0 ? 'Desde el primer pago' : `Desde ${fmt(tier.fromSol)} SOL recaudados`}</span>`;
      ladder.append(li);
    });
    $('ps-end').textContent = new Date(end).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
  }

  if (!T || !W3) { status('No se pudo cargar el módulo de pago. Recarga la página.', 'error'); return; }
  setupStatic(); setupForm(); setupCountdown(); renderWallets(); renderReceipts(); updatePayButton(); refresh();
  window.setInterval(refresh, 30_000);
})();
