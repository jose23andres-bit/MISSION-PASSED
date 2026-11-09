# Security architecture

## Trust boundaries

- The public site never receives seeds, private keys or keypair JSON.
- Public `VITE_*` values are assumed readable by everyone.
- Phantom/Solflare retain signing control. The app must display transactions before signature.
- Solana RPC and indexers are untrusted views; important state is re-read from on-chain accounts.
- The frontend cannot be the source of balances, caps, price or purchase history.

## Genesis path

On-chain components created by the Genesis API client (`createLaunch`):

- `GenesisAccountV2` for the token launch (fixed 1B supply).
- Launch Pool bucket for the public 25% (48 h deposit window, proportional allocation, refund if the raise goal is missed).
- Raydium LP bucket funded with `raydiumLiquidityBps` of the raised SOL.
- Three `ClaimScheduleBucketV2` locks: Creator 30%, Community 10%, Marketing & Development 10%, all non-cancelable, non-transferable, non-pausable.
- Any unassigned remainder goes to the creator wallet **without vesting**; it must be confirmed as 0 on Devnet.
- Squads vault recommended as `fundsRecipient` before Mainnet.

Program ID reviewed: `GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B`.

## Devnet acceptance tests

- Exact allocation sum and mint supply.
- Deposits from several wallets; proportional claim matches deposit share.
- Raise goal missed: refund works and a second refund fails.
- Raise goal met: claim works and a second claim fails.
- Claim forbidden after failure; refund forbidden after success.
- LP token amount and unassigned remainder read from chain.
- Creator vesting before cliff, at cliff, each period and after completion.
- Wallet on wrong cluster, rejected signature, stale blockhash and RPC failure.
- On-chain totals compared with every public dashboard number.

## Operational controls

- Separate Devnet and Mainnet wallets.
- Squads members on separate devices; documented threshold and timelock.
- Mainnet creation not automated by the repository.
- Mint and freeze authority revocation only after supply, allocations and metadata are verified.
- No administrative action may block user claim/refund exits.
- No private metrics in the static admin bundle. A server-authenticated service is required for genuinely private data.

## Independent review

No MISSION PASSED code or configuration has been externally audited. Before Mainnet, publish the exact program/SDK versions, account addresses, transaction signatures, test evidence and any independent review report.
