import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { loadEnv } from './load-env.mjs';
import { publicConfig } from './public-config.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
loadEnv(resolve(root, '.env'));
const config = publicConfig();

async function files(directory, extension) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path, extension));
    else if (extname(path) === extension) result.push(path);
  }
  return result;
}

function withBasePath(html) {
  if (!config.basePath) return html;
  return html.replace(/\b(href|src|action|content|data-fallback|poster)="\/(?!\/)/g, `$1="${config.basePath}/`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, 'assets'), { recursive: true });
await cp(resolve(root, 'public'), dist, { recursive: true });
for (const dir of ['docs', 'portal', 'presale', 'transparency', 'admin', 'blockchain']) {
  await cp(resolve(root, dir), resolve(dist, dir), { recursive: true });
}
// Internal preview boards are excluded from the public site package.
await rm(resolve(dist, 'docs/preview'), { recursive: true, force: true });
for (const file of ['app.js', 'portal-search.js', 'chain-dashboard.js', 'admin.js', 'lang.js', 'guide.js', 'presale.js', 'presale-tiers.js', 'styles.css', 'mission.css', 'presale.css']) {
  await cp(resolve(root, 'src', file), resolve(dist, 'assets', file));
}
// Pinned by package-lock.json: the only third-party code the presale page runs.
await mkdir(resolve(dist, 'assets/vendor'), { recursive: true });
await cp(resolve(root, 'node_modules/@solana/web3.js/lib/index.iife.min.js'), resolve(dist, 'assets/vendor/solana-web3.min.js'));
await writeFile(resolve(dist, 'index.html'), await readFile(resolve(root, 'index.html'), 'utf8'));

for (const htmlFile of await files(dist, '.html')) {
  await writeFile(htmlFile, withBasePath(await readFile(htmlFile, 'utf8')));
}
const indexPath = resolve(dist, 'search-index.json');
const searchIndex = JSON.parse(await readFile(indexPath, 'utf8'));
if (config.basePath) {
  for (const item of searchIndex) if (item.url.startsWith('/')) item.url = `${config.basePath}${item.url}`;
}
await writeFile(indexPath, `${JSON.stringify(searchIndex, null, 2)}\n`);

const manifestPath = resolve(dist, 'site.webmanifest');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.start_url = `${config.basePath || ''}/`;
for (const icon of manifest.icons || []) if (icon.src.startsWith('/')) icon.src = `${config.basePath}${icon.src}`;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

await writeFile(
  resolve(dist, 'config.js'),
  `window.MISSION_PASSED_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`,
);
console.log(`Built MISSION PASSED → dist/${config.basePath ? ` (base ${config.basePath})` : ''}`);
