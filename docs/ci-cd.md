# Pipeline CI/CD de MISSION PASSED

Workflow: `.github/workflows/ci-cd.yml`. Se ejecuta en cada push, pull request y manualmente.

## Etapas

| # | Etapa | Qué hace | Bloquea |
|---|---|---|---|
| 1 | Dependencias | `npm ci` con el lockfile y caché | sí |
| 2 | Lint | `scripts/ci/lint.mjs`: sintaxis JS, JSON, HTML (ids duplicados, etiquetas sin cerrar, HTTP mixto, marcadores de merge) | sí |
| 3 | Pruebas | `npm test` + informe JUnit → anotaciones en el diff y resumen con el detalle de cada fallo | sí |
| 4 | Seguridad | Escáner de secretos (árbol + historial git + `dist/`), guarda blockchain, `npm audit` (high/critical) | sí |
| 5 | Build | `npm run build` con la configuración del entorno + `dist/version.json` | sí |
| 6 | Rutas Pages | `check-pages-paths.mjs`: todo enlace respeta `/MISSION-PASSED/` y existe; sin rutas absolutas en JS/CSS | sí |
| – | Verificación previa | Servidor local que imita Pages (subruta, sensible a mayúsculas) y comprueba páginas, recursos y red | sí |
| 7 | Despliegue | Solo `push` a `main` y solo si la puerta `✅ Todas las comprobaciones` está en verde | – |
| 8 | Verificación posterior | Pide el sitio real: páginas 200, recursos 200, red esperada y `version.json` = commit desplegado (hasta 5 min de reintentos por la CDN) | abre incidencia |
| – | Restauración | Si la verificación posterior falla, vuelve a publicar el `site-production` de la última ejecución verde | – |

Los jobs `deploy`, `verify` y `rollback` dependen de `gate`, que exige `success` en todas las etapas anteriores. Un fallo en cualquiera deja `main` sin publicar.

## Entornos

Valores públicos en `config/environments/{development,devnet,production}.env` (solo `VITE_*` y `SITE_BASE_PATH`).

| Entorno | Rama | Red | Resultado |
|---|---|---|---|
| `development` | cualquier rama / PR | devnet | Vista previa (artefacto `site-development`), no se publica |
| `devnet` | `devnet` | devnet | Vista previa + comprobación RPC de solo lectura (salud y genesis hash) |
| `production` | `main` | devnet hasta autorización explícita | GitHub Pages (el entorno de GitHub se llama `github-pages`) |

Crea en *Settings → Environments* los entornos `development` y `devnet`. Para `github-pages`, restringe las ramas de despliegue a `main`.

## Lo que el pipeline NUNCA hace

- Desplegar contratos ni operar en Solana Mainnet.
- Crear tokens, firmar transacciones o mover fondos.
- Usar secretos: el workflow solo usa `GITHUB_TOKEN` con permisos mínimos y no hay claves en el repositorio.

`scripts/ci/safety-guard.mjs` lo hace cumplir: falla el build si un workflow menciona Mainnet, `solana transfer/program deploy`, `spl-token`, variables de clave privada, secretos distintos de `GITHUB_TOKEN`, `--execute` o scripts Genesis fuera del ensayo manual, o si `launch.plan.json` trae `mainnetAuthorized: true`.

El ensayo `devnet-rehearsal.yml` sigue siendo manual (`workflow_dispatch`), exige escribir `DEVNET`, usa un firmante temporal y solo Devnet.

## Cuando falla algo

- **Prueba fallida:** anotación roja en el archivo + sección «Pruebas automatizadas» del resumen con el error. Reproduce con `npm ci && npm test`.
- **Secreto detectado:** el valor nunca se imprime completo. Revócalo y rota la clave; borrarlo del código no basta si está en el historial.
- **Ruta rota en Pages:** el informe indica archivo, línea y la ruta exacta.

## Local

```bash
npm run ci          # lint + seguridad + pruebas + rutas Pages
npm run lint
npm run security
```

## Ajustes manuales pendientes en GitHub

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Branches → proteger `main`: exigir el check **✅ Todas las comprobaciones** y PR antes de fusionar.
3. Settings → Environments: crear `development` y `devnet`.
