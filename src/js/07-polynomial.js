
// ═══════════ MÓDULO ACTUALIZACIÓN POLINÓMICA ═══════════════════════════════
var PolUpdate = (function(){
  var state = { contractId: null, baseData: null, conditions: null, currentPrices: [], updatedPrices: [], aveAmount: 0, newMonthlyEstimate: 0 };
  
  function getConditions(cid){ 
    var key='pol_cond_'+cid; 
    var stored=localStorage.getItem(key); 
    if(!stored){
      // MIGRAR desde gatillos si existen
      var contract=window.DB.find(function(c){return c.id==cid;});
      if(contract&&contract.gatillos){
        return migrateFromGatillos(contract);
      }
      return null;
    }
    try{return JSON.parse(stored);}catch(e){return null;} 
  }
  
  function migrateFromGatillos(contract){
    var g=contract.gatillos;
    if(!g)return null;
    var cond={
      enabled:true,
      moThreshold:0,
      allComponentsThreshold:0,
      monthsElapsed:0,
      baseDate:contract.fechaIni||contract.btar,
      lastUpdateDate:null,
      resetBase:false
    };
    // Gatillo A: CCT (ignorar por ahora)
    // Gatillo B: Variación acumulada
    if(g.B&&g.B.enabled){
      cond.allComponentsThreshold=parseFloat(g.B.threshold)||0;
    }
    // Gatillo C: Meses transcurridos
    if(g.C&&g.C.enabled){
      cond.monthsElapsed=parseInt(g.C.months)||0;
    }
    return cond;
  }
  
  function saveConditions(cid,data){ 
    localStorage.setItem('pol_cond_'+cid,JSON.stringify(data)); 
    // También guardar en contract.gatillos para compatibilidad
    var contract=window.DB.find(function(c){return c.id==cid;});
    if(contract){
      if(!contract.gatillos)contract.gatillos={};
      contract.gatillos.B={
        enabled:data.allComponentsThreshold>0,
        threshold:data.allComponentsThreshold
      };
      contract.gatillos.C={
        enabled:data.monthsElapsed>0,
        months:data.monthsElapsed
      };
      save();
    }
  }
  
  function checkConditions(contract,conditions){
    if(!conditions||!conditions.enabled)return{met:false,reasons:[]};
    var reasons=[]; var met=false;
    if(conditions.moThreshold&&conditions.moThreshold>0){
      var moSnap=getLatestIndicator('mo');
      if(moSnap&&moSnap.value){
        var baseSnap=getIndicatorAtDate('mo',conditions.baseDate||contract.fechaIni);
        if(baseSnap&&baseSnap.value){
          var inc=((moSnap.value-baseSnap.value)/baseSnap.value)*100;
          if(inc>=conditions.moThreshold){ met=true; reasons.push('MO +'+inc.toFixed(2)+'%'); }
        }
      }
    }
    if(conditions.allComponentsThreshold&&conditions.allComponentsThreshold>0){
      var allMet=true; var poly=contract.poly;
      if(poly&&poly.length){
        poly.forEach(function(c){
          if(!c.idx)return;
          var snap=getLatestIndicator(c.idx); var base=getIndicatorAtDate(c.idx,conditions.baseDate||contract.fechaIni);
          if(!snap||!base||!snap.value||!base.value){ allMet=false; return; }
          var inc=((snap.value-base.value)/base.value)*100;
          if(inc<conditions.allComponentsThreshold)allMet=false;
        });
        if(allMet){ met=true; reasons.push('Todos >'+conditions.allComponentsThreshold+'%'); }
      }
    }
    if(conditions.monthsElapsed&&conditions.monthsElapsed>0){
      var lastUpdate=conditions.lastUpdateDate||contract.fechaIni;
      var monthsDiff=monthsBetween(lastUpdate,ymToday());
      if(monthsDiff>=conditions.monthsElapsed){ met=true; reasons.push(monthsDiff+' meses'); }
    }
    return{met:met,reasons:reasons};
  }
  
  function getLatestIndicator(code){
    var snaps=JSON.parse(localStorage.getItem('indicator_snapshots')||'[]');
    var filtered=snaps.filter(function(s){return s.indicator_code===code;});
    if(!filtered.length)return null;
    filtered.sort(function(a,b){return new Date(b.snapshot_date)-new Date(a.snapshot_date);});
    return filtered[0];
  }
  
  function getIndicatorAtDate(code,date){
    var snaps=JSON.parse(localStorage.getItem('indicator_snapshots')||'[]');
    var filtered=snaps.filter(function(s){return s.indicator_code===code&&s.snapshot_date<=date;});
    if(!filtered.length)return null;
    filtered.sort(function(a,b){return new Date(b.snapshot_date)-new Date(a.snapshot_date);});
    return filtered[0];
  }
  
  function monthsBetween(d1,d2){
    var start=new Date(d1+'T00:00:00'); var end=new Date(d2+'T00:00:00');
    return(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
  }
  
  function calculateUpdate(contract){
    state.contractId=contract.id; state.baseData=contract; state.conditions=getConditions(contract.id);
    if(!contract.poly||!contract.poly.length)return null;
    var poly=contract.poly.filter(function(p){return p.idx;});
    var baseDate=state.conditions?(state.conditions.baseDate||contract.fechaIni):contract.fechaIni;
    var tars=getTar()||[]; var currentList=tars.filter(function(t){return t.period===contract.btar||(!t.period&&tars.indexOf(t)===0);});
    state.currentPrices=currentList.length&&currentList[0].rows?currentList[0].rows.map(function(r){return{description:r[1]||'',unit:r[2]||'',quantity:parseFloat(r[3])||1,unit_price:parseFloat(r[3])||0};}):[{description:'Item base',unit:'UN',quantity:1,unit_price:contract.monto||0}];
    // Ko: leer directo de IDX_STORE (idxRows) — evita datos stale de indicator_snapshots
    // Fórmula polinómica lineal: Ko = Σ inc_i × (1 + var_i%/100) — misma convención que
    // calcularKo() (Calculadora Ko, 09-patch.js) y computePoliDeltaPct() de este archivo.
    var Ko=0;
    var baseYm=ymOf(baseDate), evalYm=ymOf(ymToday());
    poly.forEach(function(c){
      var inc=Number(c.inc)||0;
      var contrib=1; // sin datos de variación: no aporta cambio para esa porción
      var rows=safeIdxRows(c.idx);
      if(rows.length){
        // Modo pct compuesto (IPC, IPIM, etc.) — needsReview: dato auto-obtenido que no pasó
        // las validaciones de plausibilidad (05-indices.js validateIdxRow), nunca debe entrar
        // solo a un cálculo de AVE sin revisión manual.
        var monthRows=rows.filter(function(r){ return r.ym&&compareYm(r.ym,baseYm)>0&&compareYm(r.ym,evalYm)<=0&&r.pct!=null&&isFinite(Number(r.pct))&&!r.needsReview; });
        if(monthRows.length){
          var acc=1; monthRows.forEach(function(r){ acc*=1+(Number(r.pct)/100); }); contrib=acc;
        } else {
          // Fallback ratio de valores absolutos (USD, gasoil)
          var bRow=rows.filter(function(r){ return r.ym&&compareYm(r.ym,baseYm)<=0&&r.value!=null&&Number(r.value)>0&&!r.needsReview; }).sort(function(a,b){ return b.ym.localeCompare(a.ym); })[0];
          var eRow=rows.filter(function(r){ return r.ym&&compareYm(r.ym,evalYm)<=0&&r.value!=null&&Number(r.value)>0&&!r.needsReview; }).sort(function(a,b){ return b.ym.localeCompare(a.ym); })[0];
          if(bRow&&eRow&&Number(bRow.value)>0){ contrib=Number(eRow.value)/Number(bRow.value); }
        }
      }
      Ko+=inc*contrib;
    });
    state.updatedPrices=state.currentPrices.map(function(item){
      var newPrice=item.unit_price*Ko;
      return{description:item.description,unit:item.unit,quantity:item.quantity,unit_price:newPrice,old_price:item.unit_price,variation:Ko>0?((Ko-1)*100):0};
    });
    var contractMonths=monthDiffInclusive(contract.fechaIni,contract.fechaFin)||parseInt(contract.plazo_meses||contract.plazo||0)||1;
    var oldMonthly=(contract.monto||0)/contractMonths;
    var newMonthly=state.updatedPrices.reduce(function(sum,p){return sum+(p.unit_price*p.quantity);},0);
    var monthsRemaining=monthsRemainingInclusive(ymToday(),contract.fechaFin);
    state.aveAmount=(newMonthly-oldMonthly)*monthsRemaining; state.newMonthlyEstimate=newMonthly; state.Ko=Ko; state.baseDate=baseDate;
    return{updatedPrices:state.updatedPrices,aveAmount:state.aveAmount,newMonthlyEstimate:newMonthly,oldMonthlyEstimate:oldMonthly,monthsRemaining:monthsRemaining,Ko:Ko};
  }
  
  async function applyUpdate(){
    console.log('[applyUpdate] inicio', {contractId:state.contractId, hasBase:!!state.baseData, Ko:state.Ko});
    if(!state.contractId||!state.baseData){
      toast('No hay actualización calculada. Usá "Calcular actualización polinómica" primero.','er');
      return;
    }
    var contract=state.baseData; var updateDate=ymToday();
    var enms=(contract.enmiendas||[]).slice();
    var koDecimal=(state.Ko||1)-1;
    var basePer=state.baseDate||(state.conditions?(state.conditions.baseDate||contract.fechaIni):contract.fechaIni);
    var newEnm={num:(enms.length+1),tipo:'ACTUALIZACION_TARIFAS',fecha:updateDate,motivo:'Actualización automática por fórmula polinómica',pctPoli:koDecimal,basePeriodo:basePer,nuevoPeriodo:updateDate,ko:state.Ko||1};
    enms.push(newEnm); contract.enmiendas=enms;
    console.log('[applyUpdate] enmienda agregada N°', newEnm.num, '· total enmiendas:', enms.length);
    var tars=getTar()||[]; var baseTar=tars.find(function(t){return t.period===(state.conditions?(state.conditions.baseDate||contract.btar):contract.btar);});
    if(baseTar){
      var newTar={name:baseTar.name+' ACT',cols:baseTar.cols||['Item','Descripción','Unidad','Precio'],rows:state.updatedPrices.map(function(p){return['',p.description,p.unit,p.unit_price];}),period:updateDate,source:'POLINOMICA',importedAt:new Date().toISOString(),editable:true};
      tars.push(newTar); contract.tarifarios=tars;
    }
    var aves=(contract.aves||[]).slice();
    var newAve={id:Date.now()+'',tipo:'POLINOMICA',enmRef:newEnm.num,fecha:updateDate,periodo:updateDate,monto:state.aveAmount,concepto:'AVE por actualización polinómica',autoGenerated:true};
    aves.push(newAve); contract.aves=aves;
    contract.monto=(contract.monto||0)+state.aveAmount;
    contract.updatedAt=new Date().toISOString();
    var idx=window.DB.findIndex(function(c){return c.id===contract.id;}); if(idx!==-1)window.DB[idx]=contract;
    // Fallback localStorage SIEMPRE para no perder datos si Supabase falla
    try{ localStorage.setItem('cta_v7', JSON.stringify(window.DB)); }catch(_e){}
    try{
      await save();
      console.log('[applyUpdate] ✓ guardado en Supabase');
    }catch(err){
      console.error('[applyUpdate] save() falló:', err);
      toast('⚠ Enmienda guardada localmente. Error al sincronizar con Supabase.','er');
    }
    if(state.conditions){
      state.conditions.lastUpdateDate=updateDate;
      if(state.conditions.resetBase)state.conditions.baseDate=updateDate;
      saveConditions(contract.id,state.conditions);
    }
    toast('✓ Enmienda N°'+newEnm.num+' registrada · AVE '+fN(state.aveAmount),'ok');
    verDet(contract.id);
    if (typeof window.initFuzzySearch === 'function') {
      window.initFuzzySearch();
    }
  }
  
  return{getConditions:getConditions,saveConditions:saveConditions,checkConditions:checkConditions,calculateUpdate:calculateUpdate,applyUpdate:applyUpdate};
})();

// ── Overrides manuales para simular condiciones de gatillo ─────────────────
// Cuando un concepto de la fórmula polinómica no tiene fuente automática
// (ej. FADEAAC, IPC NQN) ni carga manual cargada en el módulo de Índices
// hasta el mes de evaluación, se permite ingresar acá el % acumulado a mano
// SOLO para simular si corresponde o no la actualización — nunca se usa para
// calcular el Ko real que se aplica en "Calcular actualización polinómica"
// (eso sigue exigiendo datos reales/confirmados, ver computePoliDeltaPct).
function getPolyOverrides(cid){
  try{ return JSON.parse(localStorage.getItem('pol_manual_pct_'+cid)||'{}')||{}; }catch(e){ return {}; }
}
function savePolyOverride(cid, idxLabel, pct){
  var ov=getPolyOverrides(cid);
  if(pct===null||pct===''||pct===undefined) delete ov[idxLabel];
  else ov[idxLabel]=Number(pct);
  localStorage.setItem('pol_manual_pct_'+cid, JSON.stringify(ov));
}
function applyPolyOverride(cid, idxLabel, rawValue){
  if(rawValue===''||rawValue==null){ savePolyOverride(cid,idxLabel,null); toast('Override quitado para '+idxLabel,'ok'); }
  else{
    var v=Number(rawValue);
    if(!isFinite(v)){ toast('% inválido','er'); return; }
    savePolyOverride(cid,idxLabel,v);
    toast('% manual aplicado a '+idxLabel+': '+(v>=0?'+':'')+v+'%','ok');
  }
  if(typeof window.detId!=='undefined') window.detId=cid;
  if(typeof renderDet==='function'){ renderDet(); }
  else if(typeof go==='function'){ go('detail'); }
}

// ── Período base editable por el usuario para el estado en vivo ────────────
// Por defecto se usa el último período tarifario/ajustado del contrato, pero
// el usuario puede fijar otro (ej. para simular contra una base distinta).
function getPolyLiveBase(cid){
  var v=localStorage.getItem('pol_live_base_'+cid);
  return v?ymOf(v):'';
}
function setPolyLiveBase(cid, value){
  var ym=ymOf(value);
  if(!ym){ localStorage.removeItem('pol_live_base_'+cid); }
  else{ localStorage.setItem('pol_live_base_'+cid, ym); }
  if(typeof window.detId!=='undefined') window.detId=cid;
  if(typeof renderDet==='function'){ renderDet(); }
  else if(typeof go==='function'){ go('detail'); }
}
// ── Mes de evaluación editable — el usuario define para qué período quiere
// ver si las condiciones se cumplen. Por defecto es hoy, pero es una
// simulación pura: no persiste nada ni dispara ninguna generación real.
function getPolyLiveEval(cid){
  var v=localStorage.getItem('pol_live_eval_'+cid);
  return v?ymOf(v):'';
}
function setPolyLiveEval(cid, value){
  var ym=ymOf(value);
  if(!ym){ localStorage.removeItem('pol_live_eval_'+cid); }
  else{ localStorage.setItem('pol_live_eval_'+cid, ym); }
  if(typeof window.detId!=='undefined') window.detId=cid;
  if(typeof renderDet==='function'){ renderDet(); }
  else if(typeof go==='function'){ go('detail'); }
}
// ── Aumentos mensuales de Mano de Obra / CCT — a diferencia de los otros
// ── Evaluación de condiciones (pura, sin DOM) — usada por el estado en vivo
// (visualización, sin efectos secundarios). Acepta overrides manuales para
// conceptos sin datos automáticos. ──────────────────────────────────────
function isMoLabel(label){ return (IDX['Mano de Obra']||[]).indexOf(label)>=0; }

function computeConditionsResult(contract, conditions, baseMonth, mesEval, overrides){
  if(!conditions||!baseMonth||!mesEval||compareYm(mesEval,baseMonth)<=0) return null;
  overrides=overrides||{};
  var details=[];
  var cumpleGeneral=false;
  var firstComplianceMonth='';

  // ── Gatillo A: Mano de Obra / CCT (mes específico) ─────────────────────
  // No es un % acumulado como los otros gatillos: un aumento de paritaria se
  // otorga en un mes puntual. Se evalúa 100% desde lo cargado en el Master
  // de Índices (cat 'mo' — PP, UOCRA, etc., carga manual ahí mismo) — apenas
  // aparezca un mes con variación > 0% en el rango base→evaluación, ese mes
  // gatilla la actualización. Solo aplica si el contrato tiene activado el
  // gatillo A ("Actualización de Mano de Obra según CCT asociado").
  var trigAEnabled=!!(contract.trigA||(contract.gatillos&&contract.gatillos.A&&contract.gatillos.A.enabled));
  if(trigAEnabled){
    var moLabels=(contract.poly||[]).filter(function(p){return p&&p.idx&&isMoLabel(p.idx);}).map(function(p){return p.idx;});
    if(moLabels.length){
      var moDetail=[];
      var firstMoMonth='';
      var anyMoEntry=false;
      moLabels.forEach(function(label){
        var snaps=getIndicatorSnapshots(label).filter(function(s){
          var ym=ymOf(s.snapshot_date);
          return ym && compareYm(ym,baseMonth)>0 && compareYm(ym,mesEval)<=0;
        }).sort(function(a,b){return String(a.snapshot_date).localeCompare(String(b.snapshot_date));});
        var raise=snaps.find(function(s){ var v=Number(s.pct); return isFinite(v)&&v>0; });
        var labelFirst=raise?ymOf(raise.snapshot_date):'';
        var acc=null;
        if(snaps.length){
          var prod=1; snaps.forEach(function(s){ var v=Number(s.pct); if(isFinite(v)) prod*=1+(v/100); });
          acc=(prod-1)*100;
        }
        moDetail.push({idx:label, pctAcc:acc, firstMonth:labelFirst, monthsLoaded:snaps.length});
        if(labelFirst){ anyMoEntry=true; if(!firstMoMonth||compareYm(labelFirst,firstMoMonth)<0) firstMoMonth=labelFirst; }
      });
      details.push({
        condicion:'Actualización por Mano de Obra / CCT (mes específico)',
        cumplimiento:anyMoEntry?1:0,
        cumplido:anyMoEntry,
        moDetail:moDetail,
        detalle:anyMoEntry
          ?('Aumento cargado en Índices en '+formatYmLabel(firstMoMonth))
          :('Sin aumentos cargados en el Master de Índices entre '+formatYmLabel(baseMonth)+' y '+formatYmLabel(mesEval)+' para: '+moLabels.join(', ')),
        firstMet:firstMoMonth||''
      });
      if(anyMoEntry){ cumpleGeneral=true; if(!firstComplianceMonth) firstComplianceMonth=firstMoMonth; }
    }
  }

  if(conditions.allComponentsThreshold>0 && (contract.poly||[]).some(function(p){return p.idx;})){
    var poly=(contract.poly||[]).filter(function(p){return p.idx;});
    var perIdx=[];
    var countPoly=0;
    var anyMissing=false;
    poly.forEach(function(p){
      var calc=computeAccumulatedVariationPct(p.idx, baseMonth, mesEval);
      var manual=false, variacion=null;
      if(calc && isFinite(calc.pct)){
        variacion=calc.pct;
      } else if(overrides[p.idx]!=null && isFinite(Number(overrides[p.idx]))){
        variacion=Number(overrides[p.idx]); manual=true;
      }
      var incWeight=Number(p.inc)||0;
      if(variacion!=null){
        countPoly++;
        // Fórmula polinómica lineal: aporte_i = inc_i × var_i% (misma convención que
        // calcularKo() en 09-patch.js y calculateUpdate()/computePoliDeltaPct() en este archivo).
        var aporte=incWeight*variacion;
        perIdx.push({idx:p.idx, pct:variacion, manual:manual, hasData:true, inc:incWeight*100, aporte:aporte});
      } else {
        anyMissing=true;
        perIdx.push({idx:p.idx, pct:null, manual:false, hasData:false, inc:incWeight*100, aporte:null});
      }
    });
    if(countPoly>0){
      // El gatillo es sobre el Ko COMBINADO de la fórmula (todos los conceptos
      // ponderados por su % de incidencia), no sobre cada concepto por separado —
      // un concepto de baja incidencia no puede tapar a uno que ya superó el umbral.
      var koTotal=null, cumpleUmbral=false;
      if(!anyMissing){
        koTotal=perIdx.reduce(function(k,d){return k+d.aporte;},0);
        cumpleUmbral=koTotal>=conditions.allComponentsThreshold;
      }
      // firstComplianceMonth: primer mes (desde baseMonth+1 hasta mesEval) donde el Ko
      // combinado supera el umbral — solo se puede escanear con datos 100% automáticos
      // (computePoliDeltaPct no acepta overrides, un override es un único valor "hasta
      // el mes de evaluación", no una serie mensual, así que no sirve para reconstruir
      // meses pasados).
      if(!anyMissing){
        try{
          var scanFromYm=nextYm(ymOf(baseMonth));
          var scanToYm=ymOf(mesEval);
          var scanCur=scanFromYm;
          while(scanCur && compareYm(scanCur, scanToYm)<=0){
            var cumPct=computePoliDeltaPct(contract, ymOf(baseMonth), scanCur);
            if(cumPct!=null && isFinite(cumPct) && cumPct>=conditions.allComponentsThreshold){
              firstComplianceMonth=scanCur;
              break;
            }
            scanCur=nextYm(scanCur);
          }
        }catch(_e){ console.warn('firstComplianceMonth scan',_e); }
      }
      details.push({
        condicion:'Variación acumulada (Ko) ≥ '+conditions.allComponentsThreshold+'%',
        cumplimiento:koTotal!=null?Math.min(Math.max(koTotal/conditions.allComponentsThreshold,0),1):0,
        cumplido:cumpleUmbral,
        perIdx:perIdx,
        anyMissing:anyMissing,
        koTotal:koTotal,
        detalle:'Base '+formatYmLabel(baseMonth)+' → Eval '+formatYmLabel(mesEval)+' | '+perIdx.map(function(d){
          if(!d.hasData) return d.idx+': sin datos ⚠️';
          return d.idx+': '+(d.pct>=0?'+':'')+d.pct.toFixed(2)+'%'+(d.manual?' (manual)':'');
        }).join(' | '),
        firstMet:firstComplianceMonth||''
      });
      if(cumpleUmbral)cumpleGeneral=true;
    }
    // countPoly===0 (ningún concepto tiene dato ni override todavía): no se agrega
    // el detalle de esta condición, pero se sigue evaluando el resto (Gatillo A,
    // meses transcurridos) en vez de descartar toda la simulación.
  }
  if(conditions.monthsElapsed>0){
    // La referencia es el MISMO período base que la condición de arriba (el último
    // ajuste, editable por el usuario) — no la fecha de inicio del contrato ni un
    // lastUpdateDate separado, que podían quedar desincronizados del período que
    // se está evaluando.
    var mesesTranscurridos=monthsBetween(normalizeToMonthStart(baseMonth), normalizeToMonthStart(mesEval));
    var cumpleMeses=mesesTranscurridos>=conditions.monthsElapsed;
    var firstMesCond=ymOf(baseMonth); for(var i=1;i<=conditions.monthsElapsed;i++) firstMesCond=nextYm(firstMesCond);
    details.push({
      condicion:'Meses transcurridos ≥ '+conditions.monthsElapsed,
      cumplimiento:Math.min(mesesTranscurridos/conditions.monthsElapsed,1),
      cumplido:cumpleMeses,
      detalle:'Base '+formatYmLabel(baseMonth)+' → Eval '+formatYmLabel(mesEval)+' | Transcurridos: '+mesesTranscurridos+' meses',
      firstMet:firstMesCond
    });
    if(cumpleMeses)cumpleGeneral=true;
    if(!firstComplianceMonth && cumpleMeses){ firstComplianceMonth=firstMesCond; }
  }
  if(!details.length) return null;
  var eligibleMonths=getEligibleAdjustmentMonths(contract.id,baseMonth,mesEval);
  return {mesEval:mesEval,baseMonth:baseMonth,fecha:new Date().toISOString(),details:details,cumpleGeneral:cumpleGeneral,firstComplianceMonth:firstComplianceMonth||'',eligibleMonths:eligibleMonths};
}

function renderUpdateSection(contract){
  var section=document.createElement('div'); section.className='card'; section.style.marginBottom='20px';
  var header=document.createElement('div'); header.className='fsec';
  header.innerHTML='<div class="fsh"><div class="fi a">⚡</div><h2>Actualización Polinómica</h2></div>';
  section.appendChild(header);
  var body=document.createElement('div'); body.className='fsec';
  
  if(!contract.poly||!contract.poly.filter(function(p){return p.idx;}).length){
    body.innerHTML='<p style="color:var(--g500);font-size:13px">Este contrato no tiene fórmula polinómica configurada</p>';
    section.appendChild(body); return section;
  }
  
  var poly=contract.poly.filter(function(p){return p.idx;});
  var formulaDiv=document.createElement('div'); 
  formulaDiv.style.marginBottom='16px';
  formulaDiv.style.padding='12px 14px';
  formulaDiv.style.background='var(--p50)';
  formulaDiv.style.borderRadius='8px';
  formulaDiv.style.border='1px solid var(--p200)';
  formulaDiv.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--p800);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">✓ Fórmula polinómica configurada</div>'+
    '<code style="background:var(--w);padding:8px 12px;border-radius:6px;font-size:12px;font-family:monospace;display:block;border:1px solid var(--p200);color:var(--p900)">'+
    'Ko = '+poly.map(function(c){return c.idx+' × '+(c.inc*100).toFixed(1)+'%';}).join(' + ')+'</code>';
  body.appendChild(formulaDiv);
  
  var hasGatillos=((contract.gatillos&&((contract.gatillos.B&&contract.gatillos.B.enabled)||(contract.gatillos.C&&contract.gatillos.C.enabled)))||contract.trigB||contract.trigC);
  var conditions=PolUpdate.getConditions(contract.id);
  
  // FORZAR ACTIVACIÓN si tiene gatillos
  if(hasGatillos){
    if(!conditions){
      conditions={
        enabled:true,
        moThreshold:0,
        allComponentsThreshold:(contract.trigB?(Number(contract.trigBpct)||0):((contract.gatillos&&contract.gatillos.B)?(Number(contract.gatillos.B.threshold)||0):0)),
        monthsElapsed:(contract.trigC?(parseInt(contract.trigCmes,10)||0):((contract.gatillos&&contract.gatillos.C)?(parseInt(contract.gatillos.C.months,10)||0):0)),
        baseDate:(contract.btar?contract.btar+'-01':contract.fechaIni),
        lastUpdateDate:null,
        resetBase:false
      };
      PolUpdate.saveConditions(contract.id,conditions);
    }
    if(conditions&&!conditions.enabled){
      conditions.enabled=true;
      PolUpdate.saveConditions(contract.id,conditions);
    }
    conditions=PolUpdate.getConditions(contract.id);
  }
  
  if(!conditions||!conditions.enabled){
    var warnDiv=document.createElement('div');
    warnDiv.style.padding='12px 16px';
    warnDiv.style.background='var(--a100)';
    warnDiv.style.border='2px solid var(--a500)';
    warnDiv.style.borderRadius='8px';
    warnDiv.innerHTML='<div style="display:flex;align-items:center;gap:8px">'+
      '<span style="font-size:20px">⚠️</span>'+
      '<div style="font-size:13px;font-weight:700;color:#92400e">Sin condiciones configuradas</div>'+
      '</div>';
    body.appendChild(warnDiv);
    section.appendChild(body); 
    return section;
  }
  
  var storedBase=getPolyLiveBase(contract.id);
  var lastTarPeriod=getLastTariffPeriod(contract);
  var autoBase=lastTarPeriod||ymOf(conditions.baseDate)||ymOf(contract.btar)||ymOf(contract.fechaIni);
  var baseEval=storedBase||autoBase;
  var todayYm=ymToday();
  var storedEval=getPolyLiveEval(contract.id);
  var evalYm=storedEval||todayYm;
  var overrides=getPolyOverrides(contract.id);
  var liveResult=(baseEval&&evalYm&&compareYm(evalYm,baseEval)>0)?computeConditionsResult(contract,conditions,baseEval,evalYm,overrides):null;

  // Mostrar condiciones ACTIVAS — VISUALIZACIÓN pura: el usuario define tanto el
  // período base (por defecto el último período tarifario/ajustado) como el mes
  // de evaluación (por defecto hoy) y acá se recalcula al vuelo si las
  // condiciones de gatillo se cumplirían para ese período — % incidencia, %
  // acumulado (auto/manual) y aporte de cada concepto. No guarda nada ni
  // habilita generar listas de precios / registrar una actualización real.
  var condDiv=document.createElement('div');
  condDiv.style.marginBottom='16px';
  condDiv.style.padding='14px 16px';
  condDiv.style.background=liveResult&&liveResult.cumpleGeneral?'var(--g100d)':'#fef3c7';
  condDiv.style.borderRadius='8px';
  condDiv.style.border='2px solid '+(liveResult&&liveResult.cumpleGeneral?'var(--g600)':'#d97706');
  var condHtml='<div style="font-size:12px;font-weight:800;color:'+(liveResult&&liveResult.cumpleGeneral?'var(--g600)':'#92400e')+';text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">'+(liveResult&&liveResult.cumpleGeneral?'✓':'○')+' Condiciones de actualización activas</div>';
  condHtml+='<div style="font-size:10.5px;color:var(--g500);font-style:italic;margin-bottom:8px">Simulación — no registra ni genera ningún cambio en el contrato</div>';
  condHtml+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;color:var(--g600c)">'+
    '<label style="font-weight:600">Período base:</label>'+
    '<input type="month" value="'+(baseEval||'')+'" style="width:150px;font-size:12px;padding:5px 8px" onchange="setPolyLiveBase(\''+contract.id+'\',this.value)">'+
    (storedBase?'<button class="btn btn-s btn-sm" style="padding:3px 8px;font-size:11px" onclick="setPolyLiveBase(\''+contract.id+'\',\'\')" title="Volver al último período ajustado ('+esc(autoBase||'—')+')">↺ auto</button>':'')+
    '<label style="font-weight:600;margin-left:8px">Mes de evaluación:</label>'+
    '<input type="month" value="'+(evalYm||'')+'" style="width:150px;font-size:12px;padding:5px 8px" onchange="setPolyLiveEval(\''+contract.id+'\',this.value)">'+
    (storedEval?'<button class="btn btn-s btn-sm" style="padding:3px 8px;font-size:11px" onclick="setPolyLiveEval(\''+contract.id+'\',\'\')" title="Volver a hoy ('+esc(todayYm)+')">↺ hoy</button>':'')+
    '</div>';
  if(!baseEval){
    condHtml+='<div style="font-size:12px;color:#92400e">No se pudo determinar el período base (sin tarifario ni fecha de inicio válida).</div>';
  } else if(!evalYm||compareYm(evalYm,baseEval)<=0){
    condHtml+='<div style="font-size:12px;color:#92400e">El mes de evaluación debe ser posterior al período base.</div>';
  } else if(!liveResult){
    condHtml+='<ul style="margin:0 0 0 20px;font-size:13px;color:var(--g600);line-height:2;font-weight:600">';
    if(contract.trigA) condHtml+='<li>Actualización por Mano de Obra / CCT (mes específico)</li>';
    if(conditions.allComponentsThreshold>0) condHtml+='<li>Variación acumulada (Ko) ≥ '+conditions.allComponentsThreshold+'%</li>';
    if(conditions.monthsElapsed>0) condHtml+='<li>'+conditions.monthsElapsed+' meses desde última actualización</li>';
    condHtml+='</ul><div style="font-size:12px;color:var(--g500);margin-top:6px">Sin datos suficientes para simular todavía.</div>';
  } else {
    liveResult.details.forEach(function(d){
      var icon=d.cumplido?'✓':'○';
      var color=d.cumplido?'var(--g600)':'#92400e';
      // Para la condición de Variación acumulada (Ko, d.perIdx) NO se proyecta "se
      // cumpliría a partir de X": el Ko combinado depende de cómo evolucione cada
      // índice mes a mes, no es una progresión lineal/segura como "meses transcurridos"
      // — mostrar una fecha ahí sugiere una certeza que no existe.
      var statusLine=d.cumplido
        ?(d.firstMet?'Se cumple desde '+formatYmLabel(d.firstMet):'Se cumple en '+formatYmLabel(evalYm)+(d.anyMissing?' (con % manual cargado)':''))
        :(d.perIdx
          ?(d.anyMissing?'No se puede proyectar el mes exacto — falta cargar el % de algún concepto sin fuente automática':'No se cumple en '+formatYmLabel(evalYm)+' con los datos disponibles')
          :(d.firstMet?'Se cumpliría a partir de '+formatYmLabel(d.firstMet):(d.anyMissing?'No se puede proyectar el mes exacto — falta cargar el % de algún concepto sin fuente automática':'No se cumple en '+formatYmLabel(evalYm)+' con los datos disponibles')));
      condHtml+='<div style="margin:10px 0;padding:12px;background:var(--w);border-radius:8px;border:1px solid var(--g200)">';
      condHtml+='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:2px"><span style="font-weight:700;font-size:13.5px;color:'+color+'">'+icon+' '+d.condicion+'</span>'+(d.perIdx&&d.koTotal!=null?'<span style="font-size:12px;font-weight:700;color:var(--p700)">Ko simulado: '+(d.koTotal>=0?'+':'')+d.koTotal.toFixed(2)+'%</span>':'')+'</div>';
      condHtml+='<div style="font-size:11.5px;color:'+color+';font-weight:600;margin-bottom:'+((d.perIdx||d.moDetail)?'10px':'0')+'">'+statusLine+'</div>';
      if(d.perIdx){
        condHtml+='<div style="display:grid;grid-template-columns:1.2fr .7fr 1.4fr .9fr;gap:4px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--g500);padding-bottom:4px;border-bottom:1px solid var(--g200)">'+
          '<span>Concepto</span><span>% Incidencia</span><span>% Acumulado</span><span>Resultado</span></div>';
        d.perIdx.forEach(function(pi){
          var ovId='polOv_'+contract.id+'_'+pi.idx.replace(/[^a-zA-Z0-9]/g,'_');
          condHtml+='<div style="display:grid;grid-template-columns:1.2fr .7fr 1.4fr .9fr;gap:4px 10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--g100);font-size:12.5px">';
          condHtml+='<span style="font-weight:700;color:var(--g800)">'+esc(pi.idx)+'</span>';
          condHtml+='<span style="color:var(--g600c)">'+pi.inc.toFixed(1)+'%</span>';
          if(pi.hasData&&!pi.manual){
            condHtml+='<span style="font-weight:700;color:var(--g800)">'+(pi.pct>=0?'+':'')+pi.pct.toFixed(2)+'% <span title="Fuente automática" style="font-size:9px;font-weight:800;color:var(--g600);background:var(--g100d);padding:1px 5px;border-radius:99px;vertical-align:middle">AUTO</span></span>';
          } else {
            var curVal=pi.hasData?pi.pct:(overrides[pi.idx]!=null?overrides[pi.idx]:'');
            condHtml+='<span style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">'+
              '<input type="number" step="0.01" id="'+ovId+'" value="'+(curVal===''?'':curVal)+'" placeholder="% acum."'+
              ' style="width:90px;font-size:12px;padding:3px 6px;border:1px solid '+(pi.hasData?'#fbbf24':'#f59e0b')+'"'+
              ' onchange="applyPolyOverride(\''+contract.id+'\',\''+pi.idx.replace(/'/g,"\\'")+'\',this.value)"'+
              ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}">'+
              (pi.hasData?'<span title="Cargado manualmente" style="font-size:9px;font-weight:800;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:99px">MANUAL</span>':'<span style="font-size:10.5px;color:#92400e">⚠️ sin auto</span>')+
              '</span>';
          }
          if(pi.hasData){
            condHtml+='<span style="font-weight:700;color:var(--p700)" title="Aporte ponderado al Ko combinado">'+(pi.aporte>=0?'+':'')+pi.aporte.toFixed(2)+'%</span>';
          } else {
            condHtml+='<span style="color:var(--g400);font-size:11px">— completá el %</span>';
          }
          condHtml+='</div>';
        });
      } else if(d.moDetail){
        condHtml+='<div style="display:grid;grid-template-columns:1.4fr 1fr 1.4fr;gap:4px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--g500);padding-bottom:4px;border-bottom:1px solid var(--g200)">'+
          '<span>Concepto (Índices)</span><span>Acumulado en rango</span><span>Mes del aumento</span></div>';
        d.moDetail.forEach(function(mi){
          condHtml+='<div style="display:grid;grid-template-columns:1.4fr 1fr 1.4fr;gap:4px 10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--g100);font-size:12.5px">';
          condHtml+='<span style="font-weight:700;color:var(--g800)">'+esc(mi.idx)+'</span>';
          condHtml+='<span style="color:var(--g600c)">'+(mi.pctAcc!=null?(mi.pctAcc>=0?'+':'')+mi.pctAcc.toFixed(2)+'%':'—')+'</span>';
          if(mi.firstMonth){
            condHtml+='<span style="font-weight:700;color:var(--g600);background:var(--g100d);padding:2px 8px;border-radius:99px;display:inline-block;width:fit-content">'+formatYmLabel(mi.firstMonth)+'</span>';
          } else {
            condHtml+='<span style="color:var(--g400);font-size:11px">sin aumento cargado en Índices — cargalo en el módulo Índices</span>';
          }
          condHtml+='</div>';
        });
      }
      condHtml+='</div>';
    });
  }
  condDiv.innerHTML=condHtml;
  body.appendChild(condDiv);

  section.appendChild(body);
  return section;
}

