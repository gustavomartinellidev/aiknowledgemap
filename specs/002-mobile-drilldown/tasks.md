# Tasks: Mobile Drill-Down Navigation

**Input**: Design documents from `/specs/002-mobile-drilldown/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No test framework exists in this repo and none is added (Constitution: no build step). Verification tasks run the gates in [quickstart.md](./quickstart.md) — shell commands with tools already installed, plus DevTools steps. They are real tasks with pass/fail criteria, not optional.

**Organization**: Tasks are grouped by user story. Nearly all implementation lands in two files — `public/js/app.js` and `public/css/style.css` — so JS tasks are sequential among themselves, CSS tasks are sequential among themselves, and a JS task and a CSS task may run in parallel (`[P]`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1…US5, from spec.md)
- Every task names its exact file(s)

## Path Conventions

Static site, no `src/`. Runtime: `public/js/app.js`, `public/css/style.css`. Entry documents: `public/index.html`, `public/pt-br/index.html`, `public/es/index.html`. Changelog: `CHANGELOG.md`. Nothing else may change (plan.md › Technical Context › Constraints).

Three rules the brief fixed for this task list:

1. The two `?v=` bumps are **one atomic task** across all three `index.html` (T021) — never `[P]`, never split.
2. The live mode switch is an **explicit verification task with a clean-unmount check** (T020).
3. The desktop pixel-identical check (FR-018) is **its own gate on all three locales** (T013, re-run as T024).

---

## Phase 1: Setup (Baseline capture)

**Purpose**: Capture the "before" state that later gates compare against. No source changes.

- [ ] T001 Capture the desktop baseline of `main`: create the `main` worktree and serve it, serve the branch, and take headless screenshots of `main` for `/`, `/pt-br/`, `/es/` at 1400×2200 per [quickstart.md › Prerequisites and Gate B](./quickstart.md#gate-b--desktop-pixel-identical-fr-018-sc-005-story-2) (commands: `git worktree add … main`, `python3 -m http.server 8000` / `8001`, `google-chrome --headless=new … --screenshot=…/main-<tag>.png`). Keep the three `main-*.png` files for T013 and T024.
- [ ] T002 [P] Record the pre-change invariants: run the parity `diff` from [quickstart.md › Gate A](./quickstart.md#gate-a--parity-and-cache-busting-principle-ii-iii-fr-021-fr-022) (must be empty) and `grep -nE '\?v=' public/index.html public/pt-br/index.html public/es/index.html` (must show `style.css?v=3` and `app.js?v=2` ×3). Note both results in the PR description draft.

---

## Phase 2: Foundational (Blocking prerequisites)

**Purpose**: Make the existing tree renderer mountable/unmountable, add the string table, and add the mode controller. Every user story depends on this. All three edits are in `public/js/app.js` and are sequential.

**⚠️ CRITICAL**: `update(source)` must not change by a single byte (contract M4.4). Only the lines named below move or change.

- [ ] T003 Extract the tree renderer lifecycle in `public/js/app.js` per [contracts/mode-switch.contract.md § M4](./contracts/mode-switch.contract.md) and [research R1](./research.md#r1): change `const vis = …` and `const measureCanvas = …` to `let vis, measureCanvas;` at module scope; add `mountTree()` that performs today's two chained `d3.select("#body").append("svg")…` / `vis.append("g").attr("class","text-measure")…` calls verbatim (same attributes, same order) and assigns both, then — if `root` exists — calls `resetTree()` and `update(root)`; add `resetTree()` containing the `collapse` function and the `root.x0 = height / 2; root.y0 = 0; if (root.children) root.children.forEach(collapse);` lines moved out of the `d3.json` callback; add `unmountTree()` that, in order, calls `d3.select("#body svg").selectAll("*").interrupt()`, `d3.select("#body svg").remove()`, `clearTimeout(hideTimer)`, `hoverPanel.classed("hidden", true)`, and sets `vis = measureCanvas = null`. Keep `labelWidthCache` module-level (not cleared). Keep the dead `nodeEnter.append("title")…` line. Add a `/* === TREE RENDERER LIFECYCLE === */` banner in the existing style; new comments in English.
- [ ] T004 Add the localized string table to `public/js/app.js` next to `getSignupMessage`: a module-level `DD_STRINGS` object keyed `"en" | "pt-br" | "es"` with keys `home`, `back`, `breadcrumb`, `open(name)`, `openLink(name)` and the exact values in [contracts/i18n-strings.contract.md § S1](./contracts/i18n-strings.contract.md), plus `ddText(key, name)` that resolves `DD_STRINGS[getLang()] || DD_STRINGS.en` and calls function-valued entries with `name`. No other string literal may reach the DOM from the drill-down (S2.2).
- [ ] T005 Add the mode controller to `public/js/app.js` per [contracts/mode-switch.contract.md § M1–M3, M6](./contracts/mode-switch.contract.md): `mqNarrow = matchMedia("(max-width: 960px)")`, `mqStandalone = matchMedia("(display-mode: standalone)")`, `isDrilldown()`, a `subscribe(mq, fn)` helper using `addEventListener("change")` with `addListener` fallback, `currentMode`, and `applyMode()` (no-op if unchanged; otherwise unmount old → mount new → set `currentMode`). Add **stub** `mountDrilldown()` (appends `<div class="dd">` to `#body`) and `unmountDrilldown()` (removes it, clears `hideTimer`, hides panel) — replaced by real ones in T007. Declare `let ddPath = [];` at module scope now (T007 fills it). Call `applyMode()` synchronously immediately before the `d3.json(...)` call, after every module-level `const`/`let` it depends on (`mqNarrow`, `mqStandalone`, `hoverPanel`, `DD_STRINGS`) — never at today's SVG-creation line, which would hit the temporal dead zone of those `const`s (M3.1); the script is `defer`red, so this still runs before data and before first paint (M3.5). Rewrite the `d3.json("data.json").then(...)` callback to: `root = d3.hierarchy(data); applyMode(); if (currentMode === "tree") { resetTree(); update(root); } else { ddPath = [root]; renderScreen(); }` (M6; `renderScreen` is a no-op until T008 — define an empty placeholder now). Subscribe `applyMode` to both media query lists.
- [ ] T006 Smoke-check the foundation (`public/js/app.js` as served from `public/` on `http://localhost:8000/`): at 961 px DevTools width, `document.querySelectorAll('#body > *')` is `[svg]` and the map expands/collapses as before; at 960 px it is `[div.dd]` (empty) with no `<svg>`; resizing across 960 px in both directions swaps them; the console shows no errors in either state. Fix before continuing.

