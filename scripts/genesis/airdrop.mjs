// Funds the Devnet rehearsal signer.
// 1. Tries the RPC faucet once (it is closed on the public Devnet RPC).
// 2. Otherwise prints the address and waits until someone sends test SOL from https://faucet.solana.com.
// Usage: node scripts/genesis/airdrop.mjs <address> [minSol] [waitMinutes]
import { appendFileSync } from 'node:fs';
import { DEVNET_GENESIS_HASH, isPublicKey } from './launch-input.mjs';

const [address, minSolArg = '0.1', waitArg = '45'] = process.argv.slice(2);
const rpcUrl = process.env.GENESIS_DEVNET_RPC_URL || 'https://api.devnet.solana.com';
if (!isPublicKey(address)) throw new Error('Dirección no válida');
const minLamports = Math.round(Number(minSolArg) * 1e9);
const waitMinutes = Number(waitArg);
if (!(minLamports > 0 && minLamports <= 5e9)) throw new Error('Saldo mínimo entre 0 y 5 SOL');
if (!(waitMinutes >= 1 && waitMinutes <= 120)) throw new Error('Espera entre 1 y 120 minutos');

async function rpc(method, params) {
  const res = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const balance = async () => (await rpc('getBalance', [address, { commitment: 'confirmed' }])).value;

if ((await rpc('getGenesisHash', [])) !== DEVNET_GENESIS_HASH) throw new Error('El RPC no es Devnet. Abortado.');

try {
  await rpc('requestAirdrop', [address, minLamports, { commitment: 'confirmed' }]);
} catch (err) {
  console.log(`Faucet por RPC no disponible: ${err.message}`);
}

const message = [
  '',
  '=====================================================================',
  ' FALTA SOL DE PRUEBA (Devnet, sin valor real)',
  ` 1. Abre https://devnetfaucet.org (alternativa incluida en la guía oficial de Solana)`,
  ` 2. Pega esta dirección:  ${address}`,
  ` 3. Solicita al menos ${minSolArg} SOL en Devnet`,
  ` El ensayo continúa solo en cuanto llegue el saldo (espera máx. ${waitMinutes} min).`,
  '=====================================================================',
  '',
].join('\n');
console.log(message);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Envía 0,1 SOL de prueba (Devnet)\n\nEl faucet oficial puede estar vacío. Usa una de estas alternativas listadas por Solana:\n\n- https://devnetfaucet.org\n- https://faucet.quicknode.com/solana/devnet\n\nPega: \`${address}\` y solicita al menos ${minSolArg} SOL.\n\nEl ensayo continúa al recibirlo (máx. ${waitMinutes} min).\n`);
}

const deadline = Date.now() + waitMinutes * 60_000;
while (Date.now() < deadline) {
  const value = await balance().catch(() => 0);
  if (value >= minLamports) {
    console.log(`Saldo Devnet recibido: ${value / 1e9} SOL`);
    process.exit(0);
  }
  await sleep(10_000);
}
throw new Error(`No llegó SOL de prueba en ${waitMinutes} minutos. Relanza el workflow y prueba https://devnetfaucet.org o https://faucet.quicknode.com/solana/devnet.`);
