---
name: integracion-sap
description: >-
  La integración con SAP en las dos direcciones — contratos y POs que entran desde ME3N/ME2N,
  CSV que sale hacia SAP_Contract_Creator.hta — y el ciclo de vida del N° de contrato, que SAP
  asigna después de crearlo. Usar SIEMPRE antes de tocar código que parsee un Excel de SAP,
  genere el CSV, lea o escriba c.num / sapVendor / sapMaterial, o use ME2N. Se dispara con:
  "SAP", "ME3N", "ME2N", "importar contratos", "Purchase Orders", "PO", "CSV", "HTA",
  "Contract Creator", "N° de contrato", "número de contrato", "vendor", "material",
  "burn rate", "consumido", "avance de obra", "Excel", "xlsx".
---

# Integración SAP

> **Regla de oro:** SAP es la **autoridad sobre el N° de contrato**. La app crea el contrato
> sin número, exporta un CSV, SAP lo crea y devuelve el número, y recién ahí se pega. Todo
> código que asuma que un contrato **siempre** tiene `num` está equivocado desde `dac71bc`.

---

## 1. El ciclo de vida del N° de contrato

```
1. Se carga el contrato en la app           → c.num = null
2. Se exporta el CSV                         exportContratoSap()   04:1681
3. SAP_Contract_Creator.hta crea el contrato en SAP (ME31K, como DRAFT)
4. SAP devuelve el N°
5. Se pega a mano en "N° Contrato SAP"       guardarSapContractNo() 04:1701
6. Ya asignado: SOLO OWNER/ADMIN puede cambiarlo
```

El `.hta` **no está en este repo** — es una herramienta externa de escritorio. El contrato entre
la app y el HTA es el **esquema de columnas del CSV** (§3). Si cambia de un lado, hay que
cambiarlo del otro, y del otro lado no se puede desde acá.

### 1.1 — ⚠️ `c.num` puede ser `null`, y sigue usándose como clave

Este es el riesgo más importante del área. `num` era la clave natural del contrato y todavía se
usa como tal en varios lugares, aunque ahora puede no existir:

| Sitio | Qué pasa con `num = null` |
|---|---|
| `getConsumed(c.num)` (`04:1732`) | `ME2N[null]` → `undefined` → devuelve `null`. **El burn rate desaparece en silencio** |
| `ME2N[c.num]` (`04:798`, `04:1874`) | No matchea ninguna PO |
| `window.DB.find(d => d.num === sc.num)` (`06:100`) | Dedupe del import ME3N |
| Validación de unicidad (`03-utils.js:405`) | Solo corre si `f_num` tiene valor |
| `esc(c.num)` en el listado (`04:31`) y el Dossier | Renderiza vacío |

`guardarSapContractNo` (`04:1701`) sí valida unicidad al asignar:

```js
if(val && window.DB.some(x => x.id!==id && x.num===val)){ toast('Ese N° ya está usado','er'); return; }
```

> **La clave real del contrato es `c.id`, no `c.num`.** Cuando escribas lógica nueva, usá `id`.
> Si necesitás `num` (porque cruzás con SAP o con POs), **manejá explícitamente el caso nulo** y
> decí en pantalla que el dato no está disponible — nunca lo dejes desaparecer en silencio.

### 1.2 — El permiso vive en el rol

```js
const isAdmin = ['OWNER','ADMIN'].includes(String(_APP_ROLE||'').toUpperCase());
if(c.num && !isAdmin){ toast('El N° ya está asignado — solo un admin puede modificarlo','er'); return; }
```

Un `num` **vacío** lo puede asignar cualquiera con acceso al detalle; **cambiarlo** una vez
asignado, solo OWNER/ADMIN. No relajes esa asimetría.

---

## 2. Los campos SAP del contrato

Se cargan en el form (bloque "Integración SAP", `index.html:268+`) y se guardan en `guardar()`
(`03-utils.js:487-489`):

| Campo | Cómo se completa | Obligatorio para exportar |
|---|---|---|
| `sapVendor` | **Automático** desde el Contratista (§4) — input `disabled` | ✅ sí |
| `sapMaterial` | Manual (ej. `4000066`) | ✅ sí |
| `sapCtype` | Manual, default `'CONT-U'` | no |
| `sapEng` · `sapCtrl` · `sapOwner` · `sapBuyer` | Manual, códigos SAP de persona | no |

