export const CLUSTERS = Object.freeze({
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
});

export function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) { result[key] = next; index += 1; }
    else result[key] = true;
  }
  return result;
}

export function assertSafeCluster(cluster, execute = false) {
  if (!(cluster in CLUSTERS)) throw new Error(`Cluster no válido: ${cluster}`);
  if (cluster === 'mainnet-beta') {
    if (process.env.ALLOW_MAINNET !== 'true') throw new Error('Mainnet bloqueada: ALLOW_MAINNET no está activado.');
    if (execute) throw new Error('Este proyecto no ejecuta creación en Mainnet. Requiere revisión y autorización humana separadas.');
  }
}

export function validateTokenConfig(config) {
  const errors = [];
  if (config.approvalStatus !== 'APPROVED_FOR_DEVNET') errors.push('approvalStatus debe ser APPROVED_FOR_DEVNET');
  if (config.name !== 'MISSION PASSED') errors.push('name debe ser MISSION PASSED');
  if (!/^\$?[A-Z0-9]{2,10}$/.test(config.symbol || '')) errors.push('symbol debe tener entre 2 y 10 caracteres alfanuméricos');
  if (!Number.isSafeInteger(config.supply) || config.supply <= 0) errors.push('supply debe ser un entero positivo seguro');
  if (!Number.isInteger(config.decimals) || config.decimals < 0 || config.decimals > 9) errors.push('decimals debe estar entre 0 y 9');
  const allocationTotal = Object.values(config.distribution || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  if (Math.abs(allocationTotal - 100) > 0.000001) errors.push(`distribution suma ${allocationTotal}; debe sumar 100`);
  if (config.distribution?.creatorVested !== 30) errors.push('creatorVested debe ser exactamente 30');
  if (typeof config.treasuryPublicKey !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(config.treasuryPublicKey)) errors.push('treasuryPublicKey debe ser una dirección pública Solana');
  if (!Number.isInteger(config.creatorVesting?.cliffDays) || config.creatorVesting.cliffDays < 0) errors.push('creatorVesting.cliffDays no válido');
  if (!Number.isInteger(config.creatorVesting?.durationDays) || config.creatorVesting.durationDays <= 0) errors.push('creatorVesting.durationDays no válido');
  if (!['revoke-after-verification', 'multisig', 'retain'].includes(config.authorities?.mint)) errors.push('mint authority no válida');
  if (!['revoke-after-verification', 'multisig', 'retain'].includes(config.authorities?.freeze)) errors.push('freeze authority no válida');
  if (typeof config.metadataUri !== 'string' || !/^https:\/\//.test(config.metadataUri) || /REPLACE_WITH/i.test(config.metadataUri)) errors.push('metadataUri debe ser una URL HTTPS pública e inmutable sin marcadores');
  return errors;
}

export async function rpcCall(rpcUrl, method, params = []) {
  const response = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || 'RPC error');
  return payload.result;
}
