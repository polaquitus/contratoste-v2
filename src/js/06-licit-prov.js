function renderLicit(){
  loadLicit();
  if(_licitDet){
    document.getElementById('licitList').style.display='none';
    document.getElementById('licitDet').style.display='';
    renderLicitDet(_licitDet);
  } else {
    document.getElementById('licitList').style.display='';
    document.getElementById('licitDet').style.display='none';
    renderLicitList();
  }
}

function renderLicitList(){
  const box=document.getElementById('licitList');if(!box)return;
  if(!LICIT_DB.length){
    box.innerHTML=`<div style="text-align:center;padding:60px 20px;color:var(--g500)">
      <div style="font-size:40px;margin-bottom:12px">📋</div>
      <p style="font-size:14px;font-weight:600;margin-bottom:6px">Sin licitaciones registradas</p>
      <p style="font-size:12px;margin-bottom:20px">Registrá los procesos de RFQ ARIBA o licitaciones de mail para generar cuadros comparativos.</p>
      <button class="btn btn-p" onclick="openLicitModal(null)">➕ Nueva Licitación</button>
    </div>`;
    return;
  }
  let h='<div style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap">';
  const stats={total:LICIT_DB.length,adj:LICIT_DB.filter(l=>l.estado==='ADJUDICADA').length,proc:LICIT_DB.filter(l=>l.estado==='EN_PROCESO').length};
  h+=`<div style="background:var(--w);border-radius:8px;padding:10px 16px;box-shadow:var(--sh);display:flex;gap:20px;flex:1">
    <div><span style="font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase">Total</span><div style="font-size:20px;font-weight:800;color:var(--p700)">${stats.total}</div></div>
    <div><span style="font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase">Adjudicadas</span><div style="font-size:20px;font-weight:800;color:var(--g600)">${stats.adj}</div></div>
    <div><span style="font-size:10px;font-weight:700;color:var(--g500);text-transform:uppercase">En Proceso</span><div style="font-size:20px;font-weight:800;color:var(--a500)">${stats.proc}</div></div>
  </div></div>`;
  LICIT_DB.slice().reverse().forEach(l=>{
    const eCol=l.estado==='ADJUDICADA'?'var(--g600)':l.estado==='EN_PROCESO'?'var(--a500)':'var(--g500)';
    const eLbl=l.estado==='ADJUDICADA'?'Adjudicada':l.estado==='EN_PROCESO'?'En Proceso':'Desierta';
    h+=`<div class="licit-card ${l.tipo==='RFQ_ARIBA'?'ariba':''} ${l.estado==='ADJUDICADA'?'closed':''}" onclick="openLicitDet('${l.id}')">
      <div class="licit-hdr">
        <span class="licit-num">${esc(l.docAriba||l.id)}</span>
        <div style="flex:1">
          <div class="licit-title">${esc(l.titulo)}</div>
          <div class="licit-meta">
            <span class="bdg ${l.tipo==='RFQ_ARIBA'?'blue':'amber'}" style="font-size:9.5px">${l.tipo==='RFQ_ARIBA'?'RFQ ARIBA':l.tipo==='RFQ_MAIL'?'RFQ MAIL':'DIRECTA'}</span>
            ${l.contrato?`<span class="bdg act" style="font-size:9.5px">Ctto: ${esc(l.contrato)}</span>`:''}
            <span style="font-size:11px;color:var(--g500)">${l.fechaApertura?fD(l.fechaApertura):'Sin fecha'}</span>
            <span style="font-size:11px;font-weight:700;color:${eCol}">${eLbl}</span>
            ${l.ganador?`<span class="winner-badge win">🏆 ${esc(l.ganador)}</span>`:''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-s btn-sm" onclick="event.stopPropagation();openLicitModal('${l.id}')">✏️</button>
          <button class="btn btn-d btn-sm" onclick="event.stopPropagation();deleteLicit('${l.id}')">🗑️</button>
        </div>
      </div>
      ${(l.oferentes||[]).length?`<div style="padding:0 18px 10px;display:flex;gap:6px;flex-wrap:wrap">${l.oferentes.map(o=>`<span style="font-size:10.5px;background:var(--g100);border-radius:99px;padding:2px 8px;color:var(--g700)">${esc(o.nombre)} ${o.aprobTec?'✅':'❌'}</span>`).join('')}</div>`:''}
    </div>`;
  });
  box.innerHTML=h;
}

// ── Detail view ────────────────────────────────────────────────────────
function openLicitDet(id){_licitDet=id;renderLicit();}
function closeLicitDet(){_licitDet=null;renderLicit();}

function renderLicitDet(id){
  const l=LICIT_DB.find(x=>x.id===id);
  const box=document.getElementById('licitDet');if(!box||!l)return;
  const ofrs=l.oferentes||[];
  const items=l.items||[];

  // Find lowest/highest per row
  function getMinMax(item){
    const vals=ofrs.map((o,i)=>parseFloat(item.valores?.[i])||0).filter(v=>v>0);
    return{min:vals.length?Math.min(...vals):null,max:vals.length?Math.max(...vals):null};
  }

  // Build table header
  let thOfrs=ofrs.map((o,i)=>`<th class="ofr-th">
    <div class="ofr-header">
      <div class="ofr-name">${esc(o.nombre)}</div>
      <div class="ofr-status">${o.aprobTec?'<span class="aprobado">✅ Aprobado Tec.</span>':'<span class="rechazado">❌ No aprobado</span>'}</div>
      ${o.part2da!==undefined?`<div class="ofr-status">${o.part2da?'<span class="aprobado">2da ronda ✓</span>':'<span class="rechazado">No participó 2da</span>'}</div>`:''}
    </div>
  </th>`).join('');

  // Build rows
  let trows='';
  items.forEach((item,ri)=>{
    if(item.tipo==='seccion'){
      trows+=`<tr class="section-row"><td class="desc-td" colspan="${ofrs.length+2}">${esc(item.desc)}</td></tr>`;
      return;
    }
    if(item.tipo==='subtotal'){
      // Sum numeric rows in same section
      let subtotals=ofrs.map((o,oi)=>{
        let sum=0;
        // walk backwards from ri to find section start
        for(let k=ri-1;k>=0;k--){
          if(items[k].tipo==='seccion'||items[k].tipo==='subtotal')break;
          sum+=parseFloat(items[k].valores?.[oi])||0;
        }
        return sum;
      });
      const minST=Math.min(...subtotals.filter(v=>v>0));
      const stCells=subtotals.map(v=>`<td class="num-td subtotal ${v>0&&v===minST?'lowest':''}">${v>0?fN(v):'—'}</td>`).join('');
      trows+=`<tr class="subtotal-row"><td class="desc-td" colspan="2">Σ ${esc(item.desc)}</td>${stCells}</tr>`;
      return;
    }
    const{min,max}=getMinMax(item);
    const valCells=ofrs.map((o,oi)=>{
      const v=parseFloat(item.valores?.[oi]);
      const isLowest=v>0&&v===min;const isHighest=v>0&&v===max&&ofrs.length>1&&min!==max;
      return `<td class="num-td ${isLowest?'lowest':isHighest?'highest':''}">${!isNaN(v)&&v>0?fN(v):'—'}</td>`;
    }).join('');
    const overBest=min>0?ofrs.map((o,oi)=>{
      const v=parseFloat(item.valores?.[oi]);
      if(!v||v===min)return'';
      return`<span style="font-size:9px;color:var(--r500)">+${((v/min-1)*100).toFixed(1)}%</span>`;
    }):'';
    trows+=`<tr>
      <td class="desc-td">${esc(item.desc)}</td>
      <td style="font-size:10.5px;color:var(--g500);white-space:nowrap">${esc(item.um||'')}</td>
      ${valCells}
    </tr>`;
  });

  // Total row
  const totals=ofrs.map((o,oi)=>{
    return items.filter(it=>it.tipo==='item').reduce((s,it)=>{
      const v=parseFloat(it.valores?.[oi]);return s+(isNaN(v)?0:v);
    },0);
  });
  const minTot=Math.min(...totals.filter(v=>v>0));
  const totCells=totals.map(v=>`<td class="num-td subtotal ${v>0&&v===minTot?'lowest':''}" style="font-size:14px">${v>0?fN(v):'—'}</td>`).join('');

  const adjFiles=(l.adjuntos||[]).map((f,fi)=>`<span class="attach-chip" onclick="downloadLicitFile('${id}',${fi})">📎 ${esc(f.name)}</span>`).join(' ');

  box.innerHTML=`
  <div style="margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <button class="btn btn-s btn-sm" onclick="closeLicitDet()">← Volver</button>
    <h2 style="font-size:16px;font-weight:700;color:var(--p900);flex:1">${esc(l.titulo)}</h2>
    <button class="btn btn-p btn-sm" onclick="openLicitModal('${id}')">✏️ Editar licitación</button>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div style="padding:14px 18px;display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid var(--g100)">
      <div class="dc"><div class="dl">Doc. Ariba / ID</div><div class="dv mono">${esc(l.docAriba||'—')}</div></div>
      <div class="dc"><div class="dl">Tipo</div><div class="dv">${l.tipo==='RFQ_ARIBA'?'RFQ ARIBA':l.tipo==='RFQ_MAIL'?'RFQ MAIL':'Directa'}</div></div>
      <div class="dc"><div class="dl">Fecha Apertura</div><div class="dv">${l.fechaApertura?fD(l.fechaApertura):'—'}</div></div>
      <div class="dc" style="border-right:none"><div class="dl">Contrato vinculado</div><div class="dv mono">${esc(l.contrato||'—')}</div></div>
    </div>
    <div style="padding:12px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span class="bdg ${l.estado==='ADJUDICADA'?'act':l.estado==='EN_PROCESO'?'amber':'exp'}">${l.estado==='ADJUDICADA'?'ADJUDICADA':l.estado==='EN_PROCESO'?'EN PROCESO':'DESIERTA'}</span>
      ${l.ganador?`<span class="winner-badge win">🏆 Ganador: ${esc(l.ganador)}</span>`:''}
      ${adjFiles?`<div style="display:flex;gap:6px;flex-wrap:wrap">${adjFiles}</div>`:''}
      ${l.obs?`<span style="font-size:12px;color:var(--g600c)">${esc(l.obs)}</span>`:''}
    </div>
  </div>
  ${ofrs.length&&items.length?`
  <div class="card" style="overflow:hidden">
    <div style="padding:12px 18px;border-bottom:1px solid var(--g100);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:13px;font-weight:700;color:var(--p900)">📊 Cuadro Comparativo de Ofertas</span>
      <div style="display:flex;gap:6px">
        <span style="font-size:11px;color:var(--g500)">🟢 Menor precio · 🔴 Mayor precio</span>
      </div>
    </div>
    <div style="overflow-x:auto">
      <table class="comp-tbl">
        <thead><tr>
          <th class="desc-th">Ítem / Descripción</th>
          <th style="background:var(--p800);color:var(--w);min-width:60px;text-align:center">U/M</th>
          ${thOfrs}
        </tr></thead>
        <tbody>
          ${trows}
          <tr class="subtotal-row" style="background:var(--p900)">
            <td class="desc-td" colspan="2" style="background:var(--p900);color:var(--w);font-size:13px">TOTAL GENERAL</td>
            ${totCells}
          </tr>
        </tbody>
      </table>
    </div>
  </div>`:'<div class="card" style="padding:32px;text-align:center;color:var(--g500)"><p>Sin oferentes ni ítems. <button class="btn btn-p btn-sm" onclick="openLicitModal(\''+id+'\')">Completar cuadro comparativo</button></p></div>'}`;
}

function downloadLicitFile(id,fi){
  const l=LICIT_DB.find(x=>x.id===id);const f=l?.adjuntos?.[fi];if(!f)return;
  const a=document.createElement('a');a.href=f.data;a.download=f.name;a.click();
}
function deleteLicit(id){
  if(!confirm('¿Eliminar esta licitación?'))return;
  LICIT_DB=LICIT_DB.filter(l=>l.id!==id);saveLicit();renderLicit();toast('Eliminada','ok');
}

