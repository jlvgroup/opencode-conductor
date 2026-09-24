// @ts-check
// CONTRACT (g): push/merge approval wall invariant.
// RED: ../src/approval.js does not exist yet.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const IMPL = '../../src/approval.js';

describe('omo-v2 approval wall (g)', () => {
  it('blocks push without explicit approval', async () => {
    const mod = await import(IMPL);
    assert.equal(mod.isPushAllowed({ approved: false }), false);
  });

  it('blocks merge without explicit approval', async () => {
    const mod = await import(IMPL);
    assert.equal(mod.isMergeAllowed({ approved: false }), false);
  });

  it('allows push/merge only after explicit go', async () => {
    const mod = await import(IMPL);
    assert.equal(mod.isPushAllowed({ approved: true }), true);
    assert.equal(mod.isMergeAllowed({ approved: true }), true);
  });
});
