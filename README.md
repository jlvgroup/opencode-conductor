# opencode-conductor

Minimal self-owned [OpenCode V2](https://opencode.ai/v2/docs) orchestration plugin. Successor-in-spirit to the V1-only `oh-my-openagent` workflow it replaces — routing, background delegation, and continuation resume — without OMO's V1 hook surface, which has no V2 equivalent.

## Status

Staged for OpenCode 2.x release day. V1 binary (1.18.x) cannot load this config or plugin.

## Scope

- Agent routing table (`src/routing.js`) + read-only permission denials (`src/permissions.js`)
- Background delegation shapes (`background: true`, `sessionID` continuation)
- Boulder/run-continuation migrate-or-shim (`src/boulder.js`, `state/` — machine-local, never committed)
- Push/merge approval guard (`src/approval.js`)
- Compaction-context injection via `experimental.session.compacting`

## Non-goals

V1 hooks with no V2 equivalent are intentionally absent: `chat.params`, `chat.message`, `messages-transform`, `system-transform`. Agent/model routing lives in `opencode.json`, not here.

## Test

```bash
node --test __tests__/
```

41 tests, 7 suites. Fixtures are sanitized (secret-scan asserted).
