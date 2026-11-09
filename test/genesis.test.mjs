import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertDevnetNetwork, buildLaunchInput, checkDistributionPolicy, estimateGenesisAllocations, TARGET_BUYER_ALLOCATION, TARGET_CREATOR_IMMEDIATE, TARGET_CREATOR_VESTED, validateLaunchInput } from '../scripts/genesis/launch-input.mjs';
import { safeLaunchUrl } from '../scripts/public-config.mjs';

const root = resolve(import.meta.dirname, '..');
const NOW = Date.parse('2026-11-09T12:00:00Z');
const WALLET = '4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj';
const loadPlan = async () => JSON.parse(await readFile(resolve(root, 'launch.plan.json'), 'utf8'));

test('final plan validates 16% immediate + 4% vesting + 80% market/liquidity', async () => {
  const plan = await loadPlan();
  assert.deepEqual(checkDistributionPolicy(plan), []);
  const { errors, summary } = validateLaunchInput(buildLaunchInput(plan), { now: NOW });
  assert.deepEqual(errors, []);
  assert.equal(summary.buyerAllocationTokens, TARGET_BUYER_ALLOCATION);
  assert.equal(summary.lockedCreatorTokens, TARGET_CREATOR_VESTED);
  assert.equal(summary.estimatedCreatorImmediate, TARGET_CREATOR_IMMEDIATE);
  assert.equal(summary.estimatedMarketAndLiquidityTokens, 800_000_000);
  assert.equal(plan.network.devnetApproved, false);
  assert.equal(plan.network.mainnetAuthorized, false);
});

test('Raydium estimate closes the full one-billion supply', () => {
  const result = estimateGenesisAllocations(533_333_333, 5000, 40_000_000);
  assert.deepEqual(result, { estimatedRaydiumTokens: 266_666_667, estimatedCreatorImmediate: 160_000_000 });
  assert.equal(533_333_333 + 266_666_667 + 40_000_000 + 160_000_000, 1_000_000_000);
});

test('missing logo or creator recipient blocks the launch', async () => {
  const plan = await loadPlan();
  plan.genesis.token.image = null;
  plan.genesis.claimScheduleAllocations[0].recipient = null;
  const { errors } = validateLaunchInput(buildLaunchInput(plan), { now: NOW });
  assert.ok(errors.some((e) => e.startsWith('token.image')));
  assert.ok(errors.some((e) => e.includes('Giveaway Fund Vested') && e.includes('recipient')));
});

test('Genesis limits and irrevocable vesting are enforced', async () => {
  const plan = await loadPlan();
  plan.genesis.launchpool.raiseGoalSol = 100;
  plan.genesis.launchpool.raydiumLiquidityBps = 1500;
  plan.genesis.claimScheduleAllocations[0].cancelable = true;
  const { errors } = validateLaunchInput(buildLaunchInput(plan), { now: NOW });
  assert.ok(errors.some((e) => e.includes('raiseGoal')));
  assert.ok(errors.some((e) => e.includes('raydiumLiquidityBps')));
  assert.ok(errors.some((e) => e.includes('cancelable=true')));
});

test('hidden or changed allocations violate policy', async () => {
  const plan = await loadPlan();
  plan.genesis.claimScheduleAllocations.push({ name: 'Hidden', tokenAmount: 1 });
  plan.genesis.claimScheduleAllocations[0].recipient = '11111111111111111111111111111111';
  const errors = checkDistributionPolicy(plan);
  assert.ok(errors.some((e) => e.includes('ocultas')));
  assert.ok(errors.some((e) => e.includes('wallet pública')));
});

test('a past start is rejected and Devnet override shifts vesting', async () => {
  const plan = await loadPlan();
  assert.ok(validateLaunchInput(buildLaunchInput(plan), { now: Date.parse('2026-12-01') }).errors.some((e) => e.includes('futuro')));
  const start = '2026-11-09T13:00:00.000Z';
  const input = buildLaunchInput(plan, { depositStartTime: start });
  const delta = Date.parse(start) - Date.parse(plan.genesis.launchpool.depositStartTime);
  assert.equal(Date.parse(input.launch.claimScheduleAllocations[0].vestingStartTime), Date.parse(plan.genesis.claimScheduleAllocations[0].vestingStartTime) + delta);
});

test('executor refuses Mainnet and URL filter permits only Metaplex', () => {
  assert.throws(() => assertDevnetNetwork('solana-mainnet'), /bloqueada/);
  assert.doesNotThrow(() => assertDevnetNetwork('solana-devnet'));
  assert.equal(safeLaunchUrl('https://www.metaplex.com/launch/abc'), 'https://www.metaplex.com/launch/abc');
  assert.equal(safeLaunchUrl('https://metaplex.com.evil.io/launch'), '');
  assert.equal(safeLaunchUrl('javascript:alert(1)'), '');
});
