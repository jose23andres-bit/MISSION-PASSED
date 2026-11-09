import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertDevnetNetwork, buildLaunchInput, checkDistributionPolicy, validateLaunchInput } from '../scripts/genesis/launch-input.mjs';
import { safeLaunchUrl } from '../scripts/public-config.mjs';

const root = resolve(import.meta.dirname, '..');
const NOW = Date.parse('2026-11-09T12:00:00Z');
const WALLET = '4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj';
const OTHER = '11111111111111111111111111111111';
const loadPlan = async () => JSON.parse(await readFile(resolve(root, 'launch.plan.json'), 'utf8'));

function completePlan(plan) {
  plan.genesis.token.image = 'https://mission-passed.example/token-logo.png';
  plan.genesis.claimScheduleAllocations.forEach((a) => { a.recipient ??= OTHER; });
  return plan;
}

test('current plan follows 30/25/25/10/10 and is a valid Genesis input', async () => {
  const plan = await loadPlan();
  assert.deepEqual(checkDistributionPolicy(plan), []);
  const { errors, summary } = validateLaunchInput(buildLaunchInput(plan), { now: NOW });
  assert.deepEqual(errors, []);
  assert.equal(summary.presaleTokens + summary.lockedTokens + summary.unallocatedTokens, 1_000_000_000);
  assert.equal(summary.unallocatedTokens, 250_000_000);
  assert.equal(plan.network.devnetApproved, false);
});

test('missing logo or recipient blocks the launch', async () => {
  const plan = await loadPlan();
  plan.genesis.token.image = null;
  plan.genesis.claimScheduleAllocations[1].recipient = null;
  const { errors } = validateLaunchInput(buildLaunchInput(plan), { now: NOW });
  assert.ok(errors.some((e) => e.startsWith('token.image')));
  assert.ok(errors.some((e) => e.includes('Community Rewards') && e.includes('recipient')));
});

test('a completed plan produces a valid Genesis input', async () => {
  const input = buildLaunchInput(completePlan(await loadPlan()));
  const { errors } = validateLaunchInput(input, { now: NOW });
  assert.deepEqual(errors, []);
  assert.equal(input.launchType, 'launchpool');
  assert.equal(input.launch.launchpool.fundsRecipient, WALLET);
  assert.equal(input.launch.claimScheduleAllocations[0].recipient, WALLET);
});

test('Genesis limits are enforced', async () => {
  const plan = completePlan(await loadPlan());
  plan.genesis.launchpool.raiseGoalSol = 100;
  plan.genesis.launchpool.raydiumLiquidityBps = 1500;
  plan.genesis.claimScheduleAllocations[0].cancelable = true;
  const { errors } = validateLaunchInput(buildLaunchInput(plan), { now: NOW });
  assert.ok(errors.some((e) => e.includes('raiseGoal')));
  assert.ok(errors.some((e) => e.includes('raydiumLiquidityBps')));
  assert.ok(errors.some((e) => e.includes('cancelable=true')));
});

test('a past deposit start is rejected', async () => {
  const { errors } = validateLaunchInput(buildLaunchInput(completePlan(await loadPlan())), { now: Date.parse('2026-12-01T00:00:00Z') });
  assert.ok(errors.some((e) => e.includes('futuro')));
});

test('hidden or altered allocations violate the distribution policy', async () => {
  const plan = await loadPlan();
  plan.genesis.claimScheduleAllocations.push({ name: 'Extra', tokenAmount: 1 });
  plan.genesis.claimScheduleAllocations[0].recipient = OTHER;
  const errors = checkDistributionPolicy(plan);
  assert.ok(errors.some((e) => e.includes('adicionales')));
  assert.ok(errors.some((e) => e.includes('wallet pública')));
});

test('devnet override shifts deposit start and vesting together', async () => {
  const plan = completePlan(await loadPlan());
  const start = '2026-11-09T13:00:00.000Z';
  const input = buildLaunchInput(plan, { depositStartTime: start });
  const delta = Date.parse(start) - Date.parse(plan.genesis.launchpool.depositStartTime);
  assert.equal(input.launch.launchpool.depositStartTime, start);
  assert.equal(Date.parse(input.launch.claimScheduleAllocations[0].vestingStartTime), Date.parse(plan.genesis.claimScheduleAllocations[0].vestingStartTime) + delta);
});

test('the Genesis executor refuses Mainnet', () => {
  assert.throws(() => assertDevnetNetwork('solana-mainnet'), /bloqueada/);
  assert.doesNotThrow(() => assertDevnetNetwork('solana-devnet'));
});

test('only official Metaplex launch URLs are published', () => {
  assert.equal(safeLaunchUrl('https://www.metaplex.com/launch/abc'), 'https://www.metaplex.com/launch/abc');
  assert.equal(safeLaunchUrl('https://metaplex.com.evil.io/launch'), '');
  assert.equal(safeLaunchUrl('http://www.metaplex.com/launch'), '');
  assert.equal(safeLaunchUrl('javascript:alert(1)'), '');
});
