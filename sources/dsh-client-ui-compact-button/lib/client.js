window.__ModuleLoader__.load({
	id: "dsh-client-ui-compact-button",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region styles
		/**
		 * Buttons in `conversation.composer.bar` are plain flex items, so this
		 * matches the sibling「新建对话」button (28px round, same design tokens) that
		 * the user's own `dsh-client-ui-new-session` plugin puts on the left half of
		 * the same row. Only class names are plugin-scoped; every colour is a
		 * `--dsw-*` token, so light/dark both work without a second rule set.
		 */
		const css =
			".cbBtn_button{corner-shape:round;background:transparent;width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:999px;flex:none;place-items:center;display:grid;transition:background .12s,color .12s}" +
			".cbBtn_button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}" +
			".cbBtn_button:active:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}" +
			".cbBtn_button:disabled{cursor:default}" +
			".cbBtn_button:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}" +
			".cbBtn_pending{color:var(--dsw-alias-state-business-primary)}" +
			".cbBtn_submitted{color:var(--dsw-alias-state-business-primary)}" +
			".cbBtn_rejected{color:var(--dsw-alias-state-error-primary)}" +
			".cbBtn_failed{color:var(--dsw-alias-state-error-primary)}" +
			"@keyframes cbBtn_spin{to{transform:rotate(360deg)}}" + ".cbBtn_pending svg{animation:.9s linear infinite cbBtn_spin}";
		const tagId = "dsh-client-ui-compact-button/CompactButton.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-client-ui-compact-button";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region icon
		/**
		 * Glyphs come straight out of the product icon set exported by
		 * `@deepseek-ai/dsh-client-ui-primitives` — the same sprite-backed
		 * components the composer itself renders (`IconSendOutlineMedium`,
		 * `IconQueueOutlineRegular`, …). Using them instead of hand-drawn paths
		 * buys exact 16px grid geometry, the regular 1px stroke weight, and the
		 * same `currentColor` handling, so the button cannot drift from the
		 * neighbouring controls.
		 *
		 * Semantics: an archive box = old history being put away (idle), and the
		 * archive-with-check variant confirms the compaction was admitted.
		 */
		/** Last-resort glyph if a future release drops the archive symbols. */
		const FallbackIcon = ({ size = 16 }) =>
			(0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true,
				children: (0, react_jsx_runtime.jsx)("path", {
					d: "M2.5 2.5h11v2.5h-11zM3.5 5v8.5h9V5M6.5 9h3"
				})
			});
		const IdleIcon = primitives.IconArchiveOutlineRegular ?? FallbackIcon;
		const DoneIcon = primitives.IconArchiveCheckOutlineRegular ?? IdleIcon;
		const PendingIcon = primitives.IconLoadingOutlineRegular ?? IdleIcon;
		//#endregion
		//#region dictionaries
		/** Dictionary namespace owned by this plugin. */
		const NS = "compact-button";
		const zh = {
			"action.compact": "压缩上下文",
			"action.compact.pending": "压缩中…",
			"action.compact.submitted": "已提交压缩",
			"action.compact.rejected": "命令未匹配（当前会话没有 /compact）",
			"action.compact.failed": "提交失败"
		};
		const en = {
			"action.compact": "Compact context",
			"action.compact.pending": "Compacting…",
			"action.compact.submitted": "Compaction submitted",
			"action.compact.rejected": "Command not matched (no /compact in this session)",
			"action.compact.failed": "Submission failed"
		};
		/** Which copy key each phase reads out (Tooltip label + aria-label). */
		const PHASE_KEY = {
			idle: "action.compact",
			pending: "action.compact.pending",
			submitted: "action.compact.submitted",
			rejected: "action.compact.rejected",
			failed: "action.compact.failed"
		};
		/** How long a settled phase stays visible before returning to idle. */
		const SETTLED_VISIBLE_MS = 4e3;
		/**
		 * Fallback translation for the (unexpected) case where the slot framework
		 * hands no `t`: read the dictionary for the browser language directly.
		 */
		function fallbackTranslate(key) {
			const dict = (typeof navigator !== "undefined" && (navigator.language ?? "en").toLowerCase().startsWith("zh") ? zh : en);
			return dict[key] ?? key;
		}
		//#endregion
		//#region component
		/**
		 * Compact-context control. One click submits a bare `/compact` line to this
		 * session's agent through the official command seam — the same channel as
		 * typing it: admission is all this control owns, the compaction outcome
		 * renders as a command row in the chat.
		 *
		 * The button is icon-only, so the phase machine drives two channels: the
		 * platform Tooltip label (idle reads「压缩上下文」, settled phases report the
		 * outcome for 4s) and the glyph colour. `submit` resolves to "submitted",
		 * "rejected" or "failed"; a rejected admission means the agent preset
		 * mounted no compaction backend (e.g. the `minimal` preset).
		 */
		const CompactButton = (0, react.memo)(function CompactButton({ compact, t: translate }) {
			const t = typeof translate === "function" ? translate : fallbackTranslate;
			const [phase, setPhase] = (0, react.useState)("idle");
			const resetTimer = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
			}, []);
			const settle = (next) => {
				setPhase(next);
				if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
				resetTimer.current = window.setTimeout(() => setPhase("idle"), SETTLED_VISIBLE_MS);
			};
			const onClick = () => {
				if (phase === "pending") return;
				setPhase("pending");
				Promise.resolve()
					.then(() => compact())
					.then((outcome) => {
						settle(outcome === "submitted" ? "submitted" : outcome === "rejected" ? "rejected" : "failed");
					}, () => {
						settle("failed");
					});
			};
			const label = t(PHASE_KEY[phase]);
			const className =
				"cbBtn_button" +
				(phase === "pending" ? " cbBtn_pending" : phase === "submitted" ? " cbBtn_submitted" : phase === "rejected" ? " cbBtn_rejected" : phase === "failed" ? " cbBtn_failed" : "");
			return (0, react_jsx_runtime.jsx)(primitives.Tooltip, {
				label,
				side: "top",
				delayMs: 500,
				children: (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className,
					"data-compact-context": true,
					"aria-label": label,
					"aria-busy": phase === "pending" ? true : void 0,
					disabled: phase === "pending",
					onMouseDown: (event) => {
						event.preventDefault();
					},
					onClick,
					children: (0, react_jsx_runtime.jsx)(phase === "pending" ? PendingIcon : phase === "submitted" ? DoneIcon : IdleIcon, { size: 16 })
				})
			});
		});
		//#endregion
		//#region plugin
		/**
		 * Required services: the slot registry, the locale registry, and the
		 * session controller (command admission).
		 */
		const inject = [
			"slots",
			"locale",
			"sessions"
		];
		/**
		 * Client plugin body: register one cell in the composer's right tool slot,
		 * i.e. immediately to the left of the model selector / submit button.
		 *
		 * `inject` receives the slot's session binding key (`binding.key`) from the
		 * renderer for session-scoped slots, which is what this control needs to
		 * address a command at the right session.
		 *
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "compact-button: dictionaries");
			ctx.effect(() => ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "compact-context",
				order: 0,
				locale: NS,
				inject: (sessionId) => ({
					compact: async () => {
						if (sessionId === void 0) return "rejected";
						const scoped = ctx.sessions.binding(sessionId);
						if (scoped?.session === void 0) return "rejected";
						const result = await scoped.session.command("/compact");
						if (!result.ok) return "failed";
						return result.value?.matched === true ? "submitted" : "rejected";
					}
				})
			}, CompactButton)), "compact-button: composer action");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