function getEvaluationResult(cid,mesEval){
  var stored=localStorage.getItem('pol_eval_result_'+cid);
  if(!stored)return null;
  try{
    var result=JSON.parse(stored);
    return result;
  }catch(e){
    return null;
  }
}

function getEligibleAdjustmentMonths(cid, baseMonth, evalMonth){
  var contract=window.DB.find(function(c){return c.id==cid;});
  if(!contract)return [];
  var conditions=PolUpdate.getConditions(cid);
  if(!conditions)return [];
  var fromYm=ymOf(baseMonth), toYm=ymOf(evalMonth);
  if(!fromYm||!toYm||compareYm(toYm,fromYm)<=0)return [];
  var monthsMap={};
  if(conditions.allComponentsThreshold>0){
    var cur=nextYm(fromYm);
    while(cur && compareYm(cur,toYm)<0){
      var cumPct=computePoliDeltaPct(contract, fromYm, cur);
      if(cumPct!=null && isFinite(cumPct) && cumPct>=conditions.allComponentsThreshold) monthsMap[cur]={ym:cur,pct:cumPct,reason:'threshold'};
      cur=nextYm(cur);
    }
  }
  if(conditions.monthsElapsed>0){
    var lastUpdate=ymOf(conditions.lastUpdateDate)||ymOf(contract.fechaIni);
    var firstM=lastUpdate; for(var i=1;i<=conditions.monthsElapsed;i++) firstM=nextYm(firstM);
    var cur2=firstM;
    while(cur2 && compareYm(cur2,toYm)<0){
      if(!monthsMap[cur2]) monthsMap[cur2]={ym:cur2,pct:null,reason:'months'};
      cur2=nextYm(cur2);
    }
  }
  return Object.values(monthsMap).sort(function(a,b){return String(a.ym).localeCompare(String(b.ym));});
}
function computePoliDeltaPct(contract, refYm, targetYm){
  if(!contract || !refYm || !targetYm || compareYm(targetYm,refYm)<=0) return null;
  var poly=(contract.poly||[]).filter(function(p){return p && p.idx;});
  if(!poly.length) return null;
  // Fórmula polinómica lineal: Ko = Σ inc_i × (1 + var_i%/100) — misma convención que
  // calcularKo() (Calculadora Ko, 09-patch.js) y calculateUpdate() de este archivo.
  var ko=0, count=0;
  poly.forEach(function(c){
    var inc=Number(c.inc)||0;
    // 1. Intentar con datos frescos de IDX_STORE (sin side-effects en IDX_STORE)
    var rows=safeIdxRows(c.idx);
    if(rows.length){
      // Modo pct compuesto
      var monthRows=rows.filter(function(r){ return r.ym&&compareYm(r.ym,refYm)>0&&compareYm(r.ym,targetYm)<=0&&r.pct!=null&&isFinite(Number(r.pct)); });
      if(monthRows.length){
        var acc=1; monthRows.forEach(function(r){ acc*=1+(Number(r.pct)/100); });
        ko+=inc*acc;
        count++; return;
      }
      // Fallback ratio valores absolutos (USD, gasoil)
      var bRow=rows.filter(function(r){ return r.ym&&compareYm(r.ym,refYm)<=0&&r.value!=null&&Number(r.value)>0; }).sort(function(a,b){ return b.ym.localeCompare(a.ym); })[0];
      var eRow=rows.filter(function(r){ return r.ym&&compareYm(r.ym,targetYm)<=0&&r.value!=null&&Number(r.value)>0; }).sort(function(a,b){ return b.ym.localeCompare(a.ym); })[0];
      if(bRow&&eRow&&Number(bRow.value)>0){
        ko+=inc*(Number(eRow.value)/Number(bRow.value));
        count++; return;
      }
    }
    // 2. Fallback: indicator_snapshots localStorage (índices MO como PP, UOCRA)
    var calc=computeAccumulatedVariationPct(c.idx, refYm, targetYm);
    if(calc && isFinite(calc.pct)){
      ko+=inc*(1+(Number(calc.pct)/100));
      count++;
    }
  });
  if(count!==poly.length) return null;
  return (ko-1)*100;
}
function getSelectedAdjustmentMonths(cid){
  try{return JSON.parse(localStorage.getItem('pol_selected_periods_'+cid)||'[]')||[];}catch(e){return [];}
}
function setSelectedAdjustmentMonths(cid, arr){
  localStorage.setItem('pol_selected_periods_'+cid, JSON.stringify(arr||[]));
}
function getReferenceMonthForTarget(cid, targetYm, baseYm){
  var selected=getSelectedAdjustmentMonths(cid).slice().sort();
  var ref=baseYm;
  selected.forEach(function(ym){ if(compareYm(ym,targetYm)<0) ref=ym; });
  return ref;
}
function getSelectedPeriodsSummaryRows(cid){
  var res=getEvaluationResult(cid,'')||getEvaluationResult(cid,null); if(!res) return [];
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract) return [];
  var baseYm=res.baseMonth;
  var selected=getSelectedAdjustmentMonths(cid).slice().sort();
  return selected.map(function(ym){
    var ref=baseYm;
    selected.forEach(function(other){ if(compareYm(other,ym)<0) ref=other; });
    return {ym:ym, refYm:ref, pct:computePoliDeltaPct(contract, ref, ym)};
  });
}
function renderSelectedPeriodsSummary(cid){
  var host=document.getElementById('selectedAdjustmentSummary_'+cid);
  if(!host) return;
  var rows=getSelectedPeriodsSummaryRows(cid);
  if(!rows.length){ host.innerHTML=''; host.style.display='none'; return; }
  host.style.display='block';
  host.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--b700);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Selección de períodos</div>'+
    rows.map(function(r){
      return '<div style="font-size:12px;color:var(--g700);margin:4px 0">• <strong>'+formatYmLabel(r.ym)+'</strong> · '+(r.pct!=null?(r.pct>=0?'+':'')+r.pct.toFixed(2)+'%':'s/d')+' sobre '+formatYmLabel(r.refYm)+'</div>';
    }).join('');
}
function toggleAdjustmentMonthSelection(cid, ym, checked){
  var arr=getSelectedAdjustmentMonths(cid).slice();
  var pos=arr.indexOf(ym);
  if(checked){ if(pos===-1) arr.push(ym); }
  else if(pos>=0){ arr.splice(pos,1); }
  arr.sort();
  setSelectedAdjustmentMonths(cid, arr);
  renderEligibleMonthsModal(cid);
}
function clearAdjustmentMonthSelection(cid){
  setSelectedAdjustmentMonths(cid, []);
  renderEligibleMonthsModal(cid);
  renderSelectedPeriodsSummary(cid);
}
function closeEligibleMonthsModal(){
  var m=document.getElementById('eligibleMonthsModal');
  if(m) m.remove();
}
function finishEligibleMonthsSelection(cid){
  closeEligibleMonthsModal();
  renderSelectedPeriodsSummary(cid);
  var rows=getSelectedPeriodsSummaryRows(cid);
  if(rows.length){ toast('Períodos elegidos: '+rows.map(function(r){return formatYmLabel(r.ym);}).join(', '),'ok'); }
  else { toast('No hay períodos seleccionados','ok'); }
}
function renderEligibleMonthsModal(cid){
  var old=document.getElementById('eligibleMonthsModal');
  if(old) old.remove();
  var res=getEvaluationResult(cid,'') || getEvaluationResult(cid,null);
  if(!res) return;
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract) return;
  var months=(res.eligibleMonths||[]).slice();
  var selected=getSelectedAdjustmentMonths(cid).slice().sort();
  var chips='';
  months.forEach(function(m){
    var ym=m.ym||m;
    var checked=selected.indexOf(ym)>=0;
    var refYm=getReferenceMonthForTarget(cid, ym, res.baseMonth);
    var deltaPct=computePoliDeltaPct(contract, refYm, ym);
    chips += '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid '+(checked?'var(--g600)':'var(--g300)')+';border-radius:10px;background:'+(checked?'var(--g100d)':'var(--w)')+'">'+
      '<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleAdjustmentMonthSelection(\''+cid+'\',\''+ym+'\',this.checked)">'+
      '<span style="font-size:13px;font-weight:600;color:var(--g800)">'+formatYmLabel(ym)+'</span>'+
      (deltaPct!=null?'<span style="margin-left:auto;font-size:12px;color:var(--g600c)">'+(deltaPct>=0?'+':'')+Number(deltaPct).toFixed(2)+'%</span>':'<span style="margin-left:auto;font-size:12px;color:var(--g500)">s/d</span>')+
      '<span style="margin-left:6px;font-size:11px;color:var(--g500)">sobre '+formatYmLabel(refYm)+'</span>'+
    '</label>';
  });
  var selectedRows=getSelectedPeriodsSummaryRows(cid);
  var selectedText=selectedRows.length?selectedRows.map(function(r){return formatYmLabel(r.ym)+' ('+(r.pct!=null?(r.pct>=0?'+':'')+r.pct.toFixed(2)+'%':'s/d')+' sobre '+formatYmLabel(r.refYm)+')';}).join(' · '):'ninguno';

  // Scope para OBRA: POs seleccionadas + remanente. Para SERVICIO: monto remanente del contrato.
  var scopeBlock='';
  var poSelectorBlock='';
  var moneda=contract.mon||'ARS';
  if(contract.tipo==='OBRA'){
    var sc=getCertSelectionScope(cid);
    // Selector de POs dentro del modal (sincroniza con panel principal vía .cert-check)
    var poData=ME2N[contract.num];
    var pos=(poData&&Array.isArray(poData)&&Array.isArray(poData[2]))?poData[2]:[];
    var aves=contract.aves||[];
    var avePoly=aves.filter(function(a){return a.tipo==='POLINOMICA';}).reduce(function(s,a){return s+(a.monto||0);},0);
    var aveOwner=aves.filter(function(a){return a.tipo==='OWNER';}).reduce(function(s,a){return s+(a.monto||0);},0);
    var montoBase=contract.montoBase||((contract.monto||0)-avePoly-aveOwner);
    var totalCerts=pos.reduce(function(s,p){return s+(p[3]||0);},0);
    var remanente=Math.max(0,montoBase-totalCerts);
    var selectedPosSet={}; (sc?sc.pos:[]).forEach(function(r){selectedPosSet[r.po]=true;});
    var allChecked=pos.length>0 && pos.every(function(p){return selectedPosSet[p[0]||''];});
    var rowsHtml=pos.length?pos.map(function(p){
      var poNum=p[0]||'—';
      var plant=p[2]||'—';
      var nov=p[3]||0;
      var ajustado=contract.posAjustadas&&contract.posAjustadas.indexOf(poNum)>=0;
      var meta=ajustado&&contract.posAjustadasMeta?contract.posAjustadasMeta[poNum]:null;
      var checkedAttr=selectedPosSet[poNum]?'checked':'';
      var ajLbl=ajustado?'<span class="bdg" style="background:#16a34a;color:#fff;font-size:9px;margin-left:6px" title="'+(meta?'Ajustada en '+esc(meta.ym||'')+' · Enm.'+esc(String(meta.enm||'')):'Ya ajustada')+'">✓ '+(meta?esc(meta.ym||''):'')+'</span>':'';
      return '<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--g200);border-radius:6px;background:#fff;font-size:12px">'+
        '<input type="checkbox" '+checkedAttr+' onchange="togglePoFromModal(\''+cid+'\',\''+esc(poNum)+'\',this.checked)">'+
        '<span class="mono" style="font-weight:600;min-width:110px">'+esc(poNum)+'</span>'+
        '<span style="color:var(--g500);min-width:80px;font-size:11px">'+esc(plant)+'</span>'+
        '<span class="mono" style="margin-left:auto;font-weight:700">'+moneda+' '+fN(nov)+'</span>'+
        ajLbl+
      '</label>';
    }).join(''):'<div style="padding:14px;text-align:center;color:var(--g500);font-style:italic;font-size:12px">Sin POs asociadas a este contrato</div>';
    var remCheckedAttr=(sc&&sc.includeRemanente)?'checked':'';
    var allCheckedAttr=allChecked?'checked':'';
    poSelectorBlock='<div style="margin-top:14px;padding:14px;border-radius:8px;border:1px solid var(--g300);background:var(--g50)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
        '<div style="font-weight:700;font-size:13px;color:var(--g800)">📋 Scope OBRA — Tildá las POs a ajustar</div>'+
        '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--g600c);cursor:pointer">'+
          '<input type="checkbox" '+allCheckedAttr+' onchange="toggleAllPosFromModal(\''+cid+'\',this.checked)"> Todas'+
        '</label>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:6px;max-height:220px;overflow:auto;padding:2px">'+rowsHtml+'</div>'+
      '<label style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px;color:var(--g700);padding:8px 10px;background:#fff;border:1px solid var(--g200);border-radius:6px">'+
        '<input type="checkbox" '+remCheckedAttr+' onchange="toggleRemanenteFromModal(\''+cid+'\',this.checked)">'+
        '<span>Incluir remanente sin certificar (<strong>'+moneda+' '+fN(remanente)+'</strong>)</span>'+
      '</label>'+
    '</div>';
    if(sc){
      var maxPct=null;
      selectedRows.forEach(function(r){ if(r.pct!=null){ if(maxPct==null||r.pct>maxPct) maxPct=r.pct; } });
      var pctApplied=maxPct!=null?maxPct:0;
      var increment=sc.totalBase*(pctApplied/100);
      var posTxt=sc.pos.length?(sc.pos.length+' PO'+(sc.pos.length!==1?'s':'')):'ninguna PO';
      var remanenteTxt=sc.includeRemanente?(' + remanente '+moneda+' '+fN(sc.remanente)):'';
      var warn=sc.totalBase<=0?'<div style="margin-top:8px;padding:8px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#991b1b;font-size:12px">⚠️ Tildá POs arriba o el remanente para definir el scope antes de generar las listas.</div>':'';
      scopeBlock='<div style="margin-top:14px;padding:12px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;font-size:12px;color:#78350f">'+
        '<div style="font-weight:700;margin-bottom:6px">🔧 Scope del ajuste (OBRA)</div>'+
        '<div style="line-height:1.7"><strong>Selección:</strong> '+posTxt+remanenteTxt+'</div>'+
        '<div style="line-height:1.7"><strong>Monto base:</strong> <span style="font-family:JetBrains Mono,monospace;font-weight:700">'+moneda+' '+fN(sc.totalBase)+'</span> '+(pctApplied?'· <strong>Ajuste:</strong> '+pctApplied.toFixed(2)+'% = <span style="font-family:JetBrains Mono,monospace;font-weight:700;color:#15803d">+'+moneda+' '+fN(increment)+'</span>':'')+'</div>'+
        warn+
      '</div>';
    }
  } else {
    // SERVICIO: scope = monto remanente del contrato (consumido vs tot)
    try{
      var consumed2=(typeof getConsumed==='function')?getConsumed(contract.num):null;
      var aves2=contract.aves||[];
      var avePoly2=aves2.filter(function(a){return a.tipo==='POLINOMICA';}).reduce(function(s,a){return s+(a.monto||0);},0);
      var aveOwner2=aves2.filter(function(a){return a.tipo==='OWNER';}).reduce(function(s,a){return s+(a.monto||0);},0);
      var montoBase2=contract.montoBase||((contract.monto||0)-avePoly2-aveOwner2);
      var tot2=montoBase2+avePoly2+aveOwner2;
      var rem2=consumed2!=null?Math.max(0,tot2-consumed2):tot2;
      var maxPct2=null; selectedRows.forEach(function(r){ if(r.pct!=null){ if(maxPct2==null||r.pct>maxPct2) maxPct2=r.pct; } });
      var pctApplied2=maxPct2!=null?maxPct2:0;
      var increment2=rem2*(pctApplied2/100);
      scopeBlock='<div style="margin-top:14px;padding:12px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;font-size:12px;color:#78350f">'+
        '<div style="font-weight:700;margin-bottom:6px">🔧 Scope del ajuste (SERVICIO)</div>'+
        '<div style="line-height:1.7"><strong>Monto base:</strong> remanente del contrato (TV total − consumido) = <span style="font-family:JetBrains Mono,monospace;font-weight:700">'+moneda+' '+fN(rem2)+'</span></div>'+
        (pctApplied2?'<div style="line-height:1.7"><strong>Ajuste a aplicar:</strong> '+pctApplied2.toFixed(2)+'% = <span style="font-family:JetBrains Mono,monospace;font-weight:700;color:#15803d">+'+moneda+' '+fN(increment2)+'</span></div>':'')+
      '</div>';
    }catch(_e){}
  }

  var modal=document.createElement('div');
  modal.id='eligibleMonthsModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9500;display:flex;align-items:center;justify-content:center;padding:18px';
  modal.innerHTML='<div style="background:#fff;border-radius:14px;max-width:960px;width:96%;box-shadow:var(--shm);padding:22px 22px 18px 22px;max-height:90vh;overflow:auto">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">'+
      '<div><div style="font-size:16px;font-weight:800;color:var(--g900)">📆 Períodos con ajuste aplicable</div><div style="font-size:12px;color:var(--g600c);margin-top:4px">Si seleccionás un período, los porcentajes de los períodos posteriores se recalculan sobre ese período y no sobre la base original.</div></div>'+
      '<button class="btn btn-s btn-sm" onclick="closeEligibleMonthsModal()">✖ Cerrar</button>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;max-height:360px;overflow:auto;padding:4px 2px">'+chips+'</div>'+
    '<div style="margin-top:14px;padding:12px;border-radius:8px;background:var(--b50);border:1px solid var(--b200);font-size:12px;color:var(--g700)"><strong>Seleccionados:</strong> '+selectedText+'</div>'+
    poSelectorBlock+
    scopeBlock+
    '<div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px">'+
      '<button class="btn btn-s btn-sm" onclick="clearAdjustmentMonthSelection(\''+cid+'\')">🧹 Limpiar</button>'+
      '<button class="btn btn-p btn-sm" onclick="finishEligibleMonthsSelection(\''+cid+'\')">Listo</button>'+
    '</div>'+
  '</div>';
  document.body.appendChild(modal);
}

