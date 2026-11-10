import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('landing contains every required section and no placeholder links', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  for (const id of ['universo', 'recompensas', 'tokenomics', 'buy', 'launch', 'faq']) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /href=["']#["']/);
  assert.match(html, /id="roadmap"/);
  assert.match(html, /id="launch-countdown"/);
  assert.match(html, /16% disponible y 4% con vesting de 12 meses/);
});

test('published pages contain no fake purchase button', async () => {
  for (const path of ['index.html', 'presale/index.html', 'transparency/index.html', 'admin/index.html', 'portal/search.html']) {
    const html = await readFile(resolve(root, path), 'utf8');
    assert.doesNotMatch(html, /href=["']#["']/);
    assert.doesNotMatch(html, /<button[^>]*>\s*(Buy|Comprar|Purchase)\s*<\/button>/i);
  }
});

test('project countdown targets its own launch on 15 November 2026', async () => {
  const script = await readFile(resolve(root, 'src/app.js'), 'utf8');
  assert.match(script, /new Date\(2026, 10, 15, 20, 0, 0, 0\)/);
  assert.match(script, /release-active/);
});

test('plan records public wallet, reported funding and no Mainnet authorization', async () => {
  const plan = JSON.parse(await readFile(resolve(root, 'launch.plan.json'), 'utf8'));
  assert.equal(plan.creatorPublicWallet, '4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj');
  assert.equal(plan.creatorBalanceReportedSol, 0.11);
  assert.equal(plan.authorityPolicy.automaticRevocation, false);
  assert.equal(plan.network.mainnetAuthorized, false);
});

test('CSS preserves semantic hidden state for pre-launch actions', async () => {
  const css = await readFile(resolve(root, 'src/styles.css'), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});

test('production config defaults to the published wallet and final Launch Pool', async () => {
  const { publicConfig } = await import('../scripts/public-config.mjs');
  const config = publicConfig({});
  assert.equal(config.treasuryWallet, '4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj');
  assert.equal(config.launchpool.tokenAllocation, 533_333_333);
  assert.equal(config.launchpool.raiseGoalSol, 250);
  assert.equal(config.launchpool.depositStart, '2026-11-15T19:00:00.000Z');
});

test('cinematic rebrand is original and contains no third-party game branding', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  assert.match(html, /id="universo"/);
  assert.match(html, /mission-passed-motion-hd\.mp4/);
  assert.match(html, /PROYECTO ORIGINAL/);
  assert.doesNotMatch(html, /Rockstar|Grand Theft Auto|GTA VI|Vice City|Leonida|Jason Duval|Lucia Caminos/i);
  assert.doesNotMatch(html, /youtube-nocookie\.com\/embed/);
});

test('giveaway fund is labelled with its real custody and the gallery is original art', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const transparency = await readFile(resolve(root, 'transparency/index.html'), 'utf8');
  const plan = JSON.parse(await readFile(resolve(root, 'launch.plan.json'), 'utf8'));
  assert.match(html, /id="sorteos"/);
  assert.match(html, /999 pases/);
  assert.match(html, /controlada por el creador/);
  assert.match(transparency, /Esta wallet la controla el creador/);
  assert.equal(plan.giveawayFund.custodyWallet, plan.creatorPublicWallet);
  assert.equal(plan.giveawayFund.nftPasses.supply, 999);
  assert.match(html, /Postales de Neon Coast/);
  // Gallery uses the project's own cinematic photos; every image must exist and none may come from Rockstar.
  const shots = [...html.matchAll(/<img[^>]*src="\/photos\/(gallery-[^"]+)"/g)].map((m) => m[1]);
  assert.equal(shots.length, 8);
  for (const shot of shots) await readFile(resolve(root, 'public/photos', shot));
});
