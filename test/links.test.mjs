import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (extname(entry.name) === '.html') files.push(path);
  }
  return files;
}

test('all root-relative links and assets resolve in the production build', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
  for (const file of await htmlFiles(dist)) {
    const html = await readFile(file, 'utf8');
    // Optional photo slots (/photos/*) may be missing: they must declare a fallback.
    for (const tag of html.matchAll(/<img[^>]*src="[^"]*\/photos\/[^"]*"[^>]*>/g)) {
      assert.match(tag[0], /data-fallback="[^"]+"|onerror="this\.remove\(\)"/, `${file}: photo slot without fallback`);
    }
    const refs = [...html.matchAll(/(?:href|src|data-fallback)="(\/[^"]*)"/g)].map((match) => match[1]).filter((ref) => !/\/photos\//.test(ref));
    for (const ref of refs) {
      const pathname = ref.split(/[?#]/)[0];
      if (!pathname || pathname === '/') continue;
      const target = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
      await assert.doesNotReject(access(resolve(dist, `.${target}`)), `${file} -> ${ref}`);
    }
  }
});
