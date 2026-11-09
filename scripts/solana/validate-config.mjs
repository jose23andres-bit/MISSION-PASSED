import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateTokenConfig } from './config.mjs';

const path = resolve(process.cwd(), 'token.config.json');
let config;
try { config = JSON.parse(await readFile(path, 'utf8')); }
catch { console.error('Falta token.config.json. Copia token.config.example.json únicamente después de aprobar las decisiones.'); process.exit(1); }

const errors = validateTokenConfig(config);
if (errors.length) {
  console.error('Configuración no aprobada:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Configuración válida para un ensayo en Devnet. No autoriza Mainnet.');
