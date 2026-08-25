---

description: "Task list for PWA Installability (Layer 1)"
---

# Tasks: PWA Installability (Layer 1)

**Input**: Design documents from `/specs/001-pwa-installability/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No automated test framework exists in this repo and none was requested. Verification is by the contract checks and manual install gates defined in [quickstart.md](./quickstart.md); those are written as explicit verification tasks below rather than as a test suite.

**Organization**: Tasks are grouped by user story. See **Story mapping note** below — this feature's artifact/story relationship is not one-to-one, and pretending otherwise would produce misleading tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are given in every task

## Path Conventions

Static site, no build step. All deliverables live under `public/`; the Cloudflare Pages build output dir is `./public` (`wrangler.toml`). Repo root is `/home/GUSTAVO.MARTINELLI/Documentos/Gustavo/Projetos/aiknowledgemap`; paths below are repo-relative.

---

## Story mapping note (read before executing)

Three properties of this feature break the usual "one story, one set of files" pattern. They are structural, not an oversight:

1. **One artifact set serves US1, US2, and US3 simultaneously.** The three manifests and the maskable icon are what make Android install, desktop install, and per-locale launch all work. They cannot be split per story, so they sit in **Phase 2 (Foundational)** and US2/US3 are verification-only phases. This is honest: those stories add no new files, only new proof.
2. **The three `index.html` edits are one atomic unit** (Constitution Principle II — a partial locale update is a violation even when the untouched locales still render). Per the request, each head change is therefore **one task touching all three documents**, never three parallel tasks. T010 and T019 are the two atomic head edits; neither is ever marked `[P]`.
3. **US4 is gated on approval.** Phase 6 implements deviations **D2** (4 meta tags × 3 documents) and **D3** (flatten `apple-touch-icon.png`), which exceed the change list the user approved at plan time. If either is rejected, skip Phase 6 entirely, strike User Story 4 from spec.md, and narrow SC-007 to two platforms. Phases 1–5 and 7 are unaffected.

**Dependency inversion worth knowing**: T010 (US1's head edit) requires all three manifests to already exist, including the pt-BR and Spanish ones that serve US3. The parity invariant means US1 cannot ship its document change without US3's manifests being in place. That is why all three manifests are foundational.

---

## Phase 1: Setup

**Purpose**: Working branch and a "before" measurement, so regression is provable rather than assumed.

- [X] T001 Create branch `001-pwa-installability` from `main` and confirm it is checked out — `main` is protected by a Ruleset and direct pushes are forbidden (Constitution Principle V); no file below may be edited before this task completes
- [ ] T002 Capture the pre-change baseline into `specs/001-pwa-installability/baseline.md`: Lighthouse/PSI Accessibility, SEO, agentic-browsing, and Best Practices for `https://aiknowledgemap.org/`, `/pt-br/`, and `/es/`, plus the current installability audit result. Principle IV gates merge on these three scores staying at 1.0, and Principle VI requires production, not `*.pages.dev`
- [X] T003 [P] Confirm local tooling: `python3 -c "import PIL; print(PIL.__version__)"` (expect ≥ 7.0.0) and `curl --version`; both are used by the verification gates in `specs/001-pwa-installability/quickstart.md`

**Checkpoint**: Branch exists, baseline recorded. No production behaviour changed yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The icon and the three manifests. Every user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. In particular T010 (US1) will produce a broken deployment if T006–T008 have not landed.

### Maskable icon

- [X] T004 Generate `public/android-chrome-maskable-512x512.png` from `public/android-chrome-512x512.png`: create a 512×512 RGBA canvas filled `#ffffff` (opaque), scale the source artwork by **≈0.63**, and composite it centred. The scale factor is derived, not guessed — the source content box measures 434×455 px and must fit inside the inscribed square of the 409.6 px safe circle (409.6 / √2 ≈ 290 px; 290 / 455 ≈ 0.637). Do **not** simply pad the existing file: it is transparent in all four corners, and maskable icons must be fully opaque. Do **not** overwrite `public/android-chrome-512x512.png` — the `any`-purpose icon keeps its transparency and full-bleed geometry
- [X] T005 Verify `public/android-chrome-maskable-512x512.png` against Gate B in `specs/001-pwa-installability/quickstart.md`: assert size is exactly 512×512 (V13), **every** pixel has alpha = 255 (C8), and **zero** content pixels fall outside the centred circle of radius 204.8 px (C9). Baseline for comparison: the unmodified source fails C9 with 17.71 % of content outside the circle. If C9 fails, reduce the scale factor in T004 and regenerate — do not relax the assertion

