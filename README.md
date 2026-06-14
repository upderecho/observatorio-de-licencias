# UP-Law-AILO

[![CI](https://github.com/gubaros/observatorio-de-licencias/actions/workflows/ci.yml/badge.svg)](https://github.com/gubaros/observatorio-de-licencias/actions/workflows/ci.yml)

**Observatorio simple de licencias de proveedores de IA.**

UP-Law-AILO permite cargar manualmente el texto de una licencia, EULA, términos de
uso o política de privacidad de un proveedor de IA, parsearlo **una sola vez** con
un parser determinístico local, guardar el resultado como JSON en disco y mostrarlo
en una vista web con dos modos de lenguaje (claro / jurídico) y una matriz comparativa.

> ⚠️ **No es asesoramiento legal.** Es una herramienta de análisis preliminar,
> trazabilidad y lectura comparada. Todo resultado queda sujeto a revisión legal humana.

---

## Características

- Carga manual de documentos pegando texto.
- Parser **determinístico y local** (sin LLM, sin APIs externas).
- Persistencia en **archivos JSON en disco** (sin base de datos).
- Cada conclusión está respaldada por **evidencia textual** citada del documento.
- Lenguaje **deliberadamente prudente** (nunca "cumple / no cumple").
- Toggle global **lenguaje claro** (no abogados) / **lenguaje jurídico** (abogados).
- **Matriz comparativa** entre proveedores, productos y planes, con filtros.
- Solo se muestran datos **reales**: si hay análisis se presentan, si no, no.
- Ingesta opcional con **navegador headless** para fuentes que bloquean un GET simple.

## Stack

TypeScript · Next.js (App Router) · React 19 · Tailwind CSS v4 · Zod · Node `fs/promises` · Vitest.

Sin PostgreSQL, sin Prisma, sin Redis, sin colas, sin workers, sin cron, sin login.

---

## Instalación

```bash
npm install
```

> **Sin datos mock.** El observatorio solo muestra documentos reales ingeridos. Si
> `data/licenses` está vacío, la app lo indica y no inventa nada. Para poblarla, usá la
> ingesta de abajo.

## Ingesta de datos reales

Pipeline manual por comando (sin crawler general, sin scraping periódico):

```bash
# 1) Verificar que las URLs del registro respondan y sean de dominios oficiales.
npm run sources:verify
npm run sources:verify -- --provider openai      # solo un proveedor

# 2) Ingerir SOLO las fuentes que quedaron 'verified'.
npm run ingest:provider -- --provider anthropic
npm run ingest:all
npm run ingest:all -- --limit 20

# 2b) Reintentar fuentes BLOQUEADAS (HTTP 403/429/503) con navegador headless.
#     Requiere el navegador headless de gstack (/browse). Verifica dominio oficial.
npm run ingest:headless
npm run ingest:headless -- --provider openai

# 2c) Reintentar bloqueadas con navegador STEALTH (Playwright + anti-detección).
#     ⚠ EVASIÓN ANTI-BOT: supera Cloudflare. Úsalo solo con autorización.
npm run ingest:stealth
npm run ingest:stealth -- --provider openai

# 2d) Carga MANUAL desde un archivo local (texto/HTML guardado del navegador).
npm run ingest:manual -- --provider "OpenAI" --product "ChatGPT" --mode all \
  --doc-type "Terms of Use" --file ./openai-terms.txt --url https://openai.com/policies/terms-of-use/

# 3) Reparsear textos ya extraídos (sin volver a descargar).
npm run parse:all

# 4) Validar todos los JSON de data/licenses contra el schema.
npm run validate:data
```

El registro de proveedores y URLs oficiales está en **`data/sources/providers.json`**
(20 proveedores). Cada documento arranca como `needs_manual_review`: el sistema
**no se auto-certifica** las URLs. Solo `sources:verify` marca `verified`, y únicamente
cuando la URL responde 2xx **y** su host final pertenece a un dominio oficial del proveedor.
`ingest:*` procesa **solo** documentos `verified`.

### Interpretar `sourceStatus`

| Estado | Significado |
|--------|-------------|
| `verified` | Respondió 2xx y el host final es de un dominio oficial. Ingerible. |
| `needs_manual_review` | Sin URL, o redirección a dominio no oficial. Requiere revisión humana. |
| `failed_fetch` | Respondió con error HTTP (p. ej. 403/404). |
| `unavailable` | Error de red / timeout. |
| `unsupported_format` | PDF, formato no reconocido, o el texto no pasó la puerta de validez (SPA, muro de consentimiento, soft-404). |

### Dónde queda cada cosa

| Qué | Dónde |
|-----|-------|
| Registro de proveedores y URLs | `data/sources/providers.json` |
| Documento original descargado (html/pdf) | `data/fetched/<id>.<ext>` |
| Texto plano extraído | `data/extracted/<id>.txt` |
| Análisis estructurado (fuente de verdad) | `data/licenses/<id>.json` |
| Logs de ingesta | `data/logs/ingest-<timestamp>.json` |

Los nombres incluyen la fecha de obtención. Si se reingiere el mismo documento el mismo
día y el **texto extraído** no cambió (mismo hash), no se duplica; si cambió, se crea una
variante con sufijo estable (`-v2`, `-v3`…).

## Correr en desarrollo

```bash
npm run dev
# abre http://localhost:3000
```

## Build de producción

```bash
npm run build
npm start
```

## Tests

```bash
npm test
```

## Integración continua (CI)

GitHub Actions corre en cada push y pull request a `main`
(`.github/workflows/ci.yml`). El pipeline, sobre Node 22 (`.nvmrc`):

1. `npm ci` — instala dependencias de forma reproducible.
2. `npm run validate:data` — valida todos los JSON de `data/licenses` contra el schema.
3. `npm test` — corre la suite de Vitest.
4. `npm run build` — compila la app de Next.js.

Si cualquier paso falla, la corrida queda en rojo.

---

## Cómo cargar una licencia

1. Ir a **/upload** (botón "+ Cargar licencia").
2. Completar proveedor, producto, plan, tipo de documento, fecha y (opcional) URL.
3. Pegar el texto completo del documento en el área de texto.
4. "Parsear y guardar".

Al guardar, la app:

1. Guarda el texto original en `data/raw/<id>.txt`.
2. Ejecuta el parser determinístico.
3. Valida el resultado con Zod.
4. Escribe el JSON en `data/licenses/<id>.json`.
5. Redirige al análisis individual.

El `id` es estable y se deriva de los datos:
`{proveedor}-{producto}-{plan}-{tipo}-{fecha}`, por ejemplo
`openai-chatgpt-plus-terms-of-use-2026-06-14`.

## Dónde se guardan los datos

| Qué | Dónde |
|-----|-------|
| Análisis estructurado (JSON, fuente de verdad) | `data/licenses/<id>.json` |
| Texto original del documento | `data/raw/<id>.txt` |

Ambos directorios se versionan en Git (ver `.gitignore`).

---

## Cómo funciona el parser

El parser (`src/lib/parser.ts`) es **determinístico** y no usa servicios externos.
Para cada categoría jurídica (definidas en `src/lib/categories.ts`):

1. Busca **palabras clave fuertes** → si hay coincidencia, estado `found`.
2. Si solo hay **palabras clave ambiguas** → estado `unclear`.
3. Si no hay coincidencias → estado `not_found`.

Para cada coincidencia extrae un **fragmento de contexto** (no solo la palabra) como
evidencia, con una pista de ubicación (offset aproximado). El nivel de riesgo base de
cada categoría y el riesgo general se calculan de forma conservadora.

El lenguaje de los resúmenes es prudente por diseño ("parece indicar…", "no surge con
claridad…", "requeriría revisión legal humana…").

### Reemplazarlo por un parser con LLM

`parseLicense(params): LicenseAnalysis` es el único punto de entrada. Para usar un LLM,
basta con reescribir su implementación interna manteniendo la firma y devolviendo un
objeto que valide contra `LicenseAnalysisSchema`. Ver `ARCHITECTURE.md`.

---

## Modalidades de contratación

Las condiciones legales pueden variar según **cómo se contrata** el servicio. Por eso cada
análisis se asocia a una **modalidad normalizada** (`contractingMode`):

`free` · `paid_individual` · `team` · `business` · `enterprise` · `api` · `education` ·
`open_source` · `unknown` · `all`.

- **`all`** significa *aplicación general*: el documento no distingue claramente por modalidad.
  No es una etiqueta cómoda: la UI siempre lo explica ("el documento no distingue por modalidad").
- **`unknown`** se usa cuando no surge con claridad a qué modalidad aplica (no se infiere).
- Un **documento general** (`sourceScope: general`) aplica a las modalidades de su producto
  (`appliesToModes`). Si el texto diferencia planes (free vs enterprise, etc.), el parser lo
  marca `mixed` y anota las categorías afectadas con su `appliesToModes`.
- Un **documento específico** (p. ej. "Enterprise Terms", "Commercial Terms") tiene
  `sourceScope: mode_specific` y análisis propio.
- Campos por análisis: `contractingMode`, `appliesToModes`, `sourceScope`, `modeConfidence`,
  `modeRationale`. `productTier` (etiqueta del proveedor) se conserva aparte de `contractingMode`
  (la normalización de UP-Law-AILO).

**Regla clave:** las condiciones de una modalidad **no se trasladan** a otra. Un DPA o un
compromiso de no-entrenamiento que solo aparece en enterprise/commercial **no** mejora el perfil
de un usuario `free` o `paid_individual`. Cada documento se evalúa para su propia modalidad.

### Perfil preliminar de privacidad (`privacyPosture`)

Separado del riesgo contractual general (`overallRiskLevel`), cada análisis tiene un **perfil
preliminar de privacidad** por modalidad: `strong` · `moderate` · `weak` · `unknown`. Se eligió
"posture" en vez de una nota (A/B/C) para no aparentar una calificación definitiva.

- `strong`: solo con evidencia suficiente (p. ej. compromiso de **no entrenamiento** del proveedor
  + DPA o confidencialidad). El detector distingue compromisos del proveedor de restricciones al
  usuario ("you may not … train") y es conservador.
- `moderate`: hay política de privacidad y tratamiento de datos con algunas salvaguardas.
- `weak`: indicios de uso amplio para entrenamiento/mejora, licencia amplia o controles poco claros.
- `unknown`: sin evidencia suficiente o documento no extraído.

Se muestra como **"perfil preliminar"**, con señales y evidencia, y siempre sujeto a revisión legal.

## Diseño de interfaz

La UI está pensada como una **herramienta de observación jurídica comparada / consola de
auditoría**, no como un catálogo de tarjetas. Cuatro niveles:

- **Panel (`/`)** — dashboard ejecutivo: franja de métricas sobria, accesos, advertencia
  metodológica y criterio resumido. Sin grilla de cards.
- **Tabla de análisis (`/analyses`)** — la vista principal: una fila por documento, con
  búsqueda y filtros (proveedor, modalidad, documento, riesgo, privacidad, fuente, revisión,
  origen) y orden por columna. Escala a 100+ análisis.
- **Proveedores (`/providers` y `/providers/[id]`)** — primero la lista de proveedores; al
  entrar, un expediente organizado **por modalidad de contratación**, que evidencia qué
  documentos existen y cuáles faltan por modalidad.
- **Dossier jurídico (`/analysis/[id]`)** — la vista individual como expediente: encabezado,
  advertencia, y bloques separados de **Modalidad**, **Perfil de privacidad**, **Riesgo
  contractual**, **Revisión** y **Fuente documental**, más el resumen (toggle claro/jurídico)
  y las categorías como fichas expandibles.
- **Criterio de riesgo (`/criteria`)** — explica qué significan y cómo se calculan riesgo,
  privacidad, fuente verificada y revisión, con las definiciones de cada nivel y los límites
  del parser.
- **Comparar (`/compare`)** y **Diferencias por modalidad (`/differences`)** — matrices
  densas y compactas, con eje primario en la modalidad.

### Por qué se redujeron los chips

Las cápsulas de colores eran demasiado **categóricas** ("Riesgo alto", "Fuente verificada")
y generaban ruido. Se reemplazaron por **indicadores explicativos**: un punto de color
pequeño (refuerzo) + texto que carga el significado y, en el dossier, bloques con
fundamento (`RiskIndicator`, `PrivacyIndicator`, `SourceIndicator`, `ReviewIndicator`,
`ModeIndicator`). El color solo refuerza; nunca es el único portador de significado.

## Limitaciones del MVP

- El parser es léxico (palabras clave): puede tener falsos positivos/negativos. La
  ausencia de coincidencias **no** implica ausencia de cláusula.
- No interpreta el contenido jurídico; solo localiza pasajes candidatos.
- Un solo idioma de heurísticas (inglés) en las palabras clave; el documento puede
  estar en otro idioma.
- La descarga normal es un `GET` simple; `ingest:headless` agrega un navegador real.
- **`ingest:stealth`** (Playwright + plugin anti-detección) supera Cloudflare. Es
  **evasión anti-bot** y por defecto está fuera del alcance "sin scraping agresivo": se
  agregó con autorización explícita. Con él se obtuvieron **OpenAI** (Terms/Privacy/Usage)
  y **Midjourney**. **Perplexity** resiste incluso al stealth (Cloudflare re-verifica en
  loop) → queda `failed_fetch`; **Databricks/terms** es un 404 (URL equivocada). El
  contenido obtenido es el documento real del dominio oficial (se verifica el host final);
  se marca `fetcherVersion: stealth-*` para trazabilidad. No se usan proxies residenciales
  ni resolución de CAPTCHA.
- **PDF no soportado**: se guarda el original y se marca `unsupported_format`.
- Sin versionado histórico entre fechas, sin scraping periódico, sin descarga recursiva.

## Cómo extenderlo

Ver `TODO.md` y `ARCHITECTURE.md`. En resumen: parser con LLM, versionado de
documentos, comparación entre versiones, exportación PDF/CSV, revisión humana formal,
soporte multiidioma.
