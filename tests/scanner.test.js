'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanFolder } = require('../electron/scanner');

let root;

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-scan-'));
  const mk = (rel, content) => {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  };
  mk(
    'package.json',
    JSON.stringify({
      name: 'rajis',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { react: '^18', three: '^0.160', firebase: '^10' },
      devDependencies: { vite: '^5' },
    })
  );
  mk('package-lock.json', '{}');
  mk('README.md', '# RAJIS\n\nA browser 3D missile interception game.\n');
  mk('src/App.jsx', 'export default function App(){}');
  mk('src/firebase.js', 'export const db = {}');
  mk('src/components/Locker.jsx', 'export function Locker(){}');
  mk('src/data/weaponCamos.json', '[]');
  mk('src/App.test.jsx', 'test("x", () => {})');
  mk('logo.png', 'binarydata');
  mk('bun.lock', 'lock');
  mk('.parcel-cache/bundle.js', 'cached');
  fs.mkdirSync(path.join(root, 'node_modules', 'react'), { recursive: true });
  fs.writeFileSync(path.join(root, 'node_modules', 'react', 'index.js'), 'module.exports={}');
});

after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

test('detects framework, language, package manager', () => {
  const r = scanFolder(root);
  assert.strictEqual(r.summary.framework, 'React');
  assert.strictEqual(r.summary.packageManager, 'npm');
  assert.ok(r.summary.dependencies.includes('three'));
  assert.deepStrictEqual(r.summary.scripts, { dev: 'vite', build: 'vite build' });
});

test('ignores node_modules and media files', () => {
  const r = scanFolder(root);
  assert.ok(!r.files.some((f) => f.includes('node_modules')), 'node_modules excluded');
  assert.ok(!r.files.some((f) => f.includes('.parcel-cache')), 'parcel cache excluded');
  assert.ok(!r.files.some((f) => f.endsWith('.png')), 'media excluded');
  assert.ok(!r.files.includes('bun.lock'), 'bun lock excluded');
});

test('classifies components, db files, data files, tests, entry files', () => {
  const r = scanFolder(root);
  assert.ok(r.summary.components.includes('src/components/Locker.jsx'));
  assert.ok(r.summary.dbFiles.includes('src/firebase.js'));
  assert.ok(r.summary.dataFiles.includes('src/data/weaponCamos.json'));
  assert.ok(r.summary.tests.includes('src/App.test.jsx'));
  assert.ok(r.summary.entryFiles.includes('src/App.jsx'));
});

test('summarizes README description', () => {
  const r = scanFolder(root);
  assert.match(r.readme.description, /missile interception/i);
});

test('builds a nested tree with src as a directory node', () => {
  const r = scanFolder(root);
  const src = r.tree.find((n) => n.name === 'src' && n.type === 'dir');
  assert.ok(src, 'src dir present');
  assert.ok(Array.isArray(src.children) && src.children.length > 0);
});

test('throws on missing folder', () => {
  assert.throws(() => scanFolder(path.join(root, 'nope')), /Folder not found/);
});