> `guardar()` **no toca `sapContractNo`** — el N° se maneja solo por `guardarSapContractNo`
> (comentario explícito en `03-utils.js:485`). Si agregás el campo al form, rompés el ciclo.

---

## 3. Export CSV — el contrato con el HTA

`exportContratoSap` (`04-contracts.js:1681`). **13 columnas, en este orden exacto:**

```
id;num;vendor;material;qty;vstart;vend;ctype;eng;ctrl;owner;buyer;result
```

| Regla | Detalle |
|---|---|
| Separador | `;` — **no** coma |
| Fin de línea | `\r\n` — el HTA es Windows |
| Escapado | `_sapCsvCell` (`04:1676`): si el valor tiene `;`, `"` o `\n`, va entre comillas y las comillas internas se duplican (`""`) |
| `qty` | es `c.monto` (el monto vigente), no una cantidad |
| `result` | va **vacío**: lo completa el HTA |
| Validación previa | Sin `sapVendor` o sin `sapMaterial`, **aborta con toast** y no descarga nada |
| Nombre del archivo | `sap_contrato_<num o id>.csv` |

> **El orden de las columnas es el contrato de interfaz.** Agregar, quitar o reordenar una rompe
> el HTA, que no se puede tocar desde este repo. Si hace falta cambiarlo, decilo explícitamente
> y coordinalo con quien mantiene el `.hta`.

Se descarga con un `<a download>` + `URL.createObjectURL`, revocando el object URL a los 2 s.

---

## 4. Autocompletado del Vendor

`onContratistaChange` (`03-utils.js:649`) corre al elegir el Contratista y busca el código SAP en
**dos fuentes, en orden**:

1. `PROV_DB` — el proveedor cargado en la app, campo `vendorNum`.
2. `SAP_VENDORS` — el padrón importado de SAP, match **case-insensitive** por nombre.

Si no encuentra nada: deja el campo vacío y **avisa con un toast**. El input está `disabled`: el
usuario no lo puede completar a mano, así que un vendor no encontrado **bloquea el export**.

> Si agregás una fuente de vendors, agregala acá y respetá el orden: `PROV_DB` primero, porque
> es el dato que el usuario curó.

---

## 5. Importación desde SAP (dirección de entrada)

### 5.1 — ME3N: contratos — `processSapImportFile` (`06-licit-prov.js:55`)

**Detección de columnas por regex sobre el header, nunca por posición:**

```js
doc:    headers.findIndex(h => /Purchasing Document/i.test(h)),
vendor: headers.findIndex(h => /Name of Vendor/i.test(h)),
ini:    headers.findIndex(h => /Validity.*Start/i.test(h)),
tv:     headers.findIndex(h => /Target Val/i.test(h)),
...
```

SAP reordena columnas entre exports. ⚠️ `findIndex` devuelve `-1` si no encuentra la columna, y
`r[-1]` es `undefined` — **se degrada en silencio a campo vacío**. Si agregás una columna
obligatoria, validá que su índice sea `>= 0`.

**Agregación:** un ME3N trae **una fila por ítem**, no por contrato. Se agrupa por `Purchasing
Document` quedándose con la **primera** fila. Se saltean los `doc` vacíos o `'0'`.

El vendor viene como `"1021564 RAZON SOCIAL SA"` y se parte con `/^(\d+)\s+(.*)/` → `vendorNum`
+ `cont`.

**Dedupe — nunca se pisa lo existente:**

```js
const exists = window.DB.find(d => d.num === sc.num);
if (exists) { skipped++; return; }
```

Actualizar existentes tendría que ser una acción **separada y explícita**, nunca el
comportamiento por defecto.

**Los contratos importados nacen incompletos:** esqueleto entero (`poly:[]`, `tarifarios:[]`,
`enmiendas:[]`, `aves:[]`…) + `sapImport: true`, con badge **❌ Pendiente**.

> Al agregar un campo nuevo al contrato, agregalo también al esqueleto con su valor por defecto.
> Si no, los importados quedan con el campo `undefined` y explotan en el primer render.

