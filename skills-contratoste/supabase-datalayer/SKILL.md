---
name: supabase-datalayer
description: >-
  Capa de datos contra Supabase: el esquema real de las tablas, el patrón JSON-en-columna-texto,
  __sbId, y las reglas de persistencia (confirmar antes de avisar, rollback, no usar localStorage
  como fuente de verdad). Usar SIEMPRE antes de tocar código que lea o escriba datos remotos, o
  que muestre un aviso de "guardado". Se dispara con: "Supabase", "sbFetch", "sbUpsertItem",
  "sbUpsertSingle", "sbLoadTable", "__sbId", "guardar", "persistir", "no se guardó", "SB_OK",
  "tabla contratos", "app_users", "RLS", "anon key", "login", "auth", "permisos", "roles".
---

# Capa de datos Supabase

> **Regla de oro:** el toast de éxito va **después** del `await`, dentro del `try`. Si el
> `catch` no avisa, la app le miente al usuario. Fue **H‑16** y **H‑17**, y volvió a pasar.

---

## 1. El esquema real

| Tabla | Forma | Se carga con |
|---|---|---|
| `contratos` | 1 fila por contrato | `sbLoadTable` |
| `contratistas` | 1 fila por proveedor | `sbLoadTable` |
| `me2n` | POs (Purchase Orders) | `sbLoadTable` |
| `indices` | **1 sola fila** con todo `IDX_STORE` | `sbLoadSingle` |
| `app_users` | usuarios + rol + matriz de permisos | `sbFetch` directo |

> `licitaciones` sigue existiendo en Supabase pero **el módulo se fue** con el recorte
> `81fe665`. El código que la lee está guardado tras `typeof LICIT_DB!=='undefined'`.

### 1.1 — Todas las tablas tienen el mismo par de columnas

```
id     — serial, PK
datos  — TEXT que contiene un JSON.stringify() del objeto entero
```

No hay columnas tipadas por dominio. **No existe validación de esquema del lado del servidor.**
Lo que la app escribe mal, se guarda mal.

### 1.2 — `__sbId`

Es el puente entre el objeto en memoria y su fila. Lo inyecta el loader:

```js
const o = JSON.parse(r.datos);  o.__sbId = r.id;    // sbLoadTable / sbLoadSingle
```

⚠️ **Asimetría real entre los dos upserts:**

| Función | ¿Quita `__sbId` del payload? |
|---|---|
| `sbUpsertSingle` (`02:42`) | ✅ Sí — `delete clean.__sbId` |
| `sbUpsertItem` (`02:23`) | ❌ **No** — serializa el objeto entero |

Por eso los contratos guardan un `__sbId` **redundante dentro** del JSON. Se autocorrige al
cargar, así que no rompe nada hoy — pero si escribís lógica que confíe en el `__sbId` **del
JSON** en vez del de la fila, vas a leer un valor viejo.

---

## 2. Las cuatro reglas de persistencia

### 2.1 — Confirmar antes de avisar

```js
// ✅ correcto
showLoader('Guardando…');
try {
  await sbUpsertItem('contratos', cc);
} catch(e) {
  hideLoader();
  toast('⛔ No se pudo guardar en Supabase. Recargá la página e intentá de nuevo.','er');
  return;                       // ← NO cierres el panel, NO digas que se guardó
}
hideLoader();
closePanel(); renderDet(); toast('Guardado','ok');
```

`guardar()`, `guardarEnm()` y `saveAveOwner()` **ya tuvieron** este bug.

### 2.2 — Rollback en la actualización optimista

Si actualizás `window.DB` antes de confirmar, el `catch` tiene que **revertir**: restaurar el
objeto previo, o removerlo del array si era un alta (H‑16, `36601d8`).

### 2.3 — Un fallo silencioso a caché es un fallo que hay que avisar

`loadProv()` absorbía las 3 estrategias fallidas con `console.warn` y caía a `localStorage`
**sin decir nada** (H‑17). Si caés a caché, **avisá con un toast**.

