---
name: indices-master
description: >-
  Master de Índices económicos: el catálogo IDX_CATALOG, el store IDX_STORE, las fuentes
  automáticas (INDEC, ArgentinaDatos, BNA/BCRA, CKAN Energía, FADEEAC, IA) y las validaciones
  de plausibilidad. Usar SIEMPRE antes de tocar código que traiga, valide, guarde, consolide o
  muestre un índice. Se dispara con: "índice", "índices", "IDX_STORE", "IDX_CATALOG", "IPC",
  "IPIM", "FADEEAC", "FADEAAC", "gas oil", "combustible", "USD divisa", "tipo de cambio",
  "CCT", "paritaria", "Mano de Obra", "needsReview", "confirmado", "Actualizar todos",
  "energia-proxy", "consolidar filas", "Master de Índices".
---

# Master de Índices

> **Regla de oro:** un dato de índice que la app trajo sola y **no** pasó las validaciones de
> plausibilidad queda marcado `needsReview: true` y **no puede alimentar un cálculo de AVE**.
> Marcarlo es la mitad del trabajo; respetar la marca es la otra mitad.

---

## 1. Modelo de datos

### 1.1 — `IDX_STORE`

```js
IDX_STORE = {
  ipc_nac: { rows: [ {ym, pct, value, confirmed, source, note, publishedAt,
                      sourceUrl, status, needsReview, reviewReason, files:[]} ] },
  usd_div: { rows: [ ... ] },
  __deleted: [...],     // ids dados de baja
  __sbId: 3             // ← id de la fila en Supabase, se quita al serializar
}
```

| Campo de fila | Nota |
|---|---|
| `ym` | `'YYYY-MM'`. **La clave.** Un solo row por `ym` por índice. |
| `pct` | Variación mensual %. Para IPC, IPIM, FADEEAC, MO. |
| `value` | Nivel absoluto. Para USD y combustible. |
| `confirmed` | El humano validó este dato. Lo saca del flujo de revisión. |
| `needsReview` / `reviewReason` | Puesto por `withReviewFlag`. Ver §4. |
| `source` / `sourceUrl` / `publishedAt` | Trazabilidad de dónde salió. |
| `status` | `'updated'` \| `'waiting_release'` |

> `pct` y `value` **no** son intercambiables. Un índice de nivel (USD, gasoil) sin `value` es
> inútil aunque tenga `pct`, y viceversa. Ver §3.3.

### 1.2 — Prioridad de datos

```
IDX_STORE (live, desde Supabase)  >  IDX_OFFICIAL_SEED (hardcodeado en 05-indices.js:38)
```

`idxMergeOfficialSeeds` (`05-indices.js:93`) completa huecos desde el seed pero **no pisa** un
dato live existente, salvo que el live esté incompleto (`pct==null` y el seed lo tenga, o el
`publishedAt` del seed sea más nuevo).

**Supabase es la única fuente de verdad.** `localStorage['idx_v2']` es un **espejo**, nunca un
fallback autoritativo.

### 1.3 — ⚠️ El catálogo real no es el que dice `CLAUDE.md`

`IDX_CATALOG` (`05-indices.js:1`) tiene **18 índices** en 5 categorías (5 IPC · 3 IPIM · 1 combustible · 1 USD · 8 Mano de Obra). Diferencias con la
documentación vieja:

- **8 índices de Mano de Obra** (`cat:'mo'`) que `CLAUDE.md` no lista: `mo_pp`, `mo_pj`,
  `mo_uocra`, `mo_uocrayac`, `mo_com`, `mo_cam`, `mo_uom10`, `mo_uom17`. Todos con su `cct`.
- **`go_g2` ya no existe** en el catálogo. Solo queda `go_g3`.
- **`usd_bill` está comentado** (`05-indices.js:16-20`), a pedido del usuario: implicaba
  desplegar un cambio más en `energia-proxy`. `idxFetchBnaBillete` y su rama en `runIdxUpdate`
  **quedan armadas y sin uso** por si se retoma.

Campos de una entrada del catálogo: `{id, name, cat, catLabel, src, srcLink, fetchMode,
seriesId?, directCsvUrl?, cct?, pubDay?, pubDelay?}`.

---

## 2. Las fuentes, por `fetchMode`

`runIdxUpdate(id)` (`05-indices.js:994`) despacha según `def.fetchMode`:

| `fetchMode` | Fuente y orden de intentos |
|---|---|
| `usd` | Backfill histórico BNA → cotización puntual. `fetchUsdBnaLikeAll` / `fetchUsdBnaLike` |
| `indec` | **1.** ArgentinaDatos (más al día) → **2.** CSV directo INDEC (si hay `directCsvUrl`) → **3.** API series `apis.datos.gob.ar` |
| `fuel` | CKAN Energía: dataset **"vigentes"** → dataset **histórico** → huecos vía IA |
| `fadeeac` | Feed RSS de FADEEAC → parseo del título → huecos vía IA con grounding |
| `manual` | Sin automatización. Carga guiada. `cat:'mo'` siempre cae acá. |

