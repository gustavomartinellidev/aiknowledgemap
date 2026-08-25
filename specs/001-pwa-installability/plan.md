# Implementation Plan: PWA Installability (Layer 1)

**Branch**: `001-pwa-installability` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-pwa-installability/spec.md`

## Summary

Make all three locales installable as standalone apps by correcting and completing the
static declarations the site already ships. Three per-locale manifests replace the single
global `site.webmanifest`, each declaring its own `start_url`, `id`, `lang`, and
translated `description`, with the brand name held constant. One new opaque maskable icon
is derived from the existing 512px artwork. The three entry documents get a locale-varying
manifest `href` plus a small block of iOS standalone metadata, applied in the identical
structural slot so parity holds. No service worker, no UI, no script, no backend.

Three findings from Phase 0 research materially changed the approach the user proposed:

1. **The `_headers` content-type rule is unnecessary.** Production already serves
   `/site.webmanifest` as `application/manifest+json` (verified live, 2026-08-25).
   Cloudflare's own docs do not document `Content-Type` as settable via `_headers`, and
   overlapping `_headers` rules **join** duplicate header values with a comma rather than
   overriding — so adding a redundant rule risks *breaking* a header that is currently
   correct. FR-020 is satisfied by live verification, not by a new rule.
2. **Every existing icon has a transparent background** (all four corners alpha = 0;
   ~68% of `apple-touch-icon.png` is fully transparent). Maskable icons must be opaque, so
   padding alone is insufficient — the maskable variant needs a filled background. The
   same transparency makes iOS composite `apple-touch-icon.png` onto **black** today.
3. **The current artwork does not survive the maskable safe zone.** Measured content
   bounding box is 434×455 px inside 512×512 (margins L42 T26 R36 B31); **17.7% of
   content pixels fall outside the 80%-diameter safe circle**. Shipping it as-is would
   ship a visibly clipped icon, confirming the user's hypothesis.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla ES2015+ (no transpilation); JSON for manifests. No language runtime is added by this feature.

**Primary Dependencies**: None added. Existing: vendored `d3.v7.min.js`. Manifest and icons are consumed by the browser's own install machinery — no library.

**Storage**: N/A — static files only. No client storage is written by this feature (explicitly no Cache Storage, per FR-012).

**Testing**: No test framework exists in this repo. Verification is (a) a structural-parity `diff` of element sequences across the three entry documents, (b) JSON validity checks on the three manifests, (c) Lighthouse/PSI audits on the three production URLs, and (d) manual install-and-launch on Android, Chromium desktop, and iOS. All are enumerated in [quickstart.md](./quickstart.md).

**Target Platform**: Static hosting on Cloudflare Pages (`pages_build_output_dir = "./public"`). Install targets: Android/Chrome, Chromium-based desktop, iOS/Safari. Firefox desktop is verified for non-regression only.

**Project Type**: Static multi-locale website. No build step, no package manager.

**Performance Goals**: No regression. The feature adds one manifest fetch (~600 B) and one 512px icon fetch, both off the critical rendering path and both triggered only by install-capable browsers. Zero added bytes to `/css/` or `/js/`.

**Constraints**: Constitution v1.1.0 — static-first (I), trilingual parity (II), cache-busting on `/css/` and `/js/` (III), Accessibility = SEO = agentic-browsing = 1.0 (IV), PR-only delivery (V), production-only analytics validation (VI). No service worker. No new third-party cookie. `_headers` is capped at 100 rules and joins duplicate header values with a comma.

**Scale/Scope**: 3 entry documents, 3 new manifest files, 1 new icon (2 if the Apple icon fix is accepted), 1 optional `_headers` rule, 1 CHANGELOG entry. No change to `data.json` (~1410 nodes × 3 locales) or to the D3 runtime.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial evaluation (pre-Phase 0): PASS — 7/7, no violations, Complexity Tracking not required.**

- [x] **I. Static-First** — PASS. Manifests and icons are static files served by Cloudflare Pages. No backend, no runtime, no secret. FR-012 explicitly bars a service worker, keeping the feature on the near side of the Layer 2 question that would require an amendment.
- [x] **II. Trilingual Parity** — PASS. The `<link rel="manifest">` element stays in the identical structural position in all three documents; only its `href` value differs, exactly as `canonical`, `og:locale`, and the JSON-LD `inLanguage` already do. The iOS metadata block is added to all three in the same order in the same PR. Enforced by the parity `diff` in quickstart.md, which must return empty.
- [x] **III. Cache-Busting** — PASS (not triggered). No file under `/css/` or `/js/` is modified, so no `?v=N` bump is due. The rule is armed, not waived: if implementation touches either path, every reference in all three documents must be bumped in the same PR.
- [x] **IV. SEO & Accessibility Baseline** — PASS. Canonical, `WebSite` JSON-LD, OG image, heading order, contrast, and `llms.txt` are untouched. The feature adds only `<link rel="manifest">` and `<meta>` elements to `<head>` — no rendered content, no heading, no contrast surface. Third-party verification stays in DNS TXT. Re-audit on all three production URLs gates merge.
- [x] **V. Release Discipline** — PASS. Delivery is branch `001-pwa-installability` → PR → green Cloudflare Pages check → merge. **The branch does not exist yet** and `main` is protected; it must be cut before the first edit.
- [x] **VI. Measurement Integrity** — N/A → PASS. No analytics is added, changed, or removed. `newsletter_signup` semantics are untouched. If install instrumentation is added later it is a separate feature and must be validated in production.
- [x] **Performance & Third-Party Debt** — PASS. No third-party script, no new cookie, no new render-blocking resource. The two added asset fetches occur only in install-capable browsers and after paint. One watch item: `apple-mobile-web-app-capable` is deprecated in favour of `mobile-web-app-capable`; the design ships **both** so older iOS still launches standalone while modern Chrome sees the non-deprecated form (see [research.md](./research.md) R6). Confirm no new Deprecated-API entry appears in the Best Practices audit.

**Post-Phase 1 re-evaluation: PASS — 7/7 unchanged.** The design added no server component, no script, and no `/css/` or `/js/` file. Two scope items surfaced during design that extend the user's stated change list; both are additive static edits that preserve every gate above, and both are flagged in **Deviations from the requested scope** below for explicit approval.

## Deviations from the requested scope

The request specified: *"manifests + icon + _headers + three `<link>` edits, nothing more."*
Research changed three of those four items. Nothing here is optional polish — each is
required by a spec requirement already accepted.

| # | Requested | Plan | Why |
|---|---|---|---|
| D1 | `_headers` rule forcing `application/manifest+json` | **Drop it.** Optionally add a cache rule only. | Production already serves the correct content type (verified live). Cloudflare does not document `Content-Type` as settable via `_headers`, and duplicate matching rules **comma-join** header values — a redundant rule could corrupt a header that is currently right. FR-020 is met by live verification. |
| D2 | Three `<link>` edits, nothing more | **Plus 4 `<meta>` tags per document** (12 total) | FR-011 and User Story 4 require iOS standalone launch, and SC-007 requires "no address bar" on 3 of 3 platforms including iOS. iOS ignores the manifest for this; without `mobile-web-app-capable` / `apple-mobile-web-app-capable` the icon opens inside Safari chrome, and without `apple-mobile-web-app-title` the label is the full `<title>`. Dropping this drops Story 4 and fails SC-007. |
| D3 | One new maskable icon | **Plus an opaque `apple-touch-icon.png`** | `apple-touch-icon.png` is ~68% transparent, so iOS composites it onto black. Story 4 AC-3 requires the artwork not be "padded with an unintended background". This is a one-file flatten onto `#ffffff`, no redraw. |

