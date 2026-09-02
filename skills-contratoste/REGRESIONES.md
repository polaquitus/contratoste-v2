# Catálogo de regresiones — Contratos TA v2

Referencia compartida por las 7 skills de `/skills-contratoste`. **No es una skill**: un
catálogo no se dispara solo, se consulta. Cada skill lo cita desde su sección "Errores pasados".

**Cómo usarlo:** antes de tocar un área, leé sus filas acá. Un bug que ya pasó una vez tiene
todas las condiciones para volver a pasar — la causa raíz suele seguir viva.

Convención: **H‑NN** son los hallazgos del informe de QA de agosto 2026. **C‑N** son causas
estructurales todavía vivas. **N‑N** son hallazgos propios de v2.

> `contratoste-v2` comparte 252 de sus 261 commits con `contratoste`, así que casi todo este
> historial es común a las dos apps. Las 9 diferencias están marcadas.

---

## 1. Hallazgos de QA (H‑01 … H‑17)

| # | Síntoma | Causa raíz | Estado | Skill |
|---|---|---|---|---|
| **H‑01** | 2089 contratos reales (`SAP_CONTRACTS`) expuestos sin auth | Código muerto con datos reales en `01-config.js` | ✅ `36601d8`, `d22b64f` | `supabase-datalayer` |
| **H‑02** | ~120 nombres de personal legibles sin login | Datos en el HTML estático | ✅ `36601d8` — se pintan desde `authUnlock()` | `supabase-datalayer` |
| **H‑03** | F5 obligaba a re-loguearse | Sin persistencia de sesión | ⚠️ **Revertido a propósito** (`37fcef7`) | `supabase-datalayer` |
| **H‑05** | Contenido de otro módulo visible al navegar a Usuarios | `hideAllViews()` con lista desactualizada (1 de 3 copias) | ✅ `36601d8` — **la causa estructural sigue viva: ver C3** | `app-shell-release` |
| **H‑06** | La omnibúsqueda devolvía contratos sin relación | Fuzzy demasiado permisivo para IDs numéricos | ✅ `022b204` | `app-shell-release` |
| **H‑07** | "Última edición: … por [object Object]" | `nowUser()` devolvía `_APP_USER` entero | ✅ `022b204` | `app-shell-release` |
| **H‑08** | `+-50.000,00` en la columna Ajuste | `+` fijo por prefijo, sin mirar el signo | ✅ `7f71892` | `ave-ledger` |
| **H‑11** | "Calcular Ko" sin contrato seleccionado | — | ✅ moot: `calcularKo()` ya no existe en v2 | `polinomica-ko` |
| **H‑13** | Dos resultados de Ko distintos para el mismo contrato | 3 funciones con `Math.pow`, 2 con lineal | ✅ `5b5a386` — **4 implementaciones siguen separadas: C1** | `polinomica-ko` |
| **H‑16** | "Guardado correctamente" sobre una escritura fallida | Toast optimista antes de confirmar | ✅ `36601d8` | `supabase-datalayer` |
| **H‑17** | Datos viejos mostrados como actuales | Fallback silencioso a caché | ✅ `36601d8` | `supabase-datalayer` |
| **H‑09, H‑10, H‑15** | — | Pendientes de datos/esquema, **no son bugs de la app** | 📋 sin cambio de código | — |
| **H‑04, H‑12, H‑14** | — | No aparecen en ningún commit | ❓ sin registro | — |

---

## 2. Regresiones por área

### 2.1 — AVE / monto vigente → skill `ave-ledger`

| Commit | Síntoma | Causa raíz | Regla que lo previene |
|---|---|---|---|
| 2026‑07‑22 | Doble conteo de AVEs en el monto vigente | El total se **acumulaba** en vez de recalcularse | `monto = montoBase + Σpoly + Σowner` |
| 2026‑07‑22 | Tasa mensual mal encadenada | Promedio de todo el contrato | Encadenar desde la tarifa vigente al período |
| 2026‑07‑22 | Meses remanentes mal calculados | Base equivocada | Plazo **siempre en meses** |
| `2cdc9c5` | `saveAveOwner` cerraba el panel antes de confirmar | Optimismo | Confirmar → avisar |
| `2cdc9c5` | `undoValidationAic/Cc` tragaban el error | `catch` vacío | Todo `catch` avisa |
| `4ab1057` | Reset de enmiendas dejaba AVEs huérfanos | Borrado parcial | Cascada por `deleteAdjustedPeriods` |

### 2.2 — Polinómica / Ko → skill `polinomica-ko`

