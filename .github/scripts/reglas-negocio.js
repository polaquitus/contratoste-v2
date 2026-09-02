// Reglas de negocio de Contratos TA v2 — aserciones sobre NÚMEROS.
//
// Por qué existe este archivo:
//   Los bugs de esta app no rompen la pantalla. Un AVE contado dos veces, un Ko
//   con la fórmula equivocada o un plazo un mes corto renderizan perfecto — solo
//   que con el número mal. El smoke test (ausencia de errores JS) nunca los ve.
//   La única forma de agarrarlos es decir de antemano cuánto tiene que dar.
//
// Cada caso de acá corresponde a UN bug real que ya ocurrió. La regla y su
// commit de origen están citados en skills-contratoste/REGRESIONES.md.
//
// Corre contra el commit servido en BASE_URL, usando las funciones reales de la
// app en el navegador — no reimplementa nada.

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';
const EXEC_PATH = process.env.CHROMIUM_PATH || undefined; // solo para correr local

const casos = [];
const caso = (nombre, regla, fn) => casos.push({ nombre, regla, fn });

// ── 1. Ledger de AVEs ───────────────────────────────────────────────────────
// Bug 2026-07-22: "eliminar doble conteo de AVEs en el monto vigente".
// El total se acumulaba en vez de recalcularse desde montoBase.
caso('Ledger: total = montoBase + Σpoly + Σowner',
     'ave-ledger §1 (I2) · doble conteo 2026-07-22', () => {
  const c = { montoBase: 1000, monto: 1000, aves: [
    { tipo: 'POLINOMICA', monto: 100 },
    { tipo: 'OWNER',      monto: 50  },
  ]};
  const t = getTotal(c);
  if (t !== 1150) return `esperaba 1150, dio ${t}`;
  // Idempotencia: leer el total no puede cambiarlo. Si cambia, se está acumulando.
  if (getTotal(c) !== 1150) return `no es idempotente: segunda lectura dio ${getTotal(c)}`;
  return null;
});

caso('Ledger: un AVE negativo resta, no suma',
     'ave-ledger §4.4 · H-08', () => {
  const c = { montoBase: 1000, aves: [{ tipo: 'OWNER', monto: -200 }] };
  const t = getTotal(c);
  return t === 800 ? null : `esperaba 800, dio ${t}`;
});

// ── 2. Fórmula Ko ───────────────────────────────────────────────────────────
// Bug H-13 (5b5a386): tres funciones usaban Math.pow (geométrica) y dos la
// lineal. Con estos números la geométrica da 14.891% y la lineal 15% — parecido
// pero distinto, que es justo por qué pasó desapercibido. Tolerancia chica a
// propósito.
caso('Ko lineal: inc 50/50 con +10% y +20% → 15%',
     'polinomica-ko §1 · H-13', () => {
  // IDX_STORE se declara con `let` a nivel de script, así que NO es propiedad de
  // window: hay que asignar el identificador pelado para pegarle al binding real.
  const backup = IDX_STORE;
  try {
    IDX_STORE = {
      test_a: { rows: [{ ym: '2026-02', pct: 10 }] },
      test_b: { rows: [{ ym: '2026-02', pct: 20 }] },
    };
    const contrato = { poly: [
      { idx: 'test_a', inc: 0.5 },
      { idx: 'test_b', inc: 0.5 },
    ]};
    const pct = computePoliDeltaPct(contrato, '2026-01', '2026-02');
    if (pct == null) return 'devolvió null (¿faltan datos de algún índice?)';
    if (Math.abs(pct - 15) > 0.001) {
      const geo = (Math.pow(1.10, 0.5) * Math.pow(1.20, 0.5) - 1) * 100;
      const pista = Math.abs(pct - geo) < 0.01 ? ' ← es la fórmula GEOMÉTRICA (Math.pow), el bug H-13' : '';
      return `esperaba 15%, dio ${pct.toFixed(4)}%${pista}`;
    }
    return null;
  } finally { IDX_STORE = backup; }
});

caso('Ko: si a un componente le falta el dato, devuelve null (no un Ko parcial)',
     'polinomica-ko §4.4', () => {
  const backup = IDX_STORE;
  try {
    IDX_STORE = { test_a: { rows: [{ ym: '2026-02', pct: 10 }] } };
    const contrato = { poly: [
      { idx: 'test_a',       inc: 0.5 },
      { idx: 'test_sin_dato', inc: 0.5 },
    ]};
    const pct = computePoliDeltaPct(contrato, '2026-01', '2026-02');
    return pct === null ? null : `esperaba null, dio ${pct} (un Ko parcial es peor que ninguno)`;
  } finally { IDX_STORE = backup; }
});

// ── 3. Tarifario vigente al período ─────────────────────────────────────────
// Bug f11eaff / 5a15b0e: se tomaba la generación más nueva en vez de la vigente
// al período pedido, y se agrupaba por nombre en vez de por período.
caso('Tarifario: con sep-25 y abr-26, pedir jun-26 trae abr-26',
     'enmiendas-y-tarifarios §3.2 · f11eaff', () => {
  const cc = { tarifarios: [
    { name: 'TARIFARIO',              period: '2025-09' },
    { name: 'TARIFARIO FINAL (Enm.5)', period: '2026-04' },
    { name: 'TARIFARIO FINAL (Enm.9)', period: '2026-11' }, // posterior: NO debe salir
  ]};
  const r = getApplicableTariffs(cc, '2026-06');
  if (r.length !== 1) return `esperaba 1 tabla, dio ${r.length}`;
  return r[0].period === '2026-04' ? null : `esperaba la generación 2026-04, dio ${r[0].period}`;
});