// Toggle handlers del scope OBRA dentro del modal — actualizan localStorage y re-renderean
function togglePoFromModal(cid, poNum, checked){
  var sel=getStoredScopeSelection(cid);
  var pos=(sel.pos||[]).slice();
  var i=pos.indexOf(poNum);
  if(checked){ if(i<0) pos.push(poNum); }
  else if(i>=0){ pos.splice(i,1); }
  setStoredScopeSelection(cid, {pos:pos, includeRemanente:!!sel.includeRemanente});
  renderEligibleMonthsModal(cid);
}
function toggleAllPosFromModal(cid, checked){
  var c=window.DB.find(function(x){return x.id===cid;}); if(!c) return;
  var poData=ME2N[c.num];
  var pos=(poData&&Array.isArray(poData)&&Array.isArray(poData[2]))?poData[2]:[];
  var sel=getStoredScopeSelection(cid);
  var allPos=checked?pos.map(function(p){return p[0]||'';}).filter(Boolean):[];
  setStoredScopeSelection(cid, {pos:allPos, includeRemanente:!!sel.includeRemanente});
  renderEligibleMonthsModal(cid);
}
function toggleRemanenteFromModal(cid, checked){
  var sel=getStoredScopeSelection(cid);
  setStoredScopeSelection(cid, {pos:(sel.pos||[]).slice(), includeRemanente:!!checked});
  renderEligibleMonthsModal(cid);
}
function openEligibleMonthsModal(cid){
  renderEligibleMonthsModal(cid);
}

