---
name: polinomica-ko
description: >-
  Fórmula polinómica de redeterminación de precios: el coeficiente Ko, las incidencias, los
  tres gatillos (A/CCT, B/variación, C/meses) y la evaluación de condiciones. Usar SIEMPRE
  antes de tocar código que calcule un %, un Ko, una variación acumulada o que decida si un
  contrato está en condiciones de actualizar tarifas. Se dispara con: "Ko", "polinómica",
  "fórmula polinómica", "incidencia", "redeterminación", "gatillo", "trigA/trigB/trigC",
  "variación acumulada", "período base", "mes de evaluación", "meses elegibles",
  "actualización de tarifas", "pctPoli", "computePoliDeltaPct", "PolUpdate".
---

# Polinómica y Ko — el coeficiente de ajuste

> **Regla de oro:** hay **una sola** fórmula de Ko en este sistema y es **lineal**.
> Si escribís `Math.pow` en un cálculo de Ko, estás reintroduciendo el bug **H‑13**.

---

## 1. La fórmula canónica

```
Ko = Σ  incᵢ × (1 + varᵢ% / 100)
```

- `incᵢ` — incidencia del componente *i*, guardada como **fracción** (`0.44` = 44%).
- `varᵢ%` — variación **acumulada** del índice entre el período base y el de evaluación.
- `Ko` es un **factor**, no un porcentaje. Con todo en cero, `Ko = 1` (Σinc = 1).
- El delta porcentual es `(Ko − 1) × 100`. El campo `pctPoli` guarda **la fracción**.

Los precios nuevos salen de `precio_viejo × Ko`.

### Las 4 implementaciones vivas

| Función | Archivo | Rol |
|---|---|---|
| `calculateUpdate` | `07-polynomial.js:117` | Cálculo de la actualización que se va a aplicar |
| `computePoliDeltaPct` | `07-polynomial.js:631` | Delta % entre dos períodos (paneles en vivo) |
| `computeConditionsResult` | `07-polynomial.js:274` | Evaluación de gatillos |
| `calcPolyTramo` | `04-contracts.js:2399` | % por tramo dentro del form de enmienda |

> Eran **5**: `calcularKo` (la Calculadora Ko suelta) se fue con el recorte de `09-patch.js`
> en `81fe665`. **No la repongas** sin pedirlo — sería una quinta copia de la misma fórmula.

**Si cambiás la fórmula, cambian las cuatro.** No existe una función compartida — es la deuda
central de esta área, y ya se pagó una vez.

---

## 2. Incidencias

| Regla | Detalle |
|---|---|
| **Se cargan como % (0‑100), se guardan como fracción (0‑1)** | La UI multiplica/divide por 100 (`03-utils.js:258`). Nunca guardes 44 donde va 0.44. |
| **Deben sumar exactamente 100%** | `calcP()` (`03-utils.js:256`) valida con tolerancia `< 0.5`. Desde H‑13 esto **bloquea el guardado**. |
| **Máximo 5 componentes** | El form tiene `p_i1..p_i5` / `p_n1..p_n5` / `p_b1..p_b5` hardcodeados. |
| Estructura | `contract.poly = [{idx, inc, base}]` — `idx` es el **label** del índice (`'IPIM GRAL'`, `'PP'`), no el id del catálogo. Ver §5. |

---

## 3. Los tres gatillos

Un contrato puede tener hasta tres disparadores. **Son independientes: se evalúa cada uno por
separado y alcanza con que uno se cumpla.**

| Gatillo | Campo | Qué evalúa | Sutileza |
|---|---|---|---|
| **A** — Mano de Obra / CCT | `contract.trigA` | ¿Hubo algún mes con variación > 0% en algún índice `cat:'mo'` de la fórmula, en el rango base→eval? | **No es un % acumulado.** Una paritaria es un **evento puntual**: el primer mes con aumento gatilla. |
| **B** — Variación acumulada | `trigB` + `trigBpct` | ¿El **Ko combinado** superó el umbral? | ⚠️ Se evalúa contra `koTotal`, **nunca componente por componente**. Ver §4.1. |
| **C** — Meses transcurridos | `trigC` + `trigCmes` | ¿Pasaron N meses desde el **período base elegido en el panel**? | ⚠️ **No** desde `fechaIni` ni desde `lastUpdateDate`. |

Implementación vigente: `computeConditionsResult` (`07-polynomial.js:274`).

---

## 4. Reglas no obvias y trampas activas

### 4.1 — ⚠️ El gatillo B se evalúa sobre el Ko total, no por componente

Bug real (`1a491e7`): la versión vieja exigía que **cada** componente superara el umbral. Con
FADEAAC al 44% de incidencia pero solo +5%, tumbaba la condición aunque el Ko combinado ya
estuviera en +24%. El gatillo contractual es sobre el **Ko ponderado total**.