### 2.1 — ⚠️ `datos.energia.gob.ar` tiene el certificado SSL vencido

**Todo** acceso a CKAN va obligatoriamente por la Edge Function `energia-proxy`
(`_ckanFetchViaProxy`, `05-indices.js:695`). Nunca hagas `fetch` directo: falla con error de
TLS en el navegador.

Resource ids: histórico `f8dda0d5-2a9f-4d34-b79b-4e63de3995df` · vigentes
`80ac25de-a44a-4445-9215-090cf55cfda5`.

### 2.2 — Las Edge Functions no están en este repo

`gemini-proxy` y `energia-proxy` viven **solo** desplegadas en Supabase. No hay fuente
versionada acá. Cualquier cambio que dependa de tocarlas **no se puede hacer desde el repo** —
decilo explícitamente en vez de asumir que el cambio está completo.

### 2.3 — El fallback por IA es de último recurso

`idxResolveViaAI` (`05-indices.js:889`) y `fillGapsViaAI` (`05-indices.js:963`) piden los meses
faltantes a Gemini. Reglas verificadas en el código:

- `fillGapsViaAI` corre **solo si realmente hay huecos**, para no gastar la cuota gratis
  (20/día) en índices que ya están al día.
- Se piden los meses faltantes **por nombre explícito**, no como rango (`2026-08-10`: pedir un
  rango daba resultados peores).
- El grounding con Google Search es **opt‑in** (`{grounding:true}`), activado para FADEEAC.
  Para análisis de enmiendas no se usa: no hace falta ni conviene buscar en la web.
- La respuesta pasa por `extractJsonArrayFromGeminiText` (`05-indices.js:873`) porque Gemini
  devuelve el JSON envuelto en markdown.
- **Todo dato de IA pasa por `withReviewFlag`.** Nunca entra confirmado.

---

## 3. Reglas no obvias

### 3.1 — `idxRows` vs `safeIdxRows`

| Función | Efecto |
|---|---|
| `idxRows(id)` (`05:219`) | **Crea** `IDX_STORE[id] = {rows:[]}` si no existe |
| `safeIdxRows(code)` (`05:225`) | No crea nada + resuelve labels (`'PP'` → `'mo_pp'`) |

> En cualquier cálculo (polinómica, Ko, dashboard) usá **`safeIdxRows`**. `idxRows` envenena el
> seed de `indicator_snapshots` con entradas vacías.

El mapa label→id está duplicado en `safeIdxRows` (`05:228-233`) y en `labelToIdxId`
(`03-utils.js:55`). Si agregás un índice que se referencia por label desde una fórmula
polinómica, **tenés que agregarlo a los dos**.

### 3.2 — `saveIdx` serializa las escrituras

`saveIdx` (`05-indices.js:132`) evita escrituras concurrentes pisándose:

```js
if(_saveIdxBusy){ _saveIdxPending = true; return true; }   // marca y sale
// ...al terminar, si quedó pendiente, hace otra pasada con el IDX_STORE más nuevo
```

Devuelve `false` **solo** si Supabase rechazó la escritura, para que el llamador pueda avisar
en vez de mostrar "guardado" cuando el cambio quedó solo en esa pestaña. **Respetá el valor de
retorno.**

Espeja a `localStorage` siempre, antes de intentar Supabase.

### 3.3 — El % no se calcula solo

`a29321c` agregó el botón **"Recalcular %"** justamente porque hay filas con % mal calculado.
Recalcula el `pct` mensual **sin tocar `value` ni `confirmed`**. Si escribís lógica que derive
`pct` de `value`, respetá esa separación: pisar `confirmed` borra trabajo humano.

### 3.4 — Consolidación de filas duplicadas

La tabla `indices` de Supabase puede terminar con **varias filas**, cada una con un
`IDX_STORE` parcial. `consolidateIdxRows` (`05-indices.js:160`):

1. Trae **todas** las filas (`limit=500`).
2. Une por `ym`: para el mismo período, **gana la fila más nueva** (`Object.assign`).
3. Conserva `__deleted` de la última fila.
4. Borra todas menos la última y reescribe la unión ahí.

Es **destructivo e irreversible**. Pide confirmación. No lo llames desde código automático.

### 3.5 — Calendario de publicación

`pubDay` + `pubDelay` definen cuándo esperar el dato (`idxNextPubDate`, `05-indices.js:479`).
`idxLastBizDayOfMonth` (`05:313`) usa `argHolidays(y)` (`05:298`), que calcula feriados
argentinos **incluyendo Pascua** (`_easterDate`, `05:279`) y los trasladables. No lo
reimplementes con una resta de días.

