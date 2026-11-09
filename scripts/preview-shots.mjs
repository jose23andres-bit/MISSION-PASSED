// Builds self-contained HTML for each page and writes a Playwright script that screenshots them.
// Usage: node scripts/preview-shots.mjs  → /tmp/mp-shots.js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from './load-env.mjs';
import { publicConfig } from './public-config.mjs';

const root = resolve(import.meta.dirname, '..');
loadEnv(resolve(root, '.env'));
const fontData = (f) => `url('data:font/ttf;base64,${readFileSync(resolve(root, 'public/fonts', f)).toString('base64')}')`;
const readCss = (name) => readFileSync(resolve(root, 'src', name), 'utf8').replace(/@import url\([^)]*\);/, '')
  .replace(/url\('\.\.\/fonts\/([\w-]+\.ttf)'\)/g, (_, f) => fontData(f))
  .replace(/url\('\.\.\/gallery\/([\w-]+\.svg)'\)/g, (_, f) => `url('data:image/svg+xml;base64,${readFileSync(resolve(root, 'public/gallery', f)).toString('base64')}')`);
const css = readCss('styles.css');
const missionCss = readCss('mission.css');
const mark = `data:image/svg+xml;base64,${readFileSync(resolve(root, 'public/mark.svg')).toString('base64')}`;
const config = `window.MISSION_PASSED_CONFIG = Object.freeze(${JSON.stringify(publicConfig())});`
  + `window.MISSION_PASSED_SEARCH_INDEX = ${readFileSync(resolve(root, 'public/search-index.json'), 'utf8').trim()};`;
const js = (name) => readFileSync(resolve(root, 'src', name), 'utf8').replace(/<\/script/gi, '<\\/script');

function inline(page) {
  let html = readFileSync(resolve(root, page), 'utf8');
  const scripts = [];
  html = html.replace(/<link rel="stylesheet" href="\/assets\/styles.css"\s*\/?>/, `<style>${css}\n.reveal{opacity:1!important;transform:none!important}</style>`);
  html = html.replace(/<link rel="stylesheet" href="\/assets\/mission.css"\s*\/?>/, () => `<style>${missionCss}</style>`).replace(/<link rel="preload"[^>]*>/g, '');
  scripts.push(config);
  html = html.replace(/<script src="\/config.js"><\/script>/, '');
  html = html.replace(/<script src="\/assets\/([\w-]+\.js)"[^>]*><\/script>/g, (_, f) => { scripts.push(js(f)); return ''; });
  html = html.replaceAll('/mark.svg', mark).replaceAll(' loading="lazy"', '');
  html = html.replace(/\/gallery\/([\w-]+\.svg)/g, (_, f) => `data:image/svg+xml;base64,${readFileSync(resolve(root, 'public/gallery', f)).toString('base64')}`);
  return html.replace('</body>', `${scripts.map((s) => `<script>${s}</script>`).join('')}</body>`);
}

const shots = [
  ['index.html', 'n1-portada', 1440, 900, false],
  ['index.html', 'n2-portada-movil', 390, 1400, false],
  ['index.html', 'n3-proyecto', 1440, 900, false, '#proyecto'],
  ['index.html', 'n4-gta', 1440, 900, false, '#gta'],
  ['index.html', 'n5-galeria', 1440, 900, false, '#gallery'],
  ['index.html', 'n9-mision', 1440, 900, false, '#mision'],
  ['index.html', 'n10-mision-movil', 390, 900, false, '#mision'],
  ['index.html', 'n11-premio', 1440, 900, false, '.mp-grand'],
  ['index.html', 'n6-coleccion', 1440, 900, false, '#sorteos'],
  ['index.html', 'n12-idiomas', 390, 844, false, null, '.lang-toggle'],
  ['index.html', 'n7-completa', 1440, 900, true],
  ['index.html', 'n8-completa-movil', 390, 844, true],
];
const dir = '/projects/sandbox/.kiro/artifacts/screenshots';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const pages = shots.filter(([, name]) => !only || only.includes(name)).map(([page, name, w, h, full, selector, click]) => ({ html: inline(page), name, w, h, full, selector, click }));
const code = `async (page) => {
  const shots = ${JSON.stringify(pages)};
  const out = [];
  for (const s of shots) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.setContent(s.html, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
    await page.waitForTimeout(150);
    if (s.click) { await page.click(s.click); await page.waitForTimeout(200); }
    const path = '${dir}/mission-passed-' + s.name + '.jpg';
    if (s.selector) await page.locator(s.selector).screenshot({ path, type: 'jpeg', quality: 80 });
    else if (s.full) await page.screenshot({ path, fullPage: true, type: 'jpeg', quality: 72 });
    else await page.screenshot({ path, fullPage: true, clip: { x: 0, y: 0, width: s.w, height: s.h }, type: 'jpeg', quality: 80 });
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
