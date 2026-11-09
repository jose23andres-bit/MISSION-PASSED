// Builds and validates the Metaplex Genesis CreateLaunchInput for MISSION PASSED.
// Rules mirror the Genesis API client documentation (SDK 0.43.x):
// fixed 1B supply, launchpool only, raise goal >= 250 SOL, Raydium bps 2000-10000.

export const TOTAL_SUPPLY = 1_000_000_000;
export const MIN_RAISE_GOAL_SOL = 250;
export const DEPOSIT_WINDOW_HOURS = 48;
export const DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const TIME_UNITS = ['SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'TWO_WEEKS', 'MONTH', 'QUARTER', 'YEAR'];

export const TARGET_CREATOR_IMMEDIATE = 160_000_000;
export const TARGET_CREATOR_VESTED = 40_000_000;
export const TARGET_MARKET_AND_LIQUIDITY = 800_000_000;
export const TARGET_BUYER_ALLOCATION = 533_333_333;
export const TARGET_LIQUIDITY_BPS = 5000;
export const MIN_CREATOR_IMMEDIATE = 150_000_001;

export function estimateGenesisAllocations(tokenAllocation, liquidityBps, lockedTokens) {
  // Genesis docs state creator = 1B - launchpool - Raydium LP - locked.
  // They do not publish the Raydium token rounding formula. Equal-price LP implies
  // tokenAllocation * liquidityBps / 10000; this estimate MUST be checked in Devnet.
  const estimatedRaydiumTokens = Math.round(tokenAllocation * liquidityBps / 10_000);
  const estimatedCreatorImmediate = TOTAL_SUPPLY - tokenAllocation - estimatedRaydiumTokens - lockedTokens;
  return { estimatedRaydiumTokens, estimatedCreatorImmediate };
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isPublicKey = (value) => typeof value === 'string' && BASE58.test(value);

function isHttpsUrl(value) {
  if (typeof value !== 'string' || /REPLACE_WITH/i.test(value)) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
const isDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isDuration = (d) => Boolean(d) && Number.isInteger(d.value) && d.value > 0 && TIME_UNITS.includes(d.unit);

export function buildLaunchInput(plan, { wallet, network = 'solana-devnet', depositStartTime } = {}) {
  const g = plan.genesis;
  const lp = g.launchpool;
  const shiftMs = depositStartTime ? Date.parse(depositStartTime) - Date.parse(lp.depositStartTime) : 0;
  const shift = (iso) => (shiftMs ? new Date(Date.parse(iso) + shiftMs).toISOString() : iso);

  const links = Object.fromEntries(
    Object.entries({ website: g.token.website, twitter: g.token.twitter, telegram: g.token.telegram }).filter(([, v]) => v),
  );
  const launchpool = {
    tokenAllocation: lp.tokenAllocation,
    depositStartTime: depositStartTime ?? lp.depositStartTime,
    raiseGoal: lp.raiseGoalSol,
    raydiumLiquidityBps: lp.raydiumLiquidityBps,
    fundsRecipient: lp.fundsRecipient,
  };
  if (lp.softCapSol !== null && lp.softCapSol !== undefined) launchpool.softCap = lp.softCapSol;

  return {
    wallet: wallet ?? plan.creatorPublicWallet,
    network,
    quoteMint: 'SOL',
    token: {
      name: plan.token.name,
      symbol: plan.token.symbol,
      image: g.token.image,
      description: g.token.description,
      ...(Object.keys(links).length ? { externalLinks: links } : {}),
    },
    launchType: 'launchpool',
    launch: {
      launchpool,
      claimScheduleAllocations: g.claimScheduleAllocations.map((a) => ({ ...a, vestingStartTime: shift(a.vestingStartTime) })),
    },
  };
}

export function validateLaunchInput(input, { now = Date.now() } = {}) {
  const errors = [];
  const warnings = [];
  const lp = input.launch?.launchpool ?? {};
  const allocations = input.launch?.claimScheduleAllocations ?? [];

  if (!isPublicKey(input.wallet)) errors.push('wallet: dirección pública no válida');
  if (!['solana-devnet', 'solana-mainnet'].includes(input.network)) errors.push('network: debe ser solana-devnet o solana-mainnet');
  const { name = '', symbol = '', image, description = '' } = input.token ?? {};
  if (name.length < 1 || name.length > 32) errors.push('token.name: 1-32 caracteres');
  if (symbol.length < 1 || symbol.length > 10) errors.push('token.symbol: 1-10 caracteres');
  if (!isHttpsUrl(image)) errors.push('token.image: falta URL HTTPS pública del logo (despliega la web y usa /token-logo.png)');
  if (description.length > 250) errors.push('token.description: máximo 250 caracteres');

  if (!Number.isInteger(lp.tokenAllocation) || lp.tokenAllocation <= 0) errors.push('launchpool.tokenAllocation: entero mayor que 0');
  if (!isDate(lp.depositStartTime)) errors.push('launchpool.depositStartTime: fecha ISO no válida');
  else if (Date.parse(lp.depositStartTime) <= now) errors.push('launchpool.depositStartTime: debe estar en el futuro');
  if (!(Number(lp.raiseGoal) >= MIN_RAISE_GOAL_SOL)) errors.push(`launchpool.raiseGoal: mínimo ${MIN_RAISE_GOAL_SOL} SOL según Genesis`);
  if (!Number.isInteger(lp.raydiumLiquidityBps) || lp.raydiumLiquidityBps < 2000 || lp.raydiumLiquidityBps > 10000) errors.push('launchpool.raydiumLiquidityBps: entero entre 2000 y 10000');
  if (!isPublicKey(lp.fundsRecipient)) errors.push('launchpool.fundsRecipient: dirección pública no válida');
  if (lp.softCap !== undefined && !(Number(lp.softCap) >= Number(lp.raiseGoal))) errors.push('launchpool.softCap: si se define, debe ser >= raiseGoal');

  allocations.forEach((a, i) => {
    const label = `claimScheduleAllocations[${i}] (${a.name ?? 'sin nombre'})`;
    if (!a.name || a.name.length > 64) errors.push(`${label}: name 1-64 caracteres`);
    if (!isPublicKey(a.recipient)) errors.push(`${label}: recipient no configurado`);
    if (!Number.isInteger(a.tokenAmount) || a.tokenAmount <= 0) errors.push(`${label}: tokenAmount entero mayor que 0`);
    if (!isDate(a.vestingStartTime)) errors.push(`${label}: vestingStartTime no válida`);
    if (!isDuration(a.vestingDuration)) errors.push(`${label}: vestingDuration no válida`);
    if (!TIME_UNITS.includes(a.unlockSchedule)) errors.push(`${label}: unlockSchedule no válido`);
    if (a.cliff) {
      if (!isDuration(a.cliff.duration)) errors.push(`${label}: cliff.duration no válida`);
      const u = a.cliff.unlockAmount ?? 'linear';
      if (u !== 'linear' && !(Number.isInteger(u) && u > 0 && u <= a.tokenAmount)) errors.push(`${label}: cliff.unlockAmount debe ser 'linear' o >0`);
    }
    for (const flag of ['cancelable', 'cancelableByRecipient', 'transferable', 'transferableByRecipient', 'pausable']) {
      if (a[flag] === true) errors.push(`${label}: ${flag}=true contradice el vesting público e irrevocable`);
    }
  });

  const locked = allocations.reduce((sum, a) => sum + (Number(a.tokenAmount) || 0), 0);
  const buyerAllocation = Number(lp.tokenAllocation) || 0;
  const estimate = estimateGenesisAllocations(buyerAllocation, Number(lp.raydiumLiquidityBps) || 0, locked);
  if (estimate.estimatedCreatorImmediate < 0) errors.push(`asignaciones estimadas exceden el suministro fijo de ${TOTAL_SUPPLY}`);
  warnings.push(`Estimación pendiente de Devnet: Raydium ${estimate.estimatedRaydiumTokens} MP; creador desbloqueado ${estimate.estimatedCreatorImmediate} MP. Genesis no publica la fórmula de redondeo del LP.`);

  return { errors, warnings, summary: { totalSupply: TOTAL_SUPPLY, buyerAllocationTokens: buyerAllocation, lockedCreatorTokens: locked, ...estimate, estimatedMarketAndLiquidityTokens: buyerAllocation + estimate.estimatedRaydiumTokens } };
}

// Final policy approved by the user: ~16% immediate + 4% vested creator,
// 80% combined between Launch Pool buyers and Raydium liquidity.
export function checkDistributionPolicy(plan) {
  const errors = [];
  const g = plan.genesis;
  const allocations = g.claimScheduleAllocations;
  const creator = allocations.find((a) => a.name === 'Creator Vested Allocation');
  const expect = (condition, message) => { if (!condition) errors.push(message); };
  const estimate = estimateGenesisAllocations(g.launchpool.tokenAllocation, g.launchpool.raydiumLiquidityBps, allocations.reduce((sum, a) => sum + a.tokenAmount, 0));
  expect(g.launchpool.tokenAllocation === TARGET_BUYER_ALLOCATION, `Compradores deben recibir ${TARGET_BUYER_ALLOCATION} MP`);
  expect(g.launchpool.raydiumLiquidityBps === TARGET_LIQUIDITY_BPS, 'Raydium debe recibir 50% del SOL recaudado');
  expect(creator?.tokenAmount === TARGET_CREATOR_VESTED, `Creator vesting debe ser ${TARGET_CREATOR_VESTED} MP (4%)`);
  expect(creator?.recipient === plan.creatorPublicWallet, 'Creator vesting debe ir a la wallet pública publicada');
  expect(allocations.length === 1, 'No se permiten asignaciones adicionales u ocultas');
  expect(estimate.estimatedCreatorImmediate === TARGET_CREATOR_IMMEDIATE, `La estimación del creador inmediato debe ser ${TARGET_CREATOR_IMMEDIATE} MP (16%)`);
  expect(creator?.tokenAmount + estimate.estimatedCreatorImmediate === 200_000_000, 'La asignación total estimada del creador debe ser 20%');
  expect(g.launchpool.tokenAllocation + estimate.estimatedRaydiumTokens === TARGET_MARKET_AND_LIQUIDITY, 'Compradores y liquidez deben sumar 80%');
  expect(plan.authorityPolicy?.automaticRevocation === false, 'No se revocarán autoridades automáticamente');
  return errors;
}

export function assertDevnetNetwork(network) {
  if (network !== 'solana-devnet') throw new Error(`Red ${network} bloqueada: este script solo ejecuta en solana-devnet.`);
}
