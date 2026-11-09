// Requests Devnet SOL for the rehearsal signer and waits until the balance arrives.
// Usage: node scripts/genesis/airdrop.mjs <address> [sol]
import { DEVNET_GENESIS_HASH, isPublicKey } from './launch-input.mjs';

const [address, solArg = '2'] = process.argv.slice(2);
const rpcUrl = process.env.GENESIS_DEVNET_RPC_URL || 'https://api.devnet.solana.com';
if (!isPublicKey(address)) throw new Error('Dirección no válida');
const lamports = Math.round(Number(solArg) * 1e9);
if (!(lamports > 0 && lamports <= 5e9)) throw new Error('Cantidad entre 0 y 5 SOL');

async function rpc(method, params) {
  const res = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if ((await rpc('getGenesisHash', [])) !== DEVNET_GENESIS_HASH) throw new Error('El RPC no es Devnet. Abortado.');

for (let attempt = 1; attempt <= 4; attempt += 1) {
  try {
    await rpc('requestAirdrop', [address, lamports, { commitment: 'confirmed' }]);
    for (let i = 0; i < 30; i += 1) {
      const { value } = await rpc('getBalance', [address, { commitment: 'confirmed' }]);
      if (value >= lamports) { console.log(`Saldo Devnet: ${value / 1e9} SOL`); process.exit(0); }
      await sleep(2000);
    }
  } catch (err) {
    console.warn(`Intento ${attempt}: ${err.message}`);
  }
  await sleep(attempt * 5000);
}
throw new Error('El faucet de Devnet no entregó SOL (límite de peticiones). Vuelve a lanzar el workflow más tarde.');
