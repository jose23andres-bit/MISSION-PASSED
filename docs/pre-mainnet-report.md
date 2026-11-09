# Informe previo a Mainnet

**Estado:** NO APROBADO · ninguna transacción enviada.

| Concepto | Valor |
|---|---|
| Token | MISSION PASSED · MP |
| Programa | Metaplex Genesis `GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B` |
| SDK | `@metaplex-foundation/genesis@0.43.4` |
| Tipo de venta | Launch Pool (reparto proporcional, sin precio fijo) |
| Suministro | 1.000.000.000 MP, fijo por Genesis |
| Creator Allocation | 300.000.000 (30%) → `4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj` |
| Vesting del creador | 12 meses, mensual, cliff de 3 meses lineal, irrevocable |
| Public Presale | 250.000.000 (25%) |
| Liquidity | 25%: LP de Raydium creado por Genesis. Cantidad exacta a confirmar en Devnet |
| Community Rewards | 100.000.000 (10%) → `4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj` |
| Marketing & Development | 100.000.000 (10%) → `4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj` |
| Objetivo mínimo | 250 SOL (mínimo que exige Genesis). Si no se alcanza, reembolso |
| SOL al LP de Raydium | 50% de lo recaudado (`raydiumLiquidityBps: 5000`) |
| Receptor del resto de SOL | `4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj` (se recomienda una vault de Squads) |
| Apertura de depósitos | 11 nov 2026 11:14:36 UTC |
| Cierre de depósitos | 13 nov 2026 11:14:36 UTC (48 h) |
| Inicio de negociación | Tras el cierre y la graduación a Raydium |
| Logo | `public/token-logo.png`, publicado en raw.githubusercontent.com desde el repo `MISSION-PASSED` (rama `main`) |
| Auditoría propia | Ninguna |
| Costes | Sin estimar: el RPC está bloqueado en el entorno de build |
| Mainnet | NO AUTORIZADA |

## Calendario realista

Con la API de Genesis, "salir en 2 días" significa **abrir depósitos el 11 de noviembre**. El token se negocia después del cierre, el **13 de noviembre**. Para llegar a tiempo, el ensayo Devnet tiene que hacerse el 9 o el 10.

## Evidencia necesaria para aprobar

- `deployment/genesis-devnet.json` con mint, cuenta Genesis y firmas.
- Suministro y los tres buckets de vesting comprobados en cadena.
- Reparto real del LP y sobrante (debe ser 0) confirmados.
- Autorización escrita del conjunto exacto de transacciones Mainnet.
