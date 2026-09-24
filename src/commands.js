// @ts-check
// CONTRACT (d): command entries resolve; subagent:true where background required.
// Source of truth is live command config (opencode.json; Task 7). This module
// REFERENCES the sanitized snapshot when present, with an embedded fallback.
/** @typedef {{ description: string, backgroundRequired: boolean }} CommandSpec */
/** @typedef {{ name: string, description: string, subagent: boolean }} CommandEntry */

import { readFileSync } from 'node:fs';

const FALLBACK = /** @type {Record<string, CommandSpec>} */ ({
  verify: { description: 'Run comprehensive verification gates', backgroundRequired: true },
  'code-review': { description: 'Review code changes', backgroundRequired: true },
  security: { description: 'Security review on changes', backgroundRequired: true },
  plan: { description: 'Implementation plan', backgroundRequired: true },
  tdd: { description: 'TDD workflow enforcement', backgroundRequired: true },
  'azdo-pr-comments': { description: 'Fetch Azure DevOps PR comments', backgroundRequired: false },
});

function loadCommands() {
  try {
    const raw = readFileSync(
      new URL('../__tests__/fixtures/commands.v1.sanitized.json', import.meta.url),
      'utf8',
    );
    const parsed = /** @type {Record<string, CommandSpec>} */ (JSON.parse(raw));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Non-fatal: fall through to embedded snapshot.
  }
  return FALLBACK;
}

const COMMANDS = loadCommands();

/**
 * Resolve a command name (without leading slash) to its entry.
 * @param {string} name
 * @returns {CommandEntry|null} null for unknown commands.
 */
export function resolveCommand(name) {
  const spec = COMMANDS[name];
  if (!spec) return null;
  return { name, description: spec.description, subagent: spec.backgroundRequired === true };
}

/** @returns {string[]} */
export function listCommands() {
  return Object.keys(COMMANDS).sort();
}
