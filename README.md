# dsh-plugins

我在 [DSH]（DeepSeek Harness）桌面端里自己写的插件。全部是本地包，不走 npm，不含任何密钥。

在 `desktop` profile 上验证的版本：**DSH 0.2.2-rc.5**。

## 有什么

| 目录 | 包名 | 版本 | 挂载方式 | 作用 |
|---|---|---|---|---|
| `dsh-composer-kit/` | `dsh-composer-kit` | 1.0.0 | bundle | 输入框五件套：新会话、压缩上下文、简而言之、状态行换行、调用频率计 |
| `dsh-client-ui-channel-key/` | `dsh-client-ui-channel-key` | 1.4.0 | bundle | 顶栏按钮（新建会话页同样显示）：编辑当前模型渠道的密钥池；密钥被判失效时宿主自动换下一个，可自检、查余额 |
| `dsh-llm-route-retry/` | `dsh-llm-route-retry` | 0.1.0 | insert | 池化中转「无额度」返回 AUTH 时重试 |
| `sources/` | 5 个包 | — | 已并入 kit | `dsh-composer-kit` 的构建输入（合并前的原始插件） |

`sources/` 不是可安装的插件，是 `dsh-composer-kit` 的构建输入：kit 的 `client/client.js`
由 `scripts/build-client.mjs` 从这五个包的 `window.__ModuleLoader__.load({ factory })`
文件里逐字抽出 factory 主体合成。仓库自带 `sources/` 是为了让 kit 能在任何机器上
`npm run build` 且测试可复现。

## dsh-composer-kit 明细

| 控制件 | slot | order | 来自 |
|---|---|---|---|
| 新会话按钮 | `conversation.input.left` | -100 | `sources/dsh-client-ui-new-session` |
| 压缩上下文按钮 | `conversation.input.right` | 0 | `sources/dsh-client-ui-compact-button` |
| 简而言之按钮 | `conversation.input.right` | 1 | `sources/dsh-client-ui-brief-send` |
| 状态行换行（纯 CSS） | — | — | `sources/dsh-client-ui-composer-dock-wrap` |
| 调用频率计 | `conversation.composer.dock` | 3 | `sources/dsh-call-meter` |

Host 半只有一件东西：`llm/stream` 上的被动观察 + `GET /api/dsh-call-meter/stats`。

## 开发

```sh
cd dsh-composer-kit
npm run build          # 从 ../sources 重新生成 client/client.js
npm run check          # 只比对是否过期
npm test               # 6 项：注册、inject 并集、四个 slot 的 id/order、locale、样式、逐字一致
```

源包查找顺序：`DSH_COMPOSER_SOURCES` → `../sources`（本仓库布局）→
`$DSH_PROFILE_DIR/.vendor`（profile 内安装）→ `$DSH_PLUGINS_DIR`（默认
`~/.dsh/plugins`，全机器共用安装）。所以在仓库里和在实际 profile 里都能构建。

## 与 live 的关系（重要）

**这个仓库是快照，不是 live 副本。** 实际生效的插件不在仓库里：

- `dsh-composer-kit`：profile 里是 `link:` 到一个工作区目录；
- `dsh-client-ui-channel-key`、`dsh-llm-route-retry`、`sources/*`：在
  `<profile>/.vendor/` 下，或者（多 profile 共用的机器上）在 `~/.dsh/plugins/` 下。

两种布局都在用，所以脚本会按 `.vendor` → `~/.dsh/plugins` → `<profile>/plugins`
的顺序找，找到哪个用哪个，不用改环境变量。

改完 live 副本后，把改动同步进来再提交：

```sh
node scripts/sync.mjs          # live -> 仓库
node scripts/sync.mjs --check  # 只报差异（有差异时退出码 1）
```

某台机器上没装某个包时，脚本只会报 `not installed here` 并跳过，不算差异；加
`--strict` 才把「没装」也当成失败。

仓库根目录的 `.syncignore` 列出**不纳入快照**的文件（每个 live 插件是自己的 git
检出，带自己的 `.gitignore`；`sources/` 下的测试、设计笔记和市场截图也不是构建输入）。
语法跟 git 一样：不带斜杠的模式匹配任意层级，指名目录的模式连带其下所有文件。

环境变量：`DSH_PROFILE_DIR`（默认 `~/.dsh/profiles/desktop`）、
`DSH_PLUGINS_DIR`（默认 `~/.dsh/plugins`）、`DSH_COMPOSER_KIT_DIR`
（默认本仓库旁边的 `../dsh-composer-kit`）。

## 在新机器上装

1. 装 DSH，确认版本兼容（`engines.dsh` 写的是 `>=0.2.1-rc.3 <0.3.0`）。
2. 三个插件各自把目录装进 profile：

   ```sh
   dsh plugin --profile desktop add /path/to/dsh-composer-kit
   dsh plugin --profile desktop add /path/to/dsh-client-ui-channel-key
   ```

   `dsh-llm-route-retry` 不声明 `dsh.bundle`，只能写进 profile 的
   `cordis.patch.yml`：

   ```yaml
   - insert:
       - id: llm-route-retry
         name: dsh-llm-route-retry
         config:
           maxAttempts: 10
           initialDelayMs: 1500
           maxDelayMs: 8000
   ```

3. 重启桌面端。

`dsh-composer-kit` 会替换掉原来的五个独立插件。如果 profile 里还留着它们的
`insert` 行，界面上会出现两套按钮——把那些行删掉。

## 不含什么

- 不含任何 API Key、`.env`、`credentials`；`dsh-client-ui-channel-key` 只是编辑器，
  密钥存在 profile 的凭据里。
- 不含 `node_modules`。
