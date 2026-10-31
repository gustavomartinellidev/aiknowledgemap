# Phase 0 Research: Mobile Drill-Down Navigation

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-10-31

All findings below come from reading the current `public/js/app.js` (383 lines),
`public/css/style.css`, the three entry documents, `_headers`, and the three
`data.json` files on branch `feat/002-mobile-drilldown` at `efe7165`. No external
research was needed; every unknown is answerable from the codebase and standard web
platform behavior.

## R1 — Can `renderTree()` be reused as-is, or does it need extraction? {#r1}

**Finding.** The D3 code is not a function today; it is top-level script. Three things
run at script start, before any data: `vis` (appends `<svg width=1580 height=800>` into
`#body` and a `<g>` inside it), `measureCanvas` (the hidden `.text-measure` group), and
`labelWidthCache`. `update(source)` reads `vis`, `tree`, `measureCanvas`, `root`, `i`,
`margin`, `duration` from module scope. The `d3.json` callback builds `root`, collapses
every node below the root, and calls `update(root)`.

Unmounting therefore needs three things the current shape cannot give: a way to
recreate `vis`/`measureCanvas` (they are `const`), a way to re-run the collapse so a
remount starts in the initial state (FR-004), and a way to stop in-flight transitions
(a mode switch during the 1,250 ms expand animation must not leave a transition
mutating a detached SVG).

**Decision.** Smallest-diff extraction, with `update()` byte-identical:

- `const vis = …` and `const measureCanvas = …` become `let vis, measureCanvas;` at
  module scope. `mountTree()` performs exactly the two chained `d3.select("#body").append("svg")…` /
  `vis.append("g").attr("class","text-measure")…` calls that are at top level today,
  assigning the results. Same attributes, same order, same insertion point.
- `resetTree()` holds the `collapse` function and the `root.x0 = height / 2; root.y0 = 0;`
  plus `root.children.forEach(collapse)` lines, moved verbatim out of the fetch callback.
- `unmountTree()`: `d3.select("#body svg").selectAll("*").interrupt(); d3.select("#body svg").remove(); clearTimeout(hideTimer); hoverPanel.classed("hidden", true);`
- `labelWidthCache` persists across remounts (font metrics do not change), as today.
- The dead `nodeEnter.append("title").text(d => d.data.description)` stays; removing it
  changes the DOM (empty `<title>` elements) and FR-018 forbids any desktop change.
- Desktop timing is preserved: `applyMode()` — and through it `mountTree()` — runs
  synchronously in the same script evaluation, immediately before `d3.json(...)` and
  after every module-level `const`/`let` it depends on (`mqNarrow`, `mqStandalone`,
  `hoverPanel`, `DD_STRINGS`). The script is `defer`red, so this is still before first
  paint and before data, and the pre-data page height (`#body` with an empty 1,580 × 800
  SVG) is unchanged. It must **not** be called at today's SVG-creation line (~16): those
  `const`s are declared later and would be in the temporal dead zone.

**Alternatives considered.** (a) Leave the SVG permanently in the DOM and hide it with
CSS at ≤ 960 px — rejected: `getBBox()` on a `display:none` SVG returns zero widths, so
any `update()` run while hidden corrupts the layout cache, and FR-004's "fresh state"
would still need the collapse to re-run. (b) Full rewrite of the tree into a
`renderTree()` closure — rejected: larger diff, higher FR-018 risk, no benefit.

## R2 — Mode predicate and change subscription {#r2}

**Finding.** `style.css` already uses `@media (max-width: 960px)` (single-column
`.info-grid`). `matchMedia("(max-width: 960px)")` evaluates the same condition the same
way (inclusive of 960 px), so there is no 1-px band where CSS and JS disagree. All three
manifests declare `"display": "standalone"`, so `matchMedia("(display-mode: standalone)")`
is a reliable installed-app signal on Android/Chromium, desktop Chromium, and iOS Safari
(supported since Safari 13; `navigator.standalone` is the pre-13 legacy and is not
needed for the supported range).

`MediaQueryList.addEventListener("change", …)` is supported in Chromium 45+, Firefox 55+,
Safari 14+. Safari 13 only has the deprecated `addListener`.

**Decision.**

```text
mqNarrow     = matchMedia("(max-width: 960px)")
mqStandalone = matchMedia("(display-mode: standalone)")
isDrilldown  = () => mqNarrow.matches || mqStandalone.matches
subscribe(mq, fn): (mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn))
```