// ── Modal ──────────────────────────────────────────────────────────────
let _licitFiles=[];
function openLicitModal(id){
  const l=id?LICIT_DB.find(x=>x.id===id):null;
  _licitFiles=l?.adjuntos?.[0]?[...l.adjuntos]:[];
  const ofrs=l?.oferentes||[{nombre:'',aprobTec:true,part2da:false,doc2da:''}];
  const items=l?.items||[{id:'i1',tipo:'item',desc:'',um:'',valores:{}}];

  function renderOfrList(){return ofrs.map((o,i)=>`
    <div style="display:grid;grid-template-columns:1fr 120px 120px 120px 36px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--g100)">
      <input type="text" placeholder="Nombre del oferente" value="${esc(o.nombre)}" onchange="_licitOfrs[${i}].nombre=this.value" style="font-size:12px">
      <select onchange="_licitOfrs[${i}].aprobTec=this.value==='si'" style="font-size:11px">
        <option value="si" ${o.aprobTec?'selected':''}>✅ Aprobado Tec.</option>
        <option value="no" ${!o.aprobTec?'selected':''}>❌ No aprobado</option>
      </select>
      <select onchange="_licitOfrs[${i}].part2da=this.value==='si'" style="font-size:11px">
        <option value="">Sin 2da ronda</option>
        <option value="si" ${o.part2da===true?'selected':''}>Participó 2da</option>
        <option value="no" ${o.part2da===false&&o.part2da!==undefined?'selected':''}>No participó 2da</option>
      </select>
      <input type="text" placeholder="Doc. 2da ronda" value="${esc(o.doc2da||'')}" onchange="_licitOfrs[${i}].doc2da=this.value" style="font-size:11px">
      <button class="btn btn-d btn-sm" style="padding:4px 7px" onclick="_licitOfrs.splice(${i},1);refreshLicitModal()">✕</button>
    </div>`).join('');}

  function renderItemList(){return items.map((it,ri)=>{
    const typeSel=`<select onchange="_licitItems[${ri}].tipo=this.value;refreshLicitModal()" style="font-size:11px;width:100px">
      <option value="item" ${it.tipo==='item'?'selected':''}>Ítem</option>
      <option value="seccion" ${it.tipo==='seccion'?'selected':''}>Sección</option>
      <option value="subtotal" ${it.tipo==='subtotal'?'selected':''}>Subtotal</option>
    </select>`;
    if(it.tipo==='seccion'||it.tipo==='subtotal'){
      return `<div style="display:flex;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--g100);background:${it.tipo==='seccion'?'var(--p50)':'var(--g50)'}">
        ${typeSel}
        <input type="text" value="${esc(it.desc)}" placeholder="${it.tipo==='seccion'?'Nombre de sección':'Nombre del subtotal'}" onchange="_licitItems[${ri}].desc=this.value" style="flex:1;font-size:12px">
        <button class="btn btn-d btn-sm" style="padding:3px 6px" onclick="_licitItems.splice(${ri},1);refreshLicitModal()">✕</button>
      </div>`;
    }
    const valInputs=ofrs.map((o,oi)=>`<input type="number" step="0.01" min="0" placeholder="0" value="${it.valores?.[oi]??''}" onchange="_licitItems[${ri}].valores[${oi}]=parseFloat(this.value)||0" style="width:100px;font-size:11px;text-align:right;font-family:'JetBrains Mono',monospace">`).join('');
    return `<div style="display:grid;grid-template-columns:80px 1fr 60px ${ofrs.map(()=>'100px').join(' ')} 36px;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--g100)">
      ${typeSel}
      <input type="text" value="${esc(it.desc)}" placeholder="Descripción del ítem" onchange="_licitItems[${ri}].desc=this.value" style="font-size:12px">
      <input type="text" value="${esc(it.um||'')}" placeholder="U/M" onchange="_licitItems[${ri}].um=this.value" style="font-size:11px">
      ${valInputs}
      <button class="btn btn-d btn-sm" style="padding:3px 6px" onclick="_licitItems.splice(${ri},1);refreshLicitModal()">✕</button>
    </div>`;
  }).join('');}

  window._licitOfrs=ofrs.map(o=>({...o}));
  window._licitItems=items.map(it=>({...it,valores:{...it.valores}}));
  window._editingLicitId=id;

  function buildModal(){
    return `<div class="idx-modal-hdr">
      <h3>${l?'✏️ Editar':'➕ Nueva'} Licitación</h3>
      <button class="btn btn-s btn-sm" onclick="closeLicitModal()">✕</button>
    </div>
    <div class="idx-modal-body">
      <div class="fg" style="margin-bottom:14px">
        <div class="fgrp"><label>Título / Objeto <span class="req">*</span></label><input type="text" id="lm_tit" value="${esc(l?.titulo||'')}" placeholder="Ej: Servicio de Mantenimiento YPF APE"></div>
        <div class="fgrp"><label>N° Doc Ariba / ID</label><input type="text" id="lm_doc" value="${esc(l?.docAriba||'')}" placeholder="Ej: DOC-2024-0123"></div>
        <div class="fgrp"><label>Tipo</label><select id="lm_tipo"><option value="RFQ_ARIBA" ${l?.tipo==='RFQ_ARIBA'?'selected':''}>RFQ ARIBA</option><option value="RFQ_MAIL" ${l?.tipo==='RFQ_MAIL'?'selected':''}>RFQ MAIL</option><option value="DIRECTA" ${l?.tipo==='DIRECTA'?'selected':''}>Directa</option></select></div>
        <div class="fgrp"><label>Fecha Apertura</label><input type="date" id="lm_fecha" value="${l?.fechaApertura||''}"></div>
        <div class="fgrp"><label>Contrato vinculado</label><input type="text" id="lm_ctto" value="${esc(l?.contrato||'')}" placeholder="N° contrato Ariba/SAP" list="lm_ctto_list"><datalist id="lm_ctto_list">${window.DB.map(c=>`<option value="${esc(c.num)}">${esc(c.num)} — ${esc(c.cont)}</option>`).join('')}</datalist></div>
        <div class="fgrp"><label>Estado</label><select id="lm_est"><option value="EN_PROCESO" ${(!l||l?.estado==='EN_PROCESO')?'selected':''}>En Proceso</option><option value="ADJUDICADA" ${l?.estado==='ADJUDICADA'?'selected':''}>Adjudicada</option><option value="DESIERTA" ${l?.estado==='DESIERTA'?'selected':''}>Desierta</option></select></div>
      </div>
      <div class="fg2" style="margin-bottom:14px">
        <div class="fgrp"><label>Ganador / Adjudicatario</label><input type="text" id="lm_gan" value="${esc(l?.ganador||'')}" placeholder="Nombre del adjudicatario"></div>
        <div class="fgrp"><label>Observaciones</label><input type="text" id="lm_obs" value="${esc(l?.obs||'')}" placeholder="Notas generales"></div>
      </div>
      <!-- Oferentes -->
      <div style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:11px;font-weight:700;color:var(--g700);text-transform:uppercase;letter-spacing:.5px">Oferentes invitados</label>
          <button class="btn btn-g btn-sm" onclick="_licitOfrs.push({nombre:'',aprobTec:true,part2da:undefined,doc2da:''});refreshLicitModal()">＋ Oferente</button>
        </div>
        <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--g500);display:grid;grid-template-columns:1fr 120px 120px 120px 36px;gap:8px;margin-bottom:4px">
          <span>Empresa</span><span>Aprob. Técnica</span><span>2da Ronda</span><span>Doc. 2da Ronda</span><span></span>
        </div>
        <div id="lm_ofrs">${renderOfrList()}</div>
      </div>
      <!-- Ítems cuadro comparativo -->
      <div style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:11px;font-weight:700;color:var(--g700);text-transform:uppercase;letter-spacing:.5px">Cuadro comparativo de ítems</label>
          <div style="display:flex;gap:6px">
            <button class="btn btn-s btn-sm" onclick="_licitItems.push({id:'i'+Date.now(),tipo:'seccion',desc:'Nueva Sección',valores:{}});refreshLicitModal()">＋ Sección</button>
            <button class="btn btn-g btn-sm" onclick="_licitItems.push({id:'i'+Date.now(),tipo:'item',desc:'',um:'',valores:{}});refreshLicitModal()">＋ Ítem</button>
            <button class="btn btn-s btn-sm" onclick="_licitItems.push({id:'i'+Date.now(),tipo:'subtotal',desc:'Subtotal',valores:{}});refreshLicitModal()">Σ Subtotal</button>
          </div>
        </div>
        ${_licitOfrs.length?`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--g500);display:grid;grid-template-columns:80px 1fr 60px ${_licitOfrs.map(()=>'100px').join(' ')} 36px;gap:6px;margin-bottom:4px;padding:0 0 4px;border-bottom:1px solid var(--g200)">
          <span>Tipo</span><span>Descripción</span><span>U/M</span>${_licitOfrs.map(o=>`<span style="text-align:right">${esc(o.nombre||'Oferente')}</span>`).join('')}<span></span>
        </div>`:'<div class="info-box amber" style="font-size:11px;margin-bottom:8px">Agregá al menos un oferente para cargar los valores del cuadro comparativo.</div>'}
        <div id="lm_items" style="max-height:300px;overflow-y:auto">${renderItemList()}</div>
      </div>
      <!-- Adjuntos -->
      <div class="fgrp" style="margin-bottom:6px">
        <label>Adjuntos (actas, evaluaciones, etc.)</label>
        <div class="fzone" style="padding:10px" onclick="document.getElementById('lm_finput').click()"><div class="fzi" style="font-size:18px">📎</div><div class="fzt">Adjuntá documentación del proceso</div></div>
        <input type="file" id="lm_finput" multiple style="display:none" onchange="handleLicitFiles(this.files)">
        <div id="lm_flist">${_licitFiles.map((f,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--g100);font-size:12px"><span style="flex:1">📎 ${esc(f.name)}</span><button class="btn btn-d btn-sm" style="padding:2px 6px;font-size:10px" onclick="_licitFiles.splice(${i},1);refreshLicitModal()">✕</button></div>`).join('')}</div>
      </div>
    </div>
    <div class="idx-modal-foot">
      <button class="btn btn-s btn-sm" onclick="closeLicitModal()">Cancelar</button>
      <button class="btn btn-p" onclick="saveLicitModal()">💾 Guardar Licitación</button>
    </div>`;
  }

  window.refreshLicitModal=function(){
    const ofrs=window._licitOfrs;const items=window._licitItems;
    document.getElementById('lm_ofrs').innerHTML=renderOfrList();
    document.getElementById('lm_items').innerHTML=renderItemList();
  };
  document.getElementById('licitModalBox').innerHTML=buildModal();
  document.getElementById('licitModalBack').style.display='flex';
}

function handleLicitFiles(fl){
  for(const f of fl){if(_licitFiles.length>=8)break;const r=new FileReader();r.onload=e=>{_licitFiles.push({name:f.name,size:f.size,data:e.target.result});document.getElementById('lm_flist').innerHTML=_licitFiles.map((f,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--g100);font-size:12px"><span style="flex:1">📎 ${esc(f.name)}</span><button class="btn btn-d btn-sm" style="padding:2px 6px;font-size:10px" onclick="_licitFiles.splice(${i},1)">✕</button></div>`).join('');};r.readAsDataURL(f);}
}

function saveLicitModal(){
  const tit=document.getElementById('lm_tit')?.value.trim();
  if(!tit){toast('Ingresá el título','er');return;}
  const id=window._editingLicitId||Date.now().toString(36)+Math.random().toString(36).substr(2,4);
  const licit={
    id,
    titulo:tit,
    docAriba:document.getElementById('lm_doc')?.value.trim()||'',
    tipo:document.getElementById('lm_tipo')?.value||'RFQ_ARIBA',
    fechaApertura:document.getElementById('lm_fecha')?.value||'',
    contrato:document.getElementById('lm_ctto')?.value.trim()||'',
    estado:document.getElementById('lm_est')?.value||'EN_PROCESO',
    ganador:document.getElementById('lm_gan')?.value.trim()||'',
    obs:document.getElementById('lm_obs')?.value.trim()||'',
    oferentes:window._licitOfrs||[],
    items:window._licitItems||[],
    adjuntos:_licitFiles,
    createdAt:window._editingLicitId?(LICIT_DB.find(l=>l.id===window._editingLicitId)?.createdAt||new Date().toISOString()):new Date().toISOString()
  };
  if(window._editingLicitId){const i=LICIT_DB.findIndex(l=>l.id===window._editingLicitId);if(i>=0)LICIT_DB[i]=licit;else LICIT_DB.push(licit);}
  else LICIT_DB.push(licit);
  saveLicit();closeLicitModal();
  if(_licitDet)renderLicitDet(id);else renderLicitList();
  toast('Licitación guardada','ok');
}

function closeLicitModal(){document.getElementById('licitModalBack').style.display='none';_licitFiles=[];}


// ═══════════════════════════════════════════════════════════════════════
//  RUBROS catalog (TotalEnergies category structure)
// ═══════════════════════════════════════════════════════════════════════
const RUBROS = [
  {code:'IDR/VOY', label:'Travel and Transportation'},
  {code:'IDR/SMG', label:'General Services'},
  {code:'IDR/ITE', label:'Corporate IT'},
  {code:'IDR/IS',  label:'Intellectual Services'},
  {code:'IDR/DS',  label:'Digital Solutions'},
  {code:'IDR/COM', label:'Communication and Events'},
  {code:'MKM/RNM', label:'Network & New Mobilities'},
  {code:'MKM/LTR', label:'Logistics and Transports'},
  {code:'MKM/EMB', label:'Packaging'},
  {code:'MKM/CPI', label:'Constructions & Integrated Projects'},
  {code:'PJE/EISC',label:'Electricity, Instrumentation and Control Systems'},
  {code:'PJE/EQP', label:'Static Equipment'},
  {code:'PJE/FE',  label:'Facilities and Engineering'},
  {code:'PJE/SUB', label:'Subsea'},
  {code:'PJE/ROT', label:'Rotating Equipment'},
  {code:'PJE/RES', label:'Renewable Equipment & Solar'},
  {code:'PJE/WIND',label:'Wind Energy'},
  {code:'PSI/TRV', label:'Piping, Fittings, Valves'},
  {code:'PSI/RDGC',label:'Remediation, Waste and Civil Engineering'},
  {code:'PSI/GAZ', label:'Industrial Gases'},
  {code:'PSI/CHIM',label:'Chemical Products'},
  {code:'PSI/AM',  label:'Turnarounds and Maintenance'},
  {code:'UPS/UL',  label:'Upstream Logistics'},
  {code:'UPS/SIS', label:'Survey & Seismic'},
  {code:'UPS/RIG', label:'Drilling Rigs'},
  {code:'UPS/DWES',label:'Drilling & Wells Equipment and Services'},
  {code:'OOC',     label:'Other Categories (out of scope)'},
];

// ═══════════════════════════════════════════════════════════════════════
//  CONTRACT COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════
function getContComp(c){
  // PENDIENTE: came from SAP import — monto=0 AND no manual data entered
  if((!c.monto||c.monto===0)&&!c.resp&&!c.rtec) return 'PENDIENTE';
  // COMPLETO: has all key fields
  const hasBase = c.monto>0 && c.resp && c.rtec && c.fechaIni && c.fechaFin;
  const hasPoly = c.hasPoly && c.poly && c.poly.some(p=>p.idx);
  const hasTar  = c.tarifarios && c.tarifarios.length>0;
  if(hasBase && (hasPoly||!c.hasPoly) && hasTar) return 'COMPLETO';
  if(hasBase) return 'PARCIAL';
  return 'PENDIENTE';
}

// ═══════════════════════════════════════════════════════════════════════
//  SAP CONTRACTS IMPORT (ME3N Excel)
// ═══════════════════════════════════════════════════════════════════════
function importSapContractsModal(){
  const box = document.createElement('div');
  box.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:600;display:flex;align-items:center;justify-content:center';
  box.id='sapImportBack';
  box.innerHTML=`<div style="background:var(--w);border-radius:var(--radl);box-shadow:0 20px 60px rgba(0,0,0,.3);width:560px;max-width:95vw;max-height:90vh;overflow-y:auto">
    <div class="idx-modal-hdr">
      <h3>📥 Importar contratos desde SAP (ME3N)</h3>
      <button class="btn btn-s btn-sm" onclick="document.getElementById('sapImportBack').remove()">✕</button>
    </div>
    <div class="idx-modal-body">
      <div class="info-box blue" style="margin-bottom:14px;font-size:12px">
        Adjuntá el reporte <strong>ME3N</strong> exportado de SAP. Se importarán los contratos nuevos.<br>
        Los contratos ya existentes <strong>no se sobreescriben</strong> — se mantiene toda la info manual.
      </div>
      <div class="sap-import-zone" onclick="document.getElementById('sapFile').click()">
        <div style="font-size:28px;margin-bottom:6px">📊</div>
        <div style="font-size:13px;font-weight:600;color:var(--p700)">Arrastrá o hacé clic para seleccionar</div>
        <div style="font-size:11px;color:var(--g500);margin-top:4px">Archivo Excel ME3N exportado de SAP (.xlsx)</div>
      </div>
      <input type="file" id="sapFile" accept=".xlsx,.xls" style="display:none" onchange="processSapImport(this)">
      <div id="sapImportResult"></div>
    </div>
    <div class="idx-modal-foot">
      <button class="btn btn-s btn-sm" onclick="document.getElementById('sapImportBack').remove()">Cancelar</button>
    </div>
  </div>`;
  box.querySelector('.sap-import-zone').ondragover=e=>{e.preventDefault();};
  box.querySelector('.sap-import-zone').ondrop=e=>{e.preventDefault();if(e.dataTransfer.files[0]){processSapImportFile(e.dataTransfer.files[0]);}};
  document.body.appendChild(box);
}

