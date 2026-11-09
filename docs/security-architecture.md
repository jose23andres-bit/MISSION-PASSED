# Arquitectura de seguridad

## Límites de confianza

- La web nunca recibe seed phrases, claves privadas ni keypairs JSON.
- Todo valor `VITE_*` es público.
- Phantom conserva el control de las firmas Mainnet.
- La interfaz no determina saldos, reparto ni precio; esos datos se leen de Genesis y Solana.

## Ruta Genesis

- Suministro fijo: 1.000.000.000 MP.
- Compradores: 533.333.333 MP mediante Launch Pool proporcional de 48 horas.
- Liquidez Raydium estimada: 266.666.667 MP y 50% del SOL recaudado.
- Creador disponible estimado: 160.000.000 MP (16%), remanente calculado por Genesis.
- Creador con vesting: 40.000.000 MP (4%), 12 meses, cliff lineal de 3 meses.
- Un único bucket de vesting; el validador rechaza cualquier asignación adicional.
- Receptor público: `4hqDqmWYnN1N2VJHfCanh5AAFJMBeZGUV31F4pTxcXnj`.

Genesis documenta el cálculo del creador como remanente tras Launch Pool, Raydium y vestings, pero no publica su fórmula de redondeo del LP. Devnet debe confirmar que el creador recibe más de 15% y como máximo 16%, y que su total es exactamente 20%.

## Controles

- Ejecutable únicamente en Devnet; valida el genesis hash del RPC.
- Mainnet bloqueada en el repositorio.
- Sin revocación automática de mint, freeze o metadata.
- La dirección configurable del lanzamiento solo se publica si pertenece a `metaplex.com` por HTTPS.
- Un resultado Devnet no puede sobrescribirse accidentalmente.
- El workflow usa una wallet temporal y la borra al terminar.

## Pruebas necesarias antes de Mainnet

- Decodificar las asignaciones creadas por Genesis y verificar 16/4/53,33/26,67.
- Comprobar suministro total, vesting y ausencia de buckets ocultos.
- Probar depósitos proporcionales y reembolso si no se alcanza el objetivo.
- Simular el coste exacto contra los 0,11 SOL comunicados.
- Revisar por separado cualquier revocación de autoridad.

MISSION PASSED no tiene auditoría externa. Esta documentación y las pruebas automatizadas no equivalen a una auditoría independiente.
