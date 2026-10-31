# Contract: Mode Switch and Renderer Lifecycle

**Scope**: `public/js/app.js` — mode controller and the two renderers' mount/unmount obligations.
**Satisfies**: FR-001, FR-002, FR-003, FR-004, FR-018; Story 2, Story 5; research R1, R2, R12.

## M1 — Mode predicate

```text
mqNarrow     = window.matchMedia("(max-width: 960px)")
mqStandalone = window.matchMedia("(display-mode: standalone)")
isDrilldown() = mqNarrow.matches || mqStandalone.matches
```

- M1.1 The query strings are exactly as above; the first matches the existing CSS
  `@media (max-width: 960px)` byte-for-byte (inclusive boundary, FR-002).
- M1.2 No user-agent, platform, or touch-capability check participates (FR-001).
- M1.3 `isDrilldown()` is evaluated — never cached beyond a single `applyMode()` call.

## M2 — Subscription

- M2.1 Both `MediaQueryList`s are subscribed to `change` via `addEventListener`, with
  `addListener` as the fallback when `addEventListener` is absent.
- M2.2 The handler is `applyMode`; it is idempotent (M3.3).

## M3 — `applyMode()`

- M3.1 Called synchronously during initial script evaluation, immediately before the
  `d3.json(...)` call and after every module-level `const`/`let` it depends on — never
  earlier, because `mqNarrow`, `mqStandalone`, `hoverPanel`, and `DD_STRINGS` are in the
  temporal dead zone until declared. Then from every `change` event, and once more inside
  the fetch callback.
- M3.2 Computes `next = isDrilldown() ? "drilldown" : "tree"`.
- M3.3 If `next === currentMode`, returns without side effects.
- M3.4 Otherwise: `unmount(currentMode)` runs to completion, then `mount(next)`, then
  `currentMode = next`. Never mount before unmount; never leave both or neither mounted.
- M3.5 Before data has loaded (`root === undefined`), mount still runs so the desktop SVG
  is created at the same moment it is today; the drill-down mount renders nothing until
  data arrives (its `renderScreen()` is a no-op without `root`).

## M4 — Tree renderer lifecycle

- M4.1 `mountTree()` creates `<svg>` + `<g transform>` + `g.text-measure` in `#body`
  with exactly the attributes and order of today's top-level code, assigns `vis` and
  `measureCanvas`, and — if `root` exists — calls `resetTree()` then `update(root)`.
- M4.2 `resetTree()` is the current fetch-callback logic moved verbatim: `root.x0 = height / 2;
  root.y0 = 0;` and recursive collapse of every node below the root.
- M4.3 `unmountTree()` performs, in order: interrupt all transitions under `#body svg`;
  remove `#body svg`; `clearTimeout(hideTimer)`; add `hidden` to `#hover-panel`;
  set `vis = measureCanvas = null`.
- M4.4 The body of `update(source)` is **not modified** in any way (FR-018 is audited on
  the diff).
- M4.5 `labelWidthCache` is not cleared between mounts.

## M5 — Drill-down renderer lifecycle

- M5.1 `mountDrilldown()` creates `div.dd` in `#body`, adds class `dd-mode` to `#body`,
  sets `ddPath = [root]` (or `[]` until `root` exists), registers the document `click`
  handler for panel dismissal, and calls `renderScreen()`.
- M5.2 `unmountDrilldown()` performs, in order: remove the document `click` handler;
  remove `div.dd`; remove class `dd-mode` from `#body`; `clearTimeout(hideTimer)`; add
  `hidden` to `#hover-panel`; set `ddPath = []`.
- M5.3 The drill-down never calls `toggle`, `update`, or writes `children`/`_children`.
- M5.4 The drill-down reads children only through `kidsOf(d) = d.children || d._children || []`.

## M6 — Fetch callback

```text
d3.json("data.json").then(data => {
  root = d3.hierarchy(data);
  applyMode();                       // no-op if mode unchanged since script start
  if (currentMode === "tree")      { resetTree(); update(root); }
  else                             { ddPath = [root]; renderScreen(); }
});
```

- M6.1 On desktop the observable sequence is identical to today: SVG exists before data;
  collapse then `update(root)` after data.

## M7 — Invariants (testable)

| Id | Statement | How to check |
| --- | --- | --- |
| M7.1 | At > 960 px in a browser tab, `#body` contains exactly one `<svg>`, no `.dd`, and has no `dd-mode` class. | DevTools at 961 px: `document.querySelectorAll('#body > *')` → `[svg]`. |
| M7.2 | At ≤ 960 px or standalone, `#body` contains exactly one `.dd`, no `<svg>`, and has class `dd-mode`. | DevTools at 960 px / `--app=` window. |
| M7.3 | Crossing 960 px in either direction swaps M7.1 ↔ M7.2 without reload. | Resize live; check both directions. |
| M7.4 | After a swap, the new view is in its initial state. | Expand 3 nodes → narrow → list shows the 7 sections; drill 3 levels → widen → map shows only the root's children collapsed. |
| M7.5 | A swap while the panel is open closes it synchronously. | Open panel → resize → `#hover-panel.hidden` present. |
| M7.6 | A swap mid-animation leaves no transition running. | Click a node, resize within 1 s, inspect: no `<svg>` in DOM, no console errors. |
| M7.7 | Desktop DOM and screenshot are identical to `main`. | quickstart Gate B. |
