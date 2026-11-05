// Offline screenshots of the real UI. No Next server, environment file or database is loaded.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const babel = require('next/dist/compiled/babel/core');
const webpack = require('next/dist/compiled/webpack/webpack').webpack;

const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode', 'help-demo-'));
const writeImages = process.argv.includes('--write');
const output = writeImages ? path.join(root, 'public/assets/help') : scratch;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, content) => fs.writeFileSync(path.join(scratch, name), content);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function compile(name, source, plugins = []) {
  write(name, babel.transformSync(source, {
    filename: name, configFile: false, babelrc: false,
    presets: [[require('next/dist/compiled/babel/preset-react'), { runtime: 'automatic' }]],
    plugins,
  }).code);
}

function fixturePage(functionName, declarations, keepFrom) {
  return ({ types: t }) => ({ visitor: {
    ImportDeclaration(astPath) {
      const source = astPath.node.source.value;
      if (source.includes('supabase') || source === 'next/navigation' || source === './actions') astPath.remove();
    },
    FunctionDeclaration(astPath) {
      if (astPath.node.id?.name !== functionName) return;
      const statements = astPath.node.body.body;
      const start = keepFrom ? statements.findIndex((node) => node.type === 'VariableDeclaration'
        && node.declarations.some((declaration) => declaration.id.name === keepFrom))
        : statements.findIndex((node) => node.type === 'ReturnStatement');
      assert.ok(start >= 0, `Cannot isolate ${functionName} presentation`);
      astPath.node.async = false;
      astPath.node.params = [t.identifier('demo')];
      astPath.node.body = t.blockStatement([...babel.parseSync(declarations, { configFile: false, babelrc: false }).program.body, ...statements.slice(start)]);
    },
  } });
}

