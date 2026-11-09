import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from './load-env.mjs';
import { publicConfig } from './public-config.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
loadEnv(resolve(root, '.env'));

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, 'assets'), { recursive: true });
await cp(resolve(root, 'public'), dist, { recursive: true });
for (const dir of ['docs', 'portal', 'presale', 'transparency', 'admin', 'blockchain']) {
  await cp(resolve(root, dir), resolve(dist, dir), { recursive: true });
}
for (const file of ['app.js', 'portal-search.js', 'chain-dashboard.js', 'admin.js', 'styles.css']) {
  await cp(resolve(root, 'src', file), resolve(dist, 'assets', file));
}

await writeFile(resolve(dist, 'index.html'), await readFile(resolve(root, 'index.html'), 'utf8'));
await writeFile(
  resolve(dist, 'config.js'),
  `window.MISSION_PASSED_CONFIG = Object.freeze(${JSON.stringify(publicConfig(), null, 2)});\n`,
);

console.log('Built MISSION PASSED → dist/');
