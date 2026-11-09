// Verifies the production build works under a GitHub Pages sub-path (https://user.github.io/REPO/).
// Usage: SITE_BASE_PATH=/MISSION-PASSED node scripts/ci/check-pages-paths.mjs
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { Report, lineOf, root, walk } from './lib.mjs';

const dist = resolve(root, 'dist');
const base = (process.env.SITE_BASE_PATH || '').replace(/\/+$/, '');
const report = new Report('Rutas compatibles con GitHub Pages');
if (!existsSync(dist)) {
  report.error('dist', undefined, 'No existe dist/: falta el build');
  report.finish('');
  process.exit();
}
if (!base) report.error('SITE_BASE_PATH', undefined, 'SITE_BASE_PATH vacío: en GitHub Pages el sitio vive en /<repositorio>/');

const rel = (file) => `dist/${file.slice(dist.length + 1)}`;
const isExternal = (ref) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|%23)/i.test(ref);
const optional = (ref) => /\/photos\//.test(ref); // optional photo slots declare a fallback

function exists(path) {
  if (!existsSync(path)) return false;
  if (statSync(path).isDirectory()) return existsSync(resolve(path, 'index.html'));
  return true;
}

// Resolves a reference found in `file`; returns an error message or null.
function check(file, ref, line) {
  if (!ref || isExternal(ref) || ref.startsWith('data:')) return;
  const clean = ref.split(/[?#]/)[0];
  if (!clean) return;
  let target;
  if (clean.startsWith('/')) {
    if (base && clean !== base && !clean.startsWith(`${base}/`)) {
      report.error(rel(file), line, `Ruta absoluta sin prefijo ${base}: "${ref}" (daría 404 en GitHub Pages)`);
      return;
    }
    target = resolve(dist, `.${clean.slice(base.length)}`);
  } else {
    target = resolve(dirname(file), clean);
  }
  if (!target.startsWith(dist)) return report.error(rel(file), line, `La ruta "${ref}" sale de dist/`);
  if (!exists(target)) {
    if (optional(ref)) report.warn(rel(file), line, `Recurso opcional ausente: ${ref}`);
    else report.error(rel(file), line, `Enlace roto: "${ref}"`);
  }
}

let checked = 0;
for (const file of walk(dist)) {
  const ext = extname(file).toLowerCase();
  if (!['.html', '.css', '.js', '.json', '.webmanifest'].includes(ext)) continue;
  const text = readFileSync(file, 'utf8');
  checked += 1;
  if (ext === '.html') {
    for (const m of text.matchAll(/\b(?:href|src|action|poster|data-fallback)="([^"]*)"/g)) check(file, m[1], lineOf(text, m.index));
    for (const m of text.matchAll(/\bcontent="(\/[^"]*)"/g)) check(file, m[1], lineOf(text, m.index));
    for (const m of text.matchAll(/\bsrcset="([^"]*)"/g)) for (const part of m[1].split(',')) check(file, part.trim().split(/\s+/)[0], lineOf(text, m.index));
    for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) check(file, m[1], lineOf(text, m.index));
    for (const m of text.matchAll(/(?:["'`])(\/(?:assets|portal|presale|transparency|admin|docs|blockchain)\/[^"'`\s]*)/g)) {
      report.error(rel(file), lineOf(text, m.index), `Ruta absoluta en script/atributo sin prefijo de base: "${m[1]}"`);
    }
  } else if (ext === '.css') {
    for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) check(file, m[1], lineOf(text, m.index));
  } else if (ext === '.js' && !file.endsWith('config.js')) {
    // JS must build URLs from MISSION_PASSED_CONFIG.basePath, never hard-code root-absolute paths.
    for (const m of text.matchAll(/(?<![\w$}\/.:])(["'`])(\/(?:assets|portal|presale|transparency|admin|docs|blockchain|search-index|config|token|mark|public)[^"'`\s]*)\1?/g)) {
      report.error(rel(file), lineOf(text, m.index), `Ruta absoluta en JavaScript: "${m[2]}" (usa window.MISSION_PASSED_CONFIG.basePath)`);
    }
  }
}

try {
  const config = readFileSync(resolve(dist, 'config.js'), 'utf8');
  const parsed = JSON.parse(config.slice(config.indexOf('{'), config.lastIndexOf('}') + 1));
  if (parsed.basePath !== base) report.error('dist/config.js', undefined, `basePath="${parsed.basePath}" no coincide con SITE_BASE_PATH="${base}"`);
} catch (error) {
  report.error('dist/config.js', undefined, `config.js ilegible: ${error.message}`);
}
try {
  const manifest = JSON.parse(readFileSync(resolve(dist, 'site.webmanifest'), 'utf8'));
  if (manifest.start_url !== `${base}/`) report.error('dist/site.webmanifest', undefined, `start_url="${manifest.start_url}" debería ser "${base}/"`);
  for (const icon of manifest.icons || []) check(resolve(dist, 'site.webmanifest'), icon.src);
} catch (error) {
  report.error('dist/site.webmanifest', undefined, `Manifest inválido: ${error.message}`);
}
try {
  for (const item of JSON.parse(readFileSync(resolve(dist, 'search-index.json'), 'utf8'))) check(resolve(dist, 'search-index.json'), item.url);
} catch (error) {
  report.error('dist/search-index.json', undefined, `Índice de búsqueda inválido: ${error.message}`);
}
if (!existsSync(resolve(dist, '404.html'))) report.warn('dist/404.html', undefined, 'No hay 404.html: GitHub Pages mostrará su 404 genérico');

report.note(`Archivos revisados: ${checked}. Base: \`${base || '(vacía)'}\``);
report.finish(`Todas las rutas funcionan bajo ${base}/.`);
