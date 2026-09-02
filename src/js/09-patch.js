
(function(){
  'use strict';
  const PATCH_ID = 'PATCH_AVE_TARIFARIOS_PERIODO_V1';

  function safeToast(msg, kind){
    try {
      if (typeof toast === 'function') return toast(msg, kind || 'ok');
    } catch (_e) {}
    try { alert(String(msg || '')); } catch (_e) {}
  }

  function getDB(){
    try {
      if (typeof window.DB !== 'undefined' && Array.isArray(window.DB)) return window.DB;
    } catch(_e) {}
    try {
      if (Array.isArray(window.DB)) return window.DB;
    } catch(_e) {}
    return [];
  }

  function getDetId(){
    try {
      if (typeof window.detId !== 'undefined') return window.detId;
    } catch(_e) {}
    try { return window.detId; } catch(_e) {}
    return null;
  }

  function currentContract(){
    try {
      const db = getDB();
      const did = getDetId();
      return db.find(function(x){ return String(x.id) === String(did); }) || null;
    } catch(_e) {
      return null;
    }
  }

  function norm(v){ return String(v == null ? '' : v).trim(); }

  function normPeriod(v){
    const s = norm(v);
    let m = s.match(/\b(20\d{2})[-_/](0[1-9]|1[0-2])\b/);
    if (m) return m[1] + '-' + m[2];
    m = s.match(/\b(0[1-9]|1[0-2])[-_/](20\d{2})\b/);
    if (m) return m[2] + '-' + m[1];
    return '';
  }

  function detectPeriod(v){
    const direct = normPeriod(v);
    if (direct) return direct;
    try {
      if (typeof detectPeriodFromText === 'function') {
        const r = detectPeriodFromText(v);
        return normPeriod(r) || norm(r);
      }
    } catch(_e) {}
    const s = String(v == null ? '' : v).toLowerCase();
    const map = {ene:'01',enero:'01',feb:'02',febrero:'02',mar:'03',marzo:'03',abr:'04',abril:'04',may:'05',mayo:'05',jun:'06',junio:'06',jul:'07',julio:'07',ago:'08',agosto:'08',sep:'09',sept:'09',septiembre:'09',setiembre:'09',oct:'10',octubre:'10',nov:'11',noviembre:'11',dic:'12',diciembre:'12'};
    for (const k in map) {
      const rx = new RegExp(k + '\\s+(20\\d{2})');
      const m = s.match(rx);
      if (m) return m[1] + '-' + map[k];
    }
    return '';
  }

  function uniq(arr){
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  function tariffPeriods(t){
    if (!t) return [];
    const out = [];
    if (Array.isArray(t.periods)) {
      t.periods.forEach(function(p){ out.push(detectPeriod(p)); });
    }
    out.push(detectPeriod(t.period));
    out.push(detectPeriod(t.periodo));
    out.push(detectPeriod(t.name));
    out.push(detectPeriod(t.source));
    out.push(detectPeriod(t.sourceTableName));
    out.push(detectPeriod(t.title));
    return uniq(out);
  }

  function avePeriods(a){
    if (!a) return [];
    const out = [];
    if (Array.isArray(a.periods)) {
      a.periods.forEach(function(p){ out.push(detectPeriod(p)); });
    }
    if (Array.isArray(a.selectedPeriods)) {
      a.selectedPeriods.forEach(function(p){
        if (typeof p === 'string') out.push(detectPeriod(p));
        else if (p && typeof p === 'object') out.push(detectPeriod(p.period || p.ym || p.value || p.label));
      });
    }
    out.push(detectPeriod(a.periodo));
    out.push(detectPeriod(a.period));
    out.push(detectPeriod(a.concepto));
    out.push(detectPeriod(a.subtipo));
    return uniq(out);
  }

  function collectTargets(cc, seedPeriods, seedEnmNums){
    const periods = new Set(uniq((seedPeriods || []).map(detectPeriod).filter(Boolean)));
    const enmNums = new Set((seedEnmNums || []).filter(function(x){ return x != null && x !== ''; }).map(function(x){ return Number(x); }));
    let changed = true;
    while (changed) {
      changed = false;
      (cc.tarifarios || []).forEach(function(t){
        const tPeriods = tariffPeriods(t);
        const hit = tPeriods.some(function(p){ return periods.has(p); }) || (t.enmNum != null && enmNums.has(Number(t.enmNum)));
        if (hit) {
          tPeriods.forEach(function(p){ if (p && !periods.has(p)) { periods.add(p); changed = true; } });
          if (t.enmNum != null && !enmNums.has(Number(t.enmNum))) { enmNums.add(Number(t.enmNum)); changed = true; }
        }
      });
      (cc.aves || []).forEach(function(a){
        const aPeriods = avePeriods(a);
        const hit = aPeriods.some(function(p){ return periods.has(p); }) || (a.enmRef != null && enmNums.has(Number(a.enmRef)));
        if (hit) {
          aPeriods.forEach(function(p){ if (p && !periods.has(p)) { periods.add(p); changed = true; } });
          if (a.enmRef != null && !enmNums.has(Number(a.enmRef))) { enmNums.add(Number(a.enmRef)); changed = true; }
        }
      });
      (cc.enmiendas || []).forEach(function(e){
        const p = detectPeriod(e.nuevoPeriodo || e.basePeriodo || e.periodo);
        const hit = (p && periods.has(p)) || (e.num != null && enmNums.has(Number(e.num)));
        if (hit) {
          if (p && !periods.has(p)) { periods.add(p); changed = true; }
          if (e.num != null && !enmNums.has(Number(e.num))) { enmNums.add(Number(e.num)); changed = true; }
        }
      });
    }
    return { periods: Array.from(periods), enmNums: Array.from(enmNums) };
  }

  function renumberEnmiendas(cc){
    const map = new Map();
    (cc.enmiendas || []).forEach(function(e, idx){
      const oldNum = Number(e.num);
      const newNum = idx + 1;
      map.set(oldNum, newNum);
      e.num = newNum;
    });

    (cc.tarifarios || []).forEach(function(t){
      if (t.enmNum != null) {
        const oldNum = Number(t.enmNum);
        if (map.has(oldNum)) t.enmNum = map.get(oldNum);
        else delete t.enmNum;
      }
      if (typeof t.name === 'string') {
        t.name = t.name.replace(/\(Enm\.(\d+)\)/g, function(_m, n){
          const oldNum = Number(n);
          return map.has(oldNum) ? '(Enm.' + map.get(oldNum) + ')' : '';
        }).replace(/\s{2,}/g, ' ').trim();
      }
    });

    (cc.aves || []).forEach(function(a){
      if (a.enmRef != null) {
        const oldNum = Number(a.enmRef);
        if (map.has(oldNum)) a.enmRef = map.get(oldNum);
        else a.enmRef = null;
      }
    });

    (cc.enmiendas || []).forEach(function(e){
      if (e.supersededBy != null) {
        const oldNum = Number(e.supersededBy);
        if (map.has(oldNum)) e.supersededBy = map.get(oldNum);
        else {
          delete e.supersededBy;
          e.superseded = false;
        }
      }
      if (e.correccionDeEnm != null) {
        const oldNum = Number(e.correccionDeEnm);
        if (map.has(oldNum)) e.correccionDeEnm = map.get(oldNum);
        else delete e.correccionDeEnm;
      }
    });
  }

  async function persistContract(cc){
    cc.updatedAt = new Date().toISOString();
    try {
      if (typeof SB_OK !== 'undefined' && SB_OK && typeof sbUpsertItem === 'function') {
        await sbUpsertItem('contratos', cc);
        return;
      }
    } catch(err) {
      console.error('[PATCH persist sbUpsertItem]', err);
    }

    try {
      if (typeof save === 'function') {
        await Promise.resolve(save());
        return;
      }
    } catch(err) {
      console.error('[PATCH persist save]', err);
    }

    try {
      localStorage.setItem('cta_v7', JSON.stringify(getDB()));
    } catch(err) {
      console.error('[PATCH persist localStorage]', err);
    }
  }

  function refreshAfterDelete(cc){
    try {
      if (typeof _tarTab !== 'undefined') {
        const maxIdx = Math.max(0, (cc.tarifarios || []).length - 1);
        if (_tarTab > maxIdx) _tarTab = maxIdx;
      }
    } catch(_e) {}
    try { if (typeof renderDet === 'function') renderDet(); } catch(err) { console.error('[PATCH renderDet]', err); }
    try { if (typeof renderTarifario === 'function') renderTarifario(); } catch(err) { console.error('[PATCH renderTarifario]', err); }
    try { if (typeof renderList === 'function') renderList(); } catch(err) { console.error('[PATCH renderList]', err); }
    try { if (typeof updNav === 'function') updNav(); } catch(err) { console.error('[PATCH updNav]', err); }
    try { if (typeof recalcTarChain === 'function') {
      const periods = (cc.tarifarios || []).map(function(t){ return detectPeriod(t.period); }).filter(Boolean).sort();
      const last = periods.length ? periods[periods.length - 1] : null;
      if (last) recalcTarChain(cc, last);
    } } catch(err) { console.error('[PATCH recalcTarChain]', err); }
    try { if (typeof recalcContractTotals === 'function') recalcContractTotals(cc); } catch(err) { console.error('[PATCH recalcContractTotals]', err); }
  }

  async function deleteAdjustedPeriods(seedPeriods, seedEnmNums){
    const cc = currentContract();
    if (!cc) {
      safeToast('Contrato no encontrado', 'er');
      return false;
    }

    cc.aves = cc.aves || [];
    cc.tarifarios = cc.tarifarios || [];
    cc.enmiendas = cc.enmiendas || [];

    const targets = collectTargets(cc, seedPeriods, seedEnmNums);
    const periods = new Set(targets.periods);
    const enmNums = new Set(targets.enmNums.map(function(x){ return Number(x); }));

    if (!periods.size && !enmNums.size) {
      safeToast('No se encontró período asociado', 'er');
      return false;
    }

    cc.aves = cc.aves.filter(function(a){
      const aPeriods = avePeriods(a);
      return !(aPeriods.some(function(p){ return periods.has(p); }) || (a.enmRef != null && enmNums.has(Number(a.enmRef))));
    });

    cc.tarifarios = cc.tarifarios.filter(function(t){
      const tPeriods = tariffPeriods(t);
      return !(tPeriods.some(function(p){ return periods.has(p); }) || (t.enmNum != null && enmNums.has(Number(t.enmNum))));
    });

    cc.enmiendas = cc.enmiendas.filter(function(e){
      const p = detectPeriod(e.nuevoPeriodo || e.basePeriodo || e.periodo);
      return !((p && periods.has(p)) || (e.num != null && enmNums.has(Number(e.num))));
    });

    renumberEnmiendas(cc);
    await persistContract(cc);
    refreshAfterDelete(cc);
    safeToast('Período ajustado eliminado completo', 'ok');
    return true;
  }

  async function deleteBySinglePeriod(period){
    const p = detectPeriod(period);
    if (!p) {
      safeToast('Período inválido', 'er');
      return false;
    }
    if (!confirm('¿Eliminar TODAS las listas, AVEs y enmiendas del período ' + p + '?')) return false;
    return deleteAdjustedPeriods([p], []);
  }

  const oldDelAveById = (typeof window.delAveById === 'function') ? window.delAveById : null;
  window.delAveById = async function(aid){
    const cc = currentContract();
    if (!cc) return oldDelAveById ? oldDelAveById(aid) : false;
    const ave = (cc.aves || []).find(function(a){ return String(a.id) === String(aid); });
    if (!ave) return oldDelAveById ? oldDelAveById(aid) : false;
    const periods = avePeriods(ave);
    const enmNums = ave.enmRef != null ? [Number(ave.enmRef)] : [];
    if (!(periods.length || enmNums.length)) return oldDelAveById ? oldDelAveById(aid) : false;
    if (!confirm('¿Eliminar este AVE y TODAS las listas del período asociado?')) return false;
    return deleteAdjustedPeriods(periods, enmNums);
  };
  try { if (typeof delAveById !== 'undefined') delAveById = window.delAveById; } catch(_e) {}

  const oldDelTarTable = (typeof window.delTarTable === 'function') ? window.delTarTable : null;
  window.delTarTable = async function(i){
    const cc = currentContract();
    const tars = (typeof getTar === 'function') ? getTar() : ((cc && cc.tarifarios) || []);
    const tar = tars && tars[i];
    if (!tar) return oldDelTarTable ? oldDelTarTable(i) : false;
    const periods = tariffPeriods(tar);
    const enmNums = tar.enmNum != null ? [Number(tar.enmNum)] : [];
    if (!(periods.length || enmNums.length)) return oldDelTarTable ? oldDelTarTable(i) : false;
    if (!confirm('¿Eliminar TODAS las listas del período asociado y el AVE relacionado?')) return false;
    return deleteAdjustedPeriods(periods, enmNums);
  };
  try { if (typeof delTarTable !== 'undefined') delTarTable = window.delTarTable; } catch(_e) {}

  function buildAvailablePeriods(cc){
    if (!cc) return [];
    return uniq([
      ...(cc.tarifarios || []).flatMap(function(t){ return tariffPeriods(t); }),
      ...(cc.aves || []).flatMap(function(a){ return avePeriods(a); }),
      ...(cc.enmiendas || []).map(function(e){ return detectPeriod(e.nuevoPeriodo || e.basePeriodo || e.periodo); })
    ]).sort();
  }

  async function promptDeletePeriod(){
    const cc = currentContract();
    if (!cc) {
      safeToast('Abrí primero un contrato', 'er');
      return false;
    }
    const available = buildAvailablePeriods(cc);
    const chosen = prompt('Ingresá período a borrar (YYYY-MM).\nDisponibles: ' + (available.join(', ') || 'ninguno'), available[0] || '');
    if (!chosen) return false;
    return deleteBySinglePeriod(chosen);
  }
  window.deleteAdjustedPeriod = promptDeletePeriod;

  function patchVersionBadge(){
    try {
      const el = document.getElementById('buildTag');
      if (el) el.textContent = (el.textContent || '').replace(/\s*$/, '') + ' · ' + PATCH_ID;
    } catch(_e) {}
  }

  function boot(){
    patchVersionBadge();
    
    // Init FASE 1 features
    try {
      if (typeof window.initKeyboardShortcuts === 'function') {
        window.initKeyboardShortcuts();
        console.log('[FASE 1] Shortcuts initialized');
      }
    } catch(e) {
      console.warn('[FASE 1] Shortcuts init failed:', e);
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', boot);
  setTimeout(boot, 300);
  setTimeout(boot, 1200);
})();

// ══════════════════════════════════════════════════════════════════════
// FASE 1 SPRINT 1.1 - SHORTCUTS + BÚSQUEDA FUZZY + FILTROS + TEMPLATE
// ══════════════════════════════════════════════════════════════════════

// ═══════════════ FUSE.JS FUZZY SEARCH ═══════════════

window.initFuzzySearch = function() {
  console.log('[initFuzzySearch] START - DB length:', window.DB?.length);
  
  if (!window.DB || !Array.isArray(window.DB)) {
    _searchCache = [];
    _fuseInstance = null;
    console.warn('[initFuzzySearch] DB not ready');
    return;
  }
  
  // CRÍTICO: Limpiar cache viejo ANTES de recrear
  _searchCache = [];
  _fuseInstance = null;
  
  var hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  _searchCache = window.DB.map(function(c){
    var fin = c.fechaFin ? new Date(c.fechaFin + 'T00:00:00') : null;
    var estado;
    
    // Verificar si tiene fechas VÁLIDAS (no vacías, no null, no undefined)
    var tieneFechaIni = c.fechaIni && String(c.fechaIni).trim().length > 0;
    var tieneFechaFin = c.fechaFin && String(c.fechaFin).trim().length > 0;
    
    if (!tieneFechaIni || !tieneFechaFin) {
      estado = 'Borrador';
    } else {
      // Si tiene fechas válidas, calcular Activo/Vencido
      estado = fin >= hoy ? 'Activo' : 'Vencido';
    }
    
    // Calcular monto total real (monto base + AVEs)
    var montoTotal = (c.monto || 0);
    if (c.aves && Array.isArray(c.aves)) {
      montoTotal += c.aves.reduce(function(sum, ave){ return sum + (ave.monto || 0); }, 0);
    }
    
    return {
      id: c.id,
      proveedor: c.cont || '',
      numero: c.num || '',
      objeto: c.det || '',
      estado: estado,
      monto: montoTotal,
      moneda: c.mon || 'ARS'
    };
  });

  if (typeof Fuse !== 'undefined') {
    _fuseInstance = new Fuse(_searchCache, {
      keys: ['proveedor', 'numero', 'objeto', 'estado'],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2
    });
  }
  
  console.log('[initFuzzySearch] DONE - Cache length:', _searchCache.length);
};

window.fuzzySearchContracts = function(query) {
  if (!query || query.length < 2) return [];
  if (!_fuseInstance) window.initFuzzySearch();
  if (!_fuseInstance) return [];

  // Búsqueda por número de contrato (mayoría de dígitos): el fuzzy match de Fuse.js
  // es demasiado permisivo para IDs numéricos y devuelve contratos sin relación con
  // el texto tipeado. Para ese caso alcanza y sobra con un substring exacto.
  var digitCount = (query.match(/\d/g) || []).length;
  if (digitCount >= Math.ceil(query.length * 0.6)) {
    return _searchCache.filter(function(c){ return String(c.numero||'').indexOf(query) !== -1; }).slice(0, 15);
  }

  var results = _fuseInstance.search(query);
  return results.slice(0, 15).map(function(r){ return r.item; });
};

window.handleFuzzySearch = function(query) {
  var resultsDiv = document.getElementById('fuzzy-results');
  if (!resultsDiv) return;
  
  if (!query || query.length < 2) {
    resultsDiv.style.display = 'none';
    return;
  }
  
  var results = window.fuzzySearchContracts(query);
  
  if (!results.length) {
    resultsDiv.innerHTML = '<div style="padding:12px;text-align:center;color:var(--g500);font-size:12px;">Sin resultados</div>';
    resultsDiv.style.display = 'block';
    return;
  }
  
  resultsDiv.innerHTML = results.map(function(c){
    var estClass = c.estado === 'Activo' ? 'act' : (c.estado === 'Borrador' ? 'pend' : 'exp');
    return '<div class="fuzzy-result-item" style="padding:10px 14px;border-bottom:1px solid var(--g100);cursor:pointer;transition:.1s;" onclick="window.selectFuzzyResult(\'' + c.id + '\')" onmouseover="this.style.background=\'var(--p50)\'" onmouseout="this.style.background=\'var(--w)\'"><div style="font-size:13px;font-weight:700;color:var(--p900);margin-bottom:2px;">' + esc(c.numero) + ' - ' + esc(c.proveedor) + '</div><div style="font-size:11px;color:var(--g600c);">' + esc(c.objeto || 'Sin objeto') + '</div><div style="display:flex;gap:8px;margin-top:4px;"><span class="bdg bdg-' + estClass + '" style="font-size:9px;">' + esc(c.estado) + '</span><span style="font-size:10px;color:var(--g500);">' + esc(c.moneda || 'ARS') + ' ' + fN(c.monto) + '</span></div></div>';
  }).join('');
  
  resultsDiv.style.display = 'block';
};

window.selectFuzzyResult = function(contractId) {
  window.detId = contractId;
  if (typeof go === 'function') go('detail');
  
  var resultsDiv = document.getElementById('fuzzy-results');
  if (resultsDiv) resultsDiv.style.display = 'none';
  
  var searchInput = document.getElementById('fuzzy-search-input');
  if (searchInput) searchInput.value = '';
};

// ═══════════════ SHORTCUTS TECLADO ═══════════════

window.initKeyboardShortcuts = function() {
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
      if (e.key === 'Escape') {
        closeAllModals();
        e.preventDefault();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof go === 'function') go('form');
      return false;
    }

    if (e.key === '/') {
      e.preventDefault();
      focusSearchInput();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      closeAllModals();
    }

    if (e.key === 'e' && window.detId) {
      e.preventDefault();
      showContractEditor();
    }

    if (e.key === 'Delete' && window.detId) {
      e.preventDefault();
      confirmDeleteContract();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentForm();
    }

    if (e.key === '?') {
      e.preventDefault();
      toggleShortcutHelp();
    }
  });
};

