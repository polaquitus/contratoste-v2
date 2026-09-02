---
name: enmiendas-y-tarifarios
description: >-
  Ciclo de vida de una enmienda contractual, del tarifario (listas de precios) que genera, y de
  la importación de ambos desde PDF/DOC/Excel con IA. Usar SIEMPRE antes de tocar código que
  cree, numere, corrija, borre o renderice enmiendas, tramos, alcance (scope), o que resuelva
  qué tabla de precios rige en un período. Se dispara con: "enmienda", "enmiendas", "tramo",
  "tarifario", "lista de precios", "scope", "alcance", "mayor/menor scope", "período de
  aplicación", "superseded", "corrección de enmienda", "extensión de plazo", "Word de
  enmienda", "btar", "importar enmienda", "PDF con IA", "Gemini", "importar listas".
---

# Enmiendas y Tarifarios

> **Regla de oro:** un contrato tiene **UN solo tarifario**, que puede tener **varias tablas**
> y evoluciona por **generaciones**. Una generación = todas las tablas guardadas juntas en un
> mismo `guardarEnm()`, identificadas por su **`period`**. Agrupar por **nombre** es el bug
> `5a15b0e`.

---

## 1. Los dos ejes temporales de una enmienda

Se confunden todo el tiempo. **No son lo mismo:**

| Campo | Qué es | Se muestra como |
|---|---|---|
| `fecha` | Fecha de **emisión** del documento | columna "Fecha" |
| `nuevoPeriodo` / `scopePeriodo` | **Período de aplicación**: desde cuándo rige | columna "Período de Aplicación" |

Solo `ACTUALIZACION_TARIFAS` (vía `tramos[].nuevoPeriodo`) y `SCOPE` (vía `scopePeriodo`) tienen
período propio. `CLAUSULAS`, `EXTENSION` y `OTRO` muestran `—` (`d8a20c4`).

---

## 2. Esquema de la enmienda

```js
{
  num: 3,                        // correlativo, = enmiendas.length + 1 al crearse
  tipos: ['EXTENSION','SCOPE'],  // ← multi-tipo, ES EL CAMPO BUENO
  tipo:  'EXTENSION',            // legacy = tipos[0], solo compatibilidad
  fecha: '2026-08-26',
  // ACTUALIZACION_TARIFAS
  tramos: [{ basePeriodo, nuevoPeriodo, pctPoli, polyTerms:[{idx,inc,baseOrig,pctAcum,nuevaBase,justificacion}] }],
  basePeriodo, nuevoPeriodo, pctPoli, polyTerms,   // ← espejo del ÚLTIMO tramo
  tarSubtipo: 'POLINOMICA',
  correccionDeEnm: 2,
  superseded: false, supersededBy: null,
  // EXTENSION
  fechaFinNueva, extTipo,
  // SCOPE / CLAUSULAS / OTRO
  motivo, motivoHtml, otroTitulo, scopePeriodo, scopeTipo, scopeItems
}
```

### 2.1 — `tipos[]` vs `tipo`

Una enmienda puede combinar conceptos (`EXTENSION` + `ACTUALIZACION_TARIFAS` a la vez).
**Nunca leas `e.tipo` directo.** Usá los helpers de `03-utils.js:372-373`:

```js
enmTipos(e)        // → array, con fallback a [e.tipo] para enmiendas viejas
enmHasTipo(e, t)   // → boolean
```

El importador con IA (`06-licit-prov.js:488`) crea enmiendas **solo con `tipo`**, sin `tipos[]`.
Los helpers lo cubren; el acceso directo no.

### 2.2 — Nivel superior = último tramo

`basePeriodo`, `nuevoPeriodo`, `pctPoli` y `polyTerms` al nivel de la enmienda son un **espejo
del último tramo** (`04-contracts.js:2698-2700,2712`), puesto ahí para compatibilidad con
listados y generación de documentos. **El detalle real está en `tramos[]`.**

> Si una enmienda multi‑tramo te muestra un solo período, estás leyendo el espejo en vez de
> `tramos`. Fue el bug `532deda`.

---

## 3. Esquema del tarifario

```js
{
  name: 'TARIFARIO FINAL (Enm.3)',   // ← NO es identidad, solo display
  cols: ['ITEM','DESCRIPCION','UNIDAD','PRECIO'],
  rows: [[...], [...]],
  period: '2026-04',                  // ← LA identidad de la generación
  enmNum: 3,
  sourceTableName: 'TARIFARIO',
  placeholder: true                   // si se creó sin tabla base
}
```

### 3.1 — ⚠️ Agrupar por `period`, nunca por `name`

