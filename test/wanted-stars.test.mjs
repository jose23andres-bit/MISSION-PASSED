import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// Decisión del propietario: las estrellas de búsqueda que se encienden al bajar NO se modifican nunca.
test('wanted-level stars stay exactly as approved by the owner', async () => {
  const js = await readFile(resolve(root, 'src/fx.js'), 'utf8');
  const css = await readFile(resolve(root, 'src/fx.css'), 'utf8');
  const block = js.slice(js.indexOf('  // ---------- wanted-level HUD'), js.indexOf('  if (reduced) {'));
  const cblock = css.slice(css.indexOf('/* ---------- wanted-level HUD'), css.indexOf('/* ---------- VHS'));
  assert.match(js, /setupWanted\(\);/);
  assert.equal(createHash('sha256').update(block + cblock).digest('hex'), 'c2044f4e484ee78fa090e325ddeebd32f9fd5b0ba05662fc212c042f73bfed46', 'Las estrellas de búsqueda están protegidas: no las modifiques.');
  for (const page of ['index.html', 'presale/index.html']) assert.match(await readFile(resolve(root, page), 'utf8'), /assets\/fx\.js/);
});