window.closeAllModals = function() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(function(m){ m.style.display = 'none'; });
  
  var md = document.getElementById('modal');
  if (md) md.style.display = 'none';
};

window.focusSearchInput = function() {
  var searchInput = document.getElementById('fuzzy-search-input');
  if (searchInput) {
    searchInput.focus();
    searchInput.select();
  }
};

window.showContractEditor = function() {
  var cc = window.DB ? window.DB.find(function(c){ return c.id === window.detId; }) : null;
  if (cc) {
    if (typeof go === 'function') go('detail');
    setTimeout(function(){
      var editBtn = document.querySelector('[onclick*="editCont"]');
      if (editBtn) editBtn.click();
    }, 100);
  }
};

window.confirmDeleteContract = function() {
  var cc = window.DB ? window.DB.find(function(c){ return c.id === window.detId; }) : null;
  if (!cc) return;
  
  if (confirm('¿Eliminar contrato ' + (cc.num||'') + ' - ' + (cc.cont||'') + '?')) {
    if (typeof delContract === 'function') delContract(cc.id);
  }
};

window.saveCurrentForm = function() {
  var saveBtn = document.querySelector('.btn-p[onclick*="guardar"]');
  if (saveBtn) saveBtn.click();
};

window.toggleShortcutHelp = function() {
  _shortcutHelpVisible = !_shortcutHelpVisible;
  
  var helpBox = document.getElementById('shortcut-help-box');
  
  if (!helpBox) {
    helpBox = document.createElement('div');
    helpBox.id = 'shortcut-help-box';
    helpBox.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--w);border-radius:var(--radl);box-shadow:var(--shm);padding:18px 22px;z-index:9999;max-width:320px;border:2px solid var(--p500);';
    helpBox.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><h3 style="font-size:14px;font-weight:700;color:var(--p900);">⌨️ Shortcuts</h3><button onclick="window.toggleShortcutHelp()" style="border:none;background:none;cursor:pointer;font-size:18px;color:var(--g500);">×</button></div><div style="font-size:12px;color:var(--g700);line-height:1.6;"><div style="display:grid;grid-template-columns:auto 1fr;gap:8px 12px;"><kbd style="background:var(--g100);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;">Ctrl+N</kbd><span>Nuevo contrato</span><kbd style="background:var(--g100);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;">/</kbd><span>Buscar</span><kbd style="background:var(--g100);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;">Esc</kbd><span>Cerrar modales</span><kbd style="background:var(--g100);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;">e</kbd><span>Editar contrato</span><kbd style="background:var(--g100);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;">Del</kbd><span>Eliminar contrato</span><kbd style="background:var(--g100);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;">Ctrl+S</kbd><span>Guardar</span><kbd style="background:var(--g100);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;">?</kbd><span>Ayuda shortcuts</span></div></div>';
    document.body.appendChild(helpBox);
  }
  
  helpBox.style.display = _shortcutHelpVisible ? 'block' : 'none';
};