**Checkpoint**: Both renderers can be mounted and unmounted; desktop path unchanged; string table and mode predicate in place.

---

## Phase 3: User Story 1 — Explore the tree on a phone by drilling down (Priority: P1) 🎯 MVP

**Goal**: On ≤ 960 px, a tappable one-level list with breadcrumb and back control reaches every node with no horizontal scroll and no clipped label (FR-005…FR-012, FR-019, FR-023; SC-001, SC-002, SC-007).

**Independent Test**: At 360 px, starting from the seven top-level sections, reach a node six levels deep by taps alone, return to the top with one tap on "Home", confirm `scrollWidth === clientWidth` throughout, and complete the same round trip with keyboard only ([quickstart Gate D](./quickstart.md#gate-d--drill-down-behavior-story-1-3-4-fr-005fr-017-sc-001sc-004) D1–D5, [Gate E](./quickstart.md#gate-e--keyboard-and-screen-reader-fr-019-sc-007-contract-d2)).

### Implementation for User Story 1

- [ ] T007 [US1] Implement the drill-down state and real lifecycle in `public/js/app.js` per [data-model.md › DrilldownState](./data-model.md) and [contracts/mode-switch.contract.md § M5](./contracts/mode-switch.contract.md): `kidsOf(d) = d.children || d._children || []` (the **only** way children are read — never `toggle`, never assign `children`/`_children`, never call `update`); module-level `ddPath` and `ddContainer`; `mountDrilldown()` creates `div.dd` in `#body`, adds class `dd-mode` to `#body`, sets `ddPath = root ? [root] : []`, registers a document `click` handler (a named function stored for removal; its body is completed in T015) and calls `renderScreen()`; `unmountDrilldown()` removes the document handler, removes `div.dd`, removes class `dd-mode` from `#body`, `clearTimeout(hideTimer)`, hides the panel, and sets `ddPath = []`. Replace the T005 stubs. Add a `/* === DRILLDOWN RENDERER === */` banner.
- [ ] T008 [US1] Implement `renderScreen()` in `public/js/app.js` producing exactly the markup in [contracts/drilldown-dom.contract.md § D1–D2](./contracts/drilldown-dom.contract.md) for the current level `ddPath[ddPath.length - 1]`: a sticky header `<div class="dd-head">` wrapping the breadcrumb and the back control — `<nav class="dd-crumbs" aria-label={ddText("breadcrumb")}>` → `<ol>` with ancestor `<li><button type="button" class="dd-crumb">` segments, the current segment as `<li aria-current="page" class="dd-crumb-current">` text — except at the top level where the single "Home" crumb is a `<button class="dd-crumb" aria-current="page">`; `<button type="button" class="dd-back">{ddText("back")}</button>` only when `ddPath.length > 1` (inside `.dd-head`); `<h2 class="dd-title" tabindex="-1">` = current node's `data.name`; `<ul class="dd-list">` of `<li class="dd-row">` each with `<button type="button" class="dd-name">` (full name) and, for rows where `kidsOf(n).length > 0`, a trailing `<button type="button" class="dd-open" aria-label={ddText("open", name)}><span aria-hidden="true">›</span></button>`; definition-only leaves get no trailing control (link rows are added in T018). Build with `document.createElement` + `textContent` — never `innerHTML` with node data (D3.6). Order of operations per D3.3: `clearTimeout(hideTimer)`, hide panel, replace `ddContainer`'s children, `h2.focus()`; do not call `scrollTo`. No-op if `ddPath.length === 0`.
- [ ] T009 [US1] Implement navigation handlers and their analytics in `public/js/app.js` per [data-model.md › DrilldownState › Operations](./data-model.md) and [contracts/analytics-events.contract.md § E1](./contracts/analytics-events.contract.md): `drill(node)` pushes and emits `node_click {node_label: node.data.name, depth: node.depth, action: "drill", lang: getLang()}`; `upTo(index)` truncates `ddPath` to `index + 1` and emits `node_click {…, action: "up"}` with the label/depth of `ddPath[index]`; `back()` = `upTo(ddPath.length - 2)`. Wire `.dd-open` buttons → `drill`, ancestor `.dd-crumb` buttons → `upTo(i)`, `.dd-back` → `back()`. Every emit guarded by `if (window.umami)`. Each handler ends in `renderScreen()`. (The top-level "Home" crumb's action is wired in T015.)
- [ ] T010 [P] [US1] Add the drill-down component rules to `public/css/style.css` per [contracts/drilldown-dom.contract.md § D4](./contracts/drilldown-dom.contract.md): `.dd`, `.dd-head` (`position: sticky; top: 0; z-index: 1; background: var(--card-bg)` — breadcrumb and back control stay visible while a long list scrolls; spec edge case "Fourteen children"), `#body.dd-mode { overflow: visible }` (required: `#body { overflow: auto }` otherwise makes `#body` the sticky element's scroll container and the header never sticks to the window), `.dd-crumbs ol` (flex, wrap, no list-style), `.dd-crumb` / `.dd-crumb-current` (text-like buttons, min-height 48px, `word-break: break-word`), `.dd-back` (≥ 48×48), `.dd-title` (Outfit, visible `:focus-visible` outline), `.dd-list` (no list-style/padding/margin), `.dd-row` (flex, gap ≥ 8px, `border-bottom: 1px solid var(--border)`), `.dd-name` (`flex:1; text-align:left; min-height:48px; white-space:normal; overflow-wrap:anywhere` — **no** `text-overflow: ellipsis`), `.dd-open` (`flex:0 0 48px; min-height:48px; display:flex; align-items:center; justify-content:center; color: var(--primary)`). Place them as a new block **outside** any media query (D4.2) using existing tokens only; do not edit any existing selector (D4.1). Add a `/* Drill-down (≤ 960 px / standalone) */` comment header.
- [ ] T011 [US1] Add dark-mode overrides for the drill-down to the existing `.dark-Mode` block in `public/css/style.css`: `.dark-Mode .dd-name`, `.dark-Mode .dd-crumb`, `.dark-Mode .dd-crumb-current`, `.dark-Mode .dd-back`, `.dark-Mode .dd-title`, `.dark-Mode .dd-row`, and `.dark-Mode .dd-head { background: #1e293b; }` (matching `.dark-Mode #body`) using `--text-main`, `--border`, `--primary`, `--card-bg`; verify contrast ≥ 4.5:1 (D4.3). Depends on T010.
- [ ] T012 [US1] Verify US1 on all three locales at 360×740 in DevTools: [quickstart Gate D](./quickstart.md#gate-d--drill-down-behavior-story-1-3-4-fr-005fr-017-sc-001sc-004) steps D1–D5, D12, D13 (7 rows, localized crumb/back/`nav[aria-label]`/section-row `aria-label` per [i18n-strings.contract.md](./contracts/i18n-strings.contract.md) (the link-row `aria-label` is checked in T019), focus on `h2.dd-title` after each move, 7-segment breadcrumb wraps fully visible at depth 6, 14-child "Classification/Classificação/Clasificación" list fully readable and, after scrolling to its bottom, `.dd-head` (crumbs + back) still visible at the top of the viewport, `document.documentElement.scrollWidth === 360` at every step, dark theme applied) and [Gate E](./quickstart.md#gate-e--keyboard-and-screen-reader-fr-019-sc-007-contract-d2) steps 1–3 (Tab/Enter round trip to depth 6 and back). Record results.

**Checkpoint**: Phone navigation is complete and independently demonstrable (MVP).

---

## Phase 4: User Story 2 — Desktop visitors notice nothing (Priority: P1) — FR-018 gate

**Goal**: At > 960 px in a browser tab, the page is pixel-identical and behaviorally identical to production on all three locales (FR-018; SC-005).

**Independent Test**: Headless screenshots of the branch vs the `main` baseline from T001 differ by 0 pixels for `en`, `pt-br`, `es`; desktop interactions and event shapes are unchanged. **This gate is re-run as T024 after every later phase and before the PR.**

- [ ] T013 [US2] Run the desktop pixel-identical gate on all three locales per [quickstart Gate B](./quickstart.md#gate-b--desktop-pixel-identical-fr-018-sc-005-story-2): headless screenshots of the branch at 1400×2200 for `/`, `/pt-br/`, `/es/`, then `compare -metric AE main-<tag>.png branch-<tag>.png diff-<tag>.png` → must print `0` for each (re-run once on a non-zero result to rule out font timing; then investigate `diff-<tag>.png`). Also audit the source diff: `git diff main -- public/js/app.js` shows no changed line inside the body of `update(source)`; `git diff main -- public/css/style.css` shows only additions whose selectors match `.dd`, `.dark-Mode .dd`, or the media-gated `#hover-panel` block (contract D4.1). Any failure blocks all later phases.
- [ ] T014 [US2] Verify desktop behavior of `public/js/app.js` + `public/css/style.css` at 961 px on `http://localhost:8000/`: hover opens the panel at the pointer and follows it; click expands/collapses with the 1,250 ms transition; a leaf's label link opens in a new tab; the panel's `mousedown` copies text + citation; dark mode toggles; `document.querySelectorAll('#body > *')` is `[svg]` and `document.querySelector('.text-measure')` exists inside it; no console errors. Confirm by reading the diff that the desktop `node_click` and `outbound_click` payloads are untouched (contract E1/E2 desktop columns).

**Checkpoint**: Desktop regression gate green; may proceed.

---

## Phase 5: User Story 3 — Read a definition and copy a citation on a phone (Priority: P2)

**Goal**: Tapping a row's name opens the **existing** panel, fully inside the viewport, with tap-to-copy and citation unchanged; the root's definition is reachable from the top-level "Home" crumb (FR-013…FR-015, FR-007; SC-003).

**Independent Test**: At 360 px, tap a name → panel is a bottom sheet inside the viewport showing the same content desktop shows for that node; tap the panel → clipboard holds text + localized citation; tap outside → panel hides; at top level tap "Home" → root definition ([quickstart Gate D](./quickstart.md#gate-d--drill-down-behavior-story-1-3-4-fr-005fr-017-sc-001sc-004) D6–D9).

### Implementation for User Story 3

- [ ] T015 [US3] Wire the panel in `public/js/app.js` per [contracts/drilldown-dom.contract.md § D3.1, D3.4](./contracts/drilldown-dom.contract.md) and [research R3](./research.md#r3): `.dd-name` `click` → `showPanel(event, node)` (existing function, same `#hover-panel`, no analytics); the top-level "Home" crumb `click` → `showPanel(event, root)`; complete the document `click` handler from T007 so that when `event.target` is outside `#hover-panel` and outside any `.dd-name`, it calls `clearTimeout(hideTimer)` and `hoverPanel.classed("hidden", true)` immediately. Do not modify `showPanel`, `movePanel`, `hidePanel`, `renderPanel`, or `copyHoverContent`.
- [ ] T016 [P] [US3] Add the panel bottom-sheet override to `public/css/style.css` exactly as in [research R3](./research.md#r3): `@media (max-width: 960px), (display-mode: standalone) { #hover-panel { position: fixed; left: 1rem !important; right: 1rem; top: auto !important; bottom: 1rem; min-width: 0; max-width: none; max-height: 60vh; overflow-y: auto; } }` placed after the existing `#hover-panel` rules. This is the only rule in the feature that targets an existing element; it must be inside that media query (D4.1).
- [ ] T017 [US3] Verify US3 on all three locales at 360×740: [quickstart Gate D](./quickstart.md#gate-d--drill-down-behavior-story-1-3-4-fr-005fr-017-sc-001sc-004) D6 (panel `getBoundingClientRect()` fully inside the viewport, `scrollWidth === 360`, content matches desktop for the same node including model examples), D7 (paste shows `Source:` / `Fonte:` / `Fuente:` with today's date and the page URL), D8 (tap outside hides; tapping "›" with the panel open hides it and changes screen), D9 ("Home" at top level opens the root's definition, list unchanged), and dark-mode panel colours. Also confirm the `::after` "Click to copy" / "Text copied ✓" label still shows.

**Checkpoint**: Reading works on phones with zero duplicated panel code.

---

## Phase 6: User Story 4 — Follow a leaf's external link on a phone (Priority: P2)

**Goal**: Linked leaves get a trailing "↗" anchor that opens in a new tab and emits `outbound_click` exactly as desktop; their name still opens the panel (FR-016, FR-017; SC-004).

**Independent Test**: Navigate to a linked leaf (e.g. under *AI Incidents*), tap "↗" → new tab, original tab unchanged; tap the name → panel, no navigation; a definition-only leaf has no trailing control ([quickstart Gate D](./quickstart.md#gate-d--drill-down-behavior-story-1-3-4-fr-005fr-017-sc-001sc-004) D10–D11).

### Implementation for User Story 4

- [ ] T018 [US4] Extend `renderScreen()` in `public/js/app.js` for link rows per [contracts/drilldown-dom.contract.md § D1, D2.8](./contracts/drilldown-dom.contract.md) and [data-model.md › Row](./data-model.md): when `kidsOf(n).length === 0 && n.data.url`, the trailing control is `<a class="dd-open" href={n.data.url} target="_blank" rel="noopener noreferrer" aria-label={ddText("openLink", name)}><span aria-hidden="true">↗</span></a>` with a `click` handler that emits `outbound_click {node_label: n.data.name, url: n.data.url, lang: getLang()}` (guarded by `if (window.umami)`) and does **not** `preventDefault`. Rows with neither children nor `url` remain without a trailing control.
- [ ] T019 [US4] Verify US4 on all three locales at 360×740: [quickstart Gate D](./quickstart.md#gate-d--drill-down-behavior-story-1-3-4-fr-005fr-017-sc-001sc-004) D10 (new tab opens to the URL; original tab still shows the same list; `a.dd-open[target=_blank][rel~=noopener]` present with the localized `openLink` `aria-label` per [i18n-strings.contract.md](./contracts/i18n-strings.contract.md); name tap opens the panel without navigating) and D11 (definition-only leaf has exactly one control). Tab order within a link row is name → anchor (D2.9).

**Checkpoint**: All four node kinds (section, link, definition-only, root) behave per contract.

---

## Phase 7: User Story 5 — The right mode in every situation (Priority: P3)

**Goal**: Mode follows viewport width and installed-app status only; crossing 960 px switches live in both directions with a fresh start; standalone always uses drill-down; every switch leaves nothing behind (FR-001…FR-004; contract M7).

**Independent Test**: The explicit live-switch verification below, with the clean-unmount checks the brief requires.

- [ ] T020 [US5] Verify the live mode switch and clean unmount per [contracts/mode-switch.contract.md § M7](./contracts/mode-switch.contract.md) and [quickstart Gate C](./quickstart.md#gate-c--mode-selection-and-live-switch-fr-001fr-004-story-5-contract-m7), on `http://localhost:8000/`: **(a) crossing both ways** — C1 (961 px: `[svg]`), C2 (960 px: `[div.dd]`, 7 rows, 1 crumb, no back), C3 (expand 3 nodes at 961 → 960: list shows the 7 sections), C4 (drill 3 levels at 960 → 961: map shows only root's children, collapsed), C7 (500 → 700 px: `.dd` element identity unchanged); **(b) standalone** — `google-chrome --app=http://localhost:8000/ --window-size=1300,900` shows the styled drill-down with the bottom-sheet panel (if `matchMedia('(display-mode: standalone)').matches` is `false` in that window, install the site from `http://localhost:8000/` via Chrome's address-bar install icon and launch it instead); **(c) clean unmount** — after switching drill-down → tree: in DevTools console `getEventListeners(document).click` contains no listener from `app.js` (the drill-down handler was removed), `document.querySelector('#body .dd') === null`, `document.getElementById('body').classList.contains('dd-mode') === false`, exactly one `.text-measure` exists (inside the new `<svg>`); after switching tree → drill-down: `document.querySelector('#body svg') === null`, `document.querySelector('.text-measure') === null` (no leftover measure group), `document.querySelectorAll('#body > *').length === 1`, `document.getElementById('body').classList.contains('dd-mode') === true`; **(d) no pending `hideTimer`** — open the panel in either mode, switch, confirm `#hover-panel` has class `hidden` synchronously and still has it 500 ms later (nothing un-hides it), and that a subsequent panel open in the new mode works; **(e) mid-animation** — C6: click a node at 961 px, resize to 960 within 1 s: no `<svg>` remains and the console shows no errors. Record pass/fail for each of (a)–(e) on `/` and once on `/pt-br/`.

**Checkpoint**: All five stories verified locally.

---

## Phase 8: Polish, release, and production gates

**Purpose**: Cache-busting, changelog, the constitution's pre-merge gates, PR, and the production-only gates.

- [ ] T021 Bump the cache-busting versions **atomically** in all three entry documents in one edit set: change `/css/style.css?v=3` → `/css/style.css?v=4` and `/js/app.js?v=2` → `/js/app.js?v=3` in `public/index.html`, `public/pt-br/index.html`, and `public/es/index.html`. These are the only permitted changes to the three files. Immediately verify: `grep -nE '\?v=' public/index.html public/pt-br/index.html public/es/index.html` shows six lines at the new versions, the parity `diff` from Gate A is empty, and `git diff main -- public/index.html public/pt-br/index.html public/es/index.html` contains no `+`/`-` line other than the two `?v=` lines per file. (Never parallelize or split this task — Constitution Principle III.)
- [ ] T022 [P] Add the changelog entry in `CHANGELOG.md` under `## [Unreleased]` › `### Added`: one bullet describing the phone/installed-app drill-down navigation (one level at a time, breadcrumb and back control, existing definition panel reused as a bottom sheet, leaf links open in a new tab), noting it applies at viewports ≤ 960 px and in standalone mode and that desktop is unchanged. Keep a Changelog style, matching the existing bullets' tone and line wrapping.
- [ ] T023 Run the pre-merge gates per [quickstart Gate A](./quickstart.md#gate-a--parity-and-cache-busting-principle-ii-iii-fr-021-fr-022) and [Gate F](./quickstart.md#gate-f--accessibility-and-seo-local-pre-check-principle-iv): Gate A — parity diffs empty, six `?v=` lines correct, `git diff --stat main -- . ':!specs' ':!.specify'` lists only `CHANGELOG.md`, `public/css/style.css`, `public/js/app.js`, and the three `index.html`; Gate F — `npx --yes lighthouse http://localhost:8000/ --only-categories=accessibility,seo` for `--form-factor=mobile` and `--form-factor=desktop --preset=desktop` (also on `/pt-br/` and `/es/`) → accessibility 1 and seo 1 on every run. The mobile run audits the drill-down DOM (`button-name`, `link-name`, `heading-order`, `color-contrast`, `tap-targets`, `list`); fix any sub-1.0 score in `public/js/app.js` / `public/css/style.css` and re-run T013.
- [ ] T024 Re-run the FR-018 gate from T013 on all three locales against the final branch state (after T015–T022): `compare -metric AE` must print `0` for `en`, `pt-br`, `es`, and the `update(source)` body must still be unchanged in `git diff main -- public/js/app.js`. This is the last local step before the PR.
- [ ] T025 Open the pull request from `feat/002-mobile-drilldown` to `main` (Constitution Principle V — no direct push): commit the six changed files (`public/js/app.js`, `public/css/style.css`, `public/index.html`, `public/pt-br/index.html`, `public/es/index.html`, `CHANGELOG.md`) with a conventional message, push, open the PR with a description that lists the gates passed (T012, T013/T024, T017, T019, T020, T023 results, the T002 baseline), the two `?v=` bumps, and the new `node_click` action values `drill` / `up` with a link to [contracts/analytics-events.contract.md](./contracts/analytics-events.contract.md). Wait for the Cloudflare Pages check to be green before merging; do not validate analytics on the `*.pages.dev` preview.
- [ ] T026 After merge, run the production audit per [quickstart Gate G](./quickstart.md#gate-g--production-audit-principle-iv-sc-006--after-merge): PageSpeed Insights on `https://aiknowledgemap.org/`, `/pt-br/`, `/es/`, mobile and desktop — Accessibility = 1.0, SEO = 1.0, agentic-browsing = 1.0 on all six runs; record the six results as a comment on the merged PR, alongside the pre-change baseline captured the same way.
- [ ] T027 After merge, validate analytics in production only per [quickstart Gate H](./quickstart.md#gate-h--analytics-principle-vi-fr-025-sc-004--production-only) / [contracts/analytics-events.contract.md § E4](./contracts/analytics-events.contract.md): on each locale, drill one level, go up via the crumb, follow a linked leaf; confirm in Umami one `node_click` with `action = drill`, one with `action = up` (correct `node_label`, `depth`, `lang`), and one `outbound_click` with the URL; confirm desktop `expand` / `collapse` / `leaf` events are unchanged. Record on the PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T001 and T002 can run together.
- **Foundational (Phase 2)**: depends on nothing in Phase 1 (baseline capture is for later comparison) but is strictly sequential (T003 → T004 → T005 → T006, all in `app.js`). **Blocks every user story.**
- **US1 (Phase 3)**: after Phase 2. T007 → T008 → T009 sequential (`app.js`); T010 → T011 sequential (`style.css`); T010 may run in parallel with T007–T009; T012 after all five.
- **US2 (Phase 4)**: after Phase 2 at the earliest; meaningful after US1 (T013 needs T001's baseline). Must be **re-run (T024)** after every later phase.
- **US3 (Phase 5)**: after US1 (needs `renderScreen` and the document handler from T007/T008). T016 may run in parallel with T015.
- **US4 (Phase 6)**: after US1 (extends `renderScreen`). Independent of US3.
- **US5 (Phase 7)**: verification only; after US1 + US3 (panel checks in (d)) — US4 is not required.
- **Polish (Phase 8)**: T021 after all source changes; T022 any time after US1 (parallel with T021); T023 after T021 + T022; T024 after T023; T025 after T024; T026 and T027 after merge.

### User Story Dependencies

- **US1 (P1)**: only Phase 2. Delivers the MVP on its own.
- **US2 (P1)**: only Phase 2 + the T001 baseline. A gate, not a feature — passes trivially right after Phase 2 and must keep passing.
- **US3 (P2)**: US1 (row names and document click handler exist).
- **US4 (P2)**: US1 (row rendering exists). No dependency on US3.
- **US5 (P3)**: US1 + US3 for the full check; the switch itself is Phase 2 code.

### Within Each User Story

- `app.js` tasks are strictly sequential; `style.css` tasks are strictly sequential; one of each may run in parallel.
- Implementation before the story's verification task; the verification task closes the story.

### Parallel Opportunities

- T001 ∥ T002
- T010 ∥ T007–T009 (then T011 after T010)
- T016 ∥ T015
- T022 ∥ T021
- US3 and US4 are independent of each other and can be developed by two people after US1, as long as both edits to `renderScreen()` are merged sequentially (same file).

---

## Parallel Example: User Story 1

```bash
# One developer on JS, one on CSS, after Phase 2:
Task A: "T007 Implement drill-down state and lifecycle in public/js/app.js"
Task B: "T010 Add drill-down component rules to public/css/style.css"
# then A continues T008 → T009 while B does T011; both meet at T012.
```

## Parallel Example: User Story 3

```bash
Task A: "T015 Wire the panel and dismissal handler in public/js/app.js"
Task B: "T016 Add the #hover-panel bottom-sheet override in public/css/style.css"
# meet at T017.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (T001–T002): capture the baseline.
2. Phase 2 (T003–T006): lifecycle extraction, strings, mode controller — then T013 once, to prove desktop is untouched before any new UI exists.
3. Phase 3 (T007–T012): the drill-down list.
4. **STOP and VALIDATE**: T012 and T013. A phone visitor can now reach every node; desktop is pixel-identical. This is shippable if needed — definitions are still readable on desktop and the panel wiring (US3) is a small follow-up.

### Incremental Delivery

1. US1 → T012 + T013 → MVP.
2. US3 → T017 + T024 → reading and citations on phones.
3. US4 → T019 + T024 → leaf links.
4. US5 → T020 → the switch is proven clean.
5. Phase 8 → bumps, changelog, Lighthouse, PR, production gates.

### Notes

- Every `app.js` task must leave `update(source)` byte-identical; T013/T024 enforce it on the diff as well as by screenshot.
- `kidsOf()` is the only sanctioned way to read children in drill-down code (research R4); any `d.children` read in the new code is a bug.
- No English literal in the drill-down renderer (contract S2.2); the only pre-existing exception is the panel's "Model examples" heading, which is out of scope.
- Commit after each phase checkpoint; the PR (T025) is the only path to `main`.