Caso real del contrato 4600008911: la tabla base se llama `TARIFARIO`, y las que genera cada
actualización se llaman `TARIFARIO FINAL (Enm.N)`. Agrupar por nombre partía **un solo tarifario
evolutivo** en dos series inconexas.

`guardarEnm` deriva el nombre nuevo quitando el sufijo previo y reponiéndolo
(`04-contracts.js:2718-2719`), así que el nombre **cambia entre generaciones por diseño**.

### 3.2 — ⚠️ Dos resolutores de "tarifario vigente al período", duplicados

| Función | Ubicación | Diferencia |
|---|---|---|
| `getApplicableTariffs(cc, period)` | `04-contracts.js:1892` | Tiene fallback a tablas **sin** `period` |
| `scopeTablasDisponibles(cc, asOfPeriod)` | `04-contracts.js:1965` | Devuelve `[]` si ninguna tiene `period`; envuelve en `{name, idx, table}` |

Ambas hacen lo mismo: **tomar la generación con el `period` más alto que no supere el período
pedido, y devolver TODAS las tablas de esa generación.** Si tocás una, revisá la otra.

> **Nunca devuelvas "la más nueva" a secas.** Fue el bug `f11eaff`.

---

## 4. `guardarEnm` — el orden importa

`04-contracts.js:2602`. Es la función más delicada del repo:

```
1. Leer los conceptos tildados          getEnmTiposSeleccionados()
2. VALIDAR TODO, sin mutar nada         ← todas las validaciones primero
3. Armar el objeto enmienda             (04:2670-2671)
4. Aplicar efectos por concepto
5. Generar tarifarios                   (04:2718)
6. Generar AVEs                         → skill ave-ledger
7. Recalcular monto vigente             (04:2797)
8. Persistir (await) → toast → cerrar   → skill supabase-datalayer
```

**El paso 2 no es cosmético.** Si se combinan varios conceptos y uno falla su validación, no
puede quedar el contrato con las mutaciones de otro ya aplicadas a medias.

### 4.1 — El cálculo corre con el plazo SIN extender

`computeTramoChain` se ejecuta en el paso 2, **antes** de que `EXTENSION` toque `cc.fechaFin`.
Es intencional: la actualización de tarifas queda calculada sobre el plazo vigente **al momento
de decidirse**.

### 4.2 — Extensión de plazo

```js
if(!cc._fechaFinOriginal) cc._fechaFinOriginal = cc.fechaFin;  // se guarda una sola vez
cc.fechaFin = extFf;
cc.plazo = monthDiffInclusive(cc.fechaIni, cc.fechaFin);
cc.plazo_meses = cc.plazo;                                      // ← resincronizar SIEMPRE
```

Fecha parseada con `parseEnmDate` (acepta DD/MM/AAAA) y **debe ser posterior** a la actual.
Nunca restes meses a mano — queda 1 mes corta.

### 4.3 — Alcance (SCOPE)

- `MAYOR` y `MENOR` son **excluyentes** (`04-contracts.js:2011`): mayor solo **agrega**, menor
  solo **quita**. Nunca las dos secciones a la vez.
- Una enmienda de scope **puede ser solo texto**. Período y tabla son obligatorios **solo si**
  hay items marcados.
- Todo item nuevo necesita su precio antes de guardar.
- La tabla a modificar es la **vigente al período de aplicación** (§3.2).
- Terminología: es **"Tabla a modificar"**, no "Tarifario a modificar" (`5d40d6d`).

### 4.4 — Corrección de enmienda (`superseded`)

`04-contracts.js:2691-2694`:

```js
oe.superseded = true;  oe.supersededBy = num;
cc.tarifarios = cc.tarifarios.filter(t => t.enmNum !== corrNum);   // se borran sus tablas
```

Una enmienda `superseded` **sigue existiendo** pero queda **excluida de todo cálculo**:

```js
(c.enmiendas||[]).filter(e => enmHasTipo(e,'ACTUALIZACION_TARIFAS') && !e.superseded && e.pctPoli)
```

> Si escribís un cálculo nuevo sobre enmiendas y **no** filtrás `!e.superseded`, contás dos
> veces la misma actualización.

### 4.5 — Texto enriquecido

`CLAUSULAS`, `SCOPE` y `OTRO` usan un editor `contenteditable`. El HTML pasa por
`sanitizeRichText` (`04-contracts.js:1941`), whitelist estricta: `B, STRONG, I, EM, U, OL, UL,
LI, BR, P, DIV`, sin atributos.

Es **la única defensa** contra XSS almacenado en ese camino: el contenido se inserta **sin
escapar** en el Word/HTML generado.