// ═══════════════ COPY CONTRACT TEMPLATE ═══════════════
window.copyContractAsTemplate = function() {
  if (!window.detId) {
    toast('Abre un contrato primero', 'er');
    return;
  }
  
  var cc = window.DB ? window.DB.find(function(c){ return c.id === window.detId; }) : null;
  if (!cc) {
    toast('Contrato no encontrado', 'er');
    return;
  }
  
  var newContract = JSON.parse(JSON.stringify(cc));
  
  // Generar NUEVO ID único
  newContract.id = 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Limpiar campos para nuevo contrato
  newContract.num = '';
  newContract.numero = '';
  newContract.fecha = '';
  newContract.fechaIni = '';
  newContract.fechaFin = '';
  newContract.estado = 'Borrador';
  newContract.createdAt = new Date().toISOString();
  newContract.updatedAt = new Date().toISOString();
  delete newContract.__sbId;
  
  // Limpiar AVEs y OPs
  newContract.aves = [];
  newContract.ops = [];
  
  // Agregar a DB sin pisar
  if (!window.DB) window.DB = [];
  window.DB.push(newContract);
  
  // Guardar
  if (SB_OK && typeof sbUpsertItem === 'function') {
    sbUpsertItem('contratos', newContract).catch(function(e){
      console.warn('Error guardando duplicado en Supabase:', e);
      localStorage.setItem('cta_v7', JSON.stringify(window.DB));
    });
  } else {
    localStorage.setItem('cta_v7', JSON.stringify(window.DB));
  }
  
  // Setear editId y abrir formulario
  editId = newContract.id;
  
  toast('✅ Duplicado como borrador', 'ok');
  
  // Ir a form para completar datos
  setTimeout(function(){
    editCont(newContract.id);
  }, 100);
};



