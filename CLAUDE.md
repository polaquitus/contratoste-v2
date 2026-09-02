# Contratos TA v2 — TotalEnergies Argentina

## Skills del proyecto — LEER PRIMERO

Antes de tocar código, cargá la skill del dominio correspondiente desde `skills-contratoste/`.
Documentan reglas de negocio no obvias, trampas activas y checklists de validación, cada una
construida sobre los bugs reales que ya ocurrieron en esa área.

| Skill | Cubre |
|---|---|
| `ave-ledger` | AVEs, `montoBase`, monto vigente, validaciones AIC/CC |
| `polinomica-ko` | Fórmula Ko, incidencias, gatillos A/B/C, condiciones |
| `enmiendas-y-tarifarios` | Enmiendas, tramos, scope, listas de precios, importación con IA |
| `indices-master` | `IDX_STORE`, fuentes automáticas, validación de plausibilidad |
| `supabase-datalayer` | Esquema, persistencia, auth, roles y permisos |
| `app-shell-release` | Navegación, vistas, cache-busting `?v=`, deploy, CI |
| `integracion-sap` | ME3N/ME2N, CSV para el HTA, **ciclo de vida del N° de contrato** |
| `REGRESIONES.md` | Catálogo de bugs pasados y causas raíz aún vivas (referencia) |

---

## Qué es este repo

`contratoste-v2` es un **fork de `contratoste`** que diverge en `d8a20c4` (26/08/2026).
Comparte 252 de sus 261 commits. Las diferencias:

1. **Recorte** (`81fe665`): la app quedó en **Contratos, Purchase Orders, Índices, Usuarios y
   Legales**. Se fueron Dashboard, Forecast, Alertas, Timeline, Licitaciones y Proveedores.
2. **Integración SAP** (`1ecacfa` … `4d955a2`): campos SAP, vendor autocompletado, export CSV
   hacia `SAP_Contract_Creator.hta`, y el N° de contrato asignado por SAP.

**Trabajar solo acá.** `contratoste` quedó como referencia histórica.

---

## Stack

- **Frontend:** HTML/CSS/JS sin build. `index.html` (745 líneas: shell + markup) +
  `src/js/01..11` + `src/css/main.css`
- **Backend:** Supabase (`https://upxsqroxbvzwudcaklvn.supabase.co`)
- **AI:** Gemini vía Edge Function `gemini-proxy` (key server-side)
- **CI:** `.github/workflows/test.yml` — sirve el commit en `localhost:8080` y corre
  `.github/scripts/reglas-negocio.js` (9 aserciones sobre números) + `smoke.js`

### Módulos (`src/js/`)

| Archivo | LOC | Contenido |
|---|---|---|
| `01-config.js` | 21 | `SB_URL`, `SB_KEY`, globales |
| `02-supabase-auth.js` | 410 | Capa Supabase (`sbFetch`, `sbUpsert*`), login, `initApp` |
| `03-utils.js` | 705 | `go()`, `guardar()`, `_REAL_BUILD_TAG`, autocompletado de Vendor |
| `04-contracts.js` | 3250 | Listado, Detalle, Dossier, **AVEs**, enmiendas, tarifarios, **SAP** |
| `05-indices.js` | 1749 | Master de Índices y sus fuentes |
| `06-licit-prov.js` | 942 | Import SAP, import IA de enmiendas, roles + `PATCH v14/v19` |
| `07-polynomial.js` | 1314 | `PolUpdate`, Ko, condiciones, doc de enmienda |
| `08-dashboard.js` | 229 | Solo el gráfico de índices (el resto se recortó) |
| `09-patch.js` | 953 | Parches, burn rate, atajos, búsqueda difusa, borrado en cascada |
| `10-legales.js` | 769 | Clausulado versionado (13 cláusulas) |
| `11-word-gen.js` | 135 | Generación de Condiciones Particulares |

**El orden numérico es el grafo de dependencias.** Todo son globals en `window`; no hay bundler
ni imports. `09-patch.js` **y** los bloques `PATCH v14/v19` al final de `06-licit-prov.js`
redefinen funciones ya definidas: reordenar rompe parches en silencio.

### Vistas

`vList`, `vForm`, `vDet`, `vMe2n`, `vMe2nDet`, `vIdx`, `vUsersModule`, `vLegalesModule`.

---

## Reglas críticas al modificar código

1. **NO romper funcionalidad existente** — solo cambios quirúrgicos y precisos.
2. **`plazo` siempre en meses** — `total / plazo_meses`, con `monthDiffInclusive`. Nunca días.
3. **Ko es lineal:** `Ko = Σ incᵢ × (1 + varᵢ%/100)`. `Math.pow` en un Ko es el bug H‑13.
4. **El monto se recalcula, no se acumula:** `monto = montoBase + Σave_poly + Σave_owner`.
5. **`c.num` puede ser `null`** — SAP lo asigna después. La clave real del contrato es `c.id`.
6. **Supabase es la única fuente de verdad.** `localStorage` es espejo, nunca autoritativo.
7. **Prioridad de índices:** `IDX_STORE` (live) > `IDX_OFFICIAL_SEED` (hardcodeado).
8. **Confirmar antes de avisar:** el toast de éxito va después del `await`, dentro del `try`.
   El `catch` avisa y revierte.