### Per-locale manifests

- [X] T006 [P] Rewrite `public/site.webmanifest` (English) to Instance 1 in `specs/001-pwa-installability/contracts/webmanifest.contract.md`: correct `name` to `AI Knowledge Map` (currently the stale `AI Map Explorer`, which appears nowhere else on the site), add `id: "/"`, `lang: "en"`, `dir: "ltr"`, `scope: "/"`, and add the third icon entry with `"purpose": "maskable"` pointing at the T004 file. Keep `short_name`, `display`, `theme_color`, `background_color`, and `start_url` as they are
- [X] T007 [P] Create `public/pt-br/site.webmanifest` per Instance 2 of the contract: identical to Instance 1 except `id: "/pt-br/"`, `start_url: "/pt-br/"`, `lang: "pt-BR"`, and the Portuguese `description`. Icon `src` values stay root-absolute so artwork is never duplicated per locale
- [X] T008 [P] Create `public/es/site.webmanifest` per Instance 3 of the contract: identical to Instance 1 except `id: "/es/"`, `start_url: "/es/"`, `lang: "es"`, and the Spanish `description`
- [X] T009 Verify the three manifests against Gate A in `specs/001-pwa-installability/quickstart.md` (C1–C7): valid JSON; the eight invariant fields byte-identical across all three; `id` == `start_url` == each document's canonical path; three distinct `id` values; `short_name` ≤ 12 chars; exactly one `maskable` entry with no combined purposes. Also run Gate B's C6 to confirm every declared `sizes` matches real pixel dimensions, and assert SC-004 with `grep -rn "AI Map Explorer" public/` returning **nothing** — the stale name occurs exactly once today, at `public/site.webmanifest:2`, and T006 is what removes it

**Checkpoint**: Icon and manifests are correct on disk. The site still references only `/site.webmanifest` from all three documents — nothing user-visible has changed yet.

---

## Phase 3: User Story 1 - Install on an Android phone (Priority: P1) 🎯 MVP

**Goal**: An Android visitor is offered installation, installs, and launches a standalone app with the correct name and a correctly shaped icon.

**Independent Test**: Open a locale on an Android device or mobile-emulated Chromium session, accept the install offer, and launch from the home screen. Delivers the full return-visit value with no other story shipped.

- [X] T010 [US1] **Atomic head edit #1 — all three documents in one change.** In `public/index.html`, `public/pt-br/index.html`, and `public/es/index.html`, set the existing `<link rel="manifest">` `href` to `/site.webmanifest`, `/pt-br/site.webmanifest`, and `/es/site.webmanifest` respectively, per `specs/001-pwa-installability/contracts/entry-document-head.contract.md`. The element keeps its exact position (line 38, immediately before `<meta name="theme-color">`) in all three files — only the attribute value differs, exactly as `canonical` and `og:locale` already do. **Never `[P]`, never split per file**: a partial locale update violates Principle II even when the untouched locales still render. Touch nothing else in `<head>`
- [X] T011 [US1] Verify parity via Gate C in `specs/001-pwa-installability/quickstart.md`: the element-name `diff` between `public/index.html` and each of `public/pt-br/index.html`, `public/es/index.html` **must return empty** (H1); each document has exactly one `<link rel="manifest">` (H5) resolving to an existing file (H6); `git diff --name-only main -- public/css public/js` returns nothing, confirming no `?v=N` bump is due under FR-016
- [X] T012 [US1] Smoke-test locally: `python3 -m http.server 8000 --directory public`, then in Chromium DevTools → Application → Manifest for `http://localhost:8000/` confirm name `AI Knowledge Map`, `start_url` `/`, `id` `/`, and that the maskable icon previews without a white box or clipped mark
- [ ] T013 [US1] Push the branch and open the pull request against `main` to obtain a Cloudflare Pages **preview URL**; wait for the status check to go green. This is a prerequisite, not a wrap-up step: gates F1–F7 install from a phone, and a phone cannot reach `http://localhost:8000` on the dev machine. Every later push to the branch rebuilds the preview automatically, so re-push after T020/T021 before running F7 (Constitution Principle V — the PR is the only integration gate, so it opens early and stays open)
- [ ] T014 [US1] Execute gates **F1 and F2** from `specs/001-pwa-installability/quickstart.md` on Android/Chrome: the install offer appears unprompted; the home-screen icon has no white box, letterboxing, or clipped mark; the label reads `AI Map`; install completes in under 30 s and ≤ 3 taps (SC-002); launch is standalone with no address bar and the system colour is `#2563eb` (SC-005, SC-007)

