const IDX_CATALOG = [
  // ── IPC ──────────────────────────────────────────────────────────
  {id:'ipc_nac',   name:'IPC Nacional (Nivel General)',   cat:'ipc', catLabel:'IPC', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'indec', seriesId:'148.3_INIVELNAL_DICI_M_26', pubDay:14, pubDelay:1},
  {id:'ipc_gba',   name:'IPC GBA (Nivel General)',        cat:'ipc', catLabel:'IPC', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'indec', seriesId:'148.3_INIVELGBA_DICI_M_21', pubDay:14, pubDelay:1},
  {id:'ipc_pat',   name:'IPC Patagonia (Nivel General)',  cat:'ipc', catLabel:'IPC', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'indec', seriesId:'148.3_INIVELNIA_DICI_M_27', pubDay:14, pubDelay:1},
  {id:'ipc_nqn',   name:'IPC NQN (Nivel General)',        cat:'ipc', catLabel:'IPC', src:'DPEyC NQN', srcLink:'https://www.estadisticaneuquen.gob.ar/series/', fetchMode:'manual', pubDay:12, pubDelay:1},
  {id:'ipc_nqnab', name:'IPC NQN (Alim. y Bebidas)',      cat:'ipc', catLabel:'IPC', src:'DPEyC NQN', srcLink:'https://www.estadisticaneuquen.gob.ar/series/', fetchMode:'manual', pubDay:12, pubDelay:1},
  // ── IPIM ─────────────────────────────────────────────────────────
  {id:'ipim_gral', name:'IPIM (Nivel General)',            cat:'ipim',catLabel:'IPIM', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'indec', seriesId:'448.1_NIVEL_GENERAL_0_0_13_46', directCsvUrl:'https://www.indec.gob.ar/ftp/cuadros/economia/indice_ipim.csv', pubDay:20, pubDelay:1},
  {id:'ipim_r29',  name:'IPIM R29 (Refinados Petróleo)',  cat:'ipim',catLabel:'IPIM', src:'INDEC', srcLink:'https://www.indec.gob.ar/indec/web/Nivel3-Tema-3-5', fetchMode:'manual', pubDay:20, pubDelay:1},
  {id:'fadeaac',   name:'FADEAAC (Equipo Vial)',           cat:'ipim',catLabel:'IPIM', src:'FADEAAC',srcLink:'https://www.fadeeac.org.ar/feed/', fetchMode:'fadeeac', pubDay:5, pubDelay:2},
  // ── Combustible ─────────────────────────────────────────────────
{id:'go_g3',     name:'Gas Oil Grado 3 YPF NQN',        cat:'fuel',catLabel:'Combustible', src:'YPF', srcLink:'https://www.ypf.com', fetchMode:'fuel', pubDay:15, pubDelay:1},
  // ── USD / Tipo de Cambio ─────────────────────────────────────────
  {id:'usd_div',   name:'USD DIVISA (TC Vendedor)',        cat:'usd', catLabel:'USD', src:'BCRA/BNA', srcLink:'https://www.bcra.gob.ar/PublicacionesEstadisticas/Tipos_de_cambio_v2.asp', fetchMode:'usd'},
  // usd_bill: a pedido del usuario, no se incorpora al catálogo automático
  // por ahora (implica desplegar un cambio más en energia-proxy). La función
  // idxFetchBnaBillete()/el bloque 'usd_billete' en runIdxUpdate quedan
  // armados y sin usar por si se retoma más adelante.
  // ── Mano de Obra — CCT ──────────────────────────────────────────
  {id:'mo_pp',     name:'Petroleros Privados (SINPEP)',    cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°396/04', src:'RRLL', srcLink:''},
  {id:'mo_pj',     name:'Petroleros Jerárquicos (ASIMRA)', cat:'mo', catLabel:'Mano de Obra', cct:'CCT N°644/12', src:'RRLL', srcLink:''},
  {id:'mo_uocra',  name:'UOCRA (Construcción General)',    cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°76/75',  src:'RRLL', srcLink:''},
  {id:'mo_uocrayac',name:'UOCRA Yacimiento',               cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°1024/16',src:'RRLL', srcLink:''},
  {id:'mo_com',    name:'Comercio (FAECYS)',               cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°130/75', src:'RRLL', srcLink:''},
  {id:'mo_cam',    name:'Camioneros (FCTA)',               cat:'mo',  catLabel:'Mano de Obra', cct:'CCT N°40/89',  src:'RRLL', srcLink:''},
  {id:'mo_uom10',  name:'UOM Rama N°10',                   cat:'mo',  catLabel:'Mano de Obra', cct:'UOM R°10',     src:'RRLL', srcLink:''},
  {id:'mo_uom17',  name:'UOM Rama N°17',                   cat:'mo',  catLabel:'Mano de Obra', cct:'UOM R°17',     src:'RRLL', srcLink:''},
];

// ── Paleta por categoría ───────────────────────────────────────────────
const CAT_CSS = {mo:'mo-c',ipc:'ipc-c',ipim:'ipim-c',fuel:'fuel-c',usd:'usd-c'};
const CAT_PILL = {mo:'mo',ipc:'ipc',ipim:'ipim',fuel:'fuel',usd:'usd'};

// ── Storage ────────────────────────────────────────────────────────────
// IDX_STORE = { [idxId]: { rows:[{ym,pct,confirmed,note,files:[{name,data}]}] } }
let IDX_STORE = {};
const IDX_OFFICIAL_SEED = {
  ipc_nac:[
    {ym:'2026-02',pct:2.9,value:null,publishedAt:'2026-03-12',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',note:'IPC Nacional (nivel general) oficial INDEC'},
    {ym:'2026-03',pct:3.4,value:null,publishedAt:'2026-04-14',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/uploads/informesdeprensa/ipc_04_26853171E136.pdf',note:'IPC Nacional (nivel general) oficial INDEC — publicado 14/04/2026'}
  ],
  ipc_gba:[
    {ym:'2026-02',pct:2.6,value:null,publishedAt:'2026-03-12',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',note:'IPC GBA (nivel general) oficial INDEC'},
    {ym:'2026-03',pct:3.4,value:null,publishedAt:'2026-04-14',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/uploads/informesdeprensa/ipc_04_26853171E136.pdf',note:'IPC GBA (nivel general) oficial INDEC — publicado 14/04/2026'}
  ],
  ipc_pat:[
    {ym:'2026-02',pct:3.0,value:null,publishedAt:'2026-03-12',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31',note:'IPC Patagonia (nivel general) oficial INDEC'},
    {ym:'2026-03',pct:2.5,value:null,publishedAt:'2026-04-14',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/uploads/informesdeprensa/ipc_04_26853171E136.pdf',note:'IPC Patagonia (nivel general) oficial INDEC — publicado 14/04/2026'}
  ],
  ipc_nqn:[
    {ym:'2026-02',pct:2.5,value:null,publishedAt:'2026-03-12',source:'DPEyC Neuquén',sourceUrl:'https://www.estadisticaneuquen.gob.ar/',note:'IPC Neuquén (nivel general) oficial DPEyC'},
    {ym:'2026-03',pct:3.5,value:null,publishedAt:'2026-04-14',source:'DPEyC Neuquén',sourceUrl:'https://www.estadisticaneuquen.gob.ar/static/archivos/Publicaciones/IPC/inf_IPCmarzo2026.pdf',note:'IPC Neuquén (nivel general) oficial DPEyC — publicado 14/04/2026'}
  ],
  ipim_gral:[
    {ym:'2026-02',pct:1.0,value:14296.33,publishedAt:'2026-03-17',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-32',note:'IPIM nivel general oficial INDEC'},
    {ym:'2026-03',pct:3.4,value:null,publishedAt:'2026-04-16',source:'INDEC',sourceUrl:'https://www.indec.gob.ar/uploads/informesdeprensa/ipm_04_265933E66B1D.pdf',note:'IPIM nivel general oficial INDEC — publicado 16/04/2026'}
  ],
  ipc_nqnab:[
    {ym:'2026-02',pct:3.1,value:null,publishedAt:'2026-03-12',source:'DPEyC Neuquén',sourceUrl:'https://www.estadisticaneuquen.gob.ar/series/',note:'IPC NQN Alimentos y Bebidas — DPEyC Neuquén'},
    {ym:'2026-03',pct:3.0,value:null,publishedAt:'2026-04-14',source:'DPEyC Neuquén',sourceUrl:'https://www.estadisticaneuquen.gob.ar/static/archivos/Publicaciones/IPC/inf_IPCmarzo2026.pdf',note:'IPC NQN Alimentos y Bebidas — DPEyC Neuquén — publicado 14/04/2026'}
  ],
  fadeaac:[
    {ym:'2026-02',pct:2.28,value:null,publishedAt:'2026-03-04',source:'FADEEAC',sourceUrl:'https://www.fadeeac.org.ar/',note:'Índice de costos FADEEAC oficial'},
    {ym:'2026-03',pct:10.15,value:null,publishedAt:'2026-04-01',source:'FADEEAC',sourceUrl:'https://www.fadeeac.org.ar/',note:'Índice de costos FADEEAC oficial'}
  ],
  // Camioneros (FCTA) — sin fuente pública automatizable (CCT N°40/89), cargado a
  // mano por el usuario a partir de la planilla oficial de valores base. pct
  // calculado a partir del "Valor Base" período a período (más preciso que el %
  // redondeado que muestra la planilla en pantalla).
  mo_cam:[
    {ym:'2024-03',pct:0.0,value:524435.34,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-04',pct:16.0,value:608344.99,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-05',pct:0.0,value:608344.99,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-06',pct:5.0,value:638762.24,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-07',pct:6.67,value:681346.39,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-08',pct:4.46,value:711763.64,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-09',pct:4.0,value:740234.18,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-10',pct:3.85,value:768704.74,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-11',pct:2.78,value:790057.64,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2024-12',pct:2.2,value:807438.91,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2025-01',pct:1.8,value:821972.81,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2025-02',pct:1.5,value:834302.4,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2025-03',pct:1.2,value:844314.02,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2025-04',pct:2.88,value:868630.27,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2025-05',pct:1.0,value:877316.58,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2025-06',pct:1.0,value:886089.74,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'},
    {ym:'2025-07',pct:6.36,value:942463.85,publishedAt:null,source:'RRLL',sourceUrl:null,note:'Camioneros (FCTA) CCT N°40/89 — carga manual'}
  ]
};
function ymCompare(a,b){return String(a||'').localeCompare(String(b||''));}
function idxResolveOfficial(def,targetYm){const rows=(IDX_OFFICIAL_SEED[def.id]||[]).slice().sort((a,b)=>ymCompare(a.ym,b.ym));if(!rows.length)return null;let chosen=null;for(const row of rows){if(ymCompare(row.ym,targetYm)<=0)chosen=row;}if(!chosen)chosen=rows[rows.length-1];return {ym:chosen.ym,pct:chosen.pct!=null?Number(chosen.pct):null,value:chosen.value!=null?Number(chosen.value):null,publishedAt:chosen.publishedAt||null,sourceUrl:chosen.sourceUrl||null,status:chosen.ym===targetYm?'updated':'waiting_release',note:(chosen.note||def.name)+(chosen.ym===targetYm?'':' · último oficial disponible'),source:chosen.source||def.src};}
function idxMergeOfficialSeeds(){
  Object.entries(IDX_OFFICIAL_SEED).forEach(([id,rows])=>{
    // SKIP USD indices - siempre usar datos de Supabase
    if(id === 'usd_div') return;

    (rows||[]).forEach(row=>{
      // Skip rows explicitly deleted by user
      if((IDX_STORE.__deleted?.[id]||[]).includes(row.ym))return;
      const existing=((IDX_STORE[id]||{}).rows||[]).find(r=>r.ym===row.ym);
      if(!existing){
        // Row no existe: agregar desde seed
        idxUpsert(id,{...row,confirmed:false,status:'updated'});
      } else {
        const needsUpdate=(existing.pct==null&&row.pct!=null)||(existing.value==null&&row.value!=null)||String(existing.publishedAt||'')<String(row.publishedAt||'');
        if(needsUpdate){
          // Seed gana para metadata; datos del usuario (pct/value/note) tienen prioridad
          idxUpsert(id,{
            ...row,
            ...existing,
            publishedAt: row.publishedAt||existing.publishedAt,
            sourceUrl: row.sourceUrl||existing.sourceUrl,
            confirmed: existing.confirmed??false,
            status:'updated'
          });
        }
      }
    });
  });
}
function loadIdx(){
  // No-op: IDX_STORE is loaded by initApp() from Supabase.
  // Called only as fallback from within initApp catch block (already handled there).
  idxMergeOfficialSeeds();
}
let _saveIdxBusy=false, _saveIdxPending=false;
// Devuelve true si quedó sincronizado en Supabase (o si no hay conexión y ni
// siquiera se intentó), false si Supabase rechazó la escritura — así el
// llamador puede avisar en vez de mostrar "guardado" cuando en realidad
// el cambio solo quedó en localStorage de esa pestaña.
async function saveIdx(){
  // Mirror to localStorage immediately (always safe)
  localStorage.setItem('idx_v2', JSON.stringify(IDX_STORE));
  if(!SB_OK) return true;
  // Serialize Supabase writes: if a save is in flight, mark pending and return.
  // The in-flight save will do another pass with the latest IDX_STORE data.
  if(_saveIdxBusy){ _saveIdxPending=true; return true; }
  _saveIdxBusy=true;
  try{
    await sbUpsertSingle('indices', IDX_STORE);
    // If another save was requested while we were writing, do one more pass
    while(_saveIdxPending){
      _saveIdxPending=false;
      localStorage.setItem('idx_v2', JSON.stringify(IDX_STORE));
      await sbUpsertSingle('indices', IDX_STORE);
    }
    return true;
  } catch(e){ console.warn('saveIdx SB error', e); return false; }
  finally{ _saveIdxBusy=false; }
}
async function resetIdxAll(){
  if(!confirm('Se van a borrar todos los indicadores cargados manualmente y se reconstruirá la base oficial inicial. ¿Continuar?'))return;
  try{localStorage.removeItem('idx_v2');}catch(_e){}
  IDX_STORE={};
  idxMergeOfficialSeeds();
  await saveIdx();
  _idxSel=null; renderIdxView(); toast('Indicadores reiniciados','ok');
}
async function consolidateIdxRows(){
  if(!SB_OK){toast('Sin conexión a Supabase','er');return;}
  if(!confirm('Se van a fusionar TODAS las filas duplicadas de la tabla indices en una sola, recuperando todos los períodos cargados. ¿Continuar?'))return;
  toast('Consolidando filas…','ok');
  try{
    // 1. Fetch ALL rows from indices table
    const allRows=await sbFetch('indices','GET',null,'?select=id,datos&order=id.asc&limit=500');
    if(!allRows.length){toast('Tabla vacía','er');return;}
    toast(`Procesando ${allRows.length} filas…`,'ok');

    // 2. Merge all rows: union of all periods per index, newest value wins for same ym
    const merged={};
    for(const row of allRows){
      let obj; try{obj=JSON.parse(row.datos);}catch(e){continue;}
      for(const [key,val] of Object.entries(obj)){
        if(key==='__sbId'||key==='__deleted')continue;
        if(!val||!Array.isArray(val.rows))continue;
        if(!merged[key])merged[key]={rows:[]};
        for(const r of val.rows){
          if(!r||!r.ym)continue;
          const existing=merged[key].rows.find(x=>x.ym===r.ym);
          if(!existing)merged[key].rows.push({...r});
          else Object.assign(existing,r); // later rows win (more complete data)
        }
      }
    }
    // Keep __deleted from latest row
    const latest=allRows[allRows.length-1];
    try{const o=JSON.parse(latest.datos);if(o.__deleted)merged.__deleted=o.__deleted;}catch(_e){}

    // Sort rows per index
    for(const key of Object.keys(merged)){
      if(key==='__deleted')continue;
      if(merged[key].rows)merged[key].rows.sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
    }

    // 3. Delete all rows except the last one (reuse its ID)
    const keepId=allRows[allRows.length-1].id;
    const toDelete=allRows.filter(r=>r.id!==keepId);
    toast(`Borrando ${toDelete.length} filas duplicadas…`,'ok');
    for(const r of toDelete){
      await sbFetch('indices','DELETE',null,`?id=eq.${r.id}`);
    }

    // 4. Save merged data to the kept row
    merged.__sbId=keepId;
    IDX_STORE=merged;
    await sbFetch('indices','PATCH',{datos:JSON.stringify(Object.fromEntries(Object.entries(merged).filter(([k])=>k!=='__sbId')))},`?id=eq.${keepId}`);
    localStorage.setItem('idx_v2',JSON.stringify(IDX_STORE));
    idxMergeOfficialSeeds();
    renderIdxView();
    toast(`✅ Consolidado: ${allRows.length} filas → 1 fila (ID ${keepId})`, 'ok');
  }catch(e){
    console.error('consolidateIdxRows',e);
    toast('Error al consolidar: '+e.message,'er');
  }
}
// NOTE: intentional no IIFE here — initApp() loads IDX_STORE from Supabase async.

function idxRows(id){
  if(!IDX_STORE[id]) IDX_STORE[id] = {rows:[]};
  return (IDX_STORE[id]||{}).rows||[];
}
// Igual que idxRows pero NO crea entradas vacías y resuelve labels (ej 'PP' → 'mo_pp')
// Usar en cálculos polinómicos para no envenenar el seed de indicator_snapshots
function safeIdxRows(code){
  var id=code;
  if(!IDX_STORE[id]||(IDX_STORE[id].rows||[]).length===0){
    var _lblMap={'PP':'mo_pp','UOCRA':'mo_uocra','COMERCIO':'mo_com','CAMIONEROS':'mo_cam',
      'UOM RAMA N°10':'mo_uom10','UOM RAMA N°17':'mo_uom17','USD DIVISA':'usd_div','USD BILLETE':'usd_bill',
      'FADEAAC':'fadeaac','GAS OIL G3 YPF NQN':'go_g3','GAS OIL G2 YPF NQN':'go_g2',
      'IPIM GRAL':'ipim_gral','IPC PATAGONIA':'ipc_pat','IPC NAC GRAL':'ipc_nac',
      'IPC NQN GRAL':'ipc_nqn','IPC NQN ALIM':'ipc_nqnab','IPC GBA GRAL':'ipc_gba','IPIM R29':'ipim_r29','IPIM REFINADOS':'ipim_r29'};
    var conv=_lblMap[String(code||'').trim()];
    if(conv&&IDX_STORE[conv]&&(IDX_STORE[conv].rows||[]).length) id=conv;
  }
  return (IDX_STORE[id]&&Array.isArray(IDX_STORE[id].rows))?IDX_STORE[id].rows:[];
}
function idxTargetYm(){const now=new Date();return new Date(now.getFullYear(),now.getMonth()-1,1).toISOString().substring(0,7);}
function idxPrevYm(ym){const [y,m]=String(ym||'').split('-').map(Number); if(!y||!m)return ''; return new Date(y,m-2,1).toISOString().substring(0,7);}
function idxLastBefore(id, ym){const rows=idxRows(id).filter(r=>String(r.ym||'')<String(ym)).sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));return rows.length?rows[rows.length-1]:null;}
let _idxBatchMode=false; // when true, idxUpsert skips saveIdx (caller must call saveIdx manually)
async function idxUpsert(id,row){
  if(!IDX_STORE[id])IDX_STORE[id]={rows:[]};
  if(!Array.isArray(IDX_STORE[id].rows))IDX_STORE[id].rows=[];
  const rows=IDX_STORE[id].rows;
  const pos=rows.findIndex(r=>r.ym===row.ym);
  const merged={...(pos>=0?rows[pos]:{}),...row};
  if(pos>=0)rows[pos]=merged;else rows.push(merged);
  rows.sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
  if(!_idxBatchMode)await saveIdx();
  return merged;
}
function idxValueLabel(def,row){if(!row)return '—';if(def.cat==='usd')return row.value!=null?fN(row.value):'—';return pctStr(row.pct);}
function idxStatusText(id){
  const target=idxTargetYm();
  const def=IDX_CATALOG.find(d=>d.id===id);
  const exact=idxRows(id).find(r=>r.ym===target);
  if(exact)return exact.status==='fallback'?'Fallback '+formatMonth(exact.ym):'Actualizado '+formatMonth(exact.ym);
  const prev=idxLastBefore(id,target);
  // El seed oficial (IDX_OFFICIAL_SEED) es una lista hardcodeada que se
  // queda vieja apenas se cargan datos más nuevos por API/CSV — solo lo
  // mostramos si es realmente más reciente que la última fila cargada,
  // para no decir "Último oficial Mar-26" cuando ya hay datos de May-26.
  if(def){
    const official=idxResolveOfficial(def,target);
    if(official&&official.ym&&(!prev||official.ym>prev.ym))return 'Último oficial '+formatMonth(official.ym);
  }
  return prev?('Último disponible '+formatMonth(prev.ym)):'Sin ejecutar';
}
// Traduce el status interno (usado para lógica de fallback) a un texto
// legible para la columna "Nota" cuando no hay note propio — antes se
// mostraba el código interno tal cual ("updated"), confuso para el usuario.
function idxStatusLabel(status){
  const map={updated:'Actualizado automáticamente', fallback:'Usando último valor publicado', waiting_release:'Pendiente de publicación oficial'};
  return map[status]||status||'';
}
// Last business day (Mon-Fri) of the given YYYY-MM month
// ── Argentine holiday calendar ────────────────────────────────────────
function _easterDate(y){
  // Anonymous Gregorian algorithm
  const a=y%19,b=Math.floor(y/100),c=y%100,d2=Math.floor(b/4),e=b%4,
    f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
    h=(19*a+b-d2-g+15)%30,i=Math.floor(c/4),k=c%4,
    l=(32+2*e+2*i-h-k)%7,m2=Math.floor((a+11*h+22*l)/451),
    mo=Math.floor((h+l-7*m2+114)/31),dy=((h+l-7*m2+114)%31)+1;
  return new Date(y,mo-1,dy);
}
function _isoDate(d){return d.toISOString().substring(0,10);}
function _addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function _trasladable(y,mmdd){
  // Argentine rule: Tue/Wed → previous Monday; Thu/Fri → following Monday
  const d=new Date(`${y}-${mmdd}`);
  const wd=d.getDay();
  if(wd===2||wd===3) d.setDate(d.getDate()-(wd-1));   // → Monday before
  else if(wd===4||wd===5) d.setDate(d.getDate()+(8-wd)); // → Monday after
  return _isoDate(d);
}
function argHolidays(y){
  const h=new Set();
  // Inamovibles (same date every year regardless of weekday)
  ['01-01','03-24','04-02','05-01','05-25','06-20','07-09','12-08','12-25']
    .forEach(md=>h.add(`${y}-${md}`));
  // Trasladables (observed on nearest Monday)
  ['08-17','10-12','11-20'].forEach(md=>h.add(_trasladable(y,md)));
  // Semana Santa y Carnaval (based on Easter)
  const easter=_easterDate(y);
  h.add(_isoDate(_addDays(easter,-48))); // Carnaval lunes
  h.add(_isoDate(_addDays(easter,-47))); // Carnaval martes
  h.add(_isoDate(_addDays(easter,-3)));  // Jueves Santo
  h.add(_isoDate(_addDays(easter,-2)));  // Viernes Santo
  return h;
}
function idxLastBizDayOfMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  const holidays=argHolidays(y);
  let d=new Date(y,m,0); // last calendar day of month
  while(d.getDay()===0||d.getDay()===6||holidays.has(_isoDate(d)))
    d.setDate(d.getDate()-1);
  return d;
}
// ── IPC Nacional vía ArgentinaDatos — fetch directo desde el navegador, sin
// proxy (mismo dominio ya usado y probado para USD DIVISA/BILLETE). El mirror
// oficial de INDEC en apis.datos.gob.ar suele quedar 1-3 semanas atrás de la
// publicación real; este proyecto community (mismo que ya alimenta el dólar
// oficial acá) reporta el IPC Nacional actualizado más rápido. Solo cubre el
// nivel general Nacional — GBA/Patagonia siguen por la vía INDEC existente.
async function idxFetchIpcArgentinaDatos(ym){
  const r=await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion');
  if(!r.ok) throw new Error('ArgentinaDatos inflacion '+r.status);
  const data=await r.json();
  if(!Array.isArray(data)) throw new Error('ArgentinaDatos inflacion: respuesta inesperada');
  const rows=data
    .filter(x=>x&&x.fecha&&x.valor!=null)
    .map(x=>({ym:String(x.fecha).substring(0,7), pct:Number(x.valor)}))
    .filter(r=>r.ym&&isFinite(r.pct)&&r.ym<=ym)
    .sort((a,b)=>a.ym.localeCompare(b.ym));
  if(!rows.length) throw new Error('ArgentinaDatos inflacion: sin datos ≤ '+ym);
  return rows;
}
async function fetchUsdBnaLike(targetYm){
  // Rule: rate for month X = last business day of month X.
  // If month X is not yet complete (today < last biz day of X), fall back to
  // the previous month's last business day and store under that month's ym.
  const lbd=idxLastBizDayOfMonth(targetYm);
  const today=new Date(); today.setHours(0,0,0,0);
  let effectiveYm=targetYm, cutoffDate=lbd;
  if(lbd>=today){
    // Month not closed yet — use previous month
    const [ty,tm]=targetYm.split('-').map(Number);
    let py=ty, pm=tm-1; if(pm<1){pm=12;py--;}
    effectiveYm=`${py}-${String(pm).padStart(2,'0')}`;
    cutoffDate=idxLastBizDayOfMonth(effectiveYm);
  }
  const cutoffIso=cutoffDate.toISOString().substring(0,10);
  // Try /dolares/oficial (BNA divisa vendedor)
  try {
    const r=await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial');
    if(r.ok){
      const data=await r.json();
      if(Array.isArray(data)){
        let arr=data.filter(x=>x&&x.fecha&&x.fecha<=cutoffIso&&x.fecha.startsWith(effectiveYm));
        if(!arr.length) arr=data.filter(x=>x&&x.fecha&&x.fecha<=cutoffIso);
        arr.sort((a,b)=>a.fecha.localeCompare(b.fecha));
        const last=arr[arr.length-1];
        if(last&&(last.venta||last.sell))
          return {ym:effectiveYm,value:Number(last.venta||last.sell),source:'BNA Oficial (divisa)',publishedAt:String(last.fecha).substring(0,10)};
      }
    }
  } catch(e){ console.warn('fetchUsdBnaLike oficial',e); }
  // Fallback: generic endpoint
  try {
    const r=await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares');
    if(r.ok){
      const data=await r.json();
      if(Array.isArray(data)){
        let arr=data.filter(x=>x&&x.fecha&&x.fecha<=cutoffIso&&/nacion|bna/i.test(String(x.casa||'')));
        arr.sort((a,b)=>a.fecha.localeCompare(b.fecha));
        const last=arr[arr.length-1];
        if(last&&(last.venta||last.sell))
          return {ym:effectiveYm,value:Number(last.venta||last.sell),source:'BNA (divisa)',publishedAt:String(last.fecha).substring(0,10)};
      }
    }
  } catch(e){ console.warn('fetchUsdBnaLike fallback',e); }
  throw new Error('No se pudo obtener USD DIVISA — intentá manualmente');
}
// Histórico COMPLETO de USD DIVISA (BNA oficial vendedor) — misma fuente y
// regla que fetchUsdBnaLike (última cotización disponible por mes), pero
// procesa TODO el dataset que devuelve la API en vez de filtrar a un solo
// mes, para poder rellenar huecos históricos grandes (ej. backfill desde
// 2023) en un solo pedido, igual que ya hacen IPIM/IPC con _allRows.
async function fetchUsdBnaLikeAll(uptoYm){
  const r=await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial');
  if(!r.ok) throw new Error('ArgentinaDatos dolares/oficial '+r.status);
  const data=await r.json();
  if(!Array.isArray(data)||!data.length) throw new Error('ArgentinaDatos dolares/oficial: respuesta vacía');
  const byMonth={};
  data.filter(x=>x&&x.fecha&&(x.venta!=null||x.sell!=null)).forEach(x=>{
    const ym=String(x.fecha).substring(0,7);
    if(ym>uptoYm) return;
    if(!byMonth[ym]||x.fecha>byMonth[ym].fecha) byMonth[ym]={fecha:x.fecha, value:Number(x.venta??x.sell)};
  });
  const rows=Object.entries(byMonth).map(([ym,v])=>({ym,value:v.value,publishedAt:v.fecha})).sort((a,b)=>a.ym.localeCompare(b.ym));
  if(!rows.length) throw new Error('Sin datos USD DIVISA ≤ '+uptoYm);
  return rows;
}
// ── USD BILLETE (BNA, efectivo) ───────────────────────────────────────
// No hay API pública para esto (a diferencia de USD DIVISA, que sí tiene
// ArgentinaDatos) — Billete es específicamente la cotización de EFECTIVO
// de BNA, distinta de Divisa (transferencia), y solo la publica el propio
// BNA en su cotizador. Usa el endpoint de "Descarga por rango de fechas"
// del cotizador histórico (bna.com.ar/Cotizador/DescargarPorFecha),
// formato confirmado con un archivo real descargado por el usuario:
// CSV separado por ";", encabezado "Moneda;Fecha cotizacion;Compra;Venta;",
// fecha D/M/YYYY sin ceros, decimales con coma. idMonedaDescarga=22 es el
// código de Dólar U.S.A. en el sitio de BNA.
// El formulario de descarga incluye un __RequestVerificationToken (anti-CSRF
// de ASP.NET) que acá NO se manda — si el endpoint lo exige para este pedido
// GET de solo lectura, va a fallar y quedará visible el motivo real en la
// Nota (mismo patrón que el resto de los fetches de esta sesión) para poder
// ajustarlo con el error real en vez de adivinar.
async function idxFetchBnaBillete(ym){
  const [ty,tm]=String(ym).split('-').map(Number);
  const desde=new Date(ty||2023, (tm||1)-1-48, 1);
  const hoy=new Date();
  const fmtDmy=d=>d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
  const url='https://www.bna.com.ar/Cotizador/DescargarPorFecha?idMonedaDescarga=22&fechaDesde='+encodeURIComponent(fmtDmy(desde))+'&fechaHasta='+encodeURIComponent(fmtDmy(hoy))+'&id=billetes';
  const r=await fetch(`${SB_URL}/functions/v1/energia-proxy`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+SB_KEY},
    body:JSON.stringify({url})
  });
  const raw=await r.text();
  if(!r.ok) throw new Error('energia-proxy '+r.status+' — '+raw.slice(0,200));
  let text=raw, parsedJson=null;
  try{ parsedJson=JSON.parse(raw); }catch(_e){ /* raw ya es el CSV plano */ }
  if(parsedJson && typeof parsedJson==='object'){
    if(parsedJson.success===false) throw new Error('energia-proxy rechazó la URL: '+((parsedJson.error&&parsedJson.error.message)||JSON.stringify(parsedJson).slice(0,200)));
    text=(parsedJson.result&&(parsedJson.result.text||parsedJson.result.body))||parsedJson.body||parsedJson.text||raw;
  }
  if(typeof text!=='string') throw new Error('Respuesta CSV no reconocida');
  const trimmed=text.trim();
  if(!trimmed) throw new Error('BNA devolvió una respuesta vacía (¿requiere token de sesión que no se está enviando?)');
  if(/^\s*<(!doctype|html)/i.test(trimmed)) throw new Error('BNA no devolvió el CSV (parece HTML — posible error de sesión/token o página de error)');
  const lines=trimmed.split(/\r?\n/).filter(l=>l.trim());
  const dataLines=lines.slice(1); // header: Moneda;Fecha cotizacion;Compra;Venta;
  const dateRe=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const byMonth={};
  for(const line of dataLines){
    const cols=line.split(';').map(c=>c.trim());
    if(cols.length<4) continue;
    const m=cols[1].match(dateRe);
    if(!m) continue;
    const [,d,mo,y]=m;
    const rowYm=y+'-'+mo.padStart(2,'0');
    if(rowYm>ym) continue;
    const venta=Number(cols[3].replace(',','.'));
    if(!isFinite(venta)) continue;
    const fechaIso=y+'-'+mo.padStart(2,'0')+'-'+d.padStart(2,'0');
    if(!byMonth[rowYm]||fechaIso>byMonth[rowYm].fechaIso) byMonth[rowYm]={fechaIso,venta};
  }
  const rows=Object.entries(byMonth).map(([rym,v])=>({ym:rym,value:v.venta,publishedAt:v.fechaIso})).sort((a,b)=>a.ym.localeCompare(b.ym));
  if(!rows.length) throw new Error('No se pudieron extraer filas del CSV de BNA (formato inesperado)');
  return rows;
}
// ── Next-month helpers ────────────────────────────────────────────────
function idxNextYm(id){
  const rows=idxRows(id);
  if(!rows.length){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
  const last=rows[rows.length-1].ym;
  const d=new Date(last+'-01');d.setMonth(d.getMonth()+1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function idxIsUpToDate(id){
  const target=idxTargetYm();
  return idxRows(id).some(r=>String(r.ym||'')>=target);
}

// Returns {date:'YYYY-MM-DD', daysLeft:N} for the next expected publication, or null
function idxNextPubDate(def){
  if(!def||!def.pubDay) return null;
  const rows=idxRows(def.id);
  const lastRow=rows.length?rows[rows.length-1]:null;
  if(!lastRow) return null;
  const [ly,lm]=lastRow.ym.split('-').map(Number);
  // next reference period = last known + 1 month
  let refM=lm+1,refY=ly;
  if(refM>12){refM=1;refY++;}
  // publication date = refPeriod + pubDelay months, on pubDay
  let pubM=refM+(def.pubDelay||1),pubY=refY;
  while(pubM>12){pubM-=12;pubY++;}
  const dateStr=`${pubY}-${String(pubM).padStart(2,'0')}-${String(def.pubDay).padStart(2,'0')}`;
  const today=new Date(); today.setHours(0,0,0,0);
  const pubDate=new Date(dateStr+'T00:00:00');
  const daysLeft=Math.round((pubDate-today)/(1000*60*60*24));
  return {date:dateStr, daysLeft, label:formatMonth(`${refY}-${String(refM).padStart(2,'0')}`)};
}

function idxPubBadge(def){
  const p=idxNextPubDate(def);
  if(!p) return '';
  let color,icon,text;
  if(p.daysLeft<=-8){color='#c0392b';icon='⚠️';text='Retrasada '+Math.abs(p.daysLeft)+'d';}
  else if(p.daysLeft<0){color='#e67e22';icon='🟠';text='Pendiente '+Math.abs(p.daysLeft)+'d';}
  else if(p.daysLeft===0){color='#c0392b';icon='🔴';text='Publica HOY';}
  else if(p.daysLeft<=3){color='#c0392b';icon='🔴';text='en '+p.daysLeft+'d';}
  else if(p.daysLeft<=10){color='#e67e22';icon='🟡';text='en '+p.daysLeft+'d';}
  else if(p.daysLeft<=20){color='#27ae60';icon='🟢';text='en '+p.daysLeft+'d';}
  else{color='var(--g500)';icon='📅';text='en '+p.daysLeft+'d';}
  const tooltip=`Próx. pub. ${p.label}: ${p.date} (${p.daysLeft>=0?'en '+p.daysLeft+' días':Math.abs(p.daysLeft)+' días de retraso'})`;
  return `<span title="${tooltip}" style="font-size:10px;color:${color};white-space:nowrap;cursor:default;font-weight:600">${icon} ${text} <span style="font-weight:400;color:var(--g500)">(${p.label})</span></span>`;
}

// ── INDEC API fetch ───────────────────────────────────────────────────
async function idxFetchIndec(id, ym){
  const def=IDX_CATALOG.find(d=>d.id===id);
  if(!def||!def.seriesId) throw new Error('Sin seriesId para '+id);
  // Ventana amplia (48 meses atrás) en vez de 6 — además de cubrir el caso en
  // que el target todavía no esté publicado, permite que un solo click en
  // "Actualizar" rellene huecos históricos grandes (ej. backfill desde 2023)
  // en una sola pasada, ya que runIdxUpdate/idxAddNextMonth ya iteran sobre
  // TODAS las filas devueltas y solo insertan las que faltan.
  const startDt = (function(){
    const [y,m]=String(ym).split('-').map(Number);
    if(!y||!m) return ym;
    const d=new Date(y, m-1-48, 1);
    return d.toISOString().substring(0,7);
  })();
  const url=`https://apis.datos.gob.ar/series/api/series?ids=${def.seriesId}&format=json&start_date=${startDt}&limit=60`;
  const r=await fetch(url);
  if(!r.ok) throw new Error('INDEC API '+r.status);
  const j=await r.json();
  const data=(j.data||[]).filter(row=>row&&row[0]&&row[1]!=null);
  if(!data.length) throw new Error('INDEC API sin datos');
  // Ordenamos por fecha y filtramos a los meses <= target
  const rows=data
    .map(([d,v])=>({ym:String(d).substring(0,7), value:Number(v)}))
    .filter(r=>r.ym && r.ym<=ym && isFinite(r.value))
    .sort((a,b)=>a.ym.localeCompare(b.ym));
  if(!rows.length) throw new Error('Sin dato INDEC ≤ '+ym);
  // Elegimos el último mes publicado disponible (puede ser anterior al target)
  const last=rows[rows.length-1];
  // pct vs mes anterior, sea de la respuesta o del store
  let pct=null;
  const prevYm=idxPrevYm(last.ym);
  const prevInResp=rows.find(r=>r.ym===prevYm);
  if(prevInResp && prevInResp.value){
    pct=Number(((last.value/prevInResp.value-1)*100).toFixed(2));
  } else {
    const prevRow=idxRows(id).find(r=>r.ym===prevYm);
    if(prevRow&&prevRow.value) pct=Number(((last.value/prevRow.value-1)*100).toFixed(2));
  }
  return {ym:last.ym, value:last.value, pct, source:'INDEC API', confirmed:false, _allRows:rows};
}

// ── INDEC CSV directo (más fresco que el mirror datos.gob.ar) ────────
// apis.datos.gob.ar es un ESPEJO de las series de INDEC que puede tardar
// semanas en sincronizar una publicación nueva — el mismo problema que
// forzó a usar ArgentinaDatos como fuente alternativa para IPC Nacional.
// INDEC también publica sus series como CSV directo en su propio dominio,
// actualizado junto con cada informe de prensa (SIPM/IPC), así que lo
// probamos PRIMERO cuando el catálogo define `directCsvUrl` y caemos al
// mirror datos.gob.ar si falla (dominio no soportado por energia-proxy,
// CSV con formato inesperado, etc. — nunca corta el flujo).
// Formato real confirmado con el CSV que bajó el usuario (indec.gob.ar
// bloquea el egress de este sandbox, así que no se pudo verificar hasta
// tenerlo en mano): es un archivo LARGO, no ancho — una fila por cada
// combinación (fecha, rubro/apertura), con 139 rubros distintos apilados
// uno debajo del otro (ej. "ng_nivel_general", "i_productos_importados",
// "0111_cereales_y_oleaginosas", …), separado por ";":
//   periodo;nivel_general_aperturas;indice_ipim
//   2026-04-01;ng_nivel_general;15542,5386282872
// Cada fecha aparece una vez POR RUBRO (no una sola vez con varias
// columnas de valor como se había asumido inicialmente al no poder ver
// el archivo real). El intento anterior tomaba "la última columna
// numérica de la línea" — como cada línea trae un solo valor eso
// funcionaba, pero al procesar duplicados de una misma fecha (uno por
// rubro) sin filtrar por etiqueta, terminaba quedándose con el ÚLTIMO
// rubro del archivo para esa fecha, que resulta ser siempre
// "i_productos_importados" (el bloque final del CSV) — de ahí que
// siempre trajera Productos Importados en vez de Nivel General.
// Fix: leer la columna de rubro/etiqueta explícitamente y quedarse SOLO
// con las filas que dicen "nivel_general" — no hay ambigüedad porque el
// dato ya viene identificado, no hace falta adivinar por posición ni por
// continuidad. Si algún CSV no trajera esa columna de etiqueta (formato
// simple fecha,valor), se mantiene como red de seguridad el mecanismo
// anterior de continuidad (ancla en el último valor ya confirmado).
async function idxFetchIndecCsv(id, csvUrl, ym){
  const r=await fetch(`${SB_URL}/functions/v1/energia-proxy`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+SB_KEY},
    body:JSON.stringify({url:csvUrl})
  });
  const raw=await r.text();
  if(!r.ok) throw new Error('energia-proxy '+r.status+' — '+raw.slice(0,200));
  let text=raw, parsedJson=null;
  try{ parsedJson=JSON.parse(raw); }catch(_e){ /* raw ya es el CSV plano */ }
  if(parsedJson && typeof parsedJson==='object'){
    if(parsedJson.success===false) throw new Error('energia-proxy rechazó la URL: '+((parsedJson.error&&parsedJson.error.message)||JSON.stringify(parsedJson).slice(0,200)));
    text=(parsedJson.result&&(parsedJson.result.text||parsedJson.result.body))||parsedJson.body||parsedJson.text||raw;
  }
  if(typeof text!=='string') throw new Error('Respuesta CSV no reconocida');
  const trimmed=text.trim();
  if(!trimmed) throw new Error('CSV vacío');
  if(/^\s*<(!doctype|html)/i.test(trimmed)) throw new Error('La URL no devolvió un CSV (parece HTML — posible 404/redirect)');
  const lines=trimmed.split(/\r?\n/).filter(l=>l.trim());
  const firstLine=lines[0]||'';
  const sep=(firstLine.split(';').length>firstLine.split(',').length)?';':',';
  // El formato real (confirmado): "periodo;rubro;valor" — fecha ISO
  // completa (YYYY-MM-DD) siempre en la primera columna.
  const dateRe=/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/;
  const NIVEL_GENERAL_RE=/nivel[_ ]general/i;
  const labeledRows=[];  // filas con columna de rubro explícita = "nivel_general"
  const genericRows=[];  // fallback: CSV sin columna de rubro (fecha,valor simple)
  for(const line of lines){
    const cols=line.split(sep).map(c=>c.trim().replace(/^"|"$/g,''));
    if(!cols.length) continue;
    const dm=cols[0].match(dateRe);
    if(!dm) continue; // encabezado u otra fila sin fecha en la 1ra columna
    const rym=dm[1]+'-'+String(dm[2]).padStart(2,'0');
    if(cols.length>=3){
      // Formato con columna de rubro/apertura: nos quedamos SOLO con la fila
      // etiquetada "nivel general" — no hay que adivinar nada, el dato ya
      // viene identificado. Se ignoran las filas de los demás rubros.
      if(NIVEL_GENERAL_RE.test(cols[1]||'')){
        const n=Number((cols[2]||'').replace(/\./g,'').replace(',','.'));
        if(isFinite(n)) labeledRows.push({ym:rym, value:n});
      }
      continue;
    }
    const candidates=[];
    for(let i=1;i<cols.length;i++){
      const n=Number(cols[i].replace(/\./g,'').replace(',','.'));
      if(isFinite(n) && n>50) candidates.push(n);
    }
    if(candidates.length) genericRows.push({ym:rym, candidates});
  }
  let rows;
  if(labeledRows.length){
    rows=labeledRows.filter(r=>r.ym<=ym).sort((a,b)=>a.ym.localeCompare(b.ym));
  } else if(genericRows.length){
    // Red de seguridad para un CSV sin columna de rubro explícita: mismo
    // mecanismo de continuidad de versiones anteriores (ancla en el
    // último valor ya confirmado en IDX_STORE, re-anclando en cada mes
    // confirmado para no arrastrar un error de origen por 10 años).
    const byYm=genericRows.filter(r=>r.ym<=ym).sort((a,b)=>a.ym.localeCompare(b.ym));
    const confirmedMap={};
    if(id) idxRows(id).forEach(r=>{ if(r.confirmed && r.value!=null) confirmedMap[r.ym]=r.value; });
    let anchor=null;
    rows=[];
    for(const pr of byYm){
      if(confirmedMap[pr.ym]!=null){
        anchor=confirmedMap[pr.ym];
        rows.push({ym:pr.ym, value:anchor});
        continue;
      }
      let chosen;
      if(anchor!=null){
        chosen=pr.candidates.reduce((best,n)=>{
          const dist=Math.abs(n/anchor-1);
          return (best===null||dist<best.dist)?{n,dist}:best;
        }, null).n;
      } else {
        chosen=pr.candidates[0];
      }
      rows.push({ym:pr.ym, value:chosen});
      anchor=chosen;
    }
  } else {
    throw new Error('No se pudieron extraer filas numéricas del CSV (formato inesperado)');
  }
  if(!rows.length) throw new Error('Sin dato en el CSV ≤ '+ym);
  const last=rows[rows.length-1];
  let pct=null;
  const prevYm=idxPrevYm(last.ym);
  const prevInResp=rows.find(r=>r.ym===prevYm);
  if(prevInResp && prevInResp.value) pct=Number(((last.value/prevInResp.value-1)*100).toFixed(2));
  else if(id){
    const prevRow=idxLastBefore(id, last.ym);
    if(prevRow && prevRow.value) pct=Number(((last.value/prevRow.value-1)*100).toFixed(2));
  }
  return {ym:last.ym, value:last.value, pct, source:'INDEC (CSV oficial)', confirmed:false, _allRows:rows};
}

// ── Gas Oil fetch vía energia-proxy ──────────────────────────────────
// Hay dos datasets CKAN distintos:
//  - HISTÓRICO (f8dda0d5…): cierres mensuales oficiales, pero el ETL que lo
//    nutre suele quedar varios meses atrás (por eso Combustible aparecía con
//    ~80 días de atraso pese a que YPF sí actualiza sus precios en Neuquén).
//  - VIGENTES (80ac25de…, "Precios vigentes en surtidor" Res. 314/2016): precio
//    declarado ACTUAL por cada EESS, sin recorte mensual — se usa como fuente
//    primaria para el mes en curso, y el histórico queda como respaldo para
//    meses ya cerrados que el vigente ya no tenga.
const CKAN_FUEL_HIST_URL='https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=f8dda0d5-2a9f-4d34-b79b-4e63de3995df&limit=32000';
const CKAN_FUEL_VIGENTES_URL='https://datos.energia.gob.ar/api/3/action/datastore_search?resource_id=80ac25de-a44a-4445-9215-090cf55cfda5&limit=32000';
async function _ckanFetchViaProxy(ckanUrl){
  const r=await fetch(`${SB_URL}/functions/v1/energia-proxy`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+SB_KEY},
    body:JSON.stringify({url:ckanUrl})
  });
  if(!r.ok) throw new Error('energia-proxy '+r.status);
  const j=await r.json();
  if(!j.success) throw new Error('CKAN error: '+(j.error&&j.error.message||'desconocido'));
  return j.result&&j.result.records||[];
}
function _fuelMatchRecord(id,rec){
  const prov=(rec.provincia||rec.idprovincia||'').toString().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const emp=(rec.empresa||rec.razon_social||rec.empresabandera||'').toString().toUpperCase();
  const prod=(rec.producto||rec.idproducto||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const esNQN=prov.includes('NEUQU')||prov==='58';
  const esYPF=emp.includes('YPF');
  const esGasoil=prod.includes('gasoil')||prod.includes('diesel')||prod.includes('gas oil');
  const isG3=id==='go_g3'&&(prod.includes('grado 3')||prod.includes('grado_3')||prod.includes('g3')||prod.includes('premium')||prod.includes('ultra')||prod.includes('infinia'));
  return esNQN&&esYPF&&esGasoil&&isG3;
}
async function idxFetchFuel(id, ym){
  const prevYm=idxPrevYm(ym);
  const prevRow=idxRows(id).find(r=>r.ym===prevYm);
  const withPct=(precio,source)=>{
    const pct=prevRow&&prevRow.value?Number(((precio/prevRow.value-1)*100).toFixed(2)):null;
    return {ym,value:Number(precio.toFixed(2)),pct,source,confirmed:false};
  };
  // 1) Intentar VIGENTES (precio declarado actual) — es la fuente que sí se
  //    mantiene al día; usamos el precio más reciente reportado como el valor
  //    del mes objetivo.
  try{
    const vigRecords=(await _ckanFetchViaProxy(CKAN_FUEL_VIGENTES_URL)).filter(rec=>_fuelMatchRecord(id,rec));
    if(vigRecords.length){
      vigRecords.sort((a,b)=>String(a.fecha_vigencia||a.fechavigencia||a.fecha||'').localeCompare(String(b.fecha_vigencia||b.fechavigencia||b.fecha||'')));
      const latestFecha=String(vigRecords[vigRecords.length-1].fecha_vigencia||vigRecords[vigRecords.length-1].fechavigencia||vigRecords[vigRecords.length-1].fecha||'');
      const latestBatch=vigRecords.filter(rec=>String(rec.fecha_vigencia||rec.fechavigencia||rec.fecha||'')===latestFecha);
      const precio=Math.max(...latestBatch.map(rec=>parseFloat((rec.precio||rec.importe||'0').toString().replace(',','.'))));
      if(isFinite(precio)&&precio>0) return withPct(precio,'S.Energía (vigentes)');
    }
  }catch(vigErr){ console.warn('idxFetchFuel vigentes failed, trying histórico',vigErr.message); }
  // 2) Respaldo: HISTÓRICO filtrado al mes exacto (para meses ya cerrados).
  const histRecords=(await _ckanFetchViaProxy(CKAN_FUEL_HIST_URL)).filter(rec=>{
    const fecha=(rec.fecha_vigencia||rec.fechavigencia||rec.fecha||'').toString();
    return fecha.startsWith(ym)&&_fuelMatchRecord(id,rec);
  });
  if(!histRecords.length) throw new Error('Sin datos combustible para '+ym+' (ni vigentes ni histórico CKAN)');
  const precio=Math.max(...histRecords.map(rec=>parseFloat((rec.precio||rec.importe||'0').toString().replace(',','.'))));
  return withPct(precio,'S.Energía (histórico)');
}

// ── FADEEAC fetch vía energia-proxy (feed RSS) ────────────────────────
// FADEEAC no tiene API pública, pero sí un feed RSS estándar de WordPress
// (fadeeac.org.ar/feed/) donde cada comunicado de prensa mensual aparece con
// un título muy regular: "Los costos del transporte {aumentaron|subieron|
// bajaron} X% en {mes}". Se parsea ese texto con regex — no hay endpoint
// estructurado, así que esto es más frágil que INDEC/CKAN: si FADEEAC
// cambia la redacción del título, deja de matchear y cae al flujo manual/IA
// existente (no rompe nada, solo no logra automatizar ese mes).
const FADEEAC_FEED_URL='https://www.fadeeac.org.ar/feed/';
const _MESES_ES={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
function _parseFadeeacItem(title,pubDateStr){
  const t=String(title||'').toLowerCase();
  const pctMatch=t.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if(!pctMatch) return null;
  let pct=parseFloat(pctMatch[1].replace(',','.'));
  if(!isFinite(pct)) return null;
  if(/baj|disminuy|cay[oó]|reducc/.test(t)) pct=-Math.abs(pct);
  // Elegir el mes que aparece PRIMERO en el texto (por posición, no por orden del
  // diccionario) — títulos tipo "...suben X% en abril y acumulan Y% en el primer
  // cuatrimestre (enero-abril)" mencionan más de un mes; el que corresponde al
  // dato mensual real es el que aparece antes en la oración, no "enero" solo
  // porque se revisa primero al iterar el diccionario.
  let mesNum=null, bestPos=Infinity;
  for(const name in _MESES_ES){
    const pos=t.indexOf(name);
    if(pos>=0 && pos<bestPos){ bestPos=pos; mesNum=_MESES_ES[name]; }
  }
  if(!mesNum) return null;
  const pubDate=new Date(pubDateStr);
  if(isNaN(pubDate.getTime())) return null;
  let year=pubDate.getFullYear();
  // Comunicado de enero hablando de "diciembre" -> el dato es del año anterior
  if(mesNum===12 && pubDate.getMonth()+1<=2) year-=1;
  return {ym:year+'-'+String(mesNum).padStart(2,'0'), pct};
}
async function idxFetchFadeeac(id, ym){
  const r=await fetch(`${SB_URL}/functions/v1/energia-proxy`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+SB_KEY},
    body:JSON.stringify({url:FADEEAC_FEED_URL})
  });
  const raw=await r.text();
  if(!r.ok) throw new Error('energia-proxy '+r.status+' — '+raw.slice(0,200));
  // energia-proxy se construyó pensando en respuestas JSON (CKAN) — si en cambio
  // nos pasa el XML del feed tal cual, raw ya es el RSS. Si lo envuelve en JSON
  // (ej. {success,result:{...}}), lo desenvolvemos; el parse de un envoltorio
  // JSON con success:false SIEMPRE debe propagar el error real (antes quedaba
  // atrapado por el catch de "esto no es JSON" y se perdía el motivo real).
  let xmlText=raw, parsedJson=null;
  try{ parsedJson=JSON.parse(raw); }catch(_e){ /* no era JSON — raw ya es el XML del feed */ }
  if(parsedJson && typeof parsedJson==='object'){
    if(parsedJson.success===false) throw new Error('energia-proxy rechazó la URL: '+((parsedJson.error&&parsedJson.error.message)||JSON.stringify(parsedJson).slice(0,200)));
    xmlText=(parsedJson.result&&(parsedJson.result.text||parsedJson.result.body))||parsedJson.body||parsedJson.text||raw;
  }
  if(typeof xmlText!=='string'||!/<rss|<item/i.test(xmlText)) throw new Error('Respuesta del feed FADEEAC no reconocida (¿energia-proxy no soporta este dominio?) — inicio: '+String(xmlText).slice(0,150));
  const doc=new DOMParser().parseFromString(xmlText,'text/xml');
  if(doc.querySelector('parsererror')) throw new Error('No se pudo parsear el feed RSS de FADEEAC');
  const items=Array.from(doc.querySelectorAll('item'));
  if(!items.length) throw new Error('Feed FADEEAC sin items');
  const parsedRaw=items.map(function(it){
    const title=(it.querySelector('title')&&it.querySelector('title').textContent)||'';
    const pubDate=(it.querySelector('pubDate')&&it.querySelector('pubDate').textContent)||'';
    const link=(it.querySelector('link')&&it.querySelector('link').textContent)||'';
    const p=_parseFadeeacItem(title,pubDate);
    return p?Object.assign({title:title,link:link},p):null;
  }).filter(Boolean).sort(function(a,b){return a.ym.localeCompare(b.ym);});
  if(!parsedRaw.length) throw new Error('No se pudo extraer % de ningún comunicado del feed FADEEAC');
  // El feed trae varios meses de comunicados en un solo pedido — antes se
  // descartaban todos menos el más cercano al target, desperdiciando datos
  // reales que ya estaban ahí. Ahora se devuelven TODOS (dedupeados por
  // mes, quedándose con el último comunicado de cada uno) para que
  // runIdxUpdate pueda rellenar huecos con datos reales del feed, sin
  // necesidad de recurrir a IA para meses que el feed ya tenía.
  const byYm={};
  parsedRaw.forEach(function(p){ byYm[p.ym]=p; });
  const allRows=Object.values(byYm).filter(function(p){return p.ym<=ym;}).sort(function(a,b){return a.ym.localeCompare(b.ym);});
  if(!allRows.length) throw new Error('El feed no tiene ningún comunicado ≤ '+ym);
  const chosen=allRows[allRows.length-1];
  return {ym:chosen.ym, pct:chosen.pct, value:null, source:'FADEEAC (RSS)', confirmed:false, note:chosen.title, sourceUrl:chosen.link||FADEEAC_FEED_URL, _allRows:allRows.map(function(p){return {ym:p.ym,pct:p.pct,value:null,note:p.title,sourceUrl:p.link||FADEEAC_FEED_URL};})};
}

// ── Agregar siguiente mes (auto o manual) ─────────────────────────────
async function idxAddNextMonth(id){
  const def=IDX_CATALOG.find(d=>d.id===id);
  if(!def) return;
  const ym=idxNextYm(id);
  const mode=def.fetchMode||'manual';
  if(mode==='manual'){openEntryModal(id,null);return;}
  toast('Buscando '+formatMonth(ym)+'…','ok');
  try{
    let row;
    if(mode==='indec' && id==='ipc_nac'){
      try{
        const rows=await idxFetchIpcArgentinaDatos(ym);
        const last=rows[rows.length-1];
        row={ym:last.ym, value:null, pct:last.pct, source:'ArgentinaDatos'};
      }catch(argDatosErr){
        console.warn('idxFetchIpcArgentinaDatos failed, trying INDEC API',argDatosErr.message);
        row=await idxFetchIndec(id,ym);
      }
    }
    else if(mode==='indec' && def.directCsvUrl){
      try{ row=await idxFetchIndecCsv(id,def.directCsvUrl,ym); }
      catch(csvErr){
        console.warn('idxFetchIndecCsv failed, trying datos.gob.ar mirror',csvErr.message);
        row=await idxFetchIndec(id,ym);
      }
    }
    else if(mode==='indec') row=await idxFetchIndec(id,ym);
    else if(mode==='usd') row=await fetchUsdBnaLike(ym);
    else if(mode==='fuel') row=await idxFetchFuel(id,ym);
    else if(mode==='fadeeac') row=await idxFetchFadeeac(id,ym);
    if(!row) throw new Error('Sin dato');
    const flagged=withReviewFlag(def,{...row,ym});
    await idxUpsert(id,flagged);
    renderIdxView();
    toast(flagged.needsReview?(def.name+' '+formatMonth(ym)+' cargado con aviso — revisá: '+flagged.reviewReason):(def.name+' '+formatMonth(ym)+' cargado ✓'),flagged.needsReview?'er':'ok');
  }catch(err){
    console.warn('idxAddNextMonth',id,err);
    toast('No se encontró dato automático — ingresá manualmente','er');
    openEntryModal(id,null);
  }
}

// Extrae un ARRAY JSON de la respuesta de Gemini (no un objeto único como
// extractJsonFromGeminiText, compartida con otros usos del proxy que sí
// esperan un objeto — no se toca esa función para no afectarlos).
function extractJsonArrayFromGeminiText(text){
  if(!text) throw new Error('Gemini devolvió respuesta vacía');
  let raw=String(text).trim().replace(/^```json/i,'').replace(/^```/i,'').replace(/```$/i,'').trim();
  const match=raw.match(/\[[\s\S]*\]/);
  if(!match) throw new Error('Gemini no devolvió un array JSON válido');
  const clean=match[0].replace(/,\s*\]/g,']').replace(/,\s*\}/g,'}').replace(/([{,]\s*)(\w+)\s*:/g,'$1"$2":');
  const parsed=JSON.parse(clean);
  if(!Array.isArray(parsed)) throw new Error('Gemini no devolvió un array');
  return parsed;
}
// missingYms: lista explícita de períodos faltantes (ej. ['2026-04',
// '2026-05','2026-06','2026-07']) — un pedido tipo "traeme desde X hasta Y"
// en una sola oración NO garantiza que Gemini busque cada mes intermedio
// (en la práctica, con grounding, tiende a buscar una vez y reportar solo
// el resultado más reciente que encuentra). Enumerar cada mes por su
// nombre como un checklist explícito da resultados mucho más confiables.
async function idxResolveViaAI(def, targetYm, missingYms){
  if(typeof callGeminiForEnm!=='function') throw new Error('Gemini no disponible');
  const todayIso=new Date().toISOString().substring(0,10);
  const yms=(missingYms&&missingYms.length)?missingYms:[targetYm];
  // grounding:true → el proxy activa Google Search en la llamada a Gemini,
  // así la búsqueda la hace la infraestructura de Google (no Supabase) —
  // evita el problema de conectividad que bloquea el fetch directo a sitios
  // como fadeeac.org.ar, y de paso deja de depender de la memoria/training
  // data del modelo (que puede estar desactualizada) para el valor real.
  const checklist=yms.map(ym=>'- '+formatMonth(ym)+' ('+ym+')').join('\n');
  const prompt = `Hoy es ${todayIso}. Necesito el valor oficial REALMENTE publicado (a la fecha de hoy) para el índice argentino "${def.name}" (fuente: ${def.src}${def.srcLink?(', sitio: '+def.srcLink):''}), para CADA UNO de estos períodos específicos — buscá cada uno por separado en la web, uno por uno, no asumas que todos tienen el mismo valor:\n${checklist}\nSi alguno de estos meses todavía no fue publicado, omitilo del resultado (no inventes ni repitas el valor de otro mes). No uses valores de tu memoria sin confirmarlos con una búsqueda actual. Citá para cada mes la URL de la fuente donde encontraste el dato en sourceUrl. Responder SOLO un array JSON con UNA ENTRADA POR CADA MES QUE HAYAS PODIDO CONFIRMAR (puede ser menos de ${yms.length} si algunos no están publicados, pero buscá los ${yms.length} antes de responder), con este esquema: [{"ym":"YYYY-MM","pct":number|null,"value":number|null,"publishedAt":"YYYY-MM-DD"|null,"sourceUrl":"url"|null,"note":"texto breve"}]`;
  const resp = await callGeminiForEnm([{text:prompt}], {grounding:true});
  if(!resp || !resp.ok){
    // El body de la respuesta trae el motivo REAL que devuelve la API de
    // Gemini (ej. "API key not valid", "billing required", etc.) — antes
    // se perdía y solo quedaba el código de estado HTTP, sin poder saber
    // el motivo sin ir a revisar los logs de Supabase a mano.
    let bodyTxt='';
    try{ bodyTxt=await resp.text(); }catch(_e){}
    throw new Error('Gemini/proxy no respondió'+(resp?(' ('+resp.status+')'):'')+(bodyTxt?(' — '+bodyTxt.slice(0,300)):''));
  }
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const txt = parts.map(p=>p.text||'').join('\n').trim();
  return extractJsonArrayFromGeminiText(txt);
}
// ── Validación previa a guardar un valor obtenido automáticamente ──────────
// No bloquea el guardado (así no se pierde el dato ni queda el índice
// "trabado"), pero si algo no es plausible marca la fila como needsReview
// y esos períodos quedan afuera de los cálculos automáticos de AVE
// (computeAutoPctForIdx / calculateUpdate) hasta que alguien la revise y
// confirme manualmente — así un dato mal parseado no termina financiando
// un ajuste real sin que nadie lo haya mirado.
function validateIdxRow(def,newRow,prevRow){
  const reasons=[];
  const isLevel=def.cat==='usd'||def.cat==='fuel';
  if(isLevel){
    const v=newRow.value;
    if(v==null||!isFinite(v)||v<=0){
      reasons.push('Valor no numérico o ≤ 0');
    } else if(prevRow&&prevRow.value>0){
      const ratio=v/prevRow.value;
      if(ratio>2.5||ratio<0.4) reasons.push('Valor cambia '+(((ratio-1)*100)).toFixed(0)+'% vs. el período anterior — fuera del rango esperado');
      else if(v===prevRow.value) reasons.push('Valor idéntico al período anterior — posible dato repetido');
    }
  } else {
    const pct=newRow.pct;
    if(pct==null||!isFinite(pct)){
      reasons.push('Sin % de variación válido');
    } else {
      if(pct<-3||pct>60) reasons.push('% mensual ('+pct.toFixed(2)+'%) fuera del rango plausible (-3% a 60%)');
      if(prevRow&&prevRow.pct!=null&&pct===prevRow.pct) reasons.push('% idéntico al período anterior — posible dato repetido');
    }
  }
  return {ok:reasons.length===0,reasons};
}
// Aplica validateIdxRow y devuelve el row listo para idxUpsert, con
// needsReview/reviewReason si corresponde. No usar para carga manual del
// usuario (ahí el humano ya está validando al tipear).
function withReviewFlag(def,row){
  const prev=idxLastBefore(def.id,row.ym);
  const v=validateIdxRow(def,row,prev);
  if(v.ok) return {...row,needsReview:false,reviewReason:''};
  console.warn('[validateIdxRow]',def.id,row.ym,v.reasons);
  return {...row,needsReview:true,reviewReason:v.reasons.join(' · ')};
}
// Después de que un fetch primario (combustible, FADEEAC) tenga éxito para
// el mes objetivo, puede quedar un hueco ENTRE el último mes confirmado y
// ese mes nuevo — pasaba con Gas Oil (idxFetchFuel solo trae el precio
// "vigente" de hoy, sin histórico) y podía pasar con FADEEAC si el feed no
// alcanza a cubrir todo el rango. Esta función completa esos huecos vía
// Gemini AI, pero SOLO si realmente hay huecos — así no gasta la cuota
// gratis (20/día) en índices que ya están al día. Devuelve true si agregó
// algo nuevo.
async function fillGapsViaAI(def, id, uptoYmExclusive){
  const confirmedRows=(idxRows(id)||[]).filter(r=>r.confirmed).sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
  const baseYm=confirmedRows.length?confirmedRows[confirmedRows.length-1].ym:null;
  if(!baseYm) return false;
  const existingYms=new Set((idxRows(id)||[]).map(r=>r.ym));
  const missingYms=[];
  let cur=nextYm(baseYm);
  while(cur && cur<uptoYmExclusive){
    if(!existingYms.has(cur)) missingYms.push(cur);
    cur=nextYm(cur);
  }
  if(!missingYms.length) return false;
  try{
    const rs=await idxResolveViaAI(def,uptoYmExclusive,missingYms);
    if(!Array.isArray(rs)) return false;
    const validRows=rs.filter(r=>r && /^\d{4}-\d{2}$/.test(r.ym||'') && (r.pct!=null||r.value!=null) && !existingYms.has(r.ym))
      .sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
    let any=false;
    for(const r of validRows){
      const row=withReviewFlag(def,{ym:r.ym,pct:r.pct!=null?Number(r.pct):null,value:r.value!=null?Number(r.value):null,confirmed:false,status:'updated',source:def.src,note:r.note||'',publishedAt:r.publishedAt||null,sourceUrl:r.sourceUrl||null});
      row.needsReview=true;
      row.reviewReason=row.reviewReason?('Fuente IA (Gemini) · '+row.reviewReason):'Fuente IA (Gemini) — revisar contra la publicación oficial';
      await idxUpsert(id,row);
      any=true;
    }
    return any;
  }catch(err){
    console.warn('fillGapsViaAI failed for',id,err.message);
    return false;
  }
}
async function runIdxUpdate(id){
  const def=IDX_CATALOG.find(d=>d.id===id); if(!def) return;
  const target=idxTargetYm();
  const mode=def.fetchMode||'manual';
  try{
    if(def.cat==='mo'){ toast('Índice guiado/manual','er'); return; }

    // ── USD DIVISA: fuente propia ─────────────────────────────────────────
    if(mode==='usd'){
      try{
        // Backfill: trae y carga TODOS los meses faltantes (no solo el
        // objetivo) — mismo patrón _allRows que IPIM/IPC.
        const allRows=await fetchUsdBnaLikeAll(target);
        const existing=new Set((idxRows(id)||[]).filter(r=>r.confirmed).map(r=>r.ym));
        let lastPrev=null,anyFlagged=false,lastYm=null;
        for(const r of allRows){
          if(existing.has(r.ym)) { lastPrev=r; continue; }
          const newRow=withReviewFlag(def,{ym:r.ym,value:r.value,pct:null,confirmed:false,status:'updated',source:def.src,note:'BNA Oficial (divisa)',publishedAt:r.publishedAt});
          if(newRow.needsReview)anyFlagged=true;
          await idxUpsert(id,newRow);
          lastPrev=r; lastYm=r.ym;
        }
        if(lastYm){
          renderIdxView();
          toast(anyFlagged?(def.name+' actualizado hasta '+formatMonth(lastYm)+' — algún período quedó marcado para revisar'):(def.name+' actualizado hasta '+formatMonth(lastYm)),anyFlagged?'er':'ok');
          return;
        }
        throw new Error('Sin períodos nuevos');
      }catch(bfErr){
        console.warn('fetchUsdBnaLikeAll failed, trying single-month fetch',bfErr.message);
      }
      const usd=await fetchUsdBnaLike(target);
      const row=withReviewFlag(def,{ym:usd.ym,value:usd.value,pct:null,confirmed:false,status:'updated',source:def.src,note:usd.source,publishedAt:usd.publishedAt});
      await idxUpsert(id,row);
      renderIdxView();
      toast(row.needsReview?(def.name+' cargado con aviso — revisá: '+row.reviewReason):(def.name+' actualizado'),row.needsReview?'er':'ok');
      return;
    }

    // ── USD BILLETE: BNA cotizador histórico (CSV) ──────────────────────
    // Motivo del fallo (si pasa) guardado en `billFailReason` para
    // adjuntarlo a la Nota de lo que termine guardándose (seed/AI/fallback)
    // — mismo criterio que con FADEEAC/IPIM.
    let billFailReason=null;
    if(mode==='usd_billete'){
      try{
        const allRows=await idxFetchBnaBillete(target);
        const existing=new Set((idxRows(id)||[]).filter(r=>r.confirmed).map(r=>r.ym));
        let anyFlagged=false,lastYm=null;
        for(const r of allRows){
          if(existing.has(r.ym)) continue;
          const newRow=withReviewFlag(def,{ym:r.ym,value:r.value,pct:null,confirmed:false,status:'updated',source:def.src,note:'BNA (billete)',publishedAt:r.publishedAt});
          if(newRow.needsReview)anyFlagged=true;
          await idxUpsert(id,newRow);
          lastYm=r.ym;
        }
        if(lastYm){
          renderIdxView();
          toast(anyFlagged?(def.name+' actualizado hasta '+formatMonth(lastYm)+' — algún período quedó marcado para revisar'):(def.name+' actualizado hasta '+formatMonth(lastYm)),anyFlagged?'er':'ok');
          return;
        }
        toast(def.name+' — sin períodos nuevos','ok');
        return;
      }catch(billErr){
        billFailReason=billErr.message;
        console.warn('idxFetchBnaBillete failed, trying seed/AI',billErr.message);
      }
    }

    // ── IPC Nacional: intentar ArgentinaDatos primero (suele estar más al día
    // que el mirror de datos.gob.ar) — solo aplica a ipc_nac, no a GBA/Patagonia
    // que no tienen ese endpoint. Si falla o no llega al mes objetivo, cae al
    // fetch INDEC normal de abajo sin cortar el flujo.
    if(mode==='indec' && id==='ipc_nac'){
      try{
        const rows=await idxFetchIpcArgentinaDatos(target);
        const existing=new Set((idxRows(id)||[]).filter(r=>r.confirmed).map(r=>r.ym));
        let anyFlagged=false;
        for(const r of rows){
          if(existing.has(r.ym)) continue;
          const newRow=withReviewFlag(def,{ym:r.ym, value:null, pct:r.pct, confirmed:false, status:'updated', source:'ArgentinaDatos', note:''});
          if(newRow.needsReview)anyFlagged=true;
          await idxUpsert(id,newRow);
        }
        renderIdxView();
        const lastYm=rows[rows.length-1].ym;
        toast(anyFlagged?(def.name+' actualizado hasta '+formatMonth(lastYm)+' — algún período quedó marcado para revisar'):(def.name+' actualizado hasta '+formatMonth(lastYm)+' (ArgentinaDatos)'),anyFlagged?'er':'ok');
        return;
      }catch(argDatosErr){
        console.warn('idxFetchIpcArgentinaDatos failed, trying INDEC API',argDatosErr.message);
        // Fall through al fetch INDEC normal
      }
    }

    // ── INDEC CSV directo: más fresco que el mirror datos.gob.ar cuando
    // el catálogo lo define (ver idxFetchIndecCsv) — probamos antes del
    // mirror; si falla (dominio no soportado, formato inesperado) cae al
    // fetch INDEC API normal de abajo sin cortar el flujo. Guardamos el
    // motivo del fallo en `csvFailReason` para mostrarlo en la Nota del
    // período cargado por el mirror — así queda visible en la tabla sin
    // necesidad de abrir la consola del navegador.
    let csvFailReason=null;
    if(mode==='indec' && def.directCsvUrl){
      try{
        const row=await idxFetchIndecCsv(id,def.directCsvUrl,target);
        const existing=new Set((idxRows(id)||[]).filter(r=>r.confirmed).map(r=>r.ym));
        const allRows=Array.isArray(row._allRows)?row._allRows:[{ym:row.ym,value:row.value}];
        let lastPrev=null,anyFlagged=false;
        for(const r of allRows){
          if(existing.has(r.ym)) { lastPrev=r; continue; }
          let pct=null;
          const prev=lastPrev||idxRows(id).find(x=>x.ym===idxPrevYm(r.ym));
          if(prev && prev.value) pct=Number(((r.value/prev.value-1)*100).toFixed(2));
          const newRow=withReviewFlag(def,{ym:r.ym, value:r.value, pct, confirmed:false, status:'updated', source:'INDEC (CSV oficial)', note:''});
          if(newRow.needsReview)anyFlagged=true;
          await idxUpsert(id,newRow);
          lastPrev=r;
        }
        renderIdxView();
        toast(anyFlagged?(def.name+' actualizado hasta '+formatMonth(row.ym)+' — algún período quedó marcado para revisar'):(def.name+' actualizado hasta '+formatMonth(row.ym)+' (INDEC CSV oficial)'),anyFlagged?'er':'ok');
        return;
      }catch(csvErr){
        csvFailReason=csvErr.message;
        console.warn('idxFetchIndecCsv failed, trying datos.gob.ar mirror',csvErr.message);
        // Fall through al mirror datos.gob.ar de abajo
      }
    }

    // ── INDEC API: fetch directo ────────────────────────────────────────
    if(mode==='indec'){
      try{
        const row=await idxFetchIndec(id,target);
        // Upsert todos los meses devueltos por la API que no estén ya cargados (o estén stale)
        const existing=new Set((idxRows(id)||[]).filter(r=>r.confirmed).map(r=>r.ym));
        const allRows=Array.isArray(row._allRows)?row._allRows:[{ym:row.ym,value:row.value}];
        let lastPrev=null,anyFlagged=false;
        const csvNote=csvFailReason?('CSV directo INDEC falló: '+csvFailReason):'';
        for(const r of allRows){
          if(existing.has(r.ym)) { lastPrev=r; continue; }
          let pct=null;
          const prev=lastPrev||idxRows(id).find(x=>x.ym===idxPrevYm(r.ym));
          if(prev && prev.value) pct=Number(((r.value/prev.value-1)*100).toFixed(2));
          const newRow=withReviewFlag(def,{ym:r.ym, value:r.value, pct, confirmed:false, status:'updated', source:'INDEC API', note:csvNote});
          if(newRow.needsReview)anyFlagged=true;
          await idxUpsert(id,newRow);
          lastPrev=r;
        }
        renderIdxView();
        toast(anyFlagged?(def.name+' actualizado hasta '+formatMonth(row.ym)+' — algún período quedó marcado para revisar'):(def.name+' actualizado hasta '+formatMonth(row.ym)+' (INDEC API)'+(csvFailReason?' — CSV directo falló, ver Nota':'')),anyFlagged?'er':(csvFailReason?'er':'ok'));
        return;
      }catch(apiErr){
        console.warn('idxFetchIndec failed, trying seed/AI',apiErr.message);
        // Fall through to seed/AI
      }
    }

    // ── Combustible: fuel-proxy ─────────────────────────────────────────
    if(mode==='fuel'){
      try{
        const fetched=await idxFetchFuel(id,target);
        const row=withReviewFlag(def,{...fetched,confirmed:false,status:'updated'});
        await idxUpsert(id,row);
        // idxFetchFuel solo trae el precio "vigente" de HOY, sin histórico
        // — si quedaron meses sin cargar entre el último confirmado y este
        // nuevo dato, se completan vía IA (no hace nada si no hay huecos).
        const filledGaps=await fillGapsViaAI(def,id,target);
        renderIdxView();
        toast(row.needsReview?(def.name+' cargado con aviso — revisá: '+row.reviewReason):(def.name+' actualizado (S.Energía)'+(filledGaps?' — meses faltantes completados vía IA, revisar':'')),(row.needsReview||filledGaps)?'er':'ok');
        return;
      }catch(fuelErr){
        console.warn('idxFetchFuel failed, trying seed/AI',fuelErr.message);
      }
    }

    // ── FADEEAC: feed RSS vía energia-proxy ──────────────────────────────
    // Guardamos el motivo del fallo en `fadeFailReason` para adjuntarlo a
    // la Nota de lo que termine guardándose (seed/AI/fallback) — mismo
    // criterio que con el CSV directo de IPIM: visible en la tabla, sin
    // necesidad de consola.
    let fadeFailReason=null;
    if(mode==='fadeeac'){
      try{
        const fetched=await idxFetchFadeeac(id,target);
        // El feed trae varios comunicados/meses por pedido — se cargan
        // TODOS los que sean nuevos (mismo patrón que IPIM/INDEC con
        // _allRows), no solo el más cercano al objetivo, para no dejar
        // huecos que el feed en realidad ya tenía resueltos.
        const existing=new Set((idxRows(id)||[]).filter(r=>r.confirmed).map(r=>r.ym));
        const allRows=Array.isArray(fetched._allRows)?fetched._allRows:[fetched];
        let anyFlagged=false,lastYm=null;
        for(const r of allRows){
          if(existing.has(r.ym)) continue;
          const newRow=withReviewFlag(def,{ym:r.ym,pct:r.pct,value:r.value??null,confirmed:false,status:'updated',source:'FADEEAC (RSS)',note:r.note||'',sourceUrl:r.sourceUrl||null});
          if(newRow.needsReview)anyFlagged=true;
          await idxUpsert(id,newRow);
          lastYm=r.ym;
        }
        if(lastYm){
          // El feed puede no alcanzar a cubrir todo el rango (solo trae
          // comunicados recientes) — si queda algún mes anterior sin
          // cargar, se completa vía IA antes de cortar.
          const filledGaps=await fillGapsViaAI(def,id,target);
          renderIdxView();
          toast(anyFlagged?(def.name+' actualizado hasta '+formatMonth(lastYm)+' — algún período quedó marcado para revisar'):(def.name+' actualizado hasta '+formatMonth(lastYm)+' (feed FADEEAC)'+(filledGaps?' — meses faltantes completados vía IA, revisar':'')),(anyFlagged||filledGaps)?'er':'ok');
          return;
        }
        // El feed respondió bien pero no trajo ningún mes nuevo (todos ya
        // estaban confirmados) — igual seguimos al chequeo de huecos por
        // si falta algo que el feed no tiene, en vez de cortar acá.
      }catch(fadeErr){
        fadeFailReason=fadeErr.message;
        console.warn('idxFetchFadeeac failed, trying seed/AI',fadeErr.message);
      }
    }
    const fadeNoteSuffix=(fadeFailReason?(' · Feed FADEEAC falló: '+fadeFailReason):'')+(billFailReason?(' · BNA Billete falló: '+billFailReason):'');

    // ── Seed exacto para el target ──────────────────────────────────────
    const official=idxResolveOfficial(def,target);
    if(official && official.ym===target && (official.pct!=null||official.value!=null)){
      const row=withReviewFlag(def,{ym:target,pct:official.pct!=null?Number(official.pct):null,value:official.value!=null?Number(official.value):null,confirmed:false,status:'updated',source:official.source||def.src,note:(official.note||'')+fadeNoteSuffix,publishedAt:official.publishedAt||null,sourceUrl:official.sourceUrl||null});
      await idxUpsert(id,row);
      renderIdxView();
      toast(row.needsReview?(def.name+' cargado con aviso — revisá: '+row.reviewReason):(def.name+' actualizado (seed)'),row.needsReview?'er':'ok');
      return;
    }

    // ── Gemini AI (solo para manual/fallback) — la validación acá es
    // especialmente importante: un valor alucinado por la IA no debe
    // colarse en un cálculo de AVE sin que alguien lo revise. Se envuelve en
    // su propio try/catch para que si el proxy Gemini falla (red, cuota,
    // timeout) el flujo siga hacia el fallback de seed en vez de saltar
    // directo al catch general y dejar el índice "trabado" sin más intentos.
    let rs=null, aiFailReason=null;
    try{
      // Ancla en el último CONFIRMADO (no en idxLastBefore, que podría devolver
      // una fila sin confirmar de un intento anterior) para armar la lista
      // explícita de meses faltantes hasta el objetivo.
      const confirmedRows=(idxRows(id)||[]).filter(r=>r.confirmed).sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
      const baseYm=confirmedRows.length?confirmedRows[confirmedRows.length-1].ym:null;
      const missingYms=[];
      if(baseYm){
        let cur=nextYm(baseYm);
        while(cur && cur<=target){ missingYms.push(cur); cur=nextYm(cur); }
      }
      rs=await idxResolveViaAI(def,target,missingYms);
    }
    catch(aiErr){ aiFailReason=aiErr.message; console.warn('idxResolveViaAI failed, trying seed fallback',id,aiErr.message); }
    if(rs && Array.isArray(rs)){
      // Gemini devuelve el rango completo faltante, no solo el mes objetivo
      // — se cargan TODOS los períodos nuevos que trajo, igual que con los
      // "_allRows" de INDEC/CSV, para no dejar meses intermedios sin cargar.
      const existing=new Set((idxRows(id)||[]).filter(r=>r.confirmed).map(r=>r.ym));
      const validRows=rs.filter(r=>r && /^\d{4}-\d{2}$/.test(r.ym||'') && (r.pct!=null||r.value!=null) && !existing.has(r.ym))
        .sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
      if(!validRows.length) aiFailReason=aiFailReason||(rs.length?'Gemini no devolvió ningún período nuevo con pct/value':'Gemini devolvió un array vacío');
      let lastYm=null;
      for(const r of validRows){
        const row=withReviewFlag(def,{ym:r.ym,pct:r.pct!=null?Number(r.pct):null,value:r.value!=null?Number(r.value):null,confirmed:false,status:'updated',source:def.src,note:(r.note||'')+fadeNoteSuffix,publishedAt:r.publishedAt||null,sourceUrl:r.sourceUrl||null});
        // La IA siempre queda marcada para revisión manual, aunque pase las validaciones
        // de magnitud — es una fuente de menor confianza que una API oficial directa.
        row.needsReview=true;
        row.reviewReason=row.reviewReason?('Fuente IA (Gemini) · '+row.reviewReason):'Fuente IA (Gemini) — revisar contra la publicación oficial';
        await idxUpsert(id,row);
        lastYm=r.ym;
      }
      if(lastYm){
        renderIdxView();
        toast(def.name+' cargado vía IA hasta '+formatMonth(lastYm)+' — pendiente de revisión manual','er');
        return;
      }
    }

    // ── Último seed disponible como fallback real ───────────────────────
    const aiNoteSuffix=aiFailReason?(' · IA (Gemini) falló: '+aiFailReason):'';
    if(official && (official.pct!=null||official.value!=null)){
      // official.note ya incluye "· último oficial disponible" cuando
      // official.ym!==target (ver idxResolveOfficial) — no se repite acá.
      const row=withReviewFlag(def,{ym:official.ym,pct:official.pct!=null?Number(official.pct):null,value:official.value!=null?Number(official.value):null,confirmed:false,status:'waiting_release',source:official.source||def.src,note:(official.note||'')+fadeNoteSuffix+aiNoteSuffix,publishedAt:official.publishedAt||null,sourceUrl:official.sourceUrl||null});
      await idxUpsert(id,row);
      renderIdxView(); toast(def.name+' usando último oficial ('+official.ym+')','ok'); return;
    }
    throw new Error('Sin dato'+fadeNoteSuffix);
  }catch(err){
    console.warn('runIdxUpdate',id,err);
    const prev=idxLastBefore(id,target);
    if(prev){ await idxUpsert(id,{...prev,status:'fallback'}); renderIdxView(); toast(def.name+' usando último publicado','ok'); return; }
    renderIdxView(); toast('No se pudo actualizar '+def.name,'er');
  }
}
async function runAllIdxUpdates(){
  const defs=IDX_CATALOG.filter(d=>d.cat!=='mo');
  const modal=document.getElementById('idxProgressModal');
  const pmBody=document.getElementById('pmBody');
  const pmTitle=document.getElementById('pmTitle');
  const pmSpinner=document.getElementById('pmSpinner');
  const pmClose=document.getElementById('pmCloseBtn');

  // Render rows
  const rowState={}; // id → {ico,status}
  pmBody.innerHTML=defs.map(d=>`<div class="pm-row" id="pm_${d.id}"><span class="pm-ico" id="pmi_${d.id}">⏳</span><span class="pm-name">${esc(d.name)}</span><span class="pm-status" id="pms_${d.id}">Esperando…</span></div>`).join('');
  pmTitle.textContent='Actualizando índices…';
  pmSpinner.textContent='🔄';
  pmClose.style.display='none';
  modal.style.display='flex';

  _idxBatchMode=true;
  let ok=0,fail=0;
  try{
    for(const def of defs){
      const icoEl=document.getElementById('pmi_'+def.id);
      const stEl=document.getElementById('pms_'+def.id);
      if(icoEl) icoEl.textContent='⏳';
      if(stEl){stEl.textContent='Actualizando…';stEl.style.color='var(--muted)';}
      try{
        await runIdxUpdate(def.id);
        if(icoEl) icoEl.textContent='✅';
        // BUG previo: acá se buscaba una fila que matcheara EXACTO el período "objetivo"
        // (idxTargetYm()) y si no existía se reportaba "sin dato" en rojo — pero
        // runIdxUpdate cae correctamente al último período REALMENTE publicado cuando
        // el objetivo todavía no salió (ej. el mes recién termina de publicarse ~20
        // días después), que es el caso normal para casi todo salvo USD. Eso hacía
        // que el resumen mintiera "sin dato" para índices que en realidad SÍ se
        // habían actualizado correctamente al último período disponible.
        const rowsNow=idxRows(def.id);
        const lastRow=rowsNow.length?rowsNow[rowsNow.length-1]:null;
        const hitTarget=lastRow&&lastRow.ym===idxTargetYm();
        if(stEl){
          if(!lastRow){ stEl.textContent='sin dato'; stEl.style.color='var(--r500)'; }
          else if(hitTarget){ stEl.textContent=formatMonth(lastRow.ym)+(lastRow.status==='fallback'?' (fallback)':''); stEl.style.color='var(--g600)'; }
          else { stEl.textContent=formatMonth(lastRow.ym)+' (último disponible)'; stEl.style.color='#d97706'; }
        }
        ok++;
      }catch(e){
        if(icoEl) icoEl.textContent='❌';
        if(stEl){stEl.textContent='Error';stEl.style.color='var(--r500)';}
        fail++;
      }
    }
  }finally{
    _idxBatchMode=false;
    await saveIdx();
    pmTitle.textContent=`Listo — ${ok} actualizados${fail?', '+fail+' con error':''}`;
    pmSpinner.textContent=fail?'⚠️':'✅';
    pmClose.style.display='';
    renderIdxDash();
  }
}


// ── Helpers ────────────────────────────────────────────────────────────
function pctColor(v){return v===null||v===undefined?'zero':v>0?'pos':v<0?'neg':'zero';}
function pctStr(v,decimals=2){if(v===null||v===undefined)return'—';return(v>0?'+':'')+Number(v).toFixed(decimals)+'%';}
function acumCompound(rows){return rows.reduce((prod,r)=>prod*(1+(r.pct||0)/100),1)-1;}

// ── STATE ──────────────────────────────────────────────────────────────
let _idxSel = null;   // currently open detail
let _idxEntryId = null; // entry modal target

// ═══════════════════════════════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════════════════════════════
function renderIdxView(){
  loadIdx();
  renderIdxDash();
  if(_idxSel){
    document.getElementById('idxDetPanel').style.display='';
    document.getElementById('idxCardsGrid').style.display='none';
    renderIdxDet(_idxSel);
  } else {
    document.getElementById('idxDetPanel').style.display='none';
    document.getElementById('idxCardsGrid').style.display='';
    renderIdxCards();
  }
}

// ── Top KPI row ────────────────────────────────────────────────────────
function renderIdxDash(){
  const box=document.getElementById('idxDashTop');if(!box)return;
  const totalIdx=IDX_CATALOG.length;
  const target=idxTargetYm();
  let updated=0, pending=0, withAny=0, autoCnt=0, manualCnt=0;
  IDX_CATALOG.forEach(def=>{
    const rows=idxRows(def.id); if(rows.length) withAny++; const exact=rows.find(r=>r.ym===target); if(exact) updated++; else pending++;
    if(def.cat!=='mo'){ if((def.fetchMode||'manual')==='manual') manualCnt++; else autoCnt++; }
  });
  box.innerHTML=`<p style="font-size:12px;color:var(--g500);margin-bottom:14px">Objetivo: <strong>${formatMonth(target)}</strong> · si el período no fue publicado se usa el último oficial disponible anterior</p><div class="idx-dash-row" style="grid-template-columns:repeat(5,1fr)"><div class="idx-kpi-box"><div class="kl">Total índices</div><div class="kv">${totalIdx}</div><div class="ks">${withAny} con historial</div></div><div class="idx-kpi-box" style="border-color:var(--g600)"><div class="kl">✅ Actualizados ${formatMonth(target)}</div><div class="kv" style="color:var(--g600)">${updated}</div><div class="ks">con dato en el período objetivo</div></div><div class="idx-kpi-box" style="border-color:${pending>0?'var(--r500)':'var(--g600)'}"><div class="kl">⏳ Pendientes</div><div class="kv" style="color:${pending>0?'var(--r500)':'var(--g600)'}">${pending}</div><div class="ks">sin dato del objetivo</div></div><div class="idx-kpi-box"><div class="kl">📚 Historial</div><div class="kv">${withAny}</div><div class="ks">con datos previos cargados</div></div><div class="idx-kpi-box"><div class="kl">🔗 Fuente de datos</div><div class="kv" style="font-size:15px;line-height:1.5"><span style="color:var(--g600)">🔗 ${autoCnt} auto</span><br><span style="color:#b45309">✍️ ${manualCnt} manual</span></div><div class="ks">sin contar Mano de Obra</div></div></div>`;
}
function renderIdxCards(){
  const box=document.getElementById('idxCardsGrid');if(!box)return;
  const cats=['ipc','ipim','fuel','usd','mo'];
  const catLabel={ipc:'IPC — Índice de Precios al Consumidor',ipim:'IPIM / FADEAAC — Índice de Precios Internos Mayoristas',fuel:'Combustible',usd:'USD / Tipo de Cambio',mo:'Mano de Obra — CCT'};
  let h='';
  cats.forEach(cat=>{
    const defs=IDX_CATALOG.filter(d=>d.cat===cat);
    h+=`<div style="margin-bottom:22px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--p800)">${catLabel[cat]}</h3>${cat==='mo'?'<span class="icat mo">Paritaria — RRLL</span>':''}</div><div class="idx-cards">`;
    defs.forEach(def=>{
      const rows=idxRows(def.id), target=idxTargetYm();
      // PRIORIDAD: 1) Último del store, 2) Official seed como fallback
      const lastStore=rows.length?rows[rows.length-1]:null;
      const officialSeed = idxResolveOfficial(def,target);
      const last = lastStore || officialSeed;
      
      // FORZAR valor del store si existe
      // Para USD usar 'value', para otros usar 'pct'
      const displayValue = lastStore ? (lastStore.value != null ? lastStore.value : lastStore.pct) : (officialSeed ? officialSeed.pct : null);
      const displayYm = lastStore ? lastStore.ym : (officialSeed ? officialSeed.ym : null);
      
      // DEBUG CRÍTICO

      // Sparkline: adaptar para USD (usa 'value') vs otros índices (usa 'pct')
      const spark8 = rows.slice(-8);
      let sparkH = '';
      
      if (def.cat === 'usd') {
        // Para USD: calcular variación porcentual entre períodos
        const vals = spark8.map(r => r.value || 0);
        const maxAbs = Math.max(...vals.map((v, i) => i > 0 ? Math.abs((v - vals[i-1]) / vals[i-1] * 100) : 0), 0.001);
        sparkH = spark8.map((r, i) => {
          if (i === 0) return '<div class="spark-b pos" style="height:2px" title="' + fN(r.value) + ' ' + formatMonth(r.ym) + '"></div>';
          const pct = ((r.value - vals[i-1]) / vals[i-1]) * 100;
          const h8 = Math.max(Math.round(Math.abs(pct) / maxAbs * 28), 2);
          return '<div class="spark-b ' + (pct >= 0 ? 'pos' : 'neg') + '" style="height:' + h8 + 'px" title="' + fN(r.value) + ' (' + pctStr(pct) + ') ' + formatMonth(r.ym) + '"></div>';
        }).join('');
      } else {
        // Para índices con valores absolutos (ej: IPC NQN manual): calcular pct en tiempo real
        const hasVals = spark8.some(r => r.value != null && r.value !== 0);
        if (hasVals) {
          const allRows = idxRows(def.id);
          const dispP = spark8.map((r, i) => {
            if (r.value == null) return r.pct != null ? r.pct : null;
            let prev = null;
            for (let j = i - 1; j >= 0; j--) { if (spark8[j].value != null && spark8[j].value !== 0) { prev = spark8[j]; break; } }
            if (!prev) {
              const idx = allRows.findIndex(x => x.ym === r.ym);
              for (let j = idx - 1; j >= 0; j--) { if (allRows[j].value != null && allRows[j].value !== 0) { prev = allRows[j]; break; } }
            }
            if (!prev) return r.pct != null ? r.pct : null;
            // Use value computation only for consecutive months; otherwise stored pct is more reliable
            if (prev.ym === idxPrevYm(r.ym)) return ((r.value / prev.value) - 1) * 100;
            return r.pct != null ? r.pct : ((r.value / prev.value) - 1) * 100;
          });
          const maxAbs = Math.max(...dispP.map(p => Math.abs(p || 0)), 0.001);
          sparkH = spark8.map((r, i) => {
            const pct = dispP[i] ?? 0;
            const h8 = Math.max(Math.round(Math.abs(pct) / maxAbs * 28), 2);
            return '<div class="spark-b ' + (pct >= 0 ? 'pos' : 'neg') + '" style="height:' + h8 + 'px" title="' + pctStr(pct, 1) + ' ' + formatMonth(r.ym) + '"></div>';
          }).join('');
        } else {
          const maxAbs = Math.max(...spark8.map(r => Math.abs(r.pct || 0)), 0.001);
          sparkH = spark8.map(r => {
            const pct = r.pct || 0;
            const h8 = Math.max(Math.round(Math.abs(pct) / maxAbs * 28), 2);
            return '<div class="spark-b ' + (pct >= 0 ? 'pos' : 'neg') + '" style="height:' + h8 + 'px" title="' + pctStr(pct) + ' ' + formatMonth(r.ym) + '"></div>';
          }).join('');
        }
      }
      
      // Formatear valor según tipo de índice (USD usa value, otros usan pct)
      const formattedValue = idxValueLabel(def, lastStore || officialSeed);
      
      const upToDate=idxIsUpToDate(def.id);
      const statusBadge=upToDate?'<span title="Al día" style="font-size:14px">✅</span>':'<span title="Desactualizado" style="font-size:14px">⚠️</span>';
      const isAutoSrc=cat!=='mo'&&(def.fetchMode||'manual')!=='manual';
      const srcModeBadge=cat==='mo'?'':(isAutoSrc
        ?'<span title="Se actualiza solo con \'Actualizar todos\' / 🔄" style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;background:var(--g100d,#dcfce7);color:var(--g700,#15803d);white-space:nowrap">🔗 AUTOMÁTICO</span>'
        :'<span title="No tiene fuente pública automatizable — cargar el % manualmente cada mes" style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;background:#fef3c7;color:#92400e;white-space:nowrap">✍️ MANUAL</span>');
      const nextYm=idxNextYm(def.id);
      const addBtn=cat!=='mo'?`<button class="btn btn-p btn-sm" onclick="event.stopPropagation();idxAddNextMonth('${def.id}')" title="Agregar ${formatMonth(nextYm)}">+ ${formatMonth(nextYm)}</button>`:'';
      const pubBadge=idxPubBadge(def);
      h+=`<div class="idx-c ${_idxSel===def.id?'sel':''}" onclick="openIdxDet('${def.id}')"><div class="idx-c-top ${CAT_CSS[cat]}"></div><div class="idx-c-body"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:4px"><div class="idx-c-name">${esc(def.name)}${def.cct?'<div style="font-size:9.5px;color:var(--g500);font-weight:600;margin-top:2px">'+esc(def.cct)+'</div>':''}<div style="font-size:10px;color:var(--g500);font-weight:600;margin-top:4px">Objetivo: ${formatMonth(target)} · Últ.: ${displayYm?formatMonth(displayYm):'—'}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">${statusBadge}<span class="icat ${CAT_PILL[cat]}">${esc(def.src)}</span>${srcModeBadge}</div></div><div class="idx-c-kpi"><span class="big ${last?.value!=null?'pos':pctColor(displayValue)}">${formattedValue}</span><span class="period">${displayYm?formatMonth(displayYm):'sin datos'}</span>${last?.status==='fallback'?'<span style="font-size:11px" title="Fallback">↩️</span>':''}</div>${spark8.length?`<div class="spark">${sparkH}</div>`:`<div style="height:28px;display:flex;align-items:center;font-size:11px;color:var(--g400)">Sin datos aún</div>`}<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:6px;flex-wrap:wrap">${addBtn}${cat!=='mo'?`<button class="btn btn-s btn-sm" onclick="event.stopPropagation();runIdxUpdate('${def.id}')">🔄</button>`:''}</div>${pubBadge?`<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--g100)">${pubBadge}</div>`:''}</div></div>`;
    });
    h+='</div></div>';
  });
  box.innerHTML=h;
}

// ── Open detail ────────────────────────────────────────────────────────
function openIdxDet(id){
  _idxSel=id;
  renderIdxView();
  window.scrollTo({top:0,behavior:'smooth'});
}
// ── Detail panel ───────────────────────────────────────────────────────
function renderIdxDet(id){
  const def=IDX_CATALOG.find(d=>d.id===id);
  const box=document.getElementById('idxDetPanel');if(!box||!def)return;
  const rows=idxRows(id), yms=rows.map(r=>r.ym), chartRows=rows.slice(-18);
  // For value-based indices compute pct on-the-fly from consecutive values
  const hasValues=chartRows.some(r=>r.value!=null&&r.value!==0);
  const dispPcts=chartRows.map((r,i)=>{
    if(hasValues&&r.value!=null){
      // Find nearest previous row with a value
      let prev=null;
      for(let j=i-1;j>=0;j--){if(chartRows[j].value!=null&&chartRows[j].value!==0){prev=chartRows[j];break;}}
      if(!prev){
        const allRows=idxRows(id);const idx2=allRows.findIndex(x=>x.ym===r.ym);
        for(let j=idx2-1;j>=0;j--){if(allRows[j].value!=null&&allRows[j].value!==0){prev=allRows[j];break;}}
      }
      if(prev){
        // Only compute from values when prev is the consecutive month
        // (avoids accumulating multiple months when there's a pct-only gap)
        if(prev.ym===idxPrevYm(r.ym))return((r.value/prev.value)-1)*100;
        if(r.pct!=null)return r.pct; // gap: stored pct is more reliable
        return((r.value/prev.value)-1)*100; // no stored pct: best effort
      }
      return r.pct!=null?r.pct:null;
    }
    return r.pct!=null?r.pct:null;
  });
  const maxAbs=Math.max(...dispPcts.map(p=>Math.abs(p||0)),0.001);
  // need at least 2 rows to show meaningful bars (first row has no previous to compare)
  const barsContent=chartRows.length<=1
    ? `<div style="height:72px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--g400)">Se necesitan al menos 2 períodos para mostrar variaciones</div>`
    : chartRows.map((r,i)=>{ const pct=dispPcts[i]??0; const h=Math.max(Math.round(Math.abs(pct)/maxAbs*72),2); const isLast=i===chartRows.length-1; return `<div class="cbar-wrap"><div class="cbar-val ${pct>=0?'pos':'neg'}">${pctStr(pct,1)}</div><div class="cbar ${pct>=0?'pos':'neg'} ${isLast?'act':''}" style="height:${h}px"></div><div class="cbar-lbl">${formatMonth(r.ym).replace(' ','\n')}</div></div>`; }).join('');
  // selects: use real yms when ≥1, fall back to placeholder only when empty
  const selYms=yms.length?yms:['—'];
  const selOpts=selYms.map((ym,i)=>`<option value="${ym}"${i===0?'selected':''}>${ym==='—'?'—':formatMonth(ym)}</option>`).join('');
  const selOptTo=selYms.map((ym,i)=>`<option value="${ym}"${i===selYms.length-1?'selected':''}>${ym==='—'?'—':formatMonth(ym)}</option>`).join('');
  const tblRows=[...rows].reverse().map(r=>`<tr${r.needsReview?' style="background:#fef2f2"':''}><td>${r.needsReview?`<span title="${esc(r.reviewReason||'Necesita revisión')}" style="margin-right:4px">⚠️</span>`:''}${formatMonth(r.ym)}</td><td class="mono ${r.value!=null?'pos':((r.pct||0)>=0?'pos':'neg')}">${r.value!=null?fN(r.value):pctStr(r.pct)}</td><td style="text-align:center">${r.confirmed?'<span style="cursor:pointer" onclick="toggleIdxConfirm(\'${id}\',\'${r.ym}\',false)" title="Click para desconfirmar">✅</span>':'<span style="cursor:pointer;color:var(--g400)" onclick="toggleIdxConfirm(\'${id}\',\'${r.ym}\',true)" title="Click para confirmar">○</span>'}</td><td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.reviewReason||r.note||idxStatusLabel(r.status)||'')}">${r.needsReview?'<strong style="color:#b91c1c">⚠ Revisar: </strong>':''}${esc(r.needsReview?(r.reviewReason||'necesita revisión'):(r.note||idxStatusLabel(r.status)||'—'))}${r.sourceUrl?` <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener" title="Ver fuente de este dato" onclick="event.stopPropagation()">🔗</a>`:''}</td><td>${(r.files||[]).length?`<button class="btn btn-s btn-sm" onclick="downloadIdxFile(\'${id}\',\'${r.ym}\',0)" style="font-size:10px;padding:2px 7px">📎 ${(r.files||[]).length}</button>`:'—'}</td><td style="white-space:nowrap"><button class="btn btn-s btn-sm" style="font-size:10px;padding:2px 6px;margin-right:3px" onclick="openEntryModal(\'${id}\',\'${r.ym}\')" title="Editar">✏️</button><button class="btn btn-d btn-sm" style="font-size:10px;padding:2px 6px" onclick="deleteIdxRow(\'${id}\',\'${r.ym}\')" title="Eliminar">🗑</button></td></tr>`).join('');
  box.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px"><div><h3 style="margin:0">${esc(def.name)}</h3><div style="font-size:12px;color:var(--g500)">Fuente: ${esc(def.src)} · Estado: ${idxStatusText(id)}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${def.cat!=='mo'?`<button class="btn btn-s btn-sm" onclick="runIdxUpdate('${id}')">🔄 Actualizar</button>`:''}<button class="btn btn-s btn-sm" onclick="_idxSel=null;renderIdxView()">← Volver</button><button class="btn btn-p btn-sm" onclick="openEntryModal('${id}',null)">➕ Cargar</button><button class="btn btn-s btn-sm" onclick="confirmAllIdx('${id}')">✅ Confirmar todos</button><button class="btn btn-s btn-sm" title="Recalcula el % de cada período a partir del Valor ya guardado (no toca el Valor ni el estado de confirmado) — útil si el % quedó mal de una carga anterior" onclick="recalcPctFromValues('${id}')">🔧 Recalcular %</button><button class="btn btn-d btn-sm" style="font-size:11px" onclick="if(confirm('¿Borrar todos los datos de este índice?')){IDX_STORE['${id}']={rows:[]};saveIdx().then(()=>{renderIdxView();toast('Índice limpiado','ok');});}">🗑 Limpiar</button></div></div><div class="card"><div class="chart-bars">${chartRows.length?barsContent:'<div class="small">Sin datos</div>'}</div></div><div class="card" style="margin-top:12px"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><label>Acumulado desde</label><select id="idxFrom">${selOpts}</select><label>hasta</label><select id="idxTo">${selOptTo}</select><button class="btn btn-s btn-sm" onclick="calcIdxAcum('${id}')">Calcular</button><span id="idxAcumRes" class="mono"></span></div><div style="overflow:auto"><table class="tbl"><thead><tr><th>Período</th><th>Valor</th><th>Confirmado</th><th>Nota</th><th>Adjuntos</th><th>Acciones</th></tr></thead><tbody>${tblRows||'<tr><td colspan="6" style="text-align:center;color:var(--g400);font-style:italic;padding:16px">Sin datos cargados. Usá ➕ Cargar para agregar el primer período.</td></tr>'}</tbody></table></div></div>`;
}

function calcIdxAcum(id){
  const from=document.getElementById('idxFrom')?.value;
  const to=document.getElementById('idxTo')?.value;
  if(!from||!to||from==='—'||to==='—'){toast('Seleccioná períodos válidos','er');return;}
  const rows=idxRows(id).filter(r=>r.ym>=from&&r.ym<=to);
  const el=document.getElementById('idxAcumRes');
  if(!rows.length){if(el)el.textContent='Sin datos';return;}
  const acum=acumCompound(rows)*100;
  if(el){el.textContent=pctStr(acum,4)+' ('+rows.length+' per.)';el.style.color=acum>=0?'var(--g600)':'var(--r500)';}
}

// ══════════════════════════════════════════════════════════════════════
//  ENTRY MODAL — Cargar / editar período
// ══════════════════════════════════════════════════════════════════════
function openEntryModal(idxId, ym){
  _idxEntryId=idxId;
  const def=IDX_CATALOG.find(d=>d.id===idxId);
  const rows=idxRows(idxId);
  const existing=ym?rows.find(r=>r.ym===ym):null;
  // Default ym = next month after last entry
  let defaultYm=ym||'';
  if(!defaultYm&&rows.length){
    const last=rows[rows.length-1].ym;
    const d=new Date(last+'-01');d.setMonth(d.getMonth()+1);
    defaultYm=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  if(!defaultYm){const n=new Date();defaultYm=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}

  const filesHtml=(existing?.files||[]).map((f,fi)=>
    `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--g100)">
      <span style="flex:1;font-size:12px">📎 ${esc(f.name)}</span>
      <button class="btn btn-d btn-sm" style="font-size:10px;padding:2px 7px" onclick="removeEntryFile(${fi})">✕</button>
    </div>`
  ).join('');

  document.getElementById('idxModalBox').innerHTML=`
    <div class="idx-modal-hdr">
      <h3>${existing?'✏️ Editar período':'➕ Cargar período'} — ${esc(def.name)}</h3>
      <button class="btn btn-s btn-sm" onclick="closeIdxModal()">✕</button>
    </div>
    <div class="idx-modal-body">
      <div class="fg2" style="margin-bottom:16px">
        <div class="fgrp">
          <label>Período (mes) <span class="req">*</span></label>
          <input type="month" id="em_ym" value="${defaultYm}" ${existing?'disabled':''}>
        </div>
        <div class="fgrp">
          <label>% Variación mensual</label>
          <input type="number" id="em_pct" step="0.01" placeholder="Ej: 2.35" value="${existing?.pct??''}">
        </div>
      </div>
      <div class="fgrp" style="margin-bottom:14px">
        <label>Valor absoluto <span style="font-size:11px;color:var(--g400)">(precio, cotización, índice — usar en lugar de % si aplica)</span></label>
        <input type="number" id="em_value" step="0.01" placeholder="Ej: 1250.50" value="${existing?.value??''}">
      </div>
      <div class="fgrp" style="margin-bottom:14px">
        <label>Nota / Link de referencia</label>
        <input type="text" id="em_note" placeholder="Ej: https://indec.gob.ar/ipc-enero-2025 o descripción" value="${esc(existing?.note||'')}">
      </div>
      <div class="fgrp" style="margin-bottom:6px">
        <label>Archivos adjuntos (PDF, imagen, etc.)</label>
        <div class="fzone" id="em_fzone" style="padding:12px" onclick="document.getElementById('em_finput').click()">
          <div class="fzi" style="font-size:20px">📎</div>
          <div class="fzt">Adjuntá el comprobante / informe</div>
        </div>
        <input type="file" id="em_finput" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv" style="display:none" onchange="handleEntryFiles(this.files)">
        <div id="em_flist">${filesHtml}</div>
      </div>
      <div style="font-size:11px;color:var(--g500)">
        ${def.srcLink?`Fuente: <a href="${def.srcLink}" target="_blank" rel="noopener" style="color:var(--p600)">↗ ${esc(def.src)}</a>`:'Fuente: '+esc(def.src)}
      </div>
    </div>
    <div class="idx-modal-foot">
      <button class="btn btn-s btn-sm" onclick="closeIdxModal()">Cancelar</button>
      <button class="btn btn-p" onclick="saveEntryModal('${idxId}','${ym||''}')">💾 Guardar</button>
    </div>`;
  document.getElementById('idxModalBack').style.display='flex';
  // Drag & drop
  const fz=document.getElementById('em_fzone');
  fz.ondragover=e=>{e.preventDefault();fz.style.borderColor='var(--p400)';};
  fz.ondragleave=()=>fz.style.borderColor='';
  fz.ondrop=e=>{e.preventDefault();fz.style.borderColor='';handleEntryFiles(e.dataTransfer.files);};
}

let _entryFiles=[];
function handleEntryFiles(fl){
  for(const f of fl){
    if(_entryFiles.length>=5){toast('Máximo 5 archivos por período','er');break;}
    const r=new FileReader();
    r.onload=e=>{_entryFiles.push({name:f.name,size:f.size,data:e.target.result});refreshEntryFileList();};
    r.readAsDataURL(f);
  }
}
function refreshEntryFileList(){
  const box=document.getElementById('em_flist');if(!box)return;
  box.innerHTML=_entryFiles.map((f,i)=>`
    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--g100)">
      <span style="flex:1;font-size:12px">📎 ${esc(f.name)} <span style="color:var(--g400)">(${(f.size/1024).toFixed(0)}KB)</span></span>
      <button class="btn btn-d btn-sm" style="font-size:10px;padding:2px 7px" onclick="removeEntryFile(${i})">✕</button>
    </div>`).join('');
}
function removeEntryFile(i){_entryFiles.splice(i,1);refreshEntryFileList();}

async function saveEntryModal(idxId, editYm){
  const ym=editYm||document.getElementById('em_ym')?.value;
  if(!ym){toast('Seleccioná el período','er');return;}
  const pctRaw=document.getElementById('em_pct')?.value;
  const valRaw=document.getElementById('em_value')?.value;
  const pct=pctRaw!==''&&pctRaw!=null?parseFloat(pctRaw):null;
  const value=valRaw!==''&&valRaw!=null?parseFloat(valRaw):null;
  if((pct===null||isNaN(pct))&&(value===null||isNaN(value))){toast('Ingresá al menos % de variación o valor absoluto','er');return;}
  const note=document.getElementById('em_note')?.value.trim()||'';
  if(!IDX_STORE[idxId])IDX_STORE[idxId]={};
  if(!IDX_STORE[idxId].rows)IDX_STORE[idxId].rows=[];
  const existing=IDX_STORE[idxId].rows.find(r=>r.ym===ym);
  // Auto-calculate pct from previous row when only value is provided
  let finalPct = isNaN(pct) ? null : pct;
  if (finalPct === null && value != null && !isNaN(value)) {
    const prevRows = (IDX_STORE[idxId].rows||[]).filter(r=>r.ym < ym && r.value != null && !isNaN(r.value)).sort((a,b)=>a.ym.localeCompare(b.ym));
    if (prevRows.length) {
      const prev = prevRows[prevRows.length - 1];
      if (prev.value !== 0) finalPct = ((value / prev.value) - 1) * 100;
    }
  }
  // Merge files: keep existing + add new
  const existingFiles=existing?.files||[];
  const allFiles=[...existingFiles,..._entryFiles];
  // Carga/edición manual: el humano ya está validando al tipear, así que se saca
  // cualquier aviso "needsReview" que hubiera quedado de un fetch automático previo.
  const row={ym,pct:finalPct,value:isNaN(value)?null:value,note,files:allFiles,confirmed:existing?.confirmed||false,needsReview:false,reviewReason:''};
  if(existing){Object.assign(existing,row);}
  else{IDX_STORE[idxId].rows.push(row);IDX_STORE[idxId].rows.sort((a,b)=>a.ym.localeCompare(b.ym));}
  const ok=await saveIdx();
  closeIdxModal();
  toast(ok?(formatMonth(ym)+': '+(value!=null?'$'+value.toFixed(2):pctStr(pct))+' guardado'):'⚠ Guardado local — no se pudo sincronizar con Supabase',ok?'ok':'er');
  renderIdxView();
}

function closeIdxModal(){
  document.getElementById('idxModalBack').style.display='none';
  _entryFiles=[];
}

// ── Actions ────────────────────────────────────────────────────────────
async function toggleIdxConfirm(idxId,ym,val){
  const r=(IDX_STORE[idxId]?.rows||[]).find(r=>r.ym===ym);
  if(!r)return;
  r.confirmed=val;
  // Confirmar a mano es la revisión humana que "needsReview" estaba pidiendo.
  if(val){r.needsReview=false;r.reviewReason='';}
  const ok=await saveIdx();
  renderIdxView();
  if(!ok)toast('⚠ Cambio guardado local — no se pudo sincronizar con Supabase','er');
}
async function confirmAllIdx(idxId){
  // Mismo criterio que toggleIdxConfirm: confirmar a mano es la revisión
  // humana que needsReview estaba pidiendo — "Confirmar todos" se olvidaba
  // de limpiarlo, dejaba la fila en rojo con el aviso pese a estar ✅.
  (IDX_STORE[idxId]?.rows||[]).forEach(r=>{r.confirmed=true;r.needsReview=false;r.reviewReason='';});
  const ok=await saveIdx();
  renderIdxView();
  toast(ok?'Todos confirmados':'⚠ Confirmado local — no se pudo sincronizar con Supabase',ok?'ok':'er');
}
// Recalcula el % mensual a partir de la secuencia de "Valor" YA GUARDADA
// (value), sin tocar el value ni el estado de "confirmado" — corrige filas
// cuyo % quedó mal calculado por una carga anterior a los fixes de parseo
// de esta sesión (ej. IPIM tomando la columna de rubro equivocada en su
// momento), pero cuyo Valor absoluto sí es correcto. Re-valida cada fila
// (needsReview/reviewReason) con el % ya corregido.
async function recalcPctFromValues(idxId){
  const def=IDX_CATALOG.find(d=>d.id===idxId);
  if(!def){ toast('Índice no encontrado','er'); return; }
  const rows=(IDX_STORE[idxId]?.rows||[]).slice().sort((a,b)=>String(a.ym).localeCompare(String(b.ym)));
  if(!rows.length){ toast('Sin datos para recalcular','er'); return; }
  let prevVal=null, changed=0;
  for(const r of rows){
    if(r.value!=null && isFinite(r.value)){
      if(prevVal!=null && prevVal>0){
        const newPct=Number(((r.value/prevVal-1)*100).toFixed(2));
        if(newPct!==r.pct){ r.pct=newPct; changed++; }
      }
      prevVal=r.value;
    }
    const flagged=withReviewFlag(def,r);
    r.needsReview=flagged.needsReview;
    r.reviewReason=flagged.reviewReason;
  }
  const ok=await saveIdx();
  renderIdxView();
  toast(ok?('% recalculado en '+changed+' período(s)'):'⚠ Recalculado local — no se pudo sincronizar con Supabase', ok?'ok':'er');
}
async function deleteIdxRow(idxId,ym){
  if(!confirm('¿Eliminar el período '+formatMonth(ym)+'?'))return;
  IDX_STORE[idxId].rows=(IDX_STORE[idxId].rows||[]).filter(r=>r.ym!==ym);
  // Tombstone to prevent seed re-injection
  if(!IDX_STORE.__deleted)IDX_STORE.__deleted={};
  if(!IDX_STORE.__deleted[idxId])IDX_STORE.__deleted[idxId]=[];
  if(!IDX_STORE.__deleted[idxId].includes(ym))IDX_STORE.__deleted[idxId].push(ym);
  const ok=await saveIdx();
  renderIdxView();
  toast(ok?'Período eliminado':'⚠ Eliminado local — no se pudo sincronizar con Supabase',ok?'ok':'er');
}
function downloadIdxFile(idxId,ym,fi){
  const row=(IDX_STORE[idxId]?.rows||[]).find(r=>r.ym===ym);
  const f=row?.files?.[fi];if(!f)return;
  const a=document.createElement('a');a.href=f.data;a.download=f.name;a.click();
}

// ── New custom index modal (future extensibility, for now just selects catalog) ──
function showNewIdxModal(){
  openEntryModal(IDX_CATALOG[0].id, null);
  // Replace header with category selector
  const hdr=document.querySelector('#idxModalBox .idx-modal-hdr h3');
  if(hdr)hdr.textContent='➕ Cargar período de índice';
  // Insert index selector at top of body
  const body=document.querySelector('#idxModalBox .idx-modal-body');
  if(!body)return;
  const selDiv=document.createElement('div');
  selDiv.className='fgrp';selDiv.style.marginBottom='16px';
  selDiv.innerHTML=`<label>Índice <span class="req">*</span></label>
    <select id="em_idxsel" onchange="switchModalIdx(this.value)" style="font-size:13px">
      ${IDX_CATALOG.map(d=>`<option value="${d.id}">${esc(d.catLabel)} — ${esc(d.name)}</option>`).join('')}
    </select>`;
  body.insertBefore(selDiv,body.firstChild);
  // Wire up save button
  const foot=document.querySelector('#idxModalBox .idx-modal-foot button:last-child');
  if(foot)foot.onclick=()=>{const sel=document.getElementById('em_idxsel')?.value||IDX_CATALOG[0].id;saveEntryModal(sel,'');};
}
function switchModalIdx(id){
  _idxEntryId=id;
  const def=IDX_CATALOG.find(d=>d.id===id);
  const note=document.getElementById('em_note');
  if(note&&def)note.placeholder='Ref: '+def.src+(def.srcLink?' — '+def.srcLink:'');
}
