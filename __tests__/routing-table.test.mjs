// @ts-check
// CONTRACT (a): V1 -> V2 8-agent routing table.
// RED: ../src/routing.js does not exist yet (no implementation per task).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** @typedef {{ agent: string, model: string|null, mode: string|null }} RouteRow */

const here = dirname(fileURLToPath(import.meta.url));
/** @type {RouteRow[]} */
const expected = JSON.parse(
  readFileSync(join(here, 'fixtures', 'agents.v1.sanitized.json'), 'utf8'),
);

const IMPL = '../../src/routing.js';

describe('opencode-conductor routing table (a)', () => {
  it('fixture lists every required agent (sanitized, no secrets)', () => {
    const names = expected.map((r) => r.agent).sort();
    for (const n of [
      'cxm-agent',
      'explore',
      'general',
      'junior',
      'lead',
      'librarian',
      'looker',
      'oracle',
      'plan',
    ]) {
      assert.ok(names.includes(n), `fixture missing agent: ${n}`);
    }
    const raw = JSON.stringify(expected);
    assert.ok(!/sk-|api[_-]?key|token|secret|pat/i.test(raw), 'fixture leaks secret-like text');
  });

  it('resolves junior -> zai/glm-5.3', async () => {
    const mod = await import(IMPL);
    assert.equal(mod.resolveAgent('junior').model, 'zai/glm-5.3');
  });

  it('resolves oracle -> openai/gpt-5.5#high', async () => {
    const mod = await import(IMPL);
    assert.deepEqual(mod.resolveAgent('oracle'), { model: 'openai/gpt-5.5', mode: 'high' });
  });

  it('resolves librarian -> minimax-coding-plan/M3', async () => {
    const mod = await import(IMPL);
    assert.equal(mod.resolveAgent('librarian').model, 'minimax-coding-plan/M3');
  });

  it('resolves explore -> zai/glm-5', async () => {
    const mod = await import(IMPL);
    assert.equal(mod.resolveAgent('explore').model, 'zai/glm-5');
  });

  it('resolves looker -> openai/gpt-5.6-sol#low', async () => {
    const mod = await import(IMPL);
    assert.deepEqual(mod.resolveAgent('looker'), { model: 'openai/gpt-5.6-sol', mode: 'low' });
  });

  it('resolves cxm-agent -> claude-minimax/M3', async () => {
    const mod = await import(IMPL);
    assert.equal(mod.resolveAgent('cxm-agent').model, 'claude-minimax/M3');
  });

  it('resolves plan -> openai/gpt-5.5#high', async () => {
    const mod = await import(IMPL);
    assert.deepEqual(mod.resolveAgent('plan'), { model: 'openai/gpt-5.5', mode: 'high' });
  });

  it('resolves general -> M2.7', async () => {
    const mod = await import(IMPL);
    assert.ok(String(mod.resolveAgent('general').model).includes('M2.7'));
  });

  it('lead stays unpinned (null model/mode)', async () => {
    const mod = await import(IMPL);
    assert.deepEqual(mod.resolveAgent('lead'), { model: null, mode: null });
  });
});