`idxTargetYm()` (`05:238`) es **el mes anterior**, no el actual: un índice de agosto se publica
en septiembre.

### 3.6 — El reporte no es el fetch

`a677aa3` / `2026-08-04`: "Corregir falso 'sin dato' en Actualizar todos — **el problema era el
reporte, no el fetch**". Antes de diagnosticar una fuente como rota, verificá que el dato no
haya llegado bien y se esté informando mal.

---

## 4. Validación de plausibilidad

`validateIdxRow(def, newRow, prevRow)` (`05-indices.js:922`):

| Tipo | Rechaza si |
|---|---|
| Nivel (`cat` = `usd` \| `fuel`) | `value` no numérico o ≤ 0 · ratio vs. anterior > 2.5 o < 0.4 · **valor idéntico al anterior** (posible dato repetido) |
| Variación (resto) | `pct` no numérico · fuera de **‑3% a 60%** · **idéntico al anterior** |

`withReviewFlag(def, row)` (`05-indices.js:948`) aplica la validación y devuelve el row con
`needsReview` / `reviewReason`.

**Reglas de uso:**
- Todo dato **auto-obtenido** pasa por `withReviewFlag`. Sin excepción.
- **Nunca** lo uses en carga manual: ahí el humano ya está validando al tipear.
- Un row con `needsReview: true` **no debe entrar a un cálculo de AVE**. `calculateUpdate`
  (`07-polynomial.js:137,142,143`) lo filtra; `computePoliDeltaPct` **no** — ver skill
  `polinomica-ko` §4.3.
- "Confirmar todos" tiene que **limpiar `needsReview`**, no solo marcar `confirmed`; si no, la
  fila queda en rojo igual (bug `2026-08-11`).

---

## 5. Errores pasados en esta área

| Commit / fecha | Síntoma | Causa raíz |
|---|---|---|
| `2026-08-11` | "Confirmar todos" dejaba filas en rojo | No limpiaba `needsReview` |
| `2026-08-10` | `esc()` cortaba atributos HTML con texto JSON | No escapaba comillas |
| `2026-08-10` | IPIM tomaba el rubro equivocado del CSV | Se elegía por **posición** en vez de por la columna de rubro explícita |
| `2026-08-10` | IPIM se desalineaba mes a mes | Se anclaba solo al principio, no en cada mes confirmado |
| `2026-08-10` | Errores de Gemini indescifrables | Solo se mostraba el status, no el body |
| `2026-08-05` | FADEEAC detectaba mal el mes | El título del feed menciona más de uno |
| `2026-08-04` | Falso "sin dato" en Actualizar todos | El reporte, no el fetch (§3.6) |
| `2026-08-04` | % acumulado automático quedaba en 0 | Caché stale de índices |
| `2026-08-04` | Datos auto-obtenidos entraban sin control | Faltaba validación previa → nace `validateIdxRow` |
| pendiente | `ipim_r29` sin datos | `seriesId` correcto no encontrado; API INDEC da 400. Está como `fetchMode:'manual'` |

---

## 6. Checklist antes de dar por terminada una modificación

**Datos**
1. ¿Todo dato auto-obtenido pasa por `withReviewFlag`?
2. ¿Ningún dato con `needsReview` puede llegar a un cálculo de AVE?
3. ¿Distinguiste `pct` (variación) de `value` (nivel) según `def.cat`?
4. ¿Un solo row por `ym` por índice?
5. ¿Respetaste `confirmed` — no lo pisaste al recalcular?

**Store**
6. ¿Usaste `safeIdxRows` en cálculos y `idxRows` solo en la UI del Master?
7. Si agregaste un índice referenciado por label, ¿lo agregaste a **los dos** mapas? (§3.1)
8. ¿Chequeaste el valor de retorno de `saveIdx()` antes de decir "guardado"?

**Fuentes**
9. ¿Todo acceso a `datos.energia.gob.ar` va por `energia-proxy`?
10. ¿El fallback por IA corre **solo si hay huecos**?
11. Si el cambio necesita tocar una Edge Function, ¿lo dijiste explícitamente? (§2.2)
12. ¿Los errores muestran el **body** de la respuesta, no solo el status?

**Fechas**
13. ¿`idxTargetYm()` (mes anterior) y no el mes actual?
14. ¿Usaste `argHolidays` / `idxLastBizDayOfMonth` en vez de restar días?

**Release**
15. Bumpear `?v=` de cada archivo tocado. → skill `app-shell-release`.

---

## 7. Fuera de alcance

- **Cómo se combinan los índices en un Ko** → skill `polinomica-ko`.
- **Persistencia y la tabla `indices`** → skill `supabase-datalayer`.
- **El patrón de llamada a Gemini** → skill `importadores` y la portable `llm-proxy-edge-function`.
