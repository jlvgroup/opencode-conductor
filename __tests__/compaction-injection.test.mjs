// @ts-check
// CONTRACT (f): compaction-context injection point exists.
// RED: ../src/plugin.js does not exist yet; only documented V2 hooks allowed.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const IMPL = '../../src/plugin.js';
const ALLOWED_HOOKS = new Set([
  'tool.execute.before',
  'tool.execute.after',
  'event',
  'experimental.session.compacting',
]);

describe('omo-v2 compaction injection (f)', () => {
  it('exposes experimental.session.compacting handler', async () => {
    const mod = await import(IMPL);
    const hooks = mod.getHookNames();
    assert.ok(
      hooks.includes('experimental.session.compacting'),
      'missing compaction hook',
    );
  });

  it('uses only documented V2 hooks', async () => {
    const mod = await import(IMPL);
    for (const h of mod.getHookNames()) {
      assert.ok(ALLOWED_HOOKS.has(h), `undocumented hook: ${h}`);
    }
  });
});
