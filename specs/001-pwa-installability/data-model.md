# Phase 1 Data Model: PWA Installability (Layer 1)

**Date**: 2026-08-25 | **Plan**: [plan.md](./plan.md)

This feature has no database and no runtime state. Its "data model" is the set of static
declarations a browser reads at install time, plus the invariants that bind them together.
Field-level syntax lives in [contracts/webmanifest.contract.md](./contracts/webmanifest.contract.md).

---

## Entity: Application Identity

One instance per locale. Serialised as a `.webmanifest` file beside its entry document.

| Field | Varies by locale? | Value | Source requirement |
|---|---|---|---|
| `id` | **yes** | `/`, `/pt-br/`, `/es/` | FR-007 — decouples identity from `start_url` |
| `start_url` | **yes** | `/`, `/pt-br/`, `/es/` | FR-009 — launch into the installed locale |
| `lang` | **yes** | `en`, `pt-BR`, `es` | FR-008 |
| `description` | **yes** | translated, ≤ 120 chars | FR-009 |
| `name` | no | `AI Knowledge Map` | FR-002 |
| `short_name` | no | `AI Map` | FR-003 |
| `scope` | no | `/` | edge case: cross-locale navigation stays in-window |
| `display` | no | `standalone` | FR-005 |
| `theme_color` | no | `#2563eb` | FR-006 |
| `background_color` | no | `#ffffff` | FR-006 |
| `dir` | no | `ltr` | FR-008 |
| `icons` | no | 3 entries (see below) | FR-004 |

**Validation rules**

- V1 — Exactly three instances exist: `public/site.webmanifest`,
  `public/pt-br/site.webmanifest`, `public/es/site.webmanifest`.
- V2 — Each parses as valid JSON.
- V3 — Every field in the table is present in all three instances. A field missing from
  one instance is a parity violation even if the others are complete (Principle II).
- V4 — The eight "no" rows are **byte-identical** across the three files. Mechanically
  checkable: strip the four varying keys and the remainder must compare equal.
- V5 — `id`, `start_url`, and the entry document's own `canonical` path agree. Mismatch
  means a locale launches into the wrong language.
- V6 — The three `id` values are distinct, so the three apps install side by side.
- V7 — `name` is identical across locales (documented assumption in spec.md: the brand is
  not translated, matching `og:site_name` and JSON-LD `name` on all three documents).
- V8 — `short_name` ≤ 12 characters, so launcher truncation does not cut it.

**Relationships**: each Application Identity is referenced by exactly one Locale Entry
Point and references the single shared App Icon Set.

---

## Entity: App Icon Set

Single shared instance. Files live at the site root and are referenced root-absolute from
all three manifests, so artwork is never duplicated per locale.

| File | Size | Purpose | Opaque? | Status |
|---|---|---|---|---|
| `android-chrome-192x192.png` | 192² | `any` | no (transparent) — correct for `any` | exists, unchanged |
| `android-chrome-512x512.png` | 512² | `any` | no (transparent) — correct for `any` | exists, unchanged |
| `android-chrome-maskable-512x512.png` | 512² | `maskable` | **yes, `#ffffff`** | **NEW** |
| `apple-touch-icon.png` | 180² | iOS home screen (via `<link>`, not the manifest) | **must become opaque** | **MODIFY (D3)** |
| `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png` | — | browser tab | — | exists, unchanged |

**Validation rules**

- V9 — The maskable file is fully opaque: every pixel has alpha = 255.
- V10 — All content pixels lie inside the centred circle of radius 40 % of width
  (204.8 px on a 512 canvas). Measured target: **0 %** outside, down from 17.71 % if the
  existing artwork were shipped unmodified.
- V11 — The maskable icon is a **separate** manifest entry with `"purpose": "maskable"`.
  The `any` entries keep their transparency and full-bleed geometry; purposes are never
  combined on one file.
- V12 — `apple-touch-icon.png` stays 180 × 180 and, after the D3 flatten, has no
  transparent pixels (iOS composites transparency onto black).
- V13 — Declared `sizes` match actual pixel dimensions. Verified today: 192 × 192,
  512 × 512, 180 × 180 all correct.

**Relationships**: referenced by all three Application Identities and, for the Apple icon,
by all three Locale Entry Points directly.

---

## Entity: Locale Entry Point

Three instances: `public/index.html`, `public/pt-br/index.html`, `public/es/index.html`.

| Element | Varies by locale? | Notes |
|---|---|---|
| `<link rel="manifest" href>` | value only | `/site.webmanifest`, `/pt-br/site.webmanifest`, `/es/site.webmanifest` |
| `<meta name="mobile-web-app-capable">` | no | `yes` |
| `<meta name="apple-mobile-web-app-capable">` | no | `yes` — see research R6 |
| `<meta name="apple-mobile-web-app-status-bar-style">` | no | `default` |
| `<meta name="apple-mobile-web-app-title">` | no | `AI Map` |

**Validation rules**

- V14 — The five elements appear in the **same order at the same position** in all three
  documents (immediately after the existing `<meta name="theme-color">`).
- V15 — The element-name parity `diff` between any two entry documents returns empty.
- V16 — Only the manifest `href` value differs; all four meta `content` values are
  identical across locales.
- V17 — No element is added to, removed from, or reordered within the existing favicon
  block above.

**Relationships**: each points to one Application Identity and shares the App Icon Set.

---

## Entity: Quality Baseline

Not a file — the measured state that gates merge (Constitution Principle IV).

| Measure | Required after change |
|---|---|
| Lighthouse Accessibility | 1.0 on all three production URLs |
| Lighthouse SEO | 1.0 on all three production URLs |
| Agentic-browsing | 1.0 on all three production URLs |
| Installability audit | pass on all three; 0 blocking findings |
| New third-party cookies | 0 |
| Best Practices | no regression; no new Deprecated-API entry (R6 watch item) |
| Structural parity `diff` | empty |

**State transition**: `measured before → change → measured after`. Both measurements are
taken in **production**, never on `*.pages.dev` (Principle VI). Because a `*.pages.dev`
preview is a different origin, an install performed there is a *different app* from a
production install and proves nothing about production identity.

---

## Invariants across the model

1. **Locale surface is exactly four fields.** `id`, `start_url`, `lang`, `description` —
   nothing else may vary between the three manifests (V4).
2. **Artwork is single-sourced.** Icons live at the root; adding a locale never
   duplicates an image.
3. **Purpose separation.** `any` icons stay transparent and full-bleed; the maskable icon
   is opaque and padded. One file never serves both (V11).
4. **Structure is identical, values may differ.** The rule that makes per-locale manifests
   constitutional (V14–V16).
5. **Nothing under `/css/` or `/js/` is touched**, so no `?v=N` bump is due. If that
   changes, FR-016 fires and every reference in all three documents must be bumped in the
   same PR.