caso('Tarifario: devuelve TODAS las tablas de la generación, no solo la primera',
     'enmiendas-y-tarifarios §3.1 · 5a15b0e', () => {
  const cc = { tarifarios: [
    { name: 'Mano de Obra', period: '2026-04' },
    { name: 'Equipos',      period: '2026-04' },  // mismo período = misma generación
    { name: 'TARIFARIO',    period: '2025-09' },
  ]};
  const r = getApplicableTariffs(cc, '2026-06');
  return r.length === 2 ? null : `esperaba 2 tablas de la generación 2026-04, dio ${r.length}`;
});

// ── 4. Plazo en meses, inclusivo ────────────────────────────────────────────
// Restar meses a mano da un mes corto. Todo el cálculo de AVE se apoya en esto.
caso('Plazo: ene-2026 → dic-2026 son 12 meses (inclusivo)',
     'polinomica-ko §4.8', () => {
  const m = monthDiffInclusive('2026-01-01', '2026-12-31');
  return m === 12 ? null : `esperaba 12, dio ${m} (¿resta de meses sin +1?)`;
});

// ── 5. Enmienda superseded excluida del cálculo ─────────────────────────────
// Una enmienda corregida sigue existiendo pero NO debe entrar a ningún cálculo,
// o el ajuste se cuenta dos veces.
caso('Superseded: una enmienda corregida no entra al cálculo de tarifa',
     'enmiendas-y-tarifarios §4.4', () => {
  const base = {
    plazo_meses: 10, montoBase: 1000, monto: 1000, aves: [],
    fechaIni: '2026-01-01', fechaFin: '2026-10-31',
  };
  const conVigente = { ...base, enmiendas: [
    { num: 1, tipos: ['ACTUALIZACION_TARIFAS'], nuevoPeriodo: '2026-03', pctPoli: 0.10 },
  ]};
  const conSuperseded = { ...base, enmiendas: [
    { num: 1, tipos: ['ACTUALIZACION_TARIFAS'], nuevoPeriodo: '2026-03', pctPoli: 0.10, superseded: true, supersededBy: 2 },
    { num: 2, tipos: ['ACTUALIZACION_TARIFAS'], nuevoPeriodo: '2026-03', pctPoli: 0.10 },
  ]};
  const a = getCurrentMonthlyRate(conVigente);
  const b = getCurrentMonthlyRate(conSuperseded);
  if (Math.abs(a - 110) > 0.001) return `tasa con 1 enmienda: esperaba 110, dio ${a}`;
  if (Math.abs(b - 110) > 0.001) {
    return `la superseded se está contando: esperaba 110, dio ${b.toFixed(2)}` +
           (Math.abs(b - 121) < 0.01 ? ' (= 1000/10 × 1.10 × 1.10 → doble conteo)' : '');
  }
  return null;
});

// ── 6. Incidencias: tienen que sumar 100% ───────────────────────────────────
// Desde H-13 esto BLOQUEA el guardado, no es solo un aviso visual.
caso('Incidencias: 60+30 no valida; 60+40 sí',
     'polinomica-ko §2 · H-13', () => {
  // Los campos p_n1..p_n5 no están en el HTML: los genera buildPoly(), que corre
  // dentro de initApp() después del login. Se construyen acá para poder testear.
  if (!document.getElementById('p_n1')) {
    if (typeof buildPoly !== 'function') return 'no existe buildPoly()';
    buildPoly();
  }
  const set = (vals) => {
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById('p_n' + i);
      if (!el) return 'no existe el campo p_n' + i + ' ni siquiera tras buildPoly()';
      el.value = vals[i - 1] != null ? String(vals[i - 1]) : '';
    }
    return null;
  };
  let err = set([60, 30]);          if (err) return err;
  if (calcP() !== false) return 'con 60+30 = 90% debería NO validar';
  err = set([60, 40]);              if (err) return err;
  if (calcP() !== true)  return 'con 60+40 = 100% debería validar';
  return null;
});

// ── runner ──────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox'],
    ...(EXEC_PATH ? { executablePath: EXEC_PATH } : {}),
  });
  const page = await (await browser.newContext()).newPage();

  console.log('→ ' + BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  try {
    await page.waitForFunction(() => typeof window.getTotal === 'function'
      && typeof window.computePoliDeltaPct === 'function', { timeout: 20000 });
  } catch (e) {
    console.error('✗ La app no expuso sus funciones — ¿falló la carga de src/js/?');
    await browser.close();
    process.exit(1);
  }

  console.log('');
  console.log('=== REGLAS DE NEGOCIO ===');
  let fallos = 0;
  for (const c of casos) {
    let r;
    try {
      r = await page.evaluate(src => {
        try { return eval('(' + src + ')')(); }
        catch (e) { return 'EXCEPCIÓN: ' + e.message; }
      }, c.fn.toString());
    } catch (e) { r = 'EXCEPCIÓN al evaluar: ' + e.message; }

    if (r === null || r === undefined) {
      console.log('  ✓ ' + c.nombre);
    } else {
      console.error('  ✗ ' + c.nombre);
      console.error('      → ' + r);
      console.error('      regla: ' + c.regla);
      fallos++;
    }
  }

  console.log('');
  console.log(fallos === 0
    ? `✓ ${casos.length}/${casos.length} reglas de negocio OK`
    : `✗ ${fallos} de ${casos.length} reglas de negocio FALLARON`);

  await browser.close();
  process.exit(fallos === 0 ? 0 : 1);
})().catch(err => {
  console.error('Error inesperado:', err && err.message);
  process.exit(1);
});
