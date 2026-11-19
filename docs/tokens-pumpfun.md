# Tokens de personajes en Pump.fun

Un token por perro de la crew GTADOGE ($GTADOGE, $GTASHIBA, $BULLY, $PROF, $HACKER, $DJPAWS, $JEFE) y por personaje ($CONDUCTOR, $JEFA, $SOCIO, $RICO). El kit está en `tokens/characters.json` y los logos en `public/tokens/*.png` (1000×1000).

## Por qué Pump.fun
- **Más barato:** crear el token no cuesta nada. Solo pagas la comisión de red de Solana, una fracción de céntimo. Si haces una compra inicial al crearlo, la red cobra unos 0,025 SOL.
- **Más público:** en los 30 días hasta el 13 de noviembre de 2026, Pump.fun cobró 48,6 M$ en comisiones, casi 13 veces más que el siguiente launchpad ([solanaguides.com](https://solanaguides.com/best-memecoin-launchpads-on-solana-2026-pump-fun-vs-letsbonk-vs-raydium-launchlab)).
- **Ingresos para ti:** de cada compraventa en la curva, el 0,30 % va al creador ([imintify.com](https://imintify.com/education/pump-fun-vs-your-own-token)).

Las comisiones cambian a menudo. Comprueba las de [pump.fun](https://pump.fun) el mismo día del lanzamiento.

## Cómo lanzar cada token (unos 2 minutos cada uno)
1. Abre [pump.fun](https://pump.fun) en el navegador de Phantom, en el móvil o con la extensión, y conecta tu wallet.
2. Pulsa **Create coin**.
3. Rellena los campos con los datos de `tokens/characters.json`:
   - **Name:** `name` (por ejemplo, `El Conductor`).
   - **Ticker:** `symbol` (por ejemplo, `CONDUCTOR`).
   - **Description:** `description`.
   - **Image:** `public/tokens/<slug>.png`.
   - **Website:** `https://jose23andres-bit.github.io/MISSION-PASSED/`
   - **X / Telegram:** tus cuentas, si existen.
4. Decide si haces una compra inicial. Es opcional y sale de tu dinero.
5. Revisa los datos en Phantom y firma.
6. Copia la dirección del token (mint) y pégala en `"mint"` dentro de `tokens/characters.json`.
7. Haz commit en `main`. El pipeline publica la web y el botón **Comprar en Pump.fun** aparece solo para ese personaje.

## Antes de lanzar, ten en cuenta
- **Cuatro tokens reparten la atención y el dinero entre cuatro.** Es más fácil que uno despegue que cuatro a la vez. Si quieres probar, lanza primero uno (por ejemplo $RICO), mide la respuesta durante unos días y luego saca los demás.
- **Choca con $MP.** En Pump.fun el suministro es fijo (1.000 millones) y se reparte entero en la curva: no se puede reservar el 20 % del fondo de sorteos ni respetar los tramos de la preventa. Si $MP también va a Pump.fun, hay que reescribir la tokenomics, la preventa y la página de transparencia. Si $MP sigue con su preventa propia, los tokens de personaje son un producto aparte y la web debe decirlo así.
- **Sin promesas.** No prometas subidas, utilidad ni premios ligados a estos tokens. Las descripciones del kit ya lo dicen.
- **Nombres:** estos tickers pueden existir ya en Pump.fun. Por eso la web solo enlaza el mint que tú pegues, y avisa de desconfiar de los demás.
- **Seguridad:** usa una wallet solo para lanzar, con lo justo para comisiones. Nunca compartas tu frase semilla. El pipeline de este repositorio no crea tokens ni firma nada: el lanzamiento lo haces tú.
- **Normativa:** según tu país, lanzar y promocionar tokens puede estar regulado (en la UE, el reglamento MiCA). Consúltalo con un asesor si vas a hacer promoción de pago.

## Regenerar los logos
```bash
python3 scripts/generate-token-logos.py   # SVG en public/tokens/
```
Los PNG se generaron desde esos SVG con un navegador sin interfaz. Si cambias un personaje, vuelve a exportar su PNG a 1000×1000.
