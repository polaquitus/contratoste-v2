// ── Histórico de Índices — chart section ─────────────────────────────────────

let _idxChart = null;

function initIdxChartSection() {
  const sel = document.getElementById('idxChartNombre');
  if (!sel) return;
  sel.innerHTML = IDX_CATALOG.map(d =>
    `<option value="${d.id}">${d.name}</option>`
  ).join('');

  const now = new Date();
  const hasta = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const desdeDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const desde = desdeDate.getFullYear() + '-' + String(desdeDate.getMonth() + 1).padStart(2, '0');

  const desdeEl = document.getElementById('idxChartDesde');
  const hastaEl = document.getElementById('idxChartHasta');
  if (desdeEl && !desdeEl.value) desdeEl.value = desde;
  if (hastaEl && !hastaEl.value) hastaEl.value = hasta;

  loadIndicesChart();
}

function loadIndicesChart() {
  const idxId   = document.getElementById('idxChartNombre')?.value || 'ipc_nac';
  const desde   = document.getElementById('idxChartDesde')?.value || '';
  const hasta   = document.getElementById('idxChartHasta')?.value || '';
  const canvas  = document.getElementById('idxChart');
  const msgEl   = document.getElementById('idxChartMsg');
  const exportBtn = document.getElementById('btnIdxExportPng');
  if (!canvas) return;

  const def = IDX_CATALOG.find(d => d.id === idxId);
  const rows = idxRows(idxId)
    .filter(r => r.ym && (!desde || r.ym >= desde) && (!hasta || r.ym <= hasta))
    .sort((a, b) => a.ym.localeCompare(b.ym));

  if (_idxChart) { _idxChart.destroy(); _idxChart = null; }

  if (!rows.length) {
    canvas.style.display = 'none';
    if (exportBtn) exportBtn.style.display = 'none';
    msgEl.textContent = 'Sin datos para el período seleccionado.';
    msgEl.style.display = '';
    return;
  }

  msgEl.style.display = 'none';
  canvas.style.display = '';
  if (exportBtn) exportBtn.style.display = '';

  const hasValues = rows.some(r => r.value != null && r.value !== 0);
  // For value-based indices, estimate value from pct when row has no value
  const dataPoints = rows.map((r, i) => {
    if (!hasValues) return r.pct ?? null;
    if (r.value != null) return r.value;
    // pct-only row in a value-based index: estimate from previous value + stored pct
    if (r.pct != null) {
      const prev = rows.slice(0, i).reverse().find(p => p.value != null && p.value !== 0);
      if (prev) return prev.value * (1 + r.pct / 100);
    }
    return null;
  });
  const labels = rows.map(r => {
    const [y, m] = (r.ym || '').split('-');
    return String(m).padStart(2, '0') + '/' + y;
  });

  // Compute % variation per period for the secondary axis
  // Stored r.pct is always reliable (computed from API at fetch time).
  // Only fall back to value computation when pct is null.
  const varPct = rows.map((r, i) => {
    if (i === 0) return null;
    if (r.pct != null) return r.pct;
    // pct missing: estimate from consecutive values
    if (hasValues && r.value != null) {
      const prev = rows.slice(0, i).reverse().find(p => p.value != null && p.value !== 0);
      if (prev) return ((r.value / prev.value) - 1) * 100;
    }
    return null;
  });

  _idxChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: def?.name || idxId,
          data: dataPoints,
          borderColor: '#0071d9',
          backgroundColor: 'rgba(0,113,217,.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#0071d9',
          pointHoverRadius: 5,
          yAxisID: 'y',
          order: 1
        },
        {
          type: 'bar',
          label: 'Variación %',
          data: varPct,
          backgroundColor: varPct.map(v => v == null ? 'transparent' : v >= 0 ? 'rgba(34,197,94,.45)' : 'rgba(239,68,68,.45)'),
          borderColor: varPct.map(v => v == null ? 'transparent' : v >= 0 ? 'rgba(34,197,94,.8)' : 'rgba(239,68,68,.8)'),
          borderWidth: 1,
          yAxisID: 'y2',
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.parsed.y;
              if (val == null) return 'Sin dato';
              if (ctx.dataset.yAxisID === 'y2') return 'Var: ' + (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
              return hasValues
                ? Math.round(val).toLocaleString('es-AR')
                : val.toFixed(2) + '%';
            },
            title: ctx => ctx[0]?.label || ''
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 11 }, maxRotation: 45 },
          grid: { color: 'rgba(0,0,0,.06)' }
        },
        y: {
          title: { display: true, text: def?.name || idxId, font: { size: 11 } },
          ticks: {
            font: { size: 11 },
            callback: v => hasValues
              ? Math.round(v).toLocaleString('es-AR')
              : v.toFixed(1) + '%'
          },
          grid: { color: 'rgba(0,0,0,.06)' }
        },
        y2: {
          position: 'right',
          title: { display: true, text: '% Variación', font: { size: 11 } },
          ticks: { font: { size: 11 }, callback: v => v.toFixed(1) + '%' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });

  renderIdxComparisonTable();
}

