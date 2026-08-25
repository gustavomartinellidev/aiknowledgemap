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