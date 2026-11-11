---
inclusion: always
---
# MISSION PASSED · dirección de diseño y reglas para la IA

Seleccionado de estos repositorios de GitHub y adaptado al proyecto:
- [anthropics/claude-code · frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design): elegir una estética concreta antes de programar y no caer en plantillas genéricas.
- [bencium/bencium-claude-code-design-skill · MOTION-SPEC](https://github.com/bencium/bencium-claude-code-design-skill): duraciones y curvas de movimiento, más accesibilidad.
- [wilwaldon/Claude-Code-Frontend-Design-Toolkit](https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit): la estética «Retro-Futurism/Cyberpunk» (neón sobre oscuro) y comprobar el resultado en un navegador real.

## Estética
- Retro-futurista neón de costa: rosa `#ff2d9b`, violeta `#8b2cff`, cian `#3ff0ff`, oro `#ffd36e` sobre noche `#0d0414`.
- Tipografía: Knewave (titulares de pincel), Anton (carteles), Bebas Neue (cifras), Kanit (texto).
- Ambiente de videojuego de acción urbana: estrellas de búsqueda, banner «Mission passed / Respect +», tarjeta de embarque, cortes de imagen, glitch RGB y escaneo VHS. Todo vive en `src/fx.js` y `src/fx.css`.

## Movimiento
- Animar solo `transform`, `opacity`, `clip-path` y `filter`. Nunca propiedades de maquetación.
- Duraciones: hover 150 ms, tarjetas 300 ms, entradas de sección 500-900 ms, curva `cubic-bezier(.2,.8,.2,1)`.
- Disparar con `IntersectionObserver`, no con eventos de scroll pesados.
- Con `prefers-reduced-motion: reduce`, quitar glitch, cortes, escaneo y banner. Las imágenes nunca pueden quedar ocultas si el JavaScript falla: ocultar solo bajo `.fx-on`.

## Reglas que no se rompen
- Sin marcas de terceros en la portada: Rockstar, Grand Theft Auto, GTA VI, Vice City, Leonida ni sus personajes (hay una prueba que lo exige). Inspiración temática sí; copiar no.
- Fotos y vídeos: solo del propietario o con licencia libre, con crédito visible (ver `public/prize/README.md`).
- Premios y sorteos: siempre en lenguaje condicional («previsto», «sujeto a bases publicadas y fondo verificable»).
- Blockchain: el pipeline nunca despliega en Mainnet, crea tokens, firma ni mueve fondos (`scripts/ci/safety-guard.mjs`).
- Antes de publicar: `npm run ci` en verde y revisión visual en navegador real, en escritorio y en móvil.
