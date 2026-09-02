// Smoke test de Contratos TA v2.
//
// Corre contra BASE_URL, que el workflow apunta al servidor local que sirve
// ESTE commit. Antes el test navegaba a la producción de otro repo, así que su
// resultado no decía nada del código que se estaba pusheando.
//
// Lo que verifica:
//   1. La app carga sin errores de JS.
//   2. Los módulos que el test declara EXISTEN en el index.html — si alguien
//      recorta un módulo, el test falla en vez de clickear un fantasma.
//   3. Con credenciales: login y navegación por cada módulo sin errores.
//
// Sin credenciales (secrets ausentes) hace 1 y 2 y avisa que salteó 3, en vez
// de fallar por una causa que no es del código.

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';
const USER = process.env.ADMIN_USER || '';
const PASS = process.env.ADMIN_PASSWORD || '';

// Módulos vivos en v2 tras el recorte de v3-it-handoff (81fe665). Dashboard,
// Forecast, Alertas, Timeline, Licitaciones y Proveedores ya no existen: el
// test anterior seguía clickeándolos.
const MODULOS = [
  { nombre: 'Contratos',       mod: 'list'  },
  { nombre: 'Nuevo Contrato',  mod: 'form'  },
  { nombre: 'Purchase Orders', mod: 'me2n'  },
  { nombre: 'Indices',         mod: 'idx'   },
];

const fail = (msg) => { console.error('✗ ' + msg); process.exitCode = 1; };

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext()).newPage();

  const globalErrors = [];
  page.on('pageerror', err => globalErrors.push(err.message));

  // ── 1. Cargar ──────────────────────────────────────────────────────────
  console.log('→ Abriendo ' + BASE_URL);
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('  networkidle timeout, continuando...');
  }

  const titulo = await page.title();
  if (!titulo) { fail('la página no cargó (sin <title>)'); await browser.close(); return; }
  console.log('✓ App cargada — ' + titulo);

  // ── 2. Los módulos declarados tienen que existir en el DOM ─────────────
  // Esta es la verificación que faltaba: el test viejo clickeaba dashboard y
  // prov, que no existen en v2, y lo reportaba como error de navegación en vez
  // de como "el test está desactualizado".
  console.log('');
  console.log('=== Verificando que los módulos declarados existan ===');
  let faltantes = 0;
  for (const m of MODULOS) {
    const existe = await page.evaluate(
      sel => !!document.querySelector(sel), `[data-mod='${m.mod}']`
    );
    if (existe) {
      console.log("  ✓ " + m.nombre + " (data-mod='" + m.mod + "')");
    } else {
      console.error("  ✗ " + m.nombre + ": no hay ningún [data-mod='" + m.mod + "'] en index.html");
      faltantes++;
    }
  }
  if (faltantes) {
    fail(faltantes + ' módulo(s) declarado(s) en este test no existen en la app. ' +
         'Actualizá MODULOS en .github/scripts/smoke.js.');
    await browser.close();
    return;
  }

  // ── 3. Login + navegación (solo con credenciales) ──────────────────────
  if (!USER || !PASS) {
    console.log('');
    console.log('⚠ Sin ADMIN_USER/ADMIN_PASSWORD: se saltea login y navegación.');
    console.log('  Cargá los secrets en el repo para que el test cubra los módulos.');
  } else {
    console.log('');
    console.log('=== Login ===');
    try {
      await page.waitForSelector('#lgUser', { timeout: 20000 });
    } catch (e) {
      fail('LOGIN: #lgUser no apareció en 20s');
      await page.screenshot({ path: 'screenshot-login-fallo.png' });
      await browser.close();
      return;
    }
    await page.fill('#lgUser', USER);
    await page.fill('#lgPass', PASS);
    await page.click('button:has-text("Ingresar")');

    try {
      await page.waitForFunction(() => {
        const o = document.getElementById('loginOverlay');
        return !o || o.style.display === 'none' || o.classList.contains('hidden')
               || getComputedStyle(o).display === 'none';
      }, { timeout: 20000 });
    } catch (e) {
      fail('LOGIN: loginOverlay no desapareció en 20s');
      await page.screenshot({ path: 'screenshot-login-fallo.png' });
      await browser.close();
      return;
    }
    if (!await page.evaluate(() => !!document.getElementById('vList'))) {
      fail('LOGIN: no se encontró #vList después de entrar');
      await page.screenshot({ path: 'screenshot-login-fallo.png' });
      await browser.close();
      return;
    }
    console.log('✓ Login exitoso');

    console.log('');
    console.log('=== Navegación por módulos ===');
    const resultados = [];
    for (const m of MODULOS) {
      const errs = [], cons = [];
      const onErr = e => errs.push(e.message);
      const onCon = msg => { if (msg.type() === 'error') cons.push(msg.text()); };
      page.on('pageerror', onErr);
      page.on('console', onCon);
      try {
        await page.click(`[data-mod='${m.mod}']`, { timeout: 8000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshot-' + m.mod + '.png' });
      } catch (e) {
        errs.push('Error al navegar: ' + e.message);
        try { await page.screenshot({ path: 'screenshot-' + m.mod + '-error.png' }); } catch (_) {}
      }
      page.removeListener('pageerror', onErr);
      page.removeListener('console', onCon);
      resultados.push({ nombre: m.nombre, errs, cons });
    }

    console.log('');
    console.log('=== REPORTE ===');
    let total = 0;
    for (const r of resultados) {
      const n = r.errs.length + r.cons.length;
      total += n;
      if (!n) console.log('✓ ' + r.nombre + ': sin errores');
      else {
        console.error('✗ ' + r.nombre + ': ' + n + ' error(es)');
        r.errs.forEach(e => console.error('    [JS] ' + e));
        r.cons.forEach(e => console.error('    [console] ' + e));
      }
    }
    if (total) fail(total + ' error(es) JS durante la navegación.');
  }

  if (globalErrors.length) {
    console.error('✗ Errores globales: ' + globalErrors.length);
    globalErrors.forEach(e => console.error('    ' + e));
    fail('hubo errores JS globales.');
  }

  await browser.close();
  if (!process.exitCode) console.log('\n✓ Todo OK.');
})().catch(err => {
  console.error('Error inesperado en el test:', err && err.message);
  process.exit(1);
});
