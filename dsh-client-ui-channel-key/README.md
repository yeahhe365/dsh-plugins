# dsh-client-ui-channel-key

A key button in the conversation header that edits the API key of the model
channel behind the current model selection. · 对话顶栏的钥匙按钮：编辑当前模型渠道的
API 密钥。

## What it adds

One 28px key control joins the header's right-aligned utilities row, immediately
left of the Session's `⋯` (More) menu. It is visible in every Session that has a
model selected.

Clicking it opens a small card anchored under the button:

| Row | Meaning |
|---|---|
| 当前渠道 | The provider and model the composer's model seat currently points at |
| 凭证引用 | The credential reference that channel resolves, e.g. `KK_API_KEY` |
| Status | `已配置` with the Host-generated masked preview, or `未配置` |
| API 密钥 | A write-only field; `显示` / `隐藏` toggles it, `Enter` saves |

`保存` stores the key, `清除密钥` removes it, `取消` or `Esc` or a click outside
closes the card.

## How the reference is chosen

1. The current selection comes from the same per-session model directory the
   composer's model seat reads, so the card names the channel a new request would
   use at the moment it opened. Switching models while the card is open does not
   re-target it; reopen the card to address the new channel.
2. That provider's profile is located through the Host's configurable-provider
   directory plus the redacted settings view, and its `apiKeyEnv` is the
   reference.
3. A profile that names no reference gets the conventional
   `<PROVIDER>_API_KEY` reference (`kk` → `KK_API_KEY`), and saving writes that
   `apiKeyEnv` into the provider profile before storing the key, so the typed key
   is the key the next request resolves.

## Behavior and limits

- The key travels to this profile's credential store through the same Host API
  the Models settings page uses. It never enters the session log, the settings
  document, or `cordis.patch.yml`.
- Reads are redacted: the field starts empty even when a key is stored, and the
  stored value is only ever shown as the Host's masked preview. Leaving the field
  empty and pressing `保存` is rejected — use `清除密钥` to remove a key.
- Validation mirrors the Models page: after trimming, the key must be non-empty
  printable ASCII with no wrapping quotes and no `NAME=value` shape.
- `deepseek-account` channels have no editable key and the card says so. A
  session with no selected model (including an addressed subagent session, which
  has no model directory) shows that instead of a field.
- A key is applied by the next request; nothing is re-sent or retried here.
- Turning the plugin off removes only the button. Stored keys and any `apiKeyEnv`
  it wrote stay in place.

## Files

| File | Role |
|---|---|
| `index.js` | Host half — mounts the bundle row, contributes nothing |
| `client/client.js` | Browser half — header slot registration, card, Host calls |
| `cordis.patch.yml` | Inserts the bundle row |
| `locale/*.json` | Plugin Manager title and description |
