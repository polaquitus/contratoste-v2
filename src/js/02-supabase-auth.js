async function sbFetch(table, method='GET', body=null, filter='') {
  const url = `${SB_URL}/rest/v1/${table}${filter}`;
  const opts = {method, headers: SB_HDR};
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${method} ${table} ${r.status}`);
  return method === 'DELETE' ? null : r.json();
}

// ─── LOADERS ────────────────────────────────
async function sbLoadTable(table) {
  const rows = await sbFetch(table, 'GET', null, '?select=id,datos&order=id.asc&limit=2000');
  return rows.map(r => { try { const o = JSON.parse(r.datos); o.__sbId = r.id; return o; } catch(e) { return null; } }).filter(Boolean);
}

async function sbLoadSingle(table) {
  const rows = await sbFetch(table, 'GET', null, '?select=id,datos&order=id.desc&limit=1');
  if (!rows.length) return null;
  try { const o = JSON.parse(rows[0].datos); o.__sbId = rows[0].id; return o; } catch(e) { return null; }
}

// ─── UPSERT helpers ─────────────────────────
async function sbUpsertItem(table, item) {
  if (!SB_OK) { return; }
  const payload = { datos: JSON.stringify(item) };
  console.log('[sbUpsertItem]', table, 'sbId:', item.__sbId, 'payload size:', payload.datos.length);
  if (item.__sbId) {
    const res = await sbFetch(table, 'PATCH', payload, `?id=eq.${item.__sbId}`);
    console.log('[sbUpsertItem] PATCH response:', res);
  } else {
    const res = await sbFetch(table, 'POST', payload);
    console.log('[sbUpsertItem] POST response:', res);
    if (res && res[0]) item.__sbId = res[0].id;
  }
}

async function sbDeleteItem(table, sbId) {
  if (!SB_OK || !sbId) return;
  await sbFetch(table, 'DELETE', null, `?id=eq.${sbId}`);
}

async function sbUpsertSingle(table, obj) {
  if (!SB_OK) return;
  const sbId = obj.__sbId;
  const clean = Object.assign({}, obj);
  delete clean.__sbId;
  const payload = { datos: JSON.stringify(clean) };
  if (sbId) {
    await sbFetch(table, 'PATCH', payload, `?id=eq.${sbId}`);
  } else {
    const res = await sbFetch(table, 'POST', payload);
    if (res && res[0]) obj.__sbId = res[0].id;
  }
}

// ─── STATUS BADGE ────────────────────────────
function setSBStatus(ok) {
  let b = document.getElementById('sb-status');
  if (!b) {
    b = document.createElement('span');
    b.id = 'sb-status';
    b.style.cssText = 'font-size:11px;font-weight:700;padding:4px 11px;border-radius:99px;display:inline-flex;align-items:center;gap:5px;cursor:default;margin-right:6px';
    const tba = document.querySelector('.tba');
    if (tba) tba.insertBefore(b, tba.firstChild);
  }
  if (ok) {
    b.innerHTML = '&#128994; Supabase';
    b.style.background = '#d1f5e0'; b.style.color = '#198754';
    b.title = 'Datos sincronizados con Supabase';
  } else {
    b.innerHTML = '&#128993; Modo local';
    b.style.background = '#fef3cd'; b.style.color = '#92400e';
    b.title = 'Sin conexión — datos guardados localmente';
  }
}

function showLoader(msg) {
  let el = document.getElementById('sb-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sb-loader';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(20,48,58,.88);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';
    el.innerHTML = '<div style="width:52px;height:52px;border:4px solid rgba(255,255,255,.15);border-top-color:#4c96ad;border-radius:50%;animation:sbl .8s linear infinite"></div><div id="sb-lmsg" style="color:#fff;font-size:14px;font-weight:500"></div><style>@keyframes sbl{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(el);
  }
  document.getElementById('sb-lmsg').textContent = msg;
  el.style.display = 'flex';
}
function hideLoader() { const el=document.getElementById('sb-loader'); if(el) el.style.display='none'; }

// ─── INIT ────────────────────────────────────

let _APP_USER = null;
let _APP_ROLE = null;


function authLock(){ try{ document.body.classList.add('auth-locked'); }catch(_e){} }
function populatePersonnelSelects(){
  const fill=(id,list)=>{
    const sel=document.getElementById(id);
    if(!sel||!Array.isArray(list))return;
    const cur=sel.value;
    sel.innerHTML='<option value="">—</option>'+list.map(n=>'<option>'+n.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</option>').join('');
    sel.value=cur;
  };
  fill('f_resp', typeof PERSONNEL_RESP!=='undefined'?PERSONNEL_RESP:null);
  fill('f_own', typeof PERSONNEL_OWNER!=='undefined'?PERSONNEL_OWNER:null);
}
function authUnlock(){
  try{ document.body.classList.remove('auth-locked'); }catch(_e){}
  try{ document.getElementById('loginOverlay')?.remove(); }catch(_e){}
  try{ hideLoader(); }catch(_e){}
  try{ populatePersonnelSelects(); }catch(_e){}
}
function loginOverlayHtml(){
  return `<div id="loginOverlay" style="position:fixed;inset:0;background:linear-gradient(135deg,rgba(20,48,58,.97),rgba(36,86,108,.94));z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px">
    <div style="background:#fff;border-radius:18px;box-shadow:0 25px 70px rgba(0,0,0,.35);width:430px;max-width:96vw;padding:24px 24px 18px;border:1px solid #dbe5ea">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><div style="font-size:26px">🔐</div><div><div style="font-size:21px;font-weight:800;color:#14303a">Ingreso al sistema</div><div style="font-size:12px;color:#64748b">Perfiles: OWNER / ING_CONTRATOS / RESP_TECNICO</div></div></div>
      <div style="display:grid;gap:12px">
        <div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:4px">Usuario</label><input id="lgUser" type="text" placeholder="usuario" onkeydown="_lgEnterKey(event)" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px"></div>
        <div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:4px">Contraseña</label><input id="lgPass" type="password" placeholder="••••••••" onkeydown="_lgEnterKey(event)" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px"></div>
        <div id="lgMsg" style="font-size:12px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px">Ingresá con tu usuario y contraseña.</div>
        <button class="btn btn-p" style="width:100%;justify-content:center" onclick="loginApp()">Ingresar</button>
      </div>
    </div>
  </div>`;
}
function ensureLoginOverlay(){ authLock(); if(!document.getElementById('loginOverlay')) document.body.insertAdjacentHTML('beforeend', loginOverlayHtml()); }
function _lgEnterKey(e){ if(e.key==='Enter') loginApp(); }
async function sha256Hex(str){ const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function setRoleBadge(){
  let b=document.getElementById('role-badge');
  if(!b){
    b=document.createElement('span');
    b.id='role-badge';
    b.style.cssText='font-size:11px;font-weight:700;padding:4px 11px;border-radius:99px;display:inline-flex;align-items:center;gap:5px;cursor:default;margin-right:6px;background:#e0f2fe;color:#075985';
    const tba=document.querySelector('.tba');
    if(tba) tba.insertBefore(b, tba.firstChild);
  }
  const role = (_APP_ROLE||'SIN ROL').toString().toUpperCase();
  b.className = 'auth-badge ' + role.toLowerCase().replace(/\s+/g,'_');
  b.textContent = '👤 ' + role.replaceAll('_',' ');
}
function applyRolePermissions(){
  const role = String(_APP_ROLE||'').toUpperCase();
  if(role && role!=='OWNER') document.querySelectorAll('[data-owner-only="1"]').forEach(el=>el.style.display='none');
  const sbBtn=document.getElementById('sbLogoutBtn');
  if(sbBtn) sbBtn.style.display = _APP_USER ? 'inline-flex' : 'none';
  // Update sidebar user widget
  const username = _APP_USER?.username || '';
  const initials = username ? username.substring(0,2).toUpperCase() : '—';
  const avatarEl = document.getElementById('sbAvatar');
  const nameEl = document.getElementById('sbUserName');
  const roleEl = document.getElementById('sbUserRole');
  if(avatarEl) avatarEl.textContent = initials;
  if(nameEl) nameEl.textContent = username || '—';
  if(roleEl) roleEl.textContent = role ? role.replaceAll('_',' ') : 'Sin sesión';
}
async function loginApp(){
  const u=(document.getElementById('lgUser')?.value||'').trim();
  const p=(document.getElementById('lgPass')?.value||'').trim();
  const msg=document.getElementById('lgMsg');
  if(!u||!p){ if(msg) msg.textContent='Ingresá usuario y contraseña'; return; }
  try{
    const rows = await sbFetch('app_users','GET',null,`?select=id,username,password_hash,role,active&username=eq.${encodeURIComponent(u)}&limit=1`);
    if(!rows || !rows.length) throw new Error('Usuario no encontrado');
    const row=rows[0];
    if(row.active===false || String(row.active)==='false') throw new Error('Usuario inactivo');
    const hash = await sha256Hex(p);
    if(String(hash).toLowerCase() !== String(row.password_hash||'').toLowerCase()) throw new Error('Contraseña inválida');
    _APP_USER = {id:row.id || row.username, username:row.username};
    _APP_ROLE = (row.role || 'SIN_ROL').trim();
    try{ sessionStorage.setItem('app_session', JSON.stringify({id:_APP_USER.id, username:_APP_USER.username, role:_APP_ROLE})); }catch(_e){}
    authUnlock();
    setRoleBadge();
    applyRolePermissions();
    if(typeof toast==='function') toast('Sesión iniciada: '+row.username,'ok');
    if(typeof initApp==='function') await initApp(true);
    if(typeof applyPermissions==='function') applyPermissions();
    if(typeof UsersAdmin!=='undefined' && typeof UsersAdmin.goFirstAllowed==='function') UsersAdmin.goFirstAllowed();
  }catch(err){
    _APP_USER = null;
    _APP_ROLE = null;
    authLock();
    ensureLoginOverlay();
    if(msg){ msg.textContent = err.message || 'No se pudo iniciar sesión'; msg.style.color = '#dc2626'; }
  }
}
async function requireLogin(){
  if(_APP_USER && _APP_ROLE){ setRoleBadge(); applyRolePermissions(); if(typeof applyPermissions==='function') applyPermissions(); authUnlock(); return true; }
  try{
    const raw=sessionStorage.getItem('app_session');
    if(raw){
      const s=JSON.parse(raw);
      if(s && s.username && s.role){
        _APP_USER={id:s.id||s.username, username:s.username};
        _APP_ROLE=s.role;
        setRoleBadge(); applyRolePermissions(); if(typeof applyPermissions==='function') applyPermissions(); authUnlock();
        return true;
      }
    }
  }catch(_e){}
  ensureLoginOverlay();
  return false;
}
function logoutApp(){
  _APP_USER = null;
  _APP_ROLE = null;
  try{ sessionStorage.removeItem('app_session'); }catch(_e){}
  authLock();
  setRoleBadge();
  applyRolePermissions();
  ensureLoginOverlay();
  const u=document.getElementById('lgUser'); const p=document.getElementById('lgPass'); const msg=document.getElementById('lgMsg');
  if(u) u.value='';
  if(p) p.value='';
  if(msg){ msg.textContent='Sesión cerrada. Ingresá nuevamente.'; msg.style.color='#64748b'; }
  if(typeof toast==='function') toast('Sesión cerrada','ok');
}
document.addEventListener('DOMContentLoaded', function(){
  // No re-bloquear si la sesión ya se rehidrató desde sessionStorage (la IIFE de
  // initApp() al final de este archivo corre ANTES de este evento y ya pudo haber
  // llamado authUnlock() — bloquear acá encima dejaría la UI trabada sin nada que
  // la desbloquee de nuevo).
  if(!_APP_USER) authLock();
  setRoleBadge(); applyRolePermissions();
  /* ensureLoginOverlay handled by initApp IIFE */
});

async function initApp(__fromLogin) {
  showLoader('Conectando con Supabase...');
  ['dg'].forEach(k=>{document.getElementById('f_'+k).onchange=function(){document.getElementById('l_'+k).textContent=this.checked?'Sí':'No'}});
  const fz=document.getElementById('fz');fz.ondragover=e=>{e.preventDefault()};fz.ondrop=e=>{e.preventDefault();handleFiles(e.dataTransfer.files)};
  ['f_ini','f_fin'].forEach(id=>document.getElementById(id).onchange=calcPlazo);
  if(!__fromLogin){
    const logged = await requireLogin();
    if(!logged){ hideLoader(); return; }
  }

  // Cada tabla se carga con su propio try/catch: si una falla (ej. licitaciones), no
  // hay que descartar lecturas que ya llegaron bien de Supabase (contratos, índices) y
  // reemplazarlas por una copia vieja de localStorage — antes un blip transitorio en UNA
  // tabla tiraba abajo la sincronización de TODO el resto de la sesión.
  let anyOk=false, anyFailed=false;
  try {
    showLoader('Cargando contratos...');
    window.DB = await sbLoadTable('contratos');
    anyOk=true;
  } catch(e) {
    console.warn('contratos load error:', e);
    try{window.DB=JSON.parse(localStorage.getItem('cta_v7'))||[];if(!window.DB.length)window.DB=JSON.parse(localStorage.getItem('cta_v5'))||[];}catch(ex){window.DB=[];}
    anyFailed=true;
  }
  try {
    showLoader('Cargando ME2N...');
    const me2nObj = await sbLoadSingle('me2n');
    if (me2nObj) ME2N = me2nObj;
    anyOk=true;
  } catch(e) {
    console.warn('ME2N load error:', e);
    try{ME2N=JSON.parse(localStorage.getItem('me2n_v1'))||{};}catch(ex){ME2N={};}
    anyFailed=true;
  }
  try {
    showLoader('Cargando índices...');
    const idxObj = await sbLoadSingle('indices');
    if (idxObj) { IDX_STORE = idxObj; }
    anyOk=true;
  } catch(e) {
    console.warn('índices load error:', e);
    try{IDX_STORE=JSON.parse(localStorage.getItem('idx_v2'))||{};}catch(ex){IDX_STORE={};}
    anyFailed=true;
  }
  idxMergeOfficialSeeds();
  localStorage.setItem('idx_v2', JSON.stringify(IDX_STORE));
  try {
    showLoader('Cargando licitaciones...');
    LICIT_DB = await sbLoadTable('licitaciones');
    anyOk=true;
  } catch(e) {
    console.warn('licitaciones load error:', e);
    try{LICIT_DB=JSON.parse(localStorage.getItem('licit_v1'))||[];}catch(ex){LICIT_DB=[];}
    anyFailed=true;
  }
  // Si al menos una tabla respondió, Supabase está alcanzable: los guardados posteriores
  // siguen intentando ir ahí (cada uno con su propio manejo de error) en vez de degradar
  // toda la sesión a modo local por el fallo de una sola tabla.
  SB_OK = anyOk;
  setSBStatus(SB_OK);
  if(!anyOk) toast('Sin conexión a Supabase — modo local activo','er');
  else if(anyFailed) toast('Conexión parcial a Supabase — algún dato puede estar desactualizado','er');
  // Permisos por rol: fuente de verdad en Supabase, caché en localStorage
  if(SB_OK && typeof loadRoleMatrix==='function'){ try{ await loadRoleMatrix(); }catch(_e){} }

  try { showLoader('Cargando contratistas...'); await loadProv(); }
  catch(ex) { console.warn('loadProv error', ex); try{PROV_DB=JSON.parse(localStorage.getItem('contr_v1'))||JSON.parse(localStorage.getItem('prov_v1'))||[];}catch(e3){PROV_DB=[];} }

  hideLoader();
  buildPoly(); renderList(); updNav();
  
  // Init features FASE 1 - DESPUÉS de cargar DB
  window.initKeyboardShortcuts();
  window.initFuzzySearch();
  window.loadSavedFilters();
  window.renderSavedFiltersDropdown();
  window.updateAlertBadge(); // Actualizar badge alertas
  console.log('[FASE 1] Features initialized:', {
    shortcuts: typeof window.initKeyboardShortcuts === 'function',
    fuzzy: typeof window.initFuzzySearch === 'function',
    db_length: window.DB ? window.DB.length : 0,
    cache_length: _searchCache ? _searchCache.length : 0
  });
}

// ─── PUBLIC API (called throughout app) ──────
function loadIdx() { /* handled by initApp */ }
function loadLicit() { /* handled by initApp */ }
async function loadProv() {
  // Try Supabase first
  if (SB_OK) {
    // Attempt 1: table 'contratistas' with native columns (id, vendor_num, nombre, email, telefono, rubro, payload, active)
    try {
      const rows = await sbFetch('contratistas', 'GET', null, '?select=id,vendor_num,nombre,email,telefono,rubro,payload,active&active=eq.true&order=nombre.asc&limit=5000');
      if (Array.isArray(rows) && rows.length) {
        PROV_DB = rows.map(r => {
          let extra = {};
          try { extra = (typeof r.payload === 'object' ? r.payload : JSON.parse(r.payload || '{}')) || {}; } catch(e) {}
          return {
            id: r.id || extra.id || String(r.vendor_num || ''),
            name: r.nombre || extra.name || '',
            vendorNum: r.vendor_num || extra.vendorNum || '',
            email: r.email || extra.email || '',
            telefono: r.telefono || extra.telefono || '',
            rubro: r.rubro || extra.rubro || '',
            __sbId: r.id,
            __sbNative: true,
            ...extra
          };
        });
        localStorage.setItem('contr_v1', JSON.stringify(PROV_DB));
        localStorage.setItem('prov_v1', JSON.stringify(PROV_DB));
        updNav(); if(typeof updNavProv==='function') updNavProv();
        return;
      }
    } catch(e1) {
      console.warn('[loadProv] contratistas native columns failed, trying datos column...', e1.message);
    }
    // Attempt 2: table 'contratistas' with datos column (legacy format)
    try {
      const rows2 = await sbFetch('contratistas', 'GET', null, '?select=id,datos&order=id.asc&limit=5000');
      if (Array.isArray(rows2) && rows2.length && rows2[0].datos !== undefined) {
        PROV_DB = rows2.map(r => { try { const o = JSON.parse(r.datos); o.__sbId = r.id; return o; } catch(e){ return null; } }).filter(Boolean);
        if (PROV_DB.length) {
          localStorage.setItem('contr_v1', JSON.stringify(PROV_DB));
          localStorage.setItem('prov_v1', JSON.stringify(PROV_DB));
          updNav(); if(typeof updNavProv==='function') updNavProv();
          return;
        }
      }
    } catch(e2) {
      console.warn('[loadProv] contratistas datos column failed, trying proveedores...', e2.message);
    }
    // Attempt 3: legacy 'proveedores' table
    try {
      PROV_DB = await sbLoadTable('proveedores');
      if (PROV_DB.length) {
        localStorage.setItem('contr_v1', JSON.stringify(PROV_DB));
        localStorage.setItem('prov_v1', JSON.stringify(PROV_DB));
        updNav(); if(typeof updNavProv==='function') updNavProv();
        return;
      }
    } catch(e3) {
      console.warn('[loadProv] proveedores also failed:', e3.message);
    }
    // Las 3 estrategias contra Supabase fallaron pese a estar "conectados" (SB_OK) —
    // avisar, porque lo que se muestra a continuación es caché local potencialmente vieja.
    if (typeof toast==='function') toast('No se pudo conectar con Proveedores — mostrando datos guardados localmente','er');
  }
  // Fallback: localStorage
  try {
    PROV_DB = JSON.parse(localStorage.getItem('contr_v1')) || JSON.parse(localStorage.getItem('prov_v1')) || [];
  } catch(e){ PROV_DB = []; }
  updNav(); if(typeof updNavProv==='function') updNavProv();
}

async function save() {
  if (!SB_OK) { localStorage.setItem('cta_v7', JSON.stringify(window.DB)); return; }
  const target = editId ? window.DB.find(x=>x.id===editId) : (window.detId ? window.DB.find(x=>x.id===window.detId) : window.DB[window.DB.length-1]);
  if (target) {
    console.log('[SAVE] Guardando contrato:', target.num, 'tarifarios:', (target.tarifarios||[]).length, '__sbId:', target.__sbId);
    await sbUpsertItem('contratos', target);
    console.log('[SAVE] ✓ Guardado completo');
  }
}

async function saveMe2n() {
  if (!SB_OK) { localStorage.setItem('me2n_v1', JSON.stringify(ME2N)); return; }
  await sbUpsertSingle('me2n', ME2N);
}

// saveIdx defined in IDX module below — always mirrors localStorage + Supabase when available

async function saveLicit() {
  if (!SB_OK) { localStorage.setItem('licit_v1', JSON.stringify(LICIT_DB)); return; }
  const last = LICIT_DB[LICIT_DB.length-1];
  if (last) await sbUpsertItem('licitaciones', last);
}

async function saveProv() {
  localStorage.setItem('contr_v1', JSON.stringify(PROV_DB));
  localStorage.setItem('prov_v1', JSON.stringify(PROV_DB));
  if (!SB_OK) return;
  await sbReplaceContratistas();
}

async function sbReplaceContratistas() {
  if (!SB_OK) return;
  const clean = (PROV_DB||[]).map(p=>{ const x={...p}; delete x.__sbId; return {datos: JSON.stringify(x)}; });
  try { await sbFetch('contratistas', 'DELETE', null, '?id=not.is.null'); } catch(e) { console.warn('DELETE contratistas', e); }
  if (!clean.length) return;
  const res = await sbFetch('contratistas', 'POST', clean);
  if (Array.isArray(res)) res.forEach((r,i)=>{ if(PROV_DB[i]) PROV_DB[i].__sbId = r.id; });
  localStorage.setItem('contr_v1', JSON.stringify(PROV_DB));
  localStorage.setItem('prov_v1', JSON.stringify(PROV_DB));
}


function updNav(){document.getElementById('cnt').textContent=window.DB.length;document.getElementById('poCnt').textContent=Object.keys(ME2N).length;document.getElementById('provCnt').textContent=PROV_DB.length;}

(function(){ initApp(); })();

// POLY TOGGLE & TRIGGERS
function onPolyToggle(){const on=document.getElementById('f_hasPoly').checked;document.getElementById('polyWrap').style.display=on?'':'none';document.getElementById('l_hasPoly').textContent=on?'Sí':'No';}

function onTipoContratoChange(){
  const tipo=document.getElementById('f_tipo').value;
  const isObra=tipo==='OBRA';
  document.getElementById('fg_anticipo').style.display=isObra?'':'none';
  document.getElementById('fg_anticipoMonto').style.display=isObra?'':'none';
  if(!isObra){
    document.getElementById('f_anticipoPct').value='';
    document.getElementById('f_anticipoMonto').value='';
  }
}

function calcAnticipo(){
  const monto=parseFloat(document.getElementById('f_monto').value)||0;
  const pct=parseFloat(document.getElementById('f_anticipoPct').value)||0;
  const anticipo=Math.round(monto*(pct/100)*100)/100;
  document.getElementById('f_anticipoMonto').value=anticipo||'';
}

function onTrigBToggle(){const on=document.getElementById('f_trigB').checked;document.getElementById('l_trigB').textContent=on?'Sí':'No';document.getElementById('trigB_pct').style.display=on?'flex':'none';if(!on)document.getElementById('f_trigBpct').value='';}
function onTrigCToggle(){const on=document.getElementById('f_trigC').checked;document.getElementById('l_trigC').textContent=on?'Sí':'No';document.getElementById('trigC_mes').style.display=on?'flex':'none';if(!on)document.getElementById('f_trigCmes').value='';}

function monthDiffInclusive(a,b){if(!a||!b)return 0;const d1=new Date(a+'T00:00:00'),d2=new Date(b+'T00:00:00');return Math.max((d2.getFullYear()-d1.getFullYear())*12+(d2.getMonth()-d1.getMonth())+1,0);}
function monthsRemainingInclusive(fromYm,toDateStr){if(!toDateStr)return 0;const base=fromYm?new Date(fromYm+'-01T00:00:00'):new Date();const end=new Date(toDateStr+'T00:00:00');return Math.max((end.getFullYear()-base.getFullYear())*12+(end.getMonth()-base.getMonth())+1,0);}
function ymToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function calcPlazo(){const a=document.getElementById('f_ini').value,b=document.getElementById('f_fin').value;if(a&&b)document.getElementById('f_plazo').value=monthDiffInclusive(a,b);}
function normalizeToMonthStart(v){
  if(!v)return '';
  if(/^\d{4}-\d{2}$/.test(v))return v+'-01';
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v.slice(0,7)+'-01';
  return '';
}
