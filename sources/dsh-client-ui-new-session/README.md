# dsh-client-ui-new-session

本地 DSH 客户端插件：在输入框工具行**最左侧**加一个「新建对话」按钮（位置对齐 Cherry Studio），
并把 DSH 侧边栏自带的「新会话」图标换成同一个图标。点击后等价于侧边栏的「新会话」——
在当前工作区新建会话并打开，**并沿用当前会话的 agent 预设**。

当前版本 **1.3.0**。

## 它做了什么

- **左侧按钮**：注册在官方插槽 `conversation.input.left`（`order: -100`，按钮自身 `order: -1`），
  排在「添加文件/指令」「访问模式」之前。
- **沿用 agent 预设**：点击时从会话目录读 `projectionValues.agentPreset`，以
  `uiWorkspace.startSession(undefined, { agentPreset })` 创建会话。不传的话，新会话会静默回落到部署默认预设。
- **远程访问门禁**：`useRemoteAccess("session/create")` 为假时按钮不渲染——和侧边栏按钮同一判据。
- **快捷键提示**：从平台快捷键目录（id `session.new`）读 keycap 与 `aria-keyshortcuts`，拿不到就不显示，
  不硬编码 ⌘N（Windows/Linux 上会错）。
- **防双击**：点击后 1.2s 内禁用按钮，吸收 create RPC 的竞态。
- **侧边栏图标**：CSS `mask` 重绘，不修改安装包里的任何文件。

## 图标来源

Lucide 的 `message-square-plus`（24×24 stroke 几何，`stroke-width: 2`，圆角端点），路径直接内联在本文件里，
按钮中按 14px 渲染，与官方 `.add` 按钮的 `IconPlusOutlineMedium size={14}` 对齐。

- 许可证 **ISC**：可自由商用/修改/再分发，只需保留版权与许可声明（本仓库未携带上游 LICENSE 副本，
  若要发布请一并附上 Lucide 的 LICENSE）。
- 侧边栏那行的 mask 用的也是同一个图形，所以两处图标完全一致。
- 之前用过 Cherry Studio 风格的图标，那是 AGPL-3.0 上游；换成 Lucide 后这层顾虑消失。

## 结构

| 文件 | 作用 |
| --- | --- |
| `lib/index.js` | 宿主半边：空的 `apply()`，只为了让这一行出现在 profile 的 Loader 树里（与官方 `@deepseek-ai/dsh-client-ui-plan` 同款写法）。 |
| `lib/client.js` | 浏览器半边：`window.__ModuleLoader__.load({id, factory})` 格式，注册插槽、注入样式、按钮组件。 |
| `test/client.test.mjs` | 零依赖冒烟测试（`node --test`），假 `window.__ModuleLoader__` + 假 `react`，不装 node_modules。 |

## 关键实现点

- `inject = ["slots", "locale", "uiWorkspace"]`；`sessions` / `shortcuts` 通过 `ctx.get()` 可选读取，
  服务缺失只是降级（不显示预设 / 不显示 keycap），不会让插件挂不上。
- Tooltip 必须 `portal: true`：输入卡片是 containment 上下文，不 portal 会被裁。
- 按钮 hover 规则包在 `@media (hover:hover)` 里，避免触屏粘滞 hover。
- 侧边栏那条规则是 `button[class*="_newSession"] svg`（**后代**选择器）。平台 DOM 是
  `button > span.newSessionLabelMask > span.newSessionContent > svg`，用 `>svg` 不命中。
- 插槽 5 秒内没被声明时 `console.warn` 一次——上游改槽名时不会静默消失。
- 按钮类名 `dshNS_button`，插件前缀避免与其它插件撞名。

## 已知限制

- **标题栏那颗 16px 图标没换**：desktop 窗口标题栏还有一个 `IconNewChatOutlineRegular` 的新建按钮
  （`HeaderLeadingControls`），它的 class 与侧边栏共用 `iconButton`，没有稳定选择器能只命中它，
  硬改会波及其它图标按钮，所以保留官方图标。
- **权限预设不继承**：`startSession` 只接 `agentPreset`，新会话的权限仍取部署默认。
  要沿用需要用 Host 的 `/permission` 命令回放（`dsh-slash-new` 的做法），本插件没做。
- **空白页不显示**：`conversation.input.left` 只在有 `sessionId` 时渲染，没有会话的首页看不到这个按钮。
- **侧边栏图标依赖 CSS-module 类名后缀** `_newSession`。上游改名后规则静默失效，图标退回官方——不报错、不错位。
- 只注册 `zh` / `en`：平台内置语言就这两个（zh→en 兜底），第三方语言包若 fallback 不是 en 才会露出 key。

## 安装与单源部署

`~/.dsh/plugins/dsh-client-ui-new-session` 是唯一源码目录；`desktop` 与 `web` 两个 profile 都直接 `link:` 到它，避免两份代码漂移：

```bash
# 从共享目录安装（两个 profile 各执行一次）
dsh plugin --profile web add ~/.dsh/plugins/dsh-client-ui-new-session
# Desktop 也可以在插件页从该目录安装

# 两个 profile 的 cordis.patch.yml 末尾都需要
#   - insert:
#       - id: dsh-client-ui-new-session
#         name: dsh-client-ui-new-session
```

`dsh.profile.patchReload = live` 的 profile 改完刷新页面即可；desktop 需要刷新页面或重启应用。

## 测试

```bash
cd ~/.dsh/plugins/dsh-client-ui-new-session
node --test test/
```

覆盖：插槽条目形状、tooltip/aria 装配、远程访问门禁、agentPreset 透传、无预设时的降级、侧边栏选择器。

## 卸载

```bash
dsh plugin --profile web remove dsh-client-ui-new-session
# 删掉两个 profile 的 cordis.patch.yml 里那条 insert，再删共享目录
```

侧边栏图标会同时恢复成 DSH 原版（覆盖样式随插件一起消失）。
