import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('landing contains every required section and no placeholder links', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  for (const id of ['gta', 'editions', 'tokenomics', 'buy', 'launch', 'faq']) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /href=["']#["']/);
  assert.match(html, /AVISO DE RIESGO/);
  assert.match(html, /16% disponible · 4% vesting/);
});

test('published pages contain no fake purchase button', async () => {
  for (const path of ['index.html', 'presale/index.html', 'transparency/index.html', 'admin/index.html', 'portal/search.html']) {
    const html = await readFile(resolve(root, path), 'utf8');
    assert.doesNotMatch(html, /href=["']#["']/);
    assert.doesNotMatch(html, /<button[^>]*>\s*(Buy|Comprar|Purchase)\s*<\/button>/i);
  }
});

test('GTA VI countdown targets local midnight on 19 November 2026', async () => {
  const script = await readFile(resolve(root, 'src/app.js'), 'utf8');
  assert.match(script, /new Date\(2026, 10, 19, 0, 0, 0, 0\)/);
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
  assert.equal(config.launchpool.depositStart, '2026-11-11T11:14:36.000Z');
});

test('redesign uses official Rockstar links and embeds without copying Rockstar images', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  assert.match(html, /https:\/\/www\.rockstargames\.com\/VI\/trailer-2/);
  assert.match(html, /https:\/\/www\.rockstargames\.com\/VI\/editions/g);
  assert.match(html, /youtube-nocookie\.com\/embed\/VQRLujxTm3c/);
  assert.match(html, /PROYECTO INDEPENDIENTE · NO AFILIADO A ROCKSTAR GAMES/);
  assert.doesNotMatch(html, /<(?:img|video)[^>]+(?:src|poster)="https:\/\/[^\"]*rockstargames/i);
});
