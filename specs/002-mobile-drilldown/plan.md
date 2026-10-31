# Implementation Plan: Mobile Drill-Down Navigation

**Branch**: `feat/002-mobile-drilldown` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-mobile-drilldown/spec.md`

## Summary

Give viewports ≤ 960 px (and every installed-app window) a one-level-at-a-time list
navigation of the same tree the desktop map draws, inside the same `#body` mount point,
reusing the existing definition panel, the existing per-locale data, and the existing
analytics events. Two renderers sit behind one mode switch: the current D3 code,
wrapped so it can be mounted and unmounted without any change to its `update()` body,
and a new `renderDrilldown()` that walks the same in-memory hierarchy. The change is
confined to `public/js/app.js`, `public/css/style.css`, the three `index.html` (version
bumps only), and `CHANGELOG.md`.

Three findings from Phase 0 research materially shape the approach the user proposed:

1. **There is no panel clamping to lean on.** `showPanel` and `movePanel` both set
   `left/top` to `pageX/pageY + 10` with no bounds check, so FR-014 cannot be met by
   "existing `movePanel` clamping". It is met instead by a CSS-only override that turns
   the panel into a bottom sheet under the mobile query (`!important` beats the inline
   style D3 writes), leaving every line of panel JS untouched ([R3](./research.md#r3)).
2. **The collapsed-state trap.** The desktop renderer *moves* children into `_children`
   on collapse, and every node below the root is collapsed on load. A drill-down that
   reads `d.children` sees an empty tree. It must read `children || _children` and never
   mutate either ([R4](./research.md#r4)).
3. **Lighthouse's mobile run will render the drill-down view**, not the map — it
   emulates a ~412 px phone. The Accessibility = 1.0 and SEO = 1.0 gates therefore apply
   to the new DOM, including SEO's tap-target audit (≥ 48 px targets with spacing). The
   markup contract is written to that gate ([R6](./research.md#r6), [R10](./research.md#r10)).

One deliberate deviation from the brief's "new rules go under the existing 960 px media
query": drill-down *component* rules are class-scoped and unconditional (the elements
only exist in drill-down mode, so they cannot affect desktop), because the installed app
uses drill-down at *any* width and a 960 px-gated rule would leave a wide standalone
window unstyled. Only the panel override is media-gated, on the combined query
`(max-width: 960px), (display-mode: standalone)` so CSS and JS agree exactly
([R8](./research.md#r8)).

## Technical Context

**Language/Version**: Vanilla ES2015+ (arrow functions, template literals, `let/const`; no modules, no transpilation), HTML5, CSS3. Comments in existing `app.js` are Portuguese; new code comments and all docs are English.

**Primary Dependencies**: None added. Existing vendored `d3.v7.min.js` (hierarchy, tree layout, selections, transitions). `window.matchMedia` for mode detection. `umami.track` (already loaded, guarded by `if (window.umami)`).

**Storage**: N/A. No client storage is read or written; mode and navigation state live only in page memory and are discarded on reload (FR-004, Story 5 scenario 4).

**Testing**: No test framework exists in this repo and none is added. Verification is the gated procedure in [quickstart.md](./quickstart.md): (a) structural-parity `diff` across the three entry documents, (b) headless-Chrome screenshots at desktop width before/after compared with ImageMagick `compare -metric AE` (both tools present locally), (c) DevTools device emulation at 360 / 960 / 961 px, (d) Chrome `--app=` window for `display-mode: standalone`, (e) keyboard and screen-reader walk, (f) Lighthouse / PSI on the three production URLs, (g) production-only analytics check in Umami.

**Target Platform**: Static site on Cloudflare Pages. Browsers: evergreen Chromium, Firefox, Safari ≥ 14 (Safari 13 gets correct mode at load but no live switch — `MediaQueryList.addEventListener` landed in 14; a one-line `addListener` fallback covers it, see [R2](./research.md#r2)).

**Project Type**: Static multi-locale website, single top-level script.

**Performance Goals**: No desktop regression — at > 960 px the executed path is today's path plus one `matchMedia` evaluation. Drill-down renders ≤ 14 rows per screen from an already-loaded tree; screen replacement is synchronous DOM work well under one frame. Added bytes: ~4–5 KB to `app.js`, ~1.5 KB to `style.css`, both cached 24 h.

**Constraints**: Constitution v1.1.0 — static-first (I), trilingual parity (II), cache-busting on `/css/` and `/js/` (III), Accessibility = SEO = agentic-browsing = 1.0 on all three production URLs (IV), PR-only delivery (V), production-only analytics validation (VI). Desktop output at > 960 px must be pixel-identical (FR-018). Data files and node schema untouched (FR-024). Files touched: `public/js/app.js`, `public/css/style.css`, `public/index.html`, `public/pt-br/index.html`, `public/es/index.html` (version bumps only), `CHANGELOG.md`.

**Scale/Scope**: 1,448 nodes × 3 locales, depth 6, fan-out ≤ 14, labels ≤ 188 chars. One new renderer (~150 lines), one mode controller (~30 lines), one string table (3 locales × 5 keys), ~40 lines of CSS, version bumps `app.js?v=2→3` and `style.css?v=3→4`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial evaluation (pre-Phase 0): PASS — 7/7, no violations, Complexity Tracking not required.**

- [x] **I. Static-First** — PASS. All behavior ships in the existing `app.js` and `style.css`; no backend, runtime, secret, build step, or new third-party script. Mode detection uses the browser's own `matchMedia`.
- [x] **II. Trilingual Parity** — PASS. The only `index.html` edits are the two `?v=` bumps, applied identically to `/`, `/pt-br/`, `/es/` in one PR; the parity diff stays empty. All new user-facing strings live in a per-locale table keyed by `getLang()` ([contracts/i18n-strings.contract.md](./contracts/i18n-strings.contract.md)); no English literal is added to shared JS.
- [x] **III. Cache-Busting** — PASS. `app.js?v=2 → 3` and `style.css?v=3 → 4` on every reference in all three documents, same PR. Research confirmed `style.css` *does* change (panel override, list styles, dark-mode overrides), so both bumps are mandatory, not conditional.
- [x] **IV. SEO & Accessibility Baseline** — PASS by design, verified by gate. No change to `<head>`, canonical, JSON-LD, OG, or `llms.txt`. The new DOM uses native `<button>`/`<a>` with accessible names, a `<nav aria-label>` breadcrumb with `aria-current`, an `<h2>` that keeps heading order (h1 → h2), ≥ 48 px tap targets, and inherits the existing contrast tokens. Lighthouse mobile renders this DOM, so the gate is run on both form factors before merge.
- [x] **V. Release Discipline** — PASS. Branch `feat/002-mobile-drilldown` → PR → green Cloudflare Pages check → merge.
- [x] **VI. Measurement Integrity** — PASS. `node_click` keeps its four fields and gains two documented `action` values (`drill`, `up`); `outbound_click` is reused verbatim through the same handler shape; panel opens record nothing (matches desktop hover). Validated only on the production URLs ([contracts/analytics-events.contract.md](./contracts/analytics-events.contract.md)).
- [x] **Performance & Third-Party Debt** — PASS. No new third-party script, cookie, or font. Added first-party bytes are small and cached; Best Practices and TBT are unaffected on desktop (same execution path) and improved on mobile (no 1,580 px SVG layout).

**Post-design re-evaluation (after Phase 1): PASS — 7/7, unchanged.** The design artifacts introduce no server component, no locale-specific markup, no un-bumped asset, no head change, and no new event name. See the re-check note at the end of [research.md](./research.md#resolved-unknowns-summary).

## Deviations from the requested approach

| Brief said | Plan does | Why |
| --- | --- | --- |
| "FR-014 … may be met by the existing `movePanel` clamping" | CSS bottom-sheet override; no panel JS touched | There is no clamping in `showPanel`/`movePanel` — both write raw `pageX/pageY + 10`. CSS `!important` overrides the inline style without duplicating panel code (R3). |
| "New rules go in `style.css` under the existing 960 px media query" | Component rules class-scoped and unconditional; only the panel override is media-gated, on `(max-width: 960px), (display-mode: standalone)` | Installed app uses drill-down at any width; a 960 px gate would leave a wide standalone window unstyled. Class scoping cannot leak to desktop because the elements don't exist there (R8). |
| "Bump `style.css?v=` *if* CSS changes" | Bump is unconditional | CSS changes are required (panel override, list rules, dark overrides). |
| "Move focus to the new list's first row (or the heading)" | Focus the `<h2>` that names the current level | Announces context ("Machine Learning") before the rows; keeps the first row's own focus ring from implying a selection; satisfies the heading-order baseline (R6). |

**Follow-up outside this PR**: `CLAUDE.md` will be stale after merge (single-renderer description, `app.js` line count, `node_click` without its `action` values). Refresh it in a separate docs change, as the constitution's Sync Impact Report does for its own follow-ups.

## Project Structure

### Documentation (this feature)

```text
specs/002-mobile-drilldown/
├── plan.md                                  # This file
├── spec.md                                  # Feature specification (clarified 2026-10-31)
├── research.md                              # Phase 0 — R1…R12, all unknowns resolved
├── data-model.md                            # Phase 1 — ViewMode, DrilldownState, Row, Strings, Events
├── quickstart.md                            # Phase 1 — Gates A…H, runnable verification
├── contracts/
│   ├── mode-switch.contract.md              # Mode predicate + renderer lifecycle obligations
│   ├── drilldown-dom.contract.md            # Markup, roles, names, focus, CSS hooks
│   ├── analytics-events.contract.md         # node_click / outbound_click shape incl. new actions
│   └── i18n-strings.contract.md             # The five new keys × three locales
├── checklists/
│   └── requirements.md                      # Spec quality checklist (16/16)
└── tasks.md                                 # Phase 2 — /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
public/
├── index.html                 # ?v= bumps only (style.css 3→4, app.js 2→3)
├── pt-br/index.html           # same two bumps
├── es/index.html              # same two bumps
├── js/
│   └── app.js                 # MODIFIED — see layout below
└── css/
    └── style.css              # MODIFIED — drill-down component rules, panel override, dark overrides

CHANGELOG.md                   # [Unreleased] › Added
```

**`public/js/app.js` layout after the change** (top-level script, no modules; existing
section banners kept, new sections use the same `/* === */` banner style):

```text
1. Layout constants, d3.tree, diagonal            (unchanged)
2. let vis, measureCanvas; labelWidthCache; measureLabel   (const → let; bodies unchanged)
3. Hover panel: showPanel / movePanel / hidePanel / renderPanel / copyHoverContent   (unchanged)
4. update(source)                                  (byte-identical body)
5. getLang / getSignupMessage / toggle / goDark   (unchanged)
6. NEW  DD_STRINGS + ddText(key, name)            (per-locale table, contracts/i18n-strings)
7. NEW  TREE RENDERER LIFECYCLE
      resetTree()        — the collapse-all + x0/y0 logic moved out of the d3.json callback
      mountTree()        — creates svg/g/text-measure exactly as today's top-level code did
      unmountTree()      — interrupt transitions, remove svg, clear hideTimer, hide panel
8. NEW  DRILLDOWN RENDERER
      kidsOf(d)          — d.children || d._children || []
      mountDrilldown()   — builds .dd container, state = { path: [root] }, renders, binds doc listener
      renderScreen()     — breadcrumb + h2 + list for path[path.length-1]; focus h2; hide panel
      unmountDrilldown() — remove .dd, remove doc listener, clear hideTimer, hide panel
9. NEW  MODE CONTROLLER
      mqNarrow, mqStandalone, isDrilldown(), currentMode, applyMode(), onMqChange
10. d3.json("data.json").then(...)                 (root = hierarchy; applyMode(); if tree mounted → update(root))
11. Hover panel events, newsletter                 (unchanged)
```

**Structure Decision**: single-file runtime retained, as the brief requires. The D3
code is not rewritten — its three top-level `const`s become `let`s assigned inside
`mountTree()`, and the collapse logic moves from the fetch callback into `resetTree()`
so a remount can restart from the collapsed state. `update()` is untouched, which is
what makes FR-018 ("pixel-identical") auditable by reading the diff rather than only by
screenshot ([R1](./research.md#r1)). On desktop the SVG is still created synchronously before data arrives — the
`applyMode()` call sits immediately before `d3.json(...)`, after all module-level
declarations (contract M3.1) — preserving today's pre-data page height.

## Complexity Tracking

No constitutional violations; table intentionally empty.
