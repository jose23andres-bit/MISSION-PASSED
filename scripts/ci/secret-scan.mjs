// Fail-closed secret scanner (no external service, nothing leaves the runner).
// Usage: node scripts/ci/secret-scan.mjs [--dist] [--history]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { Report, lineOf, rel, repoFiles, root, walk } from './lib.mjs';

const args = new Set(process.argv.slice(2));
const report = new Report('Escaneo de secretos');

const RULES = [
  { id: 'pem-private-key', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/, label: 'Clave privada PEM/OpenSSH/PGP' },
  { id: 'solana-keypair-json', re: /\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/, label: 'Keypair de Solana (array JSON de 64 bytes)' },
  { id: 'base58-secret-key', re: /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{86,90}(?![1-9A-HJ-NP-Za-km-z])/, label: 'Cadena Base58 de 86-90 caracteres (parece clave secreta de Solana/Phantom)' },
  { id: 'seed-phrase', re: /(?:seed|mnemonic|recovery[ _-]?phrase|frase[ _-]?semilla|secret[ _-]?phrase)\w*["']?\s*[:=]\s*["'`]?(?:[a-z]{3,8}\s+){11,23}[a-z]{3,8}\b/i, label: 'Posible frase semilla (12-24 palabras)' },
  { id: 'github-token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/, label: 'Token de GitHub' },
  { id: 'aws-access-key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, label: 'Access key de AWS' },
  { id: 'slack-token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/, label: 'Token de Slack' },
  { id: 'stripe-live-key', re: /\b[sr]k_live_[A-Za-z0-9]{16,}\b/, label: 'Clave live de Stripe' },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/, label: 'API key de Google' },
  { id: 'npm-token', re: /\bnpm_[A-Za-z0-9]{36}\b/, label: 'Token de npm' },
  { id: 'rpc-api-key', re: /https?:\/\/[^\s"'`]*[?&](?:api-key|apikey|api_key|access_token)=[A-Za-z0-9_-]{12,}/i, label: 'URL de RPC con API key incrustada (se vería públicamente)' },
  { id: 'url-credentials', re: /\bhttps?:\/\/[^\s/:@"'`]+:[^\s/@"'`]{3,}@[^\s"'`]+/, label: 'URL con usuario y contraseña' },
  { id: 'secret-assignment', re: /\b(?:private[_-]?key|secret[_-]?key|api[_-]?secret|client[_-]?secret|password|passwd)\b["']?\s*[:=]\s*["'][A-Za-z0-9+/_=-]{20,}["']/i, label: 'Asignación de secreto con valor literal' },
];

// Public values that legitimately look like secrets. Keep this list tiny and reviewed.
const ALLOW = [/VITE_[A-Z_]+=\s*$/];

const BLOCKED_NAMES = [
  { test: (file) => /^\.env(\..+)?$/.test(basename(file)) && !/\.example$/.test(basename(file)), label: 'Archivo .env versionado (solo se permite .env.example)' },
  { test: (file) => /(^|\/)(id|keypair|wallet|phantom|mp-devnet)[\w.-]*\.json$/i.test(file) && !/launch\.plan|token-metadata/.test(file), label: 'Archivo que parece un keypair/wallet' },
  { test: (file) => /\.(pem|p12|pfx|key|keystore)$/i.test(file), label: 'Archivo de claves/certificado privado' },
  { test: (file) => /(^|\/)deployment\/(?!\.gitkeep).+\.json$/.test(file), label: 'Resultado de despliegue versionado (deployment/*.json debe quedar fuera de git)' },
];

const BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.zip', '.mp3', '.mp4', '.webm', '.pdf']);

function scanText(name, text, fileLabel = name, offsetLine = 0) {
  for (const rule of RULES) {
    const match = rule.re.exec(text);
    if (!match) continue;
    const snippet = match[0];
    if (ALLOW.some((allowed) => allowed.test(snippet))) continue;
    const preview = `${snippet.slice(0, 6)}…(${snippet.length} caracteres, oculto)`;
    report.error(fileLabel, offsetLine + lineOf(text, match.index), `${rule.label} [${rule.id}] ${preview}`);
  }
}

function scanFile(file) {
  const name = rel(file);
  for (const blocked of BLOCKED_NAMES) if (blocked.test(name)) report.error(name, undefined, blocked.label);
  if (BINARY.has(extname(file).toLowerCase())) return;
  try {
    if (statSync(file).size > 5_000_000) return;
    scanText(name, readFileSync(file, 'utf8'));
  } catch {
    // unreadable files are ignored
  }
}

let scanned = 0;
for (const file of repoFiles()) {
  if (!existsSync(file)) continue;
  scanFile(file);
  scanned += 1;
}

if (args.has('--dist')) {
  const dist = resolve(root, 'dist');
  if (!existsSync(dist)) report.error('dist', undefined, 'No existe dist/: ejecuta el build antes de escanear la salida publicada');
  else for (const file of walk(dist)) {
    scanFile(file);
    scanned += 1;
  }
}

if (args.has('--history')) {
  try {
    const log = execFileSync('git', ['log', '--all', '-p', '--no-color', '--diff-filter=AM', '--unified=0', '--format=commit %h'], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    const added = log.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++') || line.startsWith('commit ')).join('\n');
    let commit = '?';
    for (const chunk of added.split(/^commit /m)) {
      if (!chunk.trim()) continue;
      commit = chunk.split('\n', 1)[0];
      scanText('historial', chunk.split('\n').slice(1).join('\n').replace(/^\+/gm, ''), `historial git @ ${commit}`);
    }
  } catch (error) {
    report.warn('historial', undefined, `No se pudo escanear el historial: ${error.message.split('\n')[0]}`);
  }
}

report.note(`Archivos escaneados: ${scanned}${args.has('--dist') ? ' (incluye dist/)' : ''}${args.has('--history') ? ' + historial git' : ''}. Los valores detectados nunca se imprimen completos.`);
report.finish('No se encontraron claves, tokens ni frases semilla.');
