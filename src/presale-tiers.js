// Tiered presale pricing, shared by the browser (window.MPPresaleTiers) and Node (scripts/presale/ledger.mjs, tests).
// Tiers are measured in SOL raised. Price is in USD per MP. A payment that crosses a tier boundary is split:
// the part below the boundary is priced at the lower tier, the rest at the next one.
(() => {
  const DEFAULT = '0:0.0004,100:0.001,200:0.005';

  function parse(text = DEFAULT) {
    const tiers = String(text || DEFAULT).split(',').map((part) => {
      const [from, price] = part.split(':').map((value) => Number(value.trim()));
      return { fromSol: from, priceUsd: price };
    });
    return normalize(tiers);
  }

  function normalize(tiers) {
    if (!Array.isArray(tiers) || tiers.length === 0) throw new Error('Sin tramos de precio');
    const sorted = [...tiers].map((tier) => ({ fromSol: Number(tier.fromSol), priceUsd: Number(tier.priceUsd) })).sort((a, b) => a.fromSol - b.fromSol);
    if (sorted[0].fromSol !== 0) throw new Error('El primer tramo debe empezar en 0 SOL');
    sorted.forEach((tier, index) => {
      if (!Number.isFinite(tier.fromSol) || tier.fromSol < 0) throw new Error(`Tramo ${index + 1}: inicio inválido`);
      if (!Number.isFinite(tier.priceUsd) || tier.priceUsd <= 0) throw new Error(`Tramo ${index + 1}: precio inválido`);
      if (index > 0 && tier.fromSol <= sorted[index - 1].fromSol) throw new Error(`Tramo ${index + 1}: inicio repetido`);
      if (index > 0 && tier.priceUsd < sorted[index - 1].priceUsd) throw new Error(`Tramo ${index + 1}: el precio no puede bajar`);
    });
    return Object.freeze(sorted.map(Object.freeze));
  }

  function tierAt(raisedSol, tiers) {
    let index = 0;
    for (let i = 0; i < tiers.length; i += 1) if (raisedSol >= tiers[i].fromSol) index = i;
    return index;
  }

  // Returns how many MP a payment buys given what was raised before it.
  function quote({ raisedSol, paymentSol, solUsd, tiers }) {
    if (!(paymentSol > 0)) throw new Error('Importe inválido');
    if (!(solUsd > 0)) throw new Error('Precio de SOL no disponible');
    let cursor = Math.max(0, Number(raisedSol) || 0);
    let remaining = paymentSol;
    let mp = 0;
    const segments = [];
    for (let index = tierAt(cursor, tiers); remaining > 1e-12; index += 1) {
      const tier = tiers[index];
      const ceiling = index + 1 < tiers.length ? tiers[index + 1].fromSol : Infinity;
      const sol = Math.min(remaining, ceiling - cursor);
      const tokens = (sol * solUsd) / tier.priceUsd;
      segments.push({ tier: index + 1, sol, priceUsd: tier.priceUsd, mp: tokens });
      mp += tokens;
      cursor += sol;
      remaining -= sol;
    }
    return { mp, segments, usd: paymentSol * solUsd, raisedAfter: cursor, averagePriceUsd: (paymentSol * solUsd) / mp };
  }

  globalThis.MPPresaleTiers = Object.freeze({ DEFAULT, parse, normalize, tierAt, quote });
})();
