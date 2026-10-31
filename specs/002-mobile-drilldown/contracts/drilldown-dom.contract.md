# Contract: Drill-Down DOM, Accessibility, and CSS Hooks

**Scope**: the markup `renderScreen()` produces inside `#body`, its accessible semantics, focus behavior, and the class names `style.css` styles.
**Satisfies**: FR-005 … FR-012, FR-014, FR-017, FR-019, FR-023; Story 1, 3, 4; SC-001, SC-002, SC-006, SC-007; research R3, R6, R8, R10.

## D1 — Structure

```html
<div id="body">
  <div class="dd">                 <!-- #body also carries class "dd-mode" while this is mounted -->
    <div class="dd-head">          <!-- sticky: breadcrumb + back stay visible while the list scrolls -->
      <nav class="dd-crumbs" aria-label="{breadcrumb}">
        <ol>
          <!-- top level: ONE crumb, a button, aria-current, action = read(root) -->
          <li><button type="button" class="dd-crumb" aria-current="page">{home}</button></li>

          <!-- deeper levels: ancestors are buttons, current is text -->
          <li><button type="button" class="dd-crumb">{home}</button></li>
          <li><button type="button" class="dd-crumb">Machine Learning</button></li>
          <li aria-current="page" class="dd-crumb-current">Supervised Learning</li>
        </ol>
      </nav>

      <button type="button" class="dd-back">{back}</button>   <!-- omitted at top level -->
    </div>

    <h2 class="dd-title" tabindex="-1">Supervised Learning</h2>  <!-- root name at top level -->

    <ul class="dd-list">
      <!-- kind = section -->
      <li class="dd-row">
        <button type="button" class="dd-name">Classification</button>
        <button type="button" class="dd-open" aria-label="{open: Classification}">
          <span aria-hidden="true">›</span>
        </button>
      </li>
      <!-- kind = link -->
      <li class="dd-row">
        <button type="button" class="dd-name">Some Paper</button>
        <a class="dd-open" href="https://…" target="_blank" rel="noopener noreferrer"
           aria-label="{openLink: Some Paper}">
          <span aria-hidden="true">↗</span>
        </a>
      </li>
      <!-- kind = leaf (definition only) -->
      <li class="dd-row">
        <button type="button" class="dd-name">Precision</button>
      </li>
    </ul>
  </div>
</div>
```

`{…}` placeholders come from [i18n-strings.contract.md](./i18n-strings.contract.md).

## D2 — Semantics

| Id | Rule | Audit it serves |
| --- | --- | --- |
| D2.1 | Every interactive element is a native `<button type="button">` or `<a href>`; no `div` with click handlers, no ARIA roles. | `button-name`, `link-name` |
| D2.2 | `.dd-name` accessible name = the node's full name (its text). `.dd-open` accessible name = `open(name)` / `openLink(name)` via `aria-label`; its glyph is `aria-hidden`. | `button-name`, `link-name` |
| D2.3 | Breadcrumb is `<nav aria-label="{breadcrumb}">` containing an `<ol>`; only `<li>` are direct children. | `list`, `listitem`, landmarks |
| D2.4 | The current crumb carries `aria-current="page"`; it is plain text below the top level and a `<button>` at the top level (its action is `read(root)`). | FR-007 |
| D2.5 | `.dd-title` is an `<h2>` — the page's `<h1>` is in the header, so order is preserved; it has `tabindex="-1"` and receives focus after every `renderScreen()`. | `heading-order`, SC-007 |
| D2.6 | `.dd-back` is present iff `path.length > 1`. | FR-008 |
| D2.7 | A row has a trailing control iff kind ∈ {section, link}; never two trailing controls. | FR-010, FR-017 |
| D2.8 | Linked rows use `target="_blank" rel="noopener noreferrer"`; the `click` handler on the `<a>` emits `outbound_click` and does **not** `preventDefault`. | FR-016, Story 4 |
| D2.9 | Tab order within a row: `.dd-name` then `.dd-open`. Document order is crumbs → back → title → rows. | SC-007 |
| D2.10 | Enter/Space activate buttons natively; no custom key handling is required or added. | SC-007 |

## D3 — Behavior

| Id | Rule |
| --- | --- |
| D3.1 | `click` on `.dd-name` → `showPanel(event, node)` (existing function, same `#hover-panel`); path unchanged. |
| D3.2 | `click` on `.dd-open` button → `drill(node)`; on `.dd-crumb` button → `upTo(index)` (top-level "Home" → `read(root)` instead); on `.dd-back` → `back()`. |
| D3.3 | `renderScreen()` order: `clearTimeout(hideTimer)`; hide panel; rebuild `.dd` children; `h2.dd-title.focus()`; `window.scrollTo` is **not** called (focus scrolls the heading into view natively). |
| D3.4 | Document `click` listener: if `event.target` is not inside `#hover-panel` and not inside a `.dd-name`, hide the panel immediately. Registered by `mountDrilldown`, removed by `unmountDrilldown`. |
| D3.5 | No analytics on `.dd-name` clicks (panel open), per FR-025. |
| D3.6 | The renderer uses `textContent` for node names and string-table values — never `innerHTML` with node data — so a label containing `<` or `&` renders literally. (The existing `renderPanel` builds HTML from node data; that is unchanged and out of scope.) |
| D3.7 | `mountDrilldown()` adds class `dd-mode` to `#body`; `unmountDrilldown()` removes it. The class exists only while the drill-down is mounted. |

