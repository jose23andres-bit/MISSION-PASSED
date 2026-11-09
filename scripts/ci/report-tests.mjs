// Turns the node:test JUnit file into GitHub annotations + a readable job summary (failures first).
// Usage: node scripts/ci/test-report.mjs test-results/junit.xml
import { existsSync, readFileSync } from 'node:fs';
import { Report, summary } from './lib.mjs';

const file = process.argv[2] || 'test-results/junit.xml';
const report = new Report('Pruebas automatizadas');
if (!existsSync(file)) {
  report.error(file, undefined, 'No se generó el informe de pruebas (las pruebas no llegaron a ejecutarse)');
  report.finish('');
  process.exit();
}
const xml = readFileSync(file, 'utf8');
const decode = (text) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const cases = [...xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)].map((m) => {
  const attr = (name) => decode(m[1].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || '');
  const body = m[2] || '';
  const failure = body.match(/<(failure|error)\b([^>]*)>([\s\S]*?)<\/\1>/);
  return { name: attr('name'), file: attr('file').replace(/^.*\/(test\/[^/]+)$/, '$1') || 'test', line: Number(attr('line')) || undefined, time: Number(attr('time')) || 0, skipped: /<skipped/.test(body), failure: failure ? decode(failure[3] || failure[2]).trim() : null };
});
const failed = cases.filter((c) => c.failure);
const skipped = cases.filter((c) => c.skipped);
const passed = cases.length - failed.length - skipped.length;
if (cases.length === 0) report.error(file, undefined, 'El informe no contiene ninguna prueba');
for (const test of failed) {
  const detail = test.failure.split('\n').slice(0, 12).join('\n');
  report.error(test.file, test.line, `FALLA: «${test.name}»\n${detail}`);
}
report.note(`**${cases.length} pruebas** · ✅ ${passed} correctas · ❌ ${failed.length} fallidas · ⏭️ ${skipped.length} omitidas`);
if (failed.length) {
  summary(['#### Detalle de pruebas fallidas', ...failed.map((t) => `<details open><summary>❌ ${t.name}</summary>\n\n\`\`\`\n${t.failure.slice(0, 3000)}\n\`\`\`\n</details>`)].join('\n\n'));
  summary('> **Cómo reproducir en local:** `npm ci && npm test` · para una sola prueba: `node --test --test-name-pattern="texto" test/`');
}
report.finish(`${passed} pruebas correctas, ninguna fallida.`);