| Commit | Síntoma | Causa raíz |
|---|---|---|
| `1a491e7` | "No cumple" con el Ko combinado en +24% | Umbral exigido **por componente** en vez de sobre el Ko ponderado |
| `1a491e7` | "Cumple desde mar 2026" cuando eran 4 meses | Meses contados desde `fechaIni`, no desde el base elegido |
| `05e7fd2` | Gatillos A y C descartados por falta de datos de B | `return null` global cuando `countPoly === 0` |
| `ffee2bd` | Mano de Obra no autocompletaba | Faltaba resolución label→id |
| `c074895` | Proyección de fecha espuria en el gatillo Ko | La simulación no debe proyectar |
| `278e32a` | Mes de evaluación fijo en "hoy" | No era editable |
| `57f76d6` | El input de % manual desaparecía al cargar un valor | Se reemplazaba por texto fijo |

### 2.3 — Enmiendas / tarifarios → skill `enmiendas-y-tarifarios`

| Commit | Síntoma | Causa raíz |
|---|---|---|
| `5a15b0e` | El período de aplicación nunca traía la actualización correcta | Agrupar tarifarios **por nombre** en vez de por período |
| `f11eaff` | "Quitar items" mostraba precios que aún no regían | Se tomaba la versión más nueva, no la vigente al período |
| `5d40d6d` | Parecía haber varios tarifarios distintos | Terminología: "Tarifario" en vez de "Tabla" |
| `532deda` | El Word traía períodos de otra enmienda | Se leía el espejo de nivel superior en vez de `tramos[]` |
| `ed09b16` | Valores duplicados y sección "PRECIO" en cláusulas/scope | El doc no discriminaba por tipo |
| `d8a20c4` | No se veía desde cuándo rige el cambio | Faltaba separar emisión de aplicación |

### 2.4 — Índices → skill `indices-master`

| Commit | Síntoma | Causa raíz |
|---|---|---|
| 2026‑08‑11 | "Confirmar todos" dejaba filas en rojo | No limpiaba `needsReview` |
| 2026‑08‑10 | `esc()` cortaba atributos HTML con texto JSON | No escapaba comillas |
| 2026‑08‑10 | IPIM tomaba el rubro equivocado del CSV | Se elegía por **posición** en vez de por la columna explícita |
| 2026‑08‑10 | IPIM se desalineaba mes a mes | Se anclaba solo al principio |
| 2026‑08‑10 | Errores de Gemini indescifrables | Solo se mostraba el status, no el body |
| 2026‑08‑05 | FADEEAC detectaba mal el mes | El título del feed menciona más de uno |
| `a677aa3` | Falso "sin dato" en Actualizar todos | **El problema era el reporte, no el fetch** |
| 2026‑08‑04 | Datos auto-obtenidos entraban sin control | Faltaba validación → nace `validateIdxRow` |

### 2.5 — Shell / release → skill `app-shell-release`

| Commit | Síntoma | Causa raíz |
|---|---|---|
| `7b95bbe` | La app quedaba trabada tras F5 | La IIFE de `initApp()` corre durante el parseo, **antes** de `DOMContentLoaded`, que después llamaba `authLock()` incondicionalmente |
| `b6546b7` | Atajos globales disparándose al escribir | Sin guarda de foco |
| `86d895b` | El badge saltaba de v187 a v86 | 3 literales `'v86-redesign'` hardcodeados → resuelto con `_REAL_BUILD_TAG` |
| 2026‑07‑08 | Menú filtrado por rol pero el módulo alcanzable | Chequeo solo en la navegación |

### 2.6 — SAP → skill `integracion-sap` ⭐ propio de v2

| Commit | Síntoma / cambio | Nota |
|---|---|---|
| `a677aa3` | Proveedores colgaba con el padrón completo | O(n²) sin índice |
| `1ecacfa` | Entra la integración: campos, vendor autocompletado, export CSV | — |
| `dac71bc` | El N° de contrato ya no se pide al crear | **Introduce N1** (§4) |
| `528c547` | Vendor automático, N° bloqueado al crear | — |
| `4d955a2` | CSV al crear; N° asignado solo editable por OWNER/ADMIN | — |
| 2026‑08‑07 | Short Text ilegible en la tabla de POs | Columna sin valor de display |

---

## 3. Causas raíz que siguen vivas

Produjeron un bug que ya se arregló, pero **la condición que lo permitió sigue en el código**.
Son las candidatas más probables al próximo bug.

