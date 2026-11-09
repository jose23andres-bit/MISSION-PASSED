# Revisión del código Solana

Fecha: 9 nov 2026. Revisión asistida por Claude Opus 5.5; no es una auditoría independiente.

## Resultado final

- Se eliminó por completo el creador SPL antiguo que podía acuñar el 100% en una wallet sin vesting.
- Metaplex Genesis es la única ruta de creación del proyecto.
- Política validada por código: 16% inmediato estimado + 4% vesting + 80% compradores/liquidez.
- Cualquier bucket adicional u oculto bloquea la ejecución.
- La wallet del 4% debe coincidir con la wallet pública del creador.
- Las cuentas de vesting no pueden ser cancelables, transferibles ni pausables.
- El ejecutor solo permite Devnet y comprueba el genesis hash del RPC.
- Mainnet no puede ejecutarse desde el repositorio.
- Ninguna autoridad se revoca automáticamente.
- Build y servidor leen `.env`; solo publican variables públicas.
- Enlaces de compra limitados a HTTPS bajo `metaplex.com`.

## Punto pendiente de Devnet

La API documenta que el creador recibe el remanente tras restar Launch Pool, Raydium y vestings, pero no publica el redondeo exacto del token destinado al LP. La configuración usa:

- Launch Pool: 533.333.333 MP.
- Raydium: 50% del SOL, estimación 266.666.667 MP.
- Vesting creador: 40.000.000 MP.
- Remanente estimado creador: 160.000.000 MP.

Devnet debe confirmar esos valores antes de construir transacciones Mainnet.
