const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const babel = require('next/dist/compiled/babel/core');

const root = path.resolve(__dirname, '..');
const link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);

function loadSource(relativePath, mocks = {}) {
  const filename = path.resolve(root, relativePath);
  const code = babel.transformSync(readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    presets: [[require('next/dist/compiled/babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [require('next/dist/compiled/babel/plugin-transform-modules-commonjs')],
  }).code;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (name.startsWith('.')) {
      return loadSource(path.relative(root, path.resolve(path.dirname(filename), name)), mocks);
    }
    if (['react', 'react/jsx-runtime', 'react-dom'].includes(name)) return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  };
  vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, {}, { filename })(localRequire, module, module.exports);
  return module.exports;
}

function helpPage(profile, authenticated = true, queryError = null) {
  const query = {
    select() { return this; },
    eq(column, value) { assert.equal(column, 'id'); assert.equal(value, 'test-user'); return this; },
    async single() { return { data: profile, error: queryError }; },
  };
  const supabase = {
    auth: { async getClaims() { return { data: { claims: authenticated ? { sub: 'test-user' } : null } }; } },
    from(table) { assert.equal(table, 'profiles'); return query; },
  };
  return loadSource('app/ayuda/page.js', {
    '../../lib/supabase/server': { createClient: async () => supabase },
    'next/navigation': { redirect: (url) => { throw new Error(`redirect:${url}`); } },
    'next/link': link,
  }).default;
}

test('Help denies anonymous, missing, inactive, unsupported and failed profiles', async () => {
  await assert.rejects(helpPage(null, false)(), /redirect:\/login\?next=%2Fayuda/);
  for (const profile of [null, { role: 'pedidos', active: false }]) {
    await assert.rejects(helpPage(profile)(), /redirect:\/login\?error=/);
  }
  await assert.rejects(helpPage({ role: 'unknown', active: true })(), /redirect:\/dashboard/);
  await assert.rejects(helpPage({ role: 'admin', active: true }, true, new Error('offline'))(), /redirect:\/login\?error=/);
});

test('Representative sees creation and tracking instructions, not management instructions', async () => {
  const html = renderToStaticMarkup(await helpPage({ role: 'representante', active: true })());
  assert.match(html, /Crear y enviar un pedido/);
  assert.match(html, /Consultar mis pedidos/);
  assert.doesNotMatch(html, /Revisar y gestionar un pedido/);
  assert.match(html, /datos ficticios/);
  assert.match(html, /href="\/pedidos"/);
});

test('Orders staff sees review guidance, not creation guidance', async () => {
  const html = renderToStaticMarkup(await helpPage({ role: 'pedidos', active: true })());
  assert.match(html, /Revisar y gestionar un pedido/);
  assert.match(html, /Marcar como gestionado/);
  assert.match(html, /no tiene botón de deshacer/);
  assert.doesNotMatch(html, /Crear y enviar un pedido/);
});

test('Administrator can consult both guides; illustrations have accessible descriptions', async () => {
  const html = renderToStaticMarkup(await helpPage({ role: 'admin', active: true })());
  assert.match(html, /Crear y enviar un pedido/);
  assert.match(html, /Revisar y gestionar un pedido/);
  const images = [...html.matchAll(/<img\b[^>]+>/g)].map(([tag]) => tag);
  assert.equal(images.length, 5);
  for (const image of images) {
    assert.match(image, /alt="[^"]+"/);
    assert.match(image, /src="\/assets\/help\//);
    assert.match(image, /width="/);
    assert.match(image, /height="/);
    const imagePath = image.match(/src="([^"]+)"/)[1];
    const png = readFileSync(path.join(root, 'public', imagePath));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 1280);
    assert.equal(png.readUInt32BE(20), 1200);
  }
  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${anchor}"`));
});

test('Navigation preserves previous destinations and adds active Help for each role', () => {
  const AppShell = loadSource('app/app-shell.js', {
    'next/link': link,
    'next/navigation': { usePathname: () => '/ayuda' },
    './dashboard/actions': { logout() {} },
  }).default;
  for (const role of ['representante', 'pedidos', 'admin']) {
    const html = renderToStaticMarkup(React.createElement(AppShell, { profile: { role, full_name: 'Demo' } }, 'Content'));
    const destinations = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(destinations, role === 'admin'
      ? ['/dashboard', '/pedidos', '/catalog', '/usuarios', '/ayuda']
      : ['/dashboard', '/pedidos', '/ayuda']);
    assert.match(html, /<a\b(?=[^>]*href="\/ayuda")(?=[^>]*class="app-nav-link active")[^>]*>/);
    assert.match(html, /Cerrar sesión/);
    assert.match(html, /Contraer menú/);
  }
});

test('Existing navigation active states remain unchanged for each role', () => {
  for (const pathname of ['/dashboard', '/pedidos', '/catalog', '/usuarios']) {
    const AppShell = loadSource('app/app-shell.js', {
      'next/link': link,
      'next/navigation': { usePathname: () => pathname },
      './dashboard/actions': { logout() {} },
    }).default;
    for (const role of ['representante', 'pedidos', 'admin']) {
      const html = renderToStaticMarkup(React.createElement(AppShell, { profile: { role, full_name: 'Demo' } }, 'Content'));
      const activeLinks = [...html.matchAll(/<a\b(?=[^>]*class="app-nav-link active")[^>]*href="([^"]+)"[^>]*>/g)].map((match) => match[1]);
      assert.deepEqual(activeLinks, role === 'admin' || ['/dashboard', '/pedidos'].includes(pathname) ? [pathname] : []);
      assert.match(html, /Cerrar sesión/);
    }
  }
});

test('Task links and screenshots are limited to the current role', async () => {
  for (const [role, count] of [['representante', 3], ['pedidos', 2], ['admin', 5]]) {
    const html = renderToStaticMarkup(await helpPage({ role, active: true })());
    const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    assert.equal(anchors.length, count);
    assert.equal([...html.matchAll(/<img\b/g)].length, count);
    assert.ok(anchors.every((id) => html.includes(`id="${id}"`)));
  }
});
