# Pre-change baseline — PWA Installability (Layer 1)

**Captured**: 2026-08-25 · **Task**: T002 · **Branch**: 001-pwa-installability

## Live headers (production, before change)

```text
/site.webmanifest                HTTP/2 200  content-type: application/manifest+json cache-control: public, max-age=0, must-revalidate 
/android-chrome-192x192.png      HTTP/2 200  content-type: image/png cache-control: public, max-age=14400, must-revalidate 
/android-chrome-512x512.png      HTTP/2 200  content-type: image/png cache-control: public, max-age=14400, must-revalidate 
/apple-touch-icon.png            HTTP/2 200  content-type: image/png cache-control: public, max-age=14400, must-revalidate 
```

## Structural parity (before change)

```text
en vs pt-br: empty (pass)
en vs es:    empty (pass)
```

## Icon measurements (before change)

```text
android-chrome-192x192.png     192x192  non-opaque px:  78.7%
android-chrome-512x512.png     512x512  non-opaque px:  74.5%
apple-touch-icon.png           180x180  non-opaque px:  78.7%
512 content bbox: 434x455 at (42,26)
512 content outside maskable safe circle: 17.69%  <-- C9 would FAIL
```

## Lighthouse / PSI — NOT CAPTURED

This environment has no browser, so Accessibility / SEO / agentic-browsing / Best
Practices could not be measured. **T002 is therefore incomplete.** Run Lighthouse or
PSI against the three production URLs and paste the results here before merge —
Constitution Principle IV gates on the before/after comparison.

| URL | Accessibility | SEO | Agentic-browsing | Best Practices |
|---|---|---|---|---|
| https://aiknowledgemap.org/ | 1.0 | 1.0 | 3/3 | 0.58 |
| https://aiknowledgemap.org/pt-br/ | 1.0 | 1.0 | 3/3 | 0.58 |
| https://aiknowledgemap.org/es/ | 1.0 | 1.0 | 3/3 | 0.58 |
**Lighthouse mode**: Mobile (throttled), Chrome DevTools. The post-change
audit (T031) MUST use the same mode for a valid before/after comparison.
---

## Gate D — preview verification (T030), 2026-08-25

**Preview URL**: `https://001-pwa-installability.aiknowledgemap.pages.dev/`

Note: `https://aiknowledgemap.pages.dev/` is the Pages **production alias** and serves
`main`, not this branch. It was confirmed to still carry the pre-change state
(`name: "AI Map Explorer"`, no `id`, 2 icons, `/pt-br/site.webmanifest` → 404), which
doubles as the "before" half of this gate.

```text
/site.webmanifest                      200  application/manifest+json
/pt-br/site.webmanifest                200  application/manifest+json
/es/site.webmanifest                   200  application/manifest+json
/android-chrome-maskable-512x512.png   200  image/png
/apple-touch-icon.png                  200  image/png
```

Contract re-verified against the deployed origin: C1, C2, C3, C4, C5, C7, C10 all pass.
Both icons served byte-identical to the local build (md5 match). All three documents
serve their own manifest href and carry both `capable` meta tags with title "AI Map".

Confirms research R1: no `_headers` Content-Type rule is needed — Cloudflare Pages maps
`.webmanifest` correctly on its own, including in subdirectories.

## Device gates passed (T014, T015, T023), 2026-08-25

| Gate | Platform | Result |
|---|---|---|
| F1, F2 | Android / Chrome | Install offered, installed, launched standalone; **icon clean** — no white box, no letterboxing, no clipped mark (SC-005) |
| F3 | Chromium desktop | Install control available; app opens in its own window (SC-003, SC-007 desktop half) |
| R6 | DevTools console | **No deprecation warning** for `apple-mobile-web-app-capable`; both capable tags stay |

### Carry-over for the Lighthouse comparison (T031)

The R6 console check also surfaced a **Cloudflare RUM CORS error**, unrelated to this
feature and present independently of it. Lighthouse's Best Practices category includes a
"no browser errors logged to the console" audit, so it may hold that score below 1.0 both
before and after this change. When comparing, confirm the *same* error is present in the
"before" measurement — otherwise a pre-existing third-party issue could be misread as a
regression introduced here. Accessibility, SEO, and agentic-browsing (the three the
constitution actually gates on) are unaffected by it.
