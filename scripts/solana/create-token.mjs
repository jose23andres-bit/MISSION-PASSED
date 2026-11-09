import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CLUSTERS, assertSafeCluster, parseArgs, validateTokenConfig } from './config.mjs';

// TECHNICAL REHEARSAL ONLY. This script mints 100% of supply into one wallet with no vesting.
// It is NOT the MISSION PASSED launch path; the launch path is scripts/genesis/create-launch.mjs.
console.warn('AVISO: ensayo técnico de mint SPL en Devnet. No crea preventa, vesting ni la distribución 30/25/25/10/10.');

const args = parseArgs(process.argv.slice(2));
const cluster = String(args.cluster || 'devnet');
const execute = args.execute === true;
assertSafeCluster(cluster, execute);
if (cluster !== 'devnet') throw new Error('La automatización de creación está limitada a Devnet.');

const configPath = resolve(process.cwd(), 'token.config.json');
let config;
try { config = JSON.parse(await readFile(configPath, 'utf8')); }
catch { throw new Error('Falta token.config.json. Debe crearse a partir del ejemplo tras aprobar las decisiones.'); }
const errors = validateTokenConfig(config);
if (errors.length) throw new Error(`Configuración no válida:\n- ${errors.join('\n- ')}`);

const rpcUrl = process.env.SOLANA_RPC_URL || CLUSTERS[cluster];
const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
const shouldRevoke = [config.authorities.mint, config.authorities.freeze].includes('revoke-after-verification');
if (shouldRevoke && process.env.CONFIRM_REVOKE_AUTHORITIES !== 'true' && execute) {
  throw new Error('La revocación es irreversible. Define CONFIRM_REVOKE_AUTHORITIES=true solo después de verificar mint, suministro y metadata.');
}
if ([config.authorities.mint, config.authorities.freeze].includes('multisig')) {
  throw new Error('La configuración multisig requiere crear y verificar la multisig antes del mint; no se automatiza aquí.');
}

const plan = {
  mode: execute ? 'EXECUTE_DEVNET' : 'DRY_RUN',
  cluster,
  rpcUrl,
  name: config.name,
  symbol: config.symbol,
  supply: config.supply,
  decimals: config.decimals,
  metadataUri: config.metadataUri,
  mintAuthority: config.authorities.mint,
  freezeAuthority: config.authorities.freeze,
  operations: ['create SPL mint', 'create treasury associated token account', 'mint approved fixed supply', 'verify on-chain supply', 'optionally revoke authorities after explicit confirmation'],
  excluded: ['Mainnet', 'liquidity pool creation', 'purchases', 'metadata upload/hosting'],
};
console.log(JSON.stringify(plan, null, 2));
if (!execute) {
  console.log('\nSimulación terminada. Revisa el plan. Para ejecutar en Devnet: añade -- --execute al comando npm.');
  process.exit(0);
}

if (!keypairPath) throw new Error('Falta SOLANA_KEYPAIR_PATH. Debe apuntar a un keypair local; nunca pegues su contenido en .env.');
await access(keypairPath);

function run(binary, commandArgs) {
  return execFileSync(binary, commandArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
// Word boundaries stop the pattern from matching the first 44 chars of an 88-char signature.
function findAddress(value) {
  const matches = value.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g) || [];
  return matches[0] || '';
}
function runJson(commandArgs) {
  return JSON.parse(run('spl-token', [...commandArgs, '--output', 'json']));
}

run('solana', ['--version']);
run('spl-token', ['--version']);
const payer = run('solana-keygen', ['pubkey', keypairPath]);
const treasuryOwner = config.treasuryPublicKey;
console.log(`Firmante público: ${payer}`);
console.log(`Tesorería pública: ${treasuryOwner}`);

const created = runJson(['--url', rpcUrl, 'create-token', '--decimals', String(config.decimals), '--fee-payer', keypairPath, '--mint-authority', payer]);
const mint = created.address || findAddress(JSON.stringify(created));
if (!mint) throw new Error(`No se pudo extraer el mint de la salida de spl-token: ${JSON.stringify(created)}`);
console.log(`Mint Devnet creado: ${mint}`);

const accountOutput = run('spl-token', ['--url', rpcUrl, 'create-account', mint, '--owner', treasuryOwner, '--fee-payer', keypairPath]);
const treasuryAccount = findAddress(accountOutput);
if (!treasuryAccount) throw new Error(`No se pudo extraer la cuenta de tesorería: ${accountOutput}`);
run('spl-token', ['--url', rpcUrl, 'mint', mint, String(config.supply), treasuryAccount, '--mint-authority', keypairPath, '--fee-payer', keypairPath]);

// Exact comparison: `includes` would accept 10000000000 for an expected 1000000000.
const supplyOutput = run('spl-token', ['--url', rpcUrl, 'supply', mint]);
const reportedSupply = (supplyOutput.match(/[\d.]+/) || [''])[0];
if (Number(reportedSupply) !== Number(config.supply)) {
  throw new Error(`El suministro devuelto no coincide. Esperado ${config.supply}, recibido: ${supplyOutput}`);
}

if (config.authorities.mint === 'revoke-after-verification') {
  run('spl-token', ['--url', rpcUrl, 'authorize', mint, 'mint', '--disable', '--authority', keypairPath, '--fee-payer', keypairPath]);
}
if (config.authorities.freeze === 'revoke-after-verification') {
  run('spl-token', ['--url', rpcUrl, 'authorize', mint, 'freeze', '--disable', '--authority', keypairPath, '--fee-payer', keypairPath]);
}

await mkdir(resolve(process.cwd(), 'deployment'), { recursive: true });
const record = {
  cluster,
  mint,
  treasuryAccount,
  treasuryOwner,
  payer,
  supply: config.supply,
  decimals: config.decimals,
  metadataUri: config.metadataUri,
  createdAt: new Date().toISOString(),
  explorer: `https://solscan.io/token/${mint}?cluster=devnet`,
  note: 'Devnet only. Metadata attachment remains a separate reviewed step.',
};
await writeFile(resolve(process.cwd(), 'deployment/devnet.json'), `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(record, null, 2));
