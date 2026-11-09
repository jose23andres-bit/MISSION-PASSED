// Prints KEY=value lines for a named environment so a workflow can append them to $GITHUB_ENV.
// Usage: node scripts/ci/load-environment.mjs development|devnet|production >> "$GITHUB_ENV"
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './lib.mjs';

const name = process.argv[2];
if (!['development', 'devnet', 'production'].includes(name)) {
  console.error('Entorno desconocido. Usa: development | devnet | production');
  process.exit(1);
}
const file = resolve(root, 'config/environments', `${name}.env`);
if (!existsSync(file)) {
  console.error(`Falta ${file}`);
  process.exit(1);
}
for (const line of readFileSync(file, 'utf8').split('\n')) {
  const match = line.trim().match(/^((?:VITE_[A-Z0-9_]+|SITE_BASE_PATH))=(.*)$/);
  if (match) console.log(`${match[1]}=${match[2]}`);
}
console.log(`MP_ENVIRONMENT=${name}`);
