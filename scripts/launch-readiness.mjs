import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildLaunchInput, checkDistributionPolicy, isPublicKey, validateLaunchInput } from './genesis/launch-input.mjs';

const root = resolve(import.meta.dirname, '..');
const plan = JSON.parse(await readFile(resolve(root, 'launch.plan.json'), 'utf8'));
const input = buildLaunchInput(plan, { wallet: plan.creatorPublicWallet, network: 'solana-devnet' });
const validation = validateLaunchInput(input);
const policy = checkDistributionPolicy(plan);
const devnetRecordPath = resolve(root, 'deployment/genesis-devnet.json');
const devnetRecord = existsSync(devnetRecordPath) ? JSON.parse(readFileSync(devnetRecordPath, 'utf8')) : null;

const checks = {
  creatorWalletConfigured: isPublicKey(plan.creatorPublicWallet),
  distributionPolicy30_25_25_10_10: policy.length === 0,
  genesisInputValid: validation.errors.length === 0,
  devnetApproved: plan.network.devnetApproved === true,
  devnetLaunchRecorded: Boolean(devnetRecord?.mintAddress && devnetRecord?.genesisAccount),
  squadsVaultConfigured: isPublicKey(plan.squadsVault),
  mainnetAuthorized: plan.network.mainnetAuthorized === true,
};
const readyForDevnet = checks.creatorWalletConfigured && checks.distributionPolicy30_25_25_10_10 && checks.genesisInputValid && checks.devnetApproved;
const readyForMainnet = readyForDevnet && checks.devnetLaunchRecorded && checks.squadsVaultConfigured && checks.mainnetAuthorized;
const report = {
  generatedAtUtc: new Date().toISOString(),
  requestedTargetAtUtc: plan.requestedTargetAtUtc,
  depositWindow: `${plan.genesis.launchpool.depositStartTime} + ${plan.genesis.launchpool.depositDurationHours}h`,
  checks,
  readyForDevnet,
  readyForMainnet,
  inputErrors: [...policy, ...validation.errors],
  warnings: validation.warnings,
  summary: validation.summary,
};
await mkdir(resolve(root, 'deployment'), { recursive: true });
await writeFile(resolve(root, 'deployment/readiness.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!readyForDevnet) process.exitCode = 2;
