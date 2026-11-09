# Buzzy asset brief — MISSION PASSED

**Estado:** preparado, no generado. El Power de Buzzy no está disponible en esta sesión.

No generar activos hasta que se aprueben el brief y cualquier consumo de créditos mostrado por Buzzy.

## Dirección visual

- Original, urbana y cinematográfica, sin logotipos, personajes, vehículos, tipografías, mapas, música ni elementos reconocibles de franquicias existentes.
- Noche húmeda, grafito y negro; acentos chartreuse `#D8FF3E`, cian `#56D7D7` y naranja `#FF7148`.
- Arquitectura contemporánea ficticia, señalética abstracta, ninguna marca real.
- Grano contenido, contraste alto, lente anamórfica moderada.
- Continuidad de clima, iluminación y vehículos entre planos.

## Activos solicitados

### Hero loop

- 8 segundos, 1920×1080 y 1080×1350.
- Cámara baja avanzando por una avenida nocturna ficticia.
- Sedán deportivo original visto desde atrás, sin emblemas.
- Reflejos chartreuse y cian sobre asfalto mojado.
- Bucle limpio, sin audio, movimiento suave y área oscura a la izquierda para texto.

### Story still

- 2400×1600.
- Distrito financiero ficticio, composición vertical marcada, luna difusa.
- Sin personas identificables ni texto generado.

### Token mark exploration

- Símbolo geométrico basado en dos trazos convergentes y una línea de finalización.
- Fondo transparente, lectura clara a 32 px.
- No usar estrellas, escudos, letras o composiciones parecidas a marcas conocidas.

### Roadmap backgrounds

- Cuatro imágenes 1600×900 del mismo mundo: acceso industrial, puerto de datos, torres administrativas y avenida central.
- Misma hora, clima y tratamiento de color.

## Entrega técnica

- Imagen: AVIF/WebP más PNG maestro.
- Vídeo: MP4 H.264 y WebM, sin audio, máximo recomendado 4 MB para el loop.
- Poster frame para cada vídeo.
- Variantes móvil y escritorio.
- Conservar prompts, seed y parámetros devueltos por Buzzy para reproducibilidad.

## Integración

La web actual usa una ciudad original en CSS/SVG, por lo que funciona sin Buzzy. Los activos aprobados deben añadirse de forma progresiva con `poster`, `preload="metadata"`, carga diferida y una alternativa estática para `prefers-reduced-motion`. No se debe reemplazar funcionalidad con vídeo.