// ═══════════════ FILTROS GUARDADOS ═══════════════

window.loadSavedFilters = function() {
  try {
    var stored = localStorage.getItem('cta_saved_filters');
    _savedFilters = stored ? JSON.parse(stored) : [];
  } catch(e) {
    _savedFilters = [];
  }
};

window.saveFiltersList = function() {
  try {
    localStorage.setItem('cta_saved_filters', JSON.stringify(_savedFilters));
  } catch(e) {
    console.error('Error guardando filtros', e);
  }
};

window.saveCurrentFilter = function() {
  var name = prompt('Nombre del filtro:');
  if (!name) return;
  
  var filter = {
    id: 'f_' + Date.now(),
    name: name,
    estado: document.getElementById('fEst') ? document.getElementById('fEst').value : '',
    asset: document.getElementById('fAsset') ? document.getElementById('fAsset').value : '',
    dominio: document.getElementById('fDom') ? document.getElementById('fDom').value : '',
    responsable: document.getElementById('fResp') ? document.getElementById('fResp').value : '',
    owner: document.getElementById('fOwn') ? document.getElementById('fOwn').value : ''
  };
  
  _savedFilters.push(filter);
  window.saveFiltersList();
  toast('Filtro "' + name + '" guardado', 'ok');
  window.renderSavedFiltersDropdown();
};

