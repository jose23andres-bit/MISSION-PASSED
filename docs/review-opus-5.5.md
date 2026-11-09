# Segunda revisión del código Solana (Claude Opus 5.5)

Fecha: 9 nov 2026. Alcance: `scripts/solana/*`, `scripts/genesis/*`, `scripts/build.mjs`, `scripts/dev-server.mjs`, `src/*.js`, configuración de lanzamiento. Es una revisión de un modelo de IA, **no una auditoría independiente**.

## Hallazgos y estado

| # | Severidad | Hallazgo | Estado |
|---|---|---|---|
| 1 | BLOCKER | El ensayo CLI acuñaba el 100% del suministro en una sola wallet sin vesting. Contradice el 30% público con vesting y la promesa de "sin asignaciones ocultas". | Marcado como ensayo técnico (`solana:rehearsal:devnet`). La ruta de lanzamiento pasa a Genesis. |
| 2 | BLOCKER | `spl-token mint` y `authorize` usaban `--owner`. Funciona solo como alias no documentado; los flags reales son `--mint-authority` y `--authority` (verificado en `clients/cli/src/clap_app.rs` de token-2022). | Corregido. |
| 3 | MAJOR | `findAddress` sin límites de palabra podía devolver los primeros 44 caracteres de una firma de 88. | Corregido con `\b…\b` y salida `--output json` en `create-token`. |
| 4 | MAJOR | La comprobación de suministro usaba `includes`: aceptaba 10.000.000.000 cuando se esperaba 1.000.000.000. | Comparación numérica exacta. |
| 5 | MAJOR | Ni `build` ni `dev` leían `.env`, aunque la documentación decía que sí. Las variables configuradas no llegaban a la web. | Añadido `scripts/load-env.mjs`. |
| 6 | MAJOR | La web describía una preventa de precio fijo (Presale V2), pero la API de Genesis solo crea **Launch Pools**: reparto proporcional, sin precio fijo. | Página, calculadora y documentación reescritas para Launch Pool. |
| 7 | MAJOR | Genesis entrega **sin vesting** a la wallet creadora cualquier token que no esté asignado (documentación del SDK). Si el LP de Raydium usa menos de 250 M, el sobrante llegaría desbloqueado. | El validador avisa; la verificación en Devnet es obligatoria antes de Mainnet. |
| 8 | MAJOR | El cliff con 0% de liberación no es válido en Launch Pool: Genesis exige que la parte del cliff sea mayor que 0. | Cliff `linear` (25% a los 3 meses en un vesting de 12). |
| 9 | MINOR | Un enlace de compra configurable podía apuntar a cualquier dominio. | Solo se publica si es `https://*.metaplex.com`. |
| 10 | MINOR | El servidor de desarrollo no servía `public/` ni los JS del portal. | Corregido. |
| 11 | MINOR | `getFees` está obsoleto; la estimación de comisiones devuelve `null`. | Aceptado: se informa como "no disponible", no se inventa. |

## Controles verificados

- El ejecutor Genesis se niega a correr fuera de `solana-devnet` y comprueba el genesis hash del RPC (`EtWTRABZ…krZBG`) antes de firmar.
- Requiere `network.devnetApproved = true` y un keypair Devnet desechable; nunca lee la seed de Phantom.
- Escribe `deployment/genesis-devnet.json` con `flag: 'wx'`: no sobrescribe un despliegue anterior.
- La política 30/25/25/10/10 se valida en código; una asignación extra o un destinatario distinto del publicado bloquean el lanzamiento.
- Las cuentas de vesting no pueden ser cancelables, transferibles ni pausables.

## Sin verificar

- El SDK `@metaplex-foundation/genesis@0.43.4` no se pudo instalar aquí (npm bloqueado). `create-launch.mjs` sigue la API documentada, pero su ejecución real es lo primero a comprobar en Devnet.
- La cantidad exacta de MP que Genesis destina al LP de Raydium.
- La auditoría del programa Genesis: Metaplex la menciona, pero no hay un informe público con versión y alcance.
