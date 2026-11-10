import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('production build emits a deployable static site', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
  for (const path of ['dist/index.html', 'dist/assets/app.js', 'dist/assets/styles.css', 'dist/assets/portal-search.js', 'dist/assets/chain-dashboard.js', 'dist/assets/admin.js', 'dist/config.js', 'dist/mark.svg', 'dist/token-logo.png', 'dist/docs/token-decisions.md', 'dist/portal/universo.html', 'dist/portal/search.html', 'dist/presale/index.html', 'dist/transparency/index.html', 'dist/admin/index.html']) {
    await access(resolve(root, path));
  }
  const config = await readFile(resolve(root, 'dist/config.js'), 'utf8');
  assert.match(config, /"network": "devnet"/);
  assert.doesNotMatch(config, /SOLANA_KEYPAIR_PATH|ALLOW_MAINNET/);
});

test('GitHub Pages build prefixes every public route', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, env: { ...process.env, SITE_BASE_PATH: '/MISSION-PASSED' } });
  const [html, config, search, manifest] = await Promise.all([
    readFile(resolve(root, 'dist/index.html'), 'utf8'),
    readFile(resolve(root, 'dist/config.js'), 'utf8'),
    readFile(resolve(root, 'dist/search-index.json'), 'utf8'),
    readFile(resolve(root, 'dist/site.webmanifest'), 'utf8'),
  ]);
  assert.match(html, /href="\/MISSION-PASSED\/assets\/styles\.css"/);
  assert.match(html, /href="\/MISSION-PASSED\/presale\/"/);
  assert.match(config, /"basePath": "\/MISSION-PASSED"/);
  assert.ok(JSON.parse(search).every((item) => item.url.startsWith('/MISSION-PASSED')));
  assert.equal(JSON.parse(manifest).start_url, '/MISSION-PASSED/');
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
});
