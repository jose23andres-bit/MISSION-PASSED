# Preventa $MP

Página: `/presale/`. Pago con Phantom, MetaMask (Solana), Solflare o Backpack en SOL, USDC o USDT, siempre en la red Solana. Cada comprador firma en su propia wallet.

## Tramos (precio en USD por MP)

| Recaudado | Precio |
|---|---|
| 0 – 100 SOL | $0.0004 |
| 100 – 200 SOL | $0.001 |
| 200 SOL en adelante | $0.005 |

Se cambian en `VITE_PRESALE_TIERS` (`desdeSOL:precio,...`). Si un pago cruza un tramo, se reparte entre los dos. USDC y USDT cuentan como SOL al precio de Pyth del momento. No hay mínimo para lanzar.

## Activar la preventa (pasos manuales)

La web sale con el botón de pago **desactivado** hasta que hagas esto:

1. Crea una wallet nueva solo para la preventa (mejor una multifirma de Squads). No uses la del fondo de sorteos.
2. En `config/environments/production.env`:
   - `VITE_PRESALE_WALLET=<dirección pública>`
   - `VITE_SOLANA_NETWORK=mainnet-beta` y `VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com` (o un RPC propio sin clave en la URL).
3. Recibe 1 USDC y 1 USDT en esa wallet una vez, para que existan sus cuentas de token. Si no, el primer comprador paga ~0,002 SOL de alquiler de la cuenta.
4. Commit en `main`: el pipeline verifica y publica.

Lo recaudado se calcula con el saldo de esa wallet. **No muevas fondos de ella hasta el reparto**, o el contador y el tramo bajarían.

## Reparto del 15 de noviembre

```bash
node scripts/presale/ledger.mjs --env production
```

Solo lee la blockchain. Genera `deployment/presale-ledger.json` (cada pago, tramo y MP) y `deployment/presale-owed.csv` (MP por comprador). Con ese CSV envías los MP desde tu wallet; el pipeline no firma ni envía nada.

## Voz de Rico (ElevenLabs)

```bash
ELEVENLABS_API_KEY=... node scripts/generate-voice.mjs --list     # voces masculinas de tu cuenta
ELEVENLABS_API_KEY=... node scripts/generate-voice.mjs --voice <id>
```

Escribe `public/voice/*.mp3` y marca cada línea en `public/voice/script.json`. Sin esos MP3 la web usa la voz del navegador. El texto de Rico está en el mismo `script.json`.
