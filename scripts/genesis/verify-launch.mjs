// Verifies a Devnet launch on-chain from deployment/genesis-devnet.json.
// Writes deployment/genesis-devnet-verify.json and exits 1 if any check fails.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEVNET_GENESIS_HASH, TOTAL_SUPPLY } from './launch-input.mjs';

export const GENESIS_PROGRAM_ID = 'GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B';

// Pure evaluation of facts read from the chain, so it can be unit-tested offline.
export function evaluateLaunch(facts) {
    const balance = (facts.signerBalance || 0) + (facts.creatorBalance || 0);
  const checks = {
    rpcIsDevnet: facts.genesisHash === DEVNET_GENESIS_HASH,
    mintExists: facts.supply !== null,
    supplyIsOneBillion: facts.supply !== null && Number(facts.supply.uiAmountString) === TOTAL_SUPPLY,
    genesisAccountOwnedByGenesis: facts.genesisOwner === GENESIS_PROGRAM_ID,
    immediateCreatorBalanceDoesNotExceed16Percent: balance <= 160_000_000,
  };
  return { checks, ok: Object.values(checks).every(Boolean) };
}

async function rpc(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

async function tokenBalance(rpcUrl, owner, mint) {
  const { value } = await rpc(rpcUrl, 'getTokenAccountsByOwner', [owner, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
  return value.reduce((sum, acc) => sum + Number(acc.account.data.parsed.info.tokenAmount.uiAmountString), 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(import.meta.dirname, '../..');
  const recordPath = resolve(root, 'deployment/genesis-devnet.json');
  if (!existsSync(recordPath)) throw new Error('No existe deployment/genesis-devnet.json: ejecuta primero el lanzamiento en Devnet.');
  const record = JSON.parse(readFileSync(recordPath, 'utf8'));
  const plan = JSON.parse(readFileSync(resolve(root, 'launch.plan.json'), 'utf8'));
  const rpcUrl = process.env.GENESIS_DEVNET_RPC_URL || 'https://api.devnet.solana.com';

  const supply = await rpc(rpcUrl, 'getTokenSupply', [record.mintAddress, { commitment: 'confirmed' }]).then((r) => r.value).catch(() => null);
  const genesis = await rpc(rpcUrl, 'getAccountInfo', [record.genesisAccount, { encoding: 'base64', commitment: 'confirmed' }]);
  const facts = {
    genesisHash: await rpc(rpcUrl, 'getGenesisHash', []),
    supply,
    genesisOwner: genesis.value?.owner ?? null,
    signerBalance: await tokenBalance(rpcUrl, record.signer, record.mintAddress),
    creatorBalance: await tokenBalance(rpcUrl, plan.creatorPublicWallet, record.mintAddress),
  };
  const result = { verifiedAtUtc: new Date().toISOString(), mintAddress: record.mintAddress, genesisAccount: record.genesisAccount, facts, ...evaluateLaunch(facts),
    explorer: `https://solscan.io/token/${record.mintAddress}?cluster=devnet` };
  writeFileSync(resolve(root, 'deployment/genesis-devnet-verify.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