**Checkpoint**: US1 fully functional. This is the MVP — installable, correctly named, correctly shaped, on the highest-traffic surface.

---

## Phase 4: User Story 2 - Install on desktop (Priority: P2)

**Goal**: A Chromium desktop visitor installs and gets a standalone window with the project's icon in the taskbar/dock.

**Independent Test**: Load a production or preview URL in Chromium desktop, install from the address-bar control, launch from the OS launcher.

**No new artifacts.** This story is delivered by the Phase 2 and Phase 3 files; these tasks are the proof, not new work. That is a property of the feature, not a gap in the plan.

- [ ] T015 [US2] Execute gate **F3** from `specs/001-pwa-installability/quickstart.md` on a Chromium-based desktop browser against all three locale URLs: the address-bar install control is available; after install the app opens from the OS launcher/dock in its own window with the project icon and name, and with no tab strip or address bar (SC-003, SC-007)
- [ ] T016 [US2] Execute quickstart gate **F4**: resize the standalone window from narrow to wide and confirm the responsive layout behaves identically to a browser tab at the 768 px and 960 px breakpoints defined in `public/css/style.css`

**Checkpoint**: US1 and US2 both verified independently.

---

## Phase 5: User Story 3 - Install from a non-English locale (Priority: P2)

**Goal**: Installing from `/pt-br/` or `/es/` launches back into that language, and all three locales audit as equally installable.

**Independent Test**: Install from `/pt-br/` on a clean profile, launch from the home screen, and observe the language of the loaded map and of the app label.

**No new artifacts** — delivered by T006–T008 and T010. See the Story mapping note: the parity invariant already forced US3's manifests into Phase 2.

- [ ] T017 [US3] Execute quickstart gate **F5**: install from `/pt-br/` and from `/es/` on clean profiles; each launches its own language (SC-006). Confirm that installing more than one locale yields separate apps rather than one replacing another — this is what the distinct `id` values in `public/pt-br/site.webmanifest` and `public/es/site.webmanifest` buy
- [ ] T018 [US3] Execute gate **F6** from `specs/001-pwa-installability/quickstart.md`: from inside an installed app, navigate from `/pt-br/` to `/es/` and confirm the session stays in the app window with no hand-off to the browser — the behaviour `scope: "/"` exists to guarantee
- [ ] T019 [US3] Run the installability audit (gate E step 1 of `specs/001-pwa-installability/quickstart.md`) against all three production/preview locale URLs and confirm each reports installable with **zero** blocking findings, 3 of 3 (SC-001)

**Checkpoint**: All three P1/P2 stories verified. The feature is shippable here if Phase 6 is declined.

---

## Phase 6: User Story 4 - Add to Home Screen on iOS (Priority: P3) ⚠️ APPROVAL-GATED

**Goal**: An iPhone visitor's home-screen icon carries the correct artwork and a readable name, and launches without Safari's chrome.

**Independent Test**: On an iPhone, Share → Add to Home Screen, then launch the icon and observe chrome, icon, and title.

**⚠️ Gate**: implements deviations **D2** and **D3** from [plan.md](./plan.md), which exceed the approved change list ("three `<link>` edits, nothing more"). Confirm approval before starting. If declined: skip this entire phase, strike User Story 4 from [spec.md](./spec.md), and narrow SC-007 from three platforms to two. Nothing in Phases 1–5 or 7 depends on this phase.

