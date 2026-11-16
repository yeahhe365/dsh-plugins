# dsh-call-meter

在 DSH Web 输入框下方显示**最近 60 秒内发起的模型调用次数**，每 1 秒刷新一次。

- **按发起计数**：一次请求从 `llm/stream` 派发的那一刻就进入窗口，不等它结束。配额是按发起扣的，一分钟的长回答也不该让仪表显示 0。之后再结算成 `ok` / `failed` / `abandoned`，只有首个终止 `finish` 能结算一次，重复的 finish 不会重复计数。
- **失败可见**：provider 报错、被限流、被中止的调用与成功的调用一起计入总数，并单独统计失败数与失败格（柱状图转成警示色）。重试按尝试各计一次——429 风暴期间数字会上去，而不是安静地显示 0。
- **进行中可见**：有请求在流式进行时，数字左侧亮一个呼吸点；这是旧版本里唯一看不出来的状态。
- **行内 pill**：作为 `conversation.composer.dock` 的第三个条目与宿主自带的 `activity` / `usage` 并排，不再用 `:has()` + 绝对定位在 dock 里伪造第二行，也不改 dock 的内边距与高度。
- **可点开的详情**：自建浮层（portal 到 `document.body`，因为停靠的 composer 是 fixed 后代的包含块）。鼠标悬停、键盘聚焦、点击/轻触都能打开，Escape 与外部点击关闭；同时有一份常驻的 `aria-describedby` 说明文本，读屏与不支持悬停的设备同样能拿到全部读数。
- **读不到时不自欺**：单次请求 3 秒超时，失败后指数退避（0.8 s → 10 s）。有旧数据时保留数字但变淡、亮警示点，并在详情里写明「计数已 N 秒未更新」；没有数据时显示 `—`。
- **省着用**：1 秒一次轮询（一格 = 5 秒，再快没有信息量），标签页隐藏即停、回来立即补一次；快照没变化时沿用旧 state，React 直接 bail out，不重渲染。
- **口径**：Host 侧监听 `llm/stream` 瀑布，跨会话、跨子智能体全局计数。`abandoned` 表示流结束却没有终止 finish，或消费者提前放弃——它计入总数，但既不算成功也不算失败。

## 实现

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半侧：`llm/stream` 上登记尝试（时间戳 + provider/model），透传包装器只观察终止 finish 做一次性结算；通过 `connection.fetch.register` 挂载 `GET /api/dsh-call-meter/stats`，返回滚动 60 秒统计。 |
| `client/client.js` | 浏览器半侧：向 `conversation.composer.dock` 注册 pill，1 秒轮询、可见性感知、超时与退避、快照指纹去重；自建 tooltip 浮层。 |
| `cordis.patch.yml` | 插入一行 `call-meter`，加载包主入口。 |
| `locale/*.json` | 插件管理器里的标题与描述；运行期文案在 `client.js` 的 `zh` / `en` 字典里，走 `ctx.locale`。 |
| `icon.svg` | 插件列表图标。 |

计数只保留最近 5 分钟的时间戳（上限通常几十条），响应不含 token、消息内容或会话 id。
轮询路由走同源 Cookie 鉴权，不需要额外凭据。

## 安装

在 DSH Desktop 的 **插件 → 添加插件** 里填本目录的绝对路径，安装后选择**立即启用**；或在 profile 里：

```sh
dsh plugin --profile <name> add /绝对路径/dsh-call-meter
```

装好后刷新页面，输入框底部会出现「近 1 分钟 N 次」。没有会话（首页 hero 输入框）时 dock 不渲染，这是宿主槽位本身的限制；进入会话后常驻。

## 可调项

`client/client.js` 顶部：

- `REFRESH_MS`（默认 1000）：轮询间隔。
- `RETRY_MS` / `RETRY_MAX_MS`（默认 800 / 10000）：失败退避的起点与上限。
- `FETCH_TIMEOUT_MS`（默认 3000）：单次轮询的截止时间。

Host 侧 `index.js` 顶部：`WINDOW_MS`（60 秒）、`KEEP_MS`（5 分钟）、`BUCKET_MS`（5 秒/格）、`ROUTE_ROWS`（详情里最多几行来源）。
