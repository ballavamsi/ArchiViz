import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

import { COMPONENT_DEFS, CATEGORIES } from '../src/components.js';
import { EXAMPLES } from '../src/examples.js';
import { ARCH_RULES, validateConnection } from '../src/rules.js';

const rootFile = (name) => new URL(`../${name}`, import.meta.url);
const componentIds = new Set(COMPONENT_DEFS.map((c) => c.id));

test('component definitions are unique and renderable', () => {
  assert.equal(COMPONENT_DEFS.length, componentIds.size, 'component ids must be unique');

  for (const component of COMPONENT_DEFS) {
    assert.ok(component.id, 'component requires id');
    assert.ok(component.name, `${component.id} requires name`);
    assert.ok(component.category, `${component.id} requires category`);
    assert.ok(component.defaults?.label, `${component.id} requires default label`);
    assert.match(component.icon, /^<svg\b/, `${component.id} icon should be inline SVG`);
    assert.ok(Array.isArray(component.properties), `${component.id} requires properties array`);
  }
});

test('categories reference valid component categories and SVG icons', () => {
  const categoryIds = new Set(CATEGORIES.map((c) => c.id));
  assert.ok(categoryIds.has('all'), 'categories should include all');

  for (const category of CATEGORIES) {
    assert.ok(category.label, `${category.id} requires label`);
    assert.match(category.icon, /^<svg\b|^Aa$|^◈$/, `${category.id} icon should be renderable`);
  }

  for (const component of COMPONENT_DEFS) {
    assert.ok(categoryIds.has(component.category), `${component.id} uses unknown category ${component.category}`);
  }
});

test('connection rules only reference known components', () => {
  for (const [source, targets] of Object.entries(ARCH_RULES)) {
    assert.ok(componentIds.has(source), `rule source ${source} must be a component`);
    for (const target of targets) {
      assert.ok(componentIds.has(target), `rule target ${source} -> ${target} must be a component`);
    }
  }

  assert.equal(validateConnection('loadbalancer', 'database').ok, true);
  assert.equal(validateConnection('users', 'database').ok, false);
  assert.equal(validateConnection('appserver', 'autoscaler').ok, true);
});

test('examples reference valid nodes and edges', () => {
  assert.ok(EXAMPLES.length >= 7, 'expected at least seven bundled examples');

  for (const example of EXAMPLES) {
    assert.ok(example.id, 'example requires id');
    assert.ok(example.name, `${example.id} requires name`);
    assert.ok(example.nodes.length > 0, `${example.id} requires nodes`);

    const nodeIds = new Set(example.nodes.map((n) => n.id));
    assert.equal(nodeIds.size, example.nodes.length, `${example.id} node ids must be unique`);

    for (const node of example.nodes) {
      const defId = node.data?.defId || node.type;
      assert.ok(componentIds.has(defId), `${example.id}/${node.id} uses unknown component ${defId}`);
      assert.ok(Number.isFinite(node.position?.x), `${example.id}/${node.id} requires x position`);
      assert.ok(Number.isFinite(node.position?.y), `${example.id}/${node.id} requires y position`);
    }

    for (const edge of example.edges) {
      assert.ok(nodeIds.has(edge.source), `${example.id}/${edge.id} source missing`);
      assert.ok(nodeIds.has(edge.target), `${example.id}/${edge.id} target missing`);
    }
  }
});

test('index.html contains required app hooks', () => {
  const html = readFileSync(rootFile('index.html'), 'utf8');
  const requiredIds = [
    'toolbar',
    'palette',
    'btn-sidebar-toggle',
    'canvas-wrap',
    'canvas-svg',
    'canvas-nodes',
    'props-panel',
    'btn-sim',
    'sim-speed-sel',
    'users-input',
    'suggestions',
    'cost-badge',
  ];

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `index.html missing #${id}`);
  }

  assert.match(html, /transform:scale\(\$\{S\.zoom\}\)/, 'nodes should use transform scaling for zoom');
  assert.doesNotMatch(html, /width:\$\{n\.w \* S\.zoom\}px/, 'nodes should not resize width directly during zoom');
});

test('run scripts exist for macOS/Linux and Windows', () => {
  assert.ok(existsSync(rootFile('run.sh')), 'run.sh must exist');
  assert.ok(existsSync(rootFile('run.bat')), 'run.bat must exist');
  assert.ok(statSync(rootFile('run.sh')).mode & 0o111, 'run.sh should be executable');

  const sh = readFileSync(rootFile('run.sh'), 'utf8');
  const bat = readFileSync(rootFile('run.bat'), 'utf8');
  assert.match(sh, /^#!\/bin\/bash/, 'run.sh needs bash shebang');
  assert.match(sh, /node server\.mjs/, 'run.sh should start server.mjs');
  assert.match(bat, /node server\.mjs/i, 'run.bat should start server.mjs');
});