**Fechas:** `parseExcelDate` (`06-licit-prov.js:141`), con el workbook leído como
`{cellDates:true, raw:false}`. No las parsees a mano: seriales numéricos y strings localizados
conviven en el mismo archivo. `plazo` sale de `monthDiffInclusive` — **en meses**.

### 5.2 — ME2N: Purchase Orders

Se cargan en el global `ME2N`, **indexado por N° de contrato**: `ME2N[c.num]`. De ahí salen:

- `getConsumed(contractNum)` (`04:1732`) — suma lo consumido. Devuelve **`null`** cuando no hay
  datos, **no `0`** — la distinción importa: `0` es "no consumió", `null` es "no sé".
- El burn rate y el % de avance de obra.
- `computeObraAvanceCert` (`04:3136`) — % de avance desde POs certificadas, con período
  editable. Devuelve `{pendientePct, avancePct, consumido, montoBase}`.

Cuando un AVE se genera con scope OBRA se guarda `obraAvanceSnapshot` con el % usado **y** el
automático, para poder auditar de dónde salió el número.

> `2026-08-07` separó **avance vs. adicionales** en los widgets: no son lo mismo y no se suman.

### 5.3 — Vendors

`importProvModal` **ya no existe** en v2: se fue con el módulo Proveedores en `81fe665`.
`SAP_VENDORS` sobrevive como fuente de datos para el autocompletado (§4).

---

## 6. Errores pasados en esta área

| Commit | Síntoma | Causa raíz |
|---|---|---|
| `a677aa3` | Proveedores colgaba con el padrón SAP completo | O(n²) sin índice. Al cruzar colecciones grandes, indexá con un `Map` |
| H‑01 `36601d8` | 2089 contratos SAP reales expuestos en el bundle | Datos de un import viejo quedaron hardcodeados |
| `2026-08-07` | Short Text ilegible en la tabla de POs | Columna sin valor de display |
| `dac71bc` … `4d955a2` | — | Los 4 commits que introdujeron el ciclo del N°. **Ninguno auditó los 5 sitios que usan `num` como clave** (§1.1) |

---

## 7. Checklist antes de dar por terminada una modificación

**N° de contrato**
1. ¿Tu código maneja `c.num === null`? ¿Muestra algo explícito en vez de desaparecer?
2. ¿Usaste `c.id` como clave, y `c.num` solo cuando cruzás con SAP o POs?
3. Si asignás o cambiás `num`, ¿validás unicidad y el permiso OWNER/ADMIN?

**Export CSV**
4. ¿Las **13 columnas** siguen en el mismo orden y con `;` y `\r\n`?
5. ¿Los valores pasan por `_sapCsvCell`?
6. ¿La validación de `sapVendor` y `sapMaterial` sigue abortando antes de descargar?
7. Si tuviste que cambiar el esquema, ¿avisaste que hay que tocar el `.hta`, que no está acá?

**Campos SAP**
8. ¿`guardar()` sigue sin tocar el N° de contrato?
9. Si agregaste una fuente de vendors, ¿respeta el orden `PROV_DB` → `SAP_VENDORS`?

**Import Excel**
10. ¿Las columnas se detectan por **regex sobre el header**, nunca por posición?
11. ¿Validás que el índice sea `>= 0` antes de usarlo?
12. ¿El dedupe **saltea** lo existente en vez de pisarlo?
13. Si agregaste un campo al contrato, ¿lo agregaste al esqueleto del import?
14. ¿Las fechas van por `parseExcelDate` y el plazo por `monthDiffInclusive`?

**POs**
15. ¿Distinguís `null` ("no sé") de `0` ("no consumió") al leer `getConsumed`?
16. ¿Algún cruce entre colecciones grandes quedó en O(n²)?

**Release**
17. Bumpear `?v=` de cada archivo tocado. → skill `app-shell-release`.

---

## 8. Fuera de alcance

- **El monto que va en `qty`** → skill `ave-ledger`.
- **Importar enmiendas o listas de precios (con IA o Excel)** → skill `enmiendas-y-tarifarios` §7.
- **La matriz de roles** → skill `supabase-datalayer` §4.
