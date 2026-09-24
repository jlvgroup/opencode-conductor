// @ts-check
// CONTRACT (e): boulder/run-continuation import-or-shim incl. empty/missing/corrupt.
// RED: ../src/boulder.js does not exist yet.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const states = JSON.parse(
  readFileSync(join(here, 'fixtures', 'boulder-states.sanitized.json'), 'utf8'),
);

const IMPL = '../../src/boulder.js';

describe('opencode-conductor boulder/run-continuation (e)', () => {
  it('fixture covers empty/missing/corrupt states', () => {
    assert.ok('empty' in states && 'missing' in states && 'corrupt' in states);
  });

  it('shims empty state without throwing', async () => {
    const mod = await import(IMPL);
    const out = mod.loadRunState(states.empty);
    assert.equal(out.shimmed, true);
  });

  it('shims missing state without throwing', async () => {
    const mod = await import(IMPL);
    const out = mod.loadRunState(states.missing);
    assert.equal(out.shimmed, true);
  });

  it('shims corrupt state without throwing', async () => {
    const mod = await import(IMPL);
    const out = mod.loadRunState(states.corrupt);
    assert.equal(out.shimmed, true);
  });

  it('loads a valid state without shim', async () => {
    const mod = await import(IMPL);
    const out = mod.loadRunState(states.valid);
    assert.equal(out.shimmed, false);
  });
});
