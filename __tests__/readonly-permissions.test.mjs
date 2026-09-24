// @ts-check
// CONTRACT (b): read-only agents deny edit/write.
// RED: ../src/permissions.js does not exist yet.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const IMPL = '../../src/permissions.js';
const READONLY = ['oracle', 'librarian', 'explore', 'looker', 'plan'];
const DENIED_TOOLS = ['edit', 'write'];

describe('opencode-conductor read-only agents (b)', () => {
  for (const agent of READONLY) {
    for (const tool of DENIED_TOOLS) {
      it(`denies ${tool} for ${agent}`, async () => {
        const mod = await import(IMPL);
        assert.equal(
          mod.canUseTool(agent, tool),
          false,
          `${agent} must deny ${tool}`,
        );
      });
    }
  }

  it('junior keeps edit/write (non-readonly control)', async () => {
    const mod = await import(IMPL);
    assert.equal(mod.canUseTool('junior', 'edit'), true);
    assert.equal(mod.canUseTool('junior', 'write'), true);
  });
});