## D4 — CSS hooks and constraints

Selectors `style.css` may introduce (all new; no existing selector is edited):

| Selector | Required properties / constraints |
| --- | --- |
| `.dd` | Block container; `padding` ≥ 1rem; no fixed width. |
| `.dd-head` | `position: sticky; top: 0; z-index: 1; background: var(--card-bg)` — keeps breadcrumb and back control reachable while a 14-row list scrolls (spec edge case "Fourteen children"). |
| `#body.dd-mode` | `overflow: visible` — `#body { overflow: auto }` would otherwise be the sticky element's scroll container (which never scrolls), so the header would never stick. Mode-scoped: the class exists only in drill-down mode. |
| `.dd-crumbs ol` | `display:flex; flex-wrap:wrap; list-style:none; gap` — all segments visible, wrapping (edge case: 7 segments at 360 px). |
| `.dd-crumb`, `.dd-crumb-current` | Buttons reset to text-like appearance; min 48 px tall; `word-break: break-word`. |
| `.dd-back` | Min 48 × 48 px; visible label text. |
| `.dd-title` | Inherits `Outfit` heading font; `outline` visible on `:focus-visible`. |
| `.dd-list` | `list-style:none; padding:0; margin:0`. |
| `.dd-row` | `display:flex; align-items:stretch; gap ≥ 8px; border-bottom: 1px solid var(--border)`. |
| `.dd-name` | `flex:1; text-align:left; min-height:48px; white-space:normal; overflow-wrap:anywhere` — **never** `text-overflow: ellipsis` (FR-011, SC-001). |
| `.dd-open` | `flex:0 0 48px; min-height:48px; display:flex; align-items:center; justify-content:center; color: var(--primary)`. |
| `.dark-Mode .dd-*` | Overrides in the existing dark-mode block for background, text, border, and primary, using existing tokens; `.dark-Mode .dd-head { background: #1e293b }` matches `.dark-Mode #body`. |
| `@media (max-width: 960px), (display-mode: standalone) { #hover-panel {…} }` | Exactly the bottom-sheet override in [research R3](../research.md#r3). The only rule in this feature that targets an existing element. |

Constraints:

- D4.1 No selector outside `.dd*`, `.dark-Mode .dd*`, the mode-scoped `#body.dd-mode`,
  and the media-gated `#hover-panel` override is added or changed (FR-018, R8).
- D4.2 Component rules are **not** wrapped in a media query (standalone at wide widths).
- D4.3 Contrast of `.dd-name`, `.dd-crumb`, `.dd-back`, `.dd-open` ≥ 4.5:1 in both themes
  (they use `--text-main` / `--primary` on `--card-bg` / `#fff`, which already pass).
- D4.4 Every tap target ≥ 48 × 48 CSS px with ≥ 8 px to the next (Lighthouse SEO
  `tap-targets`).
- D4.5 Nothing in `.dd` sets a width larger than its container; `#body { overflow:auto }`
  must never gain a horizontal scrollbar in drill-down mode (FR-011).

## D5 — Observable acceptance (maps to spec)

| Spec item | DOM-level check |
| --- | --- |
| Story 1 sc. 1 | At load on 360 px: `.dd-list` has 7 `.dd-row`; `.dd-crumbs li` count = 1; no `.dd-back`. |
| Story 1 sc. 2 | Click `.dd-row:nth-child(1) .dd-open` → crumbs = 2, list = that node's `kidsOf` length. |
| Story 1 sc. 4 | At depth 6, click first `.dd-crumb` → crumbs = 1. |
| Story 1 sc. 6 | Node with 14 children: `document.documentElement.scrollWidth === clientWidth`. |
| Story 3 sc. 1–2 | Click `.dd-name` → `#hover-panel:not(.hidden)`; `getBoundingClientRect()` inside viewport. |
| Story 3 sc. 6 | At top level, click the "Home" crumb → panel shows root name. |
| Story 4 sc. 1 | `.dd-row a.dd-open[target=_blank][rel~=noopener]`. |
| SC-007 | Tab from page top reaches crumbs → back → h2 (not tabbable by Tab, focusable programmatically) → each `.dd-name` / `.dd-open`. |