### 2.4 — `localStorage` es espejo, no fuente de verdad

Válido: espejar para no perder datos si Supabase falla, y cachear para performance.
**No válido:** leer de ahí como si fuera autoritativo.

⚠️ Estado de la deuda: **90 usos de `localStorage`, 16 claves**. Todo el estado del panel
polinómico (`pol_*`) vive **solo** ahí — no es multi‑dispositivo. Ver skill `polinomica-ko` §4.9.

Claves: `cta_v7` (contratos) · `cta_v5` (legacy) · `prov_v1` · `contr_v1` · `idx_v2` ·
`me2n_v1` · `cta_saved_filters` · `indicator_snapshots` · `obra_scope_sel_` · `pol_*` (7).

---

## 3. Trampas de la capa

### 3.1 — `sbUpsertItem` sale en silencio si no hay conexión

```js
async function sbUpsertItem(table, item) {
  if (!SB_OK) { return; }     // ← resuelve OK sin escribir nada
  ...
}
```

Un `await sbUpsertItem(...)` que **no lanza** no significa que se guardó. Chequeá `SB_OK`
explícitamente si el mensaje al usuario depende de eso.

### 3.2 — `sbFetch` lanza en cualquier `!r.ok`

```js
if (!r.ok) throw new Error(`${method} ${table} ${r.status}`);
```

El mensaje trae **solo el status**, no el body. Al diagnosticar un fallo remoto, logueá el body.

### 3.3 — Límites de paginación hardcodeados

`sbLoadTable` usa `limit=2000`; `consolidateIdxRows` usa `limit=500`. **No hay paginación.**
Pasado ese número, los datos se truncan **en silencio**.

### 3.4 — El `anon key` es público

Está en `01-config.js`, servido desde GitHub Pages sin auth. Todo lo que la app pueda leer, lo
puede leer cualquiera con la URL.

- **H‑01**: `SAP_CONTRACTS` (2089 contratos reales) estaba en `01-config.js` como código muerto.
- **H‑02**: ~120 nombres de personal en el HTML estático. Ahora se pintan **recién después del
  login** (`populatePersonnelSelects`, desde `authUnlock`).

> **Nunca metas datos reales de negocio en el bundle.** Si tiene que ser secreto, va detrás de
> una Edge Function con la key como secret del servidor.

### 3.5 — La migración de auth se descartó

`5a9ae26` preparó una Edge Function `auth-login`; `2cdc9c5` la descartó y borró `supabase/`.
**Supabase quedó tal cual, sin RLS ni Edge Functions de auth.** El login sigue siendo
client-side con `sha256Hex` (`02-supabase-auth.js:130`) contra `app_users`.

Un cambio de auth **requiere trabajo en el dashboard de Supabase**, no se resuelve desde el repo.

### 3.6 — La sesión NO persiste, por decisión explícita

`36601d8` (H‑03) la agregó, `7b95bbe` arregló el freeze, `37fcef7` la **revirtió entera** a
pedido del usuario. **No la reintroduzcas** sin pedirlo — y si se pide, leé §3.7 primero.

### 3.7 — ⚠️ La carrera de arranque de `initApp`

La IIFE que llama a `initApp()` (`02-supabase-auth.js:211`) al final del archivo corre
**sincrónicamente durante el parseo**, antes de `DOMContentLoaded`. El handler de
`DOMContentLoaded` llamaba `authLock()` incondicionalmente **después**, re-bloqueando la UI sin
que nada la desbloqueara: la app cargaba los datos por detrás y la pantalla quedaba trabada
(`7b95bbe`).

El fix vigente: el handler **no bloquea si la sesión ya se rehidrató** (`_APP_USER` seteado).
Cualquier cambio en el arranque tiene que respetar ese orden.

---

## 4. Roles y permisos

`ROLE_DEFAULTS` (`06-licit-prov.js:762`) — **7 módulos** tras el recorte de v2:

