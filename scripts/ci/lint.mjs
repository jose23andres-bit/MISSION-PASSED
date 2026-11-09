// Dependency-free lint: syntax, JSON validity, HTML hygiene and conflict markers.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { Report, lineOf, rel, repoFiles, root } from './lib.mjs';

const report = new Report('Lint y comprobación de errores');
const files = repoFiles().filter((file) => !/(^|\/)(docs\/preview|public\/(photos|gallery|fonts))\//.test(rel(file)));
const TEXT = new Set(['.js', '.mjs', '.json', '.html', '.css', '.md', '.yml', '.yaml', '.toml', '.webmanifest', '.svg', '.txt', '.py']);

function checkJavaScript(file) {
  const name = rel(file);
  const asModule = (flag) => {
    try {
      execFileSync(process.execPath, ['--check', ...(flag ? ['--input-type=module'] : []), file], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
      return null;
    } catch (error) {
      return String(error.stderr || error.message);
    }
  };
  // .mjs and "type": "module" .js files parse as ESM; the only failure that matters is a real syntax error.
  const failure = asModule(false);
  if (failure) {
    const line = Number(failure.match(/:(\d+)\n/)?.[1]) || undefined;
    const detail = failure.split('\n').find((row) => /Error/.test(row)) || failure.split('\n')[0];
    report.error(name, line, `Error de sintaxis: ${detail}`);
  }
}

function checkJson(file, text) {
  try {
    JSON.parse(text);
  } catch (error) {
    report.error(rel(file), undefined, `JSON inválido: ${error.message}`);
  }
}

function checkHtml(file, text) {
  const name = rel(file);
  const withoutBlocks = text.replace(/<script[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, ' ')).replace(/<style[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));

  const ids = new Map();
  for (const match of withoutBlocks.matchAll(/\sid="([^"]+)"/g)) {
    if (ids.has(match[1])) report.error(name, lineOf(text, match.index), `id duplicado "${match[1]}" (primera aparición en línea ${ids.get(match[1])})`);
    else ids.set(match[1], lineOf(text, match.index));
  }

  for (const tag of ['div', 'section', 'main', 'nav', 'header', 'footer', 'ul', 'ol', 'table', 'form', 'article', 'aside', 'button', 'a', 'script', 'style']) {
    const open = (text.match(new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi')) || []).length;
    const close = (text.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    if (open !== close) report.error(name, undefined, `Etiquetas <${tag}> desbalanceadas (${open} abiertas, ${close} cerradas)`);
  }

  for (const match of withoutBlocks.matchAll(/<a\s[^>]*target="_blank"[^>]*>/gi)) {
    if (!/rel="[^"]*noopener/i.test(match[0])) report.warn(name, lineOf(text, match.index), 'Enlace target="_blank" sin rel="noopener" (los navegadores modernos lo aplican por defecto)');
  }
  for (const match of withoutBlocks.matchAll(/<img\s[^>]*>/gi)) {
    if (!/\salt=/i.test(match[0])) report.warn(name, lineOf(text, match.index), 'Imagen sin atributo alt');
  }
  for (const match of withoutBlocks.matchAll(/\s(?:href|src|action)="(http:\/\/[^"]+)"/gi)) {
    report.error(name, lineOf(text, match.index), `Recurso inseguro por HTTP (contenido mixto): ${match[1]}`);
  }
  if (!/<html[^>]*\slang=/i.test(text) && /<html/i.test(text)) report.warn(name, undefined, '<html> sin atributo lang');
  if (!/<title>[^<]+<\/title>/i.test(text) && /<head/i.test(text)) report.warn(name, undefined, 'Página sin <title>');
}

for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (!TEXT.has(ext)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const markers = text.match(/^(<<<<<<< |>>>>>>> |=======$)/m);
  if (markers && ext !== '.md') report.error(rel(file), lineOf(text, markers.index), 'Marcador de conflicto de merge sin resolver');
  if (ext === '.js' || ext === '.mjs') checkJavaScript(file);
  else if (ext === '.json' || ext === '.webmanifest') checkJson(file, text);
  else if (ext === '.html') checkHtml(file, text);
}

report.note(`Archivos revisados: ${files.length} (raíz ${root})`);
report.finish('Sin errores de sintaxis, JSON ni HTML.');
