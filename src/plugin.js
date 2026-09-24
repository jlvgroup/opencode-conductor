// @ts-check
// CONTRACT (f): plugin entry using ONLY documented V2 hooks.
// Allowed: tool.execute.before, tool.execute.after, event,
// experimental.session.compacting (+ shell.env only if ever needed —
// deliberately NOT wired: the contract allowlist excludes it).
// No OMO dependency. Every handler is wrapped so plugin failure is
// non-fatal and logged.
// NOTE: chat.params / chat.message / messages-transform / system-transform
// have no V2 equivalent and are intentionally left unimplemented.
import { canUseTool } from './permissions.js';
import { isPushAllowed, isMergeAllowed } from './approval.js';
import { loadRunState } from './boulder.js';

/** @typedef {Record<string, unknown>} HookInput */
/** @typedef {(input: HookInput) => unknown} HookFn */

/** Wrap a hook so failures log instead of breaking the session. */
function safe(/** @type {HookFn} */ fn) {
  return async (/** @type {unknown} */ raw) => {
    try {
      const input = /** @type {HookInput} */ (
        raw !== null && typeof raw === 'object' ? raw : {}
      );
      return await fn(input);
    } catch (err) {
      console.error('[opencode-conductor] hook failed (non-fatal):', err);
      return undefined;
    }
  };
}

/** @param {unknown} value */
function asString(value) {
  return typeof value === 'string' ? value : '';
}

const hooks = {
  'tool.execute.before': safe((input) => {
    const agent = asString(input.agent);
    const tool = asString(input.tool);
    if (agent && tool && !canUseTool(agent, tool)) {
      throw new Error(`[opencode-conductor] denied: ${agent} may not use ${tool}`);
    }
    if (input.operation === 'push' && !isPushAllowed(input)) {
      throw new Error('[opencode-conductor] denied: push requires explicit go');
    }
    if (input.operation === 'merge' && !isMergeAllowed(input)) {
      throw new Error('[opencode-conductor] denied: merge requires explicit go');
    }
    return undefined;
  }),
  'tool.execute.after': safe(() => undefined),
  event: safe(() => undefined),
  'experimental.session.compacting': safe((input) => {
    const state = loadRunState(
      'runState' in input ? input.runState : { kind: 'missing' },
    );
    if (state.shimmed) return undefined;
    return { continuation: state.continuation };
  }),
};

/** @returns {string[]} */
export function getHookNames() {
  return Object.keys(hooks);
}

export default { hooks };