```js
OWNER / ADMIN     : list, form, detail, me2n, idx, users, legales   (todo)
ING_CONTRATOS     : list, form, detail, me2n
RESP_TECNICO      : list, detail, me2n
LEGALES           : list, detail, legales
SIN_ROL           : list, detail
```

- La matriz se **persiste en Supabase** (`app_users`) para que sea multi‑dispositivo.
- `OWNER` y `ADMIN` pasan por `forcePrivileged` — **no se les puede quitar acceso** por matriz.
  Es un safeguard contra dejarse afuera del sistema; no lo saques.
- `canAccess(mod)` (`06:838`) y `applyPermissions()` (`06:844`) filtran el menú.
- `applyRolePermissions()` (`02-supabase-auth.js:144`) corre al iniciar sesión.

⚠️ `fix(perms)` (`2026-07-08`) cerró un **bypass del módulo Usuarios**: ocultar el ítem del menú
no alcanza si la vista sigue siendo alcanzable. Todo módulo nuevo necesita el chequeo en el
**punto de entrada**.

> El rol también gobierna una regla de negocio nueva: **solo OWNER/ADMIN puede modificar un N°
> de contrato ya asignado** (`04-contracts.js:1703`). Ver skill `integracion-sap`.

---

## 5. Errores pasados en esta área

| Commit | Síntoma | Causa raíz |
|---|---|---|
| H‑16 `36601d8` | "Guardado" sobre una escritura fallida | Toast optimista antes de confirmar |
| H‑17 `36601d8` | Datos viejos mostrados como actuales | Fallback silencioso a caché |
| `2cdc9c5` | `guardarEnm`/`saveAveOwner` cerraban el panel antes de confirmar | idem |
| `2cdc9c5` | `undoValidationAic/Cc` tragaban el error | `catch` vacío |
| H‑01 `36601d8` | 2089 contratos reales expuestos sin auth | Datos en el bundle |
| H‑02 `36601d8` | ~120 nombres de personal expuestos | Datos en el HTML estático |
| H‑03 `7b95bbe` | App trabada tras F5 | Carrera IIFE vs. `DOMContentLoaded` |
| `2026-07-08` | Menú filtrado pero módulo alcanzable | Chequeo solo en navegación |

---

## 6. Checklist antes de dar por terminada una modificación

**Persistencia**
1. ¿El toast de éxito está **después** del `await`, dentro del `try`?
2. ¿El `catch` avisa con un toast de error explícito y **no** cierra el panel?
3. Si hay actualización optimista de `window.DB`, ¿el `catch` revierte?
4. ¿Se actualizó `updatedAt`?
5. ¿Chequeaste `SB_OK` si el mensaje depende de que realmente se haya escrito? (§3.1)

**Datos**
6. ¿`__sbId` viene de la fila y no del JSON? (§1.2)
7. ¿Ninguna lectura nueva trata `localStorage` como autoritativo?
8. Si caés a caché, ¿avisás?
9. ¿La colección puede pasar de 2000 filas? (§3.3)

**Seguridad**
10. ¿Agregaste datos reales de negocio al bundle? → **no lo hagas** (§3.4)
11. ¿Un módulo nuevo valida permisos en su **punto de entrada**, no solo en el menú?
12. ¿`OWNER`/`ADMIN` siguen sin poder quedarse sin acceso?

**Arranque**
13. Si tocaste `initApp`, login o logout, ¿probaste **F5 estando logueado**? (§3.7)

**Alcance**
14. Si el cambio necesita RLS o una Edge Function, ¿lo dijiste explícitamente? (§3.5)

**Release**
15. Bumpear `?v=` de cada archivo tocado. → skill `app-shell-release`.

---

## 7. Fuera de alcance

- **Navegación, vistas y cache-busting** → skill `app-shell-release`.
- **La tabla `indices` y su contenido** → skill `indices-master`.
- **El N° de contrato y su permiso** → skill `integracion-sap`.
