# dsh-client-ui-brief-send

本地 DSH 客户端插件：在输入框工具行加一个「简而言之」图标按钮——**点一下，输入框填入
`简而言之` 四个字，并立刻发送**。

当前版本 **0.1.0**。

## 它做了什么

- **一次点击两步动作**：先 `inputActions.setDraft('简而言之')`，再 `inputActions.submit()`。
  两步都走 `conversation.input.right` 插槽标准 props 里的**同一个输入机**（DTO 由
  `client-ui-conversation` 提供），所以和「手打四个字 + 点发送」完全等价：普通用户消息、
  附件照常带上、Agent 运行中按队列语义排队。
- **位置**：注册在 `conversation.input.right`（`order: 1`）。该插槽是 `conversation.composer.bar`
  右半组，渲染顺序为 `[附件] [权限/计划] [左侧…] —— [压缩上下文] [本按钮] [模型选择器] [活动区] [停止] [提交]`。
- **状态不靠本地计时器**：按钮的忙碌态直接读输入机的 `phase`。`phase === 'plain'` 才可点；
  `adjudicating / claimed / submitting / sending` 时按钮禁用并转 loading 环，等 Host 结算后
  自动恢复——不会出现「本地已显示发送成功、实际被拒」的假反馈。
- **权限跟原生一致**：`useAccess('session/prompt') === false` 时整颗按钮不渲染，和原生
  Send 按钮的显隐规则一致。
- **图标与应用同源**：用 `@deepseek-ai/dsh-client-ui-primitives` 的产品图标
  `IconSparkleRegular`（忙碌态 `IconLoadingOutlineRegular`），16px 网格、`currentColor`、
  regular 描边，与旁边的模型选择器/提交按钮一致。
- **零侵入**：纯 client 半边插件（host 半为空 `apply`），只注册官方槽位；不改平台文件、
  不注入 DOM、不碰 `app.asar`；样式全部走 `--dsw-*` token，浅色/深色共用一套。
- **多语言**：`brief-send` 命名空间下注册 zh/en，跟随 DSH 语言设置实时切换。
  发送的正文永远是 `简而言之`，不随界面语言变化。

## 行为边界

| 情况 | 行为 |
| --- | --- |
| 输入框已有文字 | **被替换**成 `简而言之`（随后发送）；这是「填入四个字」的字面语义 |
| 输入框有附件 | 附件保留，随 `简而言之` 一起发出 |
| Agent 正在运行 | 走 `submit()` 的队列语义，和点发送一样排队，不会中断当前回合 |
| 输入机忙碌（正在发送/裁决/执行命令） | 按钮禁用、转 loading 环，点击无效 |
| 当前会话没有 `session/prompt` 权限 | 按钮不渲染 |
| 全新空白会话还没有 `sessionId` | 插槽为 session 作用域，不渲染 |
| 首次点击后同一渲染帧内二次点击 | `useRef` 锁吸收，只提交一次 |

## 安装位置（本机）

- 插件源码：`~/.dsh/plugins/dsh-client-ui-brief-send`
- 生效方式：`profiles/desktop/package.json` 的 `dependencies` 里 `link:` 指向它，
  `node_modules/dsh-client-ui-brief-send` 是指向它的符号链接，
  `profiles/desktop/cordis.patch.yml` 的 `- insert:` 列表里有一行挂载条目。

**热加载**：源码在 `~/.dsh/plugins`，不在 profile 目录内。首次挂载需要重启 DSH 让客户端
插件图读取包清单；之后改 `lib/client.js` 若没有自动重组，刷新页面即可。

## 测试

```sh
cd ~/.dsh/plugins/dsh-client-ui-brief-send
node --test test/          # 6 条：槽位、setDraft→submit 顺序、tooltip/aria、权限门、忙碌态、样式
```

## 手工回滚

```sh
cd ~/.dsh/profiles/desktop
rm node_modules/dsh-client-ui-brief-send           # 摘掉符号链接
pkill -f "DeepSeek Harness" ; open -a "DeepSeek Harness"
```

然后把 `cordis.patch.yml` 里 `dsh-client-ui-brief-send` 那两行、`package.json` 里对应的
`link:` 依赖删掉（或直接用同目录下 `.bak.*` 备份覆盖回去）。
