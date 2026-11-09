// Single source for the public browser configuration (build and dev server).
// Only public values belong here: everything is readable by every visitor.
import '../src/presale-tiers.js';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DEPOSIT_WINDOW_MS = 48 * 60 * 60 * 1000;

function publicKey(value) {
  return BASE58.test(value || '') ? value : '';
}

// Only accept the official Metaplex launch page, so a typo cannot send buyers elsewhere.
export function safeLaunchUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (host === 'metaplex.com' || host.endsWith('.metaplex.com')) ? url.toString() : '';
  } catch {
    return '';
  }
}

function isoOr(value, fallback) {
  const ms = Date.parse(value || fallback);
  return Number.isNaN(ms) ? new Date(Date.parse(fallback)).toISOString() : new Date(ms).toISOString();
}

// "fromSol:priceUsd,..." → validated tiers. Invalid input falls back to the published defaults.
export function presaleTiers(text) {
  try {
    return globalThis.MPPresaleTiers.parse(text).map((tier) => ({ ...tier }));
  } catch {
    return globalThis.MPPresaleTiers.parse().map((tier) => ({ ...tier }));
  }
}

export function publicConfig(env = process.env) {
  const rawBase = String(env.SITE_BASE_PATH || '').trim();
  const basePath = rawBase && rawBase !== '/' ? `/${rawBase.replace(/^\/+|\/+$/g, '')}` : '';
  const network = ['devnet', 'testnet', 'mainnet-beta'].includes(env.VITE_SOLANA_NETWORK) ? env.VITE_SOLANA_NETWORK : 'devnet';
  const rpcUrl = env.VITE_SOLANA_RPC_URL || (network === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : `https://api.${network}.solana.com`);
  const start = env.VITE_LAUNCHPOOL_DEPOSIT_START || '2026-11-15T19:00:00Z';
  const startMs = Date.parse(start);
  return {
    basePath,
    network,
    rpcUrl,
    tokenMint: publicKey(env.VITE_TOKEN_MINT),
    tokenLaunchAt: env.VITE_TOKEN_LAUNCH_AT || '2026-11-15T19:00:00Z',
    treasuryWallet: publicKey(env.VITE_TREASURY_WALLET || '4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj'),
    genesisAccount: publicKey(env.VITE_GENESIS_ACCOUNT),
    launchpool: {
      tokenAllocation: 533_333_333,
      raiseGoalSol: Number(env.VITE_LAUNCHPOOL_RAISE_GOAL_SOL || 250),
      depositStart: Number.isNaN(startMs) ? '' : new Date(startMs).toISOString(),
      depositEnd: Number.isNaN(startMs) ? '' : new Date(startMs + DEPOSIT_WINDOW_MS).toISOString(),
      launchUrl: safeLaunchUrl(env.VITE_LAUNCH_URL),
    },
    // Direct presale. Disabled until VITE_PRESALE_WALLET holds a valid public address.
    presale: {
      wallet: publicKey(env.VITE_PRESALE_WALLET),
      start: isoOr(env.VITE_PRESALE_START, '2026-11-09T00:00:00Z'),
      end: isoOr(env.VITE_PRESALE_END, env.VITE_TOKEN_LAUNCH_AT || '2026-11-15T19:00:00Z'),
      baselineSol: Math.max(0, Number(env.VITE_PRESALE_BASELINE_SOL) || 0),
      tiers: presaleTiers(env.VITE_PRESALE_TIERS),
      tokenCap: 533_333_333,
      minUsd: 1,
    },
    links: {
      x: env.VITE_PROJECT_X_URL || '',
      discord: env.VITE_PROJECT_DISCORD_URL || '',
      telegram: env.VITE_PROJECT_TELEGRAM_URL || '',
    },
  };
}
