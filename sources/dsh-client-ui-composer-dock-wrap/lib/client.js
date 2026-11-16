window.__ModuleLoader__.load({
	id: "dsh-client-ui-composer-dock-wrap",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region styles
		/**
		 * Layout-only stylesheet for the composer dock — the row of read-outs and
		 * buttons directly below the input box (`[data-composer-dock]`).
		 *
		 * The shipped rule is a single line:
		 *
		 *   .JZLxKW_dock{justify-content:center;align-items:center;gap:12px;
		 *                max-width:100%;padding-top:4px;display:flex}
		 *
		 * No `flex-wrap`, and the entries are `flex:none` (call meter, context
		 * meter) or shrinkable inline-flex (turn/step and usage popovers). Once
		 * the row runs out of width the entries either overflow the composer card
		 * or squeeze their own text into ellipses — which is why the figures read
		 * as clipped. Nothing can drop to a second line.
		 *
		 * Three declarations fix that without touching the host bundle:
		 *
		 *  - `flex-wrap:wrap` — entries flow onto as many lines as they need.
		 *  - `row-gap:2px` — wrapped lines sit tight; the 12px `column-gap` is
		 *    inherited from the host rule, so horizontal rhythm is unchanged.
		 *  - `flex-shrink:0` on the entries — an entry never narrows below its
		 *    content, so "wrap" cannot silently turn back into "clip".
		 *
		 * The second selector level is not redundant. Every slot entry is wrapped
		 * in an anchor div carrying `style="display:contents"` (the slot outlet),
		 * so the element that actually becomes a flex item is the entry's own
		 * root, one level deeper than the dock's direct child. `>*` covers the
		 * host's own `ContextMeter` span, which is rendered as a direct child;
		 * `>*>*` covers the plugin entries behind the `display:contents` anchor.
		 *
		 * `!important` is required rather than defensive: the host rule is a CSS
		 * module injected into the same document, both selectors have equal
		 * specificity, and injection order between the host bundle and this
		 * plugin is not guaranteed.
		 */
		const CSS =
			"[data-composer-dock]{flex-wrap:wrap!important;row-gap:2px}" +
			"[data-composer-dock]>*{flex-shrink:0}" +
			"[data-composer-dock]>*>*{flex-shrink:0}";
		const tagId = "dsh-client-ui-composer-dock-wrap/dock-wrap.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-client-ui-composer-dock-wrap";
			tag.dataset.pluginCss = tagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region plugin
		/** This surface needs no service: the stylesheet is inert markup. */
		const inject = [];
		/**
		 * Client plugin body. The stylesheet is already installed by the module
		 * factory above, which runs once per page load; `apply` only registers the
		 * teardown so a profile reload cannot leave an orphan `<style>` behind.
		 */
		function apply(ctx) {
			ctx.effect(() => () => {
				const tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]");
				if (tag !== null) tag.remove();
			}, "composer-dock-wrap: stylesheet");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
