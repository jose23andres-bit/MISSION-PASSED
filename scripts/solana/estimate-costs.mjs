import { CLUSTERS, assertSafeCluster, parseArgs, rpcCall } from './config.mjs';

const args = parseArgs(process.argv.slice(2));
const cluster = String(args.cluster || 'devnet');
assertSafeCluster(cluster, false);
const rpcUrl = process.env.SOLANA_RPC_URL || CLUSTERS[cluster];

try {
  const [mintRent, tokenAccountRent, feeResult] = await Promise.all([
    rpcCall(rpcUrl, 'getMinimumBalanceForRentExemption', [82]),
    rpcCall(rpcUrl, 'getMinimumBalanceForRentExemption', [165]),
    rpcCall(rpcUrl, 'getFees').catch(() => null),
  ]);
  const lamportsPerSignature = feeResult?.value?.feeCalculator?.lamportsPerSignature ?? null;
  const estimatedSignatures = 5;
  const txFees = lamportsPerSignature === null ? null : lamportsPerSignature * estimatedSignatures;
  const knownLamports = mintRent + tokenAccountRent + (txFees || 0);
  console.log(JSON.stringify({
    cluster,
    rpcUrl,
    estimates: {
      mintRentLamports: mintRent,
      tokenAccountRentLamports: tokenAccountRent,
      transactionFeesLamports: txFees,
      knownMinimumLamports: knownLamports,
      knownMinimumSol: knownLamports / 1_000_000_000,
    },
    excluded: ['Metaplex metadata transaction/rent', 'metadata hosting', 'liquidity capital', 'DEX fees', 'priority fees'],
    warning: 'Estimate from the live RPC, not a quote. Re-run immediately before any approved transaction.',
  }, null, 2));
} catch (error) {
  console.error(`No se pudo consultar el RPC ${rpcUrl}: ${error.message}`);
  process.exit(1);
}
