# Contract: Entry Document `<head>` (three locale instances)

**Consumer**: installing browsers, iOS Safari's Add to Home Screen, and the project's own
structural-parity check. **Producer**: the three entry documents.

The binding rule (Constitution Principle II): **structure identical, values may differ.**

---

## Current state (all three documents, identical)

`public/index.html` lines 33–39, and the same block at the same lines in
`public/pt-br/index.html` and `public/es/index.html`:

```html
    <!-- Favicons -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#2563eb">
```

## Target state

Two edits, in this order. Nothing above the manifest line changes.

**Edit 1 — repoint the manifest (value only).**

| Document | `href` |
|---|---|
| `public/index.html` | `/site.webmanifest` *(unchanged)* |
| `public/pt-br/index.html` | `/pt-br/site.webmanifest` |
| `public/es/index.html` | `/es/site.webmanifest` |

**Edit 2 — append the iOS block immediately after `<meta name="theme-color">`**, identical
in all three documents (deviation D2):

```html
    <!-- Installability (iOS) -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="AI Map">
```

Resulting block, all three documents (only the manifest `href` differs):

```html
    <!-- Favicons -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="{LOCALE_MANIFEST}">
    <meta name="theme-color" content="#2563eb">

    <!-- Installability (iOS) -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="AI Map">
```

---

## Value rationale

| Value | Why not the alternative |
|---|---|
| `apple-mobile-web-app-title` = `AI Map` | Home-screen labels truncate near 12 chars; "AI Knowledge Map" (16) renders as "AI Knowledge…". Matches `short_name`. |
| `status-bar-style` = `default` | `black-translucent` draws content under the status bar, requiring CSS this feature must not add. |
| Both `capable` tags | Non-prefixed for current Chrome, prefixed for older iOS. See research R6 — **verify the console at implementation**; if a Deprecated-API entry appears, drop the prefixed tag and accept chrome-framed launch on older iOS. |
| Comment `<!-- Installability (iOS) -->` | English, matching the existing English comments in these documents. (Comments are invisible to the element-name parity check.) |

---

## Contract tests

| ID | Assertion | How |
|---|---|---|
| H1 | Element-name sequence is identical across all three documents | the project's documented parity `diff`; must return empty |
| H2 | The four meta `content` values are identical across the three | grep + compare |
| H3 | Each document's manifest `href` matches its own locale directory | grep per file |
| H4 | The favicon block above is untouched | `git diff` shows only the two intended edits |
| H5 | Each document still has exactly one `<link rel="manifest">` | count == 1 per file |
| H6 | Each manifest `href` resolves to a file that exists | filesystem check |

---

## Out of contract

No change to: `<title>`, `<meta name="description">`, canonical, Open Graph, Twitter
cards, JSON-LD, font preconnects, stylesheet or script references (so **no `?v=N` bump**),
analytics tags, or `<body>`.

*Incidental, not fixed here*: `public/pt-br/index.html`'s `<meta name="description">`
contains two U+200B zero-width spaces (offsets 158–159, in "da IA ​​—"). Pre-existing,
unrelated to installability, and out of scope — recorded so it is not mistaken for
something this feature introduced. The manifest descriptions in
[webmanifest.contract.md](./webmanifest.contract.md) are authored fresh and are free of it.
