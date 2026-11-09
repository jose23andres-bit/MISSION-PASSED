# Integración con Metaplex Genesis

- Configuración: `launch.plan.json` (fuente única).
- Construcción y validación del input: `scripts/genesis/launch-input.mjs`.
- Ejecución solo en Devnet: `scripts/genesis/create-launch.mjs`.
- Pruebas: `test/genesis.test.mjs`.

Versiones: programa `GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B`, SDK `@metaplex-foundation/genesis@0.43.4`, Umi `1.6.0`.

Reglas aplicadas según la documentación del API Client de Genesis:

- Suministro fijo de 1.000.000.000.
- Solo `launchType: 'launchpool'`; depósitos durante 48 h.
- `raiseGoal` de al menos 250 SOL.
- `raydiumLiquidityBps` entre 2000 y 10000.
- Vesting mediante `claimScheduleAllocations`; la parte del cliff debe ser mayor que 0.
- Los tokens no asignados van a la wallet creadora sin vesting.

No se copia código del kit de vesting de Metaplex (no tiene licencia). Solo se usa el SDK publicado con licencia Apache-2.0.
