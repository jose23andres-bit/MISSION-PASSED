import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { encodeBase58 } from '../scripts/genesis/base58.mjs';
import { createKeypair } from '../scripts/genesis/ephemeral-keypair.mjs';
import { evaluateLaunch, GENESIS_PROGRAM_ID } from '../scripts/genesis/verify-launch.mjs';
import { DEVNET_GENESIS_HASH, isPublicKey } from '../scripts/genesis/launch-input.mjs';

const root = resolve(import.meta.dirname, '..');

test('base58 matches known Solana vectors', () => {
  assert.equal(encodeBase58(new Uint8Array(32)), '11111111111111111111111111111111');
  assert.equal(encodeBase58([0, 0, 1]), '112');
  assert.equal(encodeBase58(Buffer.from('hello world')), 'StV1DL6CwTryKyV');
});

test('ephemeral keypair uses the 64-byte Solana CLI format', () => {
  const { secret, address } = createKeypair();
  assert.equal(secret.length, 64);
  assert.ok(isPublicKey(address));
  assert.equal(encodeBase58(secret.slice(32)), address);
});

const good = {
  genesisHash: DEVNET_GENESIS_HASH,
  supply: { uiAmountString: '1000000000' },
  genesisOwner: GENESIS_PROGRAM_ID,
  signerBalance: 0,
  creatorBalance: 0,
};

test('a correct Devnet launch passes every check', () => {
  assert.equal(evaluateLaunch(good).ok, true);
});

test('wrong supply, foreign owner or unvested tokens fail verification', () => {
  assert.equal(evaluateLaunch({ ...good, supply: { uiAmountString: '1000000001' } }).checks.supplyIsOneBillion, false);
  assert.equal(evaluateLaunch({ ...good, genesisOwner: '11111111111111111111111111111111' }).checks.genesisAccountOwnedByGenesis, false);
  assert.equal(evaluateLaunch({ ...good, creatorBalance: 5 }).checks.creatorHoldsNoUnvestedTokens, false);
  assert.equal(evaluateLaunch({ ...good, genesisHash: 'mainnet' }).ok, false);
});

test('rehearsal workflow is manual, Devnet-only and needs typed confirmation', async () => {
  const yml = await readFile(resolve(root, '.github/workflows/devnet-rehearsal.yml'), 'utf8');
  assert.match(yml, /workflow_dispatch:/);
  assert.doesNotMatch(yml, /^\s*(push|pull_request|schedule):/m);
  assert.match(yml, /github\.event\.inputs\.confirm == 'DEVNET'/);
  assert.match(yml, /permissions:\s*\n\s*contents: read/);
  const code = yml.split('\n').filter((line) => !line.trim().startsWith('#')).join('\n');
  assert.doesNotMatch(code, /mainnet|secrets\./i);
  assert.match(code, /api\.devnet\.solana\.com/);
});