function processSapImport(input){
  if(input.files[0]) processSapImportFile(input.files[0]);
}

function processSapImportFile(file){
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
      if(json.length<2){toast('Archivo vacío','er');return;}
      const headers=json[0].map(h=>String(h).trim());
      const colMap={
        doc: headers.findIndex(h=>/Purchasing Document/i.test(h)),
        text: headers.findIndex(h=>/Short Text/i.test(h)),
        vendor: headers.findIndex(h=>/Name of Vendor/i.test(h)),
        curr: headers.findIndex(h=>/Currency/i.test(h)),
        ini: headers.findIndex(h=>/Validity.*Start/i.test(h)),
        fin: headers.findIndex(h=>/Validity Period End/i.test(h)),
        tv: headers.findIndex(h=>/Target Val/i.test(h)),
        grp: headers.findIndex(h=>/Purchasing Group/i.test(h)),
        rel: headers.findIndex(h=>/Release State/i.test(h)),
      };
      // Aggregate by Purchasing Document
      const byDoc={};
      for(let i=1;i<json.length;i++){
        const r=json[i];
        const doc=String(r[colMap.doc]||'').trim();
        if(!doc||doc==='0')continue;
        if(!byDoc[doc]){
          const vRaw=String(r[colMap.vendor]||'').trim();
          const vMatch=vRaw.match(/^(\d+)\s+(.*)/);
          byDoc[doc]={
            num:doc,
            cont:vMatch?vMatch[2].trim():vRaw,
            vendorNum:vMatch?vMatch[1]:'',
            det:String(r[colMap.text]||'').trim(),
            mon:String(r[colMap.curr]||'').trim(),
            fechaIni:parseExcelDate(r[colMap.ini]),
            fechaFin:parseExcelDate(r[colMap.fin]),
            monto:parseFloat(String(r[colMap.tv]||'0').replace(/[^\d.-]/g,''))||0,
            grp:String(r[colMap.grp]||'').trim(),
          };
        }
      }
      const sapContracts=Object.values(byDoc);
      let added=0,skipped=0;
      sapContracts.forEach(sc=>{
        const exists=window.DB.find(d=>d.num===sc.num);
        if(exists){skipped++;return;}
        // Create minimal record — marked as SAP import, pending manual completion
        window.DB.push({
          id:Date.now().toString(36)+Math.random().toString(36).substr(2,5)+'_'+added,
          num:sc.num,
          cont:sc.cont,
          vendorNum:sc.vendorNum,
          det:sc.det,
          tipo:'SERVICIO', // default
          mon:sc.mon,
          monto:sc.monto,
          fechaIni:sc.fechaIni,
          fechaFin:sc.fechaFin,
          plazo:sc.fechaIni&&sc.fechaFin?monthDiffInclusive(sc.fechaIni,sc.fechaFin):0,
          resp:'',rtec:'',own:'',cprov:'',vend:sc.vendorNum,fax:'',
          btar:'',tcontr:'',ariba:'',cc:null,cof:null,oferentes:'',fev:'',
          dd:null,pr:null,sq:null,dg:false,tc:1,
          poly:[],hasPoly:false,trigA:false,trigB:false,trigC:false,trigBpct:null,trigCmes:null,
          tarifarios:[],enmiendas:[],aves:[],adj:[],com:'',
          grp:sc.grp,
          sapImport:true,
          createdAt:new Date().toISOString(),
          updatedAt:new Date().toISOString(),
        });
        added++;
      });
      save();renderList();updNav();
      document.getElementById('sapImportResult').innerHTML=`
        <div class="info-box ${added>0?'blue':'amber'}" style="margin-top:10px">
          <strong>Importación completada</strong><br>
          ✅ ${added} contratos nuevos importados desde SAP<br>
          ${skipped>0?`⏭ ${skipped} ya existían — no se modificaron<br>`:''}
          Los contratos importados aparecen como <span class="comp-badge empty">❌ Pendiente</span> hasta que completes la info manual.
        </div>`;
      toast(`${added} contratos importados de SAP`,'ok');
    }catch(err){toast('Error procesando el archivo','er');console.error(err);}
  };
  reader.readAsArrayBuffer(file);
}

function parseExcelDate(v){
  if(!v||v==='')return'';
  // Try ISO
  const s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.substring(0,10);
  // Try DD/MM/YYYY or similar
  const m=s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if(m)return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return s.substring(0,10)||'';
}

// ═══════════════════════════════════════════════════════════════════════
//  PROVEEDORES MODULE
// ═══════════════════════════════════════════════════════════════════════
let PROV_DB=[];
function saveProv(){localStorage.setItem('prov_v1',JSON.stringify(PROV_DB));localStorage.setItem('contr_v1',JSON.stringify(PROV_DB));}
// loadProv is defined above as async (loads from Supabase contratistas table)

function updNavProv(){
  const el=document.getElementById('provCnt');
  if(el)el.textContent=PROV_DB.length;
}

// ── List ─────────────────────────────────────────────────────────────────
let _provDet=null,_provSrch='';

function renderProv(){
  // loadProv is async - we call it and re-render when done, but also render current state
  if(_provDet){
    document.getElementById('provList').style.display='none';
    document.getElementById('provDet').style.display='';
    renderProvDet(_provDet);
  } else {
    document.getElementById('provList').style.display='';
    document.getElementById('provDet').style.display='none';
    renderProvList();
  }
}

function onProvSrchInput(v){_provSrch=v;debouncedRenderProvList();}
function renderProvList(){
  const box=document.getElementById('provList');if(!box)return;
  const srch=_provSrch.toLowerCase();
  const arr=PROV_DB.filter(p=>!srch||(p.name||'').toLowerCase().includes(srch)||(p.vendorNum||'').includes(srch)||(p.rubro||'').toLowerCase().includes(srch));
  
  let h=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <input type="text" placeholder="Buscar proveedor, N° vendor, rubro..." value="${esc(_provSrch)}" oninput="onProvSrchInput(this.value)" style="flex:1;max-width:320px;font-size:13px">
    <span style="font-size:12px;color:var(--g500)">${arr.length} de ${PROV_DB.length} proveedores</span>
    <button class="btn btn-s btn-sm" onclick="importProvModal()">📥 Importar SAP</button>
  </div>`;

  if(!arr.length){
    h+=`<div style="text-align:center;padding:60px 20px;color:var(--g500)">
      <div style="font-size:40px;margin-bottom:12px">🏢</div>
      <p style="font-size:14px;font-weight:600;margin-bottom:6px">${PROV_DB.length?'Sin resultados':'Sin proveedores'}</p>
      <p style="font-size:12px;margin-bottom:20px">${PROV_DB.length?'Probá con otra búsqueda.':'Importá el listado de SAP o agregá manualmente.'}</p>
      ${!PROV_DB.length?`<div style="display:flex;gap:10px;justify-content:center"><button class="btn btn-s" onclick="importProvModal()">📥 Importar de SAP</button><button class="btn btn-p" onclick="openProvModal(null)">➕ Nuevo manualmente</button></div>`:''}
    </div>`;
    box.innerHTML=h;return;
  }

  // Contar contratos vinculados por proveedor sin recorrer window.DB una vez por
  // proveedor (antes era O(proveedores × contratos) — con el padrón SAP completo
  // esto son millones de comparaciones en cada render/tecla del buscador).
  const cttosByVendor=new Map(), cttosByName=new Map();
  window.DB.forEach(c=>{
    if(c.vendorNum){ if(!cttosByVendor.has(c.vendorNum))cttosByVendor.set(c.vendorNum,[]); cttosByVendor.get(c.vendorNum).push(c.id); }
    if(c.cont){ if(!cttosByName.has(c.cont))cttosByName.set(c.cont,[]); cttosByName.get(c.cont).push(c.id); }
  });
  function cttosLinkedCount(p){
    const ids=new Set([...(cttosByVendor.get(p.vendorNum)||[]),...(cttosByName.get(p.name)||[])]);
    return ids.size;
  }

  h+='<div class="prov-grid">';
  arr.forEach(p=>{
    const rubro=RUBROS.find(r=>r.code===p.rubro);
    const cttosLen=cttosLinkedCount(p);
    h+=`<div class="prov-card" onclick="openProvDet('${p.id}')">
      <div class="prov-hdr">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px">
          <div>
            <div class="prov-name">${esc(p.name)}</div>
            ${p.vendorNum?`<div class="prov-num">${esc(p.vendorNum)}</div>`:''}
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-s btn-sm" style="padding:3px 7px;font-size:10px" onclick="event.stopPropagation();openProvModal('${p.id}')">✏️</button>
            <button class="btn btn-d btn-sm" style="padding:3px 7px;font-size:10px" onclick="event.stopPropagation();deleteProv('${p.id}')">🗑️</button>
          </div>
        </div>
        ${rubro?`<div class="rubro-badge" style="margin-top:6px" title="${esc(rubro.label)}">${esc(rubro.code)} · ${esc(rubro.label)}</div>`:''}
      </div>
      <div class="prov-body">
        ${p.contacts&&p.contacts.length?p.contacts.slice(0,1).map(ct=>`<div style="font-size:11.5px;color:var(--g700)">👤 ${esc(ct.name)}${ct.role?' · '+esc(ct.role):''}</div>`).join(''):''}
        ${cttosLen?`<div style="font-size:11px;color:var(--g500);margin-top:4px">📋 ${cttosLen} contrato${cttosLen!==1?'s':''} vinculado${cttosLen!==1?'s':''}</div>`:''}
        ${p.brochure?'<div style="font-size:11px;color:var(--b500);margin-top:2px">📎 Brochure adjunto</div>':''}
      </div>
    </div>`;
  });
  h+='</div>';
  box.innerHTML=h;
}
const debouncedRenderProvList=debounce(renderProvList,180);

// ── Detail ────────────────────────────────────────────────────────────────
function openProvDet(id){_provDet=id;renderProv();}
function closeProvDet(){_provDet=null;renderProv();}

function renderProvDet(id){
  const p=PROV_DB.find(x=>x.id===id);
  const box=document.getElementById('provDet');if(!box||!p)return;
  const rubro=RUBROS.find(r=>r.code===p.rubro);
  const cttos=window.DB.filter(c=>c.vendorNum===p.vendorNum||c.cont===p.name);

  const contactsHtml=(p.contacts||[]).map((ct,ci)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--g50);border-radius:6px;margin-bottom:6px">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${esc(ct.name)}</div>
        ${ct.role?`<div style="font-size:11px;color:var(--g500)">${esc(ct.role)}</div>`:''}
        ${ct.email?`<div style="font-size:11px"><a href="mailto:${esc(ct.email)}" style="color:var(--p600)">${esc(ct.email)}</a></div>`:''}
        ${ct.phone?`<div style="font-size:11px;color:var(--g500)">📞 ${esc(ct.phone)}</div>`:''}
      </div>
    </div>`).join('');

  const cttosHtml=cttos.map(ct=>{
    const fin=new Date(ct.fechaFin+'T00:00:00');const isA=fin>=new Date();
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--g100);cursor:pointer" onclick="verDet('${ct.id}')">
      <span class="mono" style="font-size:12px;color:var(--p700);font-weight:600">${esc(ct.num)}</span>
      <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ct.det||ct.cont)}</span>
      <span class="bdg ${isA?'act':'exp'}" style="font-size:9px">${isA?'ACTIVO':'VENCIDO'}</span>
    </div>`;
  }).join('');

  box.innerHTML=`
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <button class="btn btn-s btn-sm" onclick="closeProvDet()">← Volver</button>
    <h2 style="font-size:16px;font-weight:700;color:var(--p900);flex:1">${esc(p.name)}</h2>
    <button class="btn btn-p btn-sm" onclick="openProvModal('${p.id}')">✏️ Editar</button>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div style="padding:14px 18px;border-bottom:1px solid var(--g100);display:flex;gap:16px;flex-wrap:wrap">
      ${p.vendorNum?`<div><div class="dl">N° Vendor SAP</div><div class="mono" style="font-size:13px;font-weight:700">${esc(p.vendorNum)}</div></div>`:''}
      ${rubro?`<div><div class="dl">Rubro</div><div class="rubro-badge">${esc(rubro.code)} · ${esc(rubro.label)}</div></div>`:''}
      ${p.website?`<div><div class="dl">Web</div><div><a href="${esc(p.website)}" target="_blank" style="color:var(--p600);font-size:12px">↗ ${esc(p.website)}</a></div></div>`:''}
    </div>
    ${p.obs?`<div style="padding:10px 18px;font-size:12.5px;color:var(--g700);border-bottom:1px solid var(--g100)">${esc(p.obs)}</div>`:''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
      <div style="padding:14px 18px;border-right:1px solid var(--g100)">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--g500);margin-bottom:10px">Contactos</div>
        ${contactsHtml||'<div style="font-size:12px;color:var(--g400)">Sin contactos cargados</div>'}
        ${p.brochure?`<div style="margin-top:8px"><span class="attach-chip" onclick="downloadProvBrochure('${p.id}')">📎 ${esc(p.brochure.name)}</span></div>`:''}
      </div>
      <div style="padding:14px 18px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--g500);margin-bottom:10px">Contratos vinculados (${cttos.length})</div>
        ${cttosHtml||'<div style="font-size:12px;color:var(--g400)">Sin contratos</div>'}
      </div>
    </div>
  </div>`;
}

function downloadProvBrochure(id){
  const p=PROV_DB.find(x=>x.id===id);if(!p||!p.brochure)return;
  const a=document.createElement('a');a.href=p.brochure.data;a.download=p.brochure.name;a.click();
}

// ── Modal ─────────────────────────────────────────────────────────────────
let _provContacts=[];
let _provBrochure=null;

function openProvModal(id){
  const p=id?PROV_DB.find(x=>x.id===id):null;
  _provContacts=p?.contacts?JSON.parse(JSON.stringify(p.contacts)):[];
  _provBrochure=p?.brochure||null;

  const rubroOpts=RUBROS.map(r=>`<option value="${r.code}" ${p?.rubro===r.code?'selected':''}>${r.code} — ${r.label}</option>`).join('');

  function renderContacts(){
    return `<div id="pm_contacts">`+_provContacts.map((ct,i)=>`
      <div style="background:var(--g50);border-radius:6px;padding:10px;margin-bottom:8px;position:relative">
        <div style="position:absolute;top:8px;right:8px"><button class="btn btn-d btn-sm" style="padding:2px 7px;font-size:10px" onclick="_provContacts.splice(${i},1);document.getElementById('pm_contacts').outerHTML=renderContactsInner()">✕</button></div>
        <div class="fg2" style="gap:8px">
          <div class="fgrp"><label style="font-size:10px">Nombre</label><input type="text" value="${esc(ct.name||'')}" onchange="_provContacts[${i}].name=this.value" style="font-size:12px"></div>
          <div class="fgrp"><label style="font-size:10px">Rol / Cargo</label><input type="text" value="${esc(ct.role||'')}" onchange="_provContacts[${i}].role=this.value" style="font-size:12px"></div>
          <div class="fgrp"><label style="font-size:10px">Email</label><input type="email" value="${esc(ct.email||'')}" onchange="_provContacts[${i}].email=this.value" style="font-size:12px"></div>
          <div class="fgrp"><label style="font-size:10px">Teléfono</label><input type="text" value="${esc(ct.phone||'')}" onchange="_provContacts[${i}].phone=this.value" style="font-size:12px"></div>
        </div>
      </div>`).join('')+'</div>';
  }

  document.getElementById('provModalBox').innerHTML=`
    <div class="idx-modal-hdr">
      <h3>${p?'✏️ Editar':'➕ Nuevo'} Proveedor</h3>
      <button class="btn btn-s btn-sm" onclick="closeProvModal()">✕</button>
    </div>
    <div class="idx-modal-body">
      <div class="fg" style="margin-bottom:14px">
        <div class="fgrp c2"><label>Razón Social / Nombre <span class="req">*</span></label>
          <input type="text" id="pm_name" value="${esc(p?.name||'')}" placeholder="Nombre del proveedor" list="pm_sap_list">
          <datalist id="pm_sap_list">${SAP_VENDORS.slice(0,200).map(v=>`<option value="${esc(v.l)}" data-num="${esc(v.n)}">${esc(v.n)} — ${esc(v.l)}</option>`).join('')}</datalist>
        </div>
        <div class="fgrp"><label>N° Vendor SAP</label><input type="text" id="pm_vnum" value="${esc(p?.vendorNum||'')}" placeholder="Ej: 1021564"></div>
      </div>
      <div class="fg2" style="margin-bottom:14px">
        <div class="fgrp"><label>Rubro (categoría TotalEnergies)</label>
          <select id="pm_rubro" style="font-size:12px"><option value="">— Sin rubro —</option>${rubroOpts}</select>
        </div>
        <div class="fgrp"><label>Sitio web</label><input type="text" id="pm_web" value="${esc(p?.website||'')}" placeholder="https://..."></div>
      </div>
      <div class="fgrp" style="margin-bottom:14px">
        <label>Observaciones / Perfil de la empresa</label>
        <textarea id="pm_obs" style="min-height:60px" placeholder="Descripción, especializaciones, observaciones...">${esc(p?.obs||'')}</textarea>
      </div>
      <!-- Contactos -->
      <div style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:11px;font-weight:700;color:var(--g700);text-transform:uppercase;letter-spacing:.5px">Contactos</label>
          <button class="btn btn-g btn-sm" onclick="_provContacts.push({name:'',role:'',email:'',phone:''});refreshProvModal()">＋ Contacto</button>
        </div>
        ${renderContacts()}
      </div>
      <!-- Brochure -->
      <div class="fgrp" style="margin-bottom:6px">
        <label>Brochure / Presentación</label>
        <div class="fzone" style="padding:10px" onclick="document.getElementById('pm_brochure').click()">
          <div class="fzi" style="font-size:18px">📎</div>
          <div class="fzt">${_provBrochure?esc(_provBrochure.name):'Adjuntá el brochure de la empresa (PDF)'}</div>
        </div>
        <input type="file" id="pm_brochure" accept=".pdf,.png,.jpg" style="display:none" onchange="handleProvBrochure(this)">
      </div>
    </div>
    <div class="idx-modal-foot">
      <button class="btn btn-s btn-sm" onclick="closeProvModal()">Cancelar</button>
      <button class="btn btn-p" onclick="saveProvModal('${id||''}')">💾 Guardar Proveedor</button>
    </div>`;
  document.getElementById('provModalBack').style.display='flex';

  window.refreshProvModal=function(){
    const box=document.getElementById('pm_contacts');if(box)box.outerHTML=renderContacts();
  };
  // Auto-fill vendor num from SAP when name selected
  document.getElementById('pm_name').addEventListener('change',function(){
    const val=this.value;
    const vMatch=SAP_VENDORS.find(v=>v.l===val||val.startsWith(v.n));
    if(vMatch&&!document.getElementById('pm_vnum').value) document.getElementById('pm_vnum').value=vMatch.n;
  });
}

function handleProvBrochure(input){
  const f=input.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{_provBrochure={name:f.name,size:f.size,data:e.target.result};document.querySelector('#provModalBox .fzt').textContent=f.name;};
  r.readAsDataURL(f);
}

async function saveProvModal(editId){
  const name=document.getElementById('pm_name')?.value.trim();
  if(!name){toast('Ingresá el nombre del contratista','er');return;}
  const id=editId||Date.now().toString(36)+Math.random().toString(36).substr(2,4);
  const prov={
    id,name,
    vendorNum:document.getElementById('pm_vnum')?.value.trim()||'',
    rubro:document.getElementById('pm_rubro')?.value||'',
    website:document.getElementById('pm_web')?.value.trim()||'',
    obs:document.getElementById('pm_obs')?.value.trim()||'',
    contacts:_provContacts,
    brochure:_provBrochure,
    createdAt:editId?(PROV_DB.find(p=>p.id===editId)?.createdAt||new Date().toISOString()):new Date().toISOString(),
  };
  if(editId){const i=PROV_DB.findIndex(p=>p.id===editId);if(i>=0)PROV_DB[i]=prov;else PROV_DB.push(prov);} else PROV_DB.push(prov);
  await saveProv();
  closeProvModal();updNavProv();_provDet=prov.id;renderProv();
  toast('Contratista guardado','ok');
}

function closeProvModal(){document.getElementById('provModalBack').style.display='none';}
function deleteProv(id){
  if(!confirm('¿Eliminar este proveedor?'))return;
  PROV_DB=PROV_DB.filter(p=>p.id!==id);saveProv();renderProvList();updNavProv();toast('Eliminado','ok');
}

// ── SAP Vendors Import ────────────────────────────────────────────────────
function importProvModal(){
  const box=document.createElement('div');
  box.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:600;display:flex;align-items:center;justify-content:center';
  box.id='sapProvBack';
  box.innerHTML=`<div style="background:var(--w);border-radius:var(--radl);box-shadow:0 20px 60px rgba(0,0,0,.3);width:520px;max-width:95vw;padding:0">
    <div class="idx-modal-hdr">
      <h3>📥 Importar Proveedores de SAP</h3>
      <button class="btn btn-s btn-sm" onclick="document.getElementById('sapProvBack').remove()">✕</button>
    </div>
    <div class="idx-modal-body">
      <div class="info-box blue" style="margin-bottom:14px;font-size:12px">
        Adjuntá el Excel de vendors exportado de SAP (columnas: <strong>Name of Vendor</strong>, <strong>VENDOR2</strong>).
        Se crearán registros básicos para proveedores nuevos — podés completar el detalle después.
      </div>
      <div class="sap-import-zone" onclick="document.getElementById('sapProvFile').click()">
        <div style="font-size:28px;margin-bottom:6px">🏢</div>
        <div style="font-size:13px;font-weight:600;color:var(--p700)">Arrastrá o seleccioná el Excel de vendors</div>
      </div>
      <input type="file" id="sapProvFile" accept=".xlsx,.xls" style="display:none" onchange="processSapProvImport(this)">
      <div id="sapProvResult"></div>
    </div>
    <div class="idx-modal-foot">
      <button class="btn btn-s btn-sm" onclick="document.getElementById('sapProvBack').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(box);
}

