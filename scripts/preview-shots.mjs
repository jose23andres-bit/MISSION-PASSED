// Builds self-contained HTML for each page and writes a Playwright script that screenshots them.
// Usage: node scripts/preview-shots.mjs  → /tmp/mp-shots.js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from './load-env.mjs';
import { publicConfig } from './public-config.mjs';

const root = resolve(import.meta.dirname, '..');
loadEnv(resolve(root, '.env'));
const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8').replace(/@import url\([^)]*\);/, '');
const mark = `data:image/svg+xml;base64,${readFileSync(resolve(root, 'public/mark.svg')).toString('base64')}`;
const config = `window.MISSION_PASSED_CONFIG = Object.freeze(${JSON.stringify(publicConfig())});`
  + `window.MISSION_PASSED_SEARCH_INDEX = ${readFileSync(resolve(root, 'public/search-index.json'), 'utf8').trim()};`;
const js = (name) => readFileSync(resolve(root, 'src', name), 'utf8').replace(/<\/script/gi, '<\\/script');

function inline(page) {
  let html = readFileSync(resolve(root, page), 'utf8');
  const scripts = [];
  html = html.replace(/<link rel="stylesheet" href="\/assets\/styles.css"\s*\/?>/, `<style>${css}\n.reveal{opacity:1!important;transform:none!important}</style>`);
  scripts.push(config);
  html = html.replace(/<script src="\/config.js"><\/script>/, '');
  html = html.replace(/<script src="\/assets\/([\w-]+\.js)"[^>]*><\/script>/g, (_, f) => { scripts.push(js(f)); return ''; });
  html = html.replaceAll('/mark.svg', mark);
  return html.replace('</body>', `${scripts.map((s) => `<script>${s}</script>`).join('')}</body>`);
}

const shots = [
  ['index.html', '01-portada-escritorio', 1440, 900, true],
  ['index.html', '02-portada-movil', 390, 844, true],
  ['presale/index.html', '03-launch-pool', 1440, 900, true],
  ['transparency/index.html', '04-transparencia', 1440, 900, true],
  ['portal/gta-vi.html', '05-portal-gta-vi', 1440, 900, true],
  ['portal/characters.html', '06-personajes-movil', 390, 844, true],
];
const dir = '/projects/sandbox/.kiro/artifacts/screenshots';
const pages = shots.map(([page, name, w, h, full, selector]) => ({ html: inline(page), name, w, h, full, selector }));
const code = `async (page) => {
  const shots = ${JSON.stringify(pages)};
  const out = [];
  for (const s of shots) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.setContent(s.html, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const path = '${dir}/mission-passed-' + s.name + '.jpg';
    if (s.selector) await page.locator(s.selector).screenshot({ path, type: 'jpeg', quality: 80 });
    else await page.screenshot({ path, fullPage: s.full, type: 'jpeg', quality: 72 });
    out.push(path);
  }
  return out;
}`;
if (process.argv.includes('--check')) {
  // Audit every page at desktop and mobile width: JS errors and horizontal overflow.
  const files = ['index.html', 'presale/index.html', 'transparency/index.html', 'admin/index.html',
    ...['gta-vi', 'characters', 'leonida', 'trailers', 'news', 'guides', 'theories', 'search'].map((p) => `portal/${p}.html`)];
  const audit = files.map((f) => ({ file: f, html: inline(f) }));
  const checkCode = `async (page) => {
  const pages = ${JSON.stringify(audit)};
  const results = [];
  for (const p of pages) {
    for (const width of [1440, 390]) {
      const errors = [];
      const onError = (e) => errors.push('pageerror: ' + e.message);
      const onConsole = (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|youtube|ERR_/i.test(m.text())) errors.push('console: ' + m.text()); };
      page.on('pageerror', onError); page.on('console', onConsole);
      await page.setViewportSize({ width, height: 844 });
      await page.setContent(p.html, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      const layout = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const wide = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed'; })
          .slice(0, 6).map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '') + ' right=' + Math.round(el.getBoundingClientRect().right));
        return { scrollWidth: document.documentElement.scrollWidth, vw, wide };
      });
      page.off('pageerror', onError); page.off('console', onConsole);
      results.push({ file: p.file, width, errors, overflow: layout.scrollWidth > layout.vw ? layout : null });
    }
  }
  return JSON.stringify(results.filter((r) => r.errors.length || r.overflow));
}`;
  writeFileSync(process.argv[process.argv.indexOf('--check') + 1], checkCode);
  console.log('wrote audit script');
  process.exit(0);
}
const target = process.argv[2] || '/tmp/mp-shots.js';
writeFileSync(target, code);
console.log(`wrote ${target} (${(code.length / 1024).toFixed(0)} KB, ${pages.length} shots)`);
