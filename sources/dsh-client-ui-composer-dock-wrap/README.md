# dsh-client-ui-composer-dock-wrap

让输入框下方那行状态组件自动换行，不再被挤成省略号。

## 问题

输入框下方（`conversation.composer.dock` 插槽）是一行 flex 状态栏，宿主的样式是：

```css
.JZLxKW_dock{justify-content:center;align-items:center;gap:12px;max-width:100%;padding-top:4px;display:flex}
```

三个原因叠在一起导致"显示不完整"：

1. 没有 `flex-wrap`，永远只有一行；
2. 各组件是 `flex:none`（调用计数、上下文环）或可收缩的 `inline-flex`（轮次/步数、用量），宽度不够时后者把自己的文字压成 `…`；
3. `white-space:nowrap`，所以不会在组件内部折行。

装上调用计数、用量、成本等插件后，这一行放不下，于是「531M tok · 缓存…」这类读数被截断。

## 做法

只注入一段样式表，不改宿主包、不碰任何组件逻辑：

```css
[data-composer-dock]{flex-wrap:wrap!important;row-gap:2px}
[data-composer-dock]>*{flex-shrink:0}
[data-composer-dock]>*>*{flex-shrink:0}
```

- `flex-wrap:wrap`：放不下就换到下一行；
- `row-gap:2px`：换行后行间收紧，横向 12px 的 `column-gap` 沿用宿主规则，横向节奏不变；
- `flex-shrink:0`：组件永远不窄于自身内容，"换行"不会退化成"继续截断"。

**第二层选择器不是多余的**：插槽入口都包在一个 `style="display:contents"` 的 anchor 里（见 `@deepseek-ai/dsh-client-ui-renderer` 的 `SlotOutlet`），真正成为 flex item 的是入口自身的根元素，比 dock 的直接子级深一层。`>*` 覆盖宿主自带的 `ContextMeter`，`>*>*` 覆盖 `display:contents` 后面的插件组件。

`!important` 是必需的而非防御性的：宿主规则是同文档里的 CSS module，选择器特异性相同，注入顺序在宿主 bundle 与本插件之间没有保证。

## 实测

用宿主真实 CSS + 各组件真实几何搭对照页（`/tmp/dock-test`，临时），在 Chrome 里量：

| 容器宽 | 改前 | 改后 |
|---|---|---|
| 900px | 1 行，无截断 | 2 行，无截断 |
| 720px | 1 行，**2 处截断**（`115>104`、`170>97`） | 2 行，无截断 |
| 560px | 1 行，**3 处截断** | 3 行，无截断 |
| 420px | 1 行，**3 处截断**（最窄压到 19px） | 3 行，无截断 |

即：宽度一紧，改前是"挤掉文字"，改后是"多占一行"。

## 结构

| 文件 | 作用 |
|---|---|
| `lib/index.js` | node 半，空 `apply`，只为让这行出现在 profile 树里 |
| `lib/client.js` | 浏览器半：模块加载时注入样式表，`apply` 只登记卸载钩子 |

挂载方式：`insert`（市场面板看不到），profile 的 `package.json` 里是 `link:` 依赖。

## 卸载

两处一起改，漏一处会报 `Cannot find package` 或残留挂载：

1. `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 删掉 `dsh-client-ui-composer-dock-wrap`；
2. `~/.dsh/profiles/desktop/cordis.patch.yml` 的 `insert` 段删掉对应 `- id:` 条目；

然后重启 App。
