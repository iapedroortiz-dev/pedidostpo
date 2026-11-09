const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const babel = require('next/dist/compiled/babel/core');

function loadComponent(filename) {
  const code = babel.transformSync(readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    presets: [[require('next/dist/compiled/babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [require('next/dist/compiled/babel/plugin-transform-modules-commonjs')],
  }).code;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name.startsWith('.')) {
      return loadComponent(path.resolve(path.dirname(filename), `${name}.js`));
    }
    if (['react', 'react/jsx-runtime', 'react-dom'].includes(name)) return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  };
  vm.runInNewContext(`(function(require, module, exports) { ${code}\n})`, {}, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const NewOrderForm = loadComponent(path.resolve(__dirname, '../app/pedidos/new-order-form.js')).default;

test('Order form renders a function action without transport attribute warnings', (t) => {
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args.join(' ')));

  const html = renderToStaticMarkup(React.createElement(NewOrderForm, {
    models: [], fabrics: [], customers: [], catalogFormat: 'items',
    action: async () => {},
  }));

  assert.deepEqual(errors, []);
  for (const name of ['customerId', 'orderDate', 'catalogModelId', 'modelFabricAssignments', 'notes', 'lines']) {
    assert.ok(html.includes(`name="${name}"`), `Missing order field: ${name}`);
  }
  assert.match(html, /<input[^>]*type="file"[^>]*name="attachment"/);
  assert.match(html, /accept="application\/pdf,image\/jpeg,image\/png,\.pdf,\.jpg,\.jpeg,\.png"/);
});
