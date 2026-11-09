// Builds and validates the Metaplex Genesis CreateLaunchInput for MISSION PASSED.
// Rules mirror the Genesis API client documentation (SDK 0.43.x):
// fixed 1B supply, launchpool only, raise goal >= 250 SOL, Raydium bps 2000-10000.

export const TOTAL_SUPPLY = 1_000_000_000;
export const MIN_RAISE_GOAL_SOL = 250;
export const DEPOSIT_WINDOW_HOURS = 48;
export const DEVNET_GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const TIME_UNITS = ['SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'TWO_WEEKS', 'MONTH', 'QUARTER', 'YEAR'];

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
  const presale = Number(lp.tokenAllocation) || 0;
  const unallocated = TOTAL_SUPPLY - presale - locked;
  if (unallocated < 0) errors.push(`asignaciones exceden el suministro fijo de ${TOTAL_SUPPLY}`);
  if (unallocated > 0) warnings.push(`${unallocated} MP quedan para el LP de Raydium; Genesis entrega cualquier sobrante SIN vesting a la wallet creadora. Verificar el reparto real en Devnet antes de Mainnet.`);

  return { errors, warnings, summary: { totalSupply: TOTAL_SUPPLY, presaleTokens: presale, lockedTokens: locked, unallocatedTokens: unallocated } };
}

// MISSION PASSED policy: 30 / 25 / 25 / 10 / 10, creator lock goes to the published creator wallet.
export function checkDistributionPolicy(plan) {
  const errors = [];
  const g = plan.genesis;
  const byName = Object.fromEntries(g.claimScheduleAllocations.map((a) => [a.name, a]));
  const expect = (cond, msg) => { if (!cond) errors.push(msg); };
  expect(g.launchpool.tokenAllocation === TOTAL_SUPPLY * 0.25, 'Public Presale debe ser 250.000.000 (25%)');
  expect(byName['Creator Allocation']?.tokenAmount === TOTAL_SUPPLY * 0.30, 'Creator Allocation debe ser 300.000.000 (30%)');
  expect(byName['Creator Allocation']?.recipient === plan.creatorPublicWallet, 'Creator Allocation debe ir a la wallet pública publicada');
  expect(byName['Community Rewards']?.tokenAmount === TOTAL_SUPPLY * 0.10, 'Community Rewards debe ser 100.000.000 (10%)');
  expect(byName['Marketing & Development']?.tokenAmount === TOTAL_SUPPLY * 0.10, 'Marketing & Development debe ser 100.000.000 (10%)');
  expect(g.claimScheduleAllocations.length === 3, 'No se permiten asignaciones adicionales');
  return errors;
}

export function assertDevnetNetwork(network) {
  if (network !== 'solana-devnet') throw new Error(`Red ${network} bloqueada: este script solo ejecuta en solana-devnet.`);
}
