import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { loadEnv } from './load-env.mjs';
import { publicConfig } from './public-config.mjs';

const root = resolve(import.meta.dirname, '..');
loadEnv(resolve(root, '.env'));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const aliases = Object.fromEntries(['app.js', 'portal-search.js', 'chain-dashboard.js', 'admin.js', 'styles.css'].map((f) => [`/assets/${f}`, `/src/${f}`]));
const config = publicConfig();

createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
    if (requestPath === '/config.js') {
      response.writeHead(200, { 'Content-Type': mime['.js'], 'Cache-Control': 'no-store' });
      response.end(`window.MISSION_PASSED_CONFIG = Object.freeze(${JSON.stringify(config)});`);
      return;
    }
    let relative = aliases[requestPath] || (requestPath.endsWith('/') ? `${requestPath}index.html` : requestPath);
    // Files in public/ are served from the site root, as in the production build.
    const fromPublic = resolve(root, 'public', `.${relative}`);
    if (!aliases[requestPath] && (await stat(fromPublic).catch(() => null))?.isFile()) relative = `/public${relative}`;
    let filePath = resolve(root, `.${relative}`);
    if (!filePath.startsWith(`${root}${sep}`)) throw new Error('Invalid path');
    const fileStats = await stat(filePath).catch(() => null);
    if (!fileStats?.isFile()) filePath = resolve(root, 'index.html');
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`MISSION PASSED: http://127.0.0.1:${port}`));