9. **Bumpear `?v=`** del archivo tocado en `index.html`. Sin eso, el cambio no se ve.
10. **Un dato con `needsReview` no entra a un cálculo de AVE.**
11. **Modularizar más es riesgoso** — no refactorizar sin aprobación explícita.

---

## Backend

### Tablas Supabase

Todas con el mismo par de columnas: `id` (serial) + `datos` (TEXT con un JSON). Sin esquema
tipado ni validación del lado del servidor.

| Tabla | Forma |
|---|---|
| `contratos`, `contratistas`, `me2n` | 1 fila por ítem |
| `indices` | **1 sola fila** con todo `IDX_STORE` |
| `app_users` | usuarios, rol y matriz de permisos |

`licitaciones` sigue en Supabase pero su módulo se recortó.

### Edge Functions

Referenciadas desde el código: `gemini-proxy` (2 usos) y `energia-proxy` (5 usos).

⚠️ **No están en este repo.** Existen solo desplegadas. Un cambio que las necesite no se puede
completar desde acá — decilo explícitamente.

### Software externo

`SAP_Contract_Creator.hta` consume el CSV de 13 columnas que genera `exportContratoSap`.
**Tampoco está en el repo**, y el esquema de columnas es un contrato de interfaz implícito.

---

## Índices

`IDX_CATALOG` (`05-indices.js:1`) — **18 índices**: 5 IPC · 3 IPIM · 1 combustible (`go_g3`) ·
1 USD (`usd_div`) · 8 Mano de Obra (`mo_pp`, `mo_pj`, `mo_uocra`, `mo_uocrayac`, `mo_com`,
`mo_cam`, `mo_uom10`, `mo_uom17`).

`usd_bill` está comentado a pedido del usuario; `go_g2` ya no existe. `ipim_r29` sigue en
`fetchMode:'manual'` porque la API de INDEC devuelve 400 para su serie.

```javascript
IDX_STORE = { ipc_nac: { rows: [{ym, pct, value, confirmed, source, needsReview, ...}] } }
```

### APIs

```
INDEC series:    https://apis.datos.gob.ar/series/api/series?ids={id}&format=json&start_date={ym}
INDEC CSV:       https://www.indec.gob.ar/ftp/cuadros/economia/indice_ipim.csv
ArgentinaDatos:  https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial
Energía CKAN:    resource_id histórico f8dda0d5-2a9f-4d34-b79b-4e63de3995df
                 resource_id vigentes  80ac25de-a44a-4445-9215-090cf55cfda5
                 → SIEMPRE vía energia-proxy (certificado SSL vencido en el origen)
FADEEAC:         https://www.fadeeac.org.ar/feed/
```

---

## Puntos ciegos conocidos

Detalle completo en `skills-contratoste/REGRESIONES.md` §3, §4 y §5.

1. **El CI prueba este commit y verifica números** — 9 reglas de negocio, cada una atada a un
   bug real (`reglas-negocio.js`). Lo que **no** cubre: todo lo que no esté en esas 9. Un verde
   significa "esas nueve reglas se cumplen y la app carga", no "está todo bien".
2. **`c.num` puede ser `null`** — SAP lo asigna después. Ya no desaparece en silencio (helpers
   `tieneNumSap`/`numLabel`/`numLabelText` en `03-utils.js:690-701`), pero **la clave real del
   contrato es `c.id`**: toda lógica nueva tiene que usar `id`.
3. **Edge Functions y el `.hta` fuera del repo** (arriba).
4. **`anon key` público** — servido sin auth. Nada secreto puede vivir en el bundle
   (origen de H‑01 y H‑02).
5. **Auth client-side** con `sha256Hex` contra `app_users`. Sin RLS. La migración a Edge
   Function se preparó y se descartó (`2cdc9c5`).
6. **`localStorage` como fuente de verdad de facto** — 90 usos, 16 claves. Todo el estado del
   panel polinómico vive solo ahí: no es multi‑dispositivo.
7. **Sin paginación** — `sbLoadTable` corta en 2000 filas, en silencio.
8. **Duplicaciones activas** — Ko en 4 implementaciones, `montoBase` en 6 sitios, lista de
   vistas en 3 (divergentes), mapa label→id en 2, resolutor de tarifario en 2.

---

## Archivos auxiliares

- `carga_gasoil.html` — carga Gas Oil vía `energia-proxy` + fallback Gemini

---

## Convenciones

- **Versión:** `index.html:34` (`sbVerBadge`) y `:64` (`buildTag`, formato `v<N>-<slug>`).
  Incrementar al hacer cambios visibles. Todo código que escriba `buildTag` debe leer
  `_REAL_BUILD_TAG` (`03-utils.js:5`), nunca un literal.
- **Cache-busting:** `?v=` independiente por archivo en `index.html:368-398`.
- **Commits:** en español, describiendo el *síntoma* y la *causa raíz*, no solo el archivo
  tocado. El historial es la principal fuente de contexto de este proyecto.
