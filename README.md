# UP-Law-AILO

[![CI](https://github.com/upderecho/observatorio-de-licencias/actions/workflows/ci.yml/badge.svg)](https://github.com/upderecho/observatorio-de-licencias/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/upderecho/observatorio-de-licencias/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/upderecho/observatorio-de-licencias/actions/workflows/deploy-pages.yml)

**Observatorio académico de condiciones legales de software.**

🌐 **Sitio publicado (solo lectura):** https://upderecho.github.io/observatorio-de-licencias/

## Propósito académico

UP-Law-AILO es un observatorio académico de condiciones legales de software. Su propósito es ayudar a
**abogados y estudiantes de derecho en América Latina** a comprender, comparar y auditar los términos bajo
los cuales utilizan herramientas digitales, incluyendo IA, correo, productividad, redes sociales y sistemas
móviles.

- Busca **mejorar el vínculo entre derecho y software**.
- Compara **IA con software tradicional** ya normalizado en la práctica profesional (Gmail, Microsoft 365,
  LinkedIn, X, Android, Apple) como punto de comparación.
- Trabaja sobre **documentos públicos** (términos de uso, políticas de privacidad, condiciones contractuales).
- Ofrece **lectura preliminar, trazabilidad y comparación**; **no reemplaza el asesoramiento legal**.

UP-Law-AILO permite cargar manualmente el texto de una licencia, EULA, términos de
uso o política de privacidad de un proveedor de IA, parsearlo **una sola vez** con
un parser determinístico local, guardar el resultado como JSON en disco y mostrarlo
en una vista web con lenguaje jurídico y una matriz comparativa.

> ⚠️ **No es asesoramiento legal.** Es una herramienta de análisis preliminar,
> trazabilidad y lectura comparada. Todo resultado queda sujeto a revisión legal humana.

---

## Características

- Carga manual de documentos pegando texto.
- Parser **determinístico y local** (sin LLM, sin APIs externas).
- Persistencia en **archivos JSON en disco** (sin base de datos).
- Cada conclusión está respaldada por **evidencia textual** citada del documento.
- Lenguaje **deliberadamente prudente** (nunca "cumple / no cumple").
- Resúmenes y hallazgos en **lenguaje jurídico**.
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

## Despliegue en GitHub Pages

En cada push a `main`, el workflow `.github/workflows/deploy-pages.yml` genera un
**export estático** del visor y lo publica en
**https://upderecho.github.io/observatorio-de-licencias/**.

- El export se construye con `bash scripts/build-static.sh`, que activa
  `output: 'export'` (vía `NEXT_PUBLIC_STATIC_EXPORT=true` en `next.config.mjs`)
  y pre-genera una página por cada análisis y proveedor.
- El sitio publicado es **solo lectura**: la página `/upload` (carga web) **no** se
  incluye, porque escribir a disco requiere servidor. La ingesta sigue siendo
  100% local por CLI (ver arriba). Para actualizar el sitio: ingerís localmente,
  commiteás los JSON nuevos y pusheás → Pages se reconstruye solo.
- Probar el export localmente: `bash scripts/build-static.sh` genera `./out`. Para
  previsualizarlo hay que servirlo **bajo** la subruta `/observatorio-de-licencias/`
  (si lo abrís en la raíz, los assets dan 404 por el `basePath`).

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

## Diseño centrado en comparación

La comparación es el **principio organizador** del producto, no una vista más. La experiencia no
se basa en **filtros** (deliberadamente ausentes): se elige una comparación significativa y se la
recorre.

- **`/compare`** abre en un **selector de presets** (no en una matriz). Los presets se generan de
  los datos reales (escenarios jurídicos vía el motor `evaluateScenario`, "IA vs software tradicional",
  "Redes sociales", etc.). Tras elegir uno: **selección guiada** de 2 a 4 unidades comparativas
  (proveedor·producto), **tabla compacta** por eje jurídico (datos y privacidad, entrenamiento,
  confidencialidad y seguridad, propiedad intelectual, responsabilidad, jurisdicción) con celdas
  breves (estado · cautela · nº de evidencias) y **evidencia bajo demanda**.
- La **matriz documental completa** sigue disponible como **modo experto** (botón "Abrir modo
  experto"), sin filtros: solo agrupación.
- El modelo vive en `src/domain/comparison.ts` (`buildComparisonUnits`, `buildComparisonPresets`,
  `compareUnits`, `findDifferentialFindings`, `getEvidenceForComparison`). Determinístico, sin LLM,
  export-safe. *(Rediseño transversal en etapas; `/compare` es la primera.)*

## Decisión por escenario de uso

La puerta de entrada (la home, `/`) no es un dashboard de métricas: es una **pantalla de
decisión jurídica**. El usuario elige *para qué* quiere usar una herramienta de IA y el
sistema ordena los documentos analizados según ese escenario.

**Qué son los escenarios.** Definidos en `src/domain/legalUseScenarios.ts` (p. ej. *datos
personales*, *información de clientes*, *secreto profesional*, *enterprise/API*). Cada
escenario declara, en términos de los campos reales del análisis: categorías jurídicas
prioritarias, señales de privacidad a favor/en contra, modalidades preferidas, nivel de
sensibilidad y una advertencia específica.

**Cómo se evalúan.** `evaluateScenario(scenarioId, analyses)` (`src/domain/evaluateScenario.ts`)
es **determinístico, sin LLM y sin red**. Evalúa **cada documento por separado** y **no agrega
señales entre documentos** de un mismo proveedor: un DPA o un compromiso de confidencialidad
que solo aparece en un documento comercial **no** mejora el perfil de un documento
general/gratuito. Cada resultado cita los campos reales que lo motivaron y referencia el
`id` del análisis fuente (`sourceAnalysisIds`).

**Recomendaciones prudentes.** Nunca dice "seguro/aprobado/cumple". Usa cinco niveles:
`Uso preferente con condiciones`, `Usable con cautela`, `Requiere revisión contractual`,
`No recomendado sin modalidad enterprise/DPA`, `Información insuficiente`. No emite una
recomendación fuerte sin evidencia, y para escenarios críticos (secreto profesional) es
restrictivo por defecto. Toda orientación queda **sujeta a revisión legal humana**.

**De la recomendación a la evidencia.** Cada resultado enlaza al **dossier** del documento
(`/analysis/[id]`), a su **texto fuente** (`/analysis/[id]/source`) y a la **matriz
comparativa** (`/compare`), de modo que la orientación sea trazable hasta la cláusula.

La vista de cada escenario vive en `/escenarios/[scenarioId]`. Los **escenarios de uso jurídico son el eje
principal** de decisión práctica de la experiencia.

## Comparaciones académicas

Además de proveedores de IA, el observatorio incorpora **software tradicional usado por abogados** como
punto de comparación académico. Permite distinguir qué riesgos son propios de la IA y cuáles ya existían en
el software cotidiano.

- **Software de referencia:** Gmail (correo), Microsoft 365 (productividad), LinkedIn y X (redes sociales),
  Android y Apple/iOS (ecosistemas móviles).
- Cada análisis lleva una **taxonomía** (`softwareCategory`, `comparisonGroup`, `comparativeBaseline`) que
  evita mezclar IA y software tradicional sin etiquetarlos. Ver `ARCHITECTURE.md`.
- La **matriz comparativa** (`/compare`) tiene un modo **"IA vs software tradicional"** y un filtro por grupo;
  la **tabla de evidencia** (`/analyses`) filtra por grupo comparativo.
- **Sin equivalencias forzadas:** la comparación de categorías entre IA y software tradicional siempre
  requiere revisión del texto fuente. Las fuentes que no se obtienen con certeza quedan registradas como
  `needs_manual_review`, no se infiere su contenido.
- Escenarios académicos (no pasan por el motor de recomendación): *Comparar IA con software tradicional*,
  *Software cotidiano del abogado*, *Lectura jurídica de software en América Latina*.

## Diseño de interfaz

La UI se organiza en cuatro capas: **decisión** (home por escenario) → **orientación**
(vista de escenario) → **análisis** (matriz comparativa) → **evidencia** (dossier
documental). Estética sobria de consola de auditoría, no catálogo de tarjetas.

- **Inicio / decisión (`/`)** — pantalla de decisión jurídica: "¿Qué necesitás decidir?",
  tarjetas de escenarios de uso, orientación rápida y, como bloque **secundario**, la
  cobertura (métricas) y los accesos a las vistas de análisis. No arranca con métricas.
- **Orientación por escenario (`/escenarios/[id]`)** — recomendación preliminar por
  documento para un escenario, con motivos, cautelas, evidencia faltante y enlaces al dossier.
- **Tabla de análisis (`/analyses`)** — la vista principal, pensada como **registro de due
  diligence documental** a ancho completo. Encabezado con métricas resumidas; toolbar compacta
  con búsqueda prominente, filtros rápidos (modalidad, proveedor, riesgo, privacidad) y
  **filtros avanzados** plegables (documento, fuente, revisión, origen); orden por columna.
  Columnas agrupadas (proveedor/producto y modalidad/documento en una celda), fuente y revisión
  con etiqueta corta + texto secundario. Opción **agrupar por proveedor** (secciones con sus
  documentos) y **panel lateral de vista rápida** al seleccionar una fila, con acceso al dossier
  completo. Escala a 100+ análisis.
- **Proveedores (`/providers` y `/providers/[id]`)** — primero la lista de proveedores; al
  entrar, un expediente organizado **por modalidad de contratación**, que evidencia qué
  documentos existen y cuáles faltan por modalidad.
- **Dossier jurídico (`/analysis/[id]`)** — la vista individual como expediente: encabezado,
  advertencia, y bloques separados de **Modalidad**, **Perfil de privacidad**, **Riesgo
  contractual**, **Revisión** y **Fuente documental**, más el resumen y las categorías
  como fichas expandibles.
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

---

## Autoría y créditos

Proyecto de **UP Law — Laboratorio de Inteligencia Artificial, Facultad de Derecho,
Universidad de Palermo**.

Co-creadores y autores intelectuales:

- **Guido Barosio** — [LinkedIn](https://www.linkedin.com/in/gbarosio) · [@gbs1977](https://x.com/gbs1977)
- **Juan Cruz Romano** - [LinkedIn](https://www.linkedin.com/in/juan-cruz-romano/) 
- **Hernán Quadri**  - [LinkedIn](https://www.linkedin.com/in/gabriel-hernan-quadri-b3194925/) . [@ghernanq](https://x.com/ghernanq)
- **Aníbal Ramírez** - [LinkedIn](ttps://www.linkedin.com/in/an%C3%ADbal-ram%C3%ADrez-5b92041a2)

## Licencia

Distribuido bajo licencia **BSD 3-Clause**. Ver [`LICENSE`](./LICENSE).

> La licencia BSD 3-Clause cubre el **software** (código de este repositorio). No
> alcanza al texto de las licencias, EULA o políticas de terceros almacenadas en
> `data/`, cuyos derechos pertenecen a sus respectivos proveedores y se incluyen
> únicamente con fines de análisis, cita y trazabilidad.
