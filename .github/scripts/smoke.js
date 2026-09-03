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
//   4. Ninguna respuesta HTTP >=400 fuera de las declaradas en HTTP_TOLERADOS,
//      cada una con su motivo. El navegador loguea "Failed to load resource"
//      sin decir cuál: acá se registra método, status y URL.
//
// Sin credenciales (secrets ausentes) hace 1 y 2 y avisa que salteó 3, en vez
// de fallar por una causa que no es del código.

const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/';
const USER = process.env.ADMIN_USER || '';
const PASS = process.env.ADMIN_PASSWORD || '';
const EXEC_PATH = process.env.CHROMIUM_PATH || undefined; // solo para correr local

// Módulos vivos en v2 tras el recorte de v3-it-handoff (81fe665). Dashboard,
// Forecast, Alertas, Timeline, Licitaciones y Proveedores ya no existen: el
// test anterior seguía clickeándolos.
const MODULOS = [
  { nombre: 'Contratos',       mod: 'list'  },
  { nombre: 'Nuevo Contrato',  mod: 'form'  },
  { nombre: 'Purchase Orders', mod: 'me2n'  },
  { nombre: 'Indices',         mod: 'idx'   },
];

// Respuestas HTTP >=400 que la app produce A PROPÓSITO y absorbe. Cada una
// necesita motivo: si no está acá, un 4xx/5xx pone el build en rojo.
const HTTP_TOLERADOS = [
  {
    patron: /\/rest\/v1\/contratistas\?[^ ]*vendor_num/,
    motivo: 'loadProv() sondea el esquema de columnas tipadas (02-supabase-auth.js:292) ' +
            'y cae al select=id,datos si la tabla no lo tiene',
  },
];

// La URL va al log público del workflow. El anon key viaja en headers, no en el
// query string, pero por las dudas se tacha cualquier parámetro con pinta de
// credencial y se recorta el largo.
const urlSegura = (u) => String(u)
  .replace(/([?&](apikey|api_key|token|access_token|key)=)[^&]*/gi, '$1***')
  .slice(0, 300);

const esTolerado = (u) => HTTP_TOLERADOS.find(t => t.patron.test(u)) || null;

const fail = (msg) => { console.error('✗ ' + msg); process.exitCode = 1; };

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox'],
    ...(EXEC_PATH ? { executablePath: EXEC_PATH } : {}),
  });
  const page = await (await browser.newContext()).newPage();

  const globalErrors = [];
  page.on('pageerror', err => globalErrors.push(err.message));

  // Toda respuesta >=400, con su URL. El mensaje de consola del navegador
  // ("Failed to load resource: status 400") no dice CUÁL falló; esto sí.
  const httpFails = [];
  page.on('response', res => {
    const st = res.status();
    if (st >= 400) httpFails.push({ st, url: res.url(), method: res.request().method() });
  });

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
    // Lo que falló durante la carga y el login queda fuera del loop: se reporta
    // aparte para que no se lo coma el primer módulo ni se pierda.
    const httpPrevios = httpFails.slice();
    const resultados = [];
    for (const m of MODULOS) {
      const errs = [], cons = [];
      const httpDesde = httpFails.length;
      const onErr = e => errs.push(e.message);
      // "Failed to load resource" se descarta: el listener de respuestas ya
      // registra ese mismo fallo, pero con método, status y URL.
      const onCon = msg => {
        if (msg.type() !== 'error') return;
        if (/Failed to load resource/i.test(msg.text())) return;
        cons.push(msg.text());
      };
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
      resultados.push({ nombre: m.nombre, errs, cons, http: httpFails.slice(httpDesde) });
    }

    console.log('');
    console.log('=== REPORTE ===');
    let total = 0;
    for (const h of httpPrevios) {
      const t = esTolerado(h.url);
      const linea = 'carga/login — HTTP ' + h.st + ': ' + h.method + ' ' + urlSegura(h.url);
      if (t) { console.log('  ⚠ ' + linea + ' (tolerado)'); console.log('      motivo: ' + t.motivo); }
      else   { console.error('  ✗ ' + linea); total++; }
    }
    for (const r of resultados) {
      const inesperados = r.http.filter(h => !esTolerado(h.url));
      const tolerados   = r.http.filter(h =>  esTolerado(h.url));
      const n = r.errs.length + r.cons.length + inesperados.length;
      total += n;
      if (!n) console.log('✓ ' + r.nombre + ': sin errores');
      else {
        console.error('✗ ' + r.nombre + ': ' + n + ' error(es)');
        r.errs.forEach(e => console.error('    [JS] ' + e));
        r.cons.forEach(e => console.error('    [console] ' + e));
        inesperados.forEach(h =>
          console.error('    [HTTP ' + h.st + '] ' + h.method + ' ' + urlSegura(h.url)));
      }
      tolerados.forEach(h => {
        console.log('  ⚠ ' + r.nombre + ' — HTTP ' + h.st + ' tolerado: ' +
                    h.method + ' ' + urlSegura(h.url));
        console.log('      motivo: ' + esTolerado(h.url).motivo);
      });
    }
    if (total) fail(total + ' error(es) durante la navegación.');
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
