// @ts-check
// CONTRACT (e): boulder/run-continuation import-or-shim. Empty, missing, and
// corrupt states shim to a safe default WITHOUT throwing; valid states load
// as-is. All failures are non-fatal and logged.
//
// REAL SHAPES (read-only; originals never touched):
// - Mac config .omo/boulder.json: { schema_version: 2, active_work_id, works,
//   session_ids, status, ... }. works values map to runs; the active work's
//   first session_id maps to continuation.sessionID (V2 continuation).
// - Mac config .omo/run-continuation/ses_*.json (150 files, surveyed
//   2026-09-24): { sessionID, updatedAt, sources } — all idle state.
// - JYUbuntu (live inspection deferred — ssh unreachable from here):
//   expected same schema_version 2 + run-continuation entries; exact remote
//   commands are listed in state/migration-report.json.
// Backup-before-convert: converted state is written ONLY to the plugin-owned
// state/migrated-boulder-v2.json; .omo originals are read, never modified.
/** @typedef {Record<string, unknown>} RunEntry */
/** @typedef {{ sessionID: string, summary: string }} Continuation */
/** @typedef {{ shimmed: boolean, runs: RunEntry[], continuation: Continuation | null, reason?: string }} RunStateResult */
/** @typedef {{ name: string, raw: unknown }} NamedDoc */
/** @typedef {{ file: string, status: string, reason?: string, sessionID?: string }} EntryReport */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function asReasonKind(value) {
  if (isRecord(value) && 'kind' in value) return String(value.kind);
  if (value === null || value === undefined) return 'missing';
  return 'unknown';
}

/**
 * Resumable one-line summary injected via the
 * experimental.session.compacting path (see src/plugin.js).
 * @param {string} sessionID
 * @param {string} detail
 * @returns {string}
 */
export function buildSummary(sessionID, detail) {
  return `resume session ${sessionID} — ${detail}`;
}

/**
 * Migrate one real run-continuation doc ({ sessionID, updatedAt, sources }).
 * @param {Record<string, unknown>} doc
 * @returns {RunStateResult}
 */
function migrateRunDoc(doc) {
  const sessionID = doc.sessionID;
  if (typeof sessionID !== 'string' || sessionID.length === 0) {
    return { shimmed: true, runs: [], continuation: null, reason: 'run doc without sessionID' };
  }
  const sources = isRecord(doc.sources) ? doc.sources : {};
  const first = Object.values(sources)[0];
  const state = isRecord(first) && typeof first.state === 'string' ? first.state : 'unknown';
  return {
    shimmed: false,
    runs: [{ id: sessionID, status: state }],
    continuation: { sessionID, summary: buildSummary(sessionID, `run-continuation state=${state}`) },
  };
}

/**
 * Migrate one real boulder doc (schema_version 2 + works map).
 * @param {Record<string, unknown>} doc
 * @returns {RunStateResult}
 */
function migrateBoulderDoc(doc) {
  const works = isRecord(doc.works) ? doc.works : null;
  if (!works || Object.keys(works).length === 0) {
    return { shimmed: true, runs: [], continuation: null, reason: 'boulder doc with empty works' };
  }
  const runs = Object.values(works).map((w) => {
    const work = isRecord(w) ? w : {};
    return {
      id: typeof work.work_id === 'string' ? work.work_id : 'unknown-work',
      status: typeof work.status === 'string' ? work.status : 'unknown',
    };
  });
  const activeID = typeof doc.active_work_id === 'string' ? doc.active_work_id : null;
  const active = activeID !== null && isRecord(works[activeID]) ? works[activeID] : Object.values(works)[0];
  const activeRec = isRecord(active) ? active : {};
  const ids = Array.isArray(activeRec.session_ids)
    ? activeRec.session_ids.filter((s) => typeof s === 'string')
    : [];
  const topIDs = Array.isArray(doc.session_ids)
    ? doc.session_ids.filter((s) => typeof s === 'string')
    : [];
  const sessionID = ids[0] ?? topIDs[0] ?? null;
  if (typeof sessionID !== 'string') {
    return { shimmed: true, runs: [], continuation: null, reason: 'boulder doc without session_ids' };
  }
  const workID = typeof activeRec.work_id === 'string' ? activeRec.work_id : String(activeID ?? 'unknown');
  const status = typeof activeRec.status === 'string' ? activeRec.status : 'unknown';
  return {
    shimmed: false,
    runs,
    continuation: {
      sessionID,
      summary: buildSummary(sessionID, `boulder work ${workID} (${status}), ${String(runs.length)} work(s)`),
    },
  };
}