`applyMode()` computes `isDrilldown()`, compares with `currentMode`, and on a change
calls the outgoing renderer's unmount then the incoming renderer's mount. It is called
once at script start (before data) and from both `change` subscriptions. The fetch
callback calls `applyMode()` again defensively, then `update(root)` only if the tree is
mounted, or `renderScreen()` only if drill-down is mounted.

The CSS panel override uses the combined query `@media (max-width: 960px), (display-mode: standalone)`
so stylesheet and script share one definition of "drill-down conditions" (see R8).

**Alternatives considered.** `window.innerWidth` + `resize` listener — rejected: must
be debounced, disagrees with CSS on scrollbar width, and has no standalone signal.
User-agent sniffing — rejected by the spec (FR-001).

## R3 — Does FR-014 need CSS, or can `movePanel` clamping cover it? {#r3}

**Finding.** There is no clamping. `showPanel` sets
`left = event.pageX + 10`, `top = event.pageY + 10`; `movePanel` does the same. The
panel is `position: absolute; min-width: 200px; max-width: 400px`. On a 360 px viewport
a tap at x = 200 places a 200–400 px-wide panel from x = 210 outward — off-screen.
`body { overflow-x: hidden }` suppresses the scrollbar, so the overflow is invisible
rather than scrollable: the panel is clipped, which fails FR-014 either way.

**Decision.** CSS-only override, no change to any panel function:

```css
@media (max-width: 960px), (display-mode: standalone) {
  #hover-panel {
    position: fixed;
    left: 1rem !important;   /* beats the inline left/top that showPanel writes */
    right: 1rem;
    top: auto !important;
    bottom: 1rem;
    min-width: 0;
    max-width: none;
    max-height: 60vh;
    overflow-y: auto;
  }
}
```

Author-stylesheet `!important` declarations override inline styles that are not
`!important`, which is exactly what D3's `.style("left", …)` writes. The panel becomes a
bottom sheet: always fully inside the viewport, never wider than it, scrollable if a
definition plus model examples exceed 60 vh. Everything else — content, the
`::after` copy label, `.copied` feedback, the 300 ms hide timer, `mousedown` copy,
dark-mode colours — is inherited unchanged.

**Dismissal on touch.** Today the panel closes on `mouseout` of a node (synthesized on
touch when tapping elsewhere) and on `mouseleave` of the panel. The drill-down wires only
`click` on row names, so it adds one document-level `click` listener (registered in
`mountDrilldown`, removed in `unmountDrilldown`) that hides the panel immediately when the
click target is outside `#hover-panel` and outside a `.dd-name` button; and every
`renderScreen()` hides the panel first (Story 3 scenario 4). The panel's own
`mousedown → copy` still fires on a touch tap, as it does today — existing behavior, kept.

**Alternatives considered.** Clamping in `movePanel` (JS) — rejected: it edits shared
panel code the brief wants untouched, and a pointer-anchored panel on a phone still
covers the row that was tapped. Rendering the definition inline under the row —
rejected by the spec (FR-005, FR-013).

## R4 — Which tree does the drill-down walk? {#r4}

**Finding.** The fetch callback collapses every node below the root by *moving*
`children` to `_children` (`toggle` does the same on click). After load, every section
under the root has `children === null`. A drill-down that reads `d.children` would show
seven top-level rows with nothing beneath them.

**Decision.** Walk the same `d3.hierarchy` object `root`, read-only, via
`kidsOf(d) = d.children || d._children || []`. The drill-down never calls `toggle`,
never assigns `children`/`_children`, and never calls `update`. Benefits: `d.depth`
and `d.data` come for free (needed by `showPanel(event, d)` — which reads `d.data.name`,
`d.data.short_definition`, `d.data.model_examples` — and by the `node_click` payload),
and node identity is stable across both renderers. Because the drill-down does not
mutate, and `resetTree()` re-collapses on every tree mount, FR-004 holds in both
directions.

**Alternatives considered.** Walking the raw JSON (`root.data`) — rejected: needs a
`{ data: node }` shim for `showPanel`, manual depth tracking, and two notions of "node".

## R5 — Names for the two new `action` values {#r5}

**Finding.** Existing values are `"expand"`, `"collapse"`, `"leaf"` — single lowercase
words describing what happened to the node.

