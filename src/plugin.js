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

export const hooks = {
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

/**
 * V2 entrypoint. The V2 loader requires the default export to be a definition
 * with an `id` plus `effect` or `setup` (plain object suffices — no
 * `@opencode/plugin` dependency needed). The contract logic above is rewired:
 *   tool.execute.before -> ctx.tool.hook("execute.before")
 *   tool.execute.after  -> ctx.tool.hook("execute.after")
 *   event               -> ctx.event.subscribe (diagnostics sink, abort on cleanup)
 *   experimental.session.compacting -> ctx.session.hook("compaction").
 * Compaction injection is best-effort: the V2 compaction event shape is not
 * fully documented, so continuation state is attached under a namespaced key
 * (ignored if unsupported, never throws thanks to safe()).
 */
export default {
  id: 'opencode-conductor',
  /**
   * @param {{
   *   tool: { hook: (name: string, fn: HookFn) => Promise<unknown> },
   *   session: { hook: (name: string, fn: HookFn) => Promise<unknown> },
   *   event: { subscribe: (opts: { signal: AbortSignal }) => AsyncIterable<unknown> }
   * }} ctx
   * @returns {Promise<() => void>}
   */
  setup: async (ctx) => {
    await ctx.tool.hook(
      'execute.before',
      safe((input) => {
        const tool = asString(input.tool);
        const agent = asString(input.agent);
        if (agent && tool && !canUseTool(agent, tool)) {
          throw new Error(`[opencode-conductor] denied: ${agent} may not use ${tool}`);
        }
        const cmd = JSON.stringify(input.input ?? '');
        if (/git\s+push\b/.test(cmd) && !isPushAllowed(input)) {
          throw new Error('[opencode-conductor] denied: push requires explicit go');
        }
        if (/gh\s+pr\s+merge\b/.test(cmd) && !isMergeAllowed(input)) {
          throw new Error('[opencode-conductor] denied: merge requires explicit go');
        }
        return undefined;
      }),
    );
    await ctx.tool.hook(
      'execute.after',
      safe(() => undefined),
    );
    await ctx.session.hook(
      'compaction',
      safe((input) => {
        const state = loadRunState(
          'runState' in input ? input.runState : { kind: 'missing' },
        );
        if (state.shimmed || !state.continuation) return undefined;
        input.conductorContinuation = state.continuation;
        return undefined;
      }),
    );
    const controller = new AbortController();
    void (async () => {
      try {
        for await (const _event of ctx.event.subscribe({ signal: controller.signal })) {
          // Diagnostics sink; intentionally no-op.
        }
      } catch {
        // Aborted on cleanup.
      }
    })();
    return () => controller.abort();
  },
};
