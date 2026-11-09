# MISSION PASSED

Web cinematográfica y herramientas para lanzar MISSION PASSED (MP) mediante Metaplex Genesis en Solana.

## Distribución final

- 16% disponible para el creador al lanzamiento (estimación de remanente Genesis).
- 4% del creador con vesting de 12 meses y cliff de 3 meses.
- 53,33% para compradores del Launch Pool.
- 26,67% estimado para liquidez Raydium.
- No hay asignaciones adicionales.

Wallet pública del creador: `4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj`. Saldo comunicado: 0,11 SOL. Ninguna autoridad se revoca automáticamente.

## Estado

| Parte | Estado |
|---|---|
| Web, portal GTA VI, buscador y cuenta atrás | Terminada |
| Wallet, transparencia y Launch Pool | Terminados |
| Configuración Genesis | Válida; pendiente de confirmar reparto exacto en Devnet |
| Token | No creado |
| Mainnet | Bloqueada hasta prueba y autorización separada |

## Comandos

```bash
cp .env.example .env
npm run dev
npm test
npm run build
npm run genesis:plan
npm run launch:readiness
```

Para el ensayo: GitHub → Actions → **Devnet rehearsal** → escribe `DEVNET`. Sigue `docs/quick-create-with-phantom.md`.

## Estructura

- `index.html`, `portal/`, `presale/`, `transparency/`, `admin/`: web.
- `scripts/genesis/`: validador y ejecutor Devnet.
- `launch.plan.json`: fuente única del reparto.
- `test/`: pruebas de web, distribución y seguridad.
- `docs/preview/`: capturas de escritorio y móvil.

Proyecto experimental. Sin afiliación con Rockstar Games.