| # | Causa estructural | Evidencia en v2 | Bug que produjo |
|---|---|---|---|
| **C1** | Fórmula Ko en **4 implementaciones** sin función compartida | `07:117`, `07:274`, `07:631`, `04:2399` | H‑13 |
| **C2** | Derivación de `montoBase` copiada en **6 sitios** | `04:94,428,550,3067`, `07:763`, `09:754` | doble conteo 2026‑07‑22 |
| **C3** | Lista de IDs de vista copiada en **3 lugares**, una con distinto contenido | `03:181` (6 ids) vs `06:911` y `10:662` (8 ids) | H‑05 |
| **C4** | Mapa label→id de índices duplicado | `05:228`, `03:55` | `ffee2bd` |
| **C5** | Dos resolutores de "tarifario vigente al período" | `04:1892`, `04:1965` | `f11eaff` |
| **C6** | **Tres** rutas de escritura del ledger, inconsistentes | `04:2797` ✅, `04:2930` ⚠️, `07:182` ⚠️ | latente |
| **C7** | `checkConditions` (`07:62`) conserva la lógica pre‑`1a491e7` y sigue **exportada** | `07:83`, export en `07:206` | latente |
| **C8** | `computePoliDeltaPct` **no** filtra `needsReview`; `calculateUpdate` sí | `07:644` vs `07:137` | latente |
| **C10** | Dos capas de parches en lugares distintos | final de `06-licit-prov.js` + `09-patch.js` | confusión al buscar |

> **C9** (`buildTag` hardcodeado) fue **resuelto** en `86d895b` con `_REAL_BUILD_TAG`. Se deja
> anotado para que nadie reintroduzca un literal.

---

## 4. Hallazgos propios de v2

| # | Hallazgo | Detalle |
|---|---|---|
| **N1** 🔴 | **`c.num` puede ser `null` y sigue usándose como clave** | Desde `dac71bc` el contrato se crea sin número. `getConsumed(c.num)` → `ME2N[null]` → `undefined` → **el burn rate desaparece en silencio**. También afecta `ME2N[c.num]` (`04:798`, `04:1874`), el dedupe del import (`06:100`) y la validación de unicidad (`03:405`). Los 4 commits que introdujeron el ciclo **no auditaron esos sitios**. → skill `integracion-sap` §1.1 |
| **N2** 🔴 | **El CI prueba otra aplicación** | `.github/workflows/test.yml:80` navega a `https://polaquitus.github.io/contratoste/` — la producción del **otro repo**. Y clickea `data-mod='dashboard'` y `data-mod='prov'` (líneas 130‑131), módulos que **no existen** en el `index.html` de v2 (0 ocurrencias). El verde no significa nada. → skill `app-shell-release` §5.1 |
| **N3** 🟠 | **El esquema del CSV es un contrato con software externo** | Las 13 columnas de `exportContratoSap` las consume `SAP_Contract_Creator.hta`, que **no está en este repo**. Cambiar el orden lo rompe y no se puede arreglar desde acá. → skill `integracion-sap` §3 |

---

## 5. Riesgos de infraestructura

No son bugs de código y **ninguna skill los arregla**.

| # | Riesgo | Detalle |
|---|---|---|
| **I1** | **El CI prueba otra app** | Ver N2. Es el problema de infraestructura más grave y el más barato de arreglar. |
| **I2** | **Las Edge Functions no están en el repo** | `gemini-proxy` y `energia-proxy` existen solo desplegadas: sin fuente, sin versionado, sin revisión. Un cambio que las necesite **no se puede completar desde el repo**. |
| **I3** | **El `.hta` de SAP tampoco está** | Mismo problema, con el agravante de que el contrato de interfaz (el CSV) es implícito. |
| **I4** | **El `anon key` es público** | Servido sin auth. Origen de H‑01 y H‑02. Nada secreto puede vivir en el bundle. |
| **I5** | **Auth client-side** | `sha256Hex` contra `app_users`. La migración a Edge Function se preparó (`5a9ae26`) y se descartó (`2cdc9c5`). Sin RLS. |
| **I6** | **localStorage como fuente de verdad de facto** | 90 usos, 16 claves. Todo el estado del panel polinómico vive solo ahí. |
| **I7** | **Sin paginación** | `sbLoadTable` corta en 2000 filas, `consolidateIdxRows` en 500. Truncan **en silencio**. |

---

## 6. Cómo mantener este archivo

Cuando arregles un bug que valga la pena recordar:

1. Agregá la fila en la sección de área (§2), con **commit, síntoma y causa raíz** — la causa
   raíz es lo que sirve, el síntoma solo ayuda a encontrarla.
2. Si la condición que lo permitió **sigue en el código**, agregá o actualizá su fila en §3.
   Si la eliminaste, marcala como resuelta en vez de borrarla (como C9).
3. Si la skill del área no cubría el caso, agregá la regla ahí. Este catálogo registra; las
   skills previenen.
