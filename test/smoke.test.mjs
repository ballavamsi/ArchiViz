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
  // App logic may live in index.html directly OR in the extracted src/app.js
  const appJs = existsSync(rootFile('src/app.js'))
    ? readFileSync(rootFile('src/app.js'), 'utf8')
    : '';
  const appSource = html + appJs;

  const requiredIds = [
    'toolbar',
    'palette',
    'btn-sidebar-toggle',
    'canvas-wrap',
    'canvas-svg',
    'canvas-nodes',
    'props-panel',
    'btn-sim',
    'btn-export-pdf',
    'btn-export-svg',
    'btn-theme',
    'sim-speed-sel',
    'users-input',
    'suggestions',
    'cost-badge',
  ];

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `index.html missing #${id}`);
  }

  assert.match(html, /Archi-Flow/, 'app should use Archi-Flow branding');
  assert.match(appSource, /function diagramSvgString\(/, 'app should support diagram image export');
  assert.match(appSource, /foreignObject/, 'diagram image export should use live HTML node tiles');
  assert.match(appSource, /function exportPdfReport\(\)/, 'app should support PDF report export');
  assert.match(appSource, /Traffic & Cost Assumptions/, 'PDF export should include traffic and cost assumptions');
  assert.match(appSource, /Executive Summary/, 'PDF export should include an executive summary');
  assert.match(appSource, /Recommended actions/, 'PDF export should include recommended actions');
  assert.match(appSource, /Config \/ Cost Drivers/, 'PDF component table should expose cost-driving configuration instead of canvas size');
  assert.doesNotMatch(appSource, /<th style="min-width:70px">Size<\/th>/, 'PDF component table should not export canvas pixel size');
  assert.match(appSource, /function outgoingSplitDetails\(/, 'traffic split logic should expose explicit/remainder split calculation');
  assert.match(appSource, /100 - explicitTotal/, 'blank downstream edges should receive remaining split percentage');
  assert.match(appSource, /compactKeys/, 'PDF property values should compact large numeric values');
  assert.match(appSource, /Math\.abs\(value\) >= 1000/, 'PDF property values should compact all values from 1K upward');
  assert.match(appSource, /compactMoney\(value\)/, 'PDF money values should use compact K/M/B/T formatting');
  assert.match(appSource, /function setTheme\(theme\)/, 'app should support light and dark themes');
  assert.match(appSource, /prefers-color-scheme: light/, 'theme should default from the user system preference');
  assert.match(appSource, /transform:scale\(\$\{S\.zoom\}\)/, 'nodes should use transform scaling for zoom');
  assert.doesNotMatch(appSource, /width:\$\{n\.w \* S\.zoom\}px/, 'nodes should not resize width directly during zoom');
  assert.match(appSource, /node-tool-name/, 'node tiles should show the tool/component type');
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

test('netlify config publishes explicit build output', () => {
  const config = readFileSync(rootFile('netlify.toml'), 'utf8');
  assert.match(config, /publish\s*=\s*"dist"/, 'Netlify should publish dist/');
  assert.match(config, /npm test && npm run build/, 'Netlify build should run tests then build static output');
});

test('cloud diagram library has private API and UI hooks', () => {
  const html = readFileSync(rootFile('index.html'), 'utf8');
  const appJs = readFileSync(rootFile('src/app.js'), 'utf8');
  const server = readFileSync(rootFile('server.mjs'), 'utf8');
  const sql = readFileSync(rootFile('supabase-user-diagrams.sql'), 'utf8');

  for (const id of [
    'diagrams-storage-badge',
    'diagram-search',
    'btn-save-diagram',
    'btn-save-diagram-as',
    'btn-import-diagram-json',
    'btn-diagrams-signin',
    'btn-migrate-local',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `cloud library UI missing #${id}`);
  }

  assert.match(appJs, /cloudDiagramRequest/, 'frontend should call the private diagram API');
  assert.match(appJs, /Authorization.*Bearer/s, 'frontend should send Supabase bearer token');
  assert.match(appJs, /migrateLocalSavesToCloud/, 'frontend should move browser saves to cloud');
  assert.match(appJs, /currentDiagramId/, 'frontend should track the currently open cloud file');
  assert.match(html + appJs, /btn-signin-google/, 'guest users should have a Google sign-in recovery action');

  assert.match(server, /\/api\/diagrams/, 'server should expose private diagram routes');
  assert.match(server, /verifySupabaseUser/, 'server should validate Supabase users');
  assert.match(server, /user_id=eq\./, 'server should scope diagram queries to the signed-in user');
  assert.match(server, /Authentication required/, 'server should reject unauthenticated library requests');

  assert.match(sql, /create table if not exists public\.user_diagrams/, 'Supabase schema should create user_diagrams');
  assert.match(sql, /enable row level security/, 'Supabase schema should enable RLS');
  assert.match(sql, /auth\.uid\(\) = user_id/g, 'RLS policies should scope rows to the owner');
});

test('more menu and cockpit stay compact', () => {
  const appJs = readFileSync(rootFile('src/app.js'), 'utf8');
  const css = readFileSync(rootFile('src/app.css'), 'utf8');

  assert.match(appJs, /function organizeMoreMenu\(/, 'More menu should be organized into submenus');
  assert.match(appJs, /Import \/ Export/, 'More menu should group import/export actions');
  assert.match(appJs, /function toggleCockpitCompact\(/, 'Architecture cockpit should be collapsible');
  assert.match(appJs, /btn-cockpit-view/, 'View menu should expose an explicit cockpit view switch');
  assert.match(appJs, /Cockpit: Compact/, 'Cockpit switch should label compact mode');
  assert.match(appJs, /archviz\.cockpit/, 'Cockpit compact state should persist');
  assert.match(css, /#canvas-hud\.compact/, 'Compact cockpit should have dedicated styling');
  assert.match(css, /\.more-submenu/, 'More menu should support hover submenus');
});