Por eso la tabla de detalle **no muestra un ✓/○ por fila** — solo el aporte ponderado de cada
componente. Si agregás una columna de cumplimiento por componente, repetís el bug.

### 4.2 — ⚠️ `checkConditions` es código muerto con la lógica vieja adentro

`07-polynomial.js:62` conserva la implementación **anterior** al fix `1a491e7`. La línea exacta
es `07:83`:

```js
if(inc < conditions.allComponentsThreshold) allMet = false;   // ← el bug, tal cual
```

Está **exportada** en el API público de `PolUpdate` (`07:206`) pero **nadie la llama**
(verificado: los únicos hits son su definición y su export). Además lee de
`indicator_snapshots` en localStorage en vez de `IDX_STORE`.

> **No la uses.** La función correcta es `computeConditionsResult`. Borrarla del export es un
> candidato a limpieza, pero es un cambio de API pública: no lo hagas de arrastre.

### 4.3 — ⚠️ Filtrado inconsistente de `needsReview`

Un índice auto-obtenido que no pasó las validaciones de plausibilidad queda `needsReview: true`
(ver skill `indices-master`).

| Función | ¿Filtra `needsReview`? |
|---|---|
| `calculateUpdate` (`07:137,142,143`) | ✅ **Sí** — un dato sin revisar nunca entra a un AVE |
| `computePoliDeltaPct` (`07:644`) | ❌ **No** |

Consecuencia: el panel de condiciones en vivo puede decir **"cumple"** apoyándose en datos que
el cálculo real después va a rechazar. Si tocás `computePoliDeltaPct`, alineá el filtro.

### 4.4 — Dos modos de calcular la variación de un índice

En este orden:

1. **Modo `pct` compuesto** — si hay filas con `pct` en el rango: `acc = Π(1 + pctₘ/100)`.
   Aplica a IPC, IPIM, FADEEAC, MO.
2. **Fallback ratio de valores absolutos** — `valor_eval / valor_base`. Aplica a USD y
   combustible, que se cargan como nivel (`value`) y no como variación.
3. **Fallback `indicator_snapshots`** (solo `computePoliDeltaPct`) — vía
   `computeAccumulatedVariationPct` (`03-utils.js:150`).

> El acumulado del modo 1 es **compuesto** (multiplicativo entre meses). Eso **no** contradice
> la fórmula lineal: lo compuesto es cómo se acumula *un* índice a lo largo de los meses; lo
> lineal es cómo se **combinan los componentes** entre sí. Dos ejes distintos.

`computePoliDeltaPct` devuelve `null` si **algún** componente quedó sin dato. Es intencional: un
Ko parcial es peor que ningún Ko.

### 4.5 — Período base ≠ mes de evaluación, y ambos los define el usuario

- **Período base** — por defecto el último período tarifario ajustado; editable (botón "↺ Auto").
- **Mes de evaluación** — por defecto hoy; **editable** (`278e32a`).

El panel de simulación es **puro**: cambiar fechas para explorar hipótesis **no debe registrar
ni generar nada**. El flujo que sí aplica es `previewUpdate` → `openEligibleMonthsModal` →
`confirmApplyUpdate`.

### 4.6 — El % manual es solo para la simulación

Para componentes sin fuente automática (FADEAAC, IPC NQN) el panel permite tipear el %
acumulado a mano. Ese valor **solo alimenta la evaluación de condiciones** — nunca el Ko real
que aplica un ajuste de tarifa. Se guarda en `pol_manual_pct_<cid>`.

### 4.7 — Tasa mensual encadenada

`getCurrentMonthlyRate` (`04-contracts.js:2416`) parte de `montoBase / plazo` y compone
`(1 + pct)` de cada tramo ya guardado **en orden cronológico**. El % de una actualización se
aplica sobre la tarifa **realmente vigente** en ese momento, no sobre un promedio del contrato.
Excluye los tramos `superseded` y el `excludeNum`.

### 4.8 — El plazo siempre está en MESES

`total / plazo_meses`. Nunca dividas por días. Tras una extensión hay que resincronizar `plazo`
y `plazo_meses` con `monthDiffInclusive` **antes** de calcular cualquier mensual.

### 4.9 — Dónde vive el estado (⚠️ todo en localStorage)

| Clave | Contenido |
|---|---|
| `pol_cond_<cid>` | `{enabled, moThreshold, allComponentsThreshold, monthsElapsed, baseDate, lastUpdateDate, resetBase}` |
| `pol_live_base_<cid>` / `pol_live_eval_<cid>` | Período base y mes de evaluación del panel |
| `pol_manual_pct_<cid>` | % manuales por concepto |
| `pol_eval_result_<cid>` | Resultado de la evaluación en vivo |
| `pol_selected_months_<cid>` / `pol_selected_periods_<cid>` | Meses de ajuste elegidos |
| `obra_scope_sel_<cid>` | Scope OBRA elegido |
| `indicator_snapshots` | Snapshots de índices (fallback legacy) |

