# Lanzar MISSION PASSED: pasos concretos

Toda la configuración vive en `launch.plan.json`. Tu Phantom solo aparece como **dirección pública**. Nunca compartas la seed ni la clave privada.

## 1. Configuración (hecho)

`launch.plan.json` ya está completo y validado: wallets, logo, distribución y vesting. Compruébalo con `npm run genesis:plan`; debe terminar con "Dry run correcto".

## 2. Repositorio y web

1. Repositorio: https://github.com/jose23andres-bit/MISSION-PASSED
2. El proyecto se publica en la rama `main`. El logo queda entonces en `https://raw.githubusercontent.com/jose23andres-bit/MISSION-PASSED/main/public/token-logo.png`, que es la URL configurada.
3. Importa el repositorio en Netlify o Vercel; la configuración de build ya está incluida.

El ejecutor Devnet comprueba que el logo responde antes de enviar nada.

## 3. Ensayo en Devnet (30 min)

```bash
npm install
solana-keygen new -o ~/mp-devnet.json   # wallet desechable, solo Devnet
solana airdrop 2 --keypair ~/mp-devnet.json --url devnet
export GENESIS_DEVNET_KEYPAIR_PATH=~/mp-devnet.json
```

Pon `network.devnetApproved` a `true` y ejecuta:

```bash
npm run genesis:devnet -- --execute --start-in-minutes 15
```

El script comprueba que el RPC es Devnet, crea el lanzamiento, firma con la wallet desechable y lo registra. El resultado queda en `deployment/genesis-devnet.json`.

Verifica en Solscan (`?cluster=devnet`) el suministro, los tres vestings y la cantidad que va al LP.

## 4. Mainnet

El repositorio no firma en Mainnet. Con el ensayo correcto, el mismo `launch.plan.json` se usa en el [launchpad de Genesis](https://genesis.metaplex.com/) o con el SDK conectado a Phantom. Revisa cada transacción en Phantom antes de firmar.

Después copia `mintAddress`, `genesisAccount` y el enlace del lanzamiento en `.env` (`VITE_TOKEN_MINT`, `VITE_GENESIS_ACCOUNT`, `VITE_LAUNCH_URL`), cambia `VITE_SOLANA_NETWORK=mainnet-beta` y vuelve a publicar la web.