/**
 * Load a persisted run state, shimming anything unusable.
 * Accepts legacy fixture shapes ({ kind, runs }) AND real .omo shapes.
 * @param {unknown} state
 * @returns {RunStateResult}
 */
export function loadRunState(state) {
  try {
    if (typeof state === 'string') {
      const trimmed = state.trim();
      if (trimmed.length === 0) {
        return { shimmed: true, runs: [], continuation: null, reason: 'unusable run state: empty-string' };
      }
      try {
        return loadRunState(JSON.parse(trimmed));
      } catch {
        return { shimmed: true, runs: [], continuation: null, reason: 'unusable run state: corrupt' };
      }
    }
    if (state === null || state === undefined) {
      return { shimmed: true, runs: [], continuation: null, reason: 'unusable run state: missing' };
    }
    if (!isRecord(state)) {
      return { shimmed: true, runs: [], continuation: null, reason: 'unusable run state: unknown' };
    }
    if (typeof state.sessionID === 'string') return migrateRunDoc(state);
    if (state.schema_version === 2 && isRecord(state.works)) return migrateBoulderDoc(state);
    if (state.kind === 'valid' && Array.isArray(state.runs)) {
      const runs = /** @type {RunEntry[]} */ (state.runs);
      const cont = isRecord(state.continuation) && typeof state.continuation.sessionID === 'string'
        ? /** @type {Continuation} */ ({ sessionID: state.continuation.sessionID, summary: typeof state.continuation.summary === 'string' ? state.continuation.summary : buildSummary(state.continuation.sessionID, 'legacy fixture continuation') })
        : null;
      return { shimmed: false, runs, continuation: cont };
    }
    if (Array.isArray(state.runs) && state.runs.length > 0) {
      return { shimmed: false, runs: /** @type {RunEntry[]} */ (state.runs), continuation: null };
    }
    return { shimmed: true, runs: [], continuation: null, reason: `unusable run state: ${asReasonKind(state)}` };
  } catch (err) {
    console.error('[opencode-conductor] loadRunState failed (non-fatal, shimmed):', err);
    return { shimmed: true, runs: [], continuation: null, reason: 'exception while loading' };
  }
}

/**
 * Migrate a batch of named docs (pure: no fs — callers read files, this
 * converts). Raw strings are JSON-parsed with corrupt recovery (shim, never
 * throw). Returns per-file outcomes for the migration report.
 * @param {NamedDoc[]} docs
 * @returns {{ outcomes: RunStateResult[], report: EntryReport[] }}
 */
export function migrateDocuments(docs) {
  const outcomes = [];
  const report = [];
  for (const doc of docs) {
    /** @type {unknown} */
    let parsed = doc.raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        const outcome = { shimmed: true, runs: [], continuation: null, reason: 'unusable run state: corrupt' };
        outcomes.push(outcome);
        report.push({ file: doc.name, status: 'shimmed', reason: 'corrupt JSON (recovered via shim)' });
        continue;
      }
    }
    const outcome = loadRunState(parsed);
    outcomes.push(outcome);
    const sid = outcome.continuation !== null ? outcome.continuation.sessionID : undefined;
    report.push({
      file: doc.name,
      status: outcome.shimmed ? 'shimmed' : 'migrated',
      ...(outcome.reason !== undefined ? { reason: outcome.reason } : {}),
      ...(sid !== undefined ? { sessionID: sid } : {}),
    });
  }
  return { outcomes, report };
}