⚠️ Los atajos globales se disparaban al escribir en este editor (`b6546b7`).

---

## 5. Numeración y borrado

### 5.1 — `num = enmiendas.length + 1`

Los dos sitios que crean enmiendas usan esta fórmula: `04-contracts.js:2670` y
`06-licit-prov.js:487`. Si se borra una del medio, hay **colisión de números** — por eso todo
borrado pasa por `renumberEnmiendas`.

### 5.2 — `renumberEnmiendas` (`09-patch.js:143`) reescribe 4 cosas

| Destino | Qué actualiza |
|---|---|
| `enmiendas[].num` | correlativo nuevo |
| `tarifarios[].enmNum` | remapea; si no existe más, **borra el campo** |
| `tarifarios[].name` | reescribe el sufijo `(Enm.N)` con regex |
| `aves[].enmRef` | remapea; si no existe más, `null` |
| `enmiendas[].supersededBy` / `.correccionDeEnm` | remapea; si no existe, limpia y pone `superseded = false` |

> Si agregás un campo que referencie `enm.num`, **tenés que agregarlo acá**.

### 5.3 — Borrado en cascada

`deleteAdjustedPeriods(periods, enmNums)` (`09-patch.js:237`) es el único camino autorizado.
`delAveById` (`09:290`) y `delTarTable` (`09:304`) están **redefinidos** para redirigir ahí.
Nunca borres un elemento suelto de `enmiendas[]`, `tarifarios[]` o `aves[]`.

`resetSection('enmiendas')` (`06-licit-prov.js:529`) borra todo y avisa **explícitamente** que
también elimina los AVEs generados (`4ab1057`).

---

## 6. `btar` — el período tarifario base

`cc.btar` se actualiza a `r.newPer` en cada actualización de tarifas (`04-contracts.js:2722`).
Es el ancla por defecto del período base en el panel polinómico. Si generás tarifarios sin
actualizar `btar`, el panel propone una base vieja.

---

## 7. Importación con IA — enmiendas y listas de precios

> **Regla de oro del importador:** **propone, nunca dispone.** Nada de lo que devuelve el
> modelo toca el contrato sin pasar por una pantalla de revisión humana.

### 7.1 — Arquitectura

```
navegador → Supabase Edge Function `gemini-proxy` → Gemini API
```

La API key es un **secret del servidor** (`01-config.js:18`: `// GEMINI_KEY_1 removed —
server-side`).

> **No hay rotación de claves en el cliente.** Lo que hay es **retry**: 3 intentos, 2 s en
> `502`/`503` y 1 s ante error de red (`callGeminiForEnm`, `06-licit-prov.js:291`). Si existe
> rotación, vive dentro de la Edge Function, que **no está en este repo**. Un cambio que la
> necesite **no se puede completar desde acá** — decilo.

### 7.2 — Grounding: opt‑in

```js
body: JSON.stringify(grounding ? { parts, grounding: true } : { parts })
```

Default `false`, deliberadamente: para analizar una enmienda no hace falta ni conviene buscar en
la web. Se usa solo para FADEEAC (skill `indices-master` §2.3).

### 7.3 — Payload y fallback

`buildGeminiFilePayload` (`06-licit-prov.js:245`):

| Formato | MIME | Fallback de texto |
|---|---|---|
| `.pdf` | `application/pdf` | — |
| `.docx` | `...wordprocessingml.document` | `mammoth.extractRawText` |
| `.doc` | `application/msword` | extracción binaria de ASCII imprimible |

Límites: **20 MB** por archivo; el fallback de texto se corta en **120.000 caracteres**.

### 7.4 — La respuesta viene envuelta en markdown

Gemini devuelve el JSON dentro de un bloque de código pese a que el prompt pida lo contrario.
Pasá siempre por `extractJsonArrayFromGeminiText` (`05-indices.js:873`) — nunca `JSON.parse`
directo.

### 7.5 — Normalización obligatoria

| Función | Qué hace |
|---|---|
| `normalizeTipo` (`06:264`) | Texto libre → `EXTENSION`\|`ACTUALIZACION_TARIFAS`\|`SCOPE`\|`CLAUSULAS`\|`OTRO`. Mira el `tipo` **y** la descripción. Default `OTRO`. |
| `normalizeDateString` (`06:254`) | `YYYY-MM-DD`, `DD/MM/YYYY` o `new Date()`. |
| `normalizeImportedEnm` (`06:277`) | Limpia montos (`replace(/[^\d,.-]/g,'')`, coma→punto). |

⚠️ `normalizeImportedEnm` produce `tipo` pero **no `tipos[]`** — ver §2.1.

