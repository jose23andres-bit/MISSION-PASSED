import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertSafeCluster, validateTokenConfig } from '../scripts/solana/config.mjs';

const root = resolve(import.meta.dirname, '..');

test('landing contains every required section and no placeholder hrefs', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  for (const id of ['portal', 'story', 'tokenomics', 'roadmap', 'community', 'launch', 'faq']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /href=["']#["']/);
  assert.match(html, /AVISO DE RIESGO/);
  assert.match(html, /No conectada/);
});

test('draft token config cannot be executed', async () => {
  const config = JSON.parse(await readFile(resolve(root, 'token.config.example.json'), 'utf8'));
  const errors = validateTokenConfig(config);
  assert.ok(errors.some((message) => message.includes('APPROVED_FOR_DEVNET')));
  assert.ok(errors.some((message) => message.includes('metadataUri')));
});

test('an approved Devnet configuration passes validation', () => {
  const config = {
    approvalStatus: 'APPROVED_FOR_DEVNET', name: 'MISSION PASSED', symbol: 'MP', supply: 1_000_000_000, decimals: 6,
    distribution: { creatorVested: 30, publicPresale: 25, liquidity: 25, communityRewards: 10, marketingDevelopment: 10 },
    treasuryPublicKey: '11111111111111111111111111111111',
    creatorVesting: { cliffDays: 90, durationDays: 365, releaseIntervalDays: 30 },
    authorities: { mint: 'revoke-after-verification', freeze: 'revoke-after-verification' },
    metadataUri: 'https://example.com/token-metadata.json',
  };
  assert.deepEqual(validateTokenConfig(config), []);
});

test('Mainnet stays blocked without explicit environment approval', () => {
  const previous = process.env.ALLOW_MAINNET;
  delete process.env.ALLOW_MAINNET;
  assert.throws(() => assertSafeCluster('mainnet-beta', false), /Mainnet bloqueada/);
  if (previous) process.env.ALLOW_MAINNET = previous;
});

test('Mainnet token creation remains blocked even with environment opt-in', () => {
  const previous = process.env.ALLOW_MAINNET;
  process.env.ALLOW_MAINNET = 'true';
  assert.throws(() => assertSafeCluster('mainnet-beta', true), /no ejecuta creación en Mainnet/);
  if (previous === undefined) delete process.env.ALLOW_MAINNET; else process.env.ALLOW_MAINNET = previous;
});

test('published HTML contains no dead hash links or enabled fake purchase control', async () => {
  const paths = ['index.html', 'presale/index.html', 'transparency/index.html', 'admin/index.html', 'portal/search.html'];
  for (const path of paths) {
    const html = await readFile(resolve(root, path), 'utf8');
    assert.doesNotMatch(html, /href=["']#["']/);
    assert.doesNotMatch(html, /<button[^>]*>\s*(Buy|Comprar|Purchase)\s*<\/button>/i);
  }
});

test('countdown targets local midnight on 19 November 2026', async () => {
  const script = await readFile(resolve(root, 'src/app.js'), 'utf8');
  assert.match(script, /new Date\(2026, 10, 19, 0, 0, 0, 0\)/);
  assert.match(script, /GAME RELEASED|release-active/);
});

test('launch plan contains the validated creator wallet and 48-hour target', async () => {
  const plan = JSON.parse(await readFile(resolve(root, 'launch.plan.json'), 'utf8'));
  assert.equal(plan.creatorPublicWallet, '4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj');
  assert.equal(Date.parse(plan.requestedTargetAtUtc) - Date.parse(plan.requestedAtUtc), 48 * 60 * 60 * 1000);
  assert.equal(plan.network.mainnetAuthorized, false);
});
