// Creates a throwaway Devnet keypair in Solana CLI JSON format (64 bytes: seed || public key).
// Used only by the Devnet rehearsal workflow. Never use it for real funds.
// Usage: node scripts/genesis/ephemeral-keypair.mjs <output.json>
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { encodeBase58 } from './base58.mjs';

export function createKeypair() {
  const { privateKey } = generateKeyPairSync('ed25519');
  const jwk = privateKey.export({ format: 'jwk' });
  const seed = Buffer.from(jwk.d, 'base64url');
  const publicKey = Buffer.from(jwk.x, 'base64url');
  return { secret: [...seed, ...publicKey], address: encodeBase58(publicKey) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) throw new Error('Uso: node scripts/genesis/ephemeral-keypair.mjs <salida.json>');
  const { secret, address } = createKeypair();
  writeFileSync(target, JSON.stringify(secret), { mode: 0o600 });
  console.log(address);
}