function monthsBetween(d1,d2){
  var start=new Date(d1+'T00:00:00');
  var end=new Date(d2+'T00:00:00');
  return(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
}

function openConditionsModal(cid){
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract)return;
  var conditions=PolUpdate.getConditions(cid)||{enabled:false,moThreshold:0,allComponentsThreshold:0,monthsElapsed:0,baseDate:contract.fechaIni,lastUpdateDate:null,resetBase:false};
  var modal=document.createElement('div'); modal.id='conditionsModal';
  modal.style.cssText='display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;align-items:center;justify-content:center';
  modal.innerHTML='<div style="background:#fff;border-radius:12px;padding:28px;max-width:560px;width:92%;box-shadow:var(--shm)">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:20px">Configurar Condiciones de Actualización</h3>'+
    '<div class="fg fg2" style="margin-bottom:20px">'+
      '<div class="fgrp c2"><label><input type="checkbox" id="condEnabled" '+(conditions.enabled?'checked':'')+' style="width:auto;margin-right:6px"> Habilitar actualización automática</label></div>'+
      '<div class="fgrp"><label>MO mínimo (%)</label><input type="number" id="condMo" value="'+(conditions.moThreshold||0)+'" step="0.1"></div>'+
      '<div class="fgrp"><label>Todos componentes (%)</label><input type="number" id="condAll" value="'+(conditions.allComponentsThreshold||0)+'" step="0.1"></div>'+
      '<div class="fgrp"><label>Meses transcurridos</label><input type="number" id="condMonths" value="'+(conditions.monthsElapsed||0)+'"></div>'+
      '<div class="fgrp"><label>Fecha base</label><input type="date" id="condBase" value="'+(conditions.baseDate||contract.fechaIni)+'"></div>'+
      '<div class="fgrp c2"><label><input type="checkbox" id="condReset" '+(conditions.resetBase?'checked':'')+' style="width:auto;margin-right:6px"> Resetear base tras actualización</label></div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end">'+
      '<button class="btn btn-s" onclick="closeConditionsModal()">Cancelar</button>'+
      '<button class="btn btn-p" onclick="saveConditionsModal('+cid+')">Guardar</button>'+
    '</div></div>';
  document.body.appendChild(modal);
}

