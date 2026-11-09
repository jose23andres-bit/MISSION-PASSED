import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CLUSTERS, assertSafeCluster, parseArgs, rpcCall } from './config.mjs';

const args = parseArgs(process.argv.slice(2));
const cluster = String(args.cluster || 'devnet');
assertSafeCluster(cluster, false);
const rpcUrl = process.env.SOLANA_RPC_URL || CLUSTERS[cluster];
const recordPath = resolve(process.cwd(), `deployment/${cluster === 'mainnet-beta' ? 'mainnet' : cluster}.json`);
let record;
try { record = JSON.parse(await readFile(recordPath, 'utf8')); }
catch { throw new Error(`Falta ${recordPath}. No se inventará una dirección de mint.`); }

const [account, supply] = await Promise.all([
  rpcCall(rpcUrl, 'getAccountInfo', [record.mint, { encoding: 'jsonParsed', commitment: 'confirmed' }]),
  rpcCall(rpcUrl, 'getTokenSupply', [record.mint, { commitment: 'confirmed' }]),
]);
if (!account?.value) throw new Error('El mint no existe en el cluster seleccionado.');
const result = {
  cluster,
  mint: record.mint,
  exists: true,
  ownerProgram: account.value.owner,
  supply: supply.value.uiAmountString,
  decimals: supply.value.decimals,
  expectedSupply: String(record.supply),
  supplyMatches: supply.value.uiAmountString === String(record.supply),
};
console.log(JSON.stringify(result, null, 2));
if (!result.supplyMatches) process.exitCode = 1;