**Decision.** `"drill"` (the visitor descended into a node) and `"up"` (the visitor
returned to an ancestor via a crumb or the back control, regardless of how many levels).
Payload unchanged otherwise: `node_label` and `depth` are those of the node whose list is
shown *after* the action (FR-025). The root's list is `depth: 0`, label = root name.

**Alternatives considered.** `"open"` — collides in meaning with outbound links;
`"enter"/"back"` — "back" misdescribes a crumb that jumps three levels.

## R6 — Markup, roles, and focus for the drill-down {#r6}

**Finding.** `#body` is an empty `<div>` inside `<main class="container">`; the page's
heading order is `h1` (header) then `h2`s (info cards). No landmark or heading exists for
the map region. Lighthouse's mobile run emulates a phone and will render this view.

**Decision** (full contract in [contracts/drilldown-dom.contract.md](./contracts/drilldown-dom.contract.md)):

- Container `<div class="dd">` appended to `#body`.
- `<nav class="dd-crumbs" aria-label="{breadcrumb}">` → `<ol>`; ancestor segments are
  `<li><button type="button">`; the current segment is `<li aria-current="page">` plain
  text — **except at the top level**, where the single "Home" crumb is a `<button
  aria-current="page">` whose action is "open the root's definition" (FR-007).
- `<button type="button" class="dd-back">` with the localized "Back" label; omitted at
  the top level (FR-008).
- `<h2 class="dd-title" tabindex="-1">` = current node's name (root name at the top).
  Keeps h1 → h2 order; receives focus after every screen change so screen readers
  announce where the visitor is before the rows.
- `<ul class="dd-list">` → `<li class="dd-row">` containing `<button class="dd-name">`
  (full name, wrapped) and, when applicable, a trailing `<button class="dd-open"
  aria-label="{open: name}">` (has children) or `<a class="dd-open" href target="_blank"
  rel="noopener noreferrer" aria-label="{openLink: name}">` (linked leaf). Glyphs
  (`›`, `↗`) are `aria-hidden`. Definition-only leaves have no trailing control.
- Minimum 48 × 48 px for every control and ≥ 8 px between the two targets in a row
  (Lighthouse SEO "tap targets" audit).
- Long breadcrumbs wrap (`flex-wrap`); no segment is hidden or ellipsised, so "Home" is
  always one tap away (SC-002). A `title`-free, fully visible wrap is simpler than
  middle-collapsing and passes the spec's edge case.

**Alternatives considered.** `role="tree"` / `role="treeitem"` ARIA pattern — rejected:
a one-level-at-a-time list is not a tree widget; native buttons in a list need no ARIA
and score cleaner. Focusing the first row — rejected: implies a selection and loses the
"where am I" announcement.

## R7 — Where the new strings live {#r7}

**Finding.** Every existing localized string in `app.js` is a small object keyed by
`getLang()` → `"en" | "pt-br" | "es"` (`getSignupMessage`, the newsletter error map).
The citation templates key off `document.documentElement.lang` instead — a separate map
that this feature does not touch.

**Decision.** One module-level `DD_STRINGS` table with the same three keys and a
`ddText(key, name)` accessor that falls back to `"en"`, placed next to
`getSignupMessage`. Keys and values are fixed in
[contracts/i18n-strings.contract.md](./contracts/i18n-strings.contract.md). No English
literal appears in the renderer.

## R8 — CSS placement and desktop invariance {#r8}

**Finding.** The brief asks for new rules "under the existing 960 px media query", but
the installed app uses drill-down at any width (FR-003), and a 1,200 px standalone
window would then render an unstyled list.

**Decision.** Two groups:

1. **Component rules** (`.dd`, `.dd-crumbs`, `.dd-back`, `.dd-title`, `.dd-list`,
   `.dd-row`, `.dd-name`, `.dd-open`) are class-scoped and *unconditional*. They cannot
   touch desktop output because the elements do not exist in desktop mode. Each gets a
   `.dark-Mode .dd-…` override in the existing dark-mode block, using the existing
   tokens (`--text-main`, `--border`, `--primary`, `--card-bg`).
2. **Panel override** is gated on `@media (max-width: 960px), (display-mode: standalone)`
   (R3), the same conditions the JS predicate ORs together.