- [X] T020 [US4] **Atomic head edit #2 — all three documents in one change (D2).** Append the four-tag iOS block immediately after `<meta name="theme-color">` in `public/index.html`, `public/pt-br/index.html`, and `public/es/index.html`, byte-identical in all three, per `specs/001-pwa-installability/contracts/entry-document-head.contract.md`: `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` = `default`, and `apple-mobile-web-app-title` = `AI Map`. Title value is `AI Map`, not `AI Knowledge Map`, because launcher labels truncate near 12 characters. Status-bar style is `default`, not `black-translucent`, which would draw content under the status bar and require CSS this feature must not add. **Never `[P]`, never split per file** — same parity reasoning as T010
- [X] T021 [P] [US4] Flatten `public/apple-touch-icon.png` onto `#ffffff` (D3), keeping it exactly 180×180. It is currently ~68 % transparent, so iOS composites it onto **black** today — Story 4 AC-3 requires the artwork not carry an unintended background. This is a flatten, not a redraw; do not change the artwork itself
- [X] T022 [US4] Verify: re-run Gate C's parity `diff` (H1) — it must still return empty after T020 — plus H2 (all four meta `content` values identical across the three documents) and Gate B's V12 (`public/apple-touch-icon.png` is 180×180 with zero non-opaque pixels)
- [ ] T023 [US4] Resolve research item **R6**, the one unconfirmed finding: open DevTools → Console on each locale and check whether `apple-mobile-web-app-capable` produces a Deprecated-API entry despite `mobile-web-app-capable` being present. If it does, remove `apple-mobile-web-app-capable` from all three documents (one atomic edit) and accept that iOS below Safari 17 launches with browser chrome — a P3 degradation, not a gate failure. Record the outcome in `specs/001-pwa-installability/research.md` under R6
- [ ] T024 [US4] Execute gate **F7** from `specs/001-pwa-installability/quickstart.md` on an iPhone: Share → Add to Home Screen proposes `AI Map` rather than the 49-character page title; the launched icon shows no Safari address bar; the icon is not black-backed (Story 4 AC-1/2/3, SC-007)

**Checkpoint**: All four stories functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Repo conventions, merge, and the production verification that FR-020 requires. The PR already exists from T013; this phase closes it out.

- [X] T025 [P] Add a `[Unreleased] → Added` entry to `CHANGELOG.md` in Keep a Changelog format, describing the site becoming installable as a standalone app across all three locales. Required by repo convention for user-visible changes; the `[Unreleased]` section already exists with `Added`/`Changed`/`Removed` subsections
- [ ] T026 **Do not add a `Content-Type` rule to `public/_headers`** — verify instead. Per research R1, production already serves `application/manifest+json`, Cloudflare does not document `Content-Type` as settable via `_headers`, and overlapping rules **comma-join** duplicate header values, so a redundant rule risks corrupting a header that is currently correct. This task is complete when the gate **D** content-type verification passes in T030 (preview) and T035 (production) — not T031, which is gate E and measures Lighthouse scores, not headers; it exists so the omission reads as a decision rather than an oversight
- [ ] T027 [P] *Optional, not required by any FR*: add an icon cache rule to `public/_headers` (e.g. `/*.png` → `Cache-Control: public, max-age=604800`), raising icon caching from the Pages default of 4 h to one week. Safe because it overlaps none of the existing `Cache-Control` blocks (`/js/*`, `/css/*`, `/data.json`), so the comma-join hazard does not apply. Skip if minimising the diff matters more
- [X] T028 Confirm no discovery-file change is needed: `public/sitemap.xml` and `public/llms.txt` must **not** list the manifests (they are machine-read metadata, not pages; listing them would pollute the hreflang graph). Verify no dangling references by grepping the repo for `site.webmanifest` outside the three entry documents and the three manifest files themselves
- [ ] T029 Confirm the Cloudflare Pages status check is green on the **final** commit of everything you intend to ship — the PR itself was opened back at T013. A red or missing check blocks merge (Constitution Principle V)
- [ ] T030 Execute gate **D** from `specs/001-pwa-installability/quickstart.md` against the Pages preview URL: all five paths return `200`; the three manifests return `application/manifest+json`; the two images return `image/png`
- [ ] T031 Execute gate **E** from `specs/001-pwa-installability/quickstart.md` against all three **production** URLs after merge and record results in `specs/001-pwa-installability/baseline.md` alongside the T002 "before" figures: Accessibility = 1.0, SEO = 1.0, agentic-browsing = 1.0, Best Practices not below baseline, zero new third-party cookies (FR-015, SC-009, Principle IV)
- [ ] T032 [P] Execute gate **F8** from `specs/001-pwa-installability/quickstart.md` inside an installed standalone window: expand a node, open the hover panel, copy a definition, toggle the theme, and submit the newsletter form — 5 of 5 must work (SC-010)
- [ ] T033 [P] Execute gate **F9** from `specs/001-pwa-installability/quickstart.md` on Firefox desktop across all three locales: no new UI, no errors, no console errors attributable to this feature (SC-011, FR-014)
- [ ] T034 [P] Execute gates **F10 and F11** from `specs/001-pwa-installability/quickstart.md`: launching the installed app in airplane mode shows the browser's standard network-error page — **expected**, the documented Layer 1 limitation, not a defect; and DevTools → Application shows **zero** service workers, **zero** cache storage entries, and zero permission prompts (SC-012, FR-012)
- [ ] T035 Merge the PR, then re-run gate **D** from `specs/001-pwa-installability/quickstart.md` against `https://aiknowledgemap.org/` to satisfy FR-020, which requires the manifests be verified against the **live deployment**, not only the source tree or the preview origin

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies. T001 blocks every subsequent file edit.
- **Phase 2 (Foundational)**: depends on Phase 1. **Blocks all user stories.**
- **Phase 3 (US1, P1)**: depends on Phase 2 in full — T010 breaks the deployment if T006–T008 have not landed. T013 opens the PR mid-phase, so every F gate from T014 onward has a reachable HTTPS origin.
- **Phase 4 (US2, P2)** and **Phase 5 (US3, P2)**: depend on Phase 3. Verification-only; they can run in parallel with each other and in either order.
- **Phase 6 (US4, P3)**: depends on Phase 3 and on explicit approval of D2/D3. Fully skippable.
- **Phase 7 (Polish)**: T025–T028 can start any time after Phase 2. T029 onward require every phase you intend to ship. The PR is *not* created here — it was opened at T013; this phase confirms the check, merges, and verifies production.