function idxVarOverMonths(idxId, nMonths) {
  const rows = (IDX_STORE[idxId]?.rows || []).filter(r => r.ym).sort((a, b) => a.ym.localeCompare(b.ym));
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  const [ly, lm] = latest.ym.split('-').map(Number);
  const targetDate = new Date(ly, lm - 1 - nMonths, 1);
  const targetYm = String(targetDate.getFullYear()) + '-' + String(targetDate.getMonth() + 1).padStart(2, '0');
  const baseRow = rows.filter(r => r.ym <= targetYm).pop();
  if (!baseRow) return null;
  const hasValues = rows.some(r => r.value != null && r.value !== 0);
  if (hasValues) {
    if (latest.value == null || baseRow.value == null || baseRow.value === 0) return null;
    return ((latest.value / baseRow.value) - 1) * 100;
  } else {
    // compound multiplication of pct for rows strictly after baseRow up to latest
    const segment = rows.filter(r => r.ym > baseRow.ym && r.ym <= latest.ym);
    if (!segment.length) return null;
    let compound = 1;
    for (const r of segment) {
      if (r.pct == null) return null;
      compound *= (1 + r.pct / 100);
    }
    return (compound - 1) * 100;
  }
}

function renderIdxComparisonTable() {
  const container = document.getElementById('idxCompTable');
  if (!container) return;
  const periods = [
    { label: '1 mes',   n: 1  },
    { label: '3 meses', n: 3  },
    { label: '6 meses', n: 6  },
    { label: '12 meses',n: 12 },
    { label: '18 meses',n: 18 }
  ];
  const activeIds = IDX_CATALOG.filter(d => (IDX_STORE[d.id]?.rows||[]).length > 0).map(d => d.id);
  if (!activeIds.length) { container.style.display = 'none'; return; }
  container.style.display = '';
  const fmtPct = v => v == null ? '<span style="color:var(--g400)">—</span>'
    : `<span style="color:${v >= 0 ? '#16a34a' : '#dc2626'};font-weight:600">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</span>`;
  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--g100)">
      <th style="text-align:left;padding:7px 10px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">Índice</th>
      ${periods.map(p => `<th style="text-align:right;padding:7px 10px;font-weight:700;color:var(--g700);border-bottom:2px solid var(--g200)">${p.label}</th>`).join('')}
    </tr></thead><tbody>`;
  activeIds.forEach((id, i) => {
    const def = IDX_CATALOG.find(d => d.id === id);
    const bg = i % 2 === 0 ? '' : 'background:var(--g50)';
    html += `<tr style="${bg}">
      <td style="padding:6px 10px;color:var(--g800);font-weight:600;white-space:nowrap;border-bottom:1px solid var(--g100)">${def?.name || id}</td>
      ${periods.map(p => `<td style="text-align:right;padding:6px 10px;border-bottom:1px solid var(--g100)">${fmtPct(idxVarOverMonths(id, p.n))}</td>`).join('')}
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function exportIdxChartPng() {
  if (!_idxChart) return;
  const sel = document.getElementById('idxChartNombre');
  const nom = sel?.options[sel.selectedIndex]?.text || 'indice';
  const a = document.createElement('a');
  a.href = _idxChart.toBase64Image();
  a.download = 'historico_' + nom.replace(/\s+/g, '_').toLowerCase() + '.png';
  a.click();
}

