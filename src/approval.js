// @ts-check
// CONTRACT (g): push/merge approval wall. NOTHING may push or merge without
// an explicit `go` (approved === true). Strict equality: truthy-but-vague
// values ("yes", 1) do NOT open the gate.
/**
 * @param {{ approved?: unknown }} input
 * @returns {boolean}
 */
export function isPushAllowed(input) {
  return input?.approved === true;
}

/**
 * @param {{ approved?: unknown }} input
 * @returns {boolean}
 */
export function isMergeAllowed(input) {
  return input?.approved === true;
}