Also required by repo convention, outside the four listed items: a `CHANGELOG.md`
`[Unreleased]` entry (user-visible change). The manifests are **not** added to
`sitemap.xml` or `llms.txt` — they are not pages and not top-level human resources, so
FR-017 does not fire.

If D2 or D3 is rejected, User Story 4 (P3, iOS) must be struck from the spec and SC-007
narrowed to two platforms. Stories 1–3 (P1/P2) are unaffected and still ship complete.

## Project Structure

### Documentation (this feature)

```text
specs/001-pwa-installability/
├── plan.md                        # This file
├── spec.md                        # Feature specification (input)
├── research.md                    # Phase 0 output
├── data-model.md                  # Phase 1 output
├── quickstart.md                  # Phase 1 output — validation guide
├── contracts/
│   ├── webmanifest.contract.md    # Field contract + the three concrete instances
│   └── entry-document-head.contract.md  # Exact head edits, parity-preserving
└── checklists/
    └── requirements.md            # Spec quality checklist (complete)
```

### Source Code (repository root)

Files this feature touches, and nothing else:

```text
public/
├── index.html                     # MODIFY: manifest href → /site.webmanifest (unchanged value,
│                                  #   kept explicit); ADD iOS meta block after theme-color
├── site.webmanifest               # MODIFY: name, id, lang, dir, scope, maskable icon entry
├── pt-br/
│   ├── index.html                 # MODIFY: manifest href → /pt-br/site.webmanifest; same meta block
│   └── site.webmanifest           # NEW: start_url /pt-br/, id /pt-br/, lang pt-BR, pt description
├── es/
│   ├── index.html                 # MODIFY: manifest href → /es/site.webmanifest; same meta block
│   └── site.webmanifest           # NEW: start_url /es/, id /es/, lang es, es description
├── android-chrome-maskable-512x512.png   # NEW: opaque, logo inside the 80% safe circle
├── apple-touch-icon.png           # MODIFY (D3): flatten onto #ffffff
└── _headers                       # MODIFY (optional): icon cache rule only — no Content-Type

CHANGELOG.md                       # MODIFY: [Unreleased] → Added
```

**Structure Decision**: The repo's established idiom is *data lives beside its document* —
`app.js` loads `data.json` by relative path, so each locale directory ships its own copy.
Per-locale manifests follow that same idiom exactly: `public/site.webmanifest`,
`public/pt-br/site.webmanifest`, `public/es/site.webmanifest`. Icons stay **single-sourced
at the root** and are referenced root-absolute from all three manifests, so the artwork is
never duplicated. This keeps the locale-varying surface to exactly the four fields that
must vary (`start_url`, `id`, `lang`, `description`) and leaves everything else provably
identical across the three files.

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.
