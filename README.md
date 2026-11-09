# MISSION PASSED

Web cinematográfica, portal independiente de GTA VI y herramientas para lanzar el token MISSION PASSED (MP) en Solana con Metaplex Genesis.

## Estado

| Parte | Estado |
|---|---|
| Web, portal GTA VI, buscador, cuenta atrás | Terminado |
| Conexión de wallet (Phantom, Solflare) | Terminado; solo lectura |
| Transparencia, Launch Pool, consola de operador | Terminado; se rellenan con direcciones reales al lanzar |
| Configuración Genesis (`launch.plan.json`) | Completa y validada |
| Ejecutor Genesis Devnet | Escrito y validado sin red; pendiente de primera ejecución |
| Token en cadena | No creado |
| Mainnet | Bloqueada en código |

Revisión del código Solana: `docs/review-opus-5.5.md`. Informe previo a Mainnet: `docs/pre-mainnet-report.md`.

## Uso

```bash
cp .env.example .env
npm run dev                # http://127.0.0.1:4173
npm test                   # 19 pruebas
npm run build              # genera dist/
npm run launch:readiness   # qué falta para Devnet y Mainnet
npm run genesis:plan       # dry run del lanzamiento, sin red
```

El build y el servidor de desarrollo leen `.env`. Las variables `VITE_*` son públicas.

## Lanzamiento

Sigue `docs/quick-create-with-phantom.md`. En resumen:

1. Publica la web en Netlify o Vercel (`vercel.json` y `netlify.toml` incluidos).
2. Ensayo en Devnet: `npm install` y `npm run genesis:devnet -- --execute --start-in-minutes 15`.
3. Verifica en cadena y aprueba Mainnet, que se firma en Phantom.

## Estructura

```
index.html, portal/, presale/, transparency/, admin/   páginas
src/                    JS y CSS del navegador
scripts/genesis/        input, validación y ejecutor Genesis
scripts/solana/         ensayo técnico SPL por CLI (no es la ruta de lanzamiento)
launch.plan.json        configuración del lanzamiento
docs/                   decisiones, seguridad, revisión, informes
test/                   pruebas
```

## Riesgo

Proyecto experimental. Una memecoin puede perder todo su valor. Sin afiliación con Rockstar Games.
