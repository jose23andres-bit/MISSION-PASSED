// Writes dist/version.json so the post-deploy check can prove WHICH commit is live.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from './lib.mjs';

const info = {
  commit: process.env.GITHUB_SHA || 'local',
  environment: process.env.MP_ENVIRONMENT || 'local',
  network: process.env.VITE_SOLANA_NETWORK || 'devnet',
  basePath: process.env.SITE_BASE_PATH || '',
  run: process.env.GITHUB_RUN_ID || '',
  builtAt: new Date().toISOString(),
};
writeFileSync(resolve(root, 'dist/version.json'), `${JSON.stringify(info, null, 2)}\n`);
console.log(`dist/version.json → ${info.commit.slice(0, 7)} (${info.environment}, ${info.network})`);
