// V2 directory-plugin entrypoint: opencode resolves a plugin directory via
// index.js at its root (package.json "main" is not consulted).
// Re-exports the conductor definition ({ id, setup }).
export { default } from './src/plugin.js';
