// @ts-check
// CONTRACT (b): read-only agents deny edit/write. Fail-open for unknown
// agents/tools so a plugin bug can never wedge the session (non-fatal).

const READONLY = new Set(['oracle', 'librarian', 'explore', 'looker', 'plan']);
const DENIED_TOOLS = new Set(['edit', 'write']);

/**
 * @param {string} agent
 * @param {string} tool
 * @returns {boolean} true when the agent may invoke the tool.
 */
export function canUseTool(agent, tool) {
  if (READONLY.has(agent) && DENIED_TOOLS.has(tool)) return false;
  return true;
}

/**
 * @param {string} agent
 * @returns {boolean}
 */
export function isReadOnly(agent) {
  return READONLY.has(agent);
}
