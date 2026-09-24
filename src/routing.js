// @ts-check
// CONTRACT (a): V1 -> V2 agent routing table.
// Source of truth is live agent config (opencode.json; registration is Task 7).
// This module REFERENCES the sanitized snapshot
// (../__tests__/fixtures/agents.v1.sanitized.json) when present and only falls
// back to the embedded snapshot otherwise — it never invents model pins.
// NOTE: chat.params / chat.message / messages-transform / system-transform
// have no V2 hook equivalent and are intentionally left unimplemented.
/** @typedef {{ agent: string, model: string|null, mode: string|null }} RouteRow */
/** @typedef {{ model: string|null, mode: string|null }} ResolvedRoute */

import { readFileSync } from 'node:fs';

/** Embedded fallback: byte-copy of the sanitized fixture, not a second source. */
const FALLBACK = /** @type {RouteRow[]} */ ([
  { agent: 'junior', model: 'zai/glm-5.3', mode: null },
  { agent: 'oracle', model: 'openai/gpt-5.5', mode: 'high' },
  { agent: 'librarian', model: 'minimax-coding-plan/M3', mode: null },
  { agent: 'explore', model: 'zai/glm-5', mode: null },
  { agent: 'looker', model: 'openai/gpt-5.6-sol', mode: 'low' },
  { agent: 'cxm-agent', model: 'claude-minimax/M3', mode: null },
  { agent: 'plan', model: 'openai/gpt-5.5', mode: 'high' },
  { agent: 'general', model: 'minimax/M2.7', mode: null },
  { agent: 'lead', model: null, mode: null },
]);

/** Load the routing table, preferring the config snapshot over the fallback. */
function loadTable() {
  try {
    const raw = readFileSync(
      new URL('../__tests__/fixtures/agents.v1.sanitized.json', import.meta.url),
      'utf8',
    );
    const rows = /** @type {RouteRow[]} */ (JSON.parse(raw));
    if (Array.isArray(rows) && rows.every((r) => typeof r.agent === 'string')) return rows;
  } catch {
    // Non-fatal: fall through to embedded snapshot.
  }
  return FALLBACK;
}

const TABLE = new Map(loadTable().map((r) => [r.agent, { model: r.model, mode: r.mode }]));

/**
 * Resolve an agent name to its pinned model/mode.
 * @param {string} name
 * @returns {ResolvedRoute}
 */
export function resolveAgent(name) {
  const hit = TABLE.get(name);
  if (!hit) return { model: null, mode: null };
  return { model: hit.model, mode: hit.mode };
}

/** @returns {string[]} */
export function listAgents() {
  return [...TABLE.keys()].sort();
}
