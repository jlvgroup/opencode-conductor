// @ts-check
// CONTRACT (d): command entries resolve; subagent:true where background required.
// RED: ../src/commands.js does not exist yet.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
/** @type {Record<string, { description: string, backgroundRequired: boolean }>} */
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures', 'commands.v1.sanitized.json'), 'utf8'),
);

const IMPL = '../../src/commands.js';
const COMMANDS = ['verify', 'code-review', 'security', 'plan', 'tdd', 'azdo-pr-comments'];

describe('omo-v2 command entries (d)', () => {
  it('fixture covers all six commands (sanitized)', () => {
    for (const c of COMMANDS) assert.ok(fixture[c], `fixture missing /${c}`);
    const raw = JSON.stringify(fixture);
    assert.ok(!/sk-|AZURE_DEVOPS_PAT|api[_-]?key|secret/i.test(raw), 'fixture leaks secret');
  });

  for (const name of COMMANDS) {
    it(`/${name} resolves with subagent:true when background required`, async () => {
      const mod = await import(IMPL);
      const entry = mod.resolveCommand(name);
      assert.ok(entry, `/${name} must resolve`);
      if (fixture[name].backgroundRequired) {
        assert.equal(entry.subagent, true, `/${name} needs subagent:true`);
      }
    });
  }
});
