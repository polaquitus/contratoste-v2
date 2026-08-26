function renderList(){
  const box=document.getElementById('tBody'),srch=(gv('fSrch')||'').toLowerCase(),fE=document.getElementById('fEst').value,hoy=new Date();hoy.setHours(0,0,0,0);
  const fComp=document.getElementById('fComp')?.value||'';
  const fAsset=document.getElementById('fAsset')?.value||'';
  const fDom=document.getElementById('fDom')?.value||'';
  const fResp=document.getElementById('fResp')?.value||'';
  const fOwn=document.getElementById('fOwn')?.value||'';
  let arr=window.DB.filter(c=>{
    const fin=new Date(c.fechaFin+'T00:00:00');const est=fin>=hoy?'ACTIVO':'VENCIDO';
    if(fE&&est!==fE)return false;
    if(srch&&!c.num.toLowerCase().includes(srch)&&!c.cont.toLowerCase().includes(srch))return false;
    const comp=getContComp(c);if(fComp&&comp!==fComp)return false;
    if(fAsset&&c.asset!==fAsset)return false;
    if(fDom&&c.gob!==fDom)return false;
    if(fResp&&c.resp!==fResp)return false;
    if(fOwn&&c.own!==fOwn)return false;
    return true;
  });
  document.getElementById('lcnt').textContent=arr.length+'/'+window.DB.length;
  if(!arr.length){box.innerHTML=window.DB.length?'<div class="empty"><div class="ei">🔍</div><p>Sin resultados.</p></div>':'<div class="empty"><div class="ei">📄</div><p>No hay contratos. Hacé clic en <strong>Nuevo Contrato</strong>.</p></div>';return;}
  let h='<div style="overflow-x:auto"><table><thead><tr><th>N° Ctto</th><th>Proveedor</th><th>Monto Total</th><th>Consumido (POs)</th><th>Remanente</th><th>% Disponible</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Completitud</th><th style="width:50px"></th></tr></thead><tbody>';
  for(const c of arr){
    const fin=new Date(c.fechaFin+'T00:00:00'),isA=fin>=hoy,tot=getTotal(c);
    const consumed=getConsumed(c.num);
    const hasConsumed=consumed!==null;
    const remanente=hasConsumed?tot-consumed:null;
    const pct=hasConsumed&&tot>0?Math.max(0,Math.min(100,(remanente/tot)*100)):null;
    const bc=pct===null?'green':pct>50?'green':pct>20?'yellow':'red';
    const pctDisplay=pct===null?'—':pct.toFixed(1)+'%';
    const pbarW=pct===null?'100':pct.toFixed(1);
    h+=`<tr class="clickable"><td class="mono" style="font-size:12px;font-weight:600" onclick="verDet('${c.id}')">${esc(c.num)}</td><td style="font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="verDet('${c.id}')">${esc(c.cont)}</td><td class="mono" style="font-size:12px" onclick="verDet('${c.id}')">${c.mon} ${fN(tot)}</td><td class="mono" style="font-size:12px;color:${hasConsumed?'var(--r500)':'var(--g500)'}" onclick="verDet('${c.id}')">${hasConsumed?c.mon+' '+fN(consumed):'—'}</td><td class="mono" style="font-size:12px;font-weight:600;color:${hasConsumed?(remanente<0?'var(--r500)':'var(--p700)'):'var(--g500)'}" onclick="verDet('${c.id}')">${hasConsumed?c.mon+' '+fN(remanente):'—'}</td><td style="min-width:100px" onclick="verDet('${c.id}')"><div style="display:flex;align-items:center;gap:8px"><div class="pbar" style="flex:1"><div class="fill ${bc}" style="width:${pbarW}%"></div></div><span style="font-size:11px;font-weight:600">${pctDisplay}</span></div></td><td onclick="verDet('${c.id}')">${fD(c.fechaIni)}</td><td onclick="verDet('${c.id}')">${fD(c.fechaFin)}</td><td onclick="verDet('${c.id}')"><span class="bdg ${isA?'act':'exp'}">● ${isA?'ACTIVO':'VENCIDO'}</span></td><td onclick="verDet('${c.id}')">${(()=>{const comp=getContComp(c);return '<span class="comp-badge '+(comp==='COMPLETO'?'full':comp==='PARCIAL'?'partial':'empty')+'">'+( comp==='COMPLETO'?'✅ Completo':comp==='PARCIAL'?'⚠️ Parcial':'❌ Pendiente')+'</span>';})()}</td><td style="text-align:center"><button class="btn btn-d btn-sm" onclick="event.stopPropagation();delCont('${c.id}')" title="Eliminar contrato">🗑️</button></td></tr>`;
  }
  h+='</tbody></table></div>';box.innerHTML=h;
}
const debouncedRenderList=debounce(renderList,180);

function verDet(id){window.detId=id;go('detail');}

function purgeDB(){
  if(!window.DB.length){toast('Base vacía','er');return;}
  if(!confirm('⚠️ ¿Eliminar TODOS los contratos ('+window.DB.length+')? Esta acción no se puede deshacer.'))return;
  if(!confirm('Confirmá por segunda vez: se borrarán '+window.DB.length+' contratos permanentemente.'))return;
  window.DB=[];save();renderList();updNav();toast('Base de datos vaciada','ok');
}

// DETAIL