function processSapProvImport(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      let added=0,skipped=0;
      // Set en vez de PROV_DB.find() dentro del loop: con un padrón de ~1800 vendors
      // ese find() se volvía O(n²) sobre el archivo importado.
      const existingVendors=new Set(PROV_DB.map(p=>String(p.vendorNum||'').trim()).filter(Boolean));
      for(let i=1;i<json.length;i++){
        const r=json[i];
        const nameRaw=String(r[0]||'').trim();
        const vnum=String(r[1]||'').trim();
        if(!nameRaw||nameRaw==='nan')continue;
        const cleanName=nameRaw.replace(/^\d+\s+/,'').trim();
        if(vnum && existingVendors.has(vnum)){skipped++;continue;}
        PROV_DB.push({id:Date.now().toString(36)+Math.random().toString(36).substr(2,4)+'_'+added,name:cleanName,vendorNum:vnum,rubro:'',website:'',obs:'',contacts:[],brochure:null,createdAt:new Date().toISOString()});
        if(vnum)existingVendors.add(vnum);
        added++;
      }
      await saveProv();updNavProv();renderProvList();
      document.getElementById('sapProvResult').innerHTML=`<div class="info-box blue" style="margin-top:10px"><strong>${added}</strong> contratistas importados. ${skipped} ya existían.</div>`;
      toast(`${added} contratistas de SAP importados`,'ok');
    }catch(err){toast('Error procesando el archivo','er');console.error(err);}
  };
  reader.readAsArrayBuffer(file);
}

// ═══════════════════════════════════════
// GEMINI PDF IMPORT FOR ENMIENDAS
// ═══════════════════════════════════════
let _importedEnms = [];


async function importEnmPdfs(files) {
  if (!files || !files.length) return;
  const cc = window.DB.find(x => x.id === window.detId);
  if (!cc) return;

  _importedEnms = [];
  document.getElementById('enmPdfModal').style.display = 'flex';
  document.getElementById('enmPdfResults').innerHTML = '';
  document.getElementById('enmPdfSaveBtn').style.display = 'none';
  document.getElementById('enmPdfStatus').textContent = `Analizando ${files.length} archivo(s) con IA...`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    document.getElementById('enmPdfStatus').textContent = `Analizando ${i+1}/${files.length}: ${file.name}...`;
    try {
      const ext = getFileExt(file.name);
      if (!['pdf','doc','docx'].includes(ext)) throw new Error('Formato no soportado. Solo PDF, DOC o DOCX.');
      if (file.size > 20 * 1024 * 1024) throw new Error('Archivo muy grande (máx 20MB).');
      const payload = await buildGeminiFilePayload(file);
      const result = await analyzeEnmWithGemini(payload, cc, file.name);
      const normalized = normalizeImportedEnm(result, file.name, _importedEnms.length + 1);
      _importedEnms.push(normalized);
      renderImportedEnm(normalized, file.name, _importedEnms.length - 1);
    } catch (e) {
      console.error('importEnmPdfs error', file.name, e);
      renderImportedEnmError(file.name, e.message || 'No se pudo analizar el archivo');
    }
  }

  document.getElementById('enmPdfStatus').textContent = `✅ Análisis completo — ${_importedEnms.length} enmienda(s) detectada(s)`;
  if (_importedEnms.length > 0) document.getElementById('enmPdfSaveBtn').style.display = 'inline-flex';
  document.getElementById('enmPdfIn').value = '';
}

