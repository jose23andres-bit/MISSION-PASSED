// READ-ONLY Devnet smoke check: asks the public RPC for health and genesis hash. Signs nothing, sends nothing.
import { Report } from './lib.mjs';

const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const RPC = process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const report = new Report('Comprobación de red Devnet (solo lectura)');

if (!/^https:\/\/api\.devnet\.solana\.com\/?$/.test(RPC)) report.error('VITE_SOLANA_RPC_URL', undefined, `El entorno Devnet debe usar https://api.devnet.solana.com (recibido: ${RPC})`);

async function rpc(method) {
  let last;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method }), signal: AbortSignal.timeout(15_000) });
      const body = await response.json();
      if (body.error) throw new Error(body.error.message);
      return body.result;
    } catch (error) {
      last = error;
      await new Promise((done) => setTimeout(done, attempt * 3000));
    }
  }
  throw last;
}

if (report.errors.length === 0) {
  try {
    const [health, genesis] = [await rpc('getHealth'), await rpc('getGenesisHash')];
    if (health !== 'ok') report.error(RPC, undefined, `getHealth devolvió "${health}"`);
    if (genesis !== DEVNET_GENESIS) report.error(RPC, undefined, `El genesis hash ${genesis} NO es el de Devnet: se aborta`);
    report.note(`RPC ${RPC}: salud=${health}, genesis=${String(genesis).slice(0, 8)}…`);
  } catch (error) {
    report.error(RPC, undefined, `RPC de Devnet no disponible: ${error.message}`);
  }
}
report.finish('Devnet responde y su genesis hash coincide.');