window.applySavedFilter = function(filterId) {
  var filter = _savedFilters.find(function(f){ return f.id === filterId; });
  if (!filter) return;
  
  if (document.getElementById('fEst')) {
    document.getElementById('fEst').value = filter.estado || '';
  }
  if (document.getElementById('fAsset')) {
    document.getElementById('fAsset').value = filter.asset || '';
  }
  if (document.getElementById('fDom')) {
    document.getElementById('fDom').value = filter.dominio || '';
  }
  if (document.getElementById('fResp')) {
    document.getElementById('fResp').value = filter.responsable || '';
  }
  if (document.getElementById('fOwn')) {
    document.getElementById('fOwn').value = filter.owner || '';
  }
  
  if (typeof renderList === 'function') renderList();
  toast('Filtro "' + filter.name + '" aplicado', 'ok');
};

window.deleteSavedFilter = function(filterId) {
  _savedFilters = _savedFilters.filter(function(f){ return f.id !== filterId; });
  window.saveFiltersList();
  window.renderSavedFiltersDropdown();
  toast('Filtro eliminado', 'ok');
};

window.renderSavedFiltersDropdown = function() {
  var container = document.getElementById('saved-filters-container');
  if (!container) return;
  
  if (!_savedFilters.length) {
    container.innerHTML = '<div style="font-size:11px;color:var(--g500);padding:8px;">Sin filtros guardados</div>';
    return;
  }
  
  container.innerHTML = _savedFilters.map(function(f){
    return '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--g100);"><button class="btn btn-sm btn-p" onclick="window.applySavedFilter(\'' + f.id + '\')" style="flex:1;text-align:left;">' + f.name + '</button><button class="btn btn-sm btn-d" onclick="window.deleteSavedFilter(\'' + f.id + '\')" title="Eliminar">🗑️</button></div>';
  }).join('');
};

console.log('[FASE 1] All functions loaded');

