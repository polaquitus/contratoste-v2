---
name: app-shell-release
description: >-
  El cascarón de la app y el proceso de release: navegación go(), registro de vistas, orden de
  los <script>, cache-busting ?v=, badge de versión y verificación post-deploy. Usar SIEMPRE al
  final de CUALQUIER modificación (el bump de ?v= es obligatorio), y antes de agregar un módulo,
  una vista o un atajo de teclado. Se dispara con: "nueva vista", "nuevo módulo", "agregar
  pantalla", "navegación", "go(", "hideAllViews", "cache", "no se ve el cambio", "sigue la
  versión vieja", "?v=", "bump de versión", "buildTag", "deploy", "CI", "test.yml",
  "GitHub Pages", "atajo de teclado", "09-patch".
---

# App shell y release

> **Regla de oro:** un cambio en `src/js/*.js` que **no** bumpea su `?v=` en `index.html` es un
> cambio que el usuario **no va a ver**. Esto explica por qué `index.html` cambió en **107 de
> los últimos 115 commits**.

---

## 1. Cache-busting — el paso que nunca se puede saltear

`index.html:13` (CSS) y `index.html:368-398` (JS) cargan cada módulo con su propio número:

```html
<link rel="stylesheet" href="src/css/main.css?v=112">
<script src="src/js/01-config.js?v=110"></script>
<script src="src/js/02-supabase-auth.js?v=111"></script>
<script src="src/js/03-utils.js?v=130"></script>
<script src="src/js/04-contracts.js?v=153"></script>
<script src="src/js/05-indices.js?v=130"></script>
<script src="src/js/06-licit-prov.js?v=113"></script>
<script src="src/js/07-polynomial.js?v=121"></script>
<script src="src/js/08-dashboard.js?v=108"></script>
<script src="src/js/09-patch.js?v=111"></script>
<script src="src/js/10-legales.js?v=2"></script>
<script src="src/js/11-word-gen.js?v=1"></script>
```

**Los contadores son independientes por archivo.** Tocaste `04-contracts.js` → subís **solo**
el de `04-contracts.js`. `src/js/vendor/docx.iife.js` va **sin** `?v=`.

### 1.1 — El badge de versión

- `index.html:34` — `<span class="ver" id="sbVerBadge">v187</span>`
- `index.html:64` — `<span class="bc" id="buildTag">v187-sap-header-reorg</span>`

Convención del `buildTag`: `v<N>-<slug-del-cambio>`. Subilo junto con el `?v=`.

### 1.2 — ✅ `buildTag` ya está resuelto — no lo rompas

Hasta `86d895b`, tres lugares pisaban el badge con `'v86-redesign'` hardcodeado. El fix
introdujo `_REAL_BUILD_TAG` (`03-utils.js:5`), que **lee el valor real de `index.html`** al
cargar, y los tres sitios lo consumen:

| Sitio | Usa |
|---|---|
| `03-utils.js:186` (dentro de `go('list')`) | `_REAL_BUILD_TAG` ✅ |
| `06-licit-prov.js:737` (`setVersionBadgeV14`) | `_REAL_BUILD_TAG` ✅ |
| `06-licit-prov.js:910` (header de Usuarios) | `_REAL_BUILD_TAG` ✅ |

Los `'v86-redesign'` que siguen apareciendo son **solo fallbacks** del `||`. No son un bug.

> `09-patch.js:339` (`patchVersionBadge`) engancha `renderDet` y `go` para re-escribir el badge
> en cada navegación. Si agregás un cuarto sitio que escriba `buildTag`, tiene que leer
> `_REAL_BUILD_TAG`, nunca un literal.

---

## 2. Registro de una vista — los 3 lugares

La lista de IDs de vista está **copiada tres veces**, y una no coincide con las otras dos:

| Archivo | Contenido |
|---|---|
| `03-utils.js:181` (`go`) | `vList, vForm, vDet, vMe2n, vMe2nDet, vIdx` — **6** |
| `06-licit-prov.js:911` (`hideAllViews` de Usuarios) | los 6 **+ `vUsersModule`, `vLegalesModule`** |
| `10-legales.js:662` (`hideAllViews` de Legales) | los 6 **+ `vUsersModule`, `vLegalesModule`** |

**Esta divergencia es exactamente el bug H‑05**: una lista desactualizada dejaba visible el
contenido de otro módulo al navegar. La estructura que lo permitió **sigue viva**.

### Para agregar una vista

1. Markup `<div id="vXxx">` en `index.html`.
2. Ítem `<a class="nv" data-mod="xxx" onclick="go('xxx')">` en la nav.
3. Rama `else if(v==='xxx')` en `go()` (`03-utils.js:180`).
4. **El id en los 3 arrays** de §2.
5. La clave `xxx` en `ROLE_DEFAULTS` (`06-licit-prov.js:762`) para **todos** los roles.
6. Chequeo de permiso en el **punto de entrada** del módulo, no solo en el menú.
7. Bump de `?v=` de cada archivo tocado.

`go()` maneja: la clase `.on` de la vista, `_navAct(mod)` (`03-utils.js:175`) para el resalte
del menú, el título `#pgT` y las acciones `#pgA`.

### Módulos vivos en v2

Tras el recorte `81fe665`: **Contratos (`list`), Nuevo (`form`), Purchase Orders (`me2n`),
Índices (`idx`), Usuarios (`users`)** + Legales.

Se fueron: Dashboard, Forecast, Alertas, Timeline, Licitaciones, Proveedores. Su código quedó
parcialmente en `08-dashboard.js` (229 líneas: solo el gráfico de índices) y `09-patch.js`
(953: parches + burn rate). **No los repongas sin pedirlo.**

---

## 3. El orden de los `<script>` es semántica

No hay bundler, ni módulos ES, ni imports. Todo son **globals en `window`**, y el orden numérico
**es** el grafo de dependencias:

```
01-config      → constantes, SB_URL, globales
02-supabase    → capa de datos + auth   (necesita 01)
03-utils       → go(), helpers, guardar(), _REAL_BUILD_TAG
04-contracts   → el módulo grande (+ integración SAP)
05..08         → índices, POs/importadores, polinómica, gráfico
09-patch       → PARCHES sobre lo anterior   ← tiene que ir último
10, 11         → legales, word-gen
```

### 3.1 — Hay DOS capas de parches, no una

| Capa | Ubicación | Qué redefine |
|---|---|---|
| `PATCH v14-base` + `PATCH v19` | **final de `06-licit-prov.js:734` y `:759`** | `openPriceListImportPicker`, `fN` (pisa la de `03-utils`), `parsePriceListExcelFile`, `isNumericCol`, y engancha `renderDet` / `go` |
| `09-patch.js` | archivo propio, carga después | `window.delAveById` (`09:290`), `window.delTarTable` (`09:304`), burn rate, atajos, búsqueda difusa |

Es fácil buscar un parche en `09-patch.js` y no encontrarlo porque vive al final de
`06-licit-prov.js`. **Buscá en los dos.**

Enganchan preservando la original:

```js
var __origRenderDet = renderDet;
renderDet = function(){ var out = __origRenderDet.apply(this, arguments); /* extra */ return out; };
```

> Si movés un archivo de lugar en el orden, **rompés los parches en silencio**. Nunca reordenes
> sin verificar cada redefinición.
>
> Cuando arregles algo que un parche cubre, preguntate si el arreglo va en el original o en el
> parche. Arreglar el original y dejar el parche encima **no cambia nada**.

---

## 4. Atajos de teclado

`initKeyboardShortcuts` (`09-patch.js:492`) instala atajos globales.

⚠️ `b6546b7` — **"los atajos de teclado globales se disparaban al escribir en el editor
enriquecido"**. Todo atajo nuevo tiene que ignorar eventos con foco en `input`, `textarea` o
`[contenteditable]`.

`closeAllModals` (`09:541`) cierra modales por Escape: si agregás un modal, registralo ahí.

---

## 5. Deploy y verificación

- No hay build. Lo que está en el repo **es** lo que se sirve.
- `index.html` manda `Cache-Control: no-cache, no-store, must-revalidate` por `<meta>` — por eso
  el HTML se refresca pero **los `.js` no**, y por eso existe el `?v=`.

### 5.1 — El CI: qué prueba y qué no

`.github/workflows/test.yml` corre en `branches: ["**"]` y desde `v188-fix-ci-y-num-nulo`:

1. **Sirve el árbol de ESTE commit** en `localhost:8080` (`python3 -m http.server`) y apunta el
   test ahí. Antes navegaba a `https://polaquitus.github.io/contratoste/` — la producción de
   **otro repo** — así que un push testeaba código ajeno y el verde no decía nada.
2. **Verifica que cada módulo declarado exista en el DOM antes de clickearlo**
   (`.github/scripts/smoke.js`, `MODULOS`). El test viejo clickeaba `dashboard` y `prov`, que ya
   no existen en v2, y lo reportaba como error de navegación en vez de como test desactualizado.
3. **Chequea el cache-busting**: falla si algún archivo de `src/` se carga sin `?v=`.
4. **Verifica NÚMEROS** — `.github/scripts/reglas-negocio.js`, 9 aserciones sobre las funciones
   reales de la app en el navegador. Corre **antes** del smoke: si un número está mal, no importa
   que navegue bien. Cada caso corresponde a un bug real y cita su regla en la skill que lo
   documenta.
5. **Sin `ADMIN_USER`/`ADMIN_PASSWORD`** hace todo lo anterior y saltea login y navegación
   avisando — en vez de fallar por una causa que no es del código.

### Qué cubren las 9 reglas

| Regla | Bug que previene |
|---|---|
| Ledger `= montoBase + Σpoly + Σowner`, idempotente | doble conteo `2026-07-22` |
| AVE negativo resta | H‑08 |
| Ko lineal: 50/50 con +10%/+20% → **15%** | H‑13 (la geométrica da 14.891%) |
| Ko con un componente sin dato → `null` | Ko parcial |
| Tarifario vigente al período, no el más nuevo | `f11eaff` |
| Todas las tablas de la generación | `5a15b0e` |
| Plazo inclusivo: ene→dic = 12 | mes corto |
| `superseded` excluida del cálculo | doble conteo de ajuste |
| Incidencias 60+30 no valida, 60+40 sí | H‑13 |

> **Cada test fue verificado en los dos sentidos**: pasa con el código correcto y **falla** con
> el bug inyectado. Un test que no puede fallar no sirve — si agregás uno, probalo igual.
>
> **Lo que el CI sigue sin cubrir:** todo lo que no esté en esas 9 reglas. Un verde no es
> "está todo bien", es "estas nueve se cumplen".
>
> Si recortás o agregás un módulo, actualizá `MODULOS` en `.github/scripts/smoke.js`.

---

## 6. Errores pasados en esta área

| Commit | Síntoma | Causa raíz |
|---|---|---|
| H‑05 `36601d8` | Contenido de otro módulo visible al navegar | Lista de vistas desactualizada en 1 de 3 copias |
| `b6546b7` | Atajos disparándose al escribir | Sin guarda de foco |
| `7b95bbe` | App trabada tras F5 | Carrera IIFE vs `DOMContentLoaded` → skill `supabase-datalayer` §3.7 |
| H‑06 `022b204` | La omnibúsqueda devolvía contratos sin relación | Fuzzy demasiado permisivo para IDs numéricos |
| H‑07 `022b204` | "por [object Object]" | `nowUser()` devolvía el objeto entero |
| `86d895b` | El badge saltaba de v187 a v86 | 3 literales hardcodeados → resuelto con `_REAL_BUILD_TAG` |
| `v188` | El CI probaba la producción de otro repo y clickeaba módulos inexistentes | Ver §5.1 |

---

## 7. Checklist de release — correr SIEMPRE al final

1. **¿Bumpeaste el `?v=` de cada archivo `src/` que tocaste?** ← el que más se olvida
2. ¿Subiste `sbVerBadge` y `buildTag` en `index.html` si el cambio es visible?
3. Si agregaste una vista: ¿los **3** arrays, `ROLE_DEFAULTS`, y el chequeo en el punto de
   entrada?
4. Si escribiste en `buildTag`: ¿usaste `_REAL_BUILD_TAG` y no un literal?
5. Si agregaste un atajo: ¿ignora inputs, textareas y `contenteditable`?
6. Si agregaste un modal: ¿está en `closeAllModals`?
7. Si tocaste algo que un parche cubre: ¿arreglaste el lugar correcto? (§3.1)
8. ¿Probaste **F5 estando logueado**?
9. ¿Alguna función global nueva quedó definida **después** de su primer uso?
10. Al reportar: **no cites el CI verde como prueba de nada** (§5.1).

---

## 8. Fuera de alcance

- **Persistencia, auth y permisos en detalle** → skill `supabase-datalayer`.
- **La integración con SAP** → skill `integracion-sap`.
