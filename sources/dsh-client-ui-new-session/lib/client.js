window.__ModuleLoader__.load({
	id: "dsh-client-ui-new-session",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		/** Plugin id, used for the CSS tag, the console tag, and the button class prefix. */
		const ID = "dsh-client-ui-new-session";
		/** Locale namespace owned by this plugin. */
		const NS = "new-session";
		/** Platform shortcut id for "start a new session" (the sidebar button's own row). */
		const SHORTCUT_ID = "session.new";
		/** Remote-access action the platform requires before a session may be created. */
		const ACCESS_ACTION = "session/create";
		/** Absorb a double-click: the create RPC is fire-and-forget, so a second click races it. */
		const LOCKOUT_MS = 1200;
		/** How long to wait for the slot declaration before saying so out loud. */
		const SLOT_PROBE_MS = 5000;

		//#region styles
		/**
		 * New-chat glyph as a mask, used to redraw the sidebar's own "新会话" row.
		 * A mask keeps the glyph monochrome and `currentColor`-driven, so it inherits
		 * the shipped row's hover/focus colour with no extra rules.
		 */
		const ICON_MASK = "data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22black%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M21%2015a2%202%200%200%201-2%202H7l-4%204V5a2%202%200%200%201%202-2h14a2%202%200%200%201%202%202z%22/%3E%3Cpath%20d=%22M12%208v6%22/%3E%3Cpath%20d=%22M9%2011h6%22/%3E%3C/svg%3E";
		/**
		 * `dshNS_` prefix on the button class: a plugin-scoped name cannot collide with
		 * another plugin's generic `button` rule.
		 *
		 * The two shipped-row rules below are the sidebar half. The platform exposes no
		 * slot for that row, so its shipped glyph is hidden and redrawn through a mask.
		 * The svg is NOT a direct child of the button — it sits inside
		 * `span.newSessionLabelMask > span.newSessionContent` — so the selector stays a
		 * descendant selector (`svg`), never `>svg`.
		 */
		const css = ".dshNS_button{corner-shape:round;background:var(--dsw-specific-selector);width:28px;height:28px;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:999px;flex:none;place-items:center;display:grid}" + "@media (hover:hover){.dshNS_button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}}" + ".dshNS_button:active:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}" + ".dshNS_button:disabled{opacity:.5;cursor:default}" + ".dshNS_button:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}" + "button[class*=\"_newSession\"] svg{display:none!important}" + "button[class*=\"_newSession\"]::before{content:\"\";display:block;flex:none;width:14px;height:14px;background-color:currentColor;-webkit-mask:url(\"" + ICON_MASK + "\") center/contain no-repeat;mask:url(\"" + ICON_MASK + "\") center/contain no-repeat}" + "[class*=\"_collapsed\"] button[class*=\"_newSession\"]::before{width:18px;height:18px}";
		const tagId = ID + "/NewSessionButton.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = ID;
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region icon
		/**
		 * New-conversation icon: Lucide "message-square-plus" (ISC), copied verbatim so the
		 * button carries no attribution obligation and needs no dependency. 24x24 stroke
		 * geometry, so it stays crisp at 14px where filled glyphs blur.
		 */
		function NewChatIcon({ size = 14, strokeWidth = 2 }) {
			return react.createElement("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true
			},
				react.createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }),
				react.createElement("path", { d: "M12 8v6" }),
				react.createElement("path", { d: "M9 11h6" })
			);
		}
		//#endregion
		//#region dictionaries
		const zh = { "action.newSession": "新建对话" };
		const en = { "action.newSession": "New conversation" };
		//#endregion
		//#region helpers
		/** Stable empty snapshot: `useSyncExternalStore` needs reference equality. */
		const EMPTY = [];
		/** Stable no-op subscription, used whenever the catalog is unavailable. */
		function noopSubscribe() {
			return () => {};
		}

		/** Read a snapshot store's current value, tolerating plain `{ value }` stores. */
		function snapshotOf(store) {
			try {
				if (store !== null && typeof store === "object" && typeof store.getSnapshot === "function") return store.getSnapshot();
				if (store !== null && typeof store === "object" && "value" in store) return store.value;
			} catch (error) {
				return undefined;
			}
			return undefined;
		}

		/**
		 * The agent preset this Session was created with, read from the Session catalog
		 * (`projectionValues.agentPreset`) rather than a private projection face — the same
		 * field the sidebar's session rows render.
		 */
		function agentPresetOf(ctx, sessionId) {
			if (typeof sessionId !== "string" || sessionId === "") return undefined;
			try {
				const byId = snapshotOf(ctx.get("sessions")?.list)?.byId;
				const value = byId?.[sessionId]?.projectionValues?.agentPreset;
				return typeof value === "string" && value !== "" ? value : undefined;
			} catch (error) {
				return undefined;
			}
		}

		/** The observable shortcut catalog, so the tooltip can carry the same keycap the sidebar shows. */
		function shortcutStoreOf(ctx) {
			try {
				const store = ctx.get("shortcuts")?.catalog;
				return store !== null && typeof store === "object" && typeof store.getSnapshot === "function" ? store : undefined;
			} catch (error) {
				return undefined;
			}
		}

		/** `useSyncExternalStore` when the shell ships it, a one-shot read otherwise. */
		const hasSyncStore = typeof react.useSyncExternalStore === "function";
		function useCatalogRows(store) {
			const subscribe = react.useCallback((listener) => (store === undefined ? noopSubscribe() : store.subscribe(listener)), [store]);
			const getSnapshot = react.useCallback(() => (store === undefined ? EMPTY : store.getSnapshot()), [store]);
			if (hasSyncStore) return react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
			return getSnapshot();
		}
		//#endregion
		//#region component
		/**
		 * New-conversation control for the composer tool row.
		 *
		 * `order: -1` lifts it to the very left of that row, ahead of the shipped command
		 * and attach buttons — the slot wrapper is `display: contents`, so this button is
		 * a direct flex item of the row. Note that `order` does not move it in the tab
		 * order: focus still follows DOM order (attach → permission → this button).
		 *
		 * Renders nothing when the peer may not create sessions, mirroring the sidebar
		 * button, which is gated on the same `session/create` action.
		 */
		const NewSessionButton = react.memo(function NewSessionButton(props) {
			const { t, sessionId, useRemoteAccess, startSession, shortcutStore } = props;
			const label = t("action.newSession");

			const store = typeof shortcutStore === "function" ? shortcutStore() : undefined;
			const rows = useCatalogRows(store);
			const shortcut = Array.isArray(rows) ? rows.find((row) => row !== null && typeof row === "object" && row.id === SHORTCUT_ID) : undefined;

			const [locked, setLocked] = react.useState(false);
			const timer = react.useRef(null);
			react.useEffect(() => () => {
				if (timer.current !== null) clearTimeout(timer.current);
				timer.current = null;
			}, []);

			const allowed = typeof useRemoteAccess === "function" ? useRemoteAccess(ACCESS_ACTION) !== false : true;
			if (!allowed) return null;

			const onClick = () => {
				if (locked) return;
				setLocked(true);
				startSession(sessionId);
				timer.current = setTimeout(() => {
					timer.current = null;
					setLocked(false);
				}, LOCKOUT_MS);
			};

			// The shortcut is optional: it only exists when the platform's shortcut catalog
			// is reachable, so both hints degrade to "no hint" rather than a hard-coded key.
			const tooltipExtras = shortcut === undefined || shortcut.keys === undefined ? {} : { shortcutKeys: shortcut.keys };
			const buttonExtras = shortcut === undefined || shortcut.aria === undefined ? {} : { "aria-keyshortcuts": shortcut.aria };

			return react.createElement(primitives.Tooltip, Object.assign({
				label,
				side: "top",
				delayMs: 500,
				// Required here: the docked composer is a containment context, so an
				// un-portalled tooltip can be clipped by the card it sits in.
				portal: true
			}, tooltipExtras, {
				children: react.createElement("button", Object.assign({
					type: "button",
					className: "dshNS_button",
					style: { order: -1 },
					"data-new-session": true,
					"aria-label": label,
					disabled: locked,
					onMouseDown: (event) => {
						event.preventDefault();
					},
					onClick
				}, buttonExtras, {
					children: react.createElement(NewChatIcon, { size: 14 })
				}))
			}));
		});
		//#endregion
		//#region plugin
		/** Required services: the slot registry, the locale registry, and workspace navigation. */
		const inject = [
			"slots",
			"locale",
			"uiWorkspace"
		];
		/**
		 * Client plugin body: register one cell in the composer's left tool slot.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "new-session: dictionaries");

			// Fail loud, once, if the platform ever renames the slot: the button otherwise
			// just never appears, with nothing in the console to explain why.
			let declared = false;
			ctx.effect(() => {
				const probe = setTimeout(() => {
					if (declared) return;
					console.warn("[" + ID + "] slot \"conversation.input.left\" was not declared within " + SLOT_PROBE_MS + "ms — the composer button is not mounted. The platform slot may have been renamed or removed.");
				}, SLOT_PROBE_MS);
				return () => clearTimeout(probe);
			}, "new-session: slot probe");

			ctx.slots.inject("conversation.input.left", () => {
				declared = true;
				return ctx.slots.register({
					name: "conversation.input.left",
					id: "new-session",
					order: -100,
					locale: NS,
					inject: () => ({
						/**
						 * Start a Session in the current Session's Workspace, carrying the agent
						 * preset over. `startSession(workspaceId?, options?)` — an omitted workspace
						 * means "the one this button lives in"; without `agentPreset` the new
						 * Session silently falls back to the deployment default.
						 */
						startSession: (sessionId) => {
							const agentPreset = agentPresetOf(ctx, sessionId);
							ctx.uiWorkspace.startSession(void 0, agentPreset === undefined ? undefined : { agentPreset });
						},
						shortcutStore: () => shortcutStoreOf(ctx)
					})
				}, NewSessionButton);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
