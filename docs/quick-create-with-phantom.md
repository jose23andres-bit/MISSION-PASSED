# Lanzar MISSION PASSED: pasos concretos

Toda la configuración vive en `launch.plan.json`. Tu Phantom solo aparece como **dirección pública**. Nunca compartas la seed ni la clave privada.

## 1. Configuración (hecho)

`launch.plan.json` ya está completo y validado: wallets, logo, distribución y vesting. Compruébalo con `npm run genesis:plan`; debe terminar con "Dry run correcto".

## 2. Repositorio y web

1. Repositorio: https://github.com/jose23andres-bit/MISSION-PASSED
2. El proyecto se publica en la rama `main`. El logo queda entonces en `https://raw.githubusercontent.com/jose23andres-bit/MISSION-PASSED/main/public/token-logo.png`, que es la URL configurada.
3. Importa el repositorio en Netlify o Vercel; la configuración de build ya está incluida.

El ejecutor Devnet comprueba que el logo responde antes de enviar nada.

## 3. Ensayo en Devnet desde GitHub (sin instalar nada)

1. Fusiona el PR en `main`.
2. En GitHub abre **Actions → Devnet rehearsal → Run workflow**.
3. Escribe `DEVNET` en la confirmación y deja `15` minutos.
4. Pulsa **Run workflow**.

El workflow hace lo siguiente:

- pasa las pruebas y el dry run;
- crea una wallet Devnet temporal dentro de GitHub y le pide SOL de prueba al faucet;
- crea y registra el Launch Pool en Devnet;
- comprueba en cadena que hay 1.000.000.000 MP, que la cuenta Genesis pertenece al programa y que ni la wallet temporal ni la tuya tienen tokens sin vesting;
- borra la wallet temporal.

El resultado queda como artefacto del run (`genesis-devnet.json` y `genesis-devnet-verify.json`) con el enlace a Solscan. Devnet no usa dinero real. Si el faucet está saturado, vuelve a lanzarlo más tarde.

### Alternativa en tu ordenador

```bash
npm install
node scripts/genesis/ephemeral-keypair.mjs ~/mp-devnet.json
node scripts/genesis/airdrop.mjs <DIRECCIÓN_QUE_IMPRIME> 2
export GENESIS_DEVNET_KEYPAIR_PATH=~/mp-devnet.json MP_DEVNET_CONFIRMED=DEVNET
npm run genesis:devnet -- --execute --start-in-minutes 15
node scripts/genesis/verify-launch.mjs
```

## 4. Mainnet

El repositorio no firma en Mainnet. Con el ensayo correcto, el mismo `launch.plan.json` se usa en el [launchpad de Genesis](https://genesis.metaplex.com/) o con el SDK conectado a Phantom. Revisa cada transacción en Phantom antes de firmar.

Después copia `mintAddress`, `genesisAccount` y el enlace del lanzamiento en `.env` (`VITE_TOKEN_MINT`, `VITE_GENESIS_ACCOUNT`, `VITE_LAUNCH_URL`), cambia `VITE_SOLANA_NETWORK=mainnet-beta` y vuelve a publicar la web.
