//#region lib/index.js
/**
 * Composer dock wrap plugin, node half.
 *
 * Pure UI plugin: this empty apply only exists so the row shows up in the host
 * profile tree / Loader. The browser half ships through `exports["./client"]`,
 * discovered from the `dsh.client` declaration in package.json. Everything the
 * feature does is one stylesheet in the browser — the Host never learns about
 * it, and no host verb or RPC is involved.
 */
/** Host plugin body — no host-side behaviour for this layout-only surface. */
function apply() {}
//#endregion
export { apply };
