# MISSION PASSED: decisiones del token

**Estado:** configurado y validado en `launch.plan.json`. Pendiente solo del ensayo en Devnet.

## Distribución

| Destino | % | MP | Mecanismo Genesis |
|---|---:|---:|---|
| Creator Allocation | 30% | 300.000.000 | Vesting `ClaimScheduleBucketV2` → `4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj` |
| Public Presale | 25% | 250.000.000 | Launch Pool (`tokenAllocation`) |
| Liquidity | 25% | 250.000.000 | LP de Raydium creado al cerrar la venta |
| Community Rewards | 10% | 100.000.000 | Vesting → misma wallet pública |
| Marketing & Development | 10% | 100.000.000 | Vesting → misma wallet pública |

El suministro de 1.000.000.000 lo fija Genesis. No hay asignaciones ocultas: el validador rechaza cualquier bucket adicional.

## Venta (Launch Pool)

- Depósitos en SOL durante 48 horas desde el 11 nov 2026 11:14:36 UTC.
- Sin precio fijo: cada comprador recibe tokens en proporción a su depósito. Precio final = SOL recaudado ÷ 250.000.000.
- Objetivo mínimo: 250 SOL, el mínimo que admite Genesis. Si no se alcanza, los depósitos se reembolsan.
- 50% de los SOL recaudados va al LP de Raydium (`raydiumLiquidityBps: 5000`); el resto a la wallet receptora.
- Sin límite superior (`softCap` vacío). Si se define, lo depositado por encima se devuelve a prorrata.

La API de Genesis no admite límite por wallet ni precio fijo. Si los necesitas, hay que usar Presale V2 a bajo nivel, que exige más desarrollo y pruebas.

## Vesting

| Bucket | Inicio | Duración | Cliff | Liberación |
|---|---|---|---|---|
| Creator | 13 nov 2026 | 12 meses | 3 meses, lineal (25%) | Mensual |
| Community | 13 nov 2026 | 12 meses | 1 mes, lineal | Mensual |
| Marketing & Development | 13 nov 2026 | 12 meses | 1 mes, lineal | Mensual |

Todos son no cancelables, no transferibles y no pausables. Genesis no permite un cliff que libere 0 tokens.

## Cambios posibles antes de Devnet

Todo está en `launch.plan.json`. Las tres asignaciones con vesting van hoy a `4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj`. Si quieres wallets separadas para Community o Marketing, cambia su `recipient` y ejecuta `npm run genesis:plan`.