function closeConditionsModal(){ var m=document.getElementById('conditionsModal'); if(m)m.remove(); }

function saveConditionsModal(cid){
  var data={
    enabled:document.getElementById('condEnabled').checked,
    moThreshold:parseFloat(document.getElementById('condMo').value)||0,
    allComponentsThreshold:parseFloat(document.getElementById('condAll').value)||0,
    monthsElapsed:parseInt(document.getElementById('condMonths').value)||0,
    baseDate:document.getElementById('condBase').value,
    resetBase:document.getElementById('condReset').checked,
    lastUpdateDate:(PolUpdate.getConditions(cid)||{}).lastUpdateDate||null
  };
  PolUpdate.saveConditions(cid,data); closeConditionsModal(); verDet(cid); toast('Condiciones guardadas','ok');
}

function previewUpdate(cid){
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract)return;
  var calc=PolUpdate.calculateUpdate(contract); if(!calc)return;
  var modal=document.createElement('div'); modal.id='updatePreviewModal';
  modal.style.cssText='display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;align-items:center;justify-content:center';
  var pricesTable='<table style="width:100%;font-size:11px;margin:12px 0"><thead><tr style="background:var(--g100)"><th style="padding:6px;text-align:left">Item</th><th style="padding:6px;text-align:right">Anterior</th><th style="padding:6px;text-align:right">Nuevo</th><th style="padding:6px;text-align:right">Var%</th></tr></thead><tbody>';
  calc.updatedPrices.forEach(function(p){
    pricesTable+='<tr><td style="padding:6px">'+esc(p.description)+'</td>'+
      '<td style="padding:6px;text-align:right">'+fN(p.old_price)+'</td>'+
      '<td style="padding:6px;text-align:right;font-weight:700">'+fN(p.unit_price)+'</td>'+
      '<td style="padding:6px;text-align:right;color:'+(p.variation>=0?'var(--g600)':'var(--r500)')+'">'+p.variation.toFixed(2)+'%</td></tr>';
  });
  pricesTable+='</tbody></table>';
  modal.innerHTML='<div style="background:#fff;border-radius:12px;padding:28px;max-width:700px;width:92%;max-height:85vh;overflow-y:auto;box-shadow:var(--shm)">'+
    '<h3 style="font-size:16px;font-weight:700;margin-bottom:16px">Vista Previa: Actualización Polinómica</h3>'+
    '<div style="background:var(--p50);padding:14px;border-radius:8px;margin-bottom:16px;font-size:13px">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div><strong>Ko aplicado:</strong> '+calc.Ko.toFixed(4)+'</div>'+
        '<div><strong>Meses restantes:</strong> '+calc.monthsRemaining+'</div>'+
        '<div><strong>Mensual anterior:</strong> '+fN(calc.oldMonthlyEstimate)+'</div>'+
        '<div><strong>Mensual nuevo:</strong> '+fN(calc.newMonthlyEstimate)+'</div>'+
      '</div></div>'+
    '<div style="background:var(--a100);padding:14px;border-radius:8px;margin-bottom:16px;text-align:center">'+
      '<div style="font-size:12px;color:#92400e;font-weight:600;margin-bottom:4px">AVE GENERADO</div>'+
      '<div style="font-size:24px;font-weight:800;color:#92400e">'+fN(calc.aveAmount)+'</div></div>'+
    '<details style="margin-bottom:16px"><summary style="cursor:pointer;font-weight:600;font-size:12px;margin-bottom:8px">Ver detalle de precios</summary>'+pricesTable+'</details>'+
    '<div style="background:var(--p50);padding:10px 12px;border-radius:6px;margin-bottom:14px;font-size:11.5px;color:var(--p800);border:1px solid var(--p200)">ℹ️ Al aplicar la actualización se registrará automáticamente una nueva enmienda en el listado y se abrirá el documento para imprimir/PDF.</div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end">'+
      '<button class="btn btn-s" onclick="closeUpdatePreview()">Cancelar</button>'+
      '<button class="btn btn-a" onclick="confirmApplyUpdate(\''+cid+'\')">✓ Aplicar actualización y generar enmienda</button>'+
    '</div></div>';
  document.body.appendChild(modal);
}

