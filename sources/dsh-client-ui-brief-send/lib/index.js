//#region lib/index.js
/**
 * Brief-send button plugin, node half.
 *
 * Pure UI plugin: the empty apply exists so the row appears in the host profile
 * tree / Loader, while the browser half ships through `exports["./client"]`,
 * discovered from this package's `dsh.client` declaration. Everything this
 * feature does happens in the browser: the button writes the draft through the
 * conversation input machine and submits it, so the Host sees an ordinary user
 * message — no host verb, no custom RPC.
 */
/** Host plugin body — no host-side behavior for this surface plugin. */
function apply() {}
//#endregion
export { apply };