function renderTarSection(c){
  const tars=(c.tarifarios||[]);
  if(!tars.length){
    return `<div class="empty"><div class="ei">📋</div><p>Sin listas de precios registradas</p></div>`;
  }
  let tabs='';
  tars.forEach((t,idx)=>{
    const label = `${esc(t.name||('Tabla '+(idx+1)))}${t.enmNum?` · Enm.${t.enmNum}`:''}${t.period?` · ${formatMonth(t.period)}`:''}`;
    tabs += `<div class="tar-tab ${idx===0?'act':''}" data-i="${idx}" onclick="showTarTab(${idx})">${label}</div>`;
  });
  let panes='';
  tars.forEach((t,idx)=>{
    const cols=t.cols||[]; const rows=t.rows||[];
    const th = cols.map(c=>`<th>${esc(c)}</th>`).join('');
    const body = rows.length ? rows.map(r=>`<tr>${cols.map((_,ci)=>`<td>${esc(r[ci]??'')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(cols.length,1)}" style="text-align:center;color:var(--g500);padding:12px">Tabla vacía</td></tr>`;
    panes += `<div class="tar-pane" id="tarPane_${idx}" style="display:${idx===0?'block':'none'}"><div class="tar-wrap"><div class="tar-actions"><span class="tar-period-tag">${esc(t.name||'Tabla')}</span>${t.enmNum?`<span class="tar-period-tag neutral">Enm.${t.enmNum}</span>`:''}${t.period?`<span class="tar-period-tag neutral">${formatMonth(t.period)}</span>`:''}${t.sourceTableName?`<span class="tar-period-tag neutral">Base: ${esc(t.sourceTableName)}</span>`:''}</div><div class="tar-preview"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div></div></div>`;
  });
  return `<div class="tar-tabs">${tabs}</div>${panes}
    <div style="margin-top:12px">
      <button class="btn btn-d btn-sm" onclick="resetSection('tarifarios')">🗑 Reset Tarifarios</button>
    </div>`;
}
function showTarTab(i){ document.querySelectorAll('.tar-tab').forEach((e,idx)=>e.classList.toggle('act', idx===i)); document.querySelectorAll('.tar-pane').forEach((e,idx)=>e.style.display = idx===i?'block':'none'); }

function renderDossierHtml(c){
  var enms=c.enmiendas||[],aves=c.aves||[];
  var licit=(typeof LICIT_DB!=='undefined'?LICIT_DB:[]).find(function(l){return l.contrato===c.num;})||null;
  var _e=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  var _m=function(n){if(!n&&n!==0)return '\u2014';return new Intl.NumberFormat('es-AR',{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(n));};
  var _d=function(s){if(!s)return '\u2014';var p=s.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:s;};
  // Estado de Compliance (DD/Pre-Risk/Sequana): status explícito si existe (contratos
  // nuevos/editados); si no, se infiere de la fecha legacy para no mostrar "Pending" en
  // contratos viejos que ya tienen la fecha cargada.
  var evalStatus=function(status,legacyDate){
    var s=status||((legacyDate&&legacyDate!==true&&legacyDate!==false)?'DONE':'PENDING');
    var map={DONE:['#dcfce7','#166534','Done'],IN_PROCESS:['#fef3c7','#92400e','In Process'],PENDING:['#f1f5f9','#475569','Pending']};
    var m=map[s]||map.PENDING;
    return '<span class="stbadge" style="background:'+m[0]+';color:'+m[1]+'">'+m[2]+'</span>';
  };
  var avePolyList=aves.filter(function(a){return a.tipo==='POLINOMICA';});
  var aveOwnerList=aves.filter(function(a){return a.tipo==='OWNER';});
  var avePoly=avePolyList.reduce(function(s,a){return s+(a.monto||0);},0);
  var aveOwner=aveOwnerList.reduce(function(s,a){return s+(a.monto||0);},0);
  // c.monto ya incluye las AVEs acumuladas (guardarEnm lo recalcula así en cada enmienda de
  // tarifas) — sumarlas de nuevo acá duplicaría cada AVE. Mismo patrón que usa renderDet.
  var montoBase=c.montoBase||((c.monto||0)-avePoly-aveOwner);
  var totalConAVE=montoBase+avePoly+aveOwner;
  var tcc=c.tc||1;
  var tipoLabel=(c.tcontr||c.tipo||'').toUpperCase().indexOf('ENMIEND')>=0?'Amendment':'New Contract';
  var docAriba=c.ariba||(licit&&licit.docAriba)||'\u2014';
  var isUsdContract=String(c.mon||'').toUpperCase().indexOf('USD')>=0;
  function kv(lbl,val,full){return '<div class="kvi"'+(full?' style="grid-column:1/-1"':'')+'><div class="kvl">'+lbl+'</div><div class="kvv">'+val+'</div></div>';}
  var ultimaEnm=enms.length?enms[enms.length-1]:null;
  var enmTipoCls={ACTUALIZACION_TARIFAS:'tar',EXTENSION:'ext',SCOPE:'scope',CLAUSULAS:'claus',OTRO:'otro'};
  var enmTipoLbl={ACTUALIZACION_TARIFAS:'ACT.TARIFAS',EXTENSION:'EXTENSI\u00d3N',SCOPE:'SCOPE',CLAUSULAS:'CL\u00c1USULAS',OTRO:'OTRO'};
  var enmRows=enms.length?enms.map(function(e){
    var ts=(typeof enmTipos==='function'?enmTipos(e):[e.tipo||'otro'])||['otro'];
    var tagsHtml=ts.map(function(t){return '<span class="tag '+(enmTipoCls[t]||'otro')+'">'+(enmTipoLbl[t]||_e(t))+'</span>';}).join(' ');
    var detalleParts=[];
    if(ts.indexOf('EXTENSION')>=0&&e.fechaFinNueva) detalleParts.push('Nueva fecha fin: '+_d(e.fechaFinNueva));
    if(ts.indexOf('ACTUALIZACION_TARIFAS')>=0){
      if(Array.isArray(e.tramos)&&e.tramos.length) detalleParts.push(e.tramos.map(function(t){return '+'+((t.pctPoli||0)*100).toFixed(2)+'% '+(formatMonth(t.basePeriodo||'')||t.basePeriodo||'\u2014')+'\u2192'+(formatMonth(t.nuevoPeriodo||'')||t.nuevoPeriodo||'\u2014');}).join(' \u00b7 '));
      else if(e.pctPoli) detalleParts.push('+'+((e.pctPoli||0)*100).toFixed(2)+'% '+(formatMonth(e.basePeriodo||'')||e.basePeriodo||'\u2014')+'\u2192'+(formatMonth(e.nuevoPeriodo||'')||e.nuevoPeriodo||'\u2014'));
    }
    var detalle=detalleParts.length?_e(detalleParts.join(' \u00b7 ')):'<span style="color:#cbd5e1">\u2014</span>';
    return '<tr'+(e.superseded?' style="opacity:.5"':'')+'><td><strong>N\u00b0'+_e(e.num)+'</strong></td><td>'+tagsHtml+(e.superseded?' <span class="tag otro" style="font-size:9px">SUPERSEDED</span>':'')+'</td><td style="font-size:12px">'+detalle+'</td><td style="font-size:12px;color:#6b7280">'+_d((e.fecha||'').substring(0,10))+'</td><td>'+_e(e.descripcion||e.motivo||'\u2014')+'</td></tr>';
  }).join(''):'<tr><td colspan="5" class="empty-cell">Sin enmiendas registradas</td></tr>';
  // Historial de AVEs: Tipo grande (Owner/Polin\u00f3mica \u2014 Spot vs Ajustable queda de detalle
  // secundario, no como categor\u00eda principal), monto en la moneda del contrato y su
  // equivalente en USD AL MOMENTO en que se carg\u00f3 (a.montoUsd, guardado fijo al crear el
  // AVE \u2014 no se recalcula con el TC de hoy). AVEs viejos sin montoUsd guardado caen a un
  // estimado con el TC actual, marcado como tal. Si el contrato ya est\u00e1 en USD no hace
  // falta columna de equivalente.
  function enmAsocLabel(a){
    if(!a.enmRef) return '\u2014';
    var lbl='Enm. N\u00b0'+a.enmRef;
    var enm=(c.enmiendas||[]).find(function(e){return e.num===a.enmRef;});
    if(enm){
      var tr=(Array.isArray(enm.tramos)&&enm.tramos.length)?(enm.tramos.find(function(t){return t.nuevoPeriodo===a.periodo;})||enm.tramos[enm.tramos.length-1]):enm;
      if(tr&&tr.basePeriodo&&tr.nuevoPeriodo){
        lbl+='<div style="font-size:10.5px;color:#6b7280;margin-top:2px">'+(formatMonth(tr.basePeriodo)||tr.basePeriodo)+' \u2192 '+(formatMonth(tr.nuevoPeriodo)||tr.nuevoPeriodo)+'</div>';
      }
    }
    return lbl;
  }
  // Monto AVE y Target Value van en una sola celda cada uno (moneda del contrato en negrita +
  // equivalente USD chico debajo), en vez de columnas separadas \u2014 con 9 columnas la tabla no
  // entraba en el ancho de la p\u00e1gina. Si el contrato ya est\u00e1 en USD no hace falta la l\u00ednea de
  // equivalente.
  function moneyCell(ars,usdVal,bold,estimated){
    var arsLine='<div style="'+(bold?'font-weight:700;':'')+'white-space:nowrap">'+_m(ars)+' '+_e(c.mon||'ARS')+'</div>';
    if(isUsdContract) return '<td class="mono" style="text-align:right">'+arsLine+'</td>';
    var estTag=estimated?' <span style="color:#9ca3af">(TC actual)</span>':'';
    return '<td class="mono" style="text-align:right">'+arsLine+'<div style="font-size:10.5px;color:#6b7280;white-space:nowrap">\u2248 '+_m(usdVal)+' USD'+estTag+'</div></td>';
  }
  // "Historial del Contrato" \u2014 no es solo el historial de AVEs: arranca con el Monto Inicial
  // (l\u00ednea base, Target Value = ese mismo monto) y de ah\u00ed en m\u00e1s cada AVE va sumando al
  // acumulado, as\u00ed se ve la evoluci\u00f3n completa del Target Value desde el origen del contrato.
  var cumTV=montoBase;
  var initUsd=tcc>0?montoBase/tcc:0;
  var initRow='<tr style="background:#f8fafc"><td><span class="tag" style="background:#dcfce7;color:#166534;white-space:nowrap">\u{1F7E2} Monto Inicial</span></td><td style="white-space:nowrap">'+_d(c.fechaIni)+'</td><td>\u2014</td><td style="font-size:11px">\u2014</td>'
    +moneyCell(montoBase,initUsd,false,false)
    +moneyCell(montoBase,initUsd,true,false)
    +'<td style="font-size:12px;color:#6b7280">Monto inicial del contrato</td></tr>';
  var aveRows=initRow+aves.slice().sort(function(a,b){return new Date(a.fecha)-new Date(b.fecha);}).map(function(a){
    var isPoly=a.tipo==='POLINOMICA';
    var tipoTxt=isPoly?'\u{1F504} AVE Polin\u00f3mica':(a.ajustable?'\u{1F535} AVE Owner Ajustable':'\u{1F535} AVE Owner Spot');
    var tipoBdg='<span class="tag '+(isPoly?'poly':'owner')+'" style="white-space:nowrap">'+tipoTxt+'</span>';
    cumTV+=(a.monto||0);
    var usdVal=a.montoUsd!=null?a.montoUsd:(tcc>0?(a.monto||0)/tcc:0);
    var tvUsd=tcc>0?cumTV/tcc:0;
    var obsCell=a.concepto?('<td style="font-size:12px;color:#6b7280">'+_e(a.concepto)+'</td>'):'<td></td>';
    return '<tr><td>'+tipoBdg+'</td><td style="white-space:nowrap">'+_d((a.fecha||'').substring(0,10))+'</td><td>'+_e(a.periodo||'\u2014')+'</td>'
      +'<td style="font-size:11px">'+enmAsocLabel(a)+'</td>'
      +moneyCell(a.monto||0,usdVal,false,a.montoUsd==null)
      +moneyCell(cumTV,tvUsd,true,false)
      +obsCell+'</tr>';
  }).join('');
  // Fuente primaria: c.rfqOferentes (lista {nombre,cotizo} armada de a uno en el
  // formulario de edici\u00f3n). Si el contrato es de antes de ese campo, se cae a los
  // campos viejos en texto libre (Participantes/Oferentes) y por \u00faltimo a LICIT_DB
  // (m\u00f3dulo Licitaciones aparte, vinculado por N\u00b0 de contrato).
  function parseNames(txt){ return String(txt||'').split(/\s*-\s*/).map(function(s){return s.trim();}).filter(Boolean); }
  var invitadosArr,recibidosArr;
  if(Array.isArray(c.rfqOferentes)&&c.rfqOferentes.length){
    invitadosArr=c.rfqOferentes.map(function(o){return o.nombre;});
    recibidosArr=c.rfqOferentes.filter(function(o){return o.cotizo;}).map(function(o){return o.nombre;});
  } else {
    var particArr=parseNames(c.participantes);
    var ofrArr=parseNames(c.oferentes);
    var licitOfrs=(licit&&licit.oferentes&&licit.oferentes.length)?licit.oferentes:[];
    invitadosArr=particArr.length?particArr:licitOfrs.map(function(o){return o.nombre||o.name||String(o);});
    recibidosArr=ofrArr.length?ofrArr:licitOfrs.filter(function(o){return o.cotizo!==false;}).map(function(o){return o.nombre||o.name||String(o);});
  }
  var nPartic=invitadosArr.length||'\u2014';
  var nOfrs=recibidosArr.length||(c.cof!=null&&c.cof!==''?c.cof:'\u2014');
  // Una sola lista de Invitados (no dos listas repitiendo los mismos nombres) \u2014 el que
  // efectivamente ofert\u00f3 se marca con una etiqueta verde "Ofert\u00f3" al lado del nombre.
  var recibidosSet={};
  recibidosArr.forEach(function(n){recibidosSet[String(n).trim().toLowerCase()]=true;});
  var invitadosHtml=invitadosArr.length?invitadosArr.map(function(n,i){
    var got=!!recibidosSet[String(n).trim().toLowerCase()];
    return '<div class="ofr-row"><span class="ofr-num">'+(i+1)+'</span><span class="ofr-name">'+_e(n)+'</span>'+(got?'<span style="font-size:10px;font-weight:700;color:#166534;background:#dcfce7;padding:2px 8px;border-radius:99px;margin-left:6px;white-space:nowrap">Ofert\u00f3</span>':'')+'</div>';
  }).join(''):'<div class="empty-cell" style="padding:8px 0">Sin registros</div>';
  // Legacy: contratos cargados antes de este campo no tienen fueComite guardado \u2014 si ya
  // tienen CC Date cargada (c.cc), se infiere que s\u00ed pasaron por comit\u00e9 en vez de mostrar
  // "NO" por default, que ser\u00eda incorrecto para la mayor\u00eda de esos contratos viejos.
  var fueComiteVal = c.fueComite!=null ? c.fueComite : !!c.cc;
  var comiteResultadoLbl={APROBADO:'✅ Aprobado',APROBADO_OBS:'🟡 Aprobado con observaciones',NO_APROBADO:'🔴 No aprobado'};
  var montoKusdLbl=function(code){var m=String(code||'').match(/^(LT|GT)(\d+)$/);return m?(m[1]==='LT'?'< ':'> ')+m[2]+' KUSD':code;};

  var CSS=':root{--navy:#003875;--orange:#FF6900;--poly:#b45309;--poly-bg:#fef3c7;--owner:#0f766e;--owner-bg:#ccfbf1;--total:#059669;--total-bg:#d1fae5;--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--bg:#eef1f5}'
+'*{box-sizing:border-box;margin:0;padding:0}'
+'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:var(--ink);background:var(--bg);padding:24px 16px}'
+'.page{background:#fff;max-width:1080px;margin:0 auto 28px;border-radius:14px;box-shadow:0 8px 30px rgba(15,35,60,.12);border:1px solid #e2e6ec}'
+'.hdr{background:linear-gradient(135deg,var(--navy),#004d99);color:#fff;padding:22px 28px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;border-radius:13px 13px 0 0}'
+'.hdr-badge{background:var(--orange);color:#fff;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;padding:5px 12px;border-radius:99px;flex-shrink:0}'
+'.hdr-main{flex:1;min-width:240px}'
+'.hdr-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.6);margin-bottom:4px;font-weight:600}'
+'.hdr-title{font-size:21px;font-weight:800;line-height:1.25;margin-bottom:4px}'
+'.hdr-sub{font-size:13.5px;color:#bfe0ff}'
+'.hdr-brand{text-align:right}'
+'.te-logo{font-size:18px;font-weight:900;letter-spacing:-.4px}'
+'.te-logo em{color:var(--orange);font-style:normal}'
+'.hdr-duet{font-size:11px;color:rgba(255,255,255,.55);margin-top:2px}'
+'.pad{padding:22px 28px}'
+'.card{border:1px solid var(--line);border-radius:10px;margin-bottom:16px;overflow:hidden}'
+'.card-title{background:#f8fafc;padding:10px 16px;font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--navy);border-bottom:1px solid var(--line)}'
+'.card-body{padding:6px 16px}'
+'.grid2{display:grid;grid-template-columns:1.6fr 1fr;gap:18px;align-items:start}'
+'.grid2b{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}'
+'.kv{display:grid;grid-template-columns:1fr 1fr}'
+'.kvi{padding:9px 4px;border-bottom:1px solid #f1f3f6}'
+'.kvl{font-size:10.5px;text-transform:uppercase;letter-spacing:.3px;color:var(--muted);font-weight:600;margin-bottom:2px}'
+'.kvv{font-size:13.5px;font-weight:600;color:#111827}'
+'.fin-card{border:2px solid var(--navy);border-radius:12px;margin:0 28px 22px}'
+'.fin-head{background:var(--navy);color:#fff;padding:12px 18px;font-size:14.5px;font-weight:800;display:flex;align-items:center;gap:8px}'
+'.fin-note{padding:10px 18px;font-size:12.5px;color:var(--muted);background:#f8fafc;border-bottom:1px solid var(--line)}'
+'.fin-row{display:flex;align-items:stretch;flex-wrap:wrap}'
+'.fin-tile{flex:1;min-width:155px;padding:14px 16px;border-right:1px solid var(--line)}'
+'.fin-tile:last-child{border-right:none}'
+'.fin-op{display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:var(--muted);padding:0 4px;background:#fafbfc}'
+'.fin-label{font-size:10.5px;text-transform:uppercase;font-weight:700;letter-spacing:.3px;color:var(--muted);margin-bottom:4px}'
+'.fin-tag{display:inline-block;font-size:9.5px;font-weight:700;padding:1px 7px;border-radius:99px;margin-left:4px;vertical-align:middle}'
+'.fin-value{font-size:18px;font-weight:800}'
+'.fin-usd{font-size:11px;color:#9aa4b2;margin-top:2px}'
+'.fin-tile.base .fin-value{color:var(--navy)}'
+'.fin-tile.poly{background:var(--poly-bg)}.fin-tile.poly .fin-value{color:var(--poly)}.fin-tile.poly .fin-tag{background:#fde68a;color:#78350f}'
+'.fin-tile.owner{background:var(--owner-bg)}.fin-tile.owner .fin-value{color:var(--owner)}.fin-tile.owner .fin-tag{background:#99f6e4;color:#134e4a}'
+'.fin-tile.total{background:var(--total-bg)}.fin-tile.total .fin-value{color:var(--total);font-size:20px}'
+'.chk-row{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:8px 16px;border-bottom:1px solid #f1f3f6;font-size:13px}'
+'.chk-row:last-child{border-bottom:none}'
+'.chkb{width:16px;height:16px;border:2px solid #cbd5e1;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;color:transparent;flex-shrink:0}'
+'.chkb.on{background:var(--total);border-color:var(--total);color:#fff}'
+'.stbadge{font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:99px;flex-shrink:0}'
+'.dd-row{display:flex;justify-content:space-between;align-items:center;padding:10px 16px}'
+'.dd-v{font-size:14px;font-weight:700;color:var(--navy)}'
+'.dd-d{font-size:13px;font-weight:700;color:var(--orange)}'
+'.contact{display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid #f1f3f6}'
+'.contact:last-child{border-bottom:none}'
+'.contact-av{width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,var(--navy),#0a5bb5);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex-shrink:0}'
+'.contact-role{font-size:10.5px;text-transform:uppercase;color:var(--muted);font-weight:600}'
+'.contact-name{font-size:13.5px;font-weight:700;color:#111827}'
+'.sgl{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:14px 16px}'
+'.sr{display:flex;flex-direction:column;gap:6px}'
+'.srl{font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.3px}'
+'.srs{height:30px;border-bottom:1.5px solid #94a3b8}'
+'.ofrs{display:grid;grid-template-columns:1fr 1fr;gap:18px}'
+'.oftit{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.3px;margin-bottom:6px}'
+'.ofcnt{display:inline-block;background:var(--navy);color:#fff;border-radius:99px;padding:1px 8px;font-size:10px;margin-left:4px;text-transform:none;letter-spacing:0}'
+'.ofr-row{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px}'
+'.ofr-num{width:18px;height:18px;background:var(--navy);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;flex-shrink:0}'
+'.ofr-name{flex:1;font-weight:500}'
+'.otag{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px}'
+'.otag.si{background:#dcfce7;color:#166534}.otag.no{background:#fef2f2;color:#991b1b}'
+'.com-card{padding:12px 16px;font-size:13px;color:#374151;line-height:1.6;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:16px}'
+'.cbl{font-weight:700;color:var(--navy);margin-right:4px}'
+'.sumbar{display:grid;grid-template-columns:repeat(4,1fr)}'
+'.sc{padding:14px 18px;border-right:1px solid var(--line);border-bottom:2px solid var(--navy)}'
+'.sc:last-child{border-right:none}'
+'.slbl{font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.3px;margin-bottom:4px}'
+'.sval{font-size:15px;font-weight:800;color:var(--navy)}'
+'.sval.g{color:var(--total)}.sval.o{color:var(--orange)}'
+'.ssub{font-size:11px;color:#9ca3af;margin-top:2px}'
+'.sh{background:var(--navy);color:#fff;padding:12px 20px;font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px;margin:20px 0 0}'
+'.sh .ico{font-size:16px}.sh .ct{font-size:11.5px;font-weight:400;opacity:.7;margin-left:4px}'
+'.tbl-wrap{padding:0 20px 20px}'
+'table{width:100%;border-collapse:collapse}'
+'th{background:#f8fafc;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#374151;text-align:left;border-bottom:2px solid var(--line)}'
+'td{padding:9px 12px;font-size:13px;border-bottom:1px solid #f1f3f6;vertical-align:top;color:var(--ink)}'
+'tr:last-child td{border-bottom:none}'
+'.empty-cell{padding:18px;text-align:center;color:#9ca3af;font-style:italic;font-size:13px}'
+'.tag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:99px;font-size:10.5px;font-weight:700}'
+'.tag.tar{background:#d1fae5;color:#065f46}.tag.ext{background:#dbeafe;color:#1e40af}.tag.scope{background:#fef3c7;color:#92400e}.tag.claus{background:#ede9fe;color:#5b21b6}.tag.otro{background:#f1f5f9;color:#475569}'
+'.tag.poly{background:var(--poly-bg);color:var(--poly)}.tag.owner{background:var(--owner-bg);color:var(--owner)}.tag.auto{background:#e0f2fe;color:#0369a1}.tag.ajust{background:#e0e7ff;color:#4338ca}'
+'.mono{font-family:"SFMono-Regular",Consolas,monospace;font-size:12.5px}'
+'.pbtn{position:fixed;bottom:20px;right:20px;background:var(--orange);color:#fff;border:none;padding:11px 20px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(255,105,0,.35);display:flex;align-items:center;gap:6px;z-index:999}'
+'.pbtn:hover{background:#cc5400}'
+'@media print{body{background:#fff;padding:0}.pbtn{display:none!important}.page{box-shadow:none;max-width:none;margin-bottom:0;border-radius:0;border:none;page-break-after:always}.page:last-child{page-break-after:auto}@page{margin:1cm}}'
+'@media (max-width:760px){.grid2,.grid2b{grid-template-columns:1fr}.sgl{grid-template-columns:1fr 1fr}.ofrs{grid-template-columns:1fr}.sumbar{grid-template-columns:1fr 1fr}}';

  var financeSection='<div class="fin-card">'
+'<div class="fin-head">&#x1F4B0;&nbsp; Valor del Contrato</div>'
+'<div class="fin-note">El <strong>Valor Total Vigente</strong> surge de sumar al valor original del contrato las Actas de Valor Econ\u00f3mico por <strong>AVE Polin\u00f3mica</strong> (ajuste de tarifas \u2014 incluye los ajustes generados sobre AVE Owner ajustables) y <strong>AVE Owner</strong> (otros conceptos: extensi\u00f3n, scope, cl\u00e1usulas, etc.).</div>'
+'<div class="fin-row">'
+'<div class="fin-tile base"><div class="fin-label">Valor Original (Header)</div><div class="fin-value">'+_m(montoBase)+' '+_e(c.mon||'ARS')+'</div><div class="fin-usd">\u2248 '+_m(Math.round(montoBase/tcc))+' USD</div></div>'
+'<div class="fin-op">+</div>'
+'<div class="fin-tile poly"><div class="fin-label">AVE Polin\u00f3mica<span class="fin-tag">Ajuste de tarifa</span></div><div class="fin-value">'+_m(avePoly)+' '+_e(c.mon||'ARS')+'</div><div class="fin-usd">'+avePolyList.length+' AVE(s) registrada(s)</div></div>'
+'<div class="fin-op">+</div>'
+'<div class="fin-tile owner"><div class="fin-label">AVE Owner<span class="fin-tag">Otros conceptos</span></div><div class="fin-value">'+_m(aveOwner)+' '+_e(c.mon||'ARS')+'</div><div class="fin-usd">'+aveOwnerList.length+' AVE(s) registrada(s)</div></div>'
+'<div class="fin-op">=</div>'
+'<div class="fin-tile total"><div class="fin-label">Valor Total Vigente</div><div class="fin-value">'+_m(totalConAVE)+' '+_e(c.mon||'ARS')+'</div><div class="fin-usd">\u2248 '+_m(Math.round(totalConAVE/tcc))+' USD \u00b7 TC '+tcc+'</div></div>'
+'</div></div>';

  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>DUET \u2014 '+_e(c.num)+' \u2014 '+_e(c.cont)+'</title>'
+'<style>'+CSS+'</style></head><body>'
+'<button class="pbtn" onclick="window.print()">&#x1F5A8; Imprimir / PDF</button>'
+'<div class="page">'
+'<div class="hdr"><span class="hdr-badge">'+tipoLabel+'</span>'
+'<div class="hdr-main"><div class="hdr-eyebrow">Servicio</div>'
+'<div class="hdr-title">'+_e(c.det||'Sin descripci\u00f3n')+'</div>'
+'<div class="hdr-sub">Contratista: <strong>'+_e(c.cont||'\u2014')+'</strong></div></div>'
+'<div class="hdr-brand"><div class="te-logo">Total<em>Energies</em></div>'
+'<div class="hdr-duet">DUET \u00b7 '+_e(c.num||'\u2014')+'</div></div></div>'
+financeSection
+'<div class="pad">'
+'<div class="grid2">'
+'<div>'
+'<div class="card"><div class="card-title">Datos Generales</div><div class="card-body"><div class="kv">'
+kv('PR # (si aplica)',_e(c.fax||'\u2014'))
+kv('UTE',_e(c.asset||c.own||'APE + SR'))
+kv('Contract #','<strong>'+_e(c.num||'\u2014')+'</strong>')
+kv('Fecha Inicio',_d(c.fechaIni))
+kv('Fecha Fin',_d(c.fechaFin))
+kv('\u00daltima Enmienda',ultimaEnm?('N\u00b0'+_e(ultimaEnm.num)):'\u2014')
+kv('Derogations',c.dg?'YES':'NO')
+(c.dg&&c.dgDoc?kv('Doc. Derogación',_e(c.dgDoc)):'')
+kv('Fax Aguada San Roque',(c.faxAsrSent?'✅ Enviado — '+_e(c.faxAsrNombre||'—'):'No enviado')+(c.faxAsrMonto?' · '+_e(montoKusdLbl(c.faxAsrMonto)):''))
+kv('Fax Aguada Pichana',(c.faxApiSent?'✅ Enviado — '+_e(c.faxApiNombre||'—'):'No enviado')+(c.faxApiMonto?' · '+_e(montoKusdLbl(c.faxApiMonto)):''))
+'</div></div></div>'
+'<div class="card"><div class="card-title">Estrategia de Contrataci\u00f3n</div><div class="card-body"><div class="kv">'
+kv('Tipo de Adjudicaci\u00f3n',_e(c.tcontr||'\u2014'))
+kv('E-sourcing # / ID Ariba',_e(docAriba))
+(c.fev?kv('Fecha Inicio de Evento',_d(c.fev)):'')
+(c.fevFin?kv('Fecha Fin de Evento',_d(c.fevFin)):'')
+kv('Contacto Proveedor',_e(c.cprov||'\u2014'))
+kv('Invitados',String(nPartic))
+kv('Ofertas recibidas',String(nOfrs))
+kv('\u00bfFue a Comit\u00e9?',fueComiteVal?'S\u00cd':'NO',true)
+(c.comiteMonto?kv('Monto',_e(montoKusdLbl(c.comiteMonto))):'')
+(fueComiteVal?(c.comiteFecha?kv('Fecha de Comit\u00e9',_d(c.comiteFecha)):'')+(c.comiteResultado?kv('Resultado',_e(comiteResultadoLbl[c.comiteResultado]||c.comiteResultado)):''):'')
+'</div>'
+(fueComiteVal&&c.comiteObs?'<div style="padding:4px 4px 10px"><div class="kvl">Observaciones del Comit\u00e9</div><div style="font-size:12.5px;color:#6b7280;font-style:italic;margin-top:3px">'+_e(c.comiteObs)+'</div></div>':'')
+(!fueComiteVal?'<div style="padding:4px 4px 10px"><div class="kvl">Justificaci\u00f3n</div><div style="font-size:12.5px;color:#6b7280;font-style:italic;margin-top:3px">'+_e(c.comiteJustif||'Sin justificaci\u00f3n cargada')+'</div></div>':'')
+(c.com?'<div style="padding:4px 4px 10px"><div class="kvl">Comentarios</div><div style="font-size:12.5px;color:#6b7280;font-style:italic;margin-top:3px">'+_e(c.com)+'</div></div>':'')+'</div></div>'
+'</div>'
+'<div>'
+'<div class="card"><div class="card-title">Compliance</div>'
+'<div class="chk-row"><span>Due Diligence</span>'+evalStatus(c.ddStatus,c.dd)+'</div>'
+'<div class="chk-row"><span>Pre-Risk</span>'+evalStatus(c.prStatus,c.pr)+'</div>'
+'<div class="chk-row"><span>Sequana</span>'+evalStatus(c.sqStatus,c.sq)+'</div>'
+'</div>'
+'<div class="card"><div class="card-title">DUET</div>'
+'<div class="contact"><div class="contact-av">&#x1F464;</div><div><div class="contact-role">Contract Manager</div><div class="contact-name">'+_e(c.resp||'\u2014')+'</div></div></div>'
+'<div class="contact"><div class="contact-av">&#x1F4CB;</div><div><div class="contact-role">Administrator</div><div class="contact-name">'+_e(c.rtec||'\u2014')+'</div></div></div>'
+'<div class="contact"><div class="contact-av">&#x1F3E2;</div><div><div class="contact-role">Contractor</div><div class="contact-name">'+_e(c.cont||'\u2014')+'</div>'+(c.vend?'<div style="font-size:10.5px;color:#6b7280" class="mono">'+_e(c.vend)+'</div>':'')+'</div></div>'
+'</div>'
+'<div class="card"><div class="card-title" style="display:flex;align-items:center;flex-wrap:wrap">Invitados <span class="ofcnt">'+invitadosArr.length+'</span><span style="margin-left:auto;font-size:10px;font-weight:700;color:#166534;background:#dcfce7;padding:2px 8px;border-radius:99px;text-transform:none;letter-spacing:0">'+recibidosArr.length+' ofertaron</span></div><div class="card-body" style="padding-top:8px;padding-bottom:8px">'+invitadosHtml+'</div></div>'
+'</div>'
+'</div>'
+'<div class="grid2b">'
+'<div class="card"><div class="card-title">Recomendaci\u00f3n de Adjudicaci\u00f3n</div><div class="card-body" style="padding-top:12px">'
+'<div style="font-size:14px;font-weight:800;color:#111827;margin-bottom:2px">'+_e(c.cont||'\u2014')+'</div>'
+(c.vend?'<div style="font-size:11px;color:#6b7280" class="mono">'+_e(c.vend)+'</div>':'')
+'</div></div>'
+'<div class="card"><div class="card-title">Firmas</div><div class="sgl">'
+'<div class="sr"><div class="srl">Buyer</div><div class="srs"></div></div>'
+'<div class="sr"><div class="srl">Contracts Leader</div><div class="srs"></div></div>'
+'<div class="sr"><div class="srl">Head of Domain</div><div class="srs"></div></div>'
+'<div class="sr"><div class="srl">C&amp;P Manager</div><div class="srs"></div></div>'
+'</div></div>'
+'</div>'
+'</div>'
+'</div>'
+'<div class="page">'
+'<div class="sumbar">'
+'<div class="sc"><div class="slbl">Contrato N\u00b0</div><div class="sval">'+_e(c.num||'\u2014')+'</div><div class="ssub">'+_e(c.cont||'\u2014')+'</div></div>'
+'<div class="sc"><div class="slbl">Valor Header</div><div class="sval">'+_m(montoBase)+'</div><div class="ssub">'+_e(c.mon||'ARS')+' \u00b7 TC '+tcc+'</div></div>'
+'<div class="sc"><div class="slbl">Valor Total Vigente (c/AVEs)</div><div class="sval g">'+_m(totalConAVE)+'</div><div class="ssub">'+_e(c.mon||'ARS')+'</div></div>'
+'<div class="sc"><div class="slbl">Vigencia</div><div class="sval o" style="font-size:13px">'+_d(c.fechaIni)+' \u2192 '+_d(c.fechaFin)+'</div><div class="ssub">'+(c.plazo_meses||c.plazo?(c.plazo_meses||c.plazo)+' meses':'\u2014')+'</div></div>'
+'</div>'
+'<div class="sh"><span class="ico">&#x1F4CA;</span>Historial del Contrato<span class="ct">'+(aves.length+1)+' eventos</span></div>'
+'<div class="tbl-wrap">'
+'<div class="fin-row" style="border:1px solid var(--line);border-radius:10px;margin-bottom:14px;overflow:hidden">'
+'<div class="fin-tile poly"><div class="fin-label">Total AVE Polin\u00f3mica<span class="fin-tag">Ajuste de tarifa</span></div><div class="fin-value">'+_m(avePoly)+' '+_e(c.mon||'ARS')+'</div><div class="fin-usd">'+avePolyList.length+' AVE(s)</div></div>'
+'<div class="fin-tile owner"><div class="fin-label">Total AVE Owner<span class="fin-tag">Otros conceptos</span></div><div class="fin-value">'+_m(aveOwner)+' '+_e(c.mon||'ARS')+'</div><div class="fin-usd">'+aveOwnerList.length+' AVE(s)</div></div>'
+'<div class="fin-tile total"><div class="fin-label">Total AVEs</div><div class="fin-value">'+_m(avePoly+aveOwner)+' '+_e(c.mon||'ARS')+'</div><div class="fin-usd">'+aves.length+' AVE(s)</div></div>'
+'</div>'
+'<table><thead><tr><th>Tipo</th><th>Fecha</th><th>Per\u00edodo</th><th>Enm. Asociada</th><th>Monto AVE</th><th>Target Value</th><th>Observaciones</th></tr></thead><tbody>'+aveRows+'</tbody></table>'
+'<div style="font-size:10.5px;color:#9ca3af;margin-top:10px;line-height:1.6">'
+'<strong>AVE Polin\u00f3mica</strong>: ajuste generado por f\u00f3rmula polin\u00f3mica de tarifas (incluye los ajustes que corresponden a un AVE Owner Ajustable). '
+'<strong>AVE Owner Spot</strong>: ajuste puntual \u00fanico (no participa de futuras actualizaciones). '
+'<strong>AVE Owner Ajustable</strong>: participa de las actualizaciones de tarifas siguientes con el mismo % polin\u00f3mico de la base del contrato.'
+'</div>'
+'</div>'
+'<div class="sh"><span class="ico">&#x1F4CB;</span>Enmiendas<span class="ct">'+enms.length+' registradas</span></div>'
+'<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Tipo / Concepto</th><th>Detalle</th><th>Fecha</th><th>Descripci\u00f3n</th></tr></thead><tbody>'+enmRows+'</tbody></table></div>'
+'</div>'
+'</body></html>';
}
function openDossier(){ const c=window.DB.find(x=>x.id===window.detId); if(!c){toast('No se encontró el contrato','er');return;} const w=window.open('','_blank'); if(!w){toast('Bloqueador de pop-ups activo','er');return;} w.document.open(); w.document.write(renderDossierHtml(c)); w.document.close(); }

async function exportDossierXls(){
  const c=window.DB.find(x=>x.id===window.detId);
  if(!c){toast('No se encontró el contrato','er');return;}
  if(typeof XLSX==='undefined'){toast('Librería XLSX no disponible','er');return;}

  const enms=c.enmiendas||[], aves=c.aves||[], tars=c.tarifarios||[];
  const licit=(typeof LICIT_DB!=='undefined'?LICIT_DB:[]).find(l=>l.contrato===c.num)||null;
  const _d=s=>{if(!s)return '';const p=s.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:s;};
  const avePoly=aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
  const aveOwner=aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  // c.monto ya incluye las AVEs acumuladas (ver guardarEnm) — no volver a sumarlas acá.
  const montoBase=c.montoBase||((c.monto||0)-avePoly-aveOwner);
  const totalConAVE=montoBase+avePoly+aveOwner;
  const tcc=c.tc||1;
  const nPartic=licit?(licit.oferentes||[]).length:0;
  const nOfrs=licit?(licit.oferentes||[]).filter(o=>o.cotizo!==false).length:0;
  const docAriba=c.ariba||(licit&&licit.docAriba)||'';
  const tipoLabel=(c.tcontr||c.tipo||'').toUpperCase().indexOf('ENMIEND')>=0?'Amendment':'New Contract';
  const ofrs=licit&&licit.oferentes&&licit.oferentes.length?licit.oferentes:[];

  // Fetch template to preserve formatting
  let wb;
  try {
    const base=location.pathname.replace(/\/[^/]*$/,'/')||'/';
    const resp=await fetch(base+'Dossier%20TRANSPORTES%20CREXELL.xlsx');
    if(!resp.ok) throw new Error('template '+resp.status);
    const buf=await resp.arrayBuffer();
    wb=XLSX.read(new Uint8Array(buf),{type:'array',cellStyles:true});
  } catch(e) {
    toast('No se pudo cargar plantilla: '+e.message,'er');
    return;
  }

  // Helper: set cell value keeping style intact
  const ws=wb.Sheets[wb.SheetNames[0]];
  function setCell(addr, val, type){
    const t=type||(typeof val==='number'?'n':'s');
    if(ws[addr]){ ws[addr].v=val; ws[addr].w=String(val); ws[addr].t=t; delete ws[addr].r; delete ws[addr].h; }
    else { ws[addr]={t,v:val,w:String(val)}; }
  }

  // ── Sheet1: DUET — fill template cells ───────────────────────────────────
  setCell('B3', tipoLabel);
  setCell('C4', c.det||'');
  setCell('I3', c.cont||'');
  setCell('P4', c.resp||'');
  setCell('P6', c.rtec||'');
  setCell('E6', c.tcontr||'');
  setCell('C7', c.asset||c.own||'APE + SR');
  setCell('E7', c.num||'');
  setCell('C8', _d(c.fechaIni));
  setCell('E8', _d(c.fechaFin));
  setCell('C12', docAriba);
  setCell('C13', nPartic, 'n');
  // D13: participant names
  const ofNames=ofrs.map(o=>o.nombre||o.name||String(o)).join(' / ');
  setCell('D13', ofNames||'');
  setCell('C14', nOfrs, 'n');
  // Monto header
  setCell('I11', montoBase, 'n');
  setCell('K11', Math.round(montoBase/tcc), 'n');
  // AVE
  setCell('I13', avePoly+aveOwner, 'n');
  setCell('K13', Math.round((avePoly+aveOwner)/tcc), 'n');
  // New header value
  setCell('I14', totalConAVE, 'n');
  setCell('K14', Math.round(totalConAVE/tcc), 'n');
  setCell('I15', totalConAVE, 'n');
  setCell('K15', Math.round(totalConAVE/tcc), 'n');
  // Exchange rate
  setCell('L16', tcc, 'n');
  // AVE rows (N9:T14, up to 6 AVEs)
  const aveRows=['9','10','11','12','13','14'];
  aves.slice(0,6).forEach((a,i)=>{
    const row=aveRows[i];
    const isPoly=a.tipo==='POLINOMICA';
    setCell('O'+row, isPoly?(a.monto||0):0, 'n');
    setCell('S'+row, isPoly?0:(a.monto||0), 'n');
  });
  // AVE totals row 15
  setCell('O15', avePoly, 'n');
  setCell('S15', aveOwner, 'n');
  setCell('O16', Math.round(avePoly/tcc), 'n');
  setCell('S16', Math.round(aveOwner/tcc), 'n');
  // Contracting strategy
  setCell('C19', c.cprov||'RFQ');
  // Comments
  if(c.com) setCell('C26', c.com);
  // Oferentes (rows 29+)
  ofrs.forEach((o,i)=>{
    setCell('M'+(29+i), i+1, 'n');
    setCell('N'+(29+i), o.nombre||o.name||String(o));
  });

  // ── Enmiendas sheet (Hoja1) — replace content ────────────────────────────
  const wsEnm=XLSX.utils.aoa_to_sheet([
    ['#','N° Enmienda','Fecha','Tipo','Descripción','Monto',c.mon||'ARS'],
    ...enms.map((e,i)=>[i+1,e.num||'',_d(e.fecha),e.tipo||'',e.descripcion||'',e.monto||0,c.mon||'ARS'])
  ]);
  wsEnm['!cols']=[{wch:4},{wch:20},{wch:12},{wch:22},{wch:45},{wch:16},{wch:8}];
  // Replace Hoja1 content
  const hoja1idx=wb.SheetNames.indexOf('Hoja1');
  if(hoja1idx>=0){ wb.Sheets['Hoja1']=wsEnm; }
  else { XLSX.utils.book_append_sheet(wb,wsEnm,'Enmiendas'); }

  // ── Sheet2: AVEs ─────────────────────────────────────────────────────────
  const totAve=aves.reduce((s,a)=>s+(a.monto||0),0);
  const wsAve=XLSX.utils.aoa_to_sheet([
    ['Tipo','Fecha','Período','Monto',c.mon||'ARS','Concepto','Auto'],
    ...aves.slice().sort((a,b)=>new Date(a.fecha)-new Date(b.fecha))
      .map(a=>[a.tipo||'',_d(a.fecha),a.periodo||'',a.monto||0,c.mon||'ARS',a.concepto||'',a.autoGenerated?'SI':'NO']),
    ['TOTAL','','',totAve,c.mon||'ARS','','']
  ]);
  wsAve['!cols']=[{wch:14},{wch:12},{wch:12},{wch:16},{wch:8},{wch:35},{wch:6}];
  const sheet2idx=wb.SheetNames.indexOf('Sheet2');
  if(sheet2idx>=0){ wb.Sheets['Sheet2']=wsAve; wb.SheetNames[sheet2idx]='AVEs'; }
  else { XLSX.utils.book_append_sheet(wb,wsAve,'AVEs'); }

  const fname='DUET_'+(c.num||'contrato').replace(/[/\\?%*:|"<>]/g,'_')+'.xlsx';
  XLSX.writeFile(wb,fname);
  toast('📊 XLS exportado: '+fname,'ok');
}

function renderDet(){
  try {
    const c=window.DB.find(x=>x.id===window.detId);if(!c){go('list');return;}
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const fin=new Date((c.fechaFin||'1970-01-01')+'T00:00:00'),isA=fin>=hoy;
    const aves=c.aves||[],enms=c.enmiendas||[];
    const avePoly=aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
    const aveOwner=aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
    
    // Usar montoBase guardado, o calcularlo si no existe (contratos viejos)
    const montoBase = c.montoBase || ((c.monto||0) - avePoly - aveOwner);
    const tot = montoBase + avePoly + aveOwner;
    
    const consumed=getConsumed(c.num),hasC=consumed!==null,rem=hasC?tot-consumed:null;

    // ── Burn rate / proyección financiera ──────────────────────────────────────
    const burn=(function(){
      try{
        if(!hasC || !c.fechaIni || !c.fechaFin) return null;
        const today=new Date(); today.setHours(0,0,0,0);
        const ini=new Date(c.fechaIni+'T00:00:00');
        const finC=new Date(c.fechaFin+'T00:00:00');
        const totalMonths=monthDiffInclusive(c.fechaIni,c.fechaFin)||0;
        const todayYmd=today.toISOString().substring(0,10);
        let elapsedMonths=monthDiffInclusive(c.fechaIni, todayYmd);
        if(today<ini) elapsedMonths=0;
        if(today>finC) elapsedMonths=totalMonths;
        elapsedMonths=Math.max(0,Math.min(elapsedMonths,totalMonths));
        if(elapsedMonths<1) return null;
        const remMonthsContract=Math.max(totalMonths-elapsedMonths,0);
        const remAmount=Math.max(tot-consumed,0);
        const histRunRate=consumed/elapsedMonths;
        if(!isFinite(histRunRate)||histRunRate<=0) return null;

        // Factor de precio mes a mes (acumulado desde inicio): refleja redeterminaciones aplicadas
        const enmsApplied=(c.enmiendas||[]).filter(e=>enmHasTipo(e,'ACTUALIZACION_TARIFAS')&&!e.superseded&&e.pctPoli)
          .map(e=>({ym:e.nuevoPeriodo||'', pct:Number(e.pctPoli)||0}))
          .filter(e=>e.ym).sort((a,b)=>a.ym.localeCompare(b.ym));
        const startYm=(c.fechaIni||'').substring(0,7);
        const todayYm=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
        let factor=1, sumFactor=0, monthsCounted=0, ei=0, cur=startYm;
        while(cur && cur<=todayYm){
          while(ei<enmsApplied.length && enmsApplied[ei].ym<=cur){ factor*=(1+enmsApplied[ei].pct); ei++; }
          sumFactor+=factor; monthsCounted++;
          cur=nextYm(cur); if(!cur) break;
        }
        const avgFactor=monthsCounted>0?sumFactor/monthsCounted:1;
        const todayFactor=factor;
        const scaleToToday=avgFactor>0?(todayFactor/avgFactor):1;
        const runRate=histRunRate*scaleToToday;
        const monthsToExhaust=remAmount/runRate;
        const exhaustDate=new Date(today); exhaustDate.setDate(15);
        exhaustDate.setMonth(exhaustDate.getMonth()+Math.round(monthsToExhaust));
        const margin=monthsToExhaust-remMonthsContract;

        // % polinómico pendiente desde último base hasta hoy
        let pendingPolyPct=null;
        try{
          if(Array.isArray(c.poly) && c.poly.length && typeof computeAccumulatedVariationPct==='function'){
            // Base = período de la última lista de precios cargada (fuente de verdad).
            // Si no hay tarifarios, caemos a c.btar y luego a fechaIni.
            const tarPeriods = (c.tarifarios||[]).map(t=>t&&t.period).filter(p=>typeof p==='string'&&/^\d{4}-\d{2}$/.test(p)).sort();
            const baseYm = (tarPeriods.length?tarPeriods[tarPeriods.length-1]:null) || c.btar || (c.fechaIni||'').substring(0,7);
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
        }catch(e){ console.warn('pendingPoly',e); }

        // Run rate proyectado con redeterminación pendiente aplicada al consumo futuro
        const runRateProj = (pendingPolyPct!=null) ? runRate*(1+pendingPolyPct/100) : runRate;
        const monthsToExhaustProj = runRateProj>0 ? remAmount/runRateProj : monthsToExhaust;
        const exhaustDateProj = new Date(today); exhaustDateProj.setDate(15);
        exhaustDateProj.setMonth(exhaustDateProj.getMonth()+Math.round(monthsToExhaustProj));
        const marginProj = monthsToExhaustProj-remMonthsContract;

        // Semáforo basado en escenario más conservador (con redeterminación si la hay)
        const decisiveMargin = (pendingPolyPct!=null && pendingPolyPct>0.5) ? marginProj : margin;
        let status='green', emoji='🟢', label='Alcanza con margen';
        if(remAmount<=0){ status='red'; emoji='🔴'; label='Monto agotado'; }
        else if(decisiveMargin<0){ status='red'; emoji='🔴'; label='No alcanza al fin'; }
        else if(decisiveMargin<3){ status='yellow'; emoji='🟡'; label='Ajustado'; }

        return { runRate, histRunRate, scaleToToday, todayFactor, avgFactor, appliedCount:enmsApplied.length,
                 monthsToExhaust, exhaustDate, remMonthsContract, remAmount, elapsedMonths, totalMonths, margin, status, emoji, label, consumed, tot,
                 pendingPolyPct, runRateProj, monthsToExhaustProj, exhaustDateProj, marginProj };
      }catch(e){ console.warn('burn calc',e); return null; }
    })();
    if(burn){ window._burnCache=window._burnCache||{}; window._burnCache[c.id]=burn; }

    let enmOpts='<option value="">— Sin enmienda —</option>';
    enms.forEach(e=>enmOpts+=`<option value="${e.num}">Enm.N°${e.num} (${e.tipo||'?'})</option>`);
    
    let aveRows='',cumTV=montoBase;
    const sAves=[...aves].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
    // TC para conversión a USD (default 1000 si no hay)
    const TC_USD=(typeof getTCFromStore==='function'?getTCFromStore():null)||1000;
    const isUsdContract=(String(c.mon||'').toUpperCase().indexOf('USD')>=0);
    const toUsd=function(v){ if(!isFinite(v)) return 0; return isUsdContract?v:(TC_USD>0?(v/TC_USD):0); };
    const fmtUsd=function(v){ return 'USD '+ (Math.round(v*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); };
    // Compliance: status explícito si existe; si no, se infiere de la fecha legacy (Done si
    // ya tenía fecha cargada) — mismo criterio que usa el Dossier.
    const cplStatus=function(status,legacyDate){
      const s=status||((legacyDate&&legacyDate!==true&&legacyDate!==false)?'DONE':'PENDING');
      const map={DONE:['Done','#86efac'],IN_PROCESS:['In Process','#fde68a'],PENDING:['Pending','#fca5a5']};
      return map[s]||map.PENDING;
    };
    if(!sAves.length)aveRows='<tr><td colspan="9" style="text-align:center;color:var(--g500);font-style:italic;padding:12px">Sin AVEs registrados</td></tr>';
    sAves.forEach(a=>{
      const prev=cumTV,newTV=cumTV+(a.monto||0);cumTV=newTV;
      const isPoly=a.tipo==='POLINOMICA';
      const subtipoLabel=isPoly?'🔄 Polinómica':(a.subtipo==='EXTENSION PLAZO'?'📅 Ext.Plazo':a.subtipo==='ACTUALIZACION TARIFAS'?'💰 Act.Tar':a.subtipo==='SCOPE MAYOR'?'🔧 +Scope':a.subtipo==='SCOPE MENOR'?'📉 -Scope':a.subtipo==='CLAUSULAS'?'📋 Cláusulas':a.subtipo||'💬 Owner');
      const aveUsd=toUsd(a.monto||0);
      const valBadge = (isPoly && a.aicValidated) ? '<span class="bdg" style="background:#16a34a;color:#fff;font-size:8.5px;margin-left:3px" title="AIC validado '+fD((a.aicValidationDate||'').substring(0,10))+'">✓ AIC</span>' : (!isPoly && a.ccValidated) ? '<span class="bdg" style="background:#16a34a;color:#fff;font-size:8.5px;margin-left:3px" title="CC validado '+fD((a.ccValidationDate||'').substring(0,10))+'">✓ CC</span>' : '';
      const rowOpacity = ((isPoly && a.aicValidated) || (!isPoly && a.ccValidated)) ? 'opacity:.62' : '';
      const ajustableBadge = a.ajustable ? '<span class="bdg" style="background:#6366f1;color:#fff;font-size:8.5px;margin-left:3px" title="Ajustable — participa de futuras actualizaciones de tarifas">🔗 AJUST.</span>' : (a.ownerAveRef ? '<span class="bdg" style="background:#a5b4fc;color:#1e1b4b;font-size:8.5px;margin-left:3px" title="Ajuste generado sobre un AVE Owner ajustable">🔗 s/Owner</span>' : '');
      aveRows+=`<tr style="${rowOpacity}">
        <td><span class="bdg ${isPoly?'poly':'owner'}">${isPoly?'POLI':'OWNER'}</span>${a.autoGenerated?'<span class="bdg auto-b" style="margin-left:3px">AUTO</span>':''}${valBadge}${ajustableBadge}</td>
        <td class="mono" style="font-size:11px">${a.enmRef?'Enm.'+a.enmRef:'—'}</td>
        <td>${a.periodo||'—'}</td>
        <td class="mono">${fN(prev)}</td>
        <td class="mono" style="font-weight:700;color:${isPoly?'#92400e':'var(--b500)'}">${(a.monto||0)>=0?'+':''}${fN(a.monto||0)}</td>
        <td class="mono" style="font-size:11px;color:var(--g600c)" title="Equivalente USD a TC ${fN(TC_USD)}">${fmtUsd(aveUsd)}</td>
        <td class="mono" style="font-weight:700">${fN(newTV)}</td>
        <td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.concepto||subtipoLabel)}</td>
        <td><button class="btn btn-d btn-sm" onclick="delAveById('${a.id}')">🗑️</button></td>
      </tr>`;
    });
    let enmRows='';
    if(!enms.length)enmRows='<tr><td colspan="6" style="text-align:center;color:var(--g500);font-style:italic;padding:12px">Sin enmiendas registradas</td></tr>';
    enms.forEach((e, idx)=>{
      // Una enmienda puede combinar varios conceptos (e.tipos) — se muestra un
      // "chip" por cada uno (enmTipos hace fallback a [e.tipo] para enmiendas
      // guardadas antes de este cambio, que solo tenían el string singular).
      const _enmMeta={ACTUALIZACION_TARIFAS:{cls:'tar',lbl:'📐 Act.Tarifas'},EXTENSION:{cls:'ext',lbl:'📅 Extensión'},SCOPE:{cls:'sc',lbl:'🔧 Scope'},CLAUSULAS:{cls:'cl',lbl:'📋 Cláusulas'},OTRO:{cls:'ot',lbl:'💬 Otro'}};
      const tChips=enmTipos(e).map(t=>{const m=_enmMeta[t]||_enmMeta.OTRO;return `<span class="ep ${m.cls}">${m.lbl}</span>`;}).join(' ');
      const extraParts=[];
      if(enmHasTipo(e,'EXTENSION')&&e.fechaFinNueva) extraParts.push('→ '+fD(e.fechaFinNueva));
      if(enmHasTipo(e,'ACTUALIZACION_TARIFAS')){
        if(Array.isArray(e.tramos)&&e.tramos.length>1) extraParts.push(e.tramos.map(t=>'+'+((t.pctPoli||0)*100).toFixed(2)+'% '+formatMonth(t.basePeriodo||'')+'→'+formatMonth(t.nuevoPeriodo||'')).join(' · '));
        else if(e.pctPoli) extraParts.push('+'+((e.pctPoli||0)*100).toFixed(2)+'% · '+formatMonth(e.basePeriodo||'')+'→'+formatMonth(e.nuevoPeriodo||''));
      }
      const extra=extraParts.join(' · ');
      const corrBdg=e.correccionDeEnm?`<span class="bdg corr">CORR.ENM.${e.correccionDeEnm}</span> `:'';
      const supBdg=e.superseded?`<span class="bdg exp" style="font-size:8.5px">SUPERSEDED</span> `:'';
      enmRows+=`<tr ${e.superseded?'style="opacity:.5"':''}><td style="font-weight:700;font-size:12px">N°${e.num}</td><td>${corrBdg}${supBdg}${tChips}</td><td style="font-size:11px">${extra}</td><td style="font-size:11px;color:var(--g500)">${fD((e.fecha||'').substring(0,10))}</td><td style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.motivo||e.descripcion||'')}</td><td style="white-space:nowrap"><button class="btn btn-a btn-sm" style="padding:3px 8px;font-size:10px;margin-right:3px" onclick="openAmendmentDoc('${c.id}',${e.num})" title="Vista previa / Imprimir / PDF">📄</button><button class="btn btn-p btn-sm" style="padding:3px 8px;font-size:10px;margin-right:3px" onclick="downloadAmendmentDoc('${c.id}',${e.num})" title="Descargar Word .doc editable">📝</button><button class="btn btn-d btn-sm" style="padding:3px 8px;font-size:10px" onclick="delEnm(${e.num})">🗑</button></td></tr>`;
    });
    document.getElementById('detCard').innerHTML=`<div class="card">
      <div class="det-h">
        <div><h2>${esc(c.num)} — ${esc(c.cont)}</h2><div class="ds">${esc(c.det||'')} · ${esc(c.tipo||'')} · ${esc(c.tcontr||'')}</div></div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="bdg ${isA?'act':'exp'}" style="font-size:12px;padding:5px 14px">● ${isA?'ACTIVO':'VENCIDO'}</span>
          <button class="btn btn-sm btn-a" onclick="window.copyContractAsTemplate()" title="Duplicar como template">📋 Duplicar</button>
          <button class="btn btn-s btn-sm" onclick="editCont('${c.id}')">✏️ Editar</button>
          <button class="btn btn-d btn-sm" onclick="delCont('${c.id}')" title="Eliminar contrato">🗑️ Eliminar</button>
        </div>
      </div>
      <div class="dossier">
        <div class="dossier-grid top">
          <div>
            <div class="dr"><span>Monto inicial</span><span class="dv">${c.mon||''} ${fN(montoBase)}</span></div>
            ${c.tipo==='OBRA' && c.anticipo?`<div class="dr" style="background:rgba(255,210,0,.12);border:1px solid rgba(255,210,0,.22);padding:8px 12px;border-radius:4px"><span style="font-weight:600">💼 Anticipo Financiero (${c.anticipoPct||0}%)</span><span class="dv" style="color:#fde68a">${c.mon||''} ${fN(c.anticipo||0)}</span></div>
            <div class="dr" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);padding:8px 12px;border-radius:4px"><span style="opacity:.8">🔧 Monto neto (sin anticipo)</span><span class="dv" style="opacity:.9">${c.mon||''} ${fN(montoBase-(c.anticipo||0))}</span></div>`:''}
            <div class="dr"><span>Polinómica</span><span class="dv">${c.mon||''} ${fN(avePoly)}</span></div>
            <div class="dr"><span>Owner</span><span class="dv">${c.mon||''} ${fN(aveOwner)}</span></div>
            <div class="dr sep"><span>Valor total vigente</span><span class="dv">${c.mon||''} ${fN(tot)}</span></div>
            ${c.tipo!=='OBRA'?`<div class="dr" style="background:rgba(255,255,255,.08);padding:10px 12px;border-radius:6px;margin-top:10px;border:1px solid rgba(255,255,255,.14)"><span style="font-weight:600">💰 Monto mensual estimado</span><span class="dv" style="font-size:14px">${c.mon||''} ${fN(tot/(monthDiffInclusive(c.fechaIni,c.fechaFin)||1))}</span></div>`:''}
          </div>
          <div>
            <div class="dr"><span>Inicio</span><span class="dv">${fD(c.fechaIni||'')}</span></div>
            <div class="dr"><span>Fin</span><span class="dv">${fD(c.fechaFin||'')}</span></div>
            <div class="dr"><span>Plazo</span><span class="dv">${monthDiffInclusive(c.fechaIni,c.fechaFin)?monthDiffInclusive(c.fechaIni,c.fechaFin)+' meses':'—'}</span></div>
            <div class="dr"><span>Responsable</span><span class="dv">${esc(c.resp||'—')}</span></div>
            <div class="dr"><span>Owner</span><span class="dv">${esc(c.own||'—')}</span></div>
            <div class="dr sep" style="margin-top:6px"><span style="font-weight:700;opacity:.7;font-size:10px;letter-spacing:.1em;text-transform:uppercase">Compliance</span><span></span></div>
            <div class="dr"><span>Due Diligence</span><span class="dv" style="color:${cplStatus(c.ddStatus,c.dd)[1]}">${cplStatus(c.ddStatus,c.dd)[0]}</span></div>
            <div class="dr"><span>Pre-Risk</span><span class="dv" style="color:${cplStatus(c.prStatus,c.pr)[1]}">${cplStatus(c.prStatus,c.pr)[0]}</span></div>
            <div class="dr"><span>Sequana</span><span class="dv" style="color:${cplStatus(c.sqStatus,c.sq)[1]}">${cplStatus(c.sqStatus,c.sq)[0]}</span></div>
            ${c.dg?`<div class="dr"><span>Derogación</span><span class="dv">Sí${c.dgDoc?' · '+esc(c.dgDoc):''}</span></div>`:''}
          </div>
          ${(()=>{
            if(c.tipo!=='OBRA'||!c.fechaIni||!c.fechaFin) return '';
            const ini=new Date(c.fechaIni+'T00:00:00'), fin=new Date(c.fechaFin+'T00:00:00'), hoy=new Date();
            hoy.setHours(0,0,0,0);
            const total=fin-ini, elapsed=Math.min(Math.max(hoy-ini,0),total);
            const timePct=total>0?Math.round(elapsed/total*100):0;
            const obraSplit=hasC?getObraConsumedSplit(c.num,c.poMeta):null;
            const finPct=obraSplit&&tot>0?Math.min(Math.round(obraSplit.avanceObra/tot*100),100):null;
            const vencido=hoy>fin, activo=hoy>=ini&&hoy<=fin;
            const estado=vencido?'VENCIDO':activo?'EN CURSO':'NO INICIADO';
            const estadoColor=vencido?'#fca5a5':activo?'#86efac':'#fde68a';
            const barColor=timePct>90?'#fca5a5':timePct>60?'#fde68a':'#86efac';
            const finBarColor=finPct!==null?(finPct>90?'#fca5a5':finPct>60?'#fde68a':'#86efac'):'#86efac';
            let hw='<div style="grid-column:1/-1;margin-top:14px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:14px 18px">';
            hw+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;opacity:.55;font-weight:700">Avance de Obra</span><span style="font-size:11px;font-weight:700;color:'+estadoColor+';letter-spacing:.06em">'+estado+'</span></div>';
            hw+='<div style="display:grid;grid-template-columns:1fr'+(finPct!==null?' 1fr':'')+';gap:16px">';
            hw+='<div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px"><span style="opacity:.7">Plazo transcurrido</span><span style="font-weight:700;color:'+barColor+'">'+timePct+'%</span></div>';
            hw+='<div style="height:6px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden"><div style="height:100%;width:'+timePct+'%;background:'+barColor+';border-radius:99px;transition:width .4s"></div></div>';
            hw+='<div style="display:flex;justify-content:space-between;font-size:10px;opacity:.5;margin-top:4px"><span>'+fD(c.fechaIni)+'</span><span>'+fD(c.fechaFin)+'</span></div></div>';
            if(finPct!==null){hw+='<div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px"><span style="opacity:.7">Avance financiero (obra)</span><span style="font-weight:700;color:'+finBarColor+'">'+finPct+'%</span></div><div style="height:6px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden"><div style="height:100%;width:'+finPct+'%;background:'+finBarColor+';border-radius:99px;transition:width .4s"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;opacity:.5;margin-top:4px"><span>Avance obra: '+(c.mon||'')+' '+fN(obraSplit.avanceObra)+(obraSplit.adicionales>0?' · Adicionales: '+(c.mon||'')+' '+fN(obraSplit.adicionales):'')+'</span><span>Total: '+(c.mon||'')+' '+fN(tot)+'</span></div></div>';}
            hw+='</div></div>';
            return hw;
          })()}
        </div>
        <div class="dossier-bottom">
          <div class="dossier-metrics">
            <div class="dr consumed"><span>Consumido</span><span class="dv">${hasC?(c.mon||'')+' '+fN(consumed):'—'}</span></div>
            <div class="dr ${hasC && rem>=0?'rem-ok':'rem-bad'}"><span>Remanente</span><span class="dv">${hasC?(c.mon||'')+' '+fN(rem):'—'}</span></div>
          </div>
        </div>
      </div>
      ${c.tipo==='OBRA'?(()=>{
        const poData=ME2N[c.num];
        const pos=poData&&Array.isArray(poData)&&Array.isArray(poData[2])?poData[2]:[];
        const poMeta=c.poMeta||{};
        const obraSplit=getObraConsumedSplit(c.num,poMeta)||{avanceObra:0,adicionales:0,total:0};
        const avancePct=montoBase>0?round2((obraSplit.avanceObra/montoBase)*100):0;
        const remanente=Math.max(0,montoBase-obraSplit.total);
        return `
        <div class="sec" style="margin-top:18px">
          <details ${pos.length<=25?'open':''}>
            <summary class="sh" style="cursor:pointer;user-select:none"><span class="ico">📋</span>Certificaciones / POs<span class="ct">${pos.length} registradas · Avance obra ${avancePct}%${obraSplit.adicionales>0?' · Adicionales '+(c.mon||'ARS')+' '+fN(obraSplit.adicionales):''} · Remanente ${c.mon||'ARS'} ${fN(remanente)}</span></summary>
            <div style="font-size:11px;color:var(--g600c);margin:6px 0 10px;padding:8px 10px;background:var(--a100);border:1px solid var(--a500);border-radius:6px">
              ⚠️ El <strong>Short Text de la PO</strong> debería empezar a incluir el <strong>período que se está certificando</strong> — la "Document Date" de la PO es cuando se ejecuta la PO, no cuando se certificó el trabajo. Mientras esa práctica no esté instalada, el <strong>Período de Certificación</strong> se autocompleta con la Document Date como aproximación — corregilo a mano si el certificado real es de otro mes.
            </div>
            <table>
              <thead>
                <tr>
                  <th>N° PO</th><th>Document Date</th><th>Plant</th><th>Net Order Value</th><th>Pend. Fact.</th><th>Período Certificación</th><th>¿Avance obra?</th><th>Ajustado</th>
                </tr>
              </thead>
              <tbody>
                ${pos.length===0?'<tr><td colspan="8" style="text-align:center;color:var(--g500);font-style:italic;padding:12px">Sin POs asociadas a este contrato</td></tr>':
                  pos.map((p)=>{
                    const poNum=p[0]||'—';
                    const plant=p[2]||'—';
                    const nov=p[3]||0;
                    const still=p[4]||0;
                    const docIso=resolvePoDocDate(p);
                    const docYm=p[1]||'';
                    const meta=poMeta[poNum]||{};
                    const certDateStored=meta.certPeriod||'';
                    const isAutoFallback=!certDateStored;
                    const certDateShown=certDateStored||docIso; // autocompletado con Document Date, editable
                    const countsAsProgress=meta.countsAsProgress!==false;
                    const ajustado=c.posAjustadas&&c.posAjustadas.includes(poNum);
                    const lastAdj=ajustado&&c.posAjustadasMeta?c.posAjustadasMeta[poNum]:null;
                    const ajLbl=ajustado?(lastAdj?'<span class="bdg" style="background:#16a34a;color:#fff;font-size:9px" title="Ajustada en '+esc(lastAdj.ym||'')+' · Enm.'+esc(String(lastAdj.enm||''))+(lastAdj.pct?(' · +'+Number(lastAdj.pct).toFixed(2)+'%'):'')+'">✓ '+(lastAdj.ym||'')+'</span> <button class="btn btn-d btn-sm" style="padding:1px 5px;font-size:10px;margin-left:4px" onclick="unadjustPo(\''+c.id+'\',\''+esc(poNum)+'\')" title="Quitar marca de ajustada (no revierte el AVE registrado)">↶</button>':'<span class="bdg" style="background:var(--g200);color:var(--g800);font-size:10px">✓</span> <button class="btn btn-d btn-sm" style="padding:1px 5px;font-size:10px;margin-left:4px" onclick="unadjustPo(\''+c.id+'\',\''+esc(poNum)+'\')" title="Quitar marca de ajustada (no revierte el AVE registrado)">↶</button>'):'—';
                    return `<tr>
                      <td class="mono" style="font-weight:600">${esc(poNum)}</td>
                      <td class="mono">${docIso?fD(docIso):(docYm?esc(docYm):'—')}</td>
                      <td>${esc(plant)}</td>
                      <td class="mono">${c.mon||'ARS'} ${fN(nov)}</td>
                      <td class="mono" style="color:${still>0?'var(--o700)':'var(--g500)'}">${fN(still)}</td>
                      <td>
                        <input type="date" value="${esc(certDateShown)}" style="font-size:11px;padding:3px 5px;width:135px" onchange="setPoCertPeriod('${c.id}','${esc(poNum)}',this.value)">
                        ${isAutoFallback&&certDateShown?'<div style="font-size:9.5px;color:#b45309;margin-top:2px" title="Autocompletado con la Document Date de la PO — corregilo si el certificado real es de otro período">⚠️ auto (Doc.Date)</div>':''}
                      </td>
                      <td style="text-align:center"><input type="checkbox" ${countsAsProgress?'checked':''} title="Tildado = esta PO cuenta como avance de obra. Destildá para compras de materiales/servicios extra que no representan avance." onchange="setPoCountsAsProgress('${c.id}','${esc(poNum)}',this.checked)"></td>
                      <td>${ajLbl}</td>
                    </tr>`;
                  }).join('')
                }
              </tbody>
            </table>
          </details>
        </div>`;
      })():''}
      <div class="section-box">
        <h3>📑 Enmiendas <span class="tcnt">${enms.length} registradas</span></h3>
        <table class="enm-tbl"><thead><tr><th>#</th><th>Tipo / Concepto</th><th>Detalle</th><th>Fecha</th><th>Descripción</th><th></th></tr></thead><tbody>${enmRows}</tbody></table>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-p btn-sm" onclick="openEnmPanel()">📑 + Nueva Enmienda</button>
          <button class="btn btn-d btn-sm" onclick="resetSection('enmiendas')">🗑 Reset</button>
          <input type="file" id="enmPdfIn" accept=".pdf,.docx,.doc" multiple style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" onchange="importEnmPdfs(this.files)">
        </div>
        <div class="enm-panel" id="enmPanel">
          <div class="cond-tag">📑 Nueva Enmienda — N°${enms.length+1}</div>
          <div class="fg2" style="gap:14px 18px">
            <div class="fgrp" style="grid-column:1/-1">
              <label>Concepto(s) <span class="req">*</span> <span style="font-weight:400;font-size:10.5px;color:var(--g500)">— podés tildar más de uno para combinarlos en la misma enmienda</span></label>
              <div style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:6px">
                <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;cursor:pointer"><input type="checkbox" class="ne_tipo_cb" value="EXTENSION" onchange="onEnmTipoChange()"> 📅 Extensión de fecha (inicio/fin)</label>
                <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;cursor:pointer"><input type="checkbox" class="ne_tipo_cb" value="ACTUALIZACION_TARIFAS" onchange="onEnmTipoChange()"> 💰 Actualización de tarifas</label>
                <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;cursor:pointer"><input type="checkbox" class="ne_tipo_cb" value="CLAUSULAS" onchange="onEnmTipoChange()"> 📋 Actualización de cláusulas</label>
                <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;cursor:pointer"><input type="checkbox" class="ne_tipo_cb" value="SCOPE" onchange="onEnmTipoChange()"> 🔧 Actualización de alcance (scope)</label>
                <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;cursor:pointer"><input type="checkbox" class="ne_tipo_cb" value="OTRO" onchange="onEnmTipoChange()"> 💬 Otro</label>
              </div>
            </div>
            <div class="fgrp">
              <label>N° Enmienda</label>
              <input type="number" id="ne_num" value="${enms.length+1}" min="1" disabled style="background:var(--g100)">
            </div>
          </div>

          <div id="enm_ext" style="display:none" class="enm-sub">
            <h4>📅 Extensión de Fecha</h4>
            <div class="info-box blue" style="margin-bottom:10px;font-size:11px">
              Fecha fin actual: <strong>${fD(c.fechaFin||'')}</strong>${c._fechaFinOriginal&&c._fechaFinOriginal!==c.fechaFin?' · Original: <strong>'+fD(c._fechaFinOriginal)+'</strong>':''}. La nueva fecha se vinculará automáticamente al contrato.
            </div>
            <div class="fg2">
              <div class="fgrp">
                <label>Tipo de extensión</label>
                <select id="ne_ext_tipo">
                  <option value="FIN">Extensión de fecha fin</option>
                  <option value="INICIO">Modificación de fecha inicio</option>
                  <option value="AMBAS">Ambas fechas</option>
                </select>
              </div>
              <div class="fgrp">
                <label>Nueva Fecha Fin <span class="req">*</span></label>
                <div style="display:flex;gap:6px;align-items:stretch">
                  <input type="text" id="ne_ffin" placeholder="DD/MM/AAAA" maxlength="10" autocomplete="off"
                         oninput="this.value=this.value.replace(/[^\d/]/g,'').replace(/^(\d{2})(\d)/,'$1/$2').replace(/^(\d{2}\/\d{2})(\d)/,'$1/$2').slice(0,10);document.getElementById('ne_ffin_picker').value=parseEnmDate(this.value)||''"
                         style="flex:1">
                  <input type="date" id="ne_ffin_picker" min="${c.fechaFin||''}" title="Calendario"
                         onchange="document.getElementById('ne_ffin').value=this.value?this.value.split('-').reverse().join('/'):''"
                         style="width:42px;padding:0;cursor:pointer">
                </div>
              </div>
            </div>
          </div>

          <div id="enm_poly" style="display:none" class="enm-sub">
            <h4>💰 Actualización de Tarifas</h4>
            <div class="fg2" style="margin-bottom:12px">
              <div class="fgrp">
                <label>¿Corrige enmienda anterior?</label>
                <div class="tw"><label class="tg"><input type="checkbox" id="ne_isCorr" onchange="onCorrToggle()"><span class="sl"></span></label><span class="tl" id="ne_isCorr_l">No</span></div>
              </div>
            </div>
            <div id="ne_corrGrp" style="display:none;margin-bottom:12px">
              <div class="fgrp">
                <label>Corrige Enmienda N°</label>
                <select id="ne_corrEnm" onchange="prefillCorrEnm()">
                  <option value="">—</option>
                  ${enms.filter(e=>enmHasTipo(e,'ACTUALIZACION_TARIFAS')).map(e=>'<option value="'+e.num+'">N°'+e.num+' — '+(e.nuevoPeriodo||'')+'</option>').join('')}
                </select>
              </div>
            </div>
            <div id="ne_tramosWrap"></div>
            <div style="margin:4px 0 14px">
              <button class="btn btn-s btn-sm" onclick="addTramoPeriodo()">➕ Agregar otro período en esta misma enmienda</button>
            </div>
            <div class="ave-sug" id="ne_aveSug" style="display:none">
              <h4>🟢 AVE Polinómica — se generará automáticamente al guardar</h4>
              <div id="ne_aveBreakdown"></div>
              <div style="font-size:12px;font-weight:700;color:var(--g700);margin-top:8px">AVE total: <span class="sv" id="ne_aveMonto">—</span></div>
              <div id="ne_obraGrp" style="display:none;margin:8px 0">
                <label style="font-size:11px;font-weight:600">% avance pendiente (OBRA) — 🔒 auto según POs certificadas, editable:</label>
                <input type="number" id="ne_obraAdv" step="0.01" min="0" max="100" placeholder="%" onchange="onObraAdvChange()" style="width:120px;margin-top:4px">
                <div style="font-size:10.5px;color:var(--g600c);margin-top:6px;font-weight:700;text-transform:uppercase;letter-spacing:.3px">📋 POs consideradas (avance vs. remanente)</div>
                <div id="ne_obraPoBreakdown" style="margin-top:4px"></div>
              </div>
              <div style="margin-top:8px">
                <label style="font-size:11px;font-weight:600;color:var(--g700)">Monto AVE manual (opcional, reemplaza el total calculado):</label>
                <input type="number" id="ne_aveManual" step="0.01" placeholder="Deja vacío para usar el calculado" oninput="onAveManualChange()" style="margin-top:4px;width:220px">
                <div id="ne_aveManualNote" style="font-size:11px;color:var(--g600c);margin-top:3px;display:none"></div>
              </div>
            </div>
          </div>

          <div id="enm_mot_grp" style="display:none" class="enm-sub">
            <h4 id="enm_mot_lbl">Descripción *</h4>
            <div id="enm_otro_sub" style="display:none;margin-bottom:10px">
              <div class="fgrp">
                <label>Título de la sección <span class="req">*</span> <span style="font-weight:400;font-size:10.5px;color:var(--g500)">— reemplaza a "PRECIO" en el punto 2. de la enmienda generada</span></label>
                <input type="text" id="ne_otro_titulo" placeholder="Ej: SEGUROS, GARANTÍAS, RESPONSABLE DEL CONTRATO...">
              </div>
            </div>
            <div id="enm_scope_sub" style="display:none;margin-bottom:10px">
              <div class="fg2">
                <div class="fgrp">
                  <label>Tipo de cambio de alcance</label>
                  <select id="ne_scope_tipo" onchange="onScopeTipoChange()">
                    <option value="MAYOR">Mayor scope (incremento de alcance)</option>
                    <option value="MENOR">Menor scope (reducción de alcance)</option>
                  </select>
                </div>
                <div class="fgrp">
                  <label>Período de aplicación <span class="req">*</span></label>
                  <input type="month" id="ne_scope_periodo" onchange="renderScopeTablaOptions()">
                </div>
              </div>
              <div class="fgrp" style="margin-top:10px">
                <label>Tabla a modificar <span style="font-weight:400;font-size:10.5px;color:var(--g500)">— el tarifario del contrato puede tener varias tablas</span></label>
                <select id="ne_scope_tabla" onchange="onScopeTablaChange()"></select>
              </div>
              <div id="ne_scope_quitar_block" style="margin-top:14px">
                <label style="font-size:11px;font-weight:600;color:#b91c1c;text-transform:uppercase;letter-spacing:.3px">🔻 Quitar items existentes <span style="font-weight:400;font-size:10.5px;color:var(--g500);text-transform:none;letter-spacing:0">— dejan de facturarse a partir del período indicado</span></label>
                <div id="ne_scope_quitar_wrap" style="margin-top:8px;display:flex;flex-direction:column;gap:5px;max-height:340px;overflow-y:auto;padding-right:4px"></div>
              </div>
              <div id="ne_scope_nuevos_block" style="margin-top:14px">
                <label style="font-size:11px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:.3px">🔺 Agregar items nuevos <span style="font-weight:400;font-size:10.5px;color:var(--g500);text-transform:none;letter-spacing:0">— con su precio, van al tarifario del período indicado</span></label>
                <div id="ne_scope_nuevos_wrap" style="margin-top:8px;display:flex;flex-direction:column;gap:8px"></div>
                <button type="button" class="btn btn-s btn-sm" style="margin-top:8px" onclick="addScopeNuevoItem()">➕ Agregar item nuevo</button>
              </div>
            </div>
            <div class="rte-box">
              <div class="rte-toolbar">
                <button type="button" class="rte-btn" onmousedown="event.preventDefault()" onclick="rteExec('ne_mot','bold')" title="Negrita (Ctrl+B)"><b>B</b></button>
                <button type="button" class="rte-btn" onmousedown="event.preventDefault()" onclick="rteExec('ne_mot','italic')" title="Cursiva (Ctrl+I)"><i>I</i></button>
                <button type="button" class="rte-btn" onmousedown="event.preventDefault()" onclick="rteExec('ne_mot','underline')" title="Subrayado (Ctrl+U)"><u>U</u></button>
                <span class="rte-sep"></span>
                <button type="button" class="rte-btn" onmousedown="event.preventDefault()" onclick="rteExec('ne_mot','insertOrderedList')" title="Incisos (a, b, c...)">☰<sub>a</sub></button>
                <button type="button" class="rte-btn" onmousedown="event.preventDefault()" onclick="rteExec('ne_mot','insertUnorderedList')" title="Viñetas">☰•</button>
                <span class="rte-sep"></span>
                <button type="button" class="rte-btn" onmousedown="event.preventDefault()" onclick="rteExec('ne_mot','outdent')" title="Disminuir sangría">⇤</button>
                <button type="button" class="rte-btn" onmousedown="event.preventDefault()" onclick="rteExec('ne_mot','indent')" title="Aumentar sangría">⇥</button>
                <span class="rte-sep"></span>
                <button type="button" class="rte-btn" onmousedown="event.preventDefault()" onclick="rteExec('ne_mot','removeFormat')" title="Limpiar formato">✕</button>
              </div>
              <div id="ne_mot" class="rte-editor" contenteditable="true" data-placeholder="Descripción detallada de la enmienda..." onfocus="rteSetup()"></div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:18px">
            <button class="btn btn-p" onclick="guardarEnm()">💾 Guardar Enmienda</button>
            <button class="btn btn-s" onclick="closeEnmPanel()">Cancelar</button>
          </div>
        </div>
      </div>
      ${(function(){return renderUpdateSection(c).outerHTML;})()}
      <div class="section-box">
        <h3>💲 Listas de Precios / Tarifarios <span class="tcnt">${(c.tarifarios||[]).length} tablas</span></h3>
        ${renderTarSection(c)}
      </div>
      <div class="section-box">
        <h3>🧾 AVEs <span class="tcnt">${aves.length} registrados</span></h3>
        ${(function(){
          var polyAves=aves.filter(function(a){return a.tipo==='POLINOMICA';});
          var ownerAves=aves.filter(function(a){return a.tipo==='OWNER';});
          // Vigentes (no validados todavía) — son los que cuentan para el límite
          var polyPending=polyAves.filter(function(a){return !a.aicValidated;});
          var ownerPending=ownerAves.filter(function(a){return !a.ccValidated;});
          var polyValidated=polyAves.filter(function(a){return a.aicValidated;});
          var ownerValidated=ownerAves.filter(function(a){return a.ccValidated;});
          // Sumas (totales históricos)
          var ownerSum=ownerAves.reduce(function(s,a){return s+(a.monto||0);},0);
          var polySum=polyAves.reduce(function(s,a){return s+(a.monto||0);},0);
          var ownerSumUsd=toUsd(ownerSum);
          var polySumUsd=toUsd(polySum);
          var totalSumUsd=ownerSumUsd+polySumUsd;
          // Sumas vigentes (post-última validación)
          var polyPendingArs=polyPending.reduce(function(s,a){return s+(a.monto||0);},0);
          var ownerPendingArs=ownerPending.reduce(function(s,a){return s+(a.monto||0);},0);
          var polyPendingUsd=toUsd(polyPendingArs);
          var ownerPendingUsd=toUsd(ownerPendingArs);
          // Sumas validadas (histórico cerrado)
          var polyValidatedUsd=toUsd(polyValidated.reduce(function(s,a){return s+(a.monto||0);},0));
          var ownerValidatedUsd=toUsd(ownerValidated.reduce(function(s,a){return s+(a.monto||0);},0));
          // Límites en USD — el chequeo se hace contra LO VIGENTE
          var LIMIT_AIC=250000;
          var LIMIT_CC=250000;
          var WARN_THRESHOLD=0.8;
          var aveLimit=c._aveOwnerLimit||250000; // USD — comparado contra ownerPendingUsd (equivalente a TC vigente)
          var warnOwner=ownerPendingUsd>aveLimit;
          var requireAIC=polyPendingUsd>=LIMIT_AIC;
          var nearAIC=polyPendingUsd>=LIMIT_AIC*WARN_THRESHOLD && polyPendingUsd<LIMIT_AIC;
          var ownerNearCC=ownerPendingUsd>=LIMIT_CC*WARN_THRESHOLD && ownerPendingUsd<LIMIT_CC;
          var ownerExceedCC=ownerPendingUsd>=LIMIT_CC;
          // Última validación (info)
          var lastAic=(c.aicValidations||[]).slice(-1)[0]||null;
          var lastCc=(c.ccValidations||[]).slice(-1)[0]||null;
          var html='<div class="ave-limit-row"><label>⚠️ Límite advertencia AVE Owner:</label>'
            +'<input type="number" value="'+aveLimit+'" step="10000" min="0" placeholder="250000" onchange="setAveLimit(\''+c.id+'\',this.value)" style="width:140px">'
            +'<span style="font-size:11px;color:var(--g600c)">USD</span>'
            +'<span style="margin-left:auto;font-size:11px;color:var(--g600c)">TC USD: '+fN(TC_USD)+(isUsdContract?' (contrato en USD)':'')+'</span></div>';
          // Banner AIC: requiere validación
          if(requireAIC){
            html+='<div class="ave-warn-banner" style="background:rgba(220,38,38,.08);border-color:#dc2626;color:#dc2626;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
              +'<div style="flex:1;min-width:280px">🔴 <strong>Polinómica vigente '+fmtUsd(polyPendingUsd)+'</strong> supera USD '+fN(LIMIT_AIC)+' — <strong>requiere validación de AIC</strong>. ('+polyPending.length+' AVE'+(polyPending.length!==1?'s':'')+' pendiente'+(polyPending.length!==1?'s':'')+')</div>'
              +'<button class="btn btn-a btn-sm" style="background:#16a34a;color:#fff;border-color:#16a34a;font-weight:700" onclick="markValidationAic(\''+c.id+'\')">✅ Marcar validación AIC y resetear contador</button>'
              +'</div>';
          } else if(nearAIC){
            html+='<div class="ave-warn-banner" style="background:rgba(234,179,8,.10);border-color:#eab308;color:#92400e">🟡 <strong>Polinómica vigente '+fmtUsd(polyPendingUsd)+'</strong> se aproxima al límite USD '+fN(LIMIT_AIC)+' ('+(polyPendingUsd/LIMIT_AIC*100).toFixed(0)+'%) — <strong>preparar validación de AIC</strong>.</div>';
          }
          // Banner Owner / CC
          if(warnOwner) html+='<div class="ave-warn-banner">⛔ AVE Owner vigente ('+fmtUsd(ownerPendingUsd)+') supera el límite de USD '+fN(aveLimit)+'.</div>';
          if(ownerExceedCC){
            html+='<div class="ave-warn-banner" style="background:rgba(220,38,38,.08);border-color:#dc2626;color:#dc2626;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
              +'<div style="flex:1;min-width:280px">🔴 <strong>Owner vigente '+fmtUsd(ownerPendingUsd)+'</strong> supera USD '+fN(LIMIT_CC)+' — <strong>requiere validación de CC</strong>. ('+ownerPending.length+' AVE'+(ownerPending.length!==1?'s':'')+' pendiente'+(ownerPending.length!==1?'s':'')+')</div>'
              +'<button class="btn btn-a btn-sm" style="background:#16a34a;color:#fff;border-color:#16a34a;font-weight:700" onclick="markValidationCc(\''+c.id+'\')">✅ Marcar validación CC y resetear contador</button>'
              +'</div>';
          } else if(ownerNearCC){
            html+='<div class="ave-warn-banner" style="background:rgba(234,179,8,.10);border-color:#eab308;color:#92400e">🟡 <strong>Owner vigente '+fmtUsd(ownerPendingUsd)+'</strong> se aproxima al límite USD '+fN(LIMIT_CC)+' ('+(ownerPendingUsd/LIMIT_CC*100).toFixed(0)+'%) — <strong>preparar validación de CC</strong>.</div>';
          }
          // Info última validación
          if(lastAic) html+='<div style="font-size:11px;color:#16a34a;margin-bottom:6px">✓ Última validación AIC: '+fD((lastAic.date||'').substring(0,10))+' · '+fmtUsd(lastAic.totalUsd||0)+' · '+(lastAic.aveIds||[]).length+' AVE(s) <button class="btn btn-d btn-sm" style="font-size:9px;padding:1px 6px;margin-left:6px" onclick="undoValidationAic(\''+c.id+'\',\''+lastAic.id+'\')" title="Deshacer última validación AIC">↺ Deshacer</button></div>';
          if(lastCc) html+='<div style="font-size:11px;color:#16a34a;margin-bottom:6px">✓ Última validación CC: '+fD((lastCc.date||'').substring(0,10))+' · '+fmtUsd(lastCc.totalUsd||0)+' · '+(lastCc.aveIds||[]).length+' AVE(s) <button class="btn btn-d btn-sm" style="font-size:9px;padding:1px 6px;margin-left:6px" onclick="undoValidationCc(\''+c.id+'\',\''+lastCc.id+'\')" title="Deshacer última validación CC">↺ Deshacer</button></div>';
          var polyCellCls=requireAIC?' warn':(nearAIC?' near':'');
          var ownerCellCls=(ownerExceedCC||warnOwner)?' warn':(ownerNearCC?' near':'');
          // Helper para línea USD vigente | validado en cada celda
          function usdSubLine(pendUsd, valUsd, color, badge){
            return '<div style="font-family:JetBrains Mono,monospace;font-size:10.5px;color:'+color+';margin-top:2px;font-weight:700">Vigente: '+fmtUsd(pendUsd)+(badge?' · '+badge:'')+'</div>'
              +(valUsd>0?'<div style="font-family:JetBrains Mono,monospace;font-size:9.5px;color:#16a34a;margin-top:1px">✓ Validado: '+fmtUsd(valUsd)+'</div>':'');
          }
          html+='<div class="ave-totals">'
            +'<div class="ave-tot-cell'+polyCellCls+'"><div class="atl">Σ AVE Polinómica</div><div class="atv">'+(c.mon||'ARS')+' '+fN(polySum)+'</div>'+usdSubLine(polyPendingUsd, polyValidatedUsd, requireAIC?'#dc2626':nearAIC?'#92400e':'var(--p600)', requireAIC?'AIC':nearAIC?'⚠ AIC':'')+'</div>'
            +'<div class="ave-tot-cell'+ownerCellCls+'"><div class="atl">Σ AVE Owner</div><div class="atv">'+(c.mon||'ARS')+' '+fN(ownerSum)+'</div>'+usdSubLine(ownerPendingUsd, ownerValidatedUsd, ownerExceedCC?'#dc2626':ownerNearCC?'#92400e':'var(--p600)', ownerExceedCC?'CC':ownerNearCC?'⚠ CC':'')+'</div>'
            +'<div class="ave-tot-cell"><div class="atl">Σ Total AVEs</div><div class="atv">'+(c.mon||'ARS')+' '+fN(polySum+ownerSum)+'</div><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:var(--p600);margin-top:2px;font-weight:700">'+fmtUsd(totalSumUsd)+'</div></div>'
            +'</div>';
          return html;
        })()}
        <table><thead><tr><th>Tipo</th><th>Enm. Ref.</th><th>Período</th><th>Valor previo</th><th>Ajuste</th><th>Equiv. USD</th><th>Nuevo valor</th><th>Concepto</th><th></th></tr></thead><tbody>${aveRows}</tbody></table>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-p btn-sm" onclick="openAveOwnerPanel()">🔵 + AVE Owner Manual</button>
          <button class="btn btn-d btn-sm" onclick="deleteLastAutoAve()">🗑 Borrar último AVE AUTO</button>
        </div>
        <div class="ave-owner-panel" id="aveOwnerPanel">
          <h4>🔵 Registrar AVE Owner</h4>
          <div class="fg2" style="gap:14px 18px">
            <div class="fgrp">
              <label>Concepto / Subtipo <span class="req">*</span></label>
              <select id="avo_sub" onchange="onAvoSubChange()">
                <option value="">— Seleccioná —</option>
                <option value="EXTENSION PLAZO">📅 Extensión de Plazo</option>
                <option value="ACTUALIZACION TARIFAS">💰 Actualización de Tarifas</option>
                <option value="SCOPE MAYOR">🔧 Incremento de Scope</option>
                <option value="SCOPE MENOR">📉 Reducción de Scope</option>
                <option value="CLAUSULAS">📋 Modificación de Cláusulas</option>
                <option value="OTRO">💬 Otro</option>
              </select>
            </div>
            <div class="fgrp">
              <label>Referencia Enmienda</label>
              <select id="avo_enm">
                <option value="">— Sin referencia —</option>
                ${enms.map(function(e){var _lbl={ACTUALIZACION_TARIFAS:'Act.Tarifas',EXTENSION:'Extensión',SCOPE:'Scope',CLAUSULAS:'Cláusulas',OTRO:'Otro'};var tl=enmTipos(e).map(function(t){return _lbl[t]||'Otro';}).join(' + ');return '<option value="'+e.num+'">Enm. N°'+e.num+' — '+tl+'</option>';}).join('')}
              </select>
            </div>
            <div class="fgrp">
              <label>Monto AVE <span class="req">*</span></label>
              <input type="number" id="avo_monto" step="0.01" min="0" placeholder="Monto en pesos">
            </div>
            <div class="fgrp">
              <label>Período (YYYY-MM)</label>
              <input type="month" id="avo_per">
            </div>
            <div class="fgrp" id="avo_ffin_grp" style="display:none">
              <label>Nueva Fecha Fin <span class="req">*</span></label>
              <input type="date" id="avo_ffin">
            </div>
            <div class="fgrp" id="avo_otro_grp" style="display:none">
              <label>Descripción</label>
              <input type="text" id="avo_otro" placeholder="Describí el concepto...">
            </div>
          </div>
          <div class="fgrp" style="margin-top:10px">
            <label style="display:flex;align-items:center;gap:6px;font-weight:500;cursor:pointer"><input type="checkbox" id="avo_ajustable"> 🔗 Ajustable — este importe participa de las futuras actualizaciones de tarifas (mismo % polinómico que la base del contrato)</label>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-p" onclick="saveAveOwner()">💾 Guardar AVE Owner</button>
            <button class="btn btn-s" onclick="closeAveOwnerPanel()">Cancelar</button>
          </div>
        </div>
      </div>
      
      <div class="section-box">
      ${(()=>{
        // Gráfico de líneas: eje X tiempo, eje Y monto del contrato (TV acumulado). Vive en
        // fondo claro (mismo lugar que la tabla de AVEs de arriba), así que usa esa misma
        // paleta clara — no la del header azul oscuro del contrato.
        try{
          const events=[];
          if(c.fechaIni) events.push({fecha:c.fechaIni, tipo:'base', label:'Inicio de contrato', periodo:'', delta:montoBase});
          (c.aves||[]).slice().sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))).forEach(a=>{
            if(!a.fecha) return;
            events.push({fecha:a.fecha.substring(0,10), tipo:a.tipo==='POLINOMICA'?'poly':'owner',
              label:(a.tipo==='POLINOMICA'?'AVE Polinómica':'AVE Owner')+(a.subtipo&&a.tipo!=='POLINOMICA'?' · '+a.subtipo:'')+(a.concepto?' · '+a.concepto:''),
              periodo:a.periodo||'', delta:a.monto||0});
          });
          if(events.length<2) return '<h3>📈 Evolución del contrato</h3><div class="empty-cell" style="padding:14px 0">Todavía no hay AVEs registrados para graficar la evolución.</div>';
          let cum=0;
          const pts=events.map(e=>{cum+=e.delta; return {...e, val:cum};});
          const hoy2=new Date(); hoy2.setHours(0,0,0,0);
          const finD=c.fechaFin?new Date(c.fechaFin+'T00:00:00'):null;
          const lastPt=pts[pts.length-1];
          const endDateStr=(finD&&finD<hoy2)?c.fechaFin:hoy2.toISOString().substring(0,10);
          if(endDateStr>lastPt.fecha) pts.push({fecha:endDateStr, tipo:'now', label:(finD&&finD<hoy2)?'Fin de contrato':'Hoy', periodo:'', delta:0, val:lastPt.val});
          const colDot={base:'#16a34a',poly:'#b45309',owner:'#3399ff',now:'var(--p700)'};
          const W=760,H=280,padL=72,padR=20,padT=20,padB=42;
          const ys=pts.map(p=>p.val);
          const n=pts.length;
          // Eje X categórico (un punto por evento, equiespaciado) en vez de escala lineal por
          // fecha real: con AVEs agrupadas en pocas semanas dentro de un contrato de varios
          // meses, la escala temporal dejaba casi todo el gráfico vacío y los puntos amontonados
          // en un extremo. La fecha real de cada evento sigue disponible en su etiqueta y tooltip.
          const xToPx=i=>n<=1?padL:padL+(W-padL-padR)*(i/(n-1));
          const yMin=0, yMax=(Math.max.apply(null,ys)*1.08)||1;
          const yToPx=v=>padT+(H-padT-padB)*(1-(v-yMin)/Math.max(1,yMax-yMin));
          let path=''; pts.forEach((p,i)=>{const x=xToPx(i),y=yToPx(p.val);path+=(i===0?'M':'L')+x.toFixed(1)+','+y.toFixed(1)+' ';});
          const areaPath=path+'L'+xToPx(n-1).toFixed(1)+','+yToPx(0).toFixed(1)+' L'+xToPx(0).toFixed(1)+','+yToPx(0).toFixed(1)+' Z';
          const yTicks=[]; for(let i=0;i<=4;i++){ const v=yMin+(yMax-yMin)*i/4; yTicks.push(v); }
          const yGrid=yTicks.map(v=>{const y=yToPx(v); return '<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--g100)"/><text x="'+(padL-8)+'" y="'+(y+3).toFixed(1)+'" fill="var(--g500)" font-size="10" text-anchor="end" font-family="JetBrains Mono,monospace">'+fmtCompactNum(v)+'</text>';}).join('');
          // Máximo ~10 etiquetas visibles (siempre la primera y la última) y nunca dos
          // etiquetas seguidas con la misma fecha — con AVEs cargadas en tanda el mismo día,
          // repetir la fecha en cada punto se leía como un dato roto.
          const xLabelStep=Math.max(1,Math.ceil(n/10));
          let lastLbl=null;
          const xGrid=pts.map((p,i)=>{
            const x=xToPx(i);
            const d=new Date(p.fecha+'T00:00:00');
            const lbl=String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getFullYear()).slice(2);
            const wantsLbl=(i%xLabelStep===0)||(i===n-1);
            const showLbl=wantsLbl&&lbl!==lastLbl;
            if(showLbl)lastLbl=lbl;
            return '<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+padT+'" y2="'+(H-padB)+'" stroke="var(--g50)"/>'+(showLbl?'<text x="'+x.toFixed(1)+'" y="'+(H-padB+16)+'" fill="var(--g500)" font-size="10" text-anchor="middle" font-family="JetBrains Mono,monospace">'+lbl+'</text>':'');
          }).join('');
          const dots=pts.map((p,i)=>{const x=xToPx(i),y=yToPx(p.val); const col=colDot[p.tipo]||'var(--p700)'; const tip=p.label+' · '+fD(p.fecha)+' · '+(c.mon||'ARS')+' '+fN(p.val)+(p.delta?' (+'+fN(p.delta)+')':'')+(p.periodo?' · período '+(formatMonth(p.periodo)||p.periodo):''); return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="5" fill="'+col+'" stroke="#fff" stroke-width="2" style="cursor:pointer"><title>'+esc(tip)+'</title></circle>';}).join('');
          // Sin preserveAspectRatio="none" y con height:auto: el SVG escala respetando el
          // aspect ratio del viewBox, así el texto no queda estirado horizontalmente cuando
          // el contenedor es más ancho que alto (lo que se veía "ensanchado" antes).
          const svg='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;max-height:340px;display:block">'
            +'<defs><linearGradient id="evolGrad'+c.id+'" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--p600)" stop-opacity=".18"/><stop offset="100%" stop-color="var(--p600)" stop-opacity="0"/></linearGradient></defs>'
            +xGrid+yGrid
            +'<path d="'+areaPath+'" fill="url(#evolGrad'+c.id+')"/>'
            +'<path d="'+path+'" fill="none" stroke="var(--p600)" stroke-width="2.5"/>'
            +dots
            +'</svg>';
          const legend='<div style="display:flex;gap:16px;font-size:11.5px;flex-wrap:wrap;color:var(--g600c);margin-top:8px">'
            +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#16a34a;margin-right:5px;vertical-align:middle"></span>Base</span>'
            +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#b45309;margin-right:5px;vertical-align:middle"></span>AVE Polinómica</span>'
            +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#3399ff;margin-right:5px;vertical-align:middle"></span>AVE Owner</span>'
            +'<span style="margin-left:auto;font-weight:700;color:var(--p700);font-family:JetBrains Mono,monospace">TV final: '+(c.mon||'ARS')+' '+fN(lastPt.val)+'</span>'
            +'</div>';
          return '<h3>📈 Evolución del contrato <span class="tcnt">TV acumulado · '+pts.length+' puntos</span></h3>'
            +svg+legend;
        }catch(e){console.warn('chart evolución', e); return '<h3>📈 Evolución del contrato</h3>';}
      })()}
      </div>

    </div>`;
  } catch(err) {
    console.error('renderDet error', err);
    document.getElementById('detCard').innerHTML = `<div class="card" style="padding:24px"><div style="background:#fde8ea;border:1px solid #dc3545;color:#dc3545;border-radius:8px;padding:16px;font-size:13px"><strong>⚠ Error al renderizar el detalle</strong><br>${esc(err.message||String(err))}</div></div>`;
  }
}

// ===== TARIFARIO SYSTEM =====
function getTar(){const c=window.DB.find(x=>x.id===window.detId);return c?.tarifarios||[];}
async function setTar(t){const c=window.DB.find(x=>x.id===window.detId);if(c){c.tarifarios=t;c.updatedAt=new Date().toISOString();save();}}

async function saveTarifarios(){
  const c=window.DB.find(x=>x.id===window.detId);
  if(!c){toast('No hay contrato seleccionado','er');return;}
  try{
    showLoader('Guardando tarifarios...');
    c.updatedAt=new Date().toISOString();
    if(!SB_OK){localStorage.setItem('cta_v7',JSON.stringify(window.DB));hideLoader();toast('Guardado en localStorage','ok');return;}
    await sbUpsertItem('contratos',c);
    hideLoader();
    toast(`${(c.tarifarios||[]).length} tarifario(s) guardado(s) en Supabase ✓`,'ok');
  }catch(err){
    hideLoader();
    console.error('[saveTarifarios]',err);
    toast('Error al guardar: '+err.message,'er');
  }
}


function addTarTable(){
  const c=window.DB.find(x=>x.id===window.detId);if(!c)return;
  const name=prompt('Nombre de la tabla:','Tabla '+(getTar().length+1));if(!name)return;
  if(!c.tarifarios)c.tarifarios=[];
  c.tarifarios.push({name,cols:['N° Item','Descripción','Categoría','Unidad','Valor Unitario'],rows:[['','','','','']]});
  _tarTab=c.tarifarios.length-1;
  setTar(c.tarifarios);renderTarifario();toast('Tabla creada','ok');
}

function delTarTable(i){
  if(!confirm('¿Eliminar esta tabla del tarifario?'))return;
  const tars=getTar();tars.splice(i,1);if(_tarTab>=tars.length)_tarTab=Math.max(0,tars.length-1);
  setTar(tars);renderTarifario();toast('Tabla eliminada','ok');
}

function renameTarTable(i){
  const tars=getTar();const name=prompt('Nuevo nombre:',tars[i].name);if(!name)return;
  tars[i].name=name;setTar(tars);renderTarifario();
}

function changeTarPeriod(i){
  const tars=getTar(); const t=tars[i]; if(!t)return;
  const cur=t.period||'';
  const inp=prompt('Mes de aplicación de esta lista (formato YYYY-MM, ej: 2025-09):', cur);
  if(inp===null) return;
  const v=String(inp).trim();
  if(v && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)){ toast('Formato inválido. Usá YYYY-MM (ej 2025-09)','er'); return; }
  tars[i].period = v||null;
  tars[i].updatedAt=new Date().toISOString();
  _tarPeriod = v||null;
  setTar(tars); renderTarifario();
  toast('Período actualizado','ok');
}

function addTarRow(ti){
  const tars=getTar();tars[ti].rows.push(tars[ti].cols.map(()=>''));
  setTar(tars);renderTarifario();
}

function delTarRow(ti,ri){
  const tars=getTar();tars[ti].rows.splice(ri,1);
  setTar(tars);renderTarifario();
}

function addTarCol(ti){
  const name=prompt('Nombre de la columna:');if(!name)return;
  const tars=getTar();tars[ti].cols.push(name);tars[ti].rows.forEach(r=>r.push(''));
  setTar(tars);renderTarifario();
}

function delTarCol(ti,ci){
  const tars=getTar();if(tars[ti].cols.length<=1){toast('Mínimo 1 columna','er');return;}
  if(!confirm('¿Eliminar columna "'+tars[ti].cols[ci]+'"?'))return;
  tars[ti].cols.splice(ci,1);tars[ti].rows.forEach(r=>r.splice(ci,1));
  setTar(tars);renderTarifario();
}

function editTarCell(ti,ri,ci,val){
  const tars=getTar();tars[ti].rows[ri][ci]=val;setTar(tars);
}

// ===== LISTAS DE PRECIOS CON IA (WORD/EXCEL) =====
function openPriceListImportPicker(){
  const inp=document.getElementById('tarAiIn');
  if(!inp){toast('No se encontró el selector de listas','er');return;}
  try{inp.click();}catch(e){console.error('openPriceListImportPicker',e);toast('No se pudo abrir el selector','er');}
}
function normalizeImportedPriceValue(v){
  if(v==null||v==='') return '';
  if(typeof v==='number') return v;
  let s=String(v).trim();
  if(!s) return '';
  s=s.replace(/\s+/g,'').replace(/[^\d,.-]/g,'');
  if(!s) return '';
  const hasComma=s.includes(',');
  const hasDot=s.includes('.');
  if(hasComma && hasDot){
    if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
  } else if(hasComma){
    s=s.replace(/\./g,'').replace(',','.');
  }
  const n=parseFloat(s);
  return Number.isFinite(n)?n:(String(v).trim());
}
function detectPeriodFromText(txt){
  const s=String(txt||'');
  let m=s.match(/\b(20\d{2})[-_/](0[1-9]|1[0-2])\b/); if(m) return `${m[1]}-${m[2]}`;
  m=s.match(/\b(0[1-9]|1[0-2])[-_/](20\d{2})\b/); if(m) return `${m[2]}-${m[1]}`;
  const map={ene:'01',enero:'01',feb:'02',febrero:'02',mar:'03',marzo:'03',abr:'04',abril:'04',may:'05',mayo:'05',jun:'06',junio:'06',jul:'07',julio:'07',ago:'08',agosto:'08',sep:'09',sept:'09',septiembre:'09',oct:'10',octubre:'10',nov:'11',noviembre:'11',dic:'12',diciembre:'12'};
  const low=s.toLowerCase();
  for(const [k,v] of Object.entries(map)){
    const r1=new RegExp(`\\b${k}\\s*(?:de\\s*)?(20\\d{2})\\b`,'i');
    const r2=new RegExp(`\\b(20\\d{2})\\s*(?:-|/)??\\s*${k}\\b`,'i');
    let mm=low.match(r1); if(mm) return `${mm[1]}-${v}`;
    mm=low.match(r2); if(mm) return `${mm[1]}-${v}`;
  }
  return null;
}
function getMimeTypeFromPriceFile(file){
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(ext==='docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if(ext==='doc') return 'application/msword';
  return file.type||'application/octet-stream';
}
async function analyzePriceListsWithGemini(filePayload, cc, fileName=''){
  const prompt=`Sos un asistente experto en contratos de petróleo y gas argentinos. Extraé únicamente las LISTAS DE PRECIOS o tarifarios base presentes en el documento.\n\nContexto del contrato:\n- Número: ${cc.num}\n- Contratista: ${cc.cont}\n- Archivo: ${fileName}\n\nDevolvé SOLO JSON válido con este esquema exacto:\n{\n  "listasDePrecios": [\n    {\n      "periodo": "YYYY-MM" o null,\n      "nombre": "nombre corto de la lista" o null,\n      "items": [\n        {"item": "código o número", "descripcion": "descripción del ítem", "unidad": "unidad", "precio": número o texto numérico}\n      ]\n    }\n  ]\n}\n\nReglas:\n- Si hay varias tablas, extraelas todas.\n- Si el período no está explícito, devolvé null.\n- No inventes filas ni precios.\n- No devuelvas explicaciones ni markdown.`;
  let response = await callGeminiForEnm([{text: prompt}, {inline_data: {mime_type: filePayload.mimeType, data: filePayload.data}}]);
  if((!response || !response.ok) && filePayload.fallbackText){
    response = await callGeminiForEnm([{text: prompt}, {text: `Contenido del documento:\n\n${filePayload.fallbackText.slice(0,120000)}`}]);
  }
  if (!response || !response.ok) {
    const errText = response ? await response.text().catch(()=>'') : '';
    if (response && response.status === 429) throw new Error('Límite de requests alcanzado. Esperá 1 minuto.');
    if (response && response.status === 400) throw new Error('Archivo inválido o demasiado grande para analizar.');
    throw new Error(`IA no disponible ${response ? response.status : 'N/A'}: ${errText.slice(0,180)}`);
  }
  const data=await response.json();
  const parts=data?.candidates?.[0]?.content?.parts||[];
  const txt=parts.map(p=>p.text||'').join('\n').trim();
  return extractJsonFromGeminiText(txt);
}
function slugSource(fileName, fallback){const s=String(fileName||'').replace(/\.[^.]+$/,'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');return s||fallback||'EXCEL';}
function normalizeAiPriceLists(result, fileName, cc){
  const lists=Array.isArray(result?.listasDePrecios)?result.listasDePrecios:[];
  const fallbackPeriod=cc?.btar||cc?.fechaIni?.substring(0,7)||null;
  const clean=[];
  lists.forEach((lst,idx)=>{
    const period=detectPeriodFromText(lst?.periodo||lst?.nombre||fileName)||fallbackPeriod;
    const rows=(Array.isArray(lst?.items)?lst.items:[]).map(it=>[
      String(it?.item??'').trim(),
      String(it?.descripcion??'').trim(),
      String(it?.unidad??'').trim(),
      normalizeImportedPriceValue(it?.precio)
    ]).filter(r=>r.some(v=>String(v??'').trim()!==''));
    if(!rows.length) return;
    clean.push({
      name:String(lst?.nombre||(`Lista IA ${idx+1}`)).trim()||(`Lista IA ${idx+1}`),
      cols:['Item','Descripción','Unidad','Precio'],
      rows,
      period,
      source:slugSource(fileName,'WORD_IA'),
      sourceFileName:fileName,
      importedAt:new Date().toISOString(),
      editable:true
    });
  });
  return clean;
}
function standardizeExcelPriceList(sheetName, json, cc, fileName){
  if(!Array.isArray(json)||json.length<1) return null;
  const headers=(json[0]||[]).map(v=>String(v||'').trim());
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const h=headers.map(norm);
  const idxBySyn=(syns)=>h.findIndex(x=>syns.some(s=>x.includes(s)));
  let itemIdx=idxBySyn(['item','codigo','cod','n item','n° item','numero item','posicion']);
  let descIdx=idxBySyn(['descripcion','detalle','concepto','texto breve','short text','servicio']);
  let unitIdx=idxBySyn(['unidad','uom','um','unit']);
  let priceIdx=idxBySyn(['precio','valor unitario','precio unitario','tarifa','rate','importe','valor']);
  if(descIdx<0) descIdx=1>=headers.length?0:1;
  if(itemIdx<0) itemIdx=0;
  if(unitIdx<0) unitIdx=Math.min(2, headers.length-1);
  if(priceIdx<0) priceIdx=Math.min(3, headers.length-1);
  const rows=json.slice(1).filter(r=>Array.isArray(r)&&r.some(v=>String(v||'').trim()!=='' )).map(r=>[
    String(r[itemIdx]??'').trim(),
    String(r[descIdx]??'').trim(),
    String(r[unitIdx]??'').trim(),
    normalizeImportedPriceValue(r[priceIdx]??'')
  ]).filter(r=>r.some(v=>String(v??'').trim()!==''));
  if(!rows.length) return null;
  const blobText=[sheetName, ...json.slice(0,8).flat()].join(' ');
  return {
    name:String(sheetName||'Lista Excel').trim(),
    cols:['Item','Descripción','Unidad','Precio'],
    rows,
    period:detectPeriodFromText(blobText)||(cc?.btar||cc?.fechaIni?.substring(0,7)||null),
    source:slugSource(fileName,'EXCEL'),
    sourceFileName:fileName,
    importedAt:new Date().toISOString(),
    editable:true
  };
}
async function parsePriceListExcelFile(file, cc){
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(new Uint8Array(buf),{type:'array'});
  const out=[];
  wb.SheetNames.forEach(sn=>{
    const ws=wb.Sheets[sn];
    const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    const table=standardizeExcelPriceList(sn,json,cc,file.name);
    if(table) out.push(table);
  });
  return out;
}
async function importPriceListsFromFiles(files){
  if(!files||!files.length) return;
  const cc=window.DB.find(x=>x.id===window.detId); if(!cc){toast('No hay contrato seleccionado','er');return;}
  const imported=[]; const errors=[];
  try{ if(typeof showLoader==='function') showLoader('Analizando listas de precios...'); }catch(e){}
  for(const file of Array.from(files)){
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    try{
      if(['xls','xlsx'].includes(ext)){
        const parsed=await parsePriceListExcelFile(file, cc);
        if(!parsed.length) throw new Error('No se detectaron tablas útiles en el Excel');
        imported.push(...parsed);
        continue;
      }
      if(!['doc','docx'].includes(ext)) throw new Error('Formato no soportado. Usá Word o Excel.');
      if(file.size>20*1024*1024) throw new Error('Archivo muy grande (máx 20MB).');
      const payload=await buildGeminiFilePayload(file);
      payload.mimeType = payload.mimeType || getMimeTypeFromPriceFile(file);
      const result=await analyzePriceListsWithGemini(payload, cc, file.name);
      const parsed=normalizeAiPriceLists(result, file.name, cc);
      if(!parsed.length) throw new Error('La IA no encontró listas de precios en el documento');
      imported.push(...parsed);
    }catch(err){
      console.error('importPriceListsFromFiles', file.name, err);
      errors.push(`${file.name}: ${err.message||'Error inesperado'}`);
    }
  }
  try{ if(typeof hideLoader==='function') hideLoader(); }catch(e){}
  if(!imported.length){
    toast(errors.length?errors[0]:'No se importaron listas','er');
    return;
  }
  const current=(cc.tarifarios||[]).slice();
  imported.forEach(tbl=>{
    const found=current.findIndex(x=>String(x.period||'')===String(tbl.period||'')&&String(x.name||'')===String(tbl.name||'')&&String(x.source||'')===String(tbl.source||''));
    if(found>=0) current[found]=Object.assign({},current[found],tbl,{updatedAt:new Date().toISOString()});
    else current.push(tbl);
  });
  cc.tarifarios=current;
  cc.updatedAt=new Date().toISOString();
  console.log('[importPriceListsFromFiles] Importadas', imported.length, 'listas. Total tarifarios:', cc.tarifarios.length);
  if(!SB_OK){localStorage.setItem('cta_v7',JSON.stringify(window.DB));}
  else{await sbUpsertItem('contratos',cc);console.log('[importPriceListsFromFiles] ✓ Guardado en Supabase');}
  renderTarifario();
  const msg=`${imported.length} ${imported.length===1?'lista importada':'listas importadas'}${errors.length?` · ${errors.length} archivo(s) con error`:''}`;
  toast(msg+' y guardadas','ok');
  if(errors.length) console.warn('Errores de importación de listas:', errors);
}


function togglePanel(id){document.getElementById(id).classList.toggle('vis');}

function openEnmPanel(){
  const panel = document.getElementById('enmPanel');
  if(!panel){ toast('No se encontró el panel de enmiendas', 'er'); return; }
  panel.classList.add('vis');
  const c = window.DB.find(x=>x.id===window.detId);
  const nextNum = ((c?.enmiendas)||[]).length + 1;
  const numEl = document.getElementById('ne_num');
  if(numEl) numEl.value = nextNum;
  document.querySelectorAll('.ne_tipo_cb').forEach(cb=>{cb.checked=false;});
  // Reset sub-selects
  const tarSub=document.getElementById('ne_tar_subtipo');if(tarSub)tarSub.value='POLINOMICA';
  const scopeSub=document.getElementById('ne_scope_tipo');if(scopeSub)scopeSub.value='MAYOR';
  onScopeTipoChange();
  const extSub=document.getElementById('ne_ext_tipo');if(extSub)extSub.value='FIN';
  const scopePer=document.getElementById('ne_scope_periodo');if(scopePer)scopePer.value='';
  const otroTit=document.getElementById('ne_otro_titulo');if(otroTit)otroTit.value='';
  _neScopeNuevos=[];
  if(typeof onEnmTipoChange==='function') onEnmTipoChange();
  panel.scrollIntoView({behavior:'smooth', block:'start'});
}

window.closeEnmModal = function closeEnmModal() {
  const modal = document.getElementById('enmPdfModal');
  if (modal) modal.style.display = 'none';
  _importedEnms = [];
  const inp = document.getElementById('enmPdfIn');
  if (inp) inp.value = '';
}

function closeEnmPanel(){
  const panel = document.getElementById('enmPanel');
  if(panel) panel.classList.remove('vis');
  document.querySelectorAll('.ne_tipo_cb').forEach(cb=>{cb.checked=false;});
  const ids = ['ne_ffin','ne_aveManual','ne_ext_tipo','ne_tar_subtipo','ne_scope_tipo','ne_scope_periodo','ne_otro_titulo'];
  ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const motEl=document.getElementById('ne_mot'); if(motEl) motEl.innerHTML='';
  const aveSug=document.getElementById('ne_aveSug');if(aveSug)aveSug.style.display='none';
  _neScopeNuevos=[];
  initTramos();
  if(typeof onEnmTipoChange==='function') onEnmTipoChange();
}

function openEnmImportPicker(){
  const inp = document.getElementById('enmPdfIn');
  if(!inp){ toast('No se encontró el selector de archivos', 'er'); return; }
  try{ inp.click(); }catch(e){ console.error('openEnmImportPicker', e); toast('No se pudo abrir el selector de archivos', 'er'); }
}



function editCont(id){const c=window.DB.find(x=>x.id===id);if(!c)return;document.getElementById('formErrBanner')?.remove();editId=id;
  populateProvSelect();
  setTimeout(function(){
    document.getElementById('f_cont').value=c.cont||'';
  },10);
  document.getElementById('f_num').value=c.num;
  document.getElementById('f_tipo').value=c.tipo||'';
  document.getElementById('f_mon').value=c.mon||'';
  document.getElementById('f_monto').value=c.monto||'';
  // En edición este campo muestra c.monto = Target Value ACTUALIZADO (monto original +
  // AVEs ya aplicadas), no el monto inicial real del contrato — ver montoBase para ese dato.
  const montoLbl=document.getElementById('f_monto_lbl');if(montoLbl)montoLbl.innerHTML='Target Value Actualizado <span class="req">*</span>';
  
  // Anticipo (OBRA)
  document.getElementById('f_anticipoPct').value=c.anticipoPct||'';
  document.getElementById('f_anticipoMonto').value=c.anticipo||'';
  onTipoContratoChange();  // Mostrar/ocultar campos según tipo
  
  document.getElementById('f_ini').value=c.fechaIni;
  document.getElementById('f_fin').value=c.fechaFin;document.getElementById('f_resp').value=c.resp||'';
  document.getElementById('f_btar').value=c.btar||'';document.getElementById('f_det').value=c.det||'';
  calcPlazo();setPoly(c.poly);
  document.getElementById('f_tcontr').value=c.tcontr||'';onContrCh();
  document.getElementById('f_ariba').value=c.ariba||'';
  // rfqOferentes es la fuente de verdad; si el contrato es de antes de este campo, se
  // reconstruye una vez desde los campos viejos (Participantes/Oferentes en texto libre)
  // para no perder lo ya cargado — se marca cotizo=true a los nombres que también
  // aparecían en "Oferentes" (comparación sin mayúsculas/espacios).
  if(Array.isArray(c.rfqOferentes)){
    rfqOfrs=c.rfqOferentes.map(o=>({nombre:o.nombre||'',cotizo:!!o.cotizo}));
  } else {
    const norm=s=>String(s||'').trim().toLowerCase();
    const partNames=String(c.participantes||'').split(/\s*-\s*/).map(s=>s.trim()).filter(Boolean);
    const ofrNames=String(c.oferentes||'').split(/\s*-\s*/).map(s=>s.trim()).filter(Boolean);
    const ofrNormSet=new Set(ofrNames.map(norm));
    rfqOfrs=partNames.length?partNames.map(n=>({nombre:n,cotizo:ofrNormSet.has(norm(n))}))
      :ofrNames.map(n=>({nombre:n,cotizo:true}));
  }
  renderRfqOferentes();
  document.getElementById('f_fev').value=c.fev||'';document.getElementById('f_fevFin').value=c.fevFin||'';
  document.getElementById('f_dd').value = (c.dd && c.dd !== true && c.dd !== false) ? c.dd : '';
  document.getElementById('f_pr').value = (c.pr && c.pr !== true && c.pr !== false) ? c.pr : '';
  document.getElementById('f_sq').value = (c.sq && c.sq !== true && c.sq !== false) ? c.sq : '';
  document.getElementById('f_ddStatus').value=c.ddStatus||'PENDING';
  document.getElementById('f_prStatus').value=c.prStatus||'PENDING';
  document.getElementById('f_sqStatus').value=c.sqStatus||'PENDING';
  document.getElementById('f_fueComite').checked=!!c.fueComite;
  document.getElementById('f_comiteJustif').value=c.comiteJustif||'';
  document.getElementById('f_comiteFecha').value=c.comiteFecha||'';
  document.getElementById('f_comiteResultado').value=c.comiteResultado||'APROBADO';
  document.getElementById('f_comiteObs').value=c.comiteObs||'';
  setMonto('comiteMonto',c.comiteMonto);
  onFueComiteToggle();
  document.getElementById('f_dg').checked=!!c.dg;
  document.getElementById('f_dgDoc').value=c.dgDoc||'';
  onDgToggle();
  document.getElementById('f_faxAsrSent').checked=!!c.faxAsrSent;
  document.getElementById('f_faxAsrNombre').value=c.faxAsrNombre||'';
  setMonto('faxAsrMonto',c.faxAsrMonto);
  document.getElementById('f_faxApiSent').checked=!!c.faxApiSent;
  document.getElementById('f_faxApiNombre').value=c.faxApiNombre||'';
  setMonto('faxApiMonto',c.faxApiMonto);
  onFaxToggle('Asr');onFaxToggle('Api');
  document.getElementById('f_alcAsr').checked=!!c.alcanceAsr;
  document.getElementById('f_alcApi').checked=!!c.alcanceApi;
  document.getElementById('f_alcTdf').checked=!!c.alcanceTdf;
  document.getElementById('f_alcNqn').checked=!!c.alcanceNqn;
  document.getElementById('f_alcBa').checked=!!c.alcanceBa;
  document.getElementById('f_cl1Inc').checked = c.claus1Inc!=null ? !!c.claus1Inc : true;
  document.getElementById('f_cl2Inc').checked = c.claus2Inc!=null ? !!c.claus2Inc : true;
  document.getElementById('f_cl2DiaDesde').value=c.claus2DiaDesde||'Lunes';
  document.getElementById('f_cl2DiaHasta').value=c.claus2DiaHasta||'Viernes';
  document.getElementById('f_cl2HoraDesde').value=c.claus2HoraDesde||'08:00';
  document.getElementById('f_cl2HoraHasta').value=c.claus2HoraHasta||'19:00';
  document.getElementById('f_cl3Inc').checked = c.claus3Inc!=null ? !!c.claus3Inc : true;
  document.getElementById('f_cl4Inc').checked = c.claus4Inc!=null ? !!c.claus4Inc : true;
  document.getElementById('f_cl5Inc').checked = c.claus5Inc!=null ? !!c.claus5Inc : true;
  document.getElementById('f_cl5FdoGtia').checked = !!c.claus5FondoGarantia;
  if(typeof onCl5FdoToggle==='function')onCl5FdoToggle();
  document.getElementById('f_cl6Inc').checked = c.claus6Inc!=null ? !!c.claus6Inc : true;
  document.getElementById('f_cl7Inc').checked = c.claus7Inc!=null ? !!c.claus7Inc : true;
  document.getElementById('f_cl8Inc').checked = c.claus8Inc!=null ? !!c.claus8Inc : true;
  document.getElementById('f_cl9Inc').checked = c.claus9Inc!=null ? !!c.claus9Inc : true;
  document.getElementById('f_cl10Inc').checked = c.claus10Inc!=null ? !!c.claus10Inc : true;
  document.getElementById('f_cl11Inc').checked = c.claus11Inc!=null ? !!c.claus11Inc : true;
  document.getElementById('f_cl12Inc').checked = c.claus12Inc!=null ? !!c.claus12Inc : true;
  document.getElementById('f_cl12Tipo').value=c.claus12Tipo||'';
  document.getElementById('f_cl13Inc').checked = c.claus13Inc!=null ? !!c.claus13Inc : true;
  ['cl1Inc','cl2Inc','cl3Inc','cl4Inc','cl5Inc','cl6Inc','cl7Inc','cl8Inc','cl9Inc','cl10Inc','cl11Inc','cl12Inc','cl13Inc'].forEach(onClausToggle);
  document.getElementById('f_rtec').value=c.rtec||'';document.getElementById('f_tc').value=c.tc||'';
  document.getElementById('f_own').value=c.own||'';document.getElementById('f_asset').value=c.asset||'';document.getElementById('f_cprov').value=c.cprov||'';
  document.getElementById('f_vend').value=c.vend||'';document.getElementById('f_fax').value=c.fax||'';
  document.getElementById('f_com').value=c.com||'';
  // Redet - handle legacy: if poly has data, assume hasPoly=true
  const hasPolyData=c.hasPoly||(c.poly&&c.poly.some(p=>p.idx));
  document.getElementById('f_hasPoly').checked=!!hasPolyData;document.getElementById('l_hasPoly').textContent=hasPolyData?'Sí':'No';document.getElementById('polyWrap').style.display=hasPolyData?'':'none';
  document.getElementById('f_trigA').checked=!!c.trigA;document.getElementById('l_trigA').textContent=c.trigA?'Sí':'No';
  document.getElementById('f_trigB').checked=!!c.trigB;document.getElementById('l_trigB').textContent=c.trigB?'Sí':'No';document.getElementById('trigB_pct').style.display=c.trigB?'flex':'none';document.getElementById('f_trigBpct').value=c.trigBpct||'';
  document.getElementById('f_trigC').checked=!!c.trigC;document.getElementById('l_trigC').textContent=c.trigC?'Sí':'No';document.getElementById('trigC_mes').style.display=c.trigC?'flex':'none';document.getElementById('f_trigCmes').value=c.trigCmes||'';
  files=(c.adj||[]).map(a=>({...a}));renderFL();go('form');
}

async function delCont(id){if(!confirm('¿Eliminar contrato?'))return;const c=window.DB.find(x=>x.id===id);if(c&&SB_OK)await sbDeleteItem('contratos',c.__sbId);window.DB=window.DB.filter(x=>x.id!==id);if(!SB_OK)localStorage.setItem('cta_v7',JSON.stringify(window.DB));renderList();updNav();toast('Eliminado','ok');if(window.detId===id)go('list');if(typeof window.initFuzzySearch==='function')window.initFuzzySearch();}

// ===================== ME2N SYSTEM =====================
// ME2N data structure: { "4600005730": ["VENDOR NAME", "EUR", [[po,YYYY-MM,plant,nov,still,nItems,shortText],...]], ... }

const PLANT_MAP={
  'AR50':'APE - AR50','ARJ0':'LESC - ARJ0','AR20':'TDF - AR20','AR30':'PQ - AR30',
  'AR40':'RIO CHICO - AR40','ARM0':'PLYII - ARM0','ARN0':'MLO-123 - ARN0',
  'ARO0':'CAN-111 - ARO0','ARP0':'CAN-113 - ARP0','AR10':'BSAS - AR10',
  'AR60':'ASR - AR60','ARK0':'RCZA - ARK0'
};
function plantLabel(p){return PLANT_MAP[p]||p||'—';}

// Get total consumed (sum of Net Order Value) for a contract number from ME2N
function getConsumed(contractNum){
  const d=ME2N[contractNum];
  if(!d)return null; // null = no data (not 0)
  return d[2].reduce((s,p)=>s+p[3],0);
}

// Clasifica el consumido de un contrato OBRA en "avance de obra" vs "adicionales"
// según poMeta[poNum].countsAsProgress (default: cuenta como avance)
function getObraConsumedSplit(contractNum, poMeta){
  const d=ME2N[contractNum];
  if(!d)return null;
  const meta=poMeta||{};
  let avanceObra=0, adicionales=0;
  d[2].forEach(p=>{
    const poNum=p[0]||'';
    const counts=(meta[poNum]||{}).countsAsProgress!==false;
    if(counts) avanceObra+=p[3]||0; else adicionales+=p[3]||0;
  });
  return {avanceObra, adicionales, total:avanceObra+adicionales};
}

function importMe2n(input){
  const file=input.files[0];if(!file)return;
  toast('Procesando Excel...','ok');
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=new Uint8Array(e.target.result);
      const wb=XLSX.read(data,{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
      if(json.length<2){toast('Excel vacío','er');return;}
      // Process rows (skip header)
      const poAgg={};
      for(let i=1;i<json.length;i++){
        const r=json[i];
        const oa=String(r[0]||'').trim();
        const po=String(r[1]||'').trim();
        if(!po)continue;
        const dt=r[4];
        let ym='';
        if(dt instanceof Date){ym=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');}
        else if(typeof dt==='string'&&dt.length>=7){ym=dt.substring(0,7);}
        const vendor=String(r[5]||'').trim().substring(0,40);
        const shortText=String(r[7]||'').trim().substring(0,80);
        const plant=String(r[9]||'').trim();
        const curr=String(r[13]||'').trim();
        const still=parseFloat(r[14])||0;
        const nov=parseFloat(r[17])||0;
        if(!poAgg[po])poAgg[po]={oa:'',dt:'',pl:'',cu:'',n:0,s:0,ni:0,v:'',st:''};
        const d=poAgg[po];
        if(oa)d.oa=oa;
        if(ym&&!d.dt)d.dt=ym;
        if(plant)d.pl=plant;
        if(curr)d.cu=curr;
        if(vendor)d.v=vendor;
        if(shortText&&!d.st)d.st=shortText;
        d.n+=nov;d.s+=still;d.ni++;
      }
      // Build contract-level
      const result={};
      for(const[poNum,pd]of Object.entries(poAgg)){
        const oa=pd.oa||'SIN_CTTO';
        if(!result[oa])result[oa]=['','',[]];
        if(pd.v)result[oa][0]=pd.v;
        if(pd.cu)result[oa][1]=pd.cu;
        result[oa][2].push([poNum,pd.dt,pd.pl,Math.round(pd.n*100)/100,Math.round(pd.s*100)/100,pd.ni,pd.st||'']);
      }
      ME2N=result;
      saveMe2n();updNav();renderMe2n();buildPlantFilter();
      const nC=Object.keys(result).length,nP=Object.keys(poAgg).length;
      toast(nP+' POs en '+nC+' contratos cargados','ok');
    }catch(err){toast('Error leyendo Excel','er');console.error(err);}
  };
  reader.readAsArrayBuffer(file);
  input.value='';
}

function purgeMe2n(){
  const n=Object.keys(ME2N).length;
  if(!n){toast('Base ME2N vacía','er');return;}
  if(!confirm('⚠️ ¿Eliminar toda la data ME2N ('+n+' contratos)?'))return;
  ME2N={};saveMe2n();updNav();renderMe2n();toast('ME2N vaciado','ok');
}

function buildPlantFilter(){
  const sel=document.getElementById('poPlant');if(!sel)return;
  const plants=new Set();
  for(const[oa,d]of Object.entries(ME2N)){d[2].forEach(p=>{if(p[2])plants.add(p[2]);});}
  const cur=sel.value;
  let h='<option value="">Todas las Plants</option>';
  [...plants].sort().forEach(p=>h+=`<option value="${p}">${plantLabel(p)}</option>`);
  sel.innerHTML=h;sel.value=cur;
}

function renderMe2n(){
  const box=document.getElementById('poBody');if(!box)return;
  const srch=(document.getElementById('poSrch')?.value||'').toLowerCase().trim();
  const fPlant=document.getElementById('poPlant')?.value||'';
  let rows=[];
  for(const[oa,d]of Object.entries(ME2N)){
    if(!oa||oa==='SIN_CTTO')continue;
    if(!d||!Array.isArray(d)||!Array.isArray(d[2]))continue; // Validar estructura
    const curr=d[1];
    for(const p of d[2])rows.push({oa,poNum:p[0],plant:p[2]||'',nov:p[3],still:p[4],curr});
  }
  if(srch) rows=rows.filter(r=>r.oa.includes(srch)||r.poNum.toLowerCase().includes(srch));
  if(fPlant) rows=rows.filter(r=>r.plant===fPlant);
  rows.sort((a,b)=>b.nov-a.nov);
  const totalAll=Object.values(ME2N).reduce((s,d)=>{
    if(!d||!Array.isArray(d)||!Array.isArray(d[2]))return s;
    return s+d[2].length;
  },0);
  document.getElementById('poLcnt').textContent=rows.length+'/'+totalAll;
  if(!rows.length){box.innerHTML=totalAll?'<div class="empty"><div class="ei">🔍</div><p>Sin resultados.</p></div>':'<div class="empty"><div class="ei">🛒</div><p>Sin datos ME2N. Subí un archivo Excel con la bajada de SAP.</p></div>';return;}
  let h='<div style="overflow-x:auto"><table><thead><tr><th>N° PO</th><th>N° Contrato</th><th>Net Order Value</th><th>Pend. Facturación</th><th>Mon.</th><th>Lugar</th></tr></thead><tbody>';
  for(const r of rows){const hasPend=r.still>0;const lugar=plantLabel(r.plant);h+=`<tr><td class="mono" style="font-size:11.5px;font-weight:700;color:var(--p700)">${esc(r.poNum)}</td><td class="mono" style="font-size:11.5px;font-weight:600;cursor:pointer;color:var(--p600);text-decoration:underline" onclick="verMe2nDet('${esc(r.oa)}')" title="Ver detalle contrato">${esc(r.oa)}</td><td class="mono" style="font-size:12px;font-weight:600">${fN(r.nov)}</td><td class="mono" style="font-size:12px">${hasPend?'<span class="bdg noinv">'+fN(r.still)+'</span>':'<span style="color:var(--g500)">—</span>'}</td><td style="font-size:12px;font-weight:600">${esc(r.curr)}</td><td style="font-size:11.5px;white-space:nowrap">${esc(lugar)}</td></tr>`;}
  h+='</tbody></table></div>';box.innerHTML=h;
}

function verMe2nDet(oa){poDetOA=oa;go('me2ndet');}

function renderMe2nDet(){
  const card=document.getElementById('poDetCard');if(!card)return;const d=ME2N[poDetOA];if(!d){go('me2n');return;}
  const vendor=d[0],curr=d[1],pos=d[2];const totalNOV=pos.reduce((s,p)=>s+p[3],0);const totalStill=pos.reduce((s,p)=>s+p[4],0);const totalPO=pos.length;const totalItems=pos.reduce((s,p)=>s+p[5],0);
  const byMonth={};pos.forEach(p=>{const m=p[1]||'Sin fecha';if(!byMonth[m])byMonth[m]={pos:[],total:0,still:0};byMonth[m].pos.push(p);byMonth[m].total+=p[3];byMonth[m].still+=p[4];});
  const months=Object.keys(byMonth).sort().reverse();const plants=[...new Set(pos.map(p=>p[2]).filter(Boolean))].sort();
  let monthsHTML='';months.forEach((m,mi)=>{const md=byMonth[m];const pct=totalNOV>0?(md.total/totalNOV*100):0;const label=m==='Sin fecha'?'Sin fecha':formatMonth(m);monthsHTML+=`<div class="po-month" onclick="togglePoMonth(${mi})"><div class="pm-h"><span class="pm-t">${label}</span><span class="pm-cnt">${md.pos.length} POs</span><span class="pm-v">${curr} ${fN(md.total)}</span></div><div class="pm-bar"><div class="pbar"><div class="fill green" style="width:${pct}%"></div></div></div></div><div class="po-lines" id="poM_${mi}"><div style="padding:6px 10px;display:grid;grid-template-columns:140px 1fr 140px 130px;gap:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--g500);border-bottom:1px solid var(--g200)"><span>N° PO</span><span>Lugar</span><span style="text-align:right">Net Order Value</span><span style="text-align:right">Pend. Facturación</span></div>`;md.pos.sort((a,b)=>b[3]-a[3]).forEach(p=>{monthsHTML+=`<div class="po-line" style="grid-template-columns:140px 1fr 140px 130px"><span class="po-num">${esc(p[0])}</span><span style="font-size:11px">${plantLabel(p[2])}</span><span class="mono" style="text-align:right;font-size:11px">${fN(p[3])}</span><span class="mono" style="text-align:right;font-size:11px">${p[4]>0?fN(p[4]):'—'}</span></div>`;});monthsHTML+='</div>';});
  card.innerHTML=`<div class="card"><div class="det-h"><div><h2>${esc(poDetOA)}</h2><div class="ds">${esc(vendor)} · ${curr}</div></div><div><span class="bdg blue" style="font-size:12px;padding:5px 14px">${plants.map(p=>plantLabel(p)).join(', ')}</span></div></div><div class="po-summ"><div class="po-sc"><div class="po-sl">Net Order Value Total</div><div class="po-sv">${curr} ${fN(totalNOV)}</div></div><div class="po-sc"><div class="po-sl">Pend. Facturación</div><div class="po-sv ${totalStill>0?'':'sm'}" style="${totalStill>0?'color:#92400e':''}">${totalStill>0?curr+' '+fN(totalStill):'—'}</div></div><div class="po-sc"><div class="po-sl">Purchase Orders</div><div class="po-sv">${totalPO}</div></div><div class="po-sc"><div class="po-sl">Líneas Totales</div><div class="po-sv">${totalItems}</div></div></div><div style="padding:16px 20px;border-bottom:1px solid var(--g200)"><span style="font-size:13px;font-weight:600;color:var(--p800)">Consumo Mensual</span><span style="font-size:11px;color:var(--g500);margin-left:8px">(clic para expandir)</span></div>${monthsHTML}</div>`;
}

function togglePoMonth(i){document.getElementById('poM_'+i)?.classList.toggle('open');}

function formatMonth(ym){
  const[y,m]=ym.split('-');
  const names=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return names[parseInt(m)-1]+' '+y;
}

// ═══════════ PO DASHBOARD ═══════════════════════════════
let _poAvgM=6;
function renderPoSection(cc){
  const d=ME2N[cc.num];
  if(!d||!d[2].length) return '<div class="section-box"><h3>🛒 Purchase Orders (SAP)</h3><div style="font-size:12.5px;color:var(--g500)">Sin POs en ME2N. Importá el Excel desde Purchase Orders.</div></div>';
  const cPos=d[2],curr=d[1]||cc.mon;const totNOV=cPos.reduce((s,p)=>s+p[3],0);const totTV=cc.monto+(cc.aves||[]).filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0)+(cc.aves||[]).filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);const rem=totTV-totNOV;const remMonths=monthsRemainingInclusive(ymToday(),cc.fechaFin);
  const byM={};cPos.forEach(p=>{const m=p[1]||'Sin fecha';if(!byM[m])byM[m]={pos:[],nov:0,still:0};byM[m].pos.push(p);byM[m].nov+=p[3];byM[m].still+=p[4];});
  const months=Object.keys(byM).filter(m=>m!=='Sin fecha').sort();const allM=[...months];if(byM['Sin fecha'])allM.push('Sin fecha');const recentMonths=months.slice(-Math.max(_poAvgM,1));const avg=recentMonths.length?recentMonths.reduce((s,m)=>s+byM[m].nov,0)/recentMonths.length:0;const maxN=Math.max(...allM.map(m=>byM[m]?.nov||0),1);
  let bars='';allM.forEach((m,mi)=>{const md=byM[m];const pct=maxN>0?(md.nov/maxN*100):0;const lbl=m==='Sin fecha'?'Sin fecha':formatMonth(m);const isZero=md.nov<=0.0001;bars+=`<div class="po-col" onclick="togglePOM(${mi})" title="${lbl}"><div class="po-col-top">${fN(md.nov)}</div><div class="po-col-chart"><div class="po-col-track"><div class="po-col-fill ${isZero?'zero':''}" style="height:${Math.max(pct,0)}%"></div></div></div><div class="po-col-lbl">${lbl}</div><div class="po-col-cnt">${md.pos.length} PO</div></div>`;});
  let details='';allM.forEach((m,mi)=>{const md=byM[m];const lbl=m==='Sin fecha'?'Sin fecha':formatMonth(m);details+=`<div class="po-mdet" id="pom_${mi}"><div class="po-mdet-title">${lbl} · ${md.pos.length} PO${md.pos.length!==1?'s':''} · ${curr} ${fN(md.nov)}</div><table class="enm-tbl" style="font-size:10.5px"><thead><tr><th>N° PO</th><th>Lugar</th><th style="text-align:right">Net Order Value</th><th style="text-align:right">Pend. Facturación</th></tr></thead><tbody>${md.pos.sort((a,b)=>b[3]-a[3]).map(p=>`<tr><td class="mono" style="font-weight:700;color:var(--p700)">${esc(p[0])}</td><td style="font-size:10px">${esc(plantLabel(p[2]))}</td><td class="mono" style="text-align:right">${fN(p[3])}</td><td class="mono" style="text-align:right">${p[4]>0?fN(p[4]):'—'}</td></tr>`).join('')}</tbody></table></div>`;});
  const byPl={};cPos.forEach(p=>{const pl=plantLabel(p[2])||'—';if(!byPl[pl])byPl[pl]=0;byPl[pl]+=p[3];});const plants=Object.entries(byPl).sort((a,b)=>b[1]-a[1]).map(([pl,v])=>`<div class="pl-row"><span class="pl-lbl" title="${esc(pl)}">${esc(pl)}</span><div class="pl-bar"><div class="pl-fill" style="width:${totNOV>0?(v/totNOV*100).toFixed(1):0}%"></div></div><span class="pl-pct">${totNOV>0?(v/totNOV*100).toFixed(1):'0.0'}%</span></div>`).join('');
  return `<div class="section-box"><h3>🛒 Purchase Orders — Dashboard SAP <span class="avg-ctl">Prom. últ. <input type="number" value="${_poAvgM}" min="1" max="24" onchange="_poAvgM=parseInt(this.value)||6;renderDet()" style="width:38px"> meses</span></h3><div class="po-kpi-bar"><div class="kc"><div class="kl">Total POs</div><div class="kv" style="color:var(--p700)">${cPos.length}</div></div><div class="kc"><div class="kl">Consumido SAP</div><div class="kv" style="color:var(--r500)">${curr} ${fN(totNOV)}</div></div><div class="kc"><div class="kl">Meses restantes</div><div class="kv" style="color:var(--p600)">${remMonths}</div></div><div class="kc"><div class="kl">Prom. mensual (últ.${_poAvgM}m)</div><div class="kv" style="color:var(--p600)">${curr} ${fN(avg)}</div></div></div><div class="po-dashboard-grid"><div class="po-bars"><div style="font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Consumo mensual ▸ horizontal · clic para ver POs</div><div class="po-timeline-scroll"><div class="po-timeline">${bars}</div></div>${details}</div><div class="po-plants"><div style="font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Por Lugar</div>${plants}${avg>0?`<div style="margin-top:12px;padding:8px;background:var(--p50);border-radius:6px;font-size:11px;color:var(--p700)"><strong>Proyección:</strong> ~${Math.round(rem/avg)} meses al ritmo actual</div>`:''}</div></div></div>`;
}
function togglePOM(i){document.getElementById('pom_'+i)?.classList.toggle('open');}

function isNumericCol(tar,ci){
  const col=(tar.cols[ci]||'').toLowerCase();
  if(/valor|precio|unitario|monto|tarifa|importe|cost|rate/.test(col))return true;
  let n=0,t=0;tar.rows.forEach(r=>{const v=r[ci];if(v!==''&&v!=null){t++;if(!isNaN(parseFloat(v))&&String(v).trim()!=='')n++;}});
  return t>2&&n/t>0.7;
}
function getApplicableTariffs(cc,period){
  if(!cc.tarifarios||!cc.tarifarios.length)return[];
  const periods=[...new Set(cc.tarifarios.filter(t=>t.period&&t.period<=period).map(t=>t.period))].sort();
  if(periods.length){const best=periods[periods.length-1];return cc.tarifarios.filter(t=>t.period===best);}
  const base=cc.tarifarios.filter(t=>!t.period);
  return base.length?base:(cc.tarifarios.length?cc.tarifarios:[]);
}

// ═══════════ AMENDMENT LOGIC ════════════════════════════
// Devuelve TODOS los conceptos tildados en el form de "+ Nueva Enmienda"
// (podés combinar varios, ej. EXTENSION + ACTUALIZACION_TARIFAS a la vez).
function getEnmTiposSeleccionados(){
  return Array.from(document.querySelectorAll('.ne_tipo_cb:checked')).map(cb=>cb.value);
}
function onEnmTipoChange(){
  const tipos=getEnmTiposSeleccionados();
  const textTipos=tipos.filter(t=>['SCOPE','CLAUSULAS','OTRO'].includes(t));
  // Cada sub-bloque se muestra/oculta según SI ESTÁ tildado su concepto — ya
  // no son mutuamente excluyentes, pueden estar varios visibles a la vez.
  document.getElementById('enm_ext').style.display=tipos.includes('EXTENSION')?'':'none';
  document.getElementById('enm_mot_grp').style.display=textTipos.length?'':'none';
  document.getElementById('enm_poly').style.display=tipos.includes('ACTUALIZACION_TARIFAS')?'':'none';
  const scopeSub=document.getElementById('enm_scope_sub');
  if(scopeSub) scopeSub.style.display=tipos.includes('SCOPE')?'':'none';
  const otroSub=document.getElementById('enm_otro_sub');
  if(otroSub) otroSub.style.display=tipos.includes('OTRO')?'':'none';
  if(textTipos.length){
    const lbl={'SCOPE':'🔧 alcance','CLAUSULAS':'📋 cláusulas','OTRO':'💬 otro'};
    const lblEl=document.getElementById('enm_mot_lbl');
    if(lblEl) lblEl.textContent=textTipos.length>1?('Descripción ('+textTipos.map(t=>lbl[t]).join(' + ')+') *'):({'SCOPE':'🔧 Descripción del cambio de alcance *','CLAUSULAS':'📋 Texto de la/s cláusula/s a incorporar *','OTRO':'💬 Descripción *'}[textTipos[0]]);
  }
  if(tipos.includes('ACTUALIZACION_TARIFAS'))initTramos();
  if(tipos.includes('SCOPE'))renderScopeTablaOptions();
}

// ── Editor de texto enriquecido (negrita + incisos) para Cláusulas/Scope/Otro ──
let _rteInit=false;
function rteSetup(){
  if(_rteInit)return; _rteInit=true;
  try{ document.execCommand('defaultParagraphSeparator', false, 'p'); }catch(e){}
}
function rteExec(id,cmd){
  rteSetup();
  const el=document.getElementById(id); if(!el)return;
  el.focus();
  document.execCommand(cmd,false,null);
}
// Whitelist de tags — lo que entra acá termina insertado tal cual (sin escapar) en el Word/HTML
// generado, así que se limita a lo que el toolbar puede producir (negrita, incisos, párrafos).
function sanitizeRichText(html){
  const allowed={B:1,STRONG:1,I:1,EM:1,U:1,OL:1,UL:1,LI:1,BR:1,P:1,DIV:1};
  const tmp=document.createElement('div');
  tmp.innerHTML=html||'';
  (function walk(node){
    Array.from(node.childNodes).forEach(child=>{
      if(child.nodeType===1){
        if(!allowed[child.tagName]){
          while(child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
        } else {
          Array.from(child.attributes).forEach(a=>child.removeAttribute(a.name));
          walk(child);
        }
      } else if(child.nodeType!==3){
        node.removeChild(child); // comentarios, etc.
      }
    });
  })(tmp);
  return tmp.innerHTML;
}

// ── Alcance (SCOPE): agregar/quitar items del tarifario dentro de la misma enmienda ──
let _neScopeNuevos=[]; // items nuevos a agregar (in-memory mientras el panel está abierto)
function scopeTablasDisponibles(cc, asOfPeriod){
  // Agrupa por GENERACIÓN (mismo período = misma tanda de tablas guardada junta, igual que
  // las pestañas "Base contractual" / "Enm.N°X" de Listas de Precios), no por nombre de tabla:
  // el nombre puede cambiar de una generación a otra (ej. "TARIFARIO" en la base pasa a
  // llamarse "TARIFARIO FINAL (Enm.N)" en las actualizaciones posteriores) y agrupar por
  // nombre partía en dos lo que en realidad es un solo tarifario que evoluciona en el tiempo.
  // Se toma la generación (período) más alta que no supere asOfPeriod — o la más reciente en
  // general si no se pasa período — y se listan TODAS las tablas de esa generación (puede
  // haber más de una, ej. "Mano de Obra" + "Equipos" en el mismo período).
  const tars=cc.tarifarios||[];
  let bestPeriod=null;
  tars.forEach(t=>{
    const per=String(t.period||'');
    if(!per)return;
    if(asOfPeriod && per>String(asOfPeriod))return;
    if(bestPeriod===null||per>bestPeriod)bestPeriod=per;
  });
  if(bestPeriod===null)return [];
  return tars.filter(t=>String(t.period||'')===bestPeriod).map((t,i)=>({name:t.name||('Tabla '+(i+1)), idx:i, table:t}));
}
function scopeTablaActual(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return null;
  const sel=document.getElementById('ne_scope_tabla');
  const idx=sel&&sel.value!==''?parseInt(sel.value):NaN;
  if(isNaN(idx))return null;
  const asOf=(document.getElementById('ne_scope_periodo')?.value||'').trim();
  const opts=scopeTablasDisponibles(cc, asOf||null);
  const found=opts[idx];
  return found?found.table:null;
}
function renderScopeTablaOptions(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const sel=document.getElementById('ne_scope_tabla');if(!sel)return;
  const asOf=(document.getElementById('ne_scope_periodo')?.value||'').trim();
  const opts=scopeTablasDisponibles(cc, asOf||null);
  sel.innerHTML=opts.length?opts.map((o,i)=>'<option value="'+i+'">'+esc(o.name)+'</option>').join(''):'<option value="">— sin tablas vigentes a ese período —</option>';
  onScopeTablaChange();
  onScopeTipoChange();
}
function onScopeTablaChange(){
  _neScopeNuevos=[];
  renderScopeQuitarList();
  renderScopeNuevosItems();
}
// Menor scope => solo tiene sentido QUITAR items; Mayor scope => solo AGREGAR. Nunca las dos
// secciones a la vez, para que no se pueda cargar por error una mezcla contradictoria.
function onScopeTipoChange(){
  const tipo=document.getElementById('ne_scope_tipo')?.value||'MAYOR';
  const quitarBlock=document.getElementById('ne_scope_quitar_block');
  const nuevosBlock=document.getElementById('ne_scope_nuevos_block');
  if(quitarBlock)quitarBlock.style.display=(tipo==='MENOR')?'':'none';
  if(nuevosBlock)nuevosBlock.style.display=(tipo==='MAYOR')?'':'none';
}
function scopeTablaPriceIdx(tab){
  const cols=tab?(tab.cols||[]):[];
  let i=cols.findIndex(c=>/precio|valor\s*unitario|tarifa|importe|mensual/i.test(String(c||'')));
  return i<0?cols.length-1:i;
}
function renderScopeQuitarList(){
  const wrap=document.getElementById('ne_scope_quitar_wrap');if(!wrap)return;
  const tab=scopeTablaActual();
  if(!tab||!(tab.rows||[]).length){ wrap.innerHTML='<div style="font-size:11.5px;color:var(--g500);font-style:italic;padding:8px 0">Sin items cargados en este tarifario.</div>'; return; }
  // Muestra la versión del tarifario vigente al "Período de aplicación" elegido (la de period
  // más alto que no lo supere) — aclarar de qué período es, para que quede claro con qué
  // precios se está decidiendo qué sacar (puede no ser la más nueva que existe en el contrato).
  const asOf=(document.getElementById('ne_scope_periodo')?.value||'').trim();
  const perLbl=tab.period?('<div style="font-size:10.5px;color:#b91c1c;font-weight:600;margin-bottom:6px">📅 Tarifario vigente desde '+esc(formatMonth(tab.period))+(asOf?(' — es la versión aplicable al período elegido ('+esc(formatMonth(asOf))+')'):'')+'</div>'):'';
  // Detalle de diagnóstico: todas las generaciones (períodos) del tarifario que existen en el
  // contrato, con las tablas de cada una — para confirmar a ojo cuál se está usando y por qué.
  const cc0=window.DB.find(x=>x.id===window.detId);
  const byPeriod={};
  (cc0?.tarifarios||[]).forEach(t=>{
    const per=String(t.period||'(sin período)');
    (byPeriod[per]=byPeriod[per]||[]).push(t);
  });
  const periods=Object.keys(byPeriod).sort();
  const versionsDbg=periods.length>1?('<details style="margin-bottom:8px"><summary style="font-size:10px;color:var(--g500);cursor:pointer">🔍 Ver las '+periods.length+' generaciones de tarifario disponibles</summary>'
    +'<div style="font-size:10.5px;color:var(--g600c);margin-top:4px;padding-left:10px">'
    +periods.map(per=>{
      const isActive=(per===String(tab.period||''));
      const names=byPeriod[per].map(t=>esc(t.name||'Tabla')+(t.enmNum?(' (Enm.'+t.enmNum+')'):'')).join(', ');
      return '<div>· '+esc(per)+': '+names+(isActive?' <strong>← generación mostrada acá</strong>':'')+'</div>';
    }).join('')
    +'</div></details>'):'';
  const priceIdx=scopeTablaPriceIdx(tab);
  wrap.innerHTML=perLbl+versionsDbg+tab.rows.map((row,i)=>{
    // Primer valor no-precio = título de la fila (código/nombre del item); el resto,
    // detalle secundario más chico — evita mostrar todo pegado en una sola línea plana.
    const parts=row.filter((_,ci)=>ci!==priceIdx).map(v=>String(v==null?'':v).trim()).filter(Boolean);
    const main=esc(parts[0]||('Item '+(i+1)));
    const sub=esc(parts.slice(1).join(' · '));
    const priceNum=parseFloat(row[priceIdx]);
    const priceTxt=isFinite(priceNum)?('$ '+fN(priceNum)):'—';
    return '<label class="scope-item-row"><input type="checkbox" class="ne_scope_quitar_cb" value="'+i+'">'
      +'<div class="sir-main"><div class="sir-title">'+main+'</div>'+(sub?'<div class="sir-sub">'+sub+'</div>':'')+'</div>'
      +'<div class="sir-price">'+priceTxt+'</div>'
    +'</label>';
  }).join('');
}
function addScopeNuevoItem(){
  const tab=scopeTablaActual();
  const cols=tab?(tab.cols||[]):['ITEM','DESCRIPCION','UNIDAD','PRECIO'];
  _neScopeNuevos.push(cols.map(()=>''));
  renderScopeNuevosItems();
}
function removeScopeNuevoItem(idx){
  _neScopeNuevos.splice(idx,1);
  renderScopeNuevosItems();
}
function updScopeNuevoItem(idx,ci,val){
  if(_neScopeNuevos[idx]) _neScopeNuevos[idx][ci]=val;
}
function renderScopeNuevosItems(){
  const wrap=document.getElementById('ne_scope_nuevos_wrap');if(!wrap)return;
  const tab=scopeTablaActual();
  const cols=tab?(tab.cols||[]):['ITEM','DESCRIPCION','UNIDAD','PRECIO'];
  if(!_neScopeNuevos.length){ wrap.innerHTML='<div style="font-size:11.5px;color:var(--g500);font-style:italic;padding:8px 0">Sin items nuevos agregados.</div>'; return; }
  wrap.innerHTML=_neScopeNuevos.map((row,ri)=>{
    const inputs=cols.map((col,ci)=>'<div style="flex:1;min-width:100px"><div style="font-size:9.5px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px">'+esc(col||'—')+'</div><input type="text" value="'+esc(row[ci]||'')+'" oninput="updScopeNuevoItem('+ri+','+ci+',this.value)" style="width:100%"></div>').join('');
    return '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;background:#f0fdf4;border:1px solid #bbf7d0;padding:8px 10px;border-radius:8px">'+inputs+'<button type="button" class="btn btn-d btn-sm" onclick="removeScopeNuevoItem('+ri+')" style="padding:5px 9px">✕</button></div>';
  }).join('');
}
function onCorrToggle(){
  const on=document.getElementById('ne_isCorr').checked;
  document.getElementById('ne_isCorr_l').textContent=on?'Sí':'No';
  document.getElementById('ne_corrGrp').style.display=on?'':'none';
  calcAveSugAll();
}
function prefillCorrEnm(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const num=parseInt(document.getElementById('ne_corrEnm')?.value);
  const enm=cc.enmiendas?.find(e=>e.num===num);
  if(!enm)return;
  const tramosData=(Array.isArray(enm.tramos)&&enm.tramos.length)?enm.tramos:[{basePeriodo:enm.basePeriodo,nuevoPeriodo:enm.nuevoPeriodo,polyTerms:enm.polyTerms}];
  _neTramoIds=tramosData.map((_,i)=>i);
  _neTramoSeq=tramosData.length;
  // Al corregir una enmienda ya guardada se respetan sus valores tal cual quedaron
  // (modo manual por término); el usuario puede volver a modo automático con 🔒/✏️.
  window._neTermManual={};
  const polyLen=(cc.poly||[]).filter(p=>p.idx).length;
  tramosData.forEach((_,tramoIdx)=>{ for(let j=0;j<polyLen;j++) window._neTermManual[tramoIdx+'_'+j]=true; });
  renderTramosWrap();
  tramosData.forEach((t,i)=>{
    const bp=document.getElementById('ne_basePer_'+i);if(bp&&t.basePeriodo)bp.value=t.basePeriodo;
    const np=document.getElementById('ne_newPer_'+i);if(np&&t.nuevoPeriodo)np.value=t.nuevoPeriodo;
    buildPolyFormTramo(i,t);
  });
  calcAveSugAll();
}

// ═══════════ MÚLTIPLES PERÍODOS (TRAMOS) DENTRO DE UNA MISMA ENMIENDA ═══
// Cada tramo define su propio [período base → nuevo período] + % por índice, y se
// aplican en cadena: el tramo N usa como tarifa/monto de partida el resultado del
// tramo N-1 (no el tarifario original). Ver getCurrentMonthlyRate/computeTramoChain.
let _neTramoIds=[0];
let _neTramoSeq=1;
function initTramos(){
  _neTramoIds=[0];
  _neTramoSeq=1;
  window._neTermManual={};
  renderTramosWrap();
}
function addTramoPeriodo(){
  const lastId=_neTramoIds[_neTramoIds.length-1];
  const lastNewPer=gv('ne_newPer_'+lastId)||'';
  const newId=_neTramoSeq++;
  _neTramoIds.push(newId);
  renderTramosWrap();
  const baseEl=document.getElementById('ne_basePer_'+newId);
  if(baseEl&&lastNewPer){baseEl.value=lastNewPer;baseEl.dataset.autoChained='1';}
  buildPolyFormTramo(newId);
  calcAveSugAll();
}
function removeTramoPeriodo(tramoId){
  if(_neTramoIds.length<=1)return;
  _neTramoIds=_neTramoIds.filter(id=>id!==tramoId);
  renderTramosWrap();
  calcAveSugAll();
}
function onTramoBaseChange(tramoId){
  const el=document.getElementById('ne_basePer_'+tramoId);
  if(el)el.dataset.autoChained='0';
  buildPolyFormTramo(tramoId);
  calcAveSugAll();
}
function onTramoNewPerChange(tramoId){
  const newVal=gv('ne_newPer_'+tramoId)||'';
  const idx=_neTramoIds.indexOf(tramoId);
  if(idx>=0&&idx+1<_neTramoIds.length){
    const nextId=_neTramoIds[idx+1];
    const nextBaseEl=document.getElementById('ne_basePer_'+nextId);
    if(nextBaseEl&&(!nextBaseEl.value||nextBaseEl.dataset.autoChained==='1')){
      nextBaseEl.value=newVal;
      nextBaseEl.dataset.autoChained='1';
      buildPolyFormTramo(nextId);
    }
  }
  // Autocompletar "Nueva Base" de cada índice auto-calculable de este tramo con el mismo
  // "Nuevo Período" recién cargado, para que el % automático se dispare solo sin que el
  // usuario tenga que re-tipear el mismo mes índice por índice. Si ya lo había tocado a
  // mano (ver onTermNuevaBaseChange), no se lo pisamos.
  const cc=window.DB.find(x=>x.id===window.detId);
  const poly=(cc?.poly||[]).filter(p=>p.idx);
  poly.forEach((t,i)=>{
    if(!idxIsAutoCalc(t.idx))return;
    const nbEl=document.getElementById('ne_nb_'+tramoId+'_'+i);
    if(nbEl&&(!nbEl.value||nbEl.dataset.autoFilled==='1')){
      nbEl.value=newVal;
      nbEl.dataset.autoFilled='1';
      recalcTermAuto(tramoId,i);
    }
  });
  calcAveSugAll();
}
function tramoBlockHtml(cc,tramoId,isFirst){
  const defaultBase=isFirst?(cc.btar||''):'';
  return `<div class="enm-tramo" id="ne_tramo_${tramoId}" style="border:1px solid var(--p200);border-radius:8px;padding:12px;margin-bottom:12px;background:var(--p50)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:var(--p800);text-transform:uppercase">📐 Período de ajuste ${isFirst?'':'#'+(_neTramoIds.indexOf(tramoId)+1)}</div>
      ${isFirst?'':`<button class="btn btn-d btn-sm" onclick="removeTramoPeriodo(${tramoId})" title="Quitar este período">🗑</button>`}
    </div>
    <div class="fg2">
      <div class="fgrp"><label>Período base (tarifario origen)</label><input type="month" id="ne_basePer_${tramoId}" value="${defaultBase}" onchange="onTramoBaseChange(${tramoId})"></div>
      <div class="fgrp"><label>Nuevo período <span class="req">*</span></label><input type="month" id="ne_newPer_${tramoId}" onchange="onTramoNewPerChange(${tramoId})"></div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--p700);margin:10px 0 6px">Términos de la fórmula polinómica:</div>
    <div id="ne_polyTerms_${tramoId}"></div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:10px;padding:10px 14px;background:var(--p100);border-radius:6px">
      <span style="font-size:12px;font-weight:600;color:var(--p800)">% Polinómico de este período:</span>
      <span id="ne_pctRes_${tramoId}" style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;color:var(--p700)">0%</span>
      <button class="btn btn-s btn-sm" onclick="previewPolyTarTramo(${tramoId})">👁 Preview tarifario</button>
    </div>
    <div id="ne_tarPrev_${tramoId}"></div>
  </div>`;
}
function renderTramosWrap(){
  const wrap=document.getElementById('ne_tramosWrap');if(!wrap)return;
  const cc=window.DB.find(x=>x.id===window.detId)||{};
  wrap.innerHTML=_neTramoIds.map((id,idx)=>tramoBlockHtml(cc,id,idx===0)).join('');
  _neTramoIds.forEach(id=>buildPolyFormTramo(id));
}
// ── % Acumulado automático por índice ───────────────────────────────────
// Todos los índices, incluida "Mano de Obra" (CCT), toman su % acumulado
// directo del Master de Índices cuando hay datos cargados para el período.
// Si el CCT en cuestión no tiene datos cargados (frecuente: se cargan a mano
// tras cada paritaria), recalcTermAuto cae solo a edición manual ("sin
// datos"). El usuario puede forzar tipeo manual en cualquier término con el
// botón 🔒/✏️.
window._neTermManual=window._neTermManual||{};
function idxIsAutoCalc(label){
  if(!label||typeof IDX==='undefined')return false;
  const l=String(label).trim();
  // Lista blanca real: solo etiquetas que existen en algún catálogo de Índices (antes
  // cualquier texto no listado se trataba como "automático" por descarte, incluyendo
  // índices inexistentes/typos — mostraban el candado 🔒 como si el sistema fuera a
  // calcularlos solo, en vez de caer directo a manual).
  return Object.keys(IDX).some(cat=>(IDX[cat]||[]).indexOf(l)>=0);
}
function _neCorrExcludeNum(){
  const isCorr=document.getElementById('ne_isCorr')?.checked;
  return isCorr?(parseInt(document.getElementById('ne_corrEnm')?.value)||null):null;
}
// Base desde la que se acumula: la "Nueva Base" del mismo índice en el tramo
// anterior de esta misma enmienda (si están encadenados), o si no, la última
// "Nueva Base" guardada para ese índice en el historial de enmiendas, o si
// nunca se actualizó, la base original definida al armar la fórmula.
function getAutoFromBaseTerm(cc,tramoId,i,idxLabel,excludeNum){
  const pos=_neTramoIds.indexOf(tramoId);
  if(pos>0){
    const prevId=_neTramoIds[pos-1];
    const basePer=document.getElementById('ne_basePer_'+tramoId)?.value||'';
    const prevNewPer=document.getElementById('ne_newPer_'+prevId)?.value||'';
    if(basePer&&basePer===prevNewPer){
      const prevNb=document.getElementById('ne_nb_'+prevId+'_'+i)?.value||'';
      if(prevNb)return prevNb;
    }
  }
  let lastBase='',lastPer='';
  (cc.enmiendas||[]).filter(e=>enmHasTipo(e,'ACTUALIZACION_TARIFAS')&&!e.superseded&&(excludeNum==null||e.num!==excludeNum)).forEach(e=>{
    const tramosArr=(Array.isArray(e.tramos)&&e.tramos.length)?e.tramos:[{nuevoPeriodo:e.nuevoPeriodo,polyTerms:e.polyTerms}];
    tramosArr.forEach(tr=>{
      const term=(tr.polyTerms||[]).find(pt=>pt.idx===idxLabel);
      const per=String(tr.nuevoPeriodo||'');
      if(term&&term.nuevaBase&&per&&(!lastPer||per>=lastPer)){lastBase=term.nuevaBase;lastPer=per;}
    });
  });
  if(lastBase)return lastBase;
  const polyDef=(cc.poly||[]).find(p=>p.idx===idxLabel);
  return polyDef?.base||'';
}
// Lee directo de IDX_STORE vía safeIdxRows (mismo patrón que calculateUpdate en
// 07-polynomial.js) en vez de la caché indicator_snapshots — así siempre ve el último
// período cargado en el Master de Índices, sin depender de cuándo se sembró la caché.
function computeAutoPctForIdx(idxLabel,fromYm,toYm){
  if(!idxLabel||!fromYm||!toYm)return null;
  if(typeof compareYm==='function'&&compareYm(toYm,fromYm)<=0)return null;
  if(typeof safeIdxRows!=='function')return null;
  try{
    const rows=safeIdxRows(idxLabel);
    if(!rows.length)return null;
    // needsReview: dato auto-obtenido que no pasó las validaciones de plausibilidad
    // (05-indices.js validateIdxRow) — nunca debe usarse solo para un cálculo de AVE.
    const monthRows=rows.filter(r=>r.ym&&compareYm(r.ym,fromYm)>0&&compareYm(r.ym,toYm)<=0&&r.pct!=null&&isFinite(Number(r.pct))&&!r.needsReview);
    if(monthRows.length){
      let acc=1;
      monthRows.forEach(r=>{acc*=1+(Number(r.pct)/100);});
      return (acc-1)*100;
    }
    // Fallback: ratio de valores absolutos (USD, gasoil, o cualquier índice sin % mensual cargado).
    // eRow debe ser estrictamente posterior a fromYm: si el índice no tiene ningún dato más
    // nuevo que la base, bRow y eRow terminarían siendo la misma fila y el ratio daría 0%
    // (parecería "sin cambios" en vez de "sin datos" — exactamente el caso de un índice
    // desactualizado, que debe devolver null para que el formulario avise, no que calle un 0).
    const bRow=rows.filter(r=>r.ym&&compareYm(r.ym,fromYm)<=0&&r.value!=null&&Number(r.value)>0&&!r.needsReview).sort((a,b)=>b.ym.localeCompare(a.ym))[0];
    const eRow=rows.filter(r=>r.ym&&compareYm(r.ym,toYm)<=0&&compareYm(r.ym,fromYm)>0&&r.value!=null&&Number(r.value)>0&&!r.needsReview).sort((a,b)=>b.ym.localeCompare(a.ym))[0];
    if(bRow&&eRow&&Number(bRow.value)>0)return ((Number(eRow.value)/Number(bRow.value))-1)*100;
    return null;
  }catch(e){console.warn('computeAutoPctForIdx',e);return null;}
}
function toggleTermManual(tramoId,i){
  const key=tramoId+'_'+i;
  window._neTermManual[key]=!window._neTermManual[key];
  recalcTermAuto(tramoId,i);
  calcAveSugAll();
}
function onTermNuevaBaseChange(tramoId,i){
  const nbEl=document.getElementById('ne_nb_'+tramoId+'_'+i);
  if(nbEl)delete nbEl.dataset.autoFilled;
  recalcTermAuto(tramoId,i);
  calcAveSugAll();
}
function onObraAdvChange(){
  const el=document.getElementById('ne_obraAdv');
  if(el)delete el.dataset.autoFilled;
  calcAveSugAll();
}
// Recalcula (o desbloquea) el término i del tramo dado sin re-renderizar toda
// la fila, así no se pierden los valores ya tipeados en los demás términos.
function recalcTermAuto(tramoId,i){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const poly=(cc.poly||[]).filter(p=>p.idx);
  const t=poly[i];if(!t)return;
  const autoEligible=idxIsAutoCalc(t.idx);
  const key=tramoId+'_'+i;
  const manualOverride=!!window._neTermManual[key];
  const acumEl=document.getElementById('ne_acum_'+tramoId+'_'+i);
  const nbEl=document.getElementById('ne_nb_'+tramoId+'_'+i);
  const btnEl=document.getElementById('ne_tgl_'+tramoId+'_'+i);
  const hintEl=document.getElementById('ne_hint_'+tramoId+'_'+i);
  const fromEl=document.getElementById('ne_from_'+tramoId+'_'+i);
  if(!acumEl||!autoEligible)return;
  const fromBase=getAutoFromBaseTerm(cc,tramoId,i,t.idx,_neCorrExcludeNum());
  if(fromEl)fromEl.textContent='Base ant.: '+(fromBase?(typeof formatYmLabel==='function'?formatYmLabel(fromBase):fromBase):'—');
  const pb=nbEl?.value||'';
  let autoOk=false,pa=null;
  if(!manualOverride&&pb){
    const v=computeAutoPctForIdx(t.idx,fromBase,pb);
    if(v!=null){pa=v;autoOk=true;}
  }
  const locked=!manualOverride&&autoOk;
  if(locked){
    acumEl.value=pa.toFixed(2);
    acumEl.readOnly=true;
    acumEl.style.background='var(--g50)';acumEl.style.color='var(--p700)';acumEl.style.fontWeight='700';
  } else {
    acumEl.readOnly=false;
    acumEl.style.background='';acumEl.style.color='';acumEl.style.fontWeight='';
    if(!manualOverride)acumEl.value='';
  }
  if(btnEl){
    btnEl.textContent=manualOverride?'✏️':'🔒';
    btnEl.style.background=manualOverride?'var(--p100)':'var(--g50)';
    btnEl.title=manualOverride?'Volver a cálculo automático':'Editar % manualmente';
  }
  const statusEl=document.getElementById('ne_status_'+tramoId+'_'+i);
  if(statusEl){
    if(manualOverride){statusEl.textContent='✏️ Manual';statusEl.style.color='var(--p700)';}
    else if(locked){statusEl.textContent='🔒 Automático';statusEl.style.color='var(--g500)';}
    else{statusEl.textContent='✏️ Manual (sin datos)';statusEl.style.color='#b45309';}
  }
  if(hintEl){
    if(!manualOverride&&pb&&!autoOk){hintEl.style.display='block';hintEl.textContent='⚠ Sin datos automáticos para este período — completá manualmente.';}
    else hintEl.style.display='none';
  }
  const justWrapEl=document.getElementById('ne_justwrap_'+tramoId+'_'+i);
  if(justWrapEl)justWrapEl.style.display=locked?'none':'block';
}
function buildPolyFormTramo(tramoId,prefill){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const poly=(cc.poly||[]).filter(p=>p.idx);
  const box=document.getElementById('ne_polyTerms_'+tramoId);if(!box)return;
  const basePer=gv('ne_basePer_'+tramoId)||cc.btar||'';
  if(!poly.length){box.innerHTML='<div class="info-box amber">Sin fórmula polinómica. Editá el contrato para cargar los índices.</div>';return;}
  let h='<div style="display:grid;grid-template-columns:22px 1.4fr 68px 80px 132px 100px;gap:6px;padding:3px 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--g500);margin-bottom:3px"><span></span><span>Índice</span><span style="text-align:center">Incid.</span><span style="text-align:center">Inc×%</span><span>% Acumulado</span><span>Nueva Base</span></div>';
  poly.forEach((t,i)=>{
    const autoEligible=idxIsAutoCalc(t.idx);
    const pa=prefill?.polyTerms?.[i]?.pctAcum||'';
    const pbPrefill=prefill?.polyTerms?.[i]?.nuevaBase;
    const pb=pbPrefill!=null?pbPrefill:(autoEligible?'':(t.base||''));
    const justPrefill=prefill?.polyTerms?.[i]?.justificacion||'';
    h+=`<div class="pup-row">
      <div style="width:20px;height:20px;border-radius:50%;background:var(--p200);color:var(--p800);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${i+1}</div>
      <div>
        <input type="text" value="${esc(t.idx)}" disabled style="font-size:12px;border-color:var(--g200);width:100%">
        ${autoEligible?`<div id="ne_from_${tramoId}_${i}" style="font-size:11px;color:var(--g500);margin-top:2px">Base ant.: —</div>`:''}
      </div>
      <input type="text" value="${t.inc}" disabled style="font-size:12px;text-align:center;border-color:var(--g200)">
      <input type="text" id="ne_ip_${tramoId}_${i}" value="0%" disabled style="font-size:12px;text-align:center;font-weight:700;color:var(--g600);border-color:var(--g200)">
      <div>
        <div style="display:flex;align-items:center;gap:3px">
          <input type="number" id="ne_acum_${tramoId}_${i}" step="0.01" placeholder="%" value="${esc(pa)}" oninput="calcAveSugAll()" style="flex:1;min-width:0;font-size:12px">
          ${autoEligible?`<button type="button" id="ne_tgl_${tramoId}_${i}" onclick="toggleTermManual(${tramoId},${i})" title="Editar % manualmente" style="flex-shrink:0;width:22px;height:22px;border-radius:5px;border:1px solid var(--g300);background:var(--g50);cursor:pointer;font-size:11px;line-height:1;padding:0">🔒</button>`:''}
        </div>
        ${autoEligible?`<div id="ne_status_${tramoId}_${i}" style="font-size:10.5px;font-weight:700;margin-top:2px">🔒 Automático</div>`:''}
        <div id="ne_hint_${tramoId}_${i}" style="display:none;font-size:11px;color:#b45309;margin-top:2px"></div>
      </div>
      <input type="month" id="ne_nb_${tramoId}_${i}" value="${esc(pb)}" onchange="onTermNuevaBaseChange(${tramoId},${i})" style="font-size:12px">
    </div>
    <div id="ne_justwrap_${tramoId}_${i}" style="display:${autoEligible?'none':'block'};margin:-2px 0 6px 28px">
      <input type="text" id="ne_just_${tramoId}_${i}" placeholder="📝 Justificación del valor manual (opcional) — ej: ajuste sobre período anterior" value="${esc(justPrefill)}" style="font-size:11.5px;padding:5px 8px;width:100%;max-width:540px;border:1px dashed var(--g300);background:var(--g50)">
    </div>`;
  });
  const idx=_neTramoIds.indexOf(tramoId);
  const chainedFromPrev=idx>0&&basePer&&basePer===(gv('ne_newPer_'+_neTramoIds[idx-1])||'');
  if(chainedFromPrev){
    h+=`<div class="info-box blue" style="margin-top:6px;font-size:11px">Se aplicará sobre el tarifario resultante del período anterior de esta misma enmienda.</div>`;
  } else {
    const baseTars=getApplicableTariffs(cc,basePer);
    if(baseTars.length){const names=baseTars.map(t=>'"'+t.name+'"').join(', ');h+=`<div class="info-box blue" style="margin-top:6px;font-size:11px">Se actualizarán <strong>${baseTars.length} tabla${baseTars.length>1?'s':''}</strong>: ${esc(names)}. Nueva tarifa = tarifa_base × (1 + % polinómico).</div>`;}
    else h+=`<div class="info-box amber" style="margin-top:6px;font-size:11px">Sin tarifario para el período base seleccionado.</div>`;
  }
  box.innerHTML=h;
  poly.forEach((t,i)=>{ if(idxIsAutoCalc(t.idx)) recalcTermAuto(tramoId,i); });
}
function calcPolyTramo(tramoId){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return 0;
  const poly=(cc.poly||[]).filter(p=>p.idx);
  let pct=0;
  poly.forEach((t,i)=>{
    const a=parseFloat(document.getElementById('ne_acum_'+tramoId+'_'+i)?.value)||0;
    const contrib=t.inc*(a/100);pct+=contrib;
    const el=document.getElementById('ne_ip_'+tramoId+'_'+i);
    if(el)el.value=(contrib*100).toFixed(3)+'%';
  });
  const el=document.getElementById('ne_pctRes_'+tramoId);
  if(el){el.textContent=(pct*100).toFixed(4)+'%';el.style.color=pct>0?'var(--g600)':'var(--r500)';}
  return pct;
}
// Tasa mensual vigente: parte de montoBase/plazo y va componiendo (1+pct) de cada
// tramo ya guardado, en orden cronológico — así el % de una actualización se aplica
// sobre la tarifa REAL vigente al momento, no sobre un promedio de todo el contrato.
function getCurrentMonthlyRate(cc,excludeNum){
  const totalMeses=Math.max(cc.plazo_meses||cc.plazo||monthDiffInclusive(cc.fechaIni,cc.fechaFin)||1,1);
  const avePolyPrev=(cc.aves||[]).filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
  const aveOwnerPrev=(cc.aves||[]).filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const montoBase=cc.montoBase||cc._montoOriginal||((cc.monto||0)-avePolyPrev-aveOwnerPrev);
  let rate=montoBase/totalMeses;
  const tramos=[];
  (cc.enmiendas||[]).filter(e=>enmHasTipo(e,'ACTUALIZACION_TARIFAS')&&!e.superseded&&e.num!==excludeNum).forEach(e=>{
    if(Array.isArray(e.tramos)&&e.tramos.length) e.tramos.forEach(t=>tramos.push(t));
    else if(e.nuevoPeriodo) tramos.push({nuevoPeriodo:e.nuevoPeriodo,pctPoli:e.pctPoli});
  });
  tramos.sort((a,b)=>String(a.nuevoPeriodo||'').localeCompare(String(b.nuevoPeriodo||'')));
  tramos.forEach(t=>{ rate=rate*(1+(t.pctPoli||0)); });
  return rate;
}
// Calcula, en cadena, cada tramo definido en el formulario: % propio, tarifario
// resultante (encadenado con el tramo anterior si corresponde) y AVE = delta de
// tarifa mensual × meses remanentes desde ese nuevo período hasta el fin del contrato.
function computeTramoChain(cc,excludeNum){
  const totalMeses=Math.max(cc.plazo_meses||cc.plazo||monthDiffInclusive(cc.fechaIni,cc.fechaFin)||1,1);
  const iniYm=dateToMo(cc.fechaIni);
  const tipoSel=(document.querySelector('input[name="ne_ctipo"]:checked')?.value)||cc.tipo;
  const isObra=tipoSel==='OBRA';
  let rate=getCurrentMonthlyRate(cc,excludeNum);
  const avePolyPrev=(cc.aves||[]).filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
  const aveOwnerPrev=(cc.aves||[]).filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const montoBase=cc.montoBase||cc._montoOriginal||((cc.monto||0)-avePolyPrev-aveOwnerPrev);
  let runningTot=montoBase+avePolyPrev+aveOwnerPrev;
  const pp=parseFloat(document.getElementById('ne_obraAdv')?.value)||0;
  const results=[];
  _neTramoIds.forEach((tramoId,idx)=>{
    const basePer=gv('ne_basePer_'+tramoId)||'';
    const newPer=gv('ne_newPer_'+tramoId)||'';
    const pct=calcPolyTramo(tramoId);
    let srcTars=null;
    for(let j=idx-1;j>=0;j--){ if(results[j]&&results[j].newPer&&results[j].newPer===basePer){ srcTars=results[j].tars; break; } }
    if(!srcTars) srcTars=(typeof getApplicableTariffs==='function'?(getApplicableTariffs(cc,basePer)||[]):[]).map(t=>({name:t.name,cols:t.cols,rows:t.rows,sourceTableName:t.name}));
    const factor=1+pct;
    const newTars=srcTars.map(t=>({
      name:t.name,cols:t.cols,sourceTableName:t.sourceTableName||t.name,
      rows:(t.rows||[]).map(row=>(t.cols||[]).map((col,ci)=>{
        const v=row[ci];
        return (typeof isNumericCol==='function'&&isNumericCol(t,ci)&&v!==''&&v!=null)?Math.round((parseFloat(v)||0)*factor*100)/100:v;
      }))
    }));
    let aveMonto=0,mM=0,mMnew=0,mR=0;
    if(isObra){
      aveMonto=pp>0?runningTot*(pp/100)*pct:0;
      runningTot+=aveMonto;
    } else {
      let mD=0; if(newPer) mD=Math.max(monthDiff(iniYm,parseYM(newPer)),0);
      mR=Math.max(totalMeses-mD,0);
      mM=rate; mMnew=rate*factor;
      aveMonto=(mMnew-mM)*mR;
      rate=mMnew;
    }
    results.push({tramoId,basePer,newPer,pct,tars:newTars,srcTars,mM,mMnew,mR,aveMonto,isObra});
  });
  return results;
}
function previewPolyTarTramo(tramoId){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const isCorr=document.getElementById('ne_isCorr')?.checked;
  const corrNum=isCorr?(parseInt(document.getElementById('ne_corrEnm')?.value)||null):null;
  const results=computeTramoChain(cc,corrNum);
  const r=results.find(x=>x.tramoId===tramoId);
  const box=document.getElementById('ne_tarPrev_'+tramoId);if(!box)return;
  if(!r||Math.abs(r.pct)<0.000001){box.innerHTML='<div class="info-box amber" style="margin-top:8px">Ingresá los % acumulados de cada índice</div>';calcAveSugAll();return;}
  if(!r.srcTars.length){box.innerHTML='<div class="info-box amber" style="margin-top:8px">Sin tarifario de referencia para este período.</div>';calcAveSugAll();return;}
  const adj=1+r.pct;
  let h=`<div class="info-box blue" style="margin-top:8px;font-size:11px">Factor <strong>×${adj.toFixed(6)}</strong> (+${(r.pct*100).toFixed(4)}%) — actualizando <strong>${r.srcTars.length} tabla${r.srcTars.length>1?'s':''}</strong></div>`;
  r.srcTars.forEach((tar,ti)=>{
    const newTar=r.tars[ti];
    h+=`<div style="font-size:11px;font-weight:700;color:var(--p800);margin:10px 0 4px;padding:4px 8px;background:var(--p50);border-radius:4px;border-left:3px solid var(--p400)">📋 ${esc(tar.name)}</div>`;
    h+='<div class="tar-preview"><table><thead><tr>';
    tar.cols.forEach((col,ci)=>h+=`<th>${esc(col)}${isNumericCol(tar,ci)?'<span style="opacity:.5"> (base→nuevo)</span>':''}</th>`);
    h+='</tr></thead><tbody>';
    tar.rows.forEach((row,ri)=>{h+='<tr>';tar.cols.forEach((col,ci)=>{const v=row[ci];if(isNumericCol(tar,ci)&&v!==''&&v!=null){const nv=parseFloat(v)||0,nw=parseFloat(newTar.rows[ri][ci])||0;h+=`<td><span style="color:var(--g500);text-decoration:line-through;font-size:10px">${fN(nv)}</span> <span class="new-v">→ ${fN(nw)}</span></td>`;}else h+=`<td>${esc(String(v??''))}</td>`;});h+='</tr>';});
    h+='</tbody></table></div>';
  });
  box.innerHTML=h;
  const manEl=document.getElementById('ne_aveManual');if(manEl)manEl.value='';
  const noteEl=document.getElementById('ne_aveManualNote');if(noteEl)noteEl.style.display='none';
  calcAveSugAll();
}
function onAveManualChange(){
  const el=document.getElementById('ne_aveManual');
  const noteEl=document.getElementById('ne_aveManualNote');
  const montoEl=document.getElementById('ne_aveMonto');
  if(!el||!noteEl)return;
  const manualVal=el.value.trim();
  if(manualVal===''){noteEl.style.display='none';calcAveSugAll();}
  else{
    const mv=parseFloat(manualVal)||0;
    const autoMonto=parseFloat(montoEl?.dataset?.monto)||0;
    const diff=mv-autoMonto;
    noteEl.style.display='block';
    noteEl.innerHTML=`Usarás <strong>${fN(mv)}</strong> en lugar del calculado <strong>${fN(autoMonto)}</strong> <span style="color:${diff>=0?'var(--g600)':'var(--r500)'}">(${diff>=0?'+':''}${fN(diff)})</span>`;
  }
}
// Tabla de detalle de POs que alimentan el % de avance de obra automático — se muestra
// dentro del panel de Nueva Enmienda, ANTES de confirmar el AVE, así el usuario ve qué
// POs se están considerando "ya avanzado" (excluidas del ajuste) vs. remanente (el que
// sí recibe el nuevo % polinómico), y puede corregir período/si-cuenta-como-avance ahí
// mismo sin perder el formulario en progreso.
function renderObraPoBreakdownHtml(cc, calc, newYm){
  if(!calc.detalle.length) return '<div style="font-size:11px;color:var(--g500);font-style:italic;padding:6px 0">Sin POs asociadas a este contrato en ME2N.</div>';
  let h='<div style="font-size:10.5px;color:var(--g600c);margin-bottom:6px">Consumido (ya avanzado, excluido del ajuste) hasta antes de '+esc(formatMonth?formatMonth(newYm):newYm)+': <strong>'+(cc.mon||'ARS')+' '+fN(calc.consumido)+'</strong> ('+calc.avancePct.toFixed(2)+'%) · Remanente a actualizar: <strong>'+calc.pendientePct.toFixed(2)+'%</strong></div>';
  h+='<div style="max-height:220px;overflow-y:auto;border:1px solid var(--g200);border-radius:6px">';
  h+='<table style="width:100%;font-size:11px"><thead><tr style="background:var(--g50)"><th style="padding:5px 6px;text-align:left">PO</th><th style="padding:5px 6px">Document Date</th><th style="padding:5px 6px;text-align:right">NOV</th><th style="padding:5px 6px">Período Cert.</th><th style="padding:5px 6px">¿Avance?</th><th style="padding:5px 6px">Incluido</th></tr></thead><tbody>';
  calc.detalle.forEach(function(d){
    h+='<tr style="border-top:1px solid var(--g100);'+(d.incluido?'background:#f8fafc':'')+'">';
    h+='<td class="mono" style="padding:5px 6px;font-weight:600">'+esc(d.po)+'</td>';
    h+='<td class="mono" style="padding:5px 6px">'+(d.docIso?fD(d.docIso):(d.docYm?esc(d.docYm):'—'))+'</td>';
    h+='<td class="mono" style="padding:5px 6px;text-align:right">'+fN(d.nov)+'</td>';
    h+='<td style="padding:5px 6px"><input type="date" value="'+esc(d.certPeriodFull||'')+'" style="font-size:10.5px;padding:2px 4px;width:120px" onchange="setPoCertPeriodInForm(\''+cc.id+'\',\''+esc(d.po)+'\',this.value)">'+(d.isFallback&&d.certPeriodFull?'<div style="font-size:9px;color:#b45309">⚠️ auto (Doc.Date)</div>':'')+'</td>';
    h+='<td style="padding:5px 6px;text-align:center"><input type="checkbox" '+(d.countsAsProgress?'checked':'')+' onchange="setPoCountsAsProgressInForm(\''+cc.id+'\',\''+esc(d.po)+'\',this.checked)"></td>';
    h+='<td style="padding:5px 6px;text-align:center">'+(d.incluido?'✓':'—')+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  return h;
}
function calcAveSugAll(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const tipoSel=(document.querySelector('input[name="ne_ctipo"]:checked')?.value)||cc.tipo;
  const isObra=tipoSel==='OBRA';
  const obraGrp=document.getElementById('ne_obraGrp');if(obraGrp)obraGrp.style.display=isObra?'':'none';
  if(isObra){
    const firstNewPer=_neTramoIds.length?(gv('ne_newPer_'+_neTramoIds[0])||''):'';
    const obraAdvEl=document.getElementById('ne_obraAdv');
    const bdEl=document.getElementById('ne_obraPoBreakdown');
    if(firstNewPer){
      const calc=computeObraAvanceCert(cc,firstNewPer);
      if(obraAdvEl&&(!obraAdvEl.value||obraAdvEl.dataset.autoFilled==='1')){
        obraAdvEl.value=calc.pendientePct.toFixed(2);
        obraAdvEl.dataset.autoFilled='1';
      }
      if(bdEl) bdEl.innerHTML=renderObraPoBreakdownHtml(cc,calc,firstNewPer);
    } else if(bdEl){
      bdEl.innerHTML='<div style="font-size:11px;color:var(--g500);font-style:italic;padding:6px 0">Elegí el "Nuevo Período" del tramo para calcular el % de avance de obra automático.</div>';
    }
  }
  const isCorr=document.getElementById('ne_isCorr')?.checked;
  const corrNum=isCorr?(parseInt(document.getElementById('ne_corrEnm')?.value)||null):null;
  const results=computeTramoChain(cc,corrNum);
  let totalAve=0,bd='';
  results.forEach((r,idx)=>{
    totalAve+=r.aveMonto;
    const label=(typeof formatYmLabel==='function'&&r.newPer)?formatYmLabel(r.newPer):(r.newPer||'—');
    if(r.isObra){
      bd+=`<div style="font-size:11px;color:var(--g700);padding:4px 0;border-bottom:1px solid var(--g100)">Período ${idx+1} (${label}): ${cc.mon} ${fN(r.aveMonto)} <span style="color:var(--g500)">(+${(r.pct*100).toFixed(4)}% s/avance pendiente)</span></div>`;
    } else {
      bd+=`<div style="font-size:11px;color:var(--g700);padding:4px 0;border-bottom:1px solid var(--g100)">Período ${idx+1} (${label}): ${cc.mon} ${fN(r.mM)} → ${cc.mon} ${fN(r.mMnew)} · × ${r.mR} m.rest. = <strong>${cc.mon} ${fN(r.aveMonto)}</strong></div>`;
    }
  });
  const bdEl=document.getElementById('ne_aveBreakdown');if(bdEl)bdEl.innerHTML=bd;
  const el=document.getElementById('ne_aveMonto');
  if(el){el.textContent=totalAve>0?cc.mon+' '+fN(totalAve):'—';el.dataset.monto=totalAve;}
  const sug=document.getElementById('ne_aveSug');if(sug)sug.style.display=results.length?'':'none';
}
function recalcTarChain(cc,fromPeriod){
  const pEnms=(cc.enmiendas||[]).filter(e=>enmHasTipo(e,'ACTUALIZACION_TARIFAS')&&e.nuevoPeriodo&&e.nuevoPeriodo>=fromPeriod&&!e.superseded).sort((a,b)=>a.nuevoPeriodo.localeCompare(b.nuevoPeriodo));
  pEnms.forEach(enm=>{
    // Enmiendas con varios períodos (tramos) se re-encadenan en memoria igual que al guardarlas;
    // las viejas (sin tramos) caen al caso de un tramo único, comportamiento idéntico al previo.
    const tramos=(Array.isArray(enm.tramos)&&enm.tramos.length)?enm.tramos:[{basePeriodo:enm.basePeriodo,pctPoli:enm.pctPoli,nuevoPeriodo:enm.nuevoPeriodo}];
    const existingForEnm=cc.tarifarios.filter(t=>t.enmNum===enm.num);
    let chainTars=null;
    tramos.forEach(tr=>{
      const bTars=(chainTars&&chainTars.length)?chainTars:getApplicableTariffs(cc,tr.basePeriodo||'').map(t=>({name:t.name,cols:t.cols,rows:t.rows,sourceTableName:t.name}));
      if(!bTars.length){ chainTars=null; return; }
      const adj=1+(tr.pctPoli||0);
      chainTars=bTars.map(bTar=>({
        name:bTar.name,cols:bTar.cols,sourceTableName:bTar.sourceTableName||bTar.name,
        rows:bTar.rows.map(row=>bTar.cols.map((col,ci)=>{const v=row[ci];return(isNumericCol(bTar,ci)&&v!==''&&v!=null)?Math.round((parseFloat(v)||0)*adj*100)/100:v;}))
      }));
    });
    if(!chainTars)return;
    chainTars.forEach((newTar,ti)=>{
      const baseName=(newTar.name||'Tarifario').replace(/\s*\(Enm\.\d+\)$/, '').trim();
      const match=existingForEnm.find(t=>t.sourceTableName===newTar.sourceTableName)||existingForEnm[ti];
      if(match){match.rows=newTar.rows;match.name=baseName+' (Enm.'+enm.num+')';}
    });
  });
}
async function guardarEnm(){
  const cc=window.DB.find(x=>x.id===window.detId); if(!cc) return;
  const tipos=getEnmTiposSeleccionados();
  if(!tipos.length){ toast('Seleccioná al menos un concepto', 'er'); return; }
  if(!cc.enmiendas) cc.enmiendas=[];
  if(!cc.tarifarios) cc.tarifarios=[];
  if(!cc.aves) cc.aves=[];

  // ── Validación de TODOS los conceptos tildados, ANTES de mutar nada ────────
  // Si se combinan varios conceptos y uno falla su validación, no queremos
  // dejar el contrato con las mutaciones de otro concepto ya aplicadas a
  // medias — por eso primero se valida y calcula todo, recién después se
  // aplica. computeTramoChain corre acá (con el plazo TODAVÍA sin extender,
  // aunque en esta misma enmienda también se haya tildado EXTENSION) — la
  // actualización de tarifas queda calculada sobre el plazo vigente al
  // momento de decidirse, no sobre el plazo ya extendido.
  const textTipos=tipos.filter(t=>['SCOPE','CLAUSULAS','OTRO'].includes(t));
  let extFf=null;
  if(tipos.includes('EXTENSION')){
    const raw = (document.getElementById('ne_ffin')?.value || '').trim();
    extFf = parseEnmDate(raw);
    if(!extFf){ toast('Ingresá nueva fecha fin (DD/MM/AAAA)', 'er'); return; }
    if(new Date(extFf+'T00:00:00') <= new Date((cc.fechaFin||cc.fechaIni)+'T00:00:00')){
      toast('La fecha debe ser posterior a la actual ('+fD(cc.fechaFin)+')', 'er');
      return;
    }
  }
  let tarResults=null, tarCorrNum=null;
  if(tipos.includes('ACTUALIZACION_TARIFAS')){
    const isCorr = document.getElementById('ne_isCorr')?.checked;
    tarCorrNum = isCorr ? (parseInt(document.getElementById('ne_corrEnm')?.value)||null) : null;
    tarResults = computeTramoChain(cc, tarCorrNum);
    if(!tarResults.length || tarResults.every(r=>Math.abs(r.pct)<0.000001)){ toast('Ingresá los % acumulados', 'er'); return; }
    for(const r of tarResults){ if(!r.newPer){ toast('Completá el nuevo período de todos los tramos', 'er'); return; } }
  }
  let motTxt=null, motHtml=null;
  if(textTipos.length){
    const motEl=document.getElementById('ne_mot');
    motTxt=(motEl?.textContent||'').trim();
    if(!motTxt){ toast('Ingresá la descripción', 'er'); return; }
    motHtml=sanitizeRichText(motEl?.innerHTML||'');
  }
  let otroTitulo=null;
  if(tipos.includes('OTRO')){
    otroTitulo=(document.getElementById('ne_otro_titulo')?.value||'').trim();
    if(!otroTitulo){ toast('Ingresá el título de la sección para "Otro"', 'er'); return; }
  }
  // Alcance (SCOPE): agregar/quitar items del tarifario es opcional — una enmienda de scope
  // puede ser solo texto (ej: "se amplía el alcance a X sin cambios de tarifario"). El período
  // y el tarifario a modificar solo son obligatorios si efectivamente hay items marcados para
  // quitar o agregar; todo item nuevo necesita su precio cargado antes de guardar.
  let scopeTabla=null, scopePeriodo=null, scopeQuitarIdx=[], scopeNuevosValidos=[];
  if(tipos.includes('SCOPE')){
    scopeTabla=scopeTablaActual();
    scopeQuitarIdx=Array.from(document.querySelectorAll('.ne_scope_quitar_cb:checked')).map(cb=>parseInt(cb.value));
    scopeNuevosValidos=_neScopeNuevos.filter(row=>row.some(v=>String(v||'').trim()!==''));
    if(scopeQuitarIdx.length>0 || scopeNuevosValidos.length>0){
      scopePeriodo=(document.getElementById('ne_scope_periodo')?.value||'').trim();
      if(!scopePeriodo){ toast('Ingresá el período de aplicación del cambio de alcance', 'er'); return; }
      if(!scopeTabla){ toast('Seleccioná la tabla a modificar', 'er'); return; }
      const priceIdx=scopeTablaPriceIdx(scopeTabla);
      for(const row of scopeNuevosValidos){
        if(!String(row[priceIdx]||'').trim()){ toast('Completá el precio de todos los items nuevos antes de guardar', 'er'); return; }
      }
    }
  }

  // ── Todo validado: se arma la enmienda y se aplican los efectos, en orden ──
  const num = cc.enmiendas.length + 1;
  const enm = { num, tipos:[...tipos], tipo:tipos[0], fecha: new Date().toISOString().split('T')[0] };

  if(tipos.includes('EXTENSION')){
    if(!cc._fechaFinOriginal) cc._fechaFinOriginal = cc.fechaFin;
    enm.fechaFinNueva = extFf;
    enm.extTipo = document.getElementById('ne_ext_tipo')?.value || 'FIN';
    cc.fechaFin = extFf;
    // monthDiffInclusive (no la resta de meses a mano, que queda 1 mes corta): mismo cálculo
    // que usa el resto de la app (calcPlazo al crear el contrato, plazo_meses en saveCont) para
    // que plazo y plazo_meses no se desincronicen tras una extensión.
    cc.plazo = monthDiffInclusive(cc.fechaIni, cc.fechaFin);
    cc.plazo_meses = cc.plazo;
  }
  if(tipos.includes('ACTUALIZACION_TARIFAS')){
    const results=tarResults, corrNum=tarCorrNum;
    const lastR=results[results.length-1];

    enm.tarSubtipo = document.getElementById('ne_tar_subtipo')?.value || 'POLINOMICA';
    enm.correccionDeEnm = corrNum || null;
    if(corrNum){
      const oe = cc.enmiendas.find(e=>e.num===corrNum);
      if(oe){ oe.superseded=true; oe.supersededBy=num; }
      cc.tarifarios = (cc.tarifarios||[]).filter(t=>t.enmNum!==corrNum);
    }

    // Campos de nivel superior = último tramo, para compatibilidad con el resto de la app
    // (listados, dashboard, generación de documentos). El detalle completo va en enm.tramos.
    enm.basePeriodo = lastR.basePer;
    enm.nuevoPeriodo = lastR.newPer;
    enm.pctPoli = lastR.pct;

    const poly = (cc.poly||[]).filter(p=>p.idx);
    enm.tramos = results.map(r=>({
      basePeriodo:r.basePer, nuevoPeriodo:r.newPer, pctPoli:r.pct,
      polyTerms: poly.map((t,i)=>({
        idx:t.idx, inc:t.inc, baseOrig:t.base||'',
        pctAcum:parseFloat(document.getElementById('ne_acum_'+r.tramoId+'_'+i)?.value)||0,
        nuevaBase:document.getElementById('ne_nb_'+r.tramoId+'_'+i)?.value||'',
        justificacion:(document.getElementById('ne_just_'+r.tramoId+'_'+i)?.value||'').trim()
      }))
    }));
    enm.polyTerms = enm.tramos[enm.tramos.length-1].polyTerms;

    results.forEach(r=>{
      if(r.srcTars && r.srcTars.length){
        r.srcTars.forEach((bTar,ti)=>{
          const newRows=r.tars[ti].rows;
          const baseName=String(bTar.name||'Tarifario').replace(/\s*\(Enm\.\d+\)$/,'').trim();
          cc.tarifarios.push({name:baseName+' (Enm.'+num+')', cols:[...(bTar.cols||[])], rows:newRows, period:r.newPer, enmNum:num, sourceTableName:bTar.sourceTableName||bTar.name||''});
        });
        if(typeof recalcTarChain==='function') recalcTarChain(cc,r.newPer);
        cc.btar=r.newPer;
      } else {
        cc.tarifarios.push({ name:'Lista de Precios (Enm.'+num+')', cols:['ITEM','DESCRIPCION','UNIDAD','PRECIO'], rows:[], period:r.newPer, enmNum:num, sourceTableName:'PENDIENTE_BASE', placeholder:true });
      }
    });
    localStorage.removeItem('pol_eval_result_'+cc.id);
    localStorage.removeItem('pol_selected_months_'+cc.id);
    console.log('[guardarEnm] Períodos aplicados en Enm.'+num+':', results.map(r=>r.newPer).join(' → '));

    // Congelar montoBase (monto original del contrato, sin AVEs) la primera vez que se toca
    if(cc.montoBase==null){
      const avePolyPrev=(cc.aves||[]).filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
      const aveOwnerPrev=(cc.aves||[]).filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
      cc.montoBase=cc._montoOriginal||((cc.monto||0)-avePolyPrev-aveOwnerPrev);
    }

    // Notas de justificación cargadas en términos con % manual, para trazabilidad en el AVE.
    const justNotesForTramo=tr=>(tr?.polyTerms||[]).filter(t=>t.justificacion).map(t=>t.idx+': '+t.justificacion).join(' · ');

    const aveManualEl=document.getElementById('ne_aveManual');
    const aveManualVal=aveManualEl && String(aveManualEl.value).trim()!=='' ? (parseFloat(aveManualEl.value)||0) : null;
    if(aveManualVal!==null){
      // Monto manual único: reemplaza el total calculado, referenciado al último período de la enmienda
      if(aveManualVal>0){
        const allNotes=enm.tramos.map(justNotesForTramo).filter(Boolean).join(' · ');
        const montoManualR=Math.round(aveManualVal*100)/100;
        cc.aves.push({id:Date.now().toString(36)+Math.random().toString(36).substr(2,4), tipo:'POLINOMICA', subtipo:'MANUAL', concepto:'Polinómica manual — Enm.'+num+(allNotes?(' · '+allNotes):''), monto:montoManualR, montoUsd:Math.round(_ave_toUsd(cc,montoManualR)*100)/100, tcAlMomento:(typeof getTCFromStore==='function'?getTCFromStore():null)||null, enmRef:num, periodo:lastR.newPer, autoGenerated:false, fecha:new Date().toISOString()});
      }
    } else {
      results.forEach((r,idx)=>{
        if(r.aveMonto>0){
          const tag=results.length>1?' · período '+(idx+1)+'/'+results.length:'';
          const notes=justNotesForTramo(enm.tramos[idx]);
          const montoAutoR=Math.round(r.aveMonto*100)/100;
          const aveObj={id:Date.now().toString(36)+Math.random().toString(36).substr(2,4)+'_'+idx, tipo:'POLINOMICA', subtipo:'AUTO', concepto:'Polinómica auto — Enm.'+num+tag+' (+'+((r.pct)*100).toFixed(2)+'%)'+(notes?(' · '+notes):''), monto:montoAutoR, montoUsd:Math.round(_ave_toUsd(cc,montoAutoR)*100)/100, tcAlMomento:(typeof getTCFromStore==='function'?getTCFromStore():null)||null, enmRef:num, periodo:r.newPer, autoGenerated:true, fecha:new Date().toISOString()};
          // Para OBRA: dejar registrado con qué % de avance pendiente se calculó este AVE
          // (auditoría — de dónde salió el % que multiplicó el remanente, ver computeObraAvanceCert).
          if(r.isObra){
            const avanceCalc=computeObraAvanceCert(cc,r.newPer);
            aveObj.obraAvanceSnapshot={pendientePctUsado:parseFloat(document.getElementById('ne_obraAdv')?.value)||0, pendientePctAuto:avanceCalc.pendientePct, avancePctAuto:avanceCalc.avancePct, consumidoAuto:avanceCalc.consumido, montoBase:avanceCalc.montoBase};
          }
          cc.aves.push(aveObj);
        }
      });
    }

    // AVE Owner "ajustable": participan de esta actualización de tarifas con el mismo %
    // polinómico de los tramos recién aplicados, encadenado desde su última actualización
    // (lastAdjYm) — no desde la incorporación original si ya recibió ajustes previos. Cada
    // ajuste queda como AVE Polinómica nueva y separada, referenciando el AVE Owner de origen.
    (cc.aves||[]).filter(a=>a.tipo==='OWNER'&&a.ajustable).forEach(a=>{
      let factor=1, lastNewPer=a.lastAdjYm||'';
      results.forEach(r=>{
        if(r.newPer && r.newPer>(a.lastAdjYm||'')){ factor*=(1+(r.pct||0)); lastNewPer=r.newPer; }
      });
      if(factor===1) return;
      const baseAcum=(a._ajustadoAcum!=null?a._ajustadoAcum:a.monto)||0;
      const delta=Math.round(baseAcum*(factor-1)*100)/100;
      a.lastAdjYm=lastNewPer;
      if(!delta) return;
      cc.aves.push({
        id:Date.now().toString(36)+Math.random().toString(36).substr(2,4)+'_owadj',
        tipo:'POLINOMICA', subtipo:'OWNER_ADJ',
        concepto:'Ajuste polinómico sobre AVE Owner ('+(a.subtipo||'Owner')+' · '+fD((a.fecha||'').substring(0,10))+') — Enm.'+num+' (+'+((factor-1)*100).toFixed(2)+'%)',
        monto:delta, montoUsd:Math.round(_ave_toUsd(cc,delta)*100)/100, tcAlMomento:(typeof getTCFromStore==='function'?getTCFromStore():null)||null,
        enmRef:num, periodo:lastNewPer, autoGenerated:true, ownerAveRef:a.id,
        fecha:new Date().toISOString()
      });
      a._ajustadoAcum=Math.round((baseAcum+delta)*100)/100;
    });

    // Monto vigente = montoBase + suma aditiva de todos los AVEs (sin multiplicar de nuevo por el %)
    const avePolyNow=cc.aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
    const aveOwnerNow=cc.aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
    const montoAnterior=cc.monto||0;
    cc.monto=Math.round((cc.montoBase+avePolyNow+aveOwnerNow)*100)/100;
    console.log('[guardarEnm] Monto vigente:', montoAnterior.toFixed(2), '→', cc.monto.toFixed(2), '(montoBase '+cc.montoBase.toFixed(2)+' + AVEs)');
  }
  if(textTipos.length){
    enm.motivo=motTxt;
    enm.descripcion=motTxt;
    // Versión enriquecida (negrita/incisos) del mismo texto — la usa el Generar Word; el resto
    // de la app (listados, Dossier) sigue mostrando enm.motivo/descripcion en texto plano.
    enm.descripcionRica=motHtml;
    if(tipos.includes('SCOPE')) enm.scopeTipo=document.getElementById('ne_scope_tipo')?.value||'MAYOR';
    if(tipos.includes('OTRO')) enm.otroTitulo=otroTitulo;
  }
  if(tipos.includes('SCOPE') && (scopeQuitarIdx.length>0 || scopeNuevosValidos.length>0)){
    // Se arma una nueva versión del tarifario para el período indicado: se sacan los items
    // tildados para quitar y se agregan los nuevos con su precio — mismo patrón de "push" que
    // usa Actualización de Tarifas, así el resto de la app (Tarifario, generación de Word) lo
    // toma automáticamente por período sin lógica extra.
    const baseName=String(scopeTabla.name||'Tabla').replace(/\s*\(Enm\.\d+\)$/,'').trim();
    const keptRows=(scopeTabla.rows||[]).filter((_,i)=>!scopeQuitarIdx.includes(i));
    const newRows=keptRows.concat(scopeNuevosValidos);
    cc.tarifarios.push({name:baseName+' (Enm.'+num+')', cols:[...(scopeTabla.cols||[])], rows:newRows, period:scopePeriodo, enmNum:num, sourceTableName:baseName});
    enm.scopePeriodo=scopePeriodo;
    enm.scopeTablaName=baseName;
    enm.scopeCols=[...(scopeTabla.cols||[])];
    enm.scopeItemsRemovidos=scopeQuitarIdx.map(i=>(scopeTabla.rows||[])[i]).filter(Boolean);
    enm.scopeItemsAgregados=scopeNuevosValidos;
  }

  cc.enmiendas.push(enm);
  cc.updatedAt=new Date().toISOString();
  if(!SB_OK){
    localStorage.setItem('cta_v7', JSON.stringify(window.DB));
  } else {
    showLoader('Guardando enmienda…');
    try{
      await sbUpsertItem('contratos', cc);
    }catch(e){
      hideLoader();
      console.error('guardarEnm save',e);
      // No se pudo persistir en Supabase: la enmienda quedó armada en memoria pero no
      // guardada. En vez de intentar revertir a mano cada mutación de arriba (monto,
      // tarifarios, aves — riesgo de dejar algo a medio revertir), avisamos claro y
      // recomendamos recargar para volver al último estado confirmado por el servidor.
      toast('⛔ No se pudo guardar en Supabase. Recargá la página (no se perdió nada del lado del servidor) e intentá de nuevo.','er');
      return;
    }
    hideLoader();
  }

  closeEnmPanel();
  renderDet();
  renderList();
  updNav();
  toast('Enmienda N°'+num+' guardada correctamente', 'ok');

  // Actualizar fuzzy search cache
  if (typeof window.initFuzzySearch === 'function') {
    window.initFuzzySearch();
  }
}

// ═══════════ AVE OWNER — Panel separado ══════════════════════
function openAveOwnerPanel(){
  const p=document.getElementById('aveOwnerPanel');
  if(p){p.classList.add('vis');p.scrollIntoView({behavior:'smooth',block:'nearest'});}
}
function closeAveOwnerPanel(){
  const p=document.getElementById('aveOwnerPanel');
  if(p){p.classList.remove('vis');}
  ['avo_sub','avo_enm','avo_monto','avo_per','avo_ffin','avo_otro'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  const ajEl=document.getElementById('avo_ajustable');if(ajEl)ajEl.checked=false;
  const fg=document.getElementById('avo_ffin_grp');if(fg)fg.style.display='none';
  const og=document.getElementById('avo_otro_grp');if(og)og.style.display='none';
}
function onAvoSubChange(){
  const v=document.getElementById('avo_sub')?.value||'';
  const fg=document.getElementById('avo_ffin_grp');if(fg)fg.style.display=v==='EXTENSION PLAZO'?'':'none';
  const og=document.getElementById('avo_otro_grp');if(og)og.style.display=v==='OTRO'?'':'none';
}
async function saveAveOwner(){
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const aveMonto=parseFloat(document.getElementById('avo_monto')?.value)||0;
  if(!aveMonto){toast('Ingresá el monto del AVE','er');return;}
  const sub=document.getElementById('avo_sub')?.value||'';
  if(!sub){toast('Seleccioná el concepto','er');return;}
  
  let ffin=null;
  if(sub==='EXTENSION PLAZO'){
    ffin=document.getElementById('avo_ffin')?.value||'';
    if(!ffin){toast('Ingresá nueva fecha fin','er');return;}
    cc.fechaFin=ffin;
    // monthDiffInclusive (mismo cálculo que el resto de la app) y sincronizar plazo_meses,
    // ANTES de calcular el mensual de más abajo — si no, "nuevo mensual" se calcula con el
    // plazo viejo aunque el contrato ya se haya extendido.
    cc.plazo=monthDiffInclusive(cc.fechaIni,cc.fechaFin);
    cc.plazo_meses=cc.plazo;
  }
  const plazo = cc.plazo_meses || cc.plazo || 36;
  const totalActual = cc.tot || cc.monto || 0;
  const nuevoTotal = totalActual + aveMonto;
  const nuevoMensual = round2(nuevoTotal / plazo);

  if(!cc.aves)cc.aves=[];
  const enmRefRaw=document.getElementById('avo_enm')?.value||'';
  const periodoRaw=document.getElementById('avo_per')?.value||null;
  const ajustable=!!document.getElementById('avo_ajustable')?.checked;
  const aveOwnerObj={
    id:Date.now().toString(36)+Math.random().toString(36).substr(2,4),
    tipo:'OWNER',
    subtipo:sub,
    concepto:sub==='OTRO'?(document.getElementById('avo_otro')?.value.trim()||null):null,
    monto:aveMonto,
    // Equivalente USD al TC vigente EN ESTE MOMENTO — se guarda fijo, no se recalcula después,
    // así el historial refleja el valor real en dólares de cada AVE al momento de cargarlo.
    montoUsd:Math.round(_ave_toUsd(cc,aveMonto)*100)/100,
    tcAlMomento:(typeof getTCFromStore==='function'?getTCFromStore():null)||null,
    enmRef:enmRefRaw?parseInt(enmRefRaw):null,
    periodo:periodoRaw,
    fechaFinNueva:ffin,
    fecha:new Date().toISOString()
  };
  if(ajustable){
    // Ajustable: participa de futuras actualizaciones de tarifas (mismo % polinómico que
    // la base del contrato), encadenado desde el período de incorporación. _ajustadoAcum
    // lleva el monto vigente (original + ajustes acumulados) para encadenar el próximo delta.
    aveOwnerObj.ajustable=true;
    aveOwnerObj.lastAdjYm=periodoRaw||(cc.fechaIni||'').substring(0,7)||null;
    aveOwnerObj._ajustadoAcum=aveMonto;
  }
  cc.aves.push(aveOwnerObj);
  
  cc.tot = nuevoTotal;
  cc.montoMensualEst = nuevoMensual;
  
  const ownerSum=cc.aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const limit=cc._aveOwnerLimit||250000; // USD
  const ownerSumUsd=_ave_toUsd(cc,ownerSum);
  cc.updatedAt=new Date().toISOString();
  if(!SB_OK){
    localStorage.setItem('cta_v7',JSON.stringify(window.DB));
  } else {
    showLoader('Guardando AVE Owner…');
    try{
      await sbUpsertItem('contratos',cc);
    }catch(e){
      hideLoader();
      console.error('saveAveOwner save',e);
      toast('⛔ No se pudo guardar en Supabase. Recargá la página e intentá de nuevo.','er');
      return;
    }
    hideLoader();
  }
  closeAveOwnerPanel();
  renderDet();renderList();updNav();
  if(ownerSumUsd>limit) toast(`⛔ AVE Owner acumulado (${_ave_fmtUsd(ownerSumUsd)}) supera límite USD ${fN(limit)}`,'er');
  else toast('AVE Owner registrado — '+cc.mon+' '+fN(aveMonto),'ok');
}
async function setAveLimit(id,val){
  const cc=window.DB.find(x=>x.id===id);if(!cc)return;
  cc._aveOwnerLimit=parseFloat(val)||250000;
  cc.updatedAt=new Date().toISOString();
  if(!SB_OK)localStorage.setItem('cta_v7',JSON.stringify(window.DB));
  else await sbUpsertItem('contratos',cc);
  renderDet();
}

// Helpers TC global para validaciones (toUsd / fmtUsd están scoped en renderDet)
function _ave_toUsd(cc, ar){
  if(!isFinite(ar)) return 0;
  const isUsd=String(cc.mon||'').toUpperCase().indexOf('USD')>=0;
  if(isUsd) return ar;
  const tc=(typeof getTCFromStore==='function'?getTCFromStore():null)||1000;
  return tc>0?(ar/tc):0;
}
function _ave_fmtUsd(v){ return 'USD '+(Math.round((v||0)*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }

async function markValidationAic(cid){
  const cc=window.DB.find(x=>x.id===cid); if(!cc) return;
  const aves=cc.aves||[];
  const pending=aves.filter(a=>a.tipo==='POLINOMICA' && !a.aicValidated);
  if(!pending.length){ toast('No hay AVEs polinómicas vigentes para validar','er'); return; }
  const totalAr=pending.reduce((s,a)=>s+(a.monto||0),0);
  const totalUsd=_ave_toUsd(cc,totalAr);
  if(!confirm('¿Marcar validación AIC para '+pending.length+' AVE polinómica(s), total '+_ave_fmtUsd(totalUsd)+'?\n\nA partir de ahora el contador empieza en 0 para nuevas AVEs polinómicas.')) return;
  const validationId='AIC_'+Date.now().toString(36);
  const now=new Date().toISOString();
  pending.forEach(a=>{ a.aicValidated=true; a.aicValidationId=validationId; a.aicValidationDate=now; });
  cc.aicValidations=cc.aicValidations||[];
  cc.aicValidations.push({id:validationId, date:now, totalAr:totalAr, totalUsd:totalUsd, aveIds:pending.map(a=>a.id), tc:(typeof getTCFromStore==='function'?getTCFromStore():null)||1000});
  cc.updatedAt=now;
  try{ localStorage.setItem('cta_v7',JSON.stringify(window.DB)); }catch(_e){}
  if(SB_OK){ try{ await sbUpsertItem('contratos',cc); }catch(e){ console.error('markValidationAic save',e); toast('⚠ Validación marcada localmente — error al sincronizar','er'); } }
  toast('✅ Validación AIC registrada · '+pending.length+' AVE(s) · '+_ave_fmtUsd(totalUsd),'ok');
  renderDet();
}

async function markValidationCc(cid){
  const cc=window.DB.find(x=>x.id===cid); if(!cc) return;
  const aves=cc.aves||[];
  const pending=aves.filter(a=>a.tipo==='OWNER' && !a.ccValidated);
  if(!pending.length){ toast('No hay AVEs owner vigentes para validar','er'); return; }
  const totalAr=pending.reduce((s,a)=>s+(a.monto||0),0);
  const totalUsd=_ave_toUsd(cc,totalAr);
  if(!confirm('¿Marcar validación CC para '+pending.length+' AVE owner(s), total '+_ave_fmtUsd(totalUsd)+'?\n\nA partir de ahora el contador empieza en 0 para nuevas AVEs owner.')) return;
  const validationId='CC_'+Date.now().toString(36);
  const now=new Date().toISOString();
  pending.forEach(a=>{ a.ccValidated=true; a.ccValidationId=validationId; a.ccValidationDate=now; });
  cc.ccValidations=cc.ccValidations||[];
  cc.ccValidations.push({id:validationId, date:now, totalAr:totalAr, totalUsd:totalUsd, aveIds:pending.map(a=>a.id), tc:(typeof getTCFromStore==='function'?getTCFromStore():null)||1000});
  cc.updatedAt=now;
  try{ localStorage.setItem('cta_v7',JSON.stringify(window.DB)); }catch(_e){}
  if(SB_OK){ try{ await sbUpsertItem('contratos',cc); }catch(e){ console.error('markValidationCc save',e); toast('⚠ Validación marcada localmente — error al sincronizar','er'); } }
  toast('✅ Validación CC registrada · '+pending.length+' AVE(s) · '+_ave_fmtUsd(totalUsd),'ok');
  renderDet();
}

async function undoValidationAic(cid, validationId){
  const cc=window.DB.find(x=>x.id===cid); if(!cc) return;
  if(!confirm('¿Deshacer validación AIC '+validationId+'? Las AVEs volverán a contar en el límite vigente.')) return;
  (cc.aves||[]).forEach(a=>{ if(a.aicValidationId===validationId){ a.aicValidated=false; delete a.aicValidationId; delete a.aicValidationDate; } });
  cc.aicValidations=(cc.aicValidations||[]).filter(v=>v.id!==validationId);
  cc.updatedAt=new Date().toISOString();
  try{ localStorage.setItem('cta_v7',JSON.stringify(window.DB)); }catch(_e){}
  if(SB_OK){
    try{ await sbUpsertItem('contratos',cc); }
    catch(e){ console.error('undoValidationAic save',e); toast('⚠ Deshecho localmente — no se pudo sincronizar con Supabase','er'); renderDet(); return; }
  }
  toast('Validación AIC deshecha','ok');
  renderDet();
}

async function undoValidationCc(cid, validationId){
  const cc=window.DB.find(x=>x.id===cid); if(!cc) return;
  if(!confirm('¿Deshacer validación CC '+validationId+'? Las AVEs volverán a contar en el límite vigente.')) return;
  (cc.aves||[]).forEach(a=>{ if(a.ccValidationId===validationId){ a.ccValidated=false; delete a.ccValidationId; delete a.ccValidationDate; } });
  cc.ccValidations=(cc.ccValidations||[]).filter(v=>v.id!==validationId);
  cc.updatedAt=new Date().toISOString();
  try{ localStorage.setItem('cta_v7',JSON.stringify(window.DB)); }catch(_e){}
  if(SB_OK){
    try{ await sbUpsertItem('contratos',cc); }
    catch(e){ console.error('undoValidationCc save',e); toast('⚠ Deshecho localmente — no se pudo sincronizar con Supabase','er'); renderDet(); return; }
  }
  toast('Validación CC deshecha','ok');
  renderDet();
}

// ═══════════ CERTIFICACIONES (OBRA) ══════════════════
// Selección de scope OBRA persistida por contrato. Estructura: {pos:[poNum,...], includeRemanente:bool}
function getStoredScopeSelection(cid){
  try{ var raw=localStorage.getItem('obra_scope_sel_'+cid); return raw?JSON.parse(raw):{pos:[],includeRemanente:false}; }
  catch(_e){ return {pos:[],includeRemanente:false}; }
}
function setStoredScopeSelection(cid, sel){
  try{ localStorage.setItem('obra_scope_sel_'+cid, JSON.stringify(sel||{pos:[],includeRemanente:false})); }catch(_e){}
}
function clearStoredScopeSelection(cid){
  try{ localStorage.removeItem('obra_scope_sel_'+cid); }catch(_e){}
}
// Calcula el scope efectivo para OBRA: POs seleccionadas (con su NOV) + remanente.
function getCertSelectionScope(cid){
  const c=window.DB.find(x=>x.id===cid);
  if(!c||c.tipo!=='OBRA') return null;
  const poData=ME2N[c.num];
  const pos=(poData&&Array.isArray(poData)&&Array.isArray(poData[2]))?poData[2]:[];
  const totalCerts=pos.reduce((s,p)=>s+(p[3]||0),0);
  const aves=c.aves||[];
  const avePoly=aves.filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
  const aveOwner=aves.filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const montoBase=c.montoBase||((c.monto||0)-avePoly-aveOwner);
  const remanente=Math.max(0,montoBase-totalCerts);
  const sel=getStoredScopeSelection(cid);
  const selSet={}; (sel.pos||[]).forEach(po=>{selSet[po]=true;});
  const selected=pos.filter(p=>selSet[p[0]||'']).map(p=>({po:p[0]||'', nov:p[3]||0}));
  const includeRemanente=!!sel.includeRemanente;
  const totalSelected=selected.reduce((s,r)=>s+(r.nov||0),0);
  const totalBase=totalSelected+(includeRemanente?remanente:0);
  return {pos:selected, includeRemanente, remanente, totalSelected, totalBase, montoBase, totalCerts};
}
// ── Metadata por PO para OBRA: período de certificación real (independiente de la
// Document Date de la PO) y si esa PO representa avance de obra o no (ej. una compra
// de materiales extra no avanza obra aunque tenga NOV). Vive en cc.poMeta[poNum],
// separado de la tupla ME2N para no tocar la estructura de importación SAP. ─────────
function _setPoMetaField(cid, poNum, field, value){
  const c=window.DB.find(x=>x.id===cid); if(!c) return null;
  if(!c.poMeta) c.poMeta={};
  if(!c.poMeta[poNum]) c.poMeta[poNum]={};
  c.poMeta[poNum][field]=value;
  c.updatedAt=new Date().toISOString();
  try{ localStorage.setItem('cta_v7', JSON.stringify(window.DB)); }catch(_e){}
  if(typeof save==='function') save();
  return c;
}
// Variantes "normales" (panel Certificaciones/POs): re-renderizan todo el detalle.
function setPoCertPeriod(cid, poNum, dateVal){
  if(!_setPoMetaField(cid,poNum,'certPeriod',dateVal||null)){toast('Contrato no encontrado','er');return;}
  if(typeof renderDet==='function') renderDet();
}
function setPoCountsAsProgress(cid, poNum, checked){
  if(!_setPoMetaField(cid,poNum,'countsAsProgress',!!checked)){toast('Contrato no encontrado','er');return;}
  if(typeof renderDet==='function') renderDet();
}
// Variantes "en formulario" (dentro del panel de Nueva Enmienda): NO se puede llamar a
// renderDet() ahí — cerraría/perdería el formulario de enmienda en progreso. Solo se
// recalcula el breakdown de avance de obra y el AVE sugerido (calcAveSugAll).
function setPoCertPeriodInForm(cid, poNum, dateVal){
  if(!_setPoMetaField(cid,poNum,'certPeriod',dateVal||null)){toast('Contrato no encontrado','er');return;}
  calcAveSugAll();
}
function setPoCountsAsProgressInForm(cid, poNum, checked){
  if(!_setPoMetaField(cid,poNum,'countsAsProgress',!!checked)){toast('Contrato no encontrado','er');return;}
  calcAveSugAll();
}
// Resuelve la Document Date de una PO con la mejor precisión disponible. El import
// ME2N normalmente trunca la fecha a mes (p[1]) y descarta el día — pero en algunos
// exports la celda de "Short Text" (p[6]) termina conteniendo directamente la fecha
// completa (con hora), no texto real. En vez de mostrar ese valor como si fuera una
// descripción (ilegible, tipo "Tue Jan 13 2026 00:00:48 GMT-0300..."), se intenta
// parsear como fecha; si funciona, se usa esa precisión de día para autocompletar el
// Período de Certificación. Si no, cae al mes (p[1]) con el día 01.
function resolvePoDocDate(p){
  const raw=p&&p[6];
  if(raw){
    const d=new Date(raw);
    if(!isNaN(d.getTime())) return d.toISOString().substring(0,10);
  }
  const ym=p&&p[1];
  if(ym&&/^\d{4}-\d{2}$/.test(ym)) return ym+'-01';
  return '';
}
// Calcula, para un contrato OBRA, qué % del monto base ya fue "consumido" (certificado)
// ANTES del período de actualización de tarifa (newYm) — solo cuenta POs marcadas como
// avance de obra (countsAsProgress, default true) y usa el Período de Certificación
// cargado en poMeta; si no está cargado, cae a la Document Date de la PO (ver
// resolvePoDocDate) marcando ese fallback explícitamente para que se vea en la UI. El %
// pendiente (100 - avance) es la base proporcional real sobre la que corresponde aplicar
// el nuevo % polinómico — así una obra que ya avanzó 90% antes de marzo solo actualiza el
// 10% remanente, en vez de todo el contrato.
function computeObraAvanceCert(cc, newYm){
  const poData=ME2N[cc.num];
  const pos=(poData&&Array.isArray(poData)&&Array.isArray(poData[2]))?poData[2]:[];
  const poMeta=cc.poMeta||{};
  const avePolyPrev=(cc.aves||[]).filter(a=>a.tipo==='POLINOMICA').reduce((s,a)=>s+(a.monto||0),0);
  const aveOwnerPrev=(cc.aves||[]).filter(a=>a.tipo==='OWNER').reduce((s,a)=>s+(a.monto||0),0);
  const montoBase=cc.montoBase||cc._montoOriginal||((cc.monto||0)-avePolyPrev-aveOwnerPrev);
  const detalle=[];
  let consumido=0;
  pos.forEach(p=>{
    const poNum=p[0]||'';
    const meta=poMeta[poNum]||{};
    const countsAsProgress=meta.countsAsProgress!==false; // default: sí cuenta
    const certYm=meta.certPeriod?String(meta.certPeriod).substring(0,7):'';
    const docIso=resolvePoDocDate(p);
    const docYm=p[1]||'';
    const usedYm=certYm||(docIso?docIso.substring(0,7):docYm);
    const isFallback=!certYm;
    const nov=p[3]||0;
    const incluido=!!(countsAsProgress && usedYm && newYm && usedYm<newYm);
    if(incluido) consumido+=nov;
    detalle.push({po:poNum, nov, certYm, certPeriodFull:meta.certPeriod||docIso||'', docIso, docYm, usedYm, isFallback, countsAsProgress, incluido});
  });
  const avancePct=montoBase>0?Math.min(100,(consumido/montoBase)*100):0;
  const pendientePct=Math.max(0,100-avancePct);
  return {consumido, montoBase, avancePct, pendientePct, detalle};
}
// Quita la marca de "ajustada" de una PO. NO revierte el AVE/enmienda registrados (auditoría).
function unadjustPo(cid, poNum){
  const c=window.DB.find(x=>x.id===cid); if(!c){toast('Contrato no encontrado','er');return;}
  const meta=c.posAjustadasMeta&&c.posAjustadasMeta[poNum];
  const lbl=meta?(' (ajustada en '+(meta.ym||'?')+' · Enm.'+(meta.enm||'?')+')'):'';
  if(!confirm('¿Destildar la PO '+poNum+lbl+' como ajustada?\n\nEsto solo quita la marca para permitir re-incluirla en futuros ajustes. NO revierte el AVE ni la enmienda ya registrados (quedan en el historial).'))return;
  if(c.posAjustadas){
    const i=c.posAjustadas.indexOf(poNum);
    if(i>=0) c.posAjustadas.splice(i,1);
  }
  if(c.posAjustadasMeta && c.posAjustadasMeta[poNum]) delete c.posAjustadasMeta[poNum];
  try{ if(typeof sbUpsertItem==='function') sbUpsertItem(c); }catch(_e){}
  try{ localStorage.setItem('cta_v7', JSON.stringify(window.DB)); }catch(_e){}
  if(typeof save==='function') save();
  if(typeof renderDet==='function') renderDet();
  toast('PO '+poNum+' destildada','ok');
}
// ═══════════ RENDERLIST WITH REMANENTE ══════════════════
// ═══════════ TARIFARIO ENHANCED ══════════════════════════
let _tarTab=0,_tarPeriod=null,_tarEnm=null,_tarSort={ci:null,dir:1};
function getTarPeriodValue(cc,t){return t?.period||cc?.btar||cc?.fechaIni?.substring(0,7)||'';}
function getLastTariffPeriod(cc){
  if(!cc||!cc.tarifarios||!cc.tarifarios.length)return null;
  const periods=cc.tarifarios.map(t=>getTarPeriodValue(cc,t)).filter(Boolean).sort();
  return periods.length?periods[periods.length-1]:null;
}
function getTarEnmLabel(cc,enmNum){if(!enmNum)return 'Base contractual';const enm=(cc.enmiendas||[]).find(e=>e.num===enmNum);if(!enm)return 'Enm.N°'+enmNum;const _lbl={ACTUALIZACION_TARIFAS:'Actualización de Tarifas',EXTENSION:'Extensión',SCOPE:'Scope',CLAUSULAS:'Cláusulas',OTRO:'Otro'};const tipo=enmTipos(enm).map(t=>_lbl[t]||'Otro').join(' + ');return 'Enm.N°'+enmNum+' · '+tipo;}
function setTarPeriod(period){_tarPeriod=period;_tarTab=0;renderTarifario();}
function setTarEnm(key){_tarEnm=key;_tarPeriod=null;_tarTab=0;renderTarifario();}
function renderTarifario(){
  const box=document.getElementById('tarContainer');if(!box)return;
  const cc=window.DB.find(x=>x.id===window.detId);if(!cc)return;
  const raw=getTar();
  const importCtl = '<input type="file" id="tarAiIn" accept=".doc,.docx,.xls,.xlsx" style="display:none" onchange="importPriceListsFromFiles(this.files);this.value=\'\'">';
  const topActions = `<div class="tar-actions" style="margin-bottom:10px;border:1px solid var(--g200);border-radius:8px;background:var(--g50)"><button class="btn btn-p btn-sm" onclick="openPriceListImportPicker()">🤖 Importar listas (Word/Excel)</button><button class="btn btn-s btn-sm" onclick="addTarTable()">➕ Nueva tabla</button><button class="btn btn-g btn-sm" onclick="saveTarifarios()">💾 Guardar ahora</button>${raw.length?'<span style="margin-left:auto;font-size:11px;color:var(--g500)">Editá precios inline, agregá/borrá filas o eliminá la tabla seleccionada.</span>':''}</div>`;
  if(!raw.length){box.innerHTML=importCtl+topActions+'<div class="empty" style="padding:28px"><div class="ei">💲</div><p>Sin listas de precios. Importá desde Word/Excel con IA o creá una tabla manual.</p></div>';return;}
  const all=raw.map((t,i)=>({...t,_idx:i,_period:getTarPeriodValue(cc,t)}));

  // Agrupación principal: por ENMIENDA (clave estable '0' = Base contractual,
  // sin enmienda asociada). Dentro de cada enmienda, sub-navegación por período
  // solo si esa enmienda tiene tablas en más de un mes — así el orden lógico es
  // Enmienda → Período, en vez de una lista plana de meses sin contexto.
  const enmKeys=[...new Set(all.map(t=>String(t.enmNum||0)))].sort((a,b)=>Number(a)-Number(b));
  if(!_tarEnm||!enmKeys.includes(_tarEnm)){
    const byPeriod=[...all].sort((a,b)=>(a._period||'').localeCompare(b._period||''));
    _tarEnm=byPeriod.length?String(byPeriod[byPeriod.length-1].enmNum||0):enmKeys[enmKeys.length-1];
  }
  const enmGroup=all.filter(t=>String(t.enmNum||0)===_tarEnm);
  let periods=[...new Set(enmGroup.map(t=>t._period).filter(Boolean))].sort();
  if(!periods.length){const fallback=cc.btar||cc.fechaIni?.substring(0,7)||'';if(fallback)periods=[fallback];}
  if(!_tarPeriod||!periods.includes(_tarPeriod))_tarPeriod=periods[periods.length-1]||periods[0]||null;
  const visible=enmGroup.filter(t=>t._period===_tarPeriod);
  let h=importCtl+topActions;
  h+='<div class="tar-enm-nav">';
  enmKeys.forEach(k=>{h+=`<button class="tar-enm-chip ${k===_tarEnm?'act':''}" onclick="setTarEnm('${k}')">${esc(k==='0'?'Base contractual':getTarEnmLabel(cc,Number(k)))}</button>`;});
  h+='</div>';
  if(!visible.length){box.innerHTML=h+'<div class="empty" style="padding:28px"><div class="ei">💲</div><p>Sin tablas para esta enmienda.</p></div>';return;}
  const di=Math.min(_tarTab||0,visible.length-1);const t=visible[di];_tarTab=di;
  const periodLabel=_tarPeriod?formatMonth(_tarPeriod):'Sin período';
  if(periods.length>1){
    h+='<div class="tar-period-nav">';
    periods.forEach(p=>{h+=`<button class="tar-period-chip ${p===_tarPeriod?'act':''}" onclick="setTarPeriod('${p}')">${formatMonth(p)}</button>`;});
    h+='</div>';
  }
  h+=`<div class="tar-period-meta"><span class="tar-period-tag" onclick="changeTarPeriod(${t?t._idx:0})" style="cursor:pointer" title="Click para cambiar el mes de aplicación de la tabla seleccionada">Período: ${periodLabel} ✏️</span></div>`;
  h+='<div class="tar-tabs">';
  visible.forEach((tab,vi)=>{h+=`<div class="tar-tab ${vi===di?'act':''}" onclick="switchTarTab(${vi})"><span>${esc(tab.name)}</span><span class="tar-x" onclick="event.stopPropagation();delTarTable(${tab._idx})">✕</span></div>`;});
  h+='<button class="tar-add" onclick="addTarTable()" title="Nueva tabla">+</button></div>';
  if(t&&t.cols&&t.rows){
    let rows=[...t.rows];
    if(_tarSort.ci!==null){const ci=_tarSort.ci,dir=_tarSort.dir;rows.sort((a,b)=>{const av=a[ci]??'',bv=b[ci]??'';const an=parseFloat(av),bn=parseFloat(bv);if(!isNaN(an)&&!isNaN(bn))return(an-bn)*dir;return String(av).localeCompare(String(bv))*dir;});}
    h+='<div class="tar-wrap"><div style="overflow-x:auto;position:relative"><table class="tar-tbl"><thead><tr>';
    t.cols.forEach((col,ci)=>{const on=_tarSort.ci===ci,ico=on?(_tarSort.dir===1?'↑':'↓'):'↕',isN=isNumericCol(t,ci);h+=`<th onclick="sortTar(${ci})"><span>${esc(col)}</span><span class="tsi ${on?'on':''}">${ico}</span>${isN?'<span style="font-size:8px;opacity:.25;margin-left:2px">#</span>':''}<button class="col-del" onclick="event.stopPropagation();delTarCol(${t._idx},${ci})">✕</button></th>`;});
    h+='<th style="width:36px;background:var(--g200)"></th></tr></thead><tbody>';
    rows.forEach((row,ri)=>{const origRi=t.rows.indexOf(row);h+='<tr>';t.cols.forEach((col,ci)=>{const isN=isNumericCol(t,ci),raw=row[ci];const dv=isN&&raw!==''&&raw!=null?fN(raw):String(raw??'');h+=`<td><input type="text" class="${isN?'num':''}" value="${esc(dv)}" onchange="editTarCell(${t._idx},${origRi>=0?origRi:ri},${ci},this.value)"></td>`;});h+=`<td style="border:none;position:relative"><button class="btn btn-d btn-sm" style="position:absolute;left:4px;top:50%;transform:translateY(-50%);padding:3px 6px;font-size:10px" onclick="delTarRow(${t._idx},${origRi>=0?origRi:ri})">✕</button></td></tr>`;});
    h+='</tbody></table></div>';
    h+=`<div class="tar-actions"><button class="btn btn-p btn-sm" onclick="openPriceListImportPicker()">🤖 Importar listas</button><button class="btn btn-s btn-sm" onclick="addTarRow(${t._idx})">＋ Fila</button><button class="btn btn-s btn-sm" onclick="addTarCol(${t._idx})">＋ Columna</button><button class="btn btn-s btn-sm" onclick="renameTarTable(${t._idx})">✏️ Renombrar</button><button class="btn btn-a btn-sm" onclick="changeTarPeriod(${t._idx})" title="Cambiar mes de aplicación de esta lista">📅 Cambiar período</button><button class="btn btn-d btn-sm" onclick="delTarTable(${t._idx})">🗑️ Eliminar tabla seleccionada</button><button class="btn btn-s btn-sm" onclick="_tarSort={ci:null,dir:1};renderTarifario()">↺ Sin orden</button><span style="margin-left:auto;font-size:11px;color:var(--g500)">${rows.length} ítems · ${esc(t.sourceFileName||'origen manual')}</span></div></div>`;
  }
  box.innerHTML=h;
}
function switchTarTab(i){_tarTab=i;renderTarifario();}
function sortTar(ci){if(_tarSort.ci===ci)_tarSort.dir*=-1;else{_tarSort.ci=ci;_tarSort.dir=1;}renderTarifario();}

// ═══════════════════════════════════════════════════════════════════════
//  MASTER DE ÍNDICES — Motor completo (v3, 100% manual + archivos)
// ═══════════════════════════════════════════════════════════════════════

// ── Definición estática de índices del sistema ─────────────────────────
