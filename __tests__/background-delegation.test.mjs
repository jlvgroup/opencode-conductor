// @ts-check
// CONTRACT (c): background delegation request shape.
// RED: ../src/delegation.js does not exist yet.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** @typedef {{ subagent: boolean, background: boolean, sessionID?: string, agent: string }} DelegationRequest */

const IMPL = '../../src/delegation.js';

describe('opencode-conductor background delegation (c)', () => {
  it('builds subagent request with background:true', async () => {
    const mod = await import(IMPL);
    /** @type {DelegationRequest} */
    const req = mod.buildDelegationRequest({ agent: 'oracle', task: 'review diff' });
    assert.equal(req.subagent, true);
    assert.equal(req.background, true);
  });

  it('carries sessionID forward for continuation', async () => {
    const mod = await import(IMPL);
    /** @type {DelegationRequest} */
    const req = mod.buildDelegationRequest({
      agent: 'plan',
      task: 'plan feature',
      sessionID: 'ses_123',
    });
    assert.equal(req.sessionID, 'ses_123');
  });

  it('omits sessionID when starting fresh (no phantom id)', async () => {
    const mod = await import(IMPL);
    /** @type {DelegationRequest} */
    const req = mod.buildDelegationRequest({ agent: 'explore', task: 'map repo' });
    assert.ok(!('sessionID' in req) || req.sessionID === undefined);
  });
});
