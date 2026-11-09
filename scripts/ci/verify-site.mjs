// Smoke test of a built site, served the way GitHub Pages serves it.
//   Before publishing: node scripts/ci/verify-site.mjs --dir dist --base /MISSION-PASSED --expect-network devnet
//   After publishing:  node scripts/ci/verify-site.mjs --url https://USER.github.io/REPO/ --expect-commit $GITHUB_SHA --retries 20 --delay 15
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { Report, root, walk } from './lib.mjs';

const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const dir = arg('dir');
const expectNetwork = arg('expect-network');
const expectCommit = arg('expect-commit');
const retries = Number(arg('retries', '1'));
const delay = Number(arg('delay', '10')) * 1000;
const report = new Report(dir ? 'Verificación previa al despliegue (servidor local tipo Pages)' : 'Verificación posterior al despliegue');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.md': 'text/markdown', '.txt': 'text/plain' };

let server;
let siteUrl = arg('url');
if (dir) {
  const distDir = resolve(root, dir);
  const base = (arg('base') || '').replace(/\/+$/, '');
  if (!existsSync(distDir)) {
    report.error(dir, undefined, 'No existe el directorio del build');
    report.finish('');
    process.exit();
  }
  // Behaves like GitHub Pages: sub-path mount, case-sensitive, folders → index.html, otherwise 404.
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (base && path !== base && !path.startsWith(`${base}/`)) return void res.writeHead(404).end('not found');
    let file = resolve(distDir, `.${path.slice(base.length) || '/'}`);
    if (!file.startsWith(distDir)) return void res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
    if (!existsSync(file)) return void res.writeHead(404).end('not found');
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  siteUrl = `http://127.0.0.1:${server.address().port}${base}/`;
}
if (!siteUrl) {
  console.error('Usa --dir <carpeta> --base <ruta> o --url <https://...>');
  process.exit(2);
}
siteUrl = siteUrl.replace(/\/*$/, '/');

const PAGES = ['', 'portal/gta-vi.html', 'portal/search.html', 'portal/news.html', 'presale/', 'transparency/', 'admin/'];
if (dir) {
  const distDir = resolve(root, dir);
  for (const file of walk(distDir)) if (file.endsWith('.html')) {
    const page = file.slice(distDir.length + 1).replace(/index\.html$/, '');
    if (!PAGES.includes(page)) PAGES.push(page);
  }
}

async function get(url) {
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'mission-passed-ci', 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(20_000) });
  return { status: response.status, type: response.headers.get('content-type') || '', text: await response.text(), url: response.url };
}

async function attempt() {
  const problems = [];
  const seen = new Set();
  for (const page of PAGES) {
    const url = new URL(page, siteUrl).toString();
    let result;
    try {
      result = await get(url);
    } catch (error) {
      problems.push([url, `No responde: ${error.message}`]);
      continue;
    }
    if (result.status !== 200) {
      problems.push([url, `HTTP ${result.status} (esperado 200)`]);
      continue;
    }
    if (!/html/.test(result.type)) problems.push([url, `Content-Type inesperado: ${result.type}`]);
    if (!/<title>[^<]+<\/title>/i.test(result.text)) problems.push([url, 'La página no tiene <title>']);
    if (/<<<<<<<|undefined\b.{0,20}\[object Object\]/.test(result.text)) problems.push([url, 'Contenido corrupto en el HTML']);
    for (const m of result.text.matchAll(/\b(?:href|src)="([^"#]+)"/g)) {
      let asset;
      try {
        asset = new URL(m[1], url);
      } catch {
        continue;
      }
      if (asset.origin !== new URL(siteUrl).origin || seen.has(asset.href) || /\/photos\//.test(asset.pathname)) continue;
      seen.add(asset.href);
      try {
        const got = await get(asset.href);
        if (got.status !== 200) problems.push([asset.href, `HTTP ${got.status} (referenciado desde ${page || 'index'})`]);
      } catch (error) {
        problems.push([asset.href, `No responde: ${error.message}`]);
      }
    }
  }
  try {
    const cfg = await get(new URL('config.js', siteUrl));
    const parsed = JSON.parse(cfg.text.slice(cfg.text.indexOf('{'), cfg.text.lastIndexOf('}') + 1));
    if (expectNetwork && parsed.network !== expectNetwork) problems.push(['config.js', `Red "${parsed.network}" distinta de la esperada "${expectNetwork}"`]);
    if (/mainnet/i.test(parsed.rpcUrl) && expectNetwork === 'devnet') problems.push(['config.js', 'RPC de Mainnet en un entorno devnet']);
    const expectedBase = new URL(siteUrl).pathname.replace(/\/$/, '');
    if (!dir && parsed.basePath !== expectedBase) problems.push(['config.js', `basePath "${parsed.basePath}" ≠ "${expectedBase}"`]);
  } catch (error) {
    problems.push(['config.js', `No se pudo leer: ${error.message}`]);
  }
  if (expectCommit) {
    try {
      const version = JSON.parse((await get(new URL('version.json', siteUrl))).text);
      if (version.commit !== expectCommit) problems.push(['version.json', `Publicado ${String(version.commit).slice(0, 7)} pero se esperaba ${expectCommit.slice(0, 7)} (¿propagación de caché?)`]);
    } catch (error) {
      problems.push(['version.json', `No se pudo leer: ${error.message}`]);
    }
  }
  return problems;
}

let problems = [];
for (let n = 1; n <= retries; n += 1) {
  problems = await attempt();
  if (problems.length === 0) break;
  console.log(`Intento ${n}/${retries}: ${problems.length} problema(s). ${n < retries ? `Reintento en ${delay / 1000}s…` : ''}`);
  if (n < retries) await new Promise((done) => setTimeout(done, delay));
}
for (const [where, message] of problems) report.error(where, undefined, message);
report.note(`URL comprobada: ${siteUrl} · páginas: ${PAGES.length}`);
if (server) server.close();
report.finish(`Todas las páginas y recursos responden 200${expectCommit ? ` y el commit publicado es ${expectCommit.slice(0, 7)}` : ''}.`);