// ── Burn rate / proyección financiera ────────────────────────────────────────
window.openBurnRate = function(cid){
  try{
    const c = (window.DB||[]).find(x=>x.id===cid);
    if(!c){ toast('Contrato no encontrado','er'); return; }
    // El N° lo asigna SAP después de crear el contrato, así que puede no existir.
    // Sin él no hay cruce posible con ME2N: hay que decir ESO, no "faltan POs".
    if(typeof tieneNumSap==='function' && !tieneNumSap(c)){
      toast('Este contrato todavía no tiene N° de SAP — sin él no se puede calcular el burn rate','er'); return;
    }
    const consumed = (typeof getConsumed==='function')?getConsumed(c.num):null;
    if(consumed===null){ toast('Sin datos de consumo (importá ME2N)','er'); return; }
    const aves=c.aves||[];
    const avePoly=aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
    const aveOwner=aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
    const montoBase = c.montoBase || ((c.monto||0) - avePoly - aveOwner);
    const tot = montoBase + avePoly + aveOwner;
    const today=new Date(); today.setHours(0,0,0,0);
    const ini=new Date((c.fechaIni||'1970-01-01')+'T00:00:00');
    const finC=new Date((c.fechaFin||'1970-01-01')+'T00:00:00');
    const totalMonths=(typeof monthDiffInclusive==='function')?monthDiffInclusive(c.fechaIni,c.fechaFin):0;
    const todayYmd=today.toISOString().substring(0,10);
    let elapsedMonths=(typeof monthDiffInclusive==='function')?monthDiffInclusive(c.fechaIni,todayYmd):0;
    if(today<ini) elapsedMonths=0;
    if(today>finC) elapsedMonths=totalMonths;
    elapsedMonths=Math.max(0,Math.min(elapsedMonths,totalMonths));
    if(elapsedMonths<1){ toast('Aún no hay meses transcurridos para proyectar','er'); return; }
    const remAmount=Math.max(tot-consumed,0);
    const histRunRate=consumed/elapsedMonths;

    // Factor de precio mes a mes para escalar el run rate al nivel tarifario actual
    const enmsApplied=(c.enmiendas||[]).filter(e=>e.tipo==='ACTUALIZACION_TARIFAS'&&!e.superseded&&e.pctPoli)
      .map(e=>({ym:e.nuevoPeriodo||'', pct:Number(e.pctPoli)||0}))
      .filter(e=>e.ym).sort((a,b)=>a.ym.localeCompare(b.ym));
    const startYm=(c.fechaIni||'').substring(0,7);
    const todayYm=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
    let _f=1, _sum=0, _n=0, _ei=0, _cur=startYm;
    while(_cur && _cur<=todayYm){
      while(_ei<enmsApplied.length && enmsApplied[_ei].ym<=_cur){ _f*=(1+enmsApplied[_ei].pct); _ei++; }
      _sum+=_f; _n++; _cur=nextYm(_cur); if(!_cur) break;
    }
    const avgFactor=_n>0?_sum/_n:1;
    const todayFactor=_f;
    const scaleToToday=avgFactor>0?(todayFactor/avgFactor):1;
    const runRate=histRunRate*scaleToToday;

    const remMonthsContract=Math.max(totalMonths-elapsedMonths,0);
    const monthsToExhaust=runRate>0?(remAmount/runRate):Infinity;
    const exhaustDate=new Date(today); exhaustDate.setDate(15);
    exhaustDate.setMonth(exhaustDate.getMonth()+Math.round(monthsToExhaust));
    const margin=monthsToExhaust-remMonthsContract;

    // % polinómico pendiente desde último base hasta hoy
    // Base = período de la última lista de precios cargada (fuente de verdad).
    // Si no hay tarifarios, caemos a c.btar y luego a fechaIni.
    const tarPeriods = (c.tarifarios||[]).map(t=>t&&t.period).filter(p=>typeof p==='string'&&/^\d{4}-\d{2}$/.test(p)).sort();
    const baseYmForBurn = (tarPeriods.length?tarPeriods[tarPeriods.length-1]:null) || c.btar || (c.fechaIni||'').substring(0,7);
    let pendingPolyPct=null;
    try{
      if(Array.isArray(c.poly) && c.poly.length && typeof computeAccumulatedVariationPct==='function'){
        const baseYm = baseYmForBurn;
        const evalYm = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
        if(baseYm && evalYm > baseYm){
          let ko=0, hasAny=false;
          c.poly.forEach(function(comp){
            const inc=comp.inc||0, idx=comp.idx||'';
            if(!idx||!inc){ ko+=inc; return; }
            const v=computeAccumulatedVariationPct(idx,baseYm,evalYm);
            if(v && isFinite(v.pct)){ ko+=inc*(1+v.pct/100); hasAny=true; }
            else ko+=inc;
          });
          if(hasAny) pendingPolyPct=(ko-1)*100;
        }
      }
    }catch(e){ console.warn('pendingPoly modal',e); }
    const hasPoly=(pendingPolyPct!=null && pendingPolyPct>0.5);
    const runRateProj = hasPoly ? runRate*(1+pendingPolyPct/100) : runRate;
    const monthsToExhaustProj = runRateProj>0?(remAmount/runRateProj):Infinity;
    const exhaustDateProj=new Date(today); exhaustDateProj.setDate(15);
    exhaustDateProj.setMonth(exhaustDateProj.getMonth()+Math.round(monthsToExhaustProj));
    const marginProj = monthsToExhaustProj-remMonthsContract;
    const decisiveMargin = hasPoly ? marginProj : margin;

    const status=(remAmount<=0||decisiveMargin<0)?'red':(decisiveMargin<3?'yellow':'green');
    const col=status==='green'?'#16a34a':status==='yellow'?'#d97706':'#dc2626';
    const bg=status==='green'?'rgba(22,163,74,.08)':status==='yellow'?'rgba(217,119,6,.10)':'rgba(220,38,38,.10)';
    const label=remAmount<=0?'Monto agotado':decisiveMargin<0?'No alcanza al fin':decisiveMargin<3?'Ajustado — margen <3 meses':'Alcanza con margen';
    const emoji=status==='green'?'🟢':status==='yellow'?'🟡':'🔴';

    // Chart: cumulative consumed real + linear projection until exhaust or fin
    const W=720,H=240,padL=64,padR=14,padT=18,padB=44;
    const xMin=ini.getTime();
    const xEndCandidate=Math.max(finC.getTime(), exhaustDate.getTime(), exhaustDateProj.getTime(), today.getTime()+86400000);
    const xMax=xEndCandidate;
    const yMax=Math.max(tot, consumed+(runRate*remMonthsContract), consumed+(runRateProj*remMonthsContract))*1.08||1;
    const xToPx=t=>padL+(W-padL-padR)*((t-xMin)/Math.max(1,xMax-xMin));
    const yToPx=v=>padT+(H-padT-padB)*(1-v/Math.max(1,yMax));

    // Real curve: ini→today linear at runRate (we don't have monthly granularity, use linear proxy)
    const realPath='M'+xToPx(xMin).toFixed(1)+','+yToPx(0).toFixed(1)
      +' L'+xToPx(today.getTime()).toFixed(1)+','+yToPx(consumed).toFixed(1);
    // Projection sin redeterminación
    const projEndT=Math.min(exhaustDate.getTime(), xMax);
    const projEndV=Math.min(consumed+runRate*((projEndT-today.getTime())/(30.44*86400000)), yMax);
    const projPath='M'+xToPx(today.getTime()).toFixed(1)+','+yToPx(consumed).toFixed(1)
      +' L'+xToPx(projEndT).toFixed(1)+','+yToPx(projEndV).toFixed(1);
    // Projection con redeterminación pendiente
    const projEndT2=Math.min(exhaustDateProj.getTime(), xMax);
    const projEndV2=Math.min(consumed+runRateProj*((projEndT2-today.getTime())/(30.44*86400000)), yMax);
    const projPath2='M'+xToPx(today.getTime()).toFixed(1)+','+yToPx(consumed).toFixed(1)
      +' L'+xToPx(projEndT2).toFixed(1)+','+yToPx(projEndV2).toFixed(1);

    // Horizontal line at TV total
    const totLineY=yToPx(tot);
    // Vertical line at fin contrato
    const finX=xToPx(finC.getTime());
    const todayX=xToPx(today.getTime());
    const exhaustX=xToPx(Math.min(exhaustDate.getTime(),xMax));
    const exhaustX2=xToPx(Math.min(exhaustDateProj.getTime(),xMax));

    const fmtNum=fmtCompactNum;
    const yTicks=[]; for(let i=0;i<=4;i++){const v=yMax*i/4; yTicks.push({v,y:yToPx(v)});}
    const yGrid=yTicks.map(t=>'<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+t.y.toFixed(1)+'" y2="'+t.y.toFixed(1)+'" stroke="rgba(0,0,0,.06)"/><text x="'+(padL-6)+'" y="'+(t.y+3).toFixed(1)+'" fill="rgba(0,0,0,.55)" font-size="10" text-anchor="end" font-family="JetBrains Mono,monospace">'+fmtNum(t.v)+'</text>').join('');
    const xTicks=[]; for(let i=0;i<=4;i++){const t=xMin+(xMax-xMin)*i/4; xTicks.push(t);}
    const xGrid=xTicks.map(t=>{const x=xToPx(t); const d=new Date(t); const lbl=String(d.getFullYear()).slice(2)+'·'+String(d.getMonth()+1).padStart(2,'0'); return '<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+padT+'" y2="'+(H-padB)+'" stroke="rgba(0,0,0,.04)"/><text x="'+x.toFixed(1)+'" y="'+(H-padB+16)+'" fill="rgba(0,0,0,.55)" font-size="10" text-anchor="middle" font-family="JetBrains Mono,monospace">'+lbl+'</text>';}).join('');

    const svg='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:280px;display:block;background:#fafaf9;border:1px solid #e5e7eb;border-radius:6px">'
      +xGrid+yGrid
      +'<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+totLineY.toFixed(1)+'" y2="'+totLineY.toFixed(1)+'" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="4 3"/>'
      +'<text x="'+(W-padR-4)+'" y="'+(totLineY-4).toFixed(1)+'" fill="#0ea5e9" font-size="10" text-anchor="end" font-weight="700">TV total</text>'
      +'<line x1="'+finX.toFixed(1)+'" x2="'+finX.toFixed(1)+'" y1="'+padT+'" y2="'+(H-padB)+'" stroke="#64748b" stroke-width="1" stroke-dasharray="2 3"/>'
      +'<text x="'+(finX+4).toFixed(1)+'" y="'+(padT+12)+'" fill="#64748b" font-size="10">Fin contrato</text>'
      +'<line x1="'+todayX.toFixed(1)+'" x2="'+todayX.toFixed(1)+'" y1="'+padT+'" y2="'+(H-padB)+'" stroke="#10b981" stroke-width="1"/>'
      +'<text x="'+(todayX+4).toFixed(1)+'" y="'+(padT+24)+'" fill="#10b981" font-size="10" font-weight="700">Hoy</text>'
      +(remAmount>0?'<line x1="'+exhaustX.toFixed(1)+'" x2="'+exhaustX.toFixed(1)+'" y1="'+padT+'" y2="'+(H-padB)+'" stroke="#64748b" stroke-width="1" stroke-dasharray="3 3"/>'
        +'<text x="'+(exhaustX+4).toFixed(1)+'" y="'+(padT+36)+'" fill="#64748b" font-size="10" font-weight="700">Agote (s/redet)</text>':'')
      +(hasPoly && remAmount>0?'<line x1="'+exhaustX2.toFixed(1)+'" x2="'+exhaustX2.toFixed(1)+'" y1="'+padT+'" y2="'+(H-padB)+'" stroke="'+col+'" stroke-width="1" stroke-dasharray="3 3"/>'
        +'<text x="'+(exhaustX2+4).toFixed(1)+'" y="'+(padT+48)+'" fill="'+col+'" font-size="10" font-weight="700">Agote (c/redet)</text>':'')
      +'<path d="'+realPath+'" fill="none" stroke="#16a34a" stroke-width="2.5"/>'
      +'<path d="'+projPath+'" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4"/>'
      +(hasPoly?'<path d="'+projPath2+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-dasharray="5 4"/>':'')
      +'<circle cx="'+todayX.toFixed(1)+'" cy="'+yToPx(consumed).toFixed(1)+'" r="4" fill="#16a34a"/>'
      +'</svg>';

    const exhaustStr=exhaustDate.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
    const exhaustStr2=exhaustDateProj.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
    const finStr=finC.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
    const moneda=c.mon||'ARS';
    const baseTarStr=baseYmForBurn||c.btar||(c.fechaIni||'').substring(0,7);

    const headerLine = hasPoly
      ? 'Con la redeterminación pendiente aplicada (<strong>+'+pendingPolyPct.toFixed(2)+'%</strong> acumulado desde '+baseTarStr+'), el monto se agota en <strong>'+exhaustStr2+'</strong> ('+(marginProj>=0?'+'+marginProj.toFixed(1)+'m vs fin':Math.abs(marginProj).toFixed(1)+'m antes')+'). Sin aplicar la redeterminación: '+exhaustStr+'.'
      : 'Si el ritmo actual se mantiene, el monto se agota en <strong>'+exhaustStr+'</strong> ('+(margin>=0?'+'+margin.toFixed(1)+'m vs fin '+finStr:Math.abs(margin).toFixed(1)+'m antes del fin '+finStr)+').';

    const pendingBlock = hasPoly
      ? '<div style="padding:10px 12px;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;margin-bottom:14px;display:flex;gap:10px;align-items:center">'
        +'<span style="font-size:18px">⚡</span>'
        +'<div style="font-size:12px;color:#9a3412"><strong>Redeterminación polinómica pendiente: +'+pendingPolyPct.toFixed(2)+'%</strong> '
          +'<span style="opacity:.85">(acumulado de la fórmula desde base '+baseTarStr+' hasta hoy). Run rate proyectado: '+moneda+' '+fN(Math.round(runRateProj))+'/mes</span>'
        +'</div></div>'
      : '';
    const appliedBlock = (scaleToToday>1.02)
      ? '<div style="padding:10px 12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;margin-bottom:14px;display:flex;gap:10px;align-items:center">'
        +'<span style="font-size:18px">📈</span>'
        +'<div style="font-size:12px;color:#1e3a8a"><strong>Tarifa hoy '+((todayFactor-1)*100).toFixed(1)+'% por encima del inicio</strong> '
          +'<span style="opacity:.85">('+enmsApplied.length+' redeterminación(es) aplicada(s)). Run rate histórico: '+moneda+' '+fN(Math.round(histRunRate))+'/mes → escalado a hoy: '+moneda+' '+fN(Math.round(runRate))+'/mes (×'+scaleToToday.toFixed(2)+')</span>'
        +'</div></div>'
      : '';

    const html='<div class="modal-content" style="max-width:820px;background:#fff;color:#111">'
      +'<div class="modal-header"><h2 style="color:#111">📊 Burn rate · '+esc(typeof numLabelText==='function'?numLabelText(c):(c.num||''))+' — '+esc(c.cont||'')+'</h2><button class="modal-close" onclick="closeBurnRate()" style="color:#111">×</button></div>'
      +'<div class="modal-body" style="padding:20px">'
        +'<div style="display:flex;gap:14px;align-items:center;padding:12px 14px;background:'+bg+';border-left:4px solid '+col+';border-radius:6px;margin-bottom:14px">'
          +'<span style="font-size:24px">'+emoji+'</span>'
          +'<div><div style="font-weight:700;color:'+col+';font-size:14px">'+label+'</div>'
          +'<div style="font-size:12px;color:#475569;margin-top:2px">'+headerLine+'</div></div>'
        +'</div>'
        +appliedBlock+pendingBlock
        +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'
          +'<div style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Run rate (efectivo)</div><div style="font-size:14px;font-weight:700;font-family:JetBrains Mono,monospace;margin-top:3px">'+moneda+' '+fN(Math.round(runRate))+'</div><div style="font-size:10px;color:#64748b;margin-top:1px">/mes'+(scaleToToday>1.02?' · hist: '+fN(Math.round(histRunRate))+' ×'+scaleToToday.toFixed(2):'')+(hasPoly?' · c/redet: '+fN(Math.round(runRateProj)):'')+'</div></div>'
          +'<div style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Consumido</div><div style="font-size:14px;font-weight:700;font-family:JetBrains Mono,monospace;margin-top:3px">'+moneda+' '+fN(Math.round(consumed))+'</div><div style="font-size:10px;color:#64748b;margin-top:1px">'+(tot>0?Math.round(consumed/tot*100):0)+'% del total</div></div>'
          +'<div style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Remanente</div><div style="font-size:14px;font-weight:700;font-family:JetBrains Mono,monospace;margin-top:3px">'+moneda+' '+fN(Math.round(remAmount))+'</div><div style="font-size:10px;color:#64748b;margin-top:1px">'+monthsToExhaust.toFixed(1)+'m s/redet'+(hasPoly?' · '+monthsToExhaustProj.toFixed(1)+'m c/redet':'')+'</div></div>'
          +'<div style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Plazo</div><div style="font-size:14px;font-weight:700;font-family:JetBrains Mono,monospace;margin-top:3px">'+elapsedMonths+'/'+totalMonths+' m</div><div style="font-size:10px;color:#64748b;margin-top:1px">restan '+remMonthsContract+' m</div></div>'
        +'</div>'
        +svg
        +'<div style="display:flex;gap:14px;font-size:11px;color:#475569;margin-top:10px;flex-wrap:wrap">'
          +'<span><span style="display:inline-block;width:18px;height:2px;background:#16a34a;vertical-align:middle;margin-right:5px"></span>Consumo real (acumulado a hoy)</span>'
          +'<span><span style="display:inline-block;width:18px;height:0;border-top:2px dashed #94a3b8;vertical-align:middle;margin-right:5px"></span>Proy. al run rate actual</span>'
          +(hasPoly?'<span><span style="display:inline-block;width:18px;height:0;border-top:2px dashed '+col+';vertical-align:middle;margin-right:5px"></span>Proy. con redeterminación (+'+pendingPolyPct.toFixed(1)+'%)</span>':'')
          +'<span><span style="display:inline-block;width:18px;height:0;border-top:1.5px dashed #0ea5e9;vertical-align:middle;margin-right:5px"></span>TV total contrato</span>'
        +'</div>'
        +'<details style="margin-top:14px;font-size:11px;color:#475569"><summary style="cursor:pointer;font-weight:600">Supuestos del cálculo</summary>'
          +'<ul style="margin:8px 0 0 18px;padding:0;line-height:1.6">'
          +'<li>Run rate histórico = consumido / meses transcurridos (proyección lineal — no contempla estacionalidad)</li>'
          +'<li>Run rate <strong>efectivo</strong> = histórico × (factor tarifa hoy / factor tarifa promedio). Escala al nivel tarifario actual considerando todas las redeterminaciones ya aplicadas — la proyección forward usa esta cifra</li>'
          +'<li>Consumo = NOV acumulado del archivo ME2N para todas las POs vinculadas al contrato</li>'
          +'<li>Redeterminación pendiente: Ko-1 calculado con la fórmula polinómica del contrato sobre los índices reales desde la base tarifaria (<code>c.btar</code>) hasta el mes actual</li>'
          +'<li>Escenario "con redeterminación" asume que el ajuste pendiente se aplica hoy y se mantiene hasta el fin del plazo</li>'
          +'<li>Mes parcial transcurrido cuenta como mes completo (monthDiffInclusive)</li>'
          +'</ul></details>'
      +'</div></div>';
    let modal=document.getElementById('burnRateModal');
    if(!modal){ modal=document.createElement('div'); modal.id='burnRateModal'; modal.className='modal'; document.body.appendChild(modal); }
    modal.innerHTML=html;
    modal.style.display='flex';
  }catch(e){ console.error('openBurnRate',e); toast('Error generando burn rate: '+e.message,'er'); }
};
window.closeBurnRate=function(){ const m=document.getElementById('burnRateModal'); if(m) m.style.display='none'; };

window.onerror = (msg, src, line, col, err) => {
  window.parent?.postMessage({type:'APP_ERROR',msg,src,line,col,stack:err?.stack},'*');
};
window.addEventListener('unhandledrejection', e => {
  window.parent?.postMessage({type:'APP_ERROR',msg:e.reason?.message||String(e.reason),src:'Promise',line:null,col:null,stack:e.reason?.stack},'*');
});