**Nada de esto se sincroniza con Supabase.** No es multi‑dispositivo y se pierde al limpiar el
navegador. `saveConditions` (`07:44`) hace un espejo parcial a `contract.gatillos` **B y C**
(no A) — la única parte que sí persiste. `getConditions` (`07:6`) lee localStorage primero y cae
a `migrateFromGatillos` (`07:20`) si no hay nada.

> Al leer condiciones **siempre** usá `PolUpdate.getConditions(cid)`. Leer `contract.gatillos`
> directo te da un subconjunto desactualizado.

`guardarEnm` limpia `pol_eval_result_` y `pol_selected_months_` al terminar, para forzar
recálculo desde la nueva base.

---

## 5. Labels vs. ids de índice

`contract.poly[].idx` guarda el **label** (`'IPIM GRAL'`, `'PP'`, `'USD DIVISA'`), no el id del
catálogo (`'ipim_gral'`, `'mo_pp'`, `'usd_div'`). La traducción está duplicada en dos mapas:

- `safeIdxRows` (`05-indices.js:225`) — usar **esta** en cálculos: no crea entradas vacías.
- `labelToIdxId` dentro de `getIndicatorSnapshots` (`03-utils.js:55`).

> **Nunca uses `idxRows()` en un cálculo polinómico.** Crea la entrada vacía si no existe y
> envenena el seed de `indicator_snapshots`.

---

## 6. Errores pasados en esta área

| Commit | Síntoma | Causa raíz | Regla |
|---|---|---|---|
| `5b5a386` (H‑13) | Dos resultados de Ko distintos para el mismo contrato | 3 funciones con `Math.pow`, 2 con lineal | §1 |
| `1a491e7` | "No cumple" con Ko combinado en +24% | Umbral exigido por componente | §4.1 |
| `1a491e7` | "Cumple desde mar 2026" cuando eran 4 meses, no 6 | Meses contados desde `fechaIni` | §3, gatillo C |
| `05e7fd2` | Gatillos A y C descartados al no haber datos de B | `return null` global cuando `countPoly === 0` | Cada condición evalúa independiente |
| `ffee2bd` | Mano de Obra no autocompletaba | Faltaba resolución label→id | §5 |
| `c074895` | Proyección de fecha espuria en el gatillo Ko | — | §4.5 |
| `278e32a` | Mes de evaluación fijo en "hoy" | No editable | §4.5 |
| `57f76d6` | El input de % manual desaparecía al cargar un valor | Se reemplazaba por texto fijo | §4.6 |

---

## 7. Checklist antes de dar por terminada una modificación

**Fórmula**
1. ¿Aparece `Math.pow` en algún cálculo de Ko? → **es un bug**, salvo que sea el acumulado
   compuesto de **un solo** índice a lo largo de los meses (§4.4).
2. Si cambiaste la fórmula, ¿tocaste las **4** implementaciones (§1)?
3. ¿`Ko` se trata como **factor** (≈1.xx) y no como porcentaje? ¿`pctPoli` guarda `Ko − 1`?

**Incidencias**
4. ¿Se leen como fracción y se muestran como %?
5. ¿La validación de suma 100% sigue **bloqueando** el guardado?

**Condiciones**
6. ¿El gatillo B se evalúa contra `koTotal` y no por componente? (§4.1)
7. ¿El gatillo C usa el `baseMonth` del panel?
8. ¿Cada gatillo se evalúa **independiente** — uno sin datos no anula a los otros?
9. ¿Usaste `computeConditionsResult` y **no** `checkConditions`? (§4.2)

**Datos**
10. ¿Usaste `safeIdxRows` y no `idxRows`? (§5)
11. Si tocaste `computePoliDeltaPct`, ¿filtra `needsReview` igual que `calculateUpdate`? (§4.3)
12. ¿El caso "algún componente sin dato" devuelve `null` en vez de un Ko parcial?

**Simulación vs. aplicación**
13. ¿La simulación quedó **pura** — sin escribir en el contrato ni generar AVEs? (§4.5)
14. ¿Los % manuales siguen sin poder alimentar un Ko real? (§4.6)

**Aritmética**
15. ¿Todo plazo en **meses**? ¿`plazo` y `plazo_meses` resincronizados tras una extensión?

**Release**
16. Bumpear `?v=` de cada archivo tocado. → skill `app-shell-release`.

---

## 8. Fuera de alcance

- **Qué se hace con el resultado** (el AVE, el monto vigente) → skill `ave-ledger`.
- **La enmienda y el tarifario que genera** → skill `enmiendas-y-tarifarios`.
- **De dónde salen los datos de índices** → skill `indices-master`.
