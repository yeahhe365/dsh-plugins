# dsh-composer-kit

把原先五个独立插件合并成的一个 bundle。五个控制件的行为、slot、order、CSS 和文案都按原样保留，只改打包方式。

| # | 原插件 | 注册位置 | order | 作用 |
|---|--------|----------|-------|------|
| 1 | `dsh-client-ui-new-session` | `conversation.input.left` | -100 | 工具行最左侧的「新会话」按钮，在当前工作区开会话并继承当前预设 |
| 2 | `dsh-client-ui-compact-button` | `conversation.input.right` | 0 | 工具行右侧的「压缩上下文」按钮，提交 `/compact` |
| 3 | `dsh-client-ui-brief-send` | `conversation.input.right` | 1 | 工具行右侧的「简而言之」按钮，写入草稿并直接提交 |
| 4 | `dsh-client-ui-composer-dock-wrap` | 无 slot（纯 CSS） | — | 让输入框下方状态行换行，而不是被压成省略号 |
| 5 | `dsh-call-meter` | `conversation.composer.dock` | 3 | 状态行里的实时调用计数（最近 60 秒），含 popover 明细 |

## 为什么是一个包而不是五个

- 浏览器侧只认「id 等于包名」的那一个模块，五个包就是五个模块、五份 CSS 标签、五个 locale 命名空间；合并后是一个模块、一份 `client/client.js`。
- 四个纯 client 插件原本不声明 `dsh.bundle`，只能靠 profile 的 `cordis.patch.yml` 手写 `insert` 挂载，在「设置 → 插件」里看不到、开关不了；现在它是一个正常 bundle，可见、可开关、可卸载。
- `composer-dock-wrap` 的 CSS 本来就是为 dock 行里的调用计数写的（见其源码注释），两者分开维护没有意义。

## 结构

```
index.js            Host 半：llm/stream 观察 + GET /api/dsh-call-meter/stats
client/client.js    浏览器半：五段控制件，由 scripts/build-client.mjs 生成
cordis.patch.yml    一行 insert（id: composer-kit）
locale/{en,zh}.json 插件管理器里的标题与描述
icon.svg            图标
```

## 生成与校验

`client/client.js` 不是手写的：它由 `scripts/build-client.mjs` 从五个源包的
`window.__ModuleLoader__.load({ factory })` 文件里逐字抽出 factory 主体，各自套一层
IIFE（保留各自的 `module`/`exports` shim），再合成一个模块。

```sh
node scripts/build-client.mjs          # 重新生成
node scripts/build-client.mjs --check  # 只比对是否过期
node --test test/client.test.mjs       # 注册/apply/顺序/样式/逐字一致性
```

测试会在 mock 的 `window.__ModuleLoader__`、`document` 和 client context 上真跑一遍
factory 与 apply，断言四个 slot 的 id 与 order、四个 locale 命名空间、五份样式表，
并逐字比对每段主体与源包一致。

源包路径默认是 desktop profile 的 `.vendor`；换机器时用 `DSH_PROFILE_DIR` 覆盖。

## 已知限制

- 只验证到 DSH 0.2.2-rc.3（`engines.dsh` 写的是 `>=0.2.1-rc.3 <0.3.0`）。
- Host 半的统计路由仍是 `/api/dsh-call-meter/stats`（浏览器半的 `ENDPOINT` 与之一致），
  改名需要同时改两处。
- 合并后五件同进退：一个控制件出问题会拖累整包；要单独回滚，见下。

## 回滚

源包仍在 `~/.dsh/profiles/desktop/.vendor/` 里，未删除。回滚 = 摘掉本 bundle，把
`cordis.patch.yml` 里那四段 `insert` 与 `dsh-call-meter` 的 bundle 条目恢复。
