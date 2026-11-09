// Single source for the public browser configuration (build and dev server).
// Only public values belong here: everything is readable by every visitor.
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

export function publicConfig(env = process.env) {
  const network = ['devnet', 'testnet', 'mainnet-beta'].includes(env.VITE_SOLANA_NETWORK) ? env.VITE_SOLANA_NETWORK : 'devnet';
  const rpcUrl = env.VITE_SOLANA_RPC_URL || (network === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : `https://api.${network}.solana.com`);
  const start = env.VITE_LAUNCHPOOL_DEPOSIT_START || '';
  const startMs = Date.parse(start);
  return {
    network,
    rpcUrl,
    tokenMint: publicKey(env.VITE_TOKEN_MINT),
    tokenLaunchAt: env.VITE_TOKEN_LAUNCH_AT || '2026-11-11T11:14:36Z',
    treasuryWallet: publicKey(env.VITE_TREASURY_WALLET),
    genesisAccount: publicKey(env.VITE_GENESIS_ACCOUNT),
    launchpool: {
      tokenAllocation: 250_000_000,
      raiseGoalSol: Number(env.VITE_LAUNCHPOOL_RAISE_GOAL_SOL || 0),
      depositStart: Number.isNaN(startMs) ? '' : new Date(startMs).toISOString(),
      depositEnd: Number.isNaN(startMs) ? '' : new Date(startMs + DEPOSIT_WINDOW_MS).toISOString(),
      launchUrl: safeLaunchUrl(env.VITE_LAUNCH_URL),
    },
    links: {
      x: env.VITE_PROJECT_X_URL || '',
      discord: env.VITE_PROJECT_DISCORD_URL || '',
      telegram: env.VITE_PROJECT_TELEGRAM_URL || '',
    },
  };
}