function getFileExt(name=''){ return String(name).toLowerCase().split('.').pop(); }
function getMimeTypeFromFile(file){
  const ext = getFileExt(file.name);
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return file.type || 'application/octet-stream';
}
function fileToBase64(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => {
      const out = String(e.target.result || '');
      const comma = out.indexOf(',');
      res(comma >= 0 ? out.slice(comma + 1) : out);
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function fileToArrayBuffer(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
}
async function extractDocxText(file){
  if (typeof mammoth === 'undefined') return '';
  const arr = await fileToArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer: arr });
  return result && result.value ? result.value.trim() : '';
}
async function extractDocBinaryText(file){
  const arr = await fileToArrayBuffer(file);
  const bytes = new Uint8Array(arr);
  let ascii='';
  for(let i=0;i<bytes.length;i++){
    const c = bytes[i];
    ascii += ((c>=32 && c<=126) || c===10 || c===13 || c===9) ? String.fromCharCode(c) : ' ';
  }
  return ascii.replace(/\s+/g,' ').trim();
}
async function buildGeminiFilePayload(file){
  const ext = getFileExt(file.name);
  const mimeType = getMimeTypeFromFile(file);
  const data = await fileToBase64(file);
  const payload = { ext, mimeType, data, fileName: file.name };
  if (ext === 'docx') payload.fallbackText = await extractDocxText(file);
  else if (ext === 'doc') payload.fallbackText = await extractDocBinaryText(file);
  return payload;
}
function normalizeDateString(v){
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return s;
}
function normalizeTipo(tipo, descripcion=''){
  const raw = String(tipo||'').toUpperCase().trim();
  const desc = String(descripcion||'').toUpperCase();
  if (raw.includes('EXTEN')) return 'EXTENSION';
  if (raw.includes('TARIF') || raw.includes('PRECIO') || raw.includes('AJUST')) return 'ACTUALIZACION_TARIFAS';
  if (raw.includes('SCOPE') || raw.includes('ALCANCE')) return 'SCOPE';
  if (raw.includes('CLAUS')) return 'CLAUSULAS';
  if (desc.includes('PRORROGA') || desc.includes('EXTENS') || desc.includes('VENCIMIENTO')) return 'EXTENSION';
  if (desc.includes('TARIFA') || desc.includes('PRECIO') || desc.includes('AJUSTE') || desc.includes('REDETERMIN')) return 'ACTUALIZACION_TARIFAS';
  if (desc.includes('ALCANCE') || desc.includes('SCOPE')) return 'SCOPE';
  if (desc.includes('CLAUSULA')) return 'CLAUSULAS';
  return 'OTRO';
}
function normalizeImportedEnm(obj, fileName, fallbackNum=1){
  const descripcion = obj.descripcion || obj.resumen || obj.detalle || 'Ver documento importado';
  return {
    tipo: normalizeTipo(obj.tipo, descripcion),
    num: Number(obj.num || fallbackNum || 0),
    fecha: normalizeDateString(obj.fecha || '') || new Date().toISOString().split('T')[0],
    descripcion,
    fechaFinNueva: normalizeDateString(obj.fechaFinNueva || obj.nuevaFechaFin || '') || null,
    montoAjuste: obj.montoAjuste != null && obj.montoAjuste !== '' ? Number(String(obj.montoAjuste).replace(/[^\d,.-]/g,'').replace(',', '.')) : null,
    pctAjuste: obj.pctAjuste != null && obj.pctAjuste !== '' ? Number(String(obj.pctAjuste).replace(/[^\d,.-]/g,'').replace(',', '.')) : null,
    _fileName: fileName,
    _confirmed: true
  };
}
async function callGeminiForEnm(parts, opts) {
  // Use Supabase Edge Function as proxy — keys are stored as secrets server-side
  const SB_FUNC_URL = `${SB_URL}/functions/v1/gemini-proxy`;
  // grounding=true activa Google Search en el proxy (opt-in, default false para
  // no cambiar el comportamiento de los usos existentes de esta función, ej.
  // análisis de enmiendas — ahí no hace falta ni conviene buscar en la web).
  const grounding = !!(opts && opts.grounding);
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(SB_FUNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SB_KEY}`
        },
        body: JSON.stringify(grounding ? { parts, grounding: true } : { parts })
      });
      if (response.status === 503 || response.status === 502) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return response;
    } catch(e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw lastErr || new Error('Error conectando con proxy Gemini');
}


async function analyzeEnmWithGemini(filePayload, cc, fileName='') {
  const prompt = `Sos un asistente experto en contratos de petróleo y gas argentinos. Analizá esta enmienda contractual y devolvé ÚNICAMENTE un objeto JSON válido sin markdown, sin explicaciones.

Contexto del contrato:
- Número: ${cc.num}
- Contratista: ${cc.cont}
- Fecha inicio: ${cc.fechaIni}
- Fecha fin actual: ${cc.fechaFin}
- Archivo: ${fileName}

Devolvé SOLO este JSON (sin bloques de código, sin texto extra):
{
  "tipo": "EXTENSION" | "ACTUALIZACION_TARIFAS" | "SCOPE" | "CLAUSULAS" | "OTRO",
  "num": número entero de enmienda,
  "fecha": "YYYY-MM-DD",
  "descripcion": "descripción completa de qué modifica esta enmienda en 2-3 oraciones",
  "fechasVigencia": ["YYYY-MM-DD", "YYYY-MM-DD"],
  "fechaFinNueva": "YYYY-MM-DD" o null,
  "montoAjuste": número o null,
  "pctAjuste": número o null,
  "listasDePrecios": [
    {
      "periodo": "YYYY-MM",
      "items": [
        {"item": "código o número", "descripcion": "descripción del ítem", "unidad": "unidad", "precio": número}
      ]
    }
  ]
}

Criterios:
- EXTENSION: prorroga plazo, extiende fecha de vencimiento
- ACTUALIZACION_TARIFAS: actualiza precios, tarifas, valores unitarios, listas de precios
- SCOPE: modifica alcance, agrega/quita trabajos
- CLAUSULAS: modifica cláusulas sin cambiar alcance ni tarifas
- fechasVigencia: TODAS las fechas de vigencia mencionadas (ej: si aplica sep y oct, incluir ambas)
- listasDePrecios: extraer TODAS las tablas de precios que encuentres, con sus ítems y valores`;

  let response = await callGeminiForEnm([{text: prompt}, {inline_data: {mime_type: filePayload.mimeType, data: filePayload.data}}]);
  
  // Fallback to text extraction for docx/doc
  if ((!response || !response.ok) && filePayload.fallbackText) {
    console.log('Gemini PDF failed, trying text fallback...');
    response = await callGeminiForEnm([{text: prompt}, {text: `Contenido del documento:\n\n${filePayload.fallbackText.slice(0,120000)}`}]);
  }
  
  if (!response || !response.ok) {
    const errText = response ? await response.text().catch(()=>'') : '';
    if (response && response.status === 429) throw new Error('Límite de requests alcanzado. Esperá 1 minuto.');
    if (response && response.status === 400) throw new Error('Archivo inválido o muy grande (máx 20MB).');
    throw new Error(`Gemini error ${response ? response.status : 'N/A'}: ${errText.slice(0,150)}`);
  }
  
  const data = await response.json();
  console.log('Gemini raw:', JSON.stringify(data?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0,500)));
  const finishReason = data?.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') throw new Error('PDF demasiado grande. Usá el archivo Word (.docx) en su lugar.');
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const txt = parts.map(p => p.text || '').join('\n').trim();
  console.log('Gemini text:', txt.slice(0, 300));
  return extractJsonFromGeminiText(txt);
}

function extractJsonFromGeminiText(text) {
  if (!text) throw new Error('Gemini devolvió respuesta vacía');
  let raw = String(text).trim()
    .replace(/^```json/i,'').replace(/^```/i,'').replace(/```$/i,'').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini no devolvió JSON válido');
  let clean = match[0]
    .replace(/,\s*}/g,'}').replace(/,\s*]/g,']')
    .replace(/([{,]\s*)(\w+)\s*:/g,'$1"$2":')
    .replace(/\n/g,' ').trim();
  try { return JSON.parse(clean); }
  catch(e) {
    const tipo = raw.match(/"?tipo"?\s*:\s*"([^"]+)"/)?.[1] || 'OTRO';
    const num = parseInt(raw.match(/"?num"?\s*:\s*(\d+)/)?.[1] || '0');
    const fecha = raw.match(/"?fecha"?\s*:\s*"([^"]+)"/)?.[1] || '';
    const descripcion = raw.match(/"?descripcion"?\s*:\s*"([^"]+)"/)?.[1] || 'Ver documento';
    const fechaFinNueva = raw.match(/"?fechaFinNueva"?\s*:\s*"([^"]+)"/)?.[1] || null;
    const fechasV = [...raw.matchAll(/"(\d{4}-\d{2}-\d{2})"/g)].map(m=>m[1]);
    return { tipo, num, fecha, descripcion, fechaFinNueva, 
             fechasVigencia: fechasV.length ? fechasV : null,
             montoAjuste: null, pctAjuste: null, listasDePrecios: [] };
  }
}

