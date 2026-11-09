// READ-ONLY presale ledger: lists every SOL / USDC / USDT payment received by the presale wallet and the MP each buyer is owed.
// Signs nothing and sends nothing. Use its CSV to review the token distribution on 15 Nov, then send from your own wallet.
// Usage: node scripts/presale/ledger.mjs --env production [--rpc https://...] [--sol-usd 150]
import '../../src/presale-tiers.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : ''; };
const envName = arg('env') || 'production';
for (const line of readFileSync(resolve(root, `config/environments/${envName}.env`), 'utf8').split('\n')) {
  const m = line.trim().match(/^([A-Z_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
const { publicConfig } = await import('../public-config.mjs');
const cfg = publicConfig();
const P = cfg.presale;
const T = globalThis.MPPresaleTiers;
if (!P.wallet) { console.error('VITE_PRESALE_WALLET no está configurada en este entorno.'); process.exit(1); }
const RPC = arg('rpc') || cfg.rpcUrl;
const mainnet = cfg.network === 'mainnet-beta';
const MINTS = mainnet ? { EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC', Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT' } : { '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': 'USDC' };
const PYTH = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
const startS = Date.parse(P.start) / 1000, endS = Date.parse(P.end) / 1000;

async function rpc(method, params) {
  for (let attempt = 0; ; attempt += 1) {
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    if (r.status === 429 && attempt < 8) { await new Promise((d) => setTimeout(d, 1500 * (attempt + 1))); continue; }
    const body = await r.json();
    if (body.error) throw new Error(`${method}: ${body.error.message}`);
    return body.result;
  }
}

async function signatures(address) {
  const out = [];
  let before;
  for (;;) {
    const page = await rpc('getSignaturesForAddress', [address, { limit: 1000, before, commitment: 'finalized' }]);
    out.push(...page.filter((s) => !s.err));
    if (page.length < 1000) return out;
    before = page.at(-1).signature;
  }
}

const priceCache = new Map();
async function solUsdAt(unix) {
  if (arg('sol-usd')) return Number(arg('sol-usd'));
  const minute = Math.floor(unix / 60) * 60;
  if (priceCache.has(minute)) return priceCache.get(minute);
  const r = await fetch(`https://benchmarks.pyth.network/v1/updates/price/${minute}?ids=${PYTH}&parsed=true`);
  if (!r.ok) throw new Error(`Pyth benchmarks HTTP ${r.status} (usa --sol-usd para fijar un precio)`);
  const p = (await r.json()).parsed[0].price;
  const value = Number(p.price) * 10 ** Number(p.expo);
  priceCache.set(minute, value);
  return value;
}

// Token accounts owned by the presale wallet → which stablecoin they hold.
const ataToSymbol = new Map();
for (const [mint, symbol] of Object.entries(MINTS)) {
  const res = await rpc('getTokenAccountsByOwner', [P.wallet, { mint }, { encoding: 'jsonParsed' }]);
  for (const a of res.value) ataToSymbol.set(a.pubkey, symbol);
}
const sigs = new Map();
for (const address of [P.wallet, ...ataToSymbol.keys()]) for (const s of await signatures(address)) sigs.set(s.signature, s);

const payments = [];
for (const s of [...sigs.values()].sort((a, b) => a.slot - b.slot)) {
  if (!s.blockTime || s.blockTime < startS || s.blockTime >= endS) continue;
  const tx = await rpc('getTransaction', [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'finalized' }]);
  if (!tx || tx.meta?.err) continue;
  const all = [...tx.transaction.message.instructions, ...(tx.meta.innerInstructions || []).flatMap((i) => i.instructions)];
  for (const ix of all) {
    const info = ix.parsed?.info;
    if (!info) continue;
    if (ix.program === 'system' && ix.parsed.type === 'transfer' && info.destination === P.wallet && info.source !== P.wallet) {
      payments.push({ signature: s.signature, slot: s.slot, time: s.blockTime, buyer: info.source, currency: 'SOL', amount: info.lamports / 1e9 });
    }
    if (ix.program === 'spl-token' && ['transfer', 'transferChecked'].includes(ix.parsed.type) && ataToSymbol.has(info.destination)) {
      const amount = info.tokenAmount ? Number(info.tokenAmount.uiAmountString) : Number(info.amount) / 1e6;
      payments.push({ signature: s.signature, slot: s.slot, time: s.blockTime, buyer: info.authority || info.multisigAuthority, currency: ataToSymbol.get(info.destination), amount });
    }
  }
}

let raised = 0, sold = 0;
const owed = new Map();
for (const p of payments) {
  p.solUsd = await solUsdAt(p.time);
  p.solEquivalent = p.currency === 'SOL' ? p.amount : p.amount / p.solUsd;
  const q = T.quote({ raisedSol: raised, paymentSol: p.solEquivalent, solUsd: p.solUsd, tiers: P.tiers });
  p.mp = Math.floor(q.mp);
  p.tiers = q.segments.map((x) => x.tier).join('+');
  raised = q.raisedAfter;
  sold += p.mp;
  p.overCap = sold > P.tokenCap;
  owed.set(p.buyer, (owed.get(p.buyer) || 0) + p.mp);
}

await mkdir(resolve(root, 'deployment'), { recursive: true });
const report = { generatedAt: new Date().toISOString(), network: cfg.network, wallet: P.wallet, window: [P.start, P.end], tiers: P.tiers, raisedSol: raised, mpSold: sold, tokenCap: P.tokenCap, buyers: owed.size, payments };
await writeFile(resolve(root, 'deployment/presale-ledger.json'), `${JSON.stringify(report, null, 2)}\n`);
const csv = ['buyer,mp_owed', ...[...owed].map(([buyer, mp]) => `${buyer},${mp}`)].join('\n');
await writeFile(resolve(root, 'deployment/presale-owed.csv'), `${csv}\n`);
console.log(`${payments.length} pagos · ${owed.size} compradores · ${raised.toFixed(4)} SOL equivalentes · ${sold.toLocaleString('es-ES')} MP`);
if (payments.some((p) => p.overCap)) console.warn('⚠️ Se ha superado el tope de MP a la venta: revisa los últimos pagos antes de repartir.');
console.log('→ deployment/presale-ledger.json y deployment/presale-owed.csv (fuera de git)');