async function main() {
  console.log(`Scratch: ${scratch}`);
  assert.equal(typeof webpack, 'function');
  compile('new-order-form.js', read('app/pedidos/new-order-form.js'));
  compile('submit-order-button.js', read('app/pedidos/submit-order-button.js'));
  compile('orders.js', read('app/pedidos/page.js'), [fixturePage('OrdersPage', `
    const { profile, catalog, customers, orders, targetOrderId, message = '' } = demo;
    const canCreate = ['admin', 'representante'].includes(profile.role);
    const canManage = ['admin', 'pedidos'].includes(profile.role);
    const attachmentLinks = new Map();
    const error = null;
    const createOrder = async () => { throw new Error('Demo submission disabled'); };
    const advanceOrderStatus = async () => { throw new Error('Demo submission disabled'); };
  `)]);
  compile('shell.js', read('app/app-shell.js').replace("'./dashboard/actions'", "'./noop-actions.js'"));
  compile('help.js', read('app/ayuda/page.js'), [fixturePage('HelpPage', 'const { profile } = demo;', 'visibleGuides')]);
  write('help.module.css', 'export default ' + JSON.stringify(Object.fromEntries(
    [...read('app/ayuda/help.module.css').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((match) => [match[1], `help-${match[1]}`])
  )));
  compile('link.js', "export default function Link({children, ...props}) { return <a {...props}>{children}</a>; }");
  write('navigation.js', "export function usePathname() { return location.pathname.startsWith('/ayuda') ? '/ayuda' : '/pedidos'; }");
  write('noop-actions.js', "export function logout() { throw new Error('Demo logout disabled'); }");
  const helpCss = read('app/ayuda/help.module.css').replace(/\.([a-zA-Z][\w-]*)/g, '.help-$1');
  write('style.css', read('app/globals.css') + '\n' + helpCss);
  compile('entry.js', `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import Orders from './orders';
    import AppShell from './shell';
    import Help from './help';
    const role = new URLSearchParams(location.search).get('role') || (['/representante', '/mis-pedidos'].includes(location.pathname) ? 'representante' : 'pedidos');
    const profile = { role, active: true, full_name: 'Usuario Demo' };
    const catalog = { format: 'items', models: [{ id: 'demo-model', name: 'Aurora Demo', items: [{ id: 'demo-item', code: 'DEMO-2PL', description: 'Módulo 2 pl c/b izquierdo tela', categoryOption: 'Relax', sideOption: 'izquierda' }] }], fabrics: [{ id: 'demo-fabric', code: 'TEL-DEMO', name: 'Lino Arena Demo', type: 'T' }] };
    const customers = [{ id: 'demo-customer', client_code: 'DEMO-001', trade_name: 'Tienda Ejemplo Demo' }];
    const order = { id: 'demo-order', order_number: 1001, client_code: 'DEMO-001', client_name: 'Tienda Ejemplo Demo', order_date: '2026-10-22', created_at: '2026-10-22T10:00:00Z', model_name: 'Aurora Demo', fabric_code: 'TEL-DEMO', fabric_name: 'Lino Arena Demo', fabric_type: 'T', notes: 'Pedido ficticio para formación. Revisar orientación izquierda.', status: location.pathname === '/gestionado' ? 'gestionado' : 'pendiente', order_lines: [{ line_number: 1, catalog_item_code: 'DEMO-2PL', module_name: 'Módulo 2 pl c/b izquierdo tela', mechanism: 'Relax', side: 'izquierda', quantity: 2 }], order_attachments: [] };
    document.addEventListener('submit', (event) => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
    createRoot(document.getElementById('root')).render(<AppShell profile={profile}>{location.pathname.startsWith('/ayuda') ? <Help profile={profile}/> : <Orders profile={profile} catalog={catalog} customers={customers} orders={location.pathname === '/representante' ? [] : [order]} targetOrderId={location.pathname === '/representante' ? null : order.id} />}</AppShell>);
  `);
  await new Promise((resolve, reject) => webpack({
    mode: 'production', devtool: false, entry: path.join(scratch, 'entry.js'),
    output: { path: scratch, filename: 'bundle.js' }, optimization: { minimize: false },
    resolve: { modules: [path.join(root, 'node_modules')], extensions: ['.js', '.css'],
      alias: { 'next/link': path.join(scratch, 'link.js'), 'next/navigation': path.join(scratch, 'navigation.js') } },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));

  const diagramNames = ['sofa.png', 'sillon.png', 'pouff.png', 'mod-2-3-pl-con-brazo.png', 'mod-1-pl-terminal.png', 'mod-1-pl-sin-brazo.png', 'mod-1-pl-con-brazo.png', 'chaiselongue.png'];
  for (const name of diagramNames) fs.copyFileSync(path.join(root, 'public/assets', name), path.join(scratch, name));
  const imageNames = ['crear-pedido.png', 'resumen-pedido.png', 'mis-pedidos.png', 'revisar-pedido.png', 'pedido-gestionado.png'];
  const routes = new Set(['/representante', '/mis-pedidos', '/pedidos', '/gestionado', '/ayuda']);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; form-action 'none'");
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    if (routes.has(url.pathname)) {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
      return;
    }
    const name = path.basename(url.pathname);
    const file = ['/style.css', '/bundle.js'].includes(url.pathname) ? path.join(scratch, name)
      : diagramNames.some((asset) => url.pathname === `/assets/${asset}`) ? path.join(scratch, name)
      : imageNames.some((asset) => url.pathname === `/assets/help/${asset}`) ? path.join(output, name) : null;
    if (!file || !fs.existsSync(file)) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', name.endsWith('.png') ? 'image/png' : name.endsWith('.css') ? 'text/css' : 'text/javascript');
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browserDir = path.join(scratch, 'browser');
  const browser = spawn(process.env.HELP_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${browserDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--disable-extensions', '--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost', 'about:blank',
  ], { stdio: 'ignore', env: { SYSTEMROOT: process.env.SYSTEMROOT, WINDIR: process.env.WINDIR, TEMP: scratch, TMP: scratch } });
  let browserError;
  browser.on('error', (error) => { browserError = error; });
  let socket;
  try {
    for (let attempt = 0; attempt < 100 && !fs.existsSync(path.join(browserDir, 'DevToolsActivePort')); attempt++) {
      if (browserError) throw browserError;
      await pause(100);
    }
    const port = fs.readFileSync(path.join(browserDir, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const pending = new Map();
    const failures = [];
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const waiter = pending.get(message.id);
        if (!waiter) return;
        pending.delete(message.id);
        clearTimeout(waiter.timer);
        message.error ? waiter.reject(new Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.text);
      if (message.method === 'Fetch.requestPaused') {
        const { request, requestId } = message.params;
        const allowed = request.url.startsWith(origin + '/') && request.method === 'GET';
        if (!allowed) failures.push(`Blocked non-demo request: ${new URL(request.url).origin}`);
        send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', allowed ? { requestId } : { requestId, errorReason: 'BlockedByClient' }).catch((error) => failures.push(error.message));
      }
    });
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    }
    async function waitFor(expression) {
      for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await pause(100); }
      throw new Error(`DOM condition timed out: ${expression}`);
    }
    async function navigate(route) {
      await send('Page.navigate', { url: origin + route });
      await waitFor("document.querySelector('.app-nav') !== null");
      await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    }
    async function capture(name, destination = output) {
      await evaluate("document.fonts.ready");
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(destination, name), Buffer.from(data, 'base64'));
      console.log(`Captured: ${name}`);
    }
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });
    await navigate('/representante');
    await evaluate("document.querySelector('.orders-panel-disclosure').open = true; document.querySelector('[name=customerId]').value = 'demo-customer'; document.querySelector('[name=orderDate]').value = '2026-10-22'; document.querySelector('[name=notes]').value = 'Pedido ficticio para formación.'; document.querySelector('.order-catalog-details').open = true;");
    await evaluate("const input = document.querySelector('#fabric-search'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Lino'); input.dispatchEvent(new Event('input', {bubbles: true}));");
    await waitFor("document.querySelector('[role=option]') !== null");
    await evaluate("document.querySelector('.add-item-button').click()");
    await waitFor("document.querySelector('.cart-line') !== null");
    await evaluate("document.querySelector('[aria-label^=\"Añadir una unidad\"]').click(); document.querySelector('.order-catalog-details').open = false; window.scrollTo(0, 0)");
    await pause(400);
    await capture('crear-pedido.png');
    await evaluate("document.querySelector('[role=option]').click()");
    await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent === 'Ver resumen del pedido').click()");
    await waitFor("document.querySelector('[role=dialog]') !== null");
    await capture('resumen-pedido.png');
    await navigate('/mis-pedidos');
    await waitFor("document.querySelector('.order-row') !== null");
    await capture('mis-pedidos.png');
    await navigate('/pedidos');
    await waitFor("document.querySelector('.order-detail[open]') !== null");
    await capture('revisar-pedido.png');
    await navigate('/gestionado');
    await waitFor("document.querySelector('.status-gestionado') !== null");
    await capture('pedido-gestionado.png');

    for (const role of ['representante', 'pedidos', 'admin']) {
      await navigate(`/ayuda?role=${role}`);
      await waitFor("document.querySelector('h1')?.textContent.includes('ayudarte')");
      assert.equal(await evaluate("document.querySelectorAll('figure').length"), role === 'admin' ? 5 : role === 'representante' ? 3 : 2);
      for (const width of [1280, 390]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 1200, deviceScaleFactor: 1, mobile: width === 390 });
        await evaluate("document.querySelectorAll('img').forEach(image => image.loading = 'eager')");
        await waitFor("[...document.querySelectorAll('figure img')].every(image => image.complete && image.naturalWidth > 0)");
        assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), `${role} overflows at ${width}px`);
        if (role === 'admin') await capture(`help-preview-${width}.png`, scratch);
      }
      await evaluate("document.querySelector('.sidebar-collapse').click()");
      await waitFor("document.querySelector('.app-frame.is-collapsed') !== null");
      assert.equal(await evaluate("document.querySelector('a[href=\"/ayuda\"]').title"), 'Ayuda');
      await evaluate("document.querySelector('.sidebar-collapse').click()");
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });
    }
    assert.deepEqual(failures, [], 'Browser errors or non-demo requests');
    console.log('PASS: role content, screenshots, desktop/mobile widths, collapsed navigation, zero non-demo requests.');
    await send('Browser.close');
  } finally {
    socket?.close();
    if (browser.exitCode === null) browser.kill();
    await new Promise((resolve) => server.close(resolve));
    console.log(`Scratch retained for inspection: ${scratch}`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
