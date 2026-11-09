(() => {
  const config = window.MISSION_PASSED_CONFIG || {};
  const pool = config.launchpool || {};
  const validKey = (value) => typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  const text = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  const short = (key) => `${key.slice(0, 6)}…${key.slice(-6)}`;
  const fmt = (n) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 });
  const deployed = validKey(config.genesisAccount);

  text('presale-state', deployed && pool.launchUrl ? `REGISTRADA · ${config.network.toUpperCase()}` : deployed ? 'CREADA · SIN ENLACE' : 'NO DESPLEGADA');
  text('allocation-value', `${fmt(pool.tokenAllocation || 533333333)} MP (53,33%)`);
  text('goal-value', Number(pool.raiseGoalSol) > 0 ? `${fmt(pool.raiseGoalSol)} SOL mínimo. Si no se alcanza, los depósitos se reembolsan.` : 'Objetivo pendiente (Genesis exige al menos 250 SOL).');
  text('window-value', pool.depositStart ? `${new Date(pool.depositStart).toLocaleString()} → ${new Date(pool.depositEnd).toLocaleString()} (48 h)` : 'Ventana de 48 h pendiente de publicar.');
  text('transparency-mint', validKey(config.tokenMint) ? `${short(config.tokenMint)} · ${config.network}` : 'No creado');
  text('transparency-treasury', validKey(config.treasuryWallet) ? config.treasuryWallet : 'Wallet pública pendiente');
  text('transparency-presale', deployed ? `53,33% · Genesis ${short(config.genesisAccount)}` : '53,33% · cuenta Genesis pendiente');

  const gate = document.getElementById('purchase-gate');
  const join = document.getElementById('join-launch');
  if (join && pool.launchUrl && deployed) {
    join.href = pool.launchUrl;
    join.hidden = false;
    if (gate) gate.textContent = 'Los depósitos se hacen en la página oficial del lanzamiento en Metaplex. Revisa en tu wallet la dirección del mint antes de firmar.';
  }

  document.getElementById('quote-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const mine = Number(document.getElementById('sol-amount')?.value || 0);
    const total = Number(document.getElementById('sol-total')?.value || 0);
    if (!(mine > 0) || !(total >= mine)) { text('quote-output', 'Introduce tu depósito y un total recaudado mayor o igual que tu depósito.'); return; }
    const tokens = (mine / total) * (pool.tokenAllocation || 533333333);
    text('quote-output', `${fmt(mine)} SOL de un total de ${fmt(total)} SOL → ≈ ${fmt(tokens)} MP. Estimación: el reparto final lo calcula Genesis al cerrar.`);
  });
})();
