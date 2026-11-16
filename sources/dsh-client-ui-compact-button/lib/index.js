//#region lib/index.js
/**
 * Compact-context button plugin, node half. Pure UI plugin: the empty apply
 * exists so the row appears in the host profile tree / Loader, while the
 * browser half ships through `exports["./client"]`, discovered from this
 * package's `dsh.client` declaration. Compaction itself is owned by the host —
 * `@deepseek-ai/dsh-command-compact` accepts `/compact` and the mounted
 * compaction backend executes it.
 */
/** Host plugin body — no host-side behavior for this surface plugin. */
function apply() {}
//#endregion
export { apply };
