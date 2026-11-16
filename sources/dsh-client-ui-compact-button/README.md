# dsh-client-ui-compact-button

本地 DSH 客户端插件：在输入框工具行**右侧**加一个「压缩上下文」图标按钮——位置在
**模型选择器左侧、提交按钮左边**，点一下等价于手打 `/compact`。

当前版本 **1.1.0**。

## 它做了什么

- **右侧按钮**：注册在官方插槽 `conversation.input.right`（`order: 0`）。该插槽是
  `conversation.composer.bar` 右半组的第一个位置，渲染顺序即：
  `[附件] [权限/计划] [输入区左侧…] —— [本按钮] [模型选择器] [活动区] [停止] [提交]`。
- **同一条命令通道**：点击调用 `ctx.sessions.binding(sessionId).session.command("/compact")`，
  与手打 `/compact` 完全一致（admission 语义）；压缩结果照常在对话流里以命令行形式出现。
- **图标与应用同源**：不自绘路径，直接用 `@deepseek-ai/dsh-client-ui-primitives` 导出的
  原生图标组件（`IconArchiveOutlineRegular` 等），因此 16px 网格、1px regular 描边、
  `currentColor` 全部和旁边的模型选择器/提交按钮一致。语义递进：
  空闲＝归档箱、提交中＝loading 环旋转、已提交＝归档打勾。
  备选图标对照图见 `docs/icon-options.png`。
- **状态反馈**：图标按钮没有文字，所以状态走三条通道——
  Tooltip/`aria-label` 文案、图标形状、图标颜色，4 秒后自动回到待命。

  | 阶段 | 中文文案 | 形状 | 颜色 |
  | --- | --- | --- | --- |
  | 待命 | 压缩上下文 | 归档箱 | 三级文字色 |
  | 提交中 | 压缩中… | loading 环（旋转），按钮禁用 | 业务蓝 |
  | 已提交 | 已提交压缩 | 归档箱 + 勾 | 业务蓝 |
  | 未匹配 | 命令未匹配（当前会话没有 /compact） | 归档箱 | 错误红 |
  | 失败 | 提交失败 | 归档箱 | 错误红 |

- **零侵入**：纯 client 半边插件（host 半为空 `apply`），只注册官方槽位，不改任何平台文件、
  不注入 DOM、不碰 `app.asar`。
- **多语言**：`compact-button` 命名空间下注册 zh/en，跟随 DSH 语言设置实时切换。

## 安装位置（本机）

- 插件源码：`~/.dsh/plugins/dsh-client-ui-compact-button`
- 生效方式：`profiles/desktop/package.json` 的 `dependencies` 里 `link:` 指向它，
  `node_modules/dsh-client-ui-compact-button` 是指向它的符号链接，
  `profiles/desktop/cordis.patch.yml` 的 `- insert:` 列表里有一行挂载条目。

**热加载**：源码在 `~/.dsh/plugins`，不在 profile 目录内。首次移动/更换路径后需要重启
一次 DSH，让客户端插件图重新读取包清单；之后改 `lib/client.js` 若没有自动重组，刷新页面
即可。新增插件首次挂载时如果恰好撞上符号链接还没建好，会一直等到下一个文件事件——再存
一次 patch 文件即可。

## 移动源码目录后按钮不出现时

Loader 会缓存「包名 → 真实路径」的解析结果。把源码目录挪走（例如从 profile 的
`plugins/` 移到 `~/.dsh/plugins`）后，即使 `node_modules` 链接已更新，这一行仍可能
指向旧路径，于是在客户端插件图里整行消失、控制台无报错。热修复办法：

1. 把 `cordis.patch.yml` 里这一行的 `name` 临时改成 `file://` 绝对路径：
   `name: 'file:///Users/<you>/.dsh/plugins/dsh-client-ui-compact-button/lib/index.js'`
2. 等一次重组（约 2–10 s），按钮会重新出现；
3. 再把 `name` 改回包名 `dsh-client-ui-compact-button`，重新解析后就一直是好的。

整个过程不需要重启 DSH。

## 已知边界

- 压缩能力由 host 决定：会话的 agent 预设必须挂 `dsh-command-compact` + 压缩后端
  （`standard` / `ptc` / `cordis` 都带；`minimal` 刻意不带）。没有时按钮仍渲染，
  点击后在 Tooltip 里报「命令未匹配」，不会静默失败。
- Agent 运行中整个右侧控件组（含模型选择器）会被平台隐藏，按钮随之消失——这是原生行为。
- 只提交无参数的 `/compact`（不做区间选择），完整范围由 host 的压缩引擎决定。
- 全新空白会话没有 `sessionId`，按钮不渲染。

## 手工回滚

```sh
cd ~/.dsh/profiles/desktop
rm node_modules/dsh-client-ui-compact-button           # 摘掉符号链接
pkill -f "DeepSeek Harness" ; open -a "DeepSeek Harness"
```

然后把 `cordis.patch.yml` 里 `dsh-client-ui-compact-button` 那两行、`package.json` 里对应的
`link:` 依赖删掉（或直接用同目录下 `*.bak.before-compact-button-*` 备份覆盖回去）。
