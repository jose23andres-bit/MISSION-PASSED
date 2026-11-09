// MISSION PASSED — Genesis Launch Pool creator (Devnet only).
//
// Dry run (default, offline):   npm run genesis:plan
// Devnet rehearsal (signs/sends): npm run genesis:devnet -- --execute [--start-in-minutes 15]
//
// Mainnet is not executable from this script. Mainnet signing must happen in Phantom/Squads
// after a separate, explicit approval of the exact transactions.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from '../load-env.mjs';
import { assertDevnetNetwork, buildLaunchInput, checkDistributionPolicy, DEVNET_GENESIS_HASH, validateLaunchInput } from './launch-input.mjs';

const root = resolve(import.meta.dirname, '../..');
loadEnv(resolve(root, '.env'));

const argv = process.argv.slice(2);
const execute = argv.includes('--execute');
const startIdx = argv.indexOf('--start-in-minutes');
const startInMinutes = startIdx >= 0 ? Number(argv[startIdx + 1]) : null;
const network = 'solana-devnet';
assertDevnetNetwork(network);

const plan = JSON.parse(await readFile(resolve(root, 'launch.plan.json'), 'utf8'));
let depositStartTime;
if (startInMinutes !== null) {
  if (!(startInMinutes >= 5 && startInMinutes <= 1440)) throw new Error('--start-in-minutes debe estar entre 5 y 1440');
  depositStartTime = new Date(Date.now() + startInMinutes * 60_000).toISOString();
}

const signerPlaceholder = plan.creatorPublicWallet;
const draft = buildLaunchInput(plan, { wallet: signerPlaceholder, network, depositStartTime });
const policyErrors = checkDistributionPolicy(plan);
const { errors, warnings, summary } = validateLaunchInput(draft);

console.log(JSON.stringify({ mode: execute ? 'EXECUTE_DEVNET' : 'DRY_RUN', network, summary, input: draft }, null, 2));
warnings.forEach((w) => console.warn(`AVISO: ${w}`));
const allErrors = [...policyErrors, ...errors];
if (allErrors.length) {
  console.error(`\nBloqueado:\n- ${allErrors.join('\n- ')}`);
  process.exit(2);
}
if (!execute) {
  console.log('\nDry run correcto. No se ha enviado nada.');
  process.exit(0);
}

if (plan.network?.devnetApproved !== true) throw new Error('launch.plan.json: network.devnetApproved debe ser true para ejecutar en Devnet.');
const keypairPath = process.env.GENESIS_DEVNET_KEYPAIR_PATH;
if (!keypairPath) throw new Error('Falta GENESIS_DEVNET_KEYPAIR_PATH: ruta a un keypair JSON de Devnet desechable (nunca tu seed de Phantom).');
const rpcUrl = process.env.GENESIS_DEVNET_RPC_URL || 'https://api.devnet.solana.com';

// The logo URL is written permanently into the token metadata: it must already be online.
const imageResponse = await fetch(draft.token.image, { method: 'HEAD' }).catch(() => null);
const imageType = imageResponse?.headers.get('content-type') || '';
if (!imageResponse?.ok || !imageType.startsWith('image/')) {
  throw new Error(`El logo no está accesible en ${draft.token.image} (estado ${imageResponse?.status ?? 'sin respuesta'}). Publica el repositorio o la web antes de lanzar.`);
}

// Refuse to run unless the RPC really is Devnet.
const hashResponse = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getGenesisHash' }) });
const { result: genesisHash } = await hashResponse.json();
if (genesisHash !== DEVNET_GENESIS_HASH) throw new Error(`El RPC no es Devnet (genesis hash ${genesisHash}). Abortado.`);

let sdk; let umiDefaults; let umiCore;
try {
  sdk = await import('@metaplex-foundation/genesis');
  umiDefaults = await import('@metaplex-foundation/umi-bundle-defaults');
  umiCore = await import('@metaplex-foundation/umi');
} catch {
  throw new Error('Faltan dependencias. Ejecuta `npm install` en un entorno con acceso a npm.');
}

const umi = umiDefaults.createUmi(rpcUrl).use(sdk.genesis());
const secret = Uint8Array.from(JSON.parse(await readFile(keypairPath, 'utf8')));
const keypair = umi.eddsa.createKeypairFromSecretKey(secret);
umi.use(umiCore.keypairIdentity(keypair));

const input = buildLaunchInput(plan, { wallet: umi.identity.publicKey.toString(), network, depositStartTime });
const final = validateLaunchInput(input);
if (final.errors.length) throw new Error(`Input inválido:\n- ${final.errors.join('\n- ')}`);

try {
  const created = await sdk.createLaunch(umi, {}, input);
  console.log(`Transacciones a firmar: ${created.transactions.length} · mint ${created.mintAddress} · genesis ${created.genesisAccount}`);
  const signatures = await sdk.signAndSendLaunchTransactions(umi, created, { commitment: 'confirmed' });
  const registered = await sdk.registerLaunch(umi, {}, { genesisAccount: created.genesisAccount, createLaunchInput: input });
  const { base58 } = await import('@metaplex-foundation/umi/serializers');
  const record = {
    network,
    createdAtUtc: new Date().toISOString(),
    signer: umi.identity.publicKey.toString(),
    mintAddress: created.mintAddress,
    genesisAccount: created.genesisAccount,
    launchId: registered.launch.id,
    launchLink: registered.launch.link,
    signatures: signatures.map((s) => base58.deserialize(s)[0]),
    depositStartTime: input.launch.launchpool.depositStartTime,
    nextStep: 'Verify supply and every bucket on-chain; confirm unallocated remainder before any Mainnet approval.',
  };
  await mkdir(resolve(root, 'deployment'), { recursive: true });
  await writeFile(resolve(root, 'deployment/genesis-devnet.json'), `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(record, null, 2));
} catch (err) {
  if (sdk.isGenesisValidationError?.(err)) console.error(`Validación Genesis en "${err.field}": ${err.message}`);
  else if (sdk.isGenesisApiError?.(err)) console.error('Error API Genesis:', err.statusCode, JSON.stringify(err.responseBody));
  else if (sdk.isGenesisApiNetworkError?.(err)) console.error('Error de red:', err.cause?.message);
  throw err;
}
