import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import '../src/presale-tiers.js';
import { publicConfig } from '../scripts/public-config.mjs';

const root = resolve(import.meta.dirname, '..');
const T = globalThis.MPPresaleTiers;

test('default tiers are $0.0004, then $0.001 from 100 SOL and $0.005 from 200 SOL', () => {
  assert.deepEqual(T.parse().map((t) => [t.fromSol, t.priceUsd]), [[0, 0.0004], [100, 0.001], [200, 0.005]]);
  assert.equal(T.tierAt(99.99, T.parse()), 0);
  assert.equal(T.tierAt(100, T.parse()), 1);
  assert.equal(T.tierAt(250, T.parse()), 2);
});

test('a payment that crosses a tier is split at the boundary', () => {
  const q = T.quote({ raisedSol: 90, paymentSol: 20, solUsd: 100, tiers: T.parse() });
  assert.equal(q.segments.length, 2);
  assert.equal(Math.round(q.segments[0].mp), 2_500_000); // 10 SOL × $100 / $0.0004
  assert.equal(Math.round(q.segments[1].mp), 1_000_000); // 10 SOL × $100 / $0.001
  assert.equal(q.raisedAfter, 110);
});

test('invalid tiers are rejected and the config falls back to the published ones', () => {
  assert.throws(() => T.parse('10:0.001'));
  assert.throws(() => T.parse('0:0.005,100:0.001'));
  assert.deepEqual(publicConfig({ VITE_PRESALE_TIERS: 'basura' }).presale.tiers, T.parse().map((t) => ({ ...t })));
});

test('presale stays disabled without a valid receiving wallet', () => {
  assert.equal(publicConfig({}).presale.wallet, '');
  assert.equal(publicConfig({ VITE_PRESALE_WALLET: 'not-a-key' }).presale.wallet, '');
  assert.equal(publicConfig({}).presale.end, '2026-11-15T19:00:00.000Z');
});

test('presale page loads the pinned Solana library and offers SOL, USDC and USDT', async () => {
  const html = await readFile(resolve(root, 'presale/index.html'), 'utf8');
  assert.match(html, /\/assets\/vendor\/solana-web3\.min\.js/);
  for (const c of ['SOL', 'USDC', 'USDT']) assert.match(html, new RegExp(`data-currency="${c}"`));
  assert.match(html, /id="ps-ack"/);
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assert.match(pkg.dependencies['@solana/web3.js'], /^\d+\.\d+\.\d+$/);
});

test('NFT portraits are original MISSION PASSED art without embedded images', async () => {
  for (const file of ['01-el-conductor', '02-la-jefa', '03-el-socio', '04-rico']) {
    const svg = await readFile(resolve(root, 'public/nft', `${file}.svg`), 'utf8');
    assert.match(svg, /Ilustración original MISSION PASSED/);
    assert.doesNotMatch(svg, /<image\b|href="http/);
  }
});
