// @ts-check
// PERFORMANCE contract (h): justify opencode-conductor overhead with numbers.
// Measures routing, delegation, boulder migration, and compaction injection.
// Thresholds are generous (correctness + order-of-magnitude proof, not tuning).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolveAgent, listAgents } from '../src/routing.js';
import { buildDelegationRequest } from '../src/delegation.js';
import { migrateDocuments } from '../src/boulder.js';
import plugin, { getHookNames, hooks } from '../src/plugin.js';

/** @param {number} ms */
function fmt(ms) {
  return `${ms.toFixed(2)}ms`;
}

test('perf: agent routing resolves 10k lookups fast', () => {
  const agents = listAgents();
  const N = 10_000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) resolveAgent(agents[i % agents.length]);
  const total = performance.now() - t0;
  console.log(`  routing: ${N} lookups in ${fmt(total)} (${fmt(total / N)}/op)`);
  assert.ok(total < 1000, `routing too slow: ${fmt(total)}`);
});

test('perf: delegation request build is negligible', () => {
  const N = 10_000;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    buildDelegationRequest({ agent: 'oracle', task: `task-${i}` });
  }
  const total = performance.now() - t0;
  console.log(`  delegation: ${N} builds in ${fmt(total)} (${fmt(total / N)}/op)`);
  assert.ok(total < 1000, `delegation too slow: ${fmt(total)}`);
});

test('perf: boulder migration handles the full Mac corpus', () => {
  const dir = new URL('../../../.omo/run-continuation/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const raws = files.map((f) => ({ name: f, raw: readFileSync(new URL(f, dir), 'utf8') }));
  const boulderRaw = readFileSync(
    new URL('../../../.omo/boulder.json', import.meta.url),
    'utf8',
  );
  const t0 = performance.now();
  const result = migrateDocuments([{ name: 'boulder.json', raw: boulderRaw }, ...raws]);
  const total = performance.now() - t0;
  const migrated = result.report.filter((r) => r.status === 'migrated').length;
  console.log(
    `  boulder: ${raws.length + 1} docs (${migrated} migrated) in ${fmt(total)} (${fmt(total / (raws.length + 1))}/doc)`,
  );
  assert.ok(migrated > 0, 'expected migrated entries');
  assert.ok(total < 2000, `migration too slow: ${fmt(total)}`);
});

test('perf: compaction hook injects continuation inline', async () => {
  const hook =
    hooks[/** @type {keyof typeof hooks} */ ('experimental.session.compacting')];
  assert.equal(typeof hook, 'function');
  assert.deepEqual(getHookNames().sort(), [
    'event',
    'experimental.session.compacting',
    'tool.execute.after',
    'tool.execute.before',
  ]);
  const t0 = performance.now();
  const out = await hook({ runState: { kind: 'missing' } });
  const total = performance.now() - t0;
  console.log(`  compaction (shimmed input): ${fmt(total)} -> ${JSON.stringify(out)}`);
  assert.equal(out, undefined);
  assert.ok(total < 100, `compaction hook too slow: ${fmt(total)}`);
});