### 7.6 — Revisión humana antes de persistir

`importEnmPdfs` (`06-licit-prov.js:167`) acumula en `_importedEnms`, los muestra en un modal y
**solo persiste al confirmar**. Si agregás un importador con IA, replicá esto.

### 7.7 — Listas de precios: dos caminos

| Función | Vía |
|---|---|
| `parsePriceListExcelFile` (`04:1446`) | Excel estructurado |
| `analyzePriceListsWithGemini` (`04:1369`) → `normalizeAiPriceLists` (`04:1387`) | IA |

El bloque `PATCH v14-base` al final de `06-licit-prov.js` **envuelve** `parsePriceListExcelFile`
para detectar una hoja `TARIFARIO FINAL` y parsear sus 3 secciones conocidas, cayendo al parser
original si no encuentra el patrón. Es un parser específico de un contrato real: si tocás la
función, verificá que el wrapper siga andando — corre **después** y pisa la original.

### 7.8 — Los botones de IA de Enmiendas están retirados

`4ab1057` quitó "Generar Enmienda (última)" e "Importar PDF/DOC con IA" de la fila de acciones.
El código sigue vivo. **No los repongas sin que te lo pidan.**

---

## 8. Errores pasados en esta área

| Commit | Síntoma | Causa raíz |
|---|---|---|
| `5a15b0e` | El período de aplicación nunca traía la actualización correcta | Agrupar tarifarios por **nombre** |
| `f11eaff` | "Quitar items" mostraba precios que aún no regían | Se tomaba la versión más nueva |
| `5d40d6d` | Parecía haber varios tarifarios distintos | Terminología |
| `532deda` | El Word traía períodos de otra enmienda | Se leía el espejo en vez de `tramos[]` |
| `ed09b16` | Valores duplicados y sección "PRECIO" en cláusulas/scope | El doc no discriminaba por tipo |
| `d8a20c4` | No se veía desde cuándo rige | Faltaba separar emisión de aplicación |
| `4ab1057` | Reset dejaba AVEs huérfanos | Borrado parcial |
| `b6546b7` | Atajos disparándose al escribir | El editor no aislaba el teclado |
| `2026-08-10` | Errores de Gemini indescifrables | Solo se mostraba el status, no el body |

---

## 9. Checklist antes de dar por terminada una modificación

**Tipos y períodos**
1. ¿Usaste `enmTipos()` / `enmHasTipo()` y no `e.tipo` directo?
2. ¿Distinguiste `fecha` (emisión) de `nuevoPeriodo`/`scopePeriodo` (aplicación)?
3. Si es multi‑tramo, ¿leíste `tramos[]` y no el espejo?

**Tarifarios**
4. ¿Agrupaste por `period` y **nunca** por `name`?
5. ¿Tomaste la generación **vigente al período pedido**, no la más nueva?
6. ¿Devolviste **todas** las tablas de esa generación?
7. Si tocaste uno de los dos resolutores, ¿revisaste el otro? (§3.2)

**guardarEnm**
8. ¿Las validaciones nuevas están **antes** de cualquier mutación?
9. ¿Probaste `EXTENSION` + `ACTUALIZACION_TARIFAS` en la misma enmienda?
10. ¿`plazo` y `plazo_meses` sincronizados con `monthDiffInclusive`?

**Superseded y borrado**
11. ¿Todo cálculo nuevo filtra `!e.superseded`?
12. Si agregaste un campo que referencia `enm.num`, ¿lo agregaste a `renumberEnmiendas`?
13. ¿El borrado pasa por `deleteAdjustedPeriods`?

**Texto**
14. ¿La whitelist de `sanitizeRichText` sigue cerrada?
15. ¿Los atajos globales siguen inertes con el foco dentro del editor?

**Importación con IA**
16. ¿La key sigue del lado del servidor? ¿No agregaste ninguna al bundle?
17. ¿El `grounding` sigue en opt‑in?
18. ¿La respuesta pasa por el extractor de JSON y por las funciones de normalización?
19. ¿Hay **revisión humana** antes de persistir?
20. ¿Los errores muestran el **body**, no solo el status?
21. Si tocaste `parsePriceListExcelFile`, ¿el wrapper de `PATCH v14-base` sigue andando?

**Release**
22. Bumpear `?v=` de cada archivo tocado. → skill `app-shell-release`.

---

## 10. Fuera de alcance

- **El % que se aplica** → skill `polinomica-ko`.
- **El AVE y el monto vigente** → skill `ave-ledger`.
- **Importar contratos y POs desde SAP** → skill `integracion-sap`.
- **La persistencia** → skill `supabase-datalayer`.
