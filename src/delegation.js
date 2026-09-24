// @ts-check
// CONTRACT (c): background delegation request shape for subagent fan-out.
/** @typedef {{ subagent: boolean, background: boolean, agent: string, task: string, sessionID?: string }} DelegationRequest */

/**
 * Build a subagent delegation request. sessionID is carried forward only
 * when continuing an existing session — never invented for fresh starts.
 * @param {{ agent: string, task: string, sessionID?: string }} input
 * @returns {DelegationRequest}
 */
export function buildDelegationRequest(input) {
  const req = /** @type {DelegationRequest} */ ({
    subagent: true,
    background: true,
    agent: input.agent,
    task: input.task,
  });
  if (input.sessionID !== undefined) req.sessionID = input.sessionID;
  return req;
}