function closeUpdatePreview(){ var m=document.getElementById('updatePreviewModal'); if(m)m.remove(); }
async function confirmApplyUpdate(cid){
  if(!confirm('¿Confirmar actualización? Se generará enmienda, lista de precios y AVE'))return;
  closeUpdatePreview();
  try{ await PolUpdate.applyUpdate(); }catch(e){ console.error('confirmApplyUpdate', e); toast('Error al aplicar: '+(e.message||e),'er'); return; }
  if(cid) setTimeout(function(){ openAmendmentDoc(cid); },500);
}

function openAmendmentDoc(cid, enmNum){
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract){toast('Contrato no encontrado','er');return;}
  if(!(contract.enmiendas||[]).length){ toast('No hay enmiendas registradas. Aplicá una actualización primero o creá una con "+ Nueva Enmienda".','er'); return; }
  var w=window.open('','_blank'); if(!w){toast('Bloqueador de pop-ups activo','er');return;}
  w.document.open(); w.document.write(renderAmendmentHtml(contract, enmNum, {forPrint:true})); w.document.close();
}

// Descargar enmienda como .doc (HTML compatible con Word) — editable en Word/Google Docs
function downloadAmendmentDoc(cid, enmNum){
  var contract=window.DB.find(function(c){return c.id==cid;}); if(!contract){toast('Contrato no encontrado','er');return;}
  if(!(contract.enmiendas||[]).length){ toast('No hay enmiendas registradas','er'); return; }
  var bodyHtml=renderAmendmentHtml(contract, enmNum, {forPrint:false, forWord:true});
  // Word reconoce HTML con headers MS Office
  var wordHtml='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'+
    '<head><meta charset="utf-8"><title>Enmienda</title>'+
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->'+
    '<style>@page{size:A4;margin:2cm 1.8cm}body{font-family:"Times New Roman",serif;font-size:11pt;line-height:1.5}'+
    'p{margin:0 0 8pt 0;text-align:justify}div{margin-bottom:2pt}ol{list-style-type:lower-alpha;margin:0 0 8pt 22pt;padding:0}li{margin-bottom:4pt}table{border-collapse:collapse;width:100%;margin:8pt 0 12pt}'+
    'th{background:#1b3f6e;color:#fff;padding:5pt 7pt;font-size:9.5pt;text-align:left;border:1px solid #1b3f6e}'+
    'td{padding:4pt 7pt;font-size:9.5pt;border:1px solid #d0d4d9}.tot td{background:#eef2f7;font-weight:700}'+
    '.section-title{font-weight:700;text-decoration:underline;margin:14pt 0 8pt}'+
    '.center{text-align:center}.right{text-align:right}.num{text-align:right}'+
    '.period-title{font-weight:700;color:#1b3f6e;margin:14pt 0 6pt;text-transform:uppercase}'+
    '.pageBreak{page-break-before:always;mso-special-character:line-break}'+
    '</style></head><body>'+bodyHtml+'</body></html>';
  var blob=new Blob(['﻿', wordHtml], {type:'application/msword'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url;
  var fname='Enmienda_'+(enmNum||'última')+'_'+(contract.num||'contrato').replace(/[^A-Za-z0-9_-]/g,'_')+'.doc';
  a.download=fname; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  toast('Documento .doc descargado: '+fname,'ok');
}

// Tabla(s) de items agregados/quitados del tarifario por una enmienda de Alcance (SCOPE) —
// se muestra dentro de la sección "ACT. DE ALCANCE" del documento, debajo del texto.
function renderScopeItemsTable(enm){
  var cols=enm.scopeCols||[];
  var agregados=enm.scopeItemsAgregados||[];
  var removidos=enm.scopeItemsRemovidos||[];
  if(!cols.length || (!agregados.length && !removidos.length)) return '';
  var periodoTxt=enm.scopePeriodo?(' a partir de <strong>'+esc(enm.scopePeriodo)+'</strong>'):'';
  function _tbl(rows){
    var thead='<tr>'+cols.map(function(c){ return '<th style="background:#1b3f6e;color:#fff;padding:5pt 7pt;font-size:9.5pt;font-weight:700;text-align:left;border:1px solid #1b3f6e">'+esc(String(c||''))+'</th>'; }).join('')+'</tr>';
    var tbody=rows.map(function(row){
      return '<tr>'+cols.map(function(c,ci){ return '<td style="padding:4pt 7pt;font-size:9.5pt;border:1px solid #d0d4d9">'+esc(String((row||[])[ci]==null?'':(row||[])[ci]))+'</td>'; }).join('')+'</tr>';
    }).join('');
    return '<table style="width:100%;border-collapse:collapse;margin:6pt 0 12pt"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table>';
  }
  var html='';
  if(agregados.length){
    html+='<p style="font-weight:700;font-size:10pt;margin-top:8pt">Items incorporados al tarifario'+periodoTxt+':</p>'+_tbl(agregados);
  }
  if(removidos.length){
    html+='<p style="font-weight:700;font-size:10pt;margin-top:8pt">Items dados de baja del tarifario'+periodoTxt+':</p>'+_tbl(removidos);
  }
  return html;
}

function renderAmendmentHtml(contract, targetEnmNum, opts){
  opts=opts||{};
  var forWord=!!opts.forWord;
  var enms=contract.enmiendas||[];
  var lastEnm=(targetEnmNum!=null?enms.find(function(e){return e.num===targetEnmNum;}):null)||enms[enms.length-1]||{};
  var enmNum=lastEnm.num||enms.length||1;
  var cid=contract.id;
  var res=getEvaluationResult(cid,'')||getEvaluationResult(cid,null)||{};
  var basePeriod=lastEnm.basePeriodo||(res.baseMonth)||contract.btar||contract.fechaIni||'';
  var newPeriod=lastEnm.nuevoPeriodo||'';
  var Ko=lastEnm.ko||1;
  var pctKo=((Ko-1)*100);

  // Tramos de ESTA enmienda puntual (lastEnm.tramos, o basePeriod/newPeriod si es de un solo
  // tramo) — antes se usaba getSelectedAdjustmentMonths(cid), que lee un estado de UI global
  // por contrato (localStorage) sin relación con qué enmienda se está descargando, así que el
  // Word terminaba mostrando los períodos que hubiera seleccionados en la pantalla en ese
  // momento (de otra enmienda, o ninguno) en vez de los que esa enmienda realmente aplicó.
  var tramos=(Array.isArray(lastEnm.tramos)&&lastEnm.tramos.length)
    ? lastEnm.tramos.slice().sort(function(a,b){ return String(a.nuevoPeriodo||'').localeCompare(String(b.nuevoPeriodo||'')); })
    : (newPeriod ? [{basePeriodo:basePeriod, nuevoPeriodo:newPeriod, pctPoli:lastEnm.pctPoli}] : []);
  var selPeriods=tramos.map(function(t){ return t.nuevoPeriodo; }).filter(Boolean);

  // Tarifarios del contrato
  var tars=contract.tarifarios||[];
  var baseTar=tars.find(function(t){return t.period===contract.btar;})||tars[0]||null;

  var today=new Date();
  var meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var dateStr='Neuquén, '+today.getDate()+' de '+meses[today.getMonth()]+' de '+today.getFullYear();
  var fmtM=function(ym){ if(!ym) return ''; var p=String(ym).substring(0,7).split('-'); if(p.length<2) return ym; return meses[parseInt(p[1],10)-1]+' de '+p[0]; };
  var fmtMShort=function(ym){ if(!ym) return ''; var p=String(ym).substring(0,7).split('-'); if(p.length<2) return ym; return meses[parseInt(p[1],10)-1].substring(0,3)+'-'+p[0].substring(2); };

  // Generar bloques de tablas por período — cada tramo usa SU PROPIO basePeriodo (no uno
  // compartido para toda la enmienda), porque una enmienda con varios tramos encadenados
  // (ej: tramo1 base→jun, tramo2 jun→jul) tiene una base distinta en cada uno.
  var periodBlocks='';
  tramos.forEach(function(tr){
    var periodYm=tr.nuevoPeriodo;
    var tramoBase=tr.basePeriodo||basePeriod;
    var koP=tr.pctPoli!=null?(1+Number(tr.pctPoli)):(function(){ var dPct=computePoliDeltaPct(contract,tramoBase,periodYm); return dPct!=null?(1+dPct/100):Ko; })();
    var pctP=((koP-1)*100).toFixed(2);
    var label=fmtM(periodYm);
    var shortLbl=fmtMShort(periodYm);

    // Tablas de precios para este período — TODAS las que tengan period === periodYm
    var tableHtml='';
    var periodTables=tars.filter(function(t){ return String(t.period||'')===String(periodYm); });
    function _renderOneTab(tab, koUse, lblShort, alreadyAdjusted){
      var cols=(tab.cols||[]).slice();
      var rowsArr=tab.rows||[];
      if(!rowsArr.length) return '';
      var priceColIdx=cols.findIndex(function(c){ return /precio|valor\s*unitario|tarifa|importe|mensual/i.test(String(c||'')); });
      if(priceColIdx<0) priceColIdx=cols.length-1;
      var thead='<tr>';
      cols.forEach(function(col,i){
        var isPrice=(i===priceColIdx);
        thead+='<th style="background:#1b3f6e;color:#fff;padding:5pt 7pt;font-size:9.5pt;font-weight:700;text-align:'+(isPrice?'right':'left')+';border:1px solid #1b3f6e">'+esc(String(col||''))+(isPrice&&lblShort?' '+lblShort:'')+'</th>';
      });
      thead+='</tr>';
      var tbody='';
      var total=0;
      rowsArr.forEach(function(row){
        tbody+='<tr>';
        cols.forEach(function(col,i){
          var cell=(row||[])[i];
          var val=cell;
          if(i===priceColIdx){
            var num=parseFloat(cell)||0;
            var newVal=alreadyAdjusted?num:(num*(koUse||1));
            total+=newVal;
            val='$ '+newVal.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
          } else {
            val=esc(String(cell==null?'':cell));
          }
          tbody+='<td style="padding:4pt 7pt;font-size:9.5pt;border:1px solid #d0d4d9;text-align:'+(i===priceColIdx?'right':'left')+'">'+val+'</td>';
        });
        tbody+='</tr>';
      });
      var totalRow='<tr><td colspan="'+(cols.length-1)+'" style="padding:5pt 7pt;font-size:9.5pt;font-weight:700;text-align:right;background:#eef2f7;border:1px solid #d0d4d9">TOTAL</td><td style="padding:5pt 7pt;font-size:9.5pt;font-weight:700;text-align:right;background:#eef2f7;border:1px solid #d0d4d9">$ '+total.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td></tr>';
      return '<table style="width:100%;border-collapse:collapse;margin:8pt 0 14pt"><thead>'+thead+'</thead><tbody>'+tbody+totalRow+'</tbody></table>';
    }
    if(periodTables.length){
      // Ya es el tarifario propio de este período (sea cual sea su origen: manual, importado
      // por IA, o generado por la actualización polinómica) — son los valores finales de ese
      // período, no se vuelven a multiplicar por Ko. Antes esto dependía de tab.source, que la
      // gran mayoría de tarifarios cargados a mano o por IA nunca tienen seteado, así que
      // terminaba aplicando el Ko dos veces sobre precios que ya estaban actualizados.
      periodTables.forEach(function(tab){
        tableHtml+='<div style="margin-bottom:8pt"><div style="font-size:10pt;font-weight:600;color:#334155;margin-bottom:4pt">'+esc(tab.name||'Tabla')+'</div>'+_renderOneTab(tab, koP, shortLbl, true)+'</div>';
      });
    } else if(baseTar&&baseTar.rows&&baseTar.rows.length){
      // No hay tarifario cargado para este período puntual: se proyecta desde el tarifario base
      // multiplicando por el Ko del tramo.
      tableHtml=_renderOneTab(baseTar, koP, shortLbl, false);
    } else {
      // Sin tarifario: tabla simple con Ko
      tableHtml='<table style="width:100%;border-collapse:collapse;margin-bottom:12px"><thead><tr style="background:#1b3f6e;color:#fff"><th style="padding:5px 8px;font-size:10px">Concepto</th><th style="padding:5px 8px;font-size:10px;text-align:right">Ko</th><th style="padding:5px 8px;font-size:10px;text-align:right">Var.</th></tr></thead><tbody><tr><td style="padding:5px 8px;font-size:11px">Actualización polinómica ('+label+')</td><td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:700">'+koP.toFixed(4)+'</td><td style="padding:5px 8px;font-size:11px;text-align:right;color:'+( pctP>=0?'#16a34a':'#dc2626')+'">'+(pctP>=0?'+':'')+pctP+'%</td></tr></tbody></table>';
    }

    periodBlocks+='<div style="margin-bottom:18px"><div style="font-size:11px;font-weight:700;color:#1b3f6e;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">'+label.toUpperCase()+' — Ko: '+koP.toFixed(4)+' (+'+pctP+'%)</div>'+tableHtml+'</div>';
  });

  // Objeto: texto de períodos
  var periodosTexto=selPeriods.map(function(p,i){ return '<strong>'+fmtM(p)+'</strong>'+(i<selPeriods.length-1?' y ':''); }).join('');

  var polyFormula=contract.poly&&contract.poly.length?'Ko = '+contract.poly.map(function(p){return p.idx+' × '+(p.inc*100).toFixed(1)+'%';}).join(' + '):'Fórmula polinómica contractual';

  // El cuerpo (OBJETO + secciones) se arma según el/los tipo/s reales de la enmienda
  // (enmTipos: ACTUALIZACION_TARIFAS / EXTENSION / SCOPE / CLAUSULAS / OTRO) — antes siempre
  // decía "2. PRECIO" con las tablas de tarifas, aunque la enmienda fuera de cláusulas o de
  // ampliación de scope. Si una enmienda combina varios tipos, se listan en orden (tarifas
  // primero, luego plazo, scope, cláusulas, otros) con la numeración de secciones corrida.
  var enmTypesRaw=enmTipos(lastEnm);
  var enmTypes=enmTypesRaw.length?enmTypesRaw:['ACTUALIZACION_TARIFAS'];
  var TYPE_ORDER=['ACTUALIZACION_TARIFAS','EXTENSION','SCOPE','CLAUSULAS','OTRO'];
  var orderedTypes=TYPE_ORDER.filter(function(t){ return enmTypes.indexOf(t)>=0; });
  enmTypes.forEach(function(t){ if(orderedTypes.indexOf(t)<0) orderedTypes.push(t); });

  // Texto de Cláusulas/Scope/Otro: si se cargó con el editor enriquecido (negrita/incisos),
  // se inserta ese HTML tal cual (ya viene saneado a una whitelist de tags al guardar la
  // enmienda); si es una enmienda vieja sin ese campo, cae al texto plano escapado de siempre.
  function amendDescHtml(fallbackMsg){
    var rich=lastEnm.descripcionRica;
    if(rich && String(rich).trim()){
      var clean=(typeof sanitizeRichText==='function') ? sanitizeRichText(rich) : rich;
      // Envuelto en un contenedor justificado explícito: la primera línea tipeada en el editor
      // no siempre queda dentro de un <p> (depende del navegador), así que confiar solo en el
      // selector p{text-align:justify} del documento la dejaba sin justificar.
      return '<div style="text-align:justify">'+clean+'</div>';
    }
    var plain=esc(lastEnm.descripcion||lastEnm.motivo||'');
    return '<p>'+(plain||fallbackMsg)+'</p>';
  }

  var objetoItems=[], sections=[];
  orderedTypes.forEach(function(t){
    if(t==='ACTUALIZACION_TARIFAS'){
      objetoItems.push('Establecer las tarifas para el mes de '+periodosTexto+' en adelante.'+
        '<br><span style="font-size:9.5pt;color:#555">Fórmula aplicada: <em>'+esc(polyFormula)+'</em></span>');
      sections.push({title:'PRECIO', body:
        '<p>Se establecen las nuevas tarifas para aplicar a partir del <strong>01 de '+fmtM(selPeriods[0]||newPeriod)+'</strong>:</p>'+periodBlocks});
    } else if(t==='EXTENSION'){
      var finNueva=lastEnm.fechaFinNueva?fD(lastEnm.fechaFinNueva):'';
      objetoItems.push('Extender el plazo del contrato'+(finNueva?(' hasta el '+finNueva):'')+'.');
      sections.push({title:'PLAZO', body:
        '<p>Se extiende la vigencia del contrato'+(finNueva?(' hasta el <strong>'+finNueva+'</strong>'):'')+', manteniendo vigentes el resto de las condiciones pactadas en la OFERTA.</p>'});
    } else if(t==='SCOPE'){
      objetoItems.push('Modificar el alcance del servicio contratado.');
      var scopeItemsHtml=renderScopeItemsTable(lastEnm);
      sections.push({title:'ACT. DE ALCANCE', body:
        amendDescHtml('Se modifica el alcance del servicio contratado, conforme lo detallado en la presente enmienda.')+scopeItemsHtml});
    } else if(t==='CLAUSULAS'){
      objetoItems.push('Modificar y/o incorporar cláusulas de las Condiciones Particulares.');
      sections.push({title:'CLÁUSULAS', body:
        amendDescHtml('Se modifican y/o incorporan cláusulas de las Condiciones Particulares, conforme lo detallado en la presente enmienda.')});
    } else {
      var otroTitle=esc(lastEnm.otroTitulo||'OTROS');
      objetoItems.push('Modificar las condiciones de la OFERTA según lo detallado a continuación.');
      sections.push({title:otroTitle, body:
        amendDescHtml('Se modifican las condiciones de la OFERTA conforme lo detallado en la presente enmienda.')});
    }
  });
  var objetoHtml=objetoItems.map(function(txt,i){ return '<p style="margin-left:20pt">1.'+(i+1)+'&nbsp;&nbsp;'+txt+'</p>'; }).join('');
  var sectionsHtml=sections.map(function(s,i){ return '<p class="section-title">'+(i+2)+'. '+s.title+'</p>'+s.body; }).join('');
  var generalNum=sections.length+2;

  // Construir cuerpo (común a HTML print y Word .doc)
  var bodyHtml=
    // PÁGINA 1 — CARÁTULA / CARTA
    '<div class="page">'+
      '<p style="text-align:right">'+dateStr+'</p>'+
      '<br><p>Señores<br><strong>TOTAL AUSTRAL S.A</strong><br>Moreno 877, Piso 15,<br>Buenos Aires (C1091AAQ)<br>República Argentina</p>'+
      '<br><div class="ref-line"><strong>At:</strong>&nbsp;<span>'+esc(contract.resp||'Responsable del Contrato')+'</span></div>'+
      '<div class="ref-line"><strong>Ref.:</strong>&nbsp;<span>Propuesta de Enmienda N°'+enmNum+' a la OFERTA N.°&nbsp;'+esc(contract.num)+' '+esc(contract.det||contract.cont||'')+'.</span></div>'+
      '<br><p>De mi mayor consideración:</p>'+
      '<p>Me dirijo a TOTAL AUSTRAL S.A. (la &ldquo;COMPAÑÍA&rdquo;) en mi carácter de apoderado de <strong>'+esc(contract.cont||'EL CONTRATISTA')+'</strong> a los fines de efectuar la siguiente propuesta de Enmienda N°'+enmNum+' al '+esc(contract.det||'servicio contratado')+' (la &ldquo;PROPUESTA&rdquo;).</p>'+
      '<div class="center" style="margin-top:42pt;text-align:center">'+
        '<p style="font-weight:700;font-size:13pt;text-align:center">PROPUESTA DE ENMIENDA N°'+enmNum+'</p>'+
        '<p style="text-align:center">a la OFERTA N.° '+esc(contract.num)+'</p>'+
        '<p style="font-weight:700;text-transform:uppercase;margin-top:10pt;text-align:center">'+esc((contract.det||contract.cont||'').toUpperCase())+'</p>'+
        '<p style="margin-top:14pt;text-align:center">entre</p>'+
        '<p style="font-weight:700;margin-top:10pt;text-align:center">TOTAL AUSTRAL S.A.</p>'+
        '<p style="margin-top:6pt;text-align:center">y</p>'+
        '<p style="font-weight:700;margin-top:10pt;text-align:center">'+esc(contract.cont||'EL CONTRATISTA')+'</p>'+
      '</div>'+
    '</div>'+
    (forWord?'<br clear=all style="page-break-before:always">':'')+
    // PÁGINA 2+ — CUERPO
    '<div class="page">'+
      '<p class="section-title">1. OBJETO</p>'+
      '<p>Por la presente Enmienda a las Condiciones Particulares y en uso del Artículo 2 &ldquo;Definiciones&rdquo; de las Condiciones Generales de la OFERTA N.°&nbsp;'+esc(contract.num)+' las Partes acuerdan lo que a continuación se detalla:</p>'+
      objetoHtml+
      sectionsHtml+
      '<p class="section-title">'+generalNum+'. GENERAL</p>'+
      '<p>Las restantes condiciones de la OFERTA permanecen vigentes e inalterables.</p>'+
      '<p>La presente PROPUESTA será considerada <u>aceptada</u> por la COMPAÑÍA <u>con la continuidad</u> en la demanda del servicio y/o <u>con el ingreso</u> de equipos y/o personal del OFERENTE a <u>las instalaciones</u> de la COMPAÑÍA.</p>'+
      '<p style="margin-top:14pt">Atentamente,</p>'+
      '<div class="firma" style="margin-top:30pt">'+
        '<p style="font-weight:700">POR '+esc((contract.cont||'EL CONTRATISTA').toUpperCase())+'</p>'+
        '<p>Firma:&nbsp;&nbsp;&nbsp;&nbsp;___________________________</p>'+
        '<p>Nombre:&nbsp;___________________________</p>'+
        '<p>Cargo:&nbsp;&nbsp;&nbsp;&nbsp;___________________________</p>'+
      '</div>'+
    '</div>';

  if(forWord){
    // Sólo el body — el caller envuelve con headers MS Office
    return bodyHtml;
  }

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Enmienda N°'+enmNum+' — '+contract.num+'</title>'+
  '<style>*{box-sizing:border-box;margin:0;padding:0}'+
  'body{font-family:"Times New Roman",serif;font-size:11pt;color:#000;background:#fff;line-height:1.5}'+
  '.page{width:210mm;min-height:297mm;margin:0 auto;padding:25mm 22mm;page-break-after:always}'+
  '.page:last-child{page-break-after:auto}'+
  'h2{font-size:12pt;font-weight:700;margin-bottom:8pt}'+
  'p{margin-bottom:8pt;text-align:justify}div{margin-bottom:2pt}'+
  'ol{list-style-type:lower-alpha;margin:0 0 8pt 22pt;padding:0}li{margin-bottom:4pt}'+
  '.center{text-align:center;margin:18pt 0}.center p{text-align:center;margin-bottom:6pt}'+
  '.section-title{font-size:11pt;font-weight:700;text-decoration:underline;margin:14pt 0 8pt}'+
  '.ref-line{margin-bottom:6pt}.ref-line>strong{display:inline-block;min-width:32pt}'+
  'table{width:100%;border-collapse:collapse;margin:10pt 0 14pt;page-break-inside:avoid}'+
  'th{padding:5pt 7pt;font-size:9.5pt;font-weight:700;background:#1b3f6e;color:#fff;text-align:left}'+
  'th.num,td.num{text-align:right}'+
  'td{padding:4pt 7pt;font-size:9.5pt;border-bottom:1px solid #d0d4d9}'+
  'tr.tot td{background:#eef2f7;font-weight:700}'+
  '.period-block{margin-bottom:14pt}'+
  '.period-title{font-size:10.5pt;font-weight:700;color:#1b3f6e;margin-bottom:6pt;text-transform:uppercase;letter-spacing:.4px}'+
  '.firma p{margin-bottom:14pt}'+
  '.toolbar{position:fixed;top:8px;right:8px;background:#fff;border:1px solid #d0d4d9;border-radius:6px;padding:6px 8px;display:flex;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,.08);font-family:Arial,sans-serif;font-size:11pt;z-index:9999}'+
  '.toolbar button{cursor:pointer;border:1px solid #d0d4d9;background:#f0f4f8;padding:6px 10px;border-radius:4px;font-size:11pt}'+
  '.toolbar button:hover{background:#e2e8f0}'+
  '@media print{body{margin:0}.page{margin:0;padding:20mm 18mm}.toolbar{display:none}}'+
  '</style></head><body>'+
  '<div class="toolbar"><button onclick="window.print()">🖨️ Imprimir / PDF</button><button onclick="window.opener&&window.opener.downloadAmendmentDoc(\''+cid+'\','+(targetEnmNum!=null?targetEnmNum:'null')+');">📝 Descargar .doc</button></div>'+
  bodyHtml+
  '</body></html>';
}

window.toggleAlertSection = function(section) {
  const content = document.getElementById('section' + section.charAt(0).toUpperCase() + section.slice(1));
  const toggle = document.getElementById('toggle' + section.charAt(0).toUpperCase() + section.slice(1));
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggle.textContent = '▼';
  } else {
    content.style.display = 'none';
    toggle.textContent = '▶';
  }
};

function viewAlertContract(id) {
  window.detId = id;
  go('detail');
}

// ═══════════════ DASHBOARD ═══════════════

function getTCFromStore() {
  // Obtener TC directamente de IDX_STORE (bypass getIndicatorSnapshots)
  if (!IDX_STORE || typeof IDX_STORE !== 'object') {
    console.warn('[getTCFromStore] IDX_STORE no disponible');
    return null;
  }
  
  const codigosPosibles = ['usd_div'];
  
  for (let codigo of codigosPosibles) {
    if (IDX_STORE[codigo] && Array.isArray(IDX_STORE[codigo].rows) && IDX_STORE[codigo].rows.length > 0) {
      const rows = IDX_STORE[codigo].rows;
      const ultimaRow = rows[rows.length - 1];
      if (ultimaRow && ultimaRow.value) {
        console.log('[getTCFromStore] TC encontrado:', codigo, '=', ultimaRow.value);
        return Number(ultimaRow.value);
      }
    }
  }
  
  console.warn('[getTCFromStore] No se encontró TC en IDX_STORE');
  return null;
}

let chartDominio = null;
let chartProveedores = null;

// Calcula métricas ejecutivas y renderiza el bloque "Acciones pendientes" del dashboard.
