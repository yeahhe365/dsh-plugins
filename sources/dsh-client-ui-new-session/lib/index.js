//#region lib/index.js
/**
 * New-conversation button plugin, node half. Pure UI plugin: the empty apply
 * exists so the row appears in the host profile tree / Loader, while the
 * browser half ships through `exports["./client"]`, discovered from this
 * package's `dsh.client` declaration. Session creation itself is owned by
 * `@deepseek-ai/dsh-client-ui-workspace` (`uiWorkspace.startSession`).
 */
/** Host plugin body — no host-side behavior for this surface plugin. */
function apply() {}
//#endregion
export { apply };
