(() => {
  const config = window.MISSION_PASSED_CONFIG || {};
  const button = document.getElementById('admin-connect');
  const message = document.getElementById('admin-message');
  const state = document.getElementById('admin-state');
  const metrics = document.getElementById('admin-metrics');
  const validKey = (value) => typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  button?.addEventListener('click', async () => {
    const expected = config.treasuryWallet;
    if (!validKey(expected)) { message.textContent = 'No hay wallet de operador configurada.'; return; }
    const provider = window.phantom?.solana || window.solflare || window.solana;
    if (!provider?.connect) { message.textContent = 'No se detectó una wallet Solana compatible.'; return; }
    try {
      const result = await provider.connect();
      const actual = (result?.publicKey || provider.publicKey)?.toString?.() || '';
      if (actual !== expected) { message.textContent = 'La wallet conectada no coincide con la tesorería publicada.'; return; }
      if (!provider.signMessage) { message.textContent = 'La wallet no admite verificación de mensaje.'; return; }
      const challenge = new TextEncoder().encode(`MISSION PASSED operator read-only access\n${location.host}\n${new Date().toISOString()}`);
      await provider.signMessage(challenge, 'utf8');
      state.textContent = 'WALLET VERIFICADA';
      message.textContent = 'Acceso local verificado. No se habilitan cambios económicos.';
      metrics.hidden = false;
    } catch (error) { message.textContent = error?.message || 'Verificación cancelada.'; }
  });
})();