function renderImportedEnm(enm, fileName, idx) {
  const typeColors = {EXTENSION:'#dbeafe', ACTUALIZACION_TARIFAS:'#d1fae5', SCOPE:'#fef3cd', CLAUSULAS:'#f3e8ff', OTRO:'#f1f3f5'};
  const typeBadge = {EXTENSION:'🗓 Extensión', ACTUALIZACION_TARIFAS:'💰 Act. Tarifas', SCOPE:'📋 Scope', CLAUSULAS:'📄 Cláusulas', OTRO:'📎 Otro'};
  const tipos = ['EXTENSION','ACTUALIZACION_TARIFAS','SCOPE','CLAUSULAS','OTRO'];
  const bg = typeColors[enm.tipo] || '#f1f3f5';

  // Build price list HTML
  let preciosHTML = '';
  if (enm.listasDePrecios && enm.listasDePrecios.length) {
    enm.listasDePrecios.forEach(lp => {
      const rows = (lp.items||[]).map(it =>
        `<tr><td style="font-size:11px;padding:3px 6px">${esc(it.item||'')}</td><td style="font-size:11px;padding:3px 6px">${esc(it.descripcion||'')}</td><td style="font-size:11px;padding:3px 6px">${esc(it.unidad||'')}</td><td style="font-size:11px;padding:3px 6px;text-align:right">${it.precio!=null?Number(it.precio).toLocaleString('es-AR'):''}</td></tr>`
      ).join('');
      preciosHTML += `<div style="margin-top:8px">
        <div style="font-size:11px;font-weight:700;color:#065f46;margin-bottom:4px">📋 Lista de precios — ${esc(lp.periodo||'')}</div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:rgba(0,0,0,.06)"><th style="padding:3px 6px;text-align:left">Item</th><th style="padding:3px 6px;text-align:left">Descripción</th><th style="padding:3px 6px;text-align:left">Unidad</th><th style="padding:3px 6px;text-align:right">Precio</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="4" style="padding:6px;text-align:center;color:#888">Sin ítems extraídos</td></tr>'}</tbody>
        </table></div>
      </div>`;
    });
  }

  // Fechas vigencia
  const fechasHTML = (enm.fechasVigencia && enm.fechasVigencia.length > 1)
    ? `<p style="font-size:11px;color:#1d4ed8;margin:4px 0">📅 Vigencia: <strong>${enm.fechasVigencia.join(' → ')}</strong></p>` : '';

  const div = document.createElement('div');
  div.id = `enmImport_${idx}`;
  div.style.cssText = `background:${bg};border-radius:8px;padding:14px;margin-bottom:10px;border:1px solid rgba(0,0,0,.08)`;
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select onchange="_importedEnms[${idx}].tipo=this.value" style="font-size:11px;padding:3px 6px;border-radius:4px;border:1px solid #ccc;font-weight:700">
          ${tipos.map(t=>`<option value="${t}" ${enm.tipo===t?'selected':''}>${typeBadge[t]||t}</option>`).join('')}
        </select>
        <input type="number" value="${enm.num||''}" onchange="_importedEnms[${idx}].num=parseInt(this.value)||0" 
          style="width:60px;font-size:11px;padding:3px 6px;border-radius:4px;border:1px solid #ccc" placeholder="N°">
        <input type="date" value="${enm.fecha||''}" onchange="_importedEnms[${idx}].fecha=this.value"
          style="font-size:11px;padding:3px 6px;border-radius:4px;border:1px solid #ccc">
      </div>
      <span style="font-size:10px;color:#888;max-width:160px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(fileName)}">${esc(fileName)}</span>
    </div>
    <textarea onchange="_importedEnms[${idx}].descripcion=this.value"
      style="width:100%;font-size:12px;padding:8px;border-radius:6px;border:1px solid #ccc;resize:vertical;min-height:60px;box-sizing:border-box;font-family:inherit">${esc(enm.descripcion||'')}</textarea>
    ${enm.tipo==='EXTENSION' ? `<div style="margin-top:6px"><label style="font-size:11px;font-weight:600">Nueva fecha fin:</label>
      <input type="date" value="${enm.fechaFinNueva||''}" onchange="_importedEnms[${idx}].fechaFinNueva=this.value"
        style="margin-left:8px;font-size:11px;padding:3px 6px;border-radius:4px;border:1px solid #ccc"></div>` : ''}
    ${fechasHTML}
    ${enm.pctAjuste!=null ? `<p style="font-size:11px;color:#065f46;margin:4px 0">📊 % ajuste detectado: <strong>${enm.pctAjuste}%</strong></p>` : ''}
    ${preciosHTML}
    <label style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px;cursor:pointer">
      <input type="checkbox" checked onchange="_importedEnms[${idx}]._confirmed=this.checked"> Incluir en importación
    </label>
  `;
  document.getElementById('enmPdfResults').appendChild(div);
}


function renderImportedEnmError(fileName, msg) {
  const div = document.createElement('div');
  div.style.cssText = 'background:#fde8ea;border-radius:8px;padding:12px;margin-bottom:8px;border:1px solid #dc3545';
  div.innerHTML = `<p style="font-size:12px;color:#dc3545;margin:0">❌ <strong>${fileName}</strong>: ${msg}</p>`;
  document.getElementById('enmPdfResults').appendChild(div);
}

window.saveImportedEnms = async function saveImportedEnms() {
  const cc = window.DB.find(x => x.id === window.detId);
  if (!cc) return;
  if (!cc.enmiendas) cc.enmiendas = [];
  if (!cc.tarifarios) cc.tarifarios = [];

  const toSave = _importedEnms.filter(e => e._confirmed);
  if (!toSave.length) { toast('No hay enmiendas seleccionadas', 'er'); return; }

  let saved = 0;
  for (const enm of toSave) {
    const num = cc.enmiendas.length + 1;
    const obj = {
      num, tipo: enm.tipo,
      fecha: enm.fecha || new Date().toISOString().split('T')[0],
      descripcion: enm.descripcion || '',
      motivo: enm.descripcion || '',
    };
    if (enm.tipo === 'EXTENSION' && enm.fechaFinNueva) {
      obj.fechaFinNueva = enm.fechaFinNueva;
      cc.fechaFin = enm.fechaFinNueva;
    }
    if (enm.montoAjuste) obj.montoAjuste = enm.montoAjuste;
    if (enm.pctAjuste) obj.pctAjuste = enm.pctAjuste;
    if (enm.fechasVigencia) obj.fechasVigencia = enm.fechasVigencia;
    cc.enmiendas.push(obj);

    // Save price lists as tarifarios
    if (enm.listasDePrecios && enm.listasDePrecios.length) {
      enm.listasDePrecios.forEach(lp => {
        if (!lp.items || !lp.items.length) return;
        const cols = ['Item', 'Descripcion', 'Unidad', 'Precio'];
        const rows = lp.items.map(it => [it.item||'', it.descripcion||'', it.unidad||'', it.precio!=null?it.precio:'']);
        cc.tarifarios.push({
          name: `Lista de Precios (Enm.${num}) - ${lp.periodo||''}`,
          cols, rows,
          period: lp.periodo || '',
          enmNum: num,
          sourceTableName: 'Importado con IA'
        });
      });
    }
    saved++;
  }

  cc.updatedAt = new Date().toISOString();
  await sbUpsertItem('contratos', cc);
  closeEnmModal();
  renderDet();
  toast(`${saved} enmienda(s) importada(s) ✅`, 'ok');
}


async function resetSection(section){
  const c=window.DB.find(x=>x.id===window.detId); if(!c){toast('Contrato no encontrado','er');return;}
  if(section==='enmiendas'){
    if(!confirm('Esto eliminará las enmiendas y los tarifarios asociados a enmiendas. ¿Continuar?')) return;
    c.enmiendas=[];
    c.tarifarios=(c.tarifarios||[]).filter(t=>!t.enmNum);
    if(c.fechaFinOriginal) c.fechaFin=c.fechaFinOriginal;
    c.updatedAt=new Date().toISOString();
    if(!SB_OK) localStorage.setItem('cta_v7', JSON.stringify(window.DB));
    else await sbUpsertItem('contratos', c);
    renderDet(); renderList(); toast('Enmiendas reiniciadas','ok');
    return;
  }
  if(section==='aves'){
    if(!confirm('¿Eliminar todos los AVEs de este contrato?')) return;
    
    // Calcular total de AVEs a restar
    const totalAves = (c.aves||[]).reduce((s,a)=>s+(a.monto||0),0);
    c.monto = (c.monto || 0) - totalAves;
    c.aves=[];
    
    // El monto actual es ahora la base contractual
    c._montoOriginal = c.monto;
    c.montoBase = c.monto;
    console.log('[resetSection] AVEs eliminados. montoBase actualizado a:', c.monto.toFixed(2));
    
    c.updatedAt=new Date().toISOString();
    if(!SB_OK) localStorage.setItem('cta_v7', JSON.stringify(window.DB));
    else await sbUpsertItem('contratos', c);
    renderDet(); toast('AVEs reiniciados. Monto base: '+fN(c.monto),'ok');
    return;
  }
  if(section==='tarifarios'){
    if(!confirm('¿Eliminar todos los tarifarios de este contrato?')) return;
    c.tarifarios=[];
    c.updatedAt=new Date().toISOString();
    if(!SB_OK) localStorage.setItem('cta_v7', JSON.stringify(window.DB));
    else await sbUpsertItem('contratos', c);
    renderDet(); toast('Tarifarios reiniciados','ok');
    return;
  }
  if(typeof resetHistorial==='function') return resetHistorial();
}

// ═══════════════════════════════════════
// RESET HISTORIAL
// ═══════════════════════════════════════
async function resetHistorial(cid) {
  if (!confirm('¿Resetear ENMIENDAS, AVEs y TARIFARIOS de este contrato? Esta acción no se puede deshacer.')) return;
  const c = window.DB.find(x => x.id === (cid || window.detId));
  if (!c) return;
  c.enmiendas = [];
  c.aves = [];
  c.tarifarios = [];
  c.fechaFin = c._fechaFinOriginal || c.fechaFin; // restore original if stored
  c.updatedAt = new Date().toISOString();
  await sbUpsertItem('contratos', c);
  renderDet();
  toast('Historial reseteado ✅', 'ok');
}

// ═══════════════════════════════════════
// RESET & DELETE FUNCTIONS
// ═══════════════════════════════════════

async function resetHistorial(id) {
  const cc = window.DB.find(x => x.id === id);
  if (!cc) return;
  const total = (cc.enmiendas?.length||0) + (cc.aves?.length||0) + (cc.tarifarios?.length||0);
  if (!confirm(`¿Resetear historial completo de ${cc.num}?\n\nSe eliminarán:\n• ${cc.enmiendas?.length||0} enmiendas\n• ${cc.aves?.length||0} AVEs\n• ${cc.tarifarios?.length||0} tarifarios\n\nEsta acción no se puede deshacer.`)) return;
  cc.enmiendas = [];
  cc.aves = [];
  cc.tarifarios = [];
  cc.fechaFin = cc.fechaIni; // reset date? no - keep original
  cc.updatedAt = new Date().toISOString();
  await sbUpsertItem('contratos', cc);
  renderDet();
  toast('Historial reseteado ✅', 'ok');
}

async function delEnm(num) {
  const cc = window.DB.find(x => x.id === window.detId);
  if (!cc) return;
  if (!confirm(`¿Eliminar Enmienda N°${num}?`)) return;
  const enmDeleted = (cc.enmiendas || []).find(e => e.num === num);
  cc.enmiendas = (cc.enmiendas || []).filter(e => e.num !== num);
  cc.enmiendas.forEach((e, i) => e.num = i + 1);
  // Si tenía EXTENSION entre sus conceptos, restaurar fechaFin a la última EXTENSION restante o al original
  if (enmDeleted && enmHasTipo(enmDeleted, 'EXTENSION')) {
    const remaining = cc.enmiendas.filter(e => enmHasTipo(e, 'EXTENSION') && e.fechaFinNueva);
    if (remaining.length > 0) {
      cc.fechaFin = remaining[remaining.length - 1].fechaFinNueva;
    } else if (cc._fechaFinOriginal) {
      cc.fechaFin = cc._fechaFinOriginal;
      delete cc._fechaFinOriginal;
    }
    if (cc.fechaIni && cc.fechaFin) {
      const ini = new Date(cc.fechaIni + 'T00:00:00');
      const fin = new Date(cc.fechaFin + 'T00:00:00');
      cc.plazo = Math.max((fin.getFullYear() - ini.getFullYear()) * 12 + (fin.getMonth() - ini.getMonth()), 0);
    }
  }
  cc.tarifarios = (cc.tarifarios || []).filter(t => t.enmNum !== num);
  cc.tarifarios.forEach(t => {
    if (t.enmNum && t.enmNum > num) t.enmNum = t.enmNum - 1;
    if (t.name) t.name = t.name.replace(/\(Enm\.(\d+)\)/, (m,n)=>`(Enm.${Number(n)>num?Number(n)-1:Number(n)})`);
  });
  // Las AVEs de la enmienda eliminada se eliminan (no se dejan huérfanas, para no inflar cc.monto)
  cc.aves = (cc.aves || []).filter(a => a.enmRef !== num);
  cc.aves.forEach(a => { if (a.enmRef > num) a.enmRef = a.enmRef - 1; });
  // Si tenía ACTUALIZACION_TARIFAS entre sus conceptos, restaurar btar y monto a partir de las enmiendas tarifarias restantes
  if (enmDeleted && enmHasTipo(enmDeleted, 'ACTUALIZACION_TARIFAS')) {
    const tarRemaining = cc.enmiendas
      .filter(e => enmHasTipo(e, 'ACTUALIZACION_TARIFAS') && !e.superseded)
      .sort((a, b) => String(a.nuevoPeriodo||'').localeCompare(String(b.nuevoPeriodo||'')));
    if (tarRemaining.length > 0) {
      const last = tarRemaining[tarRemaining.length - 1];
      if (last.nuevoPeriodo) cc.btar = last.nuevoPeriodo;
    } else {
      cc.btar = (cc.fechaIni || '').substring(0, 7) || cc.btar;
    }
    // Monto vigente = montoBase + suma aditiva de los AVEs restantes (mismo criterio que guardarEnm)
    const montoBase = cc.montoBase != null ? cc.montoBase : cc._montoOriginal;
    if (montoBase != null) {
      const avePoly = cc.aves.filter(a => a.tipo === 'POLINOMICA').reduce((s, a) => s + (a.monto || 0), 0);
      const aveOwner = cc.aves.filter(a => a.tipo === 'OWNER').reduce((s, a) => s + (a.monto || 0), 0);
      cc.monto = Math.round((montoBase + avePoly + aveOwner) * 100) / 100;
      if (tarRemaining.length === 0) { delete cc._montoOriginal; delete cc.montoBase; }
    }
    try { localStorage.removeItem('pol_eval_result_' + cc.id); } catch(_e){}
    try { localStorage.removeItem('pol_selected_months_' + cc.id); } catch(_e){}
  }
  cc.updatedAt = new Date().toISOString();
  if (!SB_OK) localStorage.setItem('cta_v7', JSON.stringify(window.DB));
  else await sbUpsertItem('contratos', cc);
  renderDet();
  renderList();
  updNav();
  toast(`Enmienda N°${num} eliminada`, 'ok');
}

async function delAveById(aveId) {
  const cc = window.DB.find(x => x.id === window.detId);
  if (!cc) return;
  if (!confirm('¿Eliminar este AVE?')) return;
  
  // Solo eliminar del array - el renderizado calculará todo desde cero
  cc.aves = cc.aves.filter(a => a.id !== aveId);
  cc.updatedAt = new Date().toISOString();
  
  // Actualizar window.DB array
  const idx = window.DB.findIndex(x => x.id === window.detId);
  if(idx !== -1) window.DB[idx] = cc;
  
  // Guardar en Supabase
  if(!SB_OK) localStorage.setItem('cta_v7', JSON.stringify(window.DB));
  else await sbUpsertItem('contratos', cc);
  
  renderDet();
  toast('AVE eliminado', 'ok');
}

async function deleteLastAutoAve() {
  const cc = window.DB.find(x => x.id === window.detId);
  if (!cc || !cc.aves) return;
  
  // Buscar AVEs AUTO ordenados por fecha (más reciente primero)
  const autoAves = cc.aves
    .filter(a => a.tipo === 'POLINOMICA' && a.autoGenerated)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  if (autoAves.length === 0) {
    toast('No hay AVEs AUTO para eliminar', 'er');
    return;
  }
  
  const lastAve = autoAves[0];
  if (!confirm(`¿Eliminar último AVE AUTO (${lastAve.periodo || '?'})?`)) return;
  
  // Eliminar del array
  cc.aves = cc.aves.filter(a => a.id !== lastAve.id);
  cc.updatedAt = new Date().toISOString();
  
  // Actualizar window.DB array
  const idx = window.DB.findIndex(x => x.id === window.detId);
  if(idx !== -1) window.DB[idx] = cc;
  
  // Guardar en Supabase
  if(!SB_OK) localStorage.setItem('cta_v7', JSON.stringify(window.DB));
  else await sbUpsertItem('contratos', cc);
  
  renderDet();
  toast('Último AVE AUTO eliminado', 'ok');
}


/* ==== PATCH v14-base: estable sin Usuarios ==== */
(function(){
  window.APP_VERSION='v14-base';
  function setVersionBadgeV14(){ try{ var el=document.getElementById('buildTag'); if(el) el.textContent='v86-redesign'; }catch(_e){} }
  function ensureGlobalTarAiInput(){ var inp=document.getElementById('tarAiIn'); if(!inp){ inp=document.createElement('input'); inp.type='file'; inp.id='tarAiIn'; inp.accept='.doc,.docx,.xls,.xlsx'; inp.style.display='none'; inp.onchange=function(){ try{ if(typeof importPriceListsFromFiles==='function') importPriceListsFromFiles(this.files); } finally{ this.value=''; } }; document.body.appendChild(inp);} return inp; }
  openPriceListImportPicker=function(){ var inp=ensureGlobalTarAiInput(); try{ inp.click(); }catch(e){ console.error('openPriceListImportPicker v14',e); if(typeof toast==='function') toast('No se pudo abrir el selector de listas','er'); } };
  function restoreTarSectionV14(){ try{ var card=document.getElementById('detCard'); if(!card) return; var boxes=Array.from(card.querySelectorAll('.section-box')); var sec=boxes.find(function(b){ return /Listas de Precios \/ Tarifarios/i.test((b.textContent||'')); }); if(!sec) return; if(!sec.querySelector('#tarContainer')){ var cc=(typeof window.DB!=='undefined'&&Array.isArray(window.DB))?window.DB.find(function(x){return x.id===window.detId;}):null; var count=((cc&&cc.tarifarios)||[]).length; sec.innerHTML='<h3>Listas de Precios / Tarifarios <span class="tcnt">'+count+' tablas</span></h3><div id="tarContainer"></div>'; } ensureGlobalTarAiInput(); if(typeof renderTarifario==='function') renderTarifario(); }catch(e){ console.error('restoreTarSectionV14',e);} }
  if(typeof renderDet==='function'){ var __origRenderDet=renderDet; renderDet=function(){ var out=__origRenderDet.apply(this,arguments); setTimeout(restoreTarSectionV14,0); setTimeout(setVersionBadgeV14,0); return out; }; }
  if(typeof go==='function'){ var __origGo=go; go=function(v){ var out=__origGo.apply(this,arguments); if(v==='detail') setTimeout(restoreTarSectionV14,0); setTimeout(setVersionBadgeV14,0); return out; }; }
  function __pad2(n){ return String(n).padStart(2,'0'); }
  function __toYm(v){ try{ if(v instanceof Date && !isNaN(v)) return String(v.getFullYear())+'-'+__pad2(v.getMonth()+1); var d=new Date(v); if(!isNaN(d)) return String(d.getFullYear())+'-'+__pad2(d.getMonth()+1);}catch(_e){} if(typeof detectPeriodFromText==='function') return detectPeriodFromText(String(v||'')); return null; }
  function __num(v){ if(v==null||v==='') return null; if(typeof v==='number') return Number.isFinite(v)?v:null; var s=String(v).trim(); if(!s) return null; s=s.replace(/\s+/g,'').replace(/\$/g,''); if(s.includes(',')&&s.includes('.')){ if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); } else if(s.includes(',')){ s=s.replace(/\./g,'').replace(',','.'); } var n=Number(s); return Number.isFinite(n)?n:null; }
  function __itemCode(v){ var n=__num(v); if(n==null) return String(v||'').trim(); return n.toFixed(2).replace('.',','); }
  function __cleanText(v){ return String(v==null?'':v).trim(); }
  function __isSectionTitle(row,txt){ return row.some(function(c){ return String(c||'').toLowerCase().includes(String(txt||'').toLowerCase()); }); }
  function __skipDesc(desc){ var d=String(desc||'').trim().toLowerCase(); return !d || /^(mano de obra|equipos|item|tarifa mensual|descripcion|descripción|diurno|nocturno|unidad|precio|precio final|subtotal|total|canon de cantera|transporte en camion batea por metro cubico:?)$/.test(d); }
  function __parseServicioBasico(rows,period,fileName){ var start=rows.findIndex(function(r){return __isSectionTitle(r,'SERVICIO BÁSICO MENSUAL');}); if(start<0) return null; var ends=[rows.findIndex(function(r,i){return i>start&&__isSectionTitle(r,'EQUIPOS EVENTUALES CON OPERADOR');}),rows.findIndex(function(r,i){return i>start&&__isSectionTitle(r,'SERVICIO DE PROVISIÓN DE CALCÁREO');})].filter(function(i){return i>=0;}); var end=ends.length?Math.min.apply(null,ends):rows.length; var data=[]; for(var i=start;i<end;i++){ var r=rows[i]||[]; var item=r[0],desc=__cleanText(r[1]),price=__num(r[2]); if(__num(item)==null||__skipDesc(desc)||price==null||price<=0) continue; data.push([__itemCode(item),desc,'MES',price]); } if(!data.length) return null; return {name:'Servicio Basico Mensual',cols:['N Item','Descripcion','Unidad','Precio'],rows:data,period:period,source:'EXCEL_TARIFARIO_FINAL',sourceSheet:'TARIFARIO FINAL',sourceFileName:fileName,importedAt:new Date().toISOString(),editable:true}; }
  function __parseEventuales(rows,period,fileName){ var start=rows.findIndex(function(r){return __isSectionTitle(r,'EQUIPOS EVENTUALES CON OPERADOR');}); if(start<0) return null; var end=rows.findIndex(function(r,i){return i>start&&__isSectionTitle(r,'SERVICIO DE PROVISIÓN DE CALCÁREO');}); var stop=end>=0?end:rows.length; var data=[]; for(var i=start;i<stop;i++){ var r=rows[i]||[]; var item=__num(r[0]),desc=__cleanText(r[1]); var vals=[__num(r[2]),__num(r[3]),__num(r[4]),__num(r[5])]; if(item==null||__skipDesc(desc)||vals.every(function(v){return v==null;})) continue; data.push([__itemCode(item),desc,vals[0],vals[1],vals[2],vals[3]]); } if(!data.length) return null; return {name:'Equipos Eventuales con Operador',cols:['N Item','Descripcion','0-15 Dias Diurno','0-15 Dias Nocturno','Mayor 15 Dias Diurno','Mayor 15 Dias Nocturno'],rows:data,period:period,source:'EXCEL_TARIFARIO_FINAL',sourceSheet:'TARIFARIO FINAL',sourceFileName:fileName,importedAt:new Date().toISOString(),editable:true}; }
  function __parseCalcareo(rows,period,fileName){ var start=rows.findIndex(function(r){return __isSectionTitle(r,'SERVICIO DE PROVISIÓN DE CALCÁREO');}); if(start<0) return null; var data=[]; for(var i=start;i<rows.length;i++){ var r=rows[i]||[]; var item=__num(r[0]),desc=__cleanText(r[1]); var p3=__num(r[3]),p2=__num(r[2]); if(item==null||__skipDesc(desc)) continue; var price=(p3!=null)?p3:p2; if(price==null||price<=0) continue; var unit=(p3!=null)?__cleanText(r[2]):''; data.push([__itemCode(item),desc,unit,price]); } if(!data.length) return null; return {name:'Servicio de Provision de Calcareo',cols:['N Item','Descripcion','Unidad','Precio'],rows:data,period:period,source:'EXCEL_TARIFARIO_FINAL',sourceSheet:'TARIFARIO FINAL',sourceFileName:fileName,importedAt:new Date().toISOString(),editable:true}; }
  if(typeof parsePriceListExcelFile==='function'){ var __origParse=parsePriceListExcelFile; parsePriceListExcelFile=async function(file,cc){ var buf=await file.arrayBuffer(); var wb=XLSX.read(new Uint8Array(buf),{type:'array'}); var sheetName=wb.SheetNames.find(function(n){return String(n||'').toLowerCase().includes('tarifario final');}); if(sheetName){ var ws=wb.Sheets[sheetName]; var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''}); var periodRow=rows.find(function(r){return Array.isArray(r)&&r.some(function(v){return v instanceof Date;});})||[]; var foundDate=periodRow.find(function(v){return v instanceof Date;}); var period=__toYm(foundDate)||(cc&&cc.btar)||(cc&&cc.fechaIni&&cc.fechaIni.substring(0,7))||null; var out=[__parseServicioBasico(rows,period,file.name),__parseEventuales(rows,period,file.name),__parseCalcareo(rows,period,file.name)].filter(Boolean); if(out.length) return out; } return __origParse(file,cc); }; }
  fN=function(n){ if(n==null||n==='') return '—'; if(typeof n==='string'){ var s=n.trim(); if(/^\d+[\.,]\d+$/.test(s)&&!s.includes('$')) return s.replace('.',','); } var num=Number(n); if(!Number.isFinite(num)) return String(n); return num.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  if(typeof isNumericCol==='function'){ var __origIsNumericCol=isNumericCol; isNumericCol=function(tar,ci){ var col=String((tar&&tar.cols&&tar.cols[ci])||'').toLowerCase(); if(/(^|\s)(n°\s*item|nº\s*item|numero item|n° item|item|nro item|n item)(\s|$)/.test(col)) return false; return __origIsNumericCol(tar,ci); }; }
})();


/* ==== PATCH v19: role matrix con safeguard OWNER/ADMIN ==== */
(function(){
  window.APP_VERSION='v19';
  var ROLE_DEFAULTS={
    OWNER:{dashboard:true,list:true,timeline:true,alertas:true,form:true,detail:true,me2n:true,idx:true,forecast:true,licit:true,prov:true,users:true,legales:true},
    ADMIN:{dashboard:true,list:true,timeline:true,alertas:true,form:true,detail:true,me2n:true,idx:true,forecast:true,licit:true,prov:true,users:true,legales:true},
    ING_CONTRATOS:{dashboard:true,list:true,timeline:true,alertas:true,form:true,detail:true,me2n:true,idx:false,forecast:true,licit:true,prov:true,users:false,legales:false},
    RESP_TECNICO:{dashboard:true,list:true,timeline:true,alertas:true,form:false,detail:true,me2n:true,idx:false,forecast:false,licit:false,prov:false,users:false,legales:false},
    LEGALES:{dashboard:true,list:true,timeline:false,alertas:false,form:false,detail:true,me2n:false,idx:false,forecast:false,licit:false,prov:false,users:false,legales:true},
    SIN_ROL:{dashboard:true,list:true,timeline:false,alertas:false,form:false,detail:true,me2n:false,idx:false,forecast:false,licit:false,prov:false,users:false,legales:false}
  };
  var ROLE_LABELS={dashboard:'Dashboard',list:'Contratos',timeline:'Timeline',alertas:'Alertas',form:'Nuevo Contrato',detail:'Detalle',me2n:'Purchase Orders',idx:'Indices',forecast:'Proyección',licit:'Licitaciones',prov:'Proveedores',users:'Usuarios',legales:'Legales'};
  var ROLE_STORAGE_KEY='role_permissions_v19';
  var ROLE_TABLE='role_perms';   // tabla Supabase single-row (patrón id/datos)
  var _roleMatrixSbId=null;      // id de la fila en Supabase para PATCH
  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function forcePrivileged(matrix){
    matrix.OWNER=clone(ROLE_DEFAULTS.OWNER);
    matrix.ADMIN=clone(ROLE_DEFAULTS.ADMIN);
    return matrix;
  }
  function mergeMatrix(parsed){
    var out=clone(ROLE_DEFAULTS);
    Object.keys(out).forEach(function(role){
      Object.keys(out[role]).forEach(function(mod){
        if(parsed && parsed[role] && typeof parsed[role][mod] !== 'undefined') out[role][mod]=!!parsed[role][mod];
      });
    });
    return forcePrivileged(out);
  }
  function getRoleMatrix(){
    try{
      var raw=localStorage.getItem(ROLE_STORAGE_KEY);
      if(!raw) return forcePrivileged(clone(ROLE_DEFAULTS));
      return mergeMatrix(JSON.parse(raw));
    }catch(_e){ return forcePrivileged(clone(ROLE_DEFAULTS)); }
  }
  // ── Persistencia en Supabase (fuente de verdad, compartida entre dispositivos) ──
  // canAccess()/getRoleMatrix() son síncronos, así que la matriz vive en localStorage
  // como caché: se lee de Supabase una vez al cargar (loadRoleMatrixFromSupabase) y se
  // escribe en cada guardado. Si la tabla no existe o no hay conexión, degrada a localStorage.
  async function _saveRoleMatrixToSupabase(matrix){
    if(typeof SB_OK==='undefined' || !SB_OK || typeof sbFetch!=='function') return;
    try{
      var payload={datos: JSON.stringify(matrix)};
      if(_roleMatrixSbId){
        await sbFetch(ROLE_TABLE,'PATCH',payload,'?id=eq.'+_roleMatrixSbId);
      }else{
        var res=await sbFetch(ROLE_TABLE,'POST',payload);
        if(res && res[0]) _roleMatrixSbId=res[0].id;
      }
    }catch(err){ console.warn('[roles] no se pudo guardar en Supabase:', err.message); }
  }
  async function loadRoleMatrixFromSupabase(){
    if(typeof SB_OK==='undefined' || !SB_OK || typeof sbFetch!=='function') return;
    try{
      var rows=await sbFetch(ROLE_TABLE,'GET',null,'?select=id,datos&order=id.desc&limit=1');
      if(rows && rows.length){
        _roleMatrixSbId=rows[0].id;
        var merged=mergeMatrix(JSON.parse(rows[0].datos));
        localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(merged));
        if(typeof applyPermissions==='function') applyPermissions();
      }
    }catch(err){ console.warn('[roles] no se pudo cargar de Supabase, usando localStorage:', err.message); }
  }
  function saveRoleMatrix(matrix){
    var m=forcePrivileged(matrix);
    localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(m));
    _saveRoleMatrixToSupabase(m);
  }
  function resetRoleMatrix(){ saveRoleMatrix(clone(ROLE_DEFAULTS)); }
  function roleName(){
    try{
      var r=(typeof _APP_ROLE!=='undefined' && _APP_ROLE) ? _APP_ROLE : 'SIN_ROL';
      r=String(r||'SIN_ROL').toUpperCase();
      if(r==='ADMIN_USUARIOS') r='ADMIN';
      return r;
    }catch(_e){ return 'SIN_ROL'; }
  }
  function canAccess(mod){
    var m=getRoleMatrix();
    var r=roleName();
    if(!m[r]) r='SIN_ROL';
    return !!(m[r] && m[r][mod]);
  }
  function applyPermissions(){
    document.querySelectorAll('.sb-nav .nv[data-mod]').forEach(function(el){ var mod=el.getAttribute('data-mod'); el.style.display=canAccess(mod)?'':'none'; });
    // Ocultar encabezados de sección que quedaron sin ningún item visible
    document.querySelectorAll('.sb-nav .sb-sec').forEach(function(sec){
      var anyVisible=false, n=sec.nextElementSibling;
      while(n && !n.classList.contains('sb-sec')){
        if(n.classList.contains('nv') && n.style.display!=='none'){ anyVisible=true; break; }
        n=n.nextElementSibling;
      }
      sec.style.display=anyVisible?'':'none';
    });
    var pgA=document.getElementById('pgA');
    if(pgA){ pgA.querySelectorAll('button').forEach(function(btn){ var txt=(btn.textContent||'').toLowerCase(); if(txt.indexOf('nuevo contrato')>=0) btn.style.display=canAccess('form')?'':'none'; }); }
  }
  // Exponer al scope global: loginApp() (en 02-supabase-auth.js) invoca applyPermissions()
  // desde el scope global. Sin esto quedaba encerrado en el IIFE y nunca se ejecutaba,
  // por lo que el menú jamás se filtraba según el rol al iniciar sesión.
  window.applyPermissions = applyPermissions;
  window.canAccess = canAccess;
  window.getRoleMatrix = getRoleMatrix;
  window.loadRoleMatrix = loadRoleMatrixFromSupabase;
  if(typeof go==='function'){
    var __origGoRole=go;
    go=function(v){
      var map={dashboard:'dashboard',list:'list',timeline:'timeline',alertas:'alertas',form:'form',detail:'detail',me2n:'me2n',idx:'idx',forecast:'forecast',licit:'licit',prov:'prov',users:'users'};
      var mod=map[v];
      if(mod && !canAccess(mod)){
        if(typeof toast==='function') toast('Tu rol no tiene permiso para entrar a este modulo','er');
        return __origGoRole.call(this,'list');
      }
      return __origGoRole.apply(this, arguments);
    };
  }

  var UsersAdmin = window.UsersAdmin = (function(){
    var state={list:[],loaded:false,currentId:null};
    var refs={root:null,body:null,count:null,nav:null,modal:null,title:null,inpUser:null,selRole:null,selActive:null,inpPass:null,panel:null};
    function q(id){ return document.getElementById(id); }
    function text(el,val){ if(el) el.textContent=val; }
    function clear(el){ while(el && el.firstChild) el.removeChild(el.firstChild); }
    function make(tag,cls,txt){ var el=document.createElement(tag); if(cls) el.className=cls; if(txt!=null) el.textContent=txt; return el; }
    function boolActive(v){ return !(v===false || String(v)==='false'); }

    function ensureNav(){
      var nav=document.querySelector('.sb-nav'); if(!nav) return;
      if(q('navUsersModule')){ refs.nav=q('navUsersModule'); return; }
      var sec=make('div','sb-sec','Administracion');
      var a=make('a','nv'); a.id='navUsersModule'; a.href='#'; a.setAttribute('data-mod','users'); a.appendChild(make('span','ni','U')); a.appendChild(make('span','', 'Usuarios')); a.addEventListener('click', function(ev){ ev.preventDefault(); showPage(); });
      nav.appendChild(sec); nav.appendChild(a); refs.nav=a;
    }
    function ensureView(){
      var ct=document.querySelector('.ct'); if(!ct) return;
      if(q('vUsersModule')){ refs.root=q('vUsersModule'); refs.body=q('usersModuleBody'); refs.count=q('usersModuleCount'); refs.panel=q('usersPermPanel'); return; }
      var wrap=make('div','vw'); wrap.id='vUsersModule'; var card=make('div','card'); var hdr=make('div','thdr'); hdr.appendChild(make('h2','', 'Administracion de Usuarios')); var cnt=make('span','tcnt','0'); cnt.id='usersModuleCount'; hdr.appendChild(cnt); var fl=make('div','tfl'); var note=make('div','info-box amber','Por seguridad, las contrasenas actuales no se muestran. Se permite alta, edicion, cambio de estado, eliminacion y reseteo de contrasena.'); note.style.margin='0'; note.style.width='100%'; fl.appendChild(note); var panel=make('div',''); panel.id='usersPermPanel'; var body=make('div',''); body.id='usersModuleBody'; card.appendChild(hdr); card.appendChild(fl); card.appendChild(panel); card.appendChild(body); wrap.appendChild(card); ct.appendChild(wrap); refs.root=wrap; refs.body=body; refs.count=cnt; refs.panel=panel; buildModal(); body.addEventListener('click', onBodyClick); panel.addEventListener('click', onPanelClick); }
    function buildModal(){
      if(q('usersModuleModalBack')){ cacheModal(); return; }
      var back=make('div',''); back.id='usersModuleModalBack'; back.style.display='none'; back.style.position='fixed'; back.style.inset='0'; back.style.background='rgba(0,0,0,.45)'; back.style.zIndex='700'; back.style.alignItems='center'; back.style.justifyContent='center';
      var box=make('div',''); box.style.background='var(--w)'; box.style.borderRadius='14px'; box.style.boxShadow='0 20px 60px rgba(0,0,0,.3)'; box.style.width='620px'; box.style.maxWidth='96vw'; box.style.maxHeight='92vh'; box.style.overflowY='auto';
      var hdr=make('div','idx-modal-hdr'); var ttl=make('h3','', 'Nuevo usuario'); ttl.id='usersModuleModalTitle'; var x=make('button','btn btn-s btn-sm','X'); x.type='button'; x.addEventListener('click', closeModal); hdr.appendChild(ttl); hdr.appendChild(x);
      var body=make('div','idx-modal-body'); var grid=make('div','fg fg2');
      var g1=make('div','fgrp'); g1.appendChild(make('label','', 'Usuario')); var inpUser=make('input',''); inpUser.type='text'; inpUser.id='usersModuleUser'; g1.appendChild(inpUser);
      var g2=make('div','fgrp'); g2.appendChild(make('label','', 'Rol')); var selRole=make('select',''); selRole.id='usersModuleRole'; ['OWNER','ADMIN','ING_CONTRATOS','RESP_TECNICO','SIN_ROL'].forEach(function(v){ var o=make('option','',v); o.value=v; selRole.appendChild(o); }); g2.appendChild(selRole);
      var g3=make('div','fgrp'); g3.appendChild(make('label','', 'Contrasena temporal')); var inpPass=make('input',''); inpPass.type='text'; inpPass.id='usersModulePass'; g3.appendChild(inpPass);
      var g4=make('div','fgrp'); g4.appendChild(make('label','', 'Estado')); var selActive=make('select',''); selActive.id='usersModuleActive'; [{v:'true',t:'Activo'},{v:'false',t:'Inactivo'}].forEach(function(it){ var o=make('option','',it.t); o.value=it.v; selActive.appendChild(o); }); g4.appendChild(selActive);
      grid.appendChild(g1); grid.appendChild(g2); grid.appendChild(g3); grid.appendChild(g4); var info=make('div','info-box blue','Alta: usuario y contrasena son obligatorios. Edicion: la contrasena es opcional; si se completa, se resetea.'); body.appendChild(grid); body.appendChild(info); var foot=make('div','idx-modal-foot'); var cancel=make('button','btn btn-s','Cancelar'); cancel.type='button'; cancel.addEventListener('click', closeModal); var save=make('button','btn btn-p','Guardar'); save.type='button'; save.addEventListener('click', saveUser); foot.appendChild(cancel); foot.appendChild(save); box.appendChild(hdr); box.appendChild(body); box.appendChild(foot); back.appendChild(box); document.body.appendChild(back); cacheModal(); }
      function cacheModal(){ refs.modal=q('usersModuleModalBack'); refs.title=q('usersModuleModalTitle'); refs.inpUser=q('usersModuleUser'); refs.selRole=q('usersModuleRole'); refs.selActive=q('usersModuleActive'); refs.inpPass=q('usersModulePass'); }
      function setHeader(){ var t=q('pgT'),a=q('pgA'); if(!t||!a) return; clear(t); t.appendChild(document.createTextNode('Usuarios ')); var bc=make('span','bc','v86-redesign'); bc.id='buildTag'; t.appendChild(bc); clear(a); var wrap=make('div',''); wrap.style.display='flex'; wrap.style.gap='8px'; var rec=make('button','btn btn-s btn-sm','Recargar'); rec.type='button'; rec.addEventListener('click', reload); var add=make('button','btn btn-p btn-sm','Nuevo usuario'); add.type='button'; add.addEventListener('click', function(){ openModal(null); }); wrap.appendChild(rec); wrap.appendChild(add); a.appendChild(wrap); }
      function hideAllViews(){ ['vList','vForm','vDet','vMe2n','vMe2nDet','vIdx','vLicit','vProv','vTimeline','vAlertas','vDashboard','vForecast','vUsersModule','vLegalesModule'].forEach(function(id){ var el=q(id); if(el) el.classList.remove('on'); }); document.querySelectorAll('.sb-nav .nv').forEach(function(n){ n.classList.remove('act'); }); }
      function showPage(){ if(typeof canAccess==='function' && !canAccess('users')){ if(typeof toast==='function') toast('Tu rol no tiene permiso para entrar a este modulo','er'); return; } ensureNav(); ensureView(); setHeader(); hideAllViews(); refs.root.classList.add('on'); if(refs.nav) refs.nav.classList.add('act'); renderPermissionPanel(); if(!state.loaded) reload(); else renderUsers(); }
      async function reload(){ if(typeof sbFetch!=='function'){ toast('Conexion a usuarios no disponible','er'); return; } showLoader('Cargando usuarios...'); try{ state.list=await sbFetch('app_users','GET',null,'?select=id,username,role,active&order=username.asc&limit=500') || []; state.loaded=true; renderUsers(); renderPermissionPanel(); }catch(err){ console.error('users reload',err); toast(err.message||'No se pudieron cargar usuarios','er'); } finally{ hideLoader(); } }
      function renderPermissionPanel(){ ensureView(); clear(refs.panel); var box=make('div','info-box blue'); box.style.margin='12px 0'; var title=make('div','', 'Permisos por rol'); title.style.fontWeight='700'; title.style.marginBottom='8px'; var desc=make('div','', 'OWNER y ADMIN siempre conservan acceso total. Los cambios se guardan en Supabase y se aplican a todos los usuarios.'); desc.style.fontSize='12px'; desc.style.marginBottom='10px'; box.appendChild(title); box.appendChild(desc); var tbl=make('table',''); var thead=make('thead',''); var hr=make('tr',''); hr.appendChild(make('th','', 'Rol')); Object.keys(ROLE_LABELS).forEach(function(mod){ hr.appendChild(make('th','', ROLE_LABELS[mod])); }); thead.appendChild(hr); tbl.appendChild(thead); var tb=make('tbody',''); var matrix=getRoleMatrix(); Object.keys(matrix).forEach(function(role){ var tr=make('tr',''); tr.appendChild(make('td','', role)); Object.keys(ROLE_LABELS).forEach(function(mod){ var td=make('td',''); td.style.textAlign='center'; var chk=make('input',''); chk.type='checkbox'; chk.checked=!!matrix[role][mod]; chk.setAttribute('data-role',role); chk.setAttribute('data-mod',mod); if(role==='OWNER' || role==='ADMIN'){ chk.disabled=true; } td.appendChild(chk); tr.appendChild(td); }); tb.appendChild(tr); }); tbl.appendChild(tb); box.appendChild(tbl); var actions=make('div',''); actions.style.display='flex'; actions.style.gap='8px'; actions.style.marginTop='10px'; var save=make('button','btn btn-p btn-sm','Guardar permisos'); save.type='button'; save.id='rolesSaveBtn'; var reset=make('button','btn btn-s btn-sm','Reset defaults'); reset.type='button'; reset.id='rolesResetBtn'; var restore=make('button','btn btn-s btn-sm','Restaurar OWNER y ADMIN'); restore.type='button'; restore.id='rolesRestorePrivBtn'; actions.appendChild(save); actions.appendChild(reset); actions.appendChild(restore); box.appendChild(actions); refs.panel.appendChild(box); }
      function collectPanelMatrix(){ var matrix=getRoleMatrix(); refs.panel.querySelectorAll('input[type="checkbox"][data-role][data-mod]').forEach(function(chk){ var role=chk.getAttribute('data-role'); var mod=chk.getAttribute('data-mod'); if(role==='OWNER' || role==='ADMIN') return; if(matrix[role] && typeof matrix[role][mod] !== 'undefined') matrix[role][mod]=chk.checked; }); return matrix; }
      function onPanelClick(ev){ var id=(ev.target&&ev.target.id)||''; if(id==='rolesSaveBtn'){ var matrix=collectPanelMatrix(); saveRoleMatrix(matrix); applyPermissions(); toast('Permisos guardados','ok'); } if(id==='rolesResetBtn'){ resetRoleMatrix(); renderPermissionPanel(); applyPermissions(); toast('Permisos reseteados','ok'); } if(id==='rolesRestorePrivBtn'){ var m=getRoleMatrix(); saveRoleMatrix(forcePrivileged(m)); renderPermissionPanel(); applyPermissions(); toast('OWNER y ADMIN restaurados','ok'); } }
      function renderUsers(){ ensureView(); clear(refs.body); text(refs.count,String((state.list||[]).length)); if(!state.list.length){ var empty=make('div','empty'); empty.appendChild(make('div','ei','U')); empty.appendChild(make('p','', 'No hay usuarios cargados.')); refs.body.appendChild(empty); return; } var tbl=make('table',''); var thead=make('thead',''); var hr=make('tr',''); ['Usuario','Rol','Estado','Seguridad','Acciones'].forEach(function(h){ hr.appendChild(make('th','',h)); }); thead.appendChild(hr); tbl.appendChild(thead); var tb=make('tbody',''); state.list.forEach(function(u){ var tr=make('tr',''); var td1=make('td','',u.username||''); td1.style.fontWeight='700'; var td2=make('td','',u.role||'SIN_ROL'); var td3=make('td',''); var badge=make('span','bdg '+(boolActive(u.active)?'act':'exp'), boolActive(u.active)?'ACTIVO':'INACTIVO'); td3.appendChild(badge); var td4=make('td',''); var small=make('span','', 'Contrasena oculta'); small.style.fontSize='11px'; small.style.color='var(--g500)'; td4.appendChild(small); var td5=make('td',''); td5.style.width='320px'; var actions=make('div',''); actions.style.display='flex'; actions.style.gap='6px'; actions.style.flexWrap='wrap'; actions.appendChild(actionButton('Editar','edit',u.id)); actions.appendChild(actionButton('Reset pass','reset',u.id)); actions.appendChild(actionButton(boolActive(u.active)?'Inactivar':'Activar','toggle',u.id)); actions.appendChild(actionButton('Eliminar','delete',u.id,true)); td5.appendChild(actions); [td1,td2,td3,td4,td5].forEach(function(td){ tr.appendChild(td); }); tb.appendChild(tr); }); tbl.appendChild(tb); refs.body.appendChild(tbl); }
      function actionButton(label,action,id,danger){ var cls=danger?'btn btn-d btn-sm':'btn btn-s btn-sm'; var b=make('button',cls,label); b.type='button'; b.setAttribute('data-action',action); b.setAttribute('data-id',String(id)); return b; }
      function onBodyClick(ev){ var btn=ev.target.closest('button[data-action]'); if(!btn) return; var action=btn.getAttribute('data-action'); var id=btn.getAttribute('data-id'); if(action==='edit') openModal(id); else if(action==='toggle') toggleActive(id); else if(action==='reset') resetPassword(id); else if(action==='delete') deleteUser(id); }
      function openModal(id){ buildModal(); state.currentId=id?String(id):null; var row=(state.list||[]).find(function(u){ return String(u.id)===String(id); }) || null; text(refs.title,row?'Editar usuario':'Nuevo usuario'); refs.inpUser.value=row?(row.username||''):''; refs.inpUser.disabled=!!row; refs.selRole.value=row?(row.role||'SIN_ROL'):'SIN_ROL'; refs.selActive.value=String(row?boolActive(row.active):true); refs.inpPass.value=''; refs.modal.style.display='flex'; }
      function closeModal(){ if(refs.modal) refs.modal.style.display='none'; state.currentId=null; }
      async function saveUser(){ var username=(refs.inpUser.value||'').trim(); var role=(refs.selRole.value||'SIN_ROL').trim(); var active=(refs.selActive.value==='true'); var password=(refs.inpPass.value||'').trim(); if(!state.currentId && (!username || !password)){ toast('Usuario y contrasena temporal son obligatorios','er'); return; } showLoader(state.currentId?'Guardando usuario...':'Creando usuario...'); try{ if(state.currentId){ var body={role:role,active:active}; if(password){ body.password_hash=await sha256Hex(password); } await sbFetch('app_users','PATCH',body,'?id=eq.'+encodeURIComponent(state.currentId)); } else { var exists=(state.list||[]).some(function(u){ return String(u.username||'').toLowerCase()===username.toLowerCase(); }); if(exists) throw new Error('Ese usuario ya existe'); await sbFetch('app_users','POST',{username:username,password_hash:await sha256Hex(password),role:role,active:active}); } closeModal(); await reload(); toast(state.currentId?'Usuario actualizado':'Usuario creado','ok'); }catch(err){ console.error('users save',err); toast(err.message||'No se pudo guardar el usuario','er'); } finally{ hideLoader(); } }
      async function toggleActive(id){ var row=(state.list||[]).find(function(u){ return String(u.id)===String(id); }); if(!row) return; showLoader('Actualizando estado...'); try{ await sbFetch('app_users','PATCH',{active:!boolActive(row.active)},'?id=eq.'+encodeURIComponent(id)); await reload(); toast('Estado actualizado','ok'); }catch(err){ console.error('users toggle',err); toast(err.message||'No se pudo actualizar','er'); }finally{ hideLoader(); } }
      async function resetPassword(id){ var row=(state.list||[]).find(function(u){ return String(u.id)===String(id); }); if(!row) return; var pwd=prompt('Nueva contrasena temporal para '+(row.username||id)+':',''); if(!pwd) return; showLoader('Reseteando contrasena...'); try{ await sbFetch('app_users','PATCH',{password_hash:await sha256Hex(pwd)},'?id=eq.'+encodeURIComponent(id)); toast('Contrasena reseteada','ok'); }catch(err){ console.error('users reset',err); toast(err.message||'No se pudo resetear la contrasena','er'); }finally{ hideLoader(); } }
      async function deleteUser(id){ var row=(state.list||[]).find(function(u){ return String(u.id)===String(id); }); if(!confirm('Eliminar el usuario '+((row&&row.username)||id)+'?')) return; showLoader('Eliminando usuario...'); try{ await sbFetch('app_users','DELETE',null,'?id=eq.'+encodeURIComponent(id)); await reload(); toast('Usuario eliminado','ok'); }catch(err){ console.error('users delete',err); toast(err.message||'No se pudo eliminar el usuario','er'); }finally{ hideLoader(); } }
      var _rawGo=null;
      function installGoHook(){ if(typeof go!=='function') return; _rawGo=go; go=function(v){ if(v==='users'){ showPage(); return; } return _rawGo.apply(this,arguments); }; }
      function goFirstAllowed(){
        var mods=['list','form','me2n','idx','licit','prov','users'];
        for(var i=0;i<mods.length;i++){
          if(typeof canAccess==='function' && canAccess(mods[i])){
            if(mods[i]==='users'){ showPage(); }
            else if(_rawGo){ _rawGo.call(window, mods[i]); }
            return;
          }
        }
      }
      function boot(){ ensureNav(); ensureView(); installGoHook(); }
      return {boot:boot,show:showPage,reload:reload,goFirstAllowed:goFirstAllowed};
  })();
  document.addEventListener('DOMContentLoaded', function(){ try{ UsersAdmin.boot(); }catch(err){ console.error('UsersAdmin boot',err); } });
})();
