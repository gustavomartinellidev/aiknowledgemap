# Phase 1 Data Model: Mobile Drill-Down Navigation

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

No persisted data is added or changed. `data.json` (× 3 locales) and its node schema are
untouched (FR-024). Everything below is in-memory page state or a static lookup table,
and all of it is discarded on reload.

## Entity: Node *(existing, unchanged)*

The `d3.hierarchy` wrapper around one `data.json` entry, shared by both renderers.

| Field | Type | Notes |
| --- | --- | --- |
| `data.name` | string | Row label, crumb label, `<h2>` text, `node_label` in analytics. ≤ 188 chars. |
| `data.short_definition` | string | Rendered by the existing `renderPanel`. Present on all 1,448 nodes. |
| `data.model_examples` | string[]? | Rendered by `renderPanel` when non-empty. |
| `data.url` | string? | Leaves only (43). Drives the `<a class="dd-open">` trailing control and `outbound_click`. |
| `depth` | number | 0 at root. `depth` field in analytics. |
| `children` / `_children` | Node[] \| null | **Owned by the tree renderer.** Collapse moves `children → _children`. The drill-down reads `children \|\| _children \|\| []` and never writes either. |
| `id`, `x`, `y`, `x0`, `y0` | | Tree-layout bookkeeping; ignored by the drill-down. |

**Invariant N1.** The drill-down never mutates a Node. **N2.** `kidsOf(d)` is the only
way the drill-down reads children.

## Entity: ViewMode

| Value | Condition |
| --- | --- |
| `"tree"` | `!(mqNarrow.matches \|\| mqStandalone.matches)` |
| `"drilldown"` | `mqNarrow.matches \|\| mqStandalone.matches` |

Where `mqNarrow = matchMedia("(max-width: 960px)")` and
`mqStandalone = matchMedia("(display-mode: standalone)")`.

**State transitions.**

```text
            load: applyMode()
   ┌──────────────────────────────┐
   │                              │
   ▼            mq change         ▼
 "tree"  ───────────────────▶ "drilldown"
   ▲     unmountTree()            │
   │     mountDrilldown()         │
   └──────────────────────────────┘
         unmountDrilldown()
         mountTree() + update(root)   (mq change)
```

**Invariants.** V1: exactly one renderer is mounted at any time (never both, never
neither once data has loaded). V2: `#body` contains either one `<svg>` or one `div.dd`,
never both. V3: a transition always runs *unmount(old)* fully before *mount(new)*. V4:
no field of the outgoing state survives the transition (FR-004). V5: a `change` event
that does not alter `isDrilldown()` (e.g. 500 → 700 px) is a no-op.

## Entity: TreeRendererState *(existing, made restartable)*

| Field | Type | Lifecycle |
| --- | --- | --- |
| `vis` | d3 selection of `<svg><g>` | Assigned by `mountTree()`; null after `unmountTree()`. |
| `measureCanvas` | d3 selection of `g.text-measure` | Same. |
| `labelWidthCache` | `{ [name]: width }` | Module-lifetime; survives remounts (font metrics are constant). |
| `root.x0`, `root.y0`, collapse state of every node | | Reset by `resetTree()` on every `mountTree()` (initial collapsed state). |
| `hideTimer` | timeout id | Cleared by `unmountTree()`. |
| in-flight transitions | | Interrupted by `unmountTree()`. |

## Entity: DrilldownState

| Field | Type | Notes |
| --- | --- | --- |
| `path` | Node[] | `path[0] === root` always. `path[path.length - 1]` is the **current level** (the node whose children are listed). Length − 1 = depth of the current level. |
| `container` | `HTMLDivElement.dd` | Created by `mountDrilldown()`, removed by `unmountDrilldown()`. |
| `docClickHandler` | function | Registered on `document` by mount, removed by unmount (panel dismissal, R3). |

**Operations** (each ends with `renderScreen()`; see transitions):

| Operation | Precondition | Effect | Analytics |
| --- | --- | --- | --- |
| `drill(node)` | `node ∈ kidsOf(current)` and `kidsOf(node).length > 0` | `path.push(node)` | `node_click{action:"drill", node_label:node.data.name, depth:node.depth}` |
| `upTo(index)` | `0 ≤ index < path.length - 1` | `path.length = index + 1` | `node_click{action:"up", node_label:path[index].data.name, depth:index}` |
| `back()` | `path.length > 1` | `upTo(path.length - 2)` | as `upTo` |
| `read(node)` | `node ∈ kidsOf(current)` or `node === root` at top level | `showPanel(event, node)`; path unchanged | none |
| `follow(node)` | `node.data.url` present | native `<a target=_blank>` navigation | `outbound_click{node_label, url}` |

**Invariants.** D1: `path` is a prefix chain — `path[i+1] ∈ kidsOf(path[i])`. D2: the
screen always shows `kidsOf(current)`; one level, never more. D3: `renderScreen()` hides
the panel before painting and focuses `h2.dd-title` after painting. D4: at
`path.length === 1` there is no back control and the single crumb is the "Home" button
whose action is `read(root)`.

## Entity: Row *(derived, not stored)*

Computed from a child `n` of the current level at render time:

| Property | Derivation |
| --- | --- |
| `label` | `n.data.name` |
| `kind` | `kidsOf(n).length > 0 → "section"`; else `n.data.url → "link"`; else `"leaf"` |
| trailing control | `"section" → <button.dd-open>` (drill); `"link" → <a.dd-open href=url target=_blank rel=noopener noreferrer>` (follow); `"leaf" → none` |
| accessible name of trailing control | `ddText("open", label)` or `ddText("openLink", label)` |

No node is both a section and a link (verified: 0 non-leaf nodes carry `url`).

## Entity: Strings *(static table)*

`DD_STRINGS[lang][key]`, `lang ∈ {"en","pt-br","es"}` from `getLang()`, fallback `"en"`.
Keys: `home`, `back`, `breadcrumb`, `open(name)`, `openLink(name)`. Values are fixed in
[contracts/i18n-strings.contract.md](./contracts/i18n-strings.contract.md).

**Invariant S1.** Every key exists in all three locales (a missing key is a parity
violation, Principle II). **S2.** The renderer contains no string literal that reaches
the DOM except via `DD_STRINGS` and node data.

## Entity: Analytics events *(existing, extended)*

See [contracts/analytics-events.contract.md](./contracts/analytics-events.contract.md).
`node_click.action` gains `"drill"` and `"up"`; no field is added, renamed, or removed;
`outbound_click` is unchanged.

## Cross-entity invariants

- **X1 (FR-018).** When `ViewMode === "tree"`, the DOM under `#body` and every event
  emitted are identical to production today.
- **X2 (FR-004).** `DrilldownState` is constructed fresh on every `mountDrilldown()`
  (`ddPath = [root]`), and `resetTree()` runs on every `mountTree()`.
- **X3 (FR-013).** Only `#hover-panel` ever renders `short_definition` / `model_examples`.
- **X4 (FR-024).** No code path writes to any `data.*` field.
