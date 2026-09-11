// ═══════════ MÓDULO RRLL — CATÁLOGO DE CONCEPTOS Y PARITARIAS ═══════════════
// Historial global (no por contrato) de cambios de convenio para Petroleros
// Privados (PP) y Petroleros Jerárquicos (PJ), y el catálogo de conceptos de
// la planilla de "sueldo testigo" que usan los contratos en modo testigo
// (contract.moTestigo — ver 03-utils.js) para calcular su ajuste real.
// El % resultante lo consume computeTestigoPct (07-polynomial.js) cuando un
// contrato corre su "Nueva Enmienda → Actualización de Tarifas" de siempre —
// este módulo solo carga y persiste RRLL_STORE, no dispara nada por su cuenta.
// Mismo patrón que Legales (10-legales.js): módulo auto-contenido que inyecta
// su propio nav+view, mismo patrón de persistencia "blob JSON" que
// clause_templates/indices (sbFetch con tabla single-row).
// Ver /root/.claude/plans/linked-twirling-pillow.md para el diseño completo.

var RRLL_STORE = {version:1, conceptos:[], cambios:[]};

(function(){
  var TABLE='rrll_paritarias';
  var LS_KEY='rrll_paritarias_v1';
  var state={loaded:false,sbId:null,editConceptoId:null};
  var refs={root:null,nav:null,conceptos:null,cambios:null};

  var MODOS=[
    {id:'escala_con_acuerdo',    label:'Escala con el Acuerdo General',    necesita:[]},
    {id:'pct_de_concepto',        label:'% de otro concepto',               necesita:['deConceptoId']},
    {id:'pct_subtotal_parcial',   label:'% de un grupo de conceptos',       necesita:['deConceptos','baseFijo']},
    {id:'pct_subtotal_acumulado', label:'% de todo lo cargado arriba',      necesita:['deConceptos']},
    {id:'suma_fija',              label:'Suma fija ($)',                    necesita:[]}
  ];

  function seedConceptos(){
    return [
      {id:'basico',            nombre:'Sueldo Básico CCT',                       tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'turno',             nombre:'Turno',                                   tipoLiq:'rem',   modo:'pct_de_concepto', deConceptoId:'basico'},
      {id:'zona',              nombre:'Zona',                                    tipoLiq:'rem',   modo:'pct_subtotal_parcial', deConceptos:['basico','turno']},
      {id:'antiguedad',        nombre:'Antigüedad (Art. 18)',                    tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'bonoPazSocial',     nombre:'Bono Paz Social (Art. 35)',               tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'adicYacimiento',    nombre:'Adicional Yacimiento (Art. 53B)',         tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'adicDisponibilidad',nombre:'Adicional Disponibilidad (Art. 53B)',     tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'horasExtras50',     nombre:'Horas Extras 50%',                        tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'feriadoProm',       nombre:'Feriado Prom. Trabajado',                 tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'desarraigo',        nombre:'Desarraigo (Art. 23)',                    tipoLiq:'rem',   modo:'pct_de_concepto', deConceptoId:'basico'},
      {id:'horasViaje',        nombre:'Horas de Viaje (Art. 51)',                tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'presentismo',       nombre:'Presentismo',                             tipoLiq:'rem',   modo:'pct_subtotal_acumulado', deConceptos:['basico','zona','turno','antiguedad','bonoPazSocial','adicYacimiento','adicDisponibilidad','horasExtras50','feriadoProm','desarraigo','horasViaje']},
      {id:'premioPuntualidad', nombre:'Adicional Premio Puntualidad Perfecta',   tipoLiq:'rem',   modo:'escala_con_acuerdo'},
      {id:'viandaAlimentacion',nombre:'Vianda Ayuda Alimentación (Art. 34)',     tipoLiq:'norem', modo:'escala_con_acuerdo'},
      {id:'viandaHsExtras',    nombre:'Vianda Hs Extras',                        tipoLiq:'norem', modo:'escala_con_acuerdo'},
      {id:'viandaDesayuno',    nombre:'Vianda Desay/Merienda',                   tipoLiq:'norem', modo:'escala_con_acuerdo'},
      {id:'asigViandaFija',    nombre:'Asignación Vianda Complementaria (Fijo)', tipoLiq:'norem', modo:'escala_con_acuerdo'},
      {id:'anrBase',           nombre:'ANR (Acuerdo No Remunerativo)',           tipoLiq:'norem', modo:'pct_subtotal_parcial', baseFijo:true, deConceptos:['basico','zona','turno','antiguedad','bonoPazSocial','adicYacimiento','adicDisponibilidad','horasExtras50','feriadoProm','desarraigo','horasViaje','presentismo','premioPuntualidad','viandaAlimentacion','viandaHsExtras','viandaDesayuno','asigViandaFija']},
      {id:'asigVacaMuerta',    nombre:'Asignación Vaca Muerta',                  tipoLiq:'norem', modo:'suma_fija'}
    ];
  }

  function q(id){return document.getElementById(id);}
  function clear(el){while(el&&el.firstChild)el.removeChild(el.firstChild);}
  function make(tag,cls,txt){var el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=txt;return el;}
  function nowUser(){try{return (typeof _APP_USER!=='undefined'&&_APP_USER&&_APP_USER.username)||(typeof _APP_ROLE!=='undefined'&&_APP_ROLE)||'—';}catch(e){return '—';}}
  function modoDef(id){return MODOS.find(function(m){return m.id===id;});}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function emptyData(){ return {version:1,updatedAt:new Date().toISOString(),updatedBy:nowUser(),conceptos:seedConceptos(),cambios:[]}; }

  async function reload(){
    state.loaded=false;
    try{
      if(typeof SB_OK!=='undefined'&&SB_OK&&typeof sbFetch==='function'){
        var rows=await sbFetch(TABLE,'GET',null,'?select=id,datos&order=id.desc&limit=1');
        if(rows&&rows.length){
          state.sbId=rows[0].id;
          var d=JSON.parse(rows[0].datos);
          RRLL_STORE.version=d.version||1;RRLL_STORE.conceptos=d.conceptos||seedConceptos();RRLL_STORE.cambios=d.cambios||[];
          state.loaded=true;return;
        }
        var seedData=emptyData();
        var res=await sbFetch(TABLE,'POST',{datos:JSON.stringify(seedData)});
        if(res&&res[0])state.sbId=res[0].id;
        RRLL_STORE.version=seedData.version;RRLL_STORE.conceptos=seedData.conceptos;RRLL_STORE.cambios=seedData.cambios;
        state.loaded=true;return;
      }
    }catch(err){ console.warn('[rrll] no se pudo usar Supabase, usando localStorage:',err.message); }
    try{
      var raw=localStorage.getItem(LS_KEY);
      var d2=raw?JSON.parse(raw):emptyData();
      RRLL_STORE.version=d2.version||1;RRLL_STORE.conceptos=d2.conceptos||seedConceptos();RRLL_STORE.cambios=d2.cambios||[];
    }catch(e){
      var d3=emptyData();
      RRLL_STORE.version=d3.version;RRLL_STORE.conceptos=d3.conceptos;RRLL_STORE.cambios=d3.cambios;
    }
    state.loaded=true;
  }

  async function persist(){
    var payloadData={version:RRLL_STORE.version,updatedAt:new Date().toISOString(),updatedBy:nowUser(),conceptos:RRLL_STORE.conceptos,cambios:RRLL_STORE.cambios};
    if(typeof localStorage!=='undefined')localStorage.setItem(LS_KEY,JSON.stringify(payloadData));
    if(typeof SB_OK!=='undefined'&&SB_OK&&typeof sbFetch==='function'){
      try{
        var payload={datos:JSON.stringify(payloadData)};
        if(state.sbId){await sbFetch(TABLE,'PATCH',payload,'?id=eq.'+state.sbId);}
        else{var res=await sbFetch(TABLE,'POST',payload);if(res&&res[0])state.sbId=res[0].id;}
      }catch(err){
        console.warn('[rrll] no se pudo guardar en Supabase, quedó solo en localStorage:',err.message);
        if(typeof toast==='function')toast('No se pudo sincronizar con Supabase — se guardó localmente. Avisá a Sistemas para crear la tabla rrll_paritarias.','er');
      }
    }
  }

  function ensureNav(){
    var nav=document.querySelector('.sb-nav');if(!nav)return;
    if(q('navRrllModule')){refs.nav=q('navRrllModule');return;}
    var a=make('a','nv');a.id='navRrllModule';a.href='#';a.setAttribute('data-mod','rrll');
    a.appendChild(make('span','ni','👷'));a.appendChild(make('span','','Relaciones Laborales'));
    a.addEventListener('click',function(ev){ev.preventDefault();showPage();});
    var legalesLink=q('navLegalesModule');
    if(legalesLink&&legalesLink.parentNode===nav){legalesLink.insertAdjacentElement('afterend',a);}
    else{nav.appendChild(a);}
    refs.nav=a;
  }

  function ensureView(){
    var ct=document.querySelector('.ct');if(!ct)return;
    if(q('vRrllModule')){refs.root=q('vRrllModule');refs.conceptos=q('rrllConceptos');refs.cambios=q('rrllCambios');return;}
    var wrap=make('div','vw');wrap.id='vRrllModule';
    var card=make('div','card');
    var hdr=make('div','thdr');hdr.appendChild(make('h2','','👷 Relaciones Laborales — Convenios Petroleros (PP/PJ)'));
    var info=make('div','info-box blue');info.style.margin='0 0 14px';
    info.innerHTML='Acá se registra cada cambio de paritaria (qué concepto de la planilla testigo sube, cuánto y desde qué período) y se mantiene el catálogo de conceptos. Los contratos en modo "sueldo testigo" toman este historial recién cuando alguien corre una Actualización de Tarifas en ESE contrato — cargar acá no dispara nada solo.';
    card.appendChild(hdr);card.appendChild(info);
    var grid=make('div','');grid.style.display='grid';grid.style.gridTemplateColumns='1fr 1.3fr';grid.style.gap='20px';grid.style.alignItems='start';
    var conceptosWrap=make('div','');conceptosWrap.id='rrllConceptos';
    var cambiosWrap=make('div','');cambiosWrap.id='rrllCambios';
    grid.appendChild(conceptosWrap);grid.appendChild(cambiosWrap);
    card.appendChild(grid);
    wrap.appendChild(card);ct.appendChild(wrap);
    refs.root=wrap;refs.conceptos=conceptosWrap;refs.cambios=cambiosWrap;
  }

  function setHeader(){
    var t=q('pgT'),a=q('pgA');if(!t||!a)return;
    clear(t);t.appendChild(document.createTextNode('👷 Relaciones Laborales '));var bc=make('span','bc','Convenios PP/PJ');t.appendChild(bc);
    clear(a);var rec=make('button','btn btn-s btn-sm','Recargar');rec.type='button';rec.addEventListener('click',async function(){await reload();render();});a.appendChild(rec);
  }

  function hideAllViews(){
    ['vList','vForm','vDet','vMe2n','vMe2nDet','vIdx','vLicit','vProv','vTimeline','vAlertas','vDashboard','vForecast','vUsersModule','vLegalesModule','vRrllModule'].forEach(function(id){var el=q(id);if(el)el.classList.remove('on');});
    document.querySelectorAll('.sb-nav .nv').forEach(function(n){n.classList.remove('act');});
  }

  async function showPage(){
    if(typeof canAccess==='function'&&!canAccess('rrll')){if(typeof toast==='function')toast('Tu rol no tiene permiso para entrar a este módulo','er');return;}
    ensureNav();ensureView();setHeader();hideAllViews();
    refs.root.classList.add('on');if(refs.nav)refs.nav.classList.add('act');
    if(!state.loaded){if(typeof showLoader==='function')showLoader('Cargando RRLL...');await reload();if(typeof hideLoader==='function')hideLoader();}
    render();
  }

  function render(){ renderConceptos(); renderCambios(); }

  // ── Catálogo de conceptos ──────────────────────────────────────────────
  function renderConceptoRow(c){
    var row=make('div','');row.style.display='flex';row.style.justifyContent='space-between';row.style.alignItems='center';
    row.style.padding='7px 9px';row.style.borderRadius='6px';row.style.background='var(--g50)';row.style.fontSize='12px';
    var left=make('div','');
    var nom=make('div','');nom.style.fontWeight='600';nom.textContent=c.nombre;
    var sub=make('div','');sub.style.fontSize='10.5px';sub.style.color='var(--g500)';sub.textContent=(modoDef(c.modo)||{}).label||c.modo;
    left.appendChild(nom);left.appendChild(sub);
    var edit=make('button','btn btn-s btn-sm','✏️');edit.type='button';edit.style.padding='2px 7px';edit.addEventListener('click',function(){openConceptoForm(c.id);});
    row.appendChild(left);row.appendChild(edit);
    return row;
  }
  function renderConceptoGrupo(titulo,items,colorBorde){
    var grupo=make('div','');grupo.style.marginBottom='14px';
    var h=make('div','');h.style.fontWeight='700';h.style.fontSize='11px';h.style.textTransform='uppercase';h.style.letterSpacing='.4px';
    h.style.color=colorBorde;h.style.marginBottom='6px';h.style.paddingBottom='4px';h.style.borderBottom='2px solid '+colorBorde;
    h.textContent=titulo+' ('+items.length+')';
    grupo.appendChild(h);
    var list=make('div','');list.style.display='flex';list.style.flexDirection='column';list.style.gap='4px';
    items.forEach(function(c){ list.appendChild(renderConceptoRow(c)); });
    if(!items.length){var vacio=make('div','','Sin conceptos.');vacio.style.fontSize='11px';vacio.style.color='var(--g500)';vacio.style.fontStyle='italic';list.appendChild(vacio);}
    grupo.appendChild(list);
    return grupo;
  }
  function renderConceptos(){
    if(!refs.conceptos)return;
    clear(refs.conceptos);
    var box=make('div','');box.style.border='1px solid var(--g200)';box.style.borderRadius='8px';box.style.padding='12px';
    var title=make('div','');title.style.fontWeight='800';title.style.fontSize='13px';title.style.marginBottom='10px';title.textContent='Catálogo de Conceptos ('+RRLL_STORE.conceptos.length+')';
    box.appendChild(title);
    var listWrap=make('div','');listWrap.style.maxHeight='520px';listWrap.style.overflow='auto';
    var rem=RRLL_STORE.conceptos.filter(function(c){return c.tipoLiq!=='norem';});
    var norem=RRLL_STORE.conceptos.filter(function(c){return c.tipoLiq==='norem';});
    listWrap.appendChild(renderConceptoGrupo('💰 Sumas Remunerativas',rem,'var(--g600)'));
    listWrap.appendChild(renderConceptoGrupo('🧾 Sumas No Remunerativas',norem,'var(--p500)'));
    box.appendChild(listWrap);
    var addBtn=make('button','btn btn-p btn-sm','+ Agregar concepto');addBtn.type='button';addBtn.style.marginTop='10px';
    addBtn.addEventListener('click',function(){openConceptoForm(null);});
    box.appendChild(addBtn);
    var formHost=make('div','');formHost.id='rrllConceptoForm';formHost.style.marginTop='10px';
    box.appendChild(formHost);
    refs.conceptos.appendChild(box);
    if(state.editConceptoId!==undefined&&state.editConceptoId!==null)renderConceptoForm();
    else if(state.editConceptoId===null&&state._wantNewConcepto)renderConceptoForm();
  }

  function openConceptoForm(id){ state.editConceptoId=id; state._wantNewConcepto=(id===null); renderConceptoForm(); }

  function renderConceptoForm(){
    var host=q('rrllConceptoForm');if(!host)return;
    clear(host);
    var isNew=!state.editConceptoId;
    var c=isNew?{id:'',nombre:'',tipoLiq:'rem',modo:'escala_con_acuerdo',deConceptoId:'',deConceptos:[],baseFijo:false}:RRLL_STORE.conceptos.find(function(x){return x.id===state.editConceptoId;});
    if(!c)return;
    var wrap=make('div','');wrap.style.border='1px dashed var(--p400)';wrap.style.borderRadius='8px';wrap.style.padding='10px';wrap.style.background='var(--p50)';
    wrap.innerHTML=
      '<div style="font-weight:700;font-size:12px;margin-bottom:8px">'+(isNew?'Nuevo concepto':'Editar concepto')+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'+
        '<div><label style="font-size:10.5px;font-weight:600">ID (sin espacios)</label><input id="rc_id" '+(isNew?'':'disabled')+' value="'+esc(c.id)+'" style="width:100%;font-size:12px"></div>'+
        '<div><label style="font-size:10.5px;font-weight:600">Nombre</label><input id="rc_nombre" value="'+esc(c.nombre)+'" style="width:100%;font-size:12px"></div>'+
        '<div><label style="font-size:10.5px;font-weight:600">Tipo</label><select id="rc_tipo" style="width:100%;font-size:12px"><option value="rem" '+(c.tipoLiq==='rem'?'selected':'')+'>Remunerativo</option><option value="norem" '+(c.tipoLiq==='norem'?'selected':'')+'>No Remunerativo</option></select></div>'+
        '<div><label style="font-size:10.5px;font-weight:600">Modo de cálculo</label><select id="rc_modo" style="width:100%;font-size:12px">'+MODOS.map(function(m){return '<option value="'+m.id+'" '+(c.modo===m.id?'selected':'')+'>'+esc(m.label)+'</option>';}).join('')+'</select></div>'+
      '</div>'+
      '<div id="rc_extra" style="margin-bottom:8px"></div>'+
      '<div style="display:flex;gap:8px">'+
        '<button id="rc_save" class="btn btn-p btn-sm" type="button">💾 Guardar</button>'+
        '<button id="rc_cancel" class="btn btn-s btn-sm" type="button">Cancelar</button>'+
        (isNew?'':'<button id="rc_del" class="btn btn-d btn-sm" type="button" style="margin-left:auto">🗑 Eliminar</button>')+
      '</div>';
    host.appendChild(wrap);
    function renderExtra(){
      var modo=q('rc_modo').value;
      var extraEl=q('rc_extra');
      var mdef=modoDef(modo);
      var needs=(mdef&&mdef.necesita)||[];
      var h='';
      var idsDisponibles=RRLL_STORE.conceptos.filter(function(x){return x.id!==c.id;});
      if(needs.indexOf('deConceptoId')>=0){
        h+='<label style="font-size:10.5px;font-weight:600">Depende de</label><select id="rc_de1" style="width:100%;font-size:12px">'+idsDisponibles.map(function(x){return '<option value="'+esc(x.id)+'" '+(c.deConceptoId===x.id?'selected':'')+'>'+esc(x.nombre)+'</option>';}).join('')+'</select>';
      }
      if(needs.indexOf('deConceptos')>=0){
        h+='<label style="font-size:10.5px;font-weight:600;display:block;margin-top:4px">Suma de (ctrl/cmd+click para varios)</label><select id="rc_de2" multiple size="6" style="width:100%;font-size:12px">'+idsDisponibles.map(function(x){return '<option value="'+esc(x.id)+'" '+((c.deConceptos||[]).indexOf(x.id)>=0?'selected':'')+'>'+esc(x.nombre)+'</option>';}).join('')+'</select>';
      }
      if(needs.indexOf('baseFijo')>=0){
        h+='<label style="font-size:11px;display:flex;align-items:center;gap:6px;margin-top:6px"><input type="checkbox" id="rc_basefijo" '+(c.baseFijo?'checked':'')+'> Calcular siempre sobre la tabla ORIGINAL del contrato (no la ya escalada) — ej. "ANR"</label>';
      }
      extraEl.innerHTML=h;
    }
    renderExtra();
    q('rc_modo').addEventListener('change',renderExtra);
    q('rc_cancel').addEventListener('click',function(){state.editConceptoId=undefined;state._wantNewConcepto=false;renderConceptos();});
    q('rc_save').addEventListener('click',function(){
      var id=isNew?String(q('rc_id').value||'').trim():c.id;
      if(!id){if(typeof toast==='function')toast('Falta el ID del concepto','er');return;}
      if(isNew&&RRLL_STORE.conceptos.some(function(x){return x.id===id;})){if(typeof toast==='function')toast('Ya existe un concepto con ese ID','er');return;}
      var nombre=String(q('rc_nombre').value||'').trim();
      if(!nombre){if(typeof toast==='function')toast('Falta el nombre','er');return;}
      var modo=q('rc_modo').value;
      var nuevo={id:id,nombre:nombre,tipoLiq:q('rc_tipo').value,modo:modo};
      var mdef=modoDef(modo),needs=(mdef&&mdef.necesita)||[];
      if(needs.indexOf('deConceptoId')>=0)nuevo.deConceptoId=q('rc_de1')?q('rc_de1').value:'';
      if(needs.indexOf('deConceptos')>=0)nuevo.deConceptos=q('rc_de2')?Array.from(q('rc_de2').selectedOptions).map(function(o){return o.value;}):[];
      if(needs.indexOf('baseFijo')>=0)nuevo.baseFijo=!!(q('rc_basefijo')&&q('rc_basefijo').checked);
      var idx=RRLL_STORE.conceptos.findIndex(function(x){return x.id===id;});
      if(idx>=0)RRLL_STORE.conceptos[idx]=nuevo; else RRLL_STORE.conceptos.push(nuevo);
      persist();
      state.editConceptoId=undefined;state._wantNewConcepto=false;
      render();
      if(typeof toast==='function')toast('Concepto guardado','ok');
    });
    if(!isNew&&q('rc_del')){
      q('rc_del').addEventListener('click',function(){
        if(!confirm('¿Eliminar el concepto "'+c.nombre+'"? Los contratos que ya lo tengan cargado en su tabla testigo lo van a seguir mostrando, pero como una fila suelta sin definición.'))return;
        RRLL_STORE.conceptos=RRLL_STORE.conceptos.filter(function(x){return x.id!==id;});
        persist();
        state.editConceptoId=undefined;state._wantNewConcepto=false;
        render();
        if(typeof toast==='function')toast('Concepto eliminado','ok');
      });
    }
  }

  // ── Historial de cambios de paritaria ───────────────────────────────────
  function fmtPeriodo(ym){
    if(!ym)return '—';
    var p=String(ym).split('-');if(p.length<2)return ym;
    var MESES=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return (MESES[parseInt(p[1],10)]||p[1])+' '+p[0];
  }
  function conceptoLabel(id){
    if(id==='ACUERDO_GENERAL')return 'Acuerdo General (todos los "Escala con acuerdo")';
    var c=RRLL_STORE.conceptos.find(function(x){return x.id===id;});
    return c?c.nombre:id;
  }

  function renderCambios(){
    if(!refs.cambios)return;
    clear(refs.cambios);
    var box=make('div','');box.style.border='1px solid var(--g200)';box.style.borderRadius='8px';box.style.padding='12px';
    var title=make('div','');title.style.fontWeight='800';title.style.fontSize='13px';title.style.marginBottom='10px';title.textContent='Historial de Cambios de Paritaria ('+RRLL_STORE.cambios.length+')';
    box.appendChild(title);
    var rows=RRLL_STORE.cambios.slice().sort(function(a,b){return String(b.periodo||'').localeCompare(String(a.periodo||''));});
    var tbl=make('div','');tbl.style.maxHeight='420px';tbl.style.overflow='auto';
    var t='<table style="width:100%;font-size:11.5px;border-collapse:collapse"><thead><tr style="text-align:left;color:var(--g500)"><th>Período</th><th>CCT</th><th>Concepto</th><th>Valor</th><th></th></tr></thead><tbody>';
    rows.forEach(function(c){
      var valorTxt=c.conceptoId==='ACUERDO_GENERAL'?('+'+((c.valor||0)*100).toFixed(2)+'% acum.'):
        (modoDef((RRLL_STORE.conceptos.find(function(x){return x.id===c.conceptoId;})||{}).modo)||{}).id==='suma_fija'||['asigViandaFija','asigVacaMuerta'].indexOf(c.conceptoId)>=0?('$ '+Number(c.valor||0).toLocaleString('es-AR')):
        (typeof c.valor==='number'&&c.valor<=1?((c.valor*100).toFixed(2)+'%'):esc(String(c.valor)));
      t+='<tr style="border-top:1px solid var(--g100)"><td style="padding:5px 0">'+esc(fmtPeriodo(c.periodo))+'</td><td>'+esc(c.cct)+'</td><td>'+esc(conceptoLabel(c.conceptoId))+(c.nota?' <span style="color:var(--g500)" title="'+esc(c.nota)+'">📝</span>':'')+'</td><td class="mono">'+valorTxt+'</td><td><button class="btn btn-d btn-sm" data-delid="'+esc(c.id)+'" style="padding:1px 6px;font-size:10px">🗑</button></td></tr>';
    });
    t+='</tbody></table>';
    tbl.innerHTML=t;
    box.appendChild(tbl);
    tbl.querySelectorAll('button[data-delid]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.getAttribute('data-delid');
        if(!confirm('¿Eliminar este cambio del historial? Los contratos que ya lo hayan tomado en una enmienda guardada NO se recalculan retroactivamente.'))return;
        RRLL_STORE.cambios=RRLL_STORE.cambios.filter(function(x){return x.id!==id;});
        persist();renderCambios();
        if(typeof toast==='function')toast('Cambio eliminado del historial','ok');
      });
    });
    var addBtn=make('button','btn btn-p btn-sm','+ Agregar cambio');addBtn.type='button';addBtn.style.marginTop='10px';
    addBtn.addEventListener('click',function(){state._wantNewCambio=!state._wantNewCambio;renderCambioForm();});
    box.appendChild(addBtn);
    var formHost=make('div','');formHost.id='rrllCambioForm';formHost.style.marginTop='10px';
    box.appendChild(formHost);
    refs.cambios.appendChild(box);
    if(state._wantNewCambio)renderCambioForm();
  }

  function renderCambioForm(){
    var host=q('rrllCambioForm');if(!host)return;
    clear(host);
    if(!state._wantNewCambio)return;
    var wrap=make('div','');wrap.style.border='1px dashed var(--p400)';wrap.style.borderRadius='8px';wrap.style.padding='10px';wrap.style.background='var(--p50)';
    function conceptoOpt(c){return '<option value="'+esc(c.id)+'">'+esc(c.nombre)+' ('+esc((modoDef(c.modo)||{}).label||c.modo)+')</option>';}
    var conceptoOpts='<option value="ACUERDO_GENERAL">Acuerdo General (mueve todos los conceptos en modo "Escala con acuerdo")</option>'+
      '<optgroup label="💰 Sumas Remunerativas">'+RRLL_STORE.conceptos.filter(function(c){return c.tipoLiq!=='norem';}).map(conceptoOpt).join('')+'</optgroup>'+
      '<optgroup label="🧾 Sumas No Remunerativas">'+RRLL_STORE.conceptos.filter(function(c){return c.tipoLiq==='norem';}).map(conceptoOpt).join('')+'</optgroup>';
    wrap.innerHTML=
      '<div style="font-weight:700;font-size:12px;margin-bottom:8px">Nuevo cambio de paritaria</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'+
        '<div><label style="font-size:10.5px;font-weight:600">Período (desde)</label><input type="month" id="rl_periodo" style="width:100%;font-size:12px"></div>'+
        '<div><label style="font-size:10.5px;font-weight:600">Aplica a</label><select id="rl_cct" style="width:100%;font-size:12px"><option value="PP">Petroleros Privados</option><option value="PJ">Petroleros Jerárquicos</option><option value="AMBOS">Ambos</option></select></div>'+
        '<div style="grid-column:1/-1"><label style="font-size:10.5px;font-weight:600">Concepto</label><select id="rl_concepto" style="width:100%;font-size:12px">'+conceptoOpts+'</select></div>'+
        '<div id="rl_valor_wrap" style="grid-column:1/-1"></div>'+
        '<div style="grid-column:1/-1"><label style="font-size:10.5px;font-weight:600">Nota (opcional)</label><input id="rl_nota" placeholder="Ej: Acta paritaria 15/07/2025" style="width:100%;font-size:12px"></div>'+
      '</div>'+
      '<div style="display:flex;gap:8px"><button id="rl_save" class="btn btn-p btn-sm" type="button">💾 Guardar</button><button id="rl_cancel" class="btn btn-s btn-sm" type="button">Cancelar</button></div>';
    host.appendChild(wrap);
    function renderValorField(){
      var conceptoId=q('rl_concepto').value;
      var wrapEl=q('rl_valor_wrap');
      if(conceptoId==='ACUERDO_GENERAL'){
        wrapEl.innerHTML='<label style="font-size:10.5px;font-weight:600">% acumulado desde la base del contrato (ej. 6% desde abril → 6)</label><input type="number" id="rl_valor" step="0.01" style="width:100%;font-size:12px" placeholder="6">';
        return;
      }
      var c=RRLL_STORE.conceptos.find(function(x){return x.id===conceptoId;});
      var modo=c?c.modo:'suma_fija';
      if(modo==='suma_fija'){
        wrapEl.innerHTML='<label style="font-size:10.5px;font-weight:600">Monto fijo nuevo ($)</label><input type="number" id="rl_valor" step="0.01" style="width:100%;font-size:12px" placeholder="380000">'+
          '<label style="font-size:10.5px;font-weight:600;display:block;margin-top:4px">Cantidad (dejalo en 1 salvo que corresponda otra)</label><input type="number" id="rl_cant" step="1" value="1" style="width:100%;font-size:12px">';
      } else {
        wrapEl.innerHTML='<label style="font-size:10.5px;font-weight:600">Nuevo % puntual para este concepto (ej. 85% → 0.85)</label><input type="number" id="rl_valor" step="0.0001" style="width:100%;font-size:12px" placeholder="0.85">';
      }
    }
    renderValorField();
    q('rl_concepto').addEventListener('change',renderValorField);
    q('rl_cancel').addEventListener('click',function(){state._wantNewCambio=false;renderCambioForm();});
    q('rl_save').addEventListener('click',function(){
      var periodo=q('rl_periodo').value;
      if(!periodo){if(typeof toast==='function')toast('Falta el período','er');return;}
      var cctSel=q('rl_cct').value;
      var conceptoId=q('rl_concepto').value;
      var valorRaw=q('rl_valor')?parseFloat(q('rl_valor').value):NaN;
      if(!isFinite(valorRaw)){if(typeof toast==='function')toast('Falta el valor','er');return;}
      var valor=conceptoId==='ACUERDO_GENERAL'?(valorRaw/100):valorRaw;
      var nota=String(q('rl_nota')?q('rl_nota').value:'').trim();
      var cants=cctSel==='AMBOS'?['PP','PJ']:[cctSel];
      cants.forEach(function(cct){
        var entry={id:Date.now().toString(36)+Math.random().toString(36).substr(2,4)+'_'+cct,cct:cct,periodo:periodo,conceptoId:conceptoId,valor:valor,nota:nota||null,fecha:new Date().toISOString(),updatedBy:nowUser()};
        var cantEl=q('rl_cant');
        if(cantEl)entry.cant=parseFloat(cantEl.value)||0;
        RRLL_STORE.cambios.push(entry);
      });
      persist();
      state._wantNewCambio=false;
      render();
      if(typeof toast==='function')toast('Cambio de paritaria registrado','ok');
    });
  }

  var _rawGo=null;
  function installGoHook(){
    if(typeof go!=='function')return;
    if(_rawGo)return; // ya instalado
    _rawGo=go;
    go=function(v){if(v==='rrll'){showPage();return;}return _rawGo.apply(this,arguments);};
  }

  function boot(){ensureNav();ensureView();installGoHook();}
  document.addEventListener('DOMContentLoaded',function(){try{window.RrllAdmin.boot();}catch(err){console.error('RrllAdmin boot',err);}});

  window.RrllAdmin={boot:boot,show:showPage,reload:reload,getStore:function(){return RRLL_STORE;}};
})();
