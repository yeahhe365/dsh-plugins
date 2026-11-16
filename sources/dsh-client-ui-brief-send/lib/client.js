window.__ModuleLoader__.load({
	id: "dsh-client-ui-brief-send",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		/** Plugin id: CSS tag key, `data-` marker, and console tag. */
		const ID = "dsh-client-ui-brief-send";
		/** Locale namespace owned by this plugin. */
		const NS = "brief-send";
		/** The exact four characters this button writes and sends. */
		const TEXT = "简而言之";
		/** Remote-access action the platform requires before a Session accepts a prompt. */
		const ACCESS_ACTION = "session/prompt";

		//#region styles
		/**
		 * Tool-row button, matching the sibling icon controls (28px round, design
		 * tokens only) so light and dark themes need one rule set. The busy colour
		 * reuses the same business-primary token the submit button uses.
		 */
		const css =
			".bsBtn_button{corner-shape:round;background:transparent;width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:999px;flex:none;place-items:center;display:grid;transition:background .12s,color .12s}" +
			".bsBtn_button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}" +
			".bsBtn_button:active:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}" +
			".bsBtn_button:disabled{cursor:default}" +
			".bsBtn_button:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}" +
			".bsBtn_busy{color:var(--dsw-alias-state-business-primary)}" +
			"@keyframes bsBtn_spin{to{transform:rotate(360deg)}}" +
			".bsBtn_busy svg{animation:.9s linear infinite bsBtn_spin}";
		const tagId = ID + "/BriefSendButton.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = ID;
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region icons
		/**
		 * Glyphs come from the product icon sprite the composer itself renders, so the
		 * button inherits 16px grid geometry, the regular stroke weight, and
		 * `currentColor`. The hand-drawn sparkle is only a fallback for a release that
		 * drops the symbol.
		 */
		const FallbackSparkle = ({ size = 16 }) =>
			(0, react.createElement)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1,
				strokeLinejoin: "round",
				"aria-hidden": true
			}, react.createElement("path", { d: "M8 2.2l1.5 4.3 4.3 1.5-4.3 1.5L8 13.8l-1.5-4.3L2.2 8l4.3-1.5z" }));
		const SparkleIcon = primitives.IconSparkleRegular ?? FallbackSparkle;
		const PendingIcon = primitives.IconLoadingOutlineRegular ?? SparkleIcon;
		//#endregion
		//#region dictionaries
		const zh = {
			"action.briefSend": "简而言之（填入并发送）",
			"action.briefSend.busy": "正在发送…"
		};
		const en = {
			"action.briefSend": "Insert 简而言之 and send",
			"action.briefSend.busy": "Sending…"
		};
		/** Fallback copy if the slot framework hands no `t` (should not happen). */
		function fallbackTranslate(key) {
			const dict = typeof navigator !== "undefined" && (navigator.language ?? "en").toLowerCase().startsWith("zh") ? zh : en;
			return dict[key] ?? key;
		}
		//#endregion
		//#region component
		/** Stable selector identity for the one input-state field this button reads. */
		const selectPhase = (state) => state.phase;

		/**
		 * One-click quick prompt: write `简而言之` into this Session's draft and submit
		 * it through the same input machine the Send button drives — the Host sees an
		 * ordinary user message, and a queued message behaves exactly like a typed one.
		 *
		 * The button reflects the real machine, not a local timer: it stays busy while
		 * `phase` is anything but `plain` (the draft is read-only then) and falls back
		 * to idle by itself when the Host settles. Nothing is shown as "sent" before
		 * the machine accepts the submission.
		 */
		const BriefSendButton = react.memo(function BriefSendButton(props) {
			const { t: translate, useAccess, useInput, inputActions } = props;
			const t = typeof translate === "function" ? translate : fallbackTranslate;
			const allowed = typeof useAccess === "function" ? useAccess(ACCESS_ACTION) !== false : true;
			const phase = typeof useInput === "function" ? useInput(selectPhase) : "plain";
			/** Absorb a same-tick double click; released whenever the machine is editable again. */
			const lock = react.useRef(false);
			react.useEffect(() => {
				if (phase === "plain") lock.current = false;
			}, [phase]);
			if (!allowed) return null;
			const busy = phase !== "plain";
			const label = busy ? t("action.briefSend.busy") : t("action.briefSend");
			const onClick = () => {
				if (busy || lock.current || inputActions === undefined) return;
				lock.current = true;
				try {
					inputActions.setDraft(TEXT);
					inputActions.submit();
				} catch (error) {
					// Re-open the lock; the composer owns user-facing error reporting and
					// keeps the draft it could not send.
					lock.current = false;
				}
			};
			return react.createElement(primitives.Tooltip, {
				label,
				side: "top",
				delayMs: 500,
				// The docked composer is a containment context, so an un-portalled
				// tooltip would be clipped by the card it sits in.
				portal: true,
				children: react.createElement("button", {
					type: "button",
					className: "bsBtn_button" + (busy ? " bsBtn_busy" : ""),
					"data-brief-send": true,
					"aria-label": label,
					"aria-busy": busy ? true : void 0,
					disabled: busy,
					onMouseDown: (event) => {
						event.preventDefault();
					},
					onClick,
					children: react.createElement(busy ? PendingIcon : SparkleIcon, { size: 16 })
				})
			});
		});
		//#endregion
		//#region plugin
		/** Required services: the slot registry and the locale registry. */
		const inject = [
			"slots",
			"locale"
		];

		/**
		 * Register one cell in `conversation.input.right` — the composer group before
		 * the model selector and the submit action. The slot's standard props already
		 * carry `inputActions` (setDraft + submit) and `useInput`/`useAccess`, so the
		 * button needs no session controller handle of its own.
		 *
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "brief-send: dictionaries");
			ctx.effect(() => ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "brief-send",
				order: 1,
				locale: NS
			}, BriefSendButton)), "brief-send: composer action");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
