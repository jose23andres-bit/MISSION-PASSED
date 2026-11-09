// Base58 (Bitcoin alphabet), as used for Solana addresses and signatures.
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function encodeBase58(bytes) {
  const input = Uint8Array.from(bytes);
  let value = 0n;
  for (const byte of input) value = (value << 8n) | BigInt(byte);
  let out = '';
  while (value > 0n) {
    out = ALPHABET[Number(value % 58n)] + out;
    value /= 58n;
  }
  for (const byte of input) {
    if (byte !== 0) break;
    out = `1${out}`;
  }
  return out;
}
