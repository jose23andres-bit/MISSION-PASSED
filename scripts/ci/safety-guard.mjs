// Guardrails: the CI/CD pipeline must never touch Mainnet, mint tokens, sign transactions or move funds.
// Fails the build if any workflow, script or environment file could do so.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Report, lineOf, root } from './lib.mjs';

const report = new Report('Guarda de seguridad blockchain');
const WORKFLOWS = resolve(root, '.github/workflows');
const REHEARSAL = 'devnet-rehearsal.yml';

const codeOnly = (text) => text.split('\n').map((line) => (line.trim().startsWith('#') ? '' : line.replace(/\s#\s.*$/, ''))).join('\n');

// Commands/patterns that sign, deploy, mint or move funds. Forbidden in EVERY workflow.
const FORBIDDEN_EVERYWHERE = [
  [/\bsolana\s+(?:program\s+deploy|transfer|airdrop|withdraw-stake|stake|vote)/, 'CLI de Solana que despliega o mueve fondos'],
  [/\bspl-token\b/, 'spl-token (crea tokens / mueve fondos)'],
  [/\b(?:anchor\s+(?:deploy|upgrade)|metaboss|sugar\s+(?:deploy|launch)|mpl-)/, 'Herramienta de despliegue/acuñado'],
  [/mainnet/i, 'Referencia a Mainnet en código de un workflow'],
  [/\bsolana-keygen\b/, 'Generación de claves con solana-keygen'],
  [/(?:PRIVATE_KEY|SECRET_KEY|SEED|MNEMONIC|WALLET_KEY)/i, 'Variable de clave privada/semilla'],
  [/secrets\.(?!GITHUB_TOKEN\b)/, 'Uso de secretos distintos de GITHUB_TOKEN (el pipeline no necesita ninguno)'],
  [/\bsendTransaction|signTransaction|signAllTransactions|sendRawTransaction/, 'Firma/envío de transacciones'],
  [/\bcontents:\s*write|\bpackages:\s*write|\bsecurity-events:\s*write/, 'Permiso de escritura excesivo'],
];

// Only the manual, typed-confirmation Devnet rehearsal may run Genesis scripts or hold a throwaway keypair.
const ONLY_IN_REHEARSAL = [
  [/\bgenesis:(?:devnet|plan|verify)|scripts\/genesis\//, 'Script Genesis fuera del ensayo manual Devnet'],
  [/--execute\b/, 'Flag --execute fuera del ensayo manual Devnet'],
  [/KEYPAIR/i, 'Ruta/variable de keypair fuera del ensayo manual Devnet'],
];

if (!existsSync(WORKFLOWS)) report.error('.github/workflows', undefined, 'No existen workflows');
else for (const name of readdirSync(WORKFLOWS).filter((file) => /\.ya?ml$/.test(file))) {
  const path = `.github/workflows/${name}`;
  const text = readFileSync(resolve(WORKFLOWS, name), 'utf8');
  const code = codeOnly(text);
  const isRehearsal = name === REHEARSAL;
  for (const [re, label] of FORBIDDEN_EVERYWHERE) {
    const match = re.exec(code);
    // The rehearsal is allowed to say "KEYPAIR"/"genesis" but never mainnet, secrets or CLIs; its own tests enforce that too.
    if (match) report.error(path, lineOf(code, match.index), `${label}: "${match[0]}"`);
  }
  if (!isRehearsal) {
    for (const [re, label] of ONLY_IN_REHEARSAL) {
      const match = re.exec(code);
      if (match) report.error(path, lineOf(code, match.index), `${label}: "${match[0]}"`);
    }
  } else {
    if (!/^on:\s*\n\s+workflow_dispatch:/m.test(code) || /^\s{2}(?:push|pull_request|pull_request_target|schedule|workflow_run):/m.test(code)) {
      report.error(path, undefined, 'El ensayo Devnet debe ser SOLO manual (workflow_dispatch)');
    }
    if (!/confirm\s*==\s*'DEVNET'/.test(code)) report.error(path, undefined, 'El ensayo Devnet debe exigir escribir DEVNET');
    if (!/api\.devnet\.solana\.com/.test(code)) report.error(path, undefined, 'El ensayo Devnet debe apuntar a api.devnet.solana.com');
  }
  if (/pull_request_target/.test(code)) report.error(path, undefined, 'pull_request_target ejecuta código no confiable con permisos elevados');
  if (!/^permissions:/m.test(code) && !/^\s{4}permissions:/m.test(code)) report.error(path, undefined, 'Falta bloque permissions (mínimo privilegio)');
}

// package.json scripts must not reach a non-devnet network.
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
for (const [script, command] of Object.entries(pkg.scripts || {})) {
  if (/mainnet|--execute|spl-token|solana\s+(?:transfer|program)/i.test(command)) report.error('package.json', undefined, `El script "${script}" podría actuar en Mainnet o ejecutar transacciones: ${command}`);
}

// Genesis tooling: executable code must be Devnet-only (comments may explain why Mainnet is excluded).
const genesisDir = resolve(root, 'scripts/genesis');
for (const name of readdirSync(genesisDir).filter((file) => file.endsWith('.mjs'))) {
  const code = codeOnly(readFileSync(resolve(genesisDir, name), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const match = /api\.mainnet|mainnet-beta|MAINNET_RPC/i.exec(code);
  if (match) report.error(`scripts/genesis/${name}`, lineOf(code, match.index), `Endpoint de Mainnet en código ejecutable: "${match[0]}"`);
}

// launch.plan.json must stay Devnet-only for any automated run.
const plan = JSON.parse(readFileSync(resolve(root, 'launch.plan.json'), 'utf8'));
if (plan.network?.mainnetAuthorized === true) {
  report.error('launch.plan.json', undefined, 'network.mainnetAuthorized=true: el pipeline se bloquea. Mainnet solo se firma manualmente en Phantom/Squads, fuera de CI.');
}

// Environment files: public values only, per-environment network rules.
const envDir = resolve(root, 'config/environments');
const RULES = { development: ['devnet'], devnet: ['devnet'], production: ['devnet', 'mainnet-beta'] };
for (const [environment, networks] of Object.entries(RULES)) {
  const file = resolve(envDir, `${environment}.env`);
  const name = `config/environments/${environment}.env`;
  if (!existsSync(file)) {
    report.error(name, undefined, 'Falta el archivo de entorno');
    continue;
  }
  const values = {};
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) return report.error(name, index + 1, 'Línea no válida (usa CLAVE=valor)');
    if (!/^(VITE_[A-Z0-9_]+|SITE_BASE_PATH)$/.test(match[1])) report.error(name, index + 1, `Variable no permitida "${match[1]}": solo VITE_* públicas y SITE_BASE_PATH`);
    values[match[1]] = match[2];
  });
  if (!networks.includes(values.VITE_SOLANA_NETWORK)) report.error(name, undefined, `VITE_SOLANA_NETWORK="${values.VITE_SOLANA_NETWORK}" no permitido en ${environment} (permitido: ${networks.join(', ')})`);
  if (values.VITE_SOLANA_NETWORK === 'devnet' && /mainnet/i.test(values.VITE_SOLANA_RPC_URL || '')) report.error(name, undefined, 'RPC de Mainnet con red devnet');
}

report.finish('Ningún workflow, script ni entorno puede operar en Mainnet, crear tokens, firmar o mover fondos.');