3. **One mode-scoped rule on an existing element**: `#body.dd-mode { overflow: visible }`,
   toggled by the drill-down mount/unmount, so the sticky `.dd-head` sticks to the window
   rather than to `#body`'s own (never-scrolling) overflow box. Absent in desktop mode.

No existing selector is edited. FR-018 is then auditable two ways: the diff shows only
additions scoped to `.dd-*`, `#hover-panel` inside a mobile/standalone query, and
`.dark-Mode .dd-*`; and quickstart Gate B compares desktop screenshots pixel-for-pixel.

## R9 — Verification tooling for a repo with no tests {#r9}

**Finding.** Locally available: `google-chrome`, ImageMagick (`compare`, `magick`),
`node`/`npx`, `python3`. No test framework, and the constitution forbids adding build
tooling to the site.

**Decision.** All gates are shell commands or manual steps documented in
[quickstart.md](./quickstart.md); none add a dependency to the repo:

- Parity: the existing element-sequence `diff`.
- Pixel-identical desktop (SC-005): `google-chrome --headless --screenshot
  --window-size=1400,2200` of `main` and of the branch, both served locally, compared with
  `compare -metric AE` → must print `0` for each locale.
- Mode thresholds: DevTools device toolbar at 360, 960, 961 px; rotation by toggling
  dimensions live.
- Standalone: `google-chrome --app=http://localhost:8000/` opens an app window that
  matches `(display-mode: standalone)`.
- Lighthouse: PSI (or `npx lighthouse`) on the three production URLs, mobile **and**
  desktop form factors, before and after merge.
- Analytics: Umami dashboard on production only.

## R10 — What Lighthouse mobile will see {#r10}

**Finding.** Lighthouse's default mobile run emulates a 412 px-wide device. On this
branch that renders the drill-down view, so the Accessibility and SEO categories audit
the new DOM. Relevant audits: `button-name`, `link-name`, `heading-order`,
`color-contrast`, `tap-targets` (SEO), `aria-allowed-attr` (for `aria-current` on a
button — allowed), `list` / `listitem` (only `<li>` inside `<ul>`/`<ol>`).

**Decision.** The DOM contract satisfies each audit by construction (R6). Gate G in
quickstart runs Lighthouse on **both** form factors on all three URLs and records the
four scores; any score below 1.0 blocks merge (Principle IV).

## R11 — Cache-busting, changelog, and file set {#r11}

**Finding.** Current references: `style.css?v=3`, `app.js?v=2`, identical across the
three documents. `_headers` caches `/css/*` and `/js/*` for 24 h. `CHANGELOG.md` has an
`[Unreleased]` section with `Added` / `Changed` subsections.

**Decision.** `style.css?v=4`, `app.js?v=3` in all three documents (the only
`index.html` edits). One `Added` bullet in `[Unreleased]` describing the mobile
drill-down. No `sitemap.xml` or `llms.txt` change (no new page).

## R12 — Live switch during an in-flight transition or open panel {#r12}

**Finding.** A desktop expand runs a 1,250 ms D3 transition; the panel has a 300 ms
hide timer. A rotation mid-animation or with the panel open must not leave either
running against a removed renderer.

**Decision.** Both unmount functions (a) `clearTimeout(hideTimer)` and hide the panel
synchronously, and (b) for the tree, `interrupt()` every transition under the SVG before
removing it. D3 transitions on removed elements are harmless but `interrupt` makes the
teardown deterministic. The drill-down has no transitions.

## Resolved unknowns summary

| Unknown (from the brief) | Resolution |
| --- | --- |
| Reuse `renderTree()` as-is or extract? | Minimal extraction: `const → let` for `vis`/`measureCanvas`, `mountTree()`/`unmountTree()`/`resetTree()`; `update()` body untouched (R1). |
| Does FR-014 need CSS? | Yes — no clamping exists. CSS bottom-sheet override under the combined mobile/standalone query; zero panel-JS change (R3). |
| Names of the two `action` values | `"drill"` and `"up"` (R5). |

Additional decisions made by research: hierarchy walk via `children || _children` (R4);
DOM/focus contract (R6); string table (R7); CSS placement deviation (R8); gate tooling
(R9, R10); version bumps and changelog (R11); teardown ordering (R12).

**Constitution re-check after Phase 1 design: PASS 7/7.** Nothing in R1–R12 introduces
a server, a locale-specific markup difference, an un-bumped cached asset, a head change,
a direct push, a new event name, or a third-party resource.
