# dsh-llm-route-retry

宿主侧插件。只做一件事：把「池化中转这一次请求落到的通道没额度」这类失败从 `AUTH`
里捞出来，用一个小预算重试；其余错误一律不动。

## 为什么需要它

pi-ai 适配器的 `classifyPiAiError` 按状态码优先判定：

```js
if (/\b(?:401|403)\b/.test(message)) return "AUTH"        // ← 先命中
if (isQuotaExceededError(message)) return QUOTA_EXCEEDED_CODE
```

而 `AUTH` 不在任何 `retryableCodes` 白名单里（`dsh-llm/lib/types/retry-policy.js`
的默认五项是 `EMPTY_RESPONSE / RATE_LIMIT / SERVER / TIMEOUT / TRANSPORT`），所以
`llm-retry` 一个 attempt 都不会花。

但中转（new-api / kakou）背后是**一池上游 key**，按请求轮询：

- `403 {"code":"INSUFFICIENT_BALANCE"}` —— 这条通道没钱了，不是账户没钱
- `401 {"code":"USER_INACTIVE"}` —— 这条通道的 key 被禁用/过期/未分组

下一次请求换到有额度的通道就能过。实测证据（`session-4932c915`）：turn 9 拿到
403 且 `usage` 全 0（一个 token 都没产出），22 秒后同一 provider、同一 model
重发同一句，turn 10 正常回答。所以这是**通道级瞬时故障**，只是被打了 `AUTH` 标签。

## 行为

- **只接管** `code === 'AUTH'` 且报文命中标记（默认 `INSUFFICIENT_BALANCE`、
  `USER_INACTIVE`、`no usable account`）的失败。`403 Access to model denied`、
  `ModelArts.81006`、nginx 裸 403 之类不认领 —— 那类重试也是白搭。
- **自己的预算**：默认 4 次、1.5s 起、上限 8s、20% 抖动。刻意不用 provider 的 30 次，
  因为「真没钱」时不该把一轮卡十几分钟的退避。
- **落标准事件**：`llm/retry` + `llm/retry-started`（`policyKey: 'route-unavailable'`），
  所以对话里照常显示「模型请求重试」行、流式状态照常重置。
- **预算持久化**：注册 `llmRouteRetry` projection，`step/start` / `turn/end` 归零，
  重启后不会无限重试。
- **不碰**：provider 的 `retryPolicy`、其它错误码、`agent/request-error` 下游链路。
  认领之外的失败直接 `next()`，交由 `llm-retry` 照旧处理。

监听器用 `{ prepend: true }` 注册，以便在 `llm-retry` 之前给决定。

## 配置

```yaml
- insert:
    - id: llm-route-retry
      name: 'dsh-llm-route-retry'
      config:
        maxAttempts: 4        # 重试次数（不含首试）
        initialDelayMs: 1500  # 首次等待，之后翻倍
        maxDelayMs: 8000      # 单次等待上限
        jitterRatio: 0.2      # 对称抖动比例
        patterns:             # 命中即认领（大小写不敏感的子串）
          - INSUFFICIENT_BALANCE
          - USER_INACTIVE
```

非法值一律夹紧到安全区间，不抛错（旧/新配置层都能加载）。

## 测试

```bash
node --test test/          # 纯逻辑：认领规则、预算、退避、abort、下游放行
```

`test/stub-relay.cjs` 是一个 403/500 假中转，可做端到端验证：

```bash
node ~/.dsh/plugins/dsh-llm-route-retry/test/stub-relay.cjs &   # 监听 127.0.0.1:8787
echo route > /tmp/rrstub.mode    # route | denied | server

# 造一个沙箱 profile（复制 headless，加 provider 指向 stub + insert 本插件），然后：
STUB_API_KEY=test dsh <profile> "hi"
tail -f /tmp/rrstub.log
```

2026-11-12 实测（`maxAttempts: 2`，200ms/400ms 退避）：

| 场景 | stub 收到的请求 | 结果 |
|---|---|---|
| `route`（403 INSUFFICIENT_BALANCE） | 4 = 首试 2（主请求 + 标题请求并发） + 2 次重试 | 预算耗尽后抛原始 `AUTH` 错 |
| `denied`（403 Access to model denied） | 2 = 首试 2 | 不认领，0 重试（与插件前一致） |
| `server`（500） | 7 = 首试 2 + `llm-retry` 5 次 | provider 默认策略未受影响 |