### Critical path

```text
T001 → T004 → T005 → {T006, T007, T008} → T009 → T010 → T011 → T013 → T029 → T035
```

Everything else hangs off that spine. The two atomic head edits (T010, T020) are the only tasks that touch more than one file at once, and neither may ever be split.

### Within each user story

- Artifact tasks before verification tasks
- Local gates (A, B, C) before deploy gates (D, E)
- Manual install gates (F) only after T013, since they need a reachable HTTPS origin — a Pages preview or production, never localhost

### Parallel Opportunities

- **T006, T007, T008** — the three manifests are separate files with no interdependency; the single largest parallel win in this feature
- **T003** during setup
- **T021** alongside T020 (different file: an image versus the three documents)
- **T025, T027** during polish
- **T032, T033, T034** — independent verification passes on different platforms
- **Phases 4 and 5** together once Phase 3 lands
- **Never parallel**: T010 and T020. Each spans all three entry documents by design

---

## Parallel Example: Phase 2 manifests

```bash
# After T005 (icon verified), launch the three manifest tasks together:
Task: "Rewrite public/site.webmanifest per contract Instance 1"
Task: "Create public/pt-br/site.webmanifest per contract Instance 2"
Task: "Create public/es/site.webmanifest per contract Instance 3"

# Then converge on the single verification:
Task: "Verify Gate A (C1-C7) across all three manifests"
```

## Anti-parallel Example: the head edits

```bash
# WRONG - violates Constitution Principle II:
Task: "Update manifest href in public/index.html"
Task: "Update manifest href in public/pt-br/index.html"   # locale drift window
Task: "Update manifest href in public/es/index.html"

# RIGHT - one task, three files, one commit:
Task: "T010 Atomic head edit #1 - manifest href in all three entry documents"
```

---

## Implementation Strategy

### MVP (Phases 1–3)

1. Phase 1 — branch and baseline
2. Phase 2 — maskable icon and three manifests (**blocking**)
3. Phase 3 — atomic head edit, parity check, **push for a preview URL (T013)**, Android install
4. **STOP and VALIDATE**: gates A, B, C locally; then F1/F2 on a device against the preview URL
5. Shippable: installable, correctly named, correctly shaped, on the highest-traffic surface

### Incremental Delivery

1. MVP → verify → deploy preview
2. Phases 4 + 5 → desktop and per-locale proof (no new code, so no new deploy risk)
3. Phase 6 → iOS, **only if D2/D3 are approved**
4. Phase 7 → CHANGELOG, green check, merge, production audits, post-merge live verification

### Recommended sequencing decision

Settle the D2/D3 approval **before** T010. If iOS is in, T020's meta block could in principle be folded into T010 as a single head edit and a single review. Keeping them separate is the safer default: it lets US4 be dropped later without reopening US1's task, at the cost of one extra commit touching the same three files.

---

## Notes

- `[P]` = different files, no dependencies
- The two atomic head edits are deliberately un-parallelisable; that is the whole point of the trilingual parity invariant
- No file under `/css/` or `/js/` is touched, so **no `?v=N` cache-busting bump is due**. T011 includes a tripwire that catches it if implementation drifts — if that tripwire fires, FR-016 applies and every reference in all three documents must be bumped in the same PR
- Commit after each task or logical group; the three manifests (T006–T008) are one sensible commit, each atomic head edit is its own
- Principle VI: audits and installs prove nothing on `*.pages.dev` — a preview is a different origin, so an install there is a different app
- Stop at any checkpoint to validate a story independently
