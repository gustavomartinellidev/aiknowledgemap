# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI Knowledge Map (https://aiknowledgemap.org) — a static, trilingual D3.js visualization of the AI landscape. No build step, no backend, no package manager: HTML + CSS + vanilla JS + a vendored `d3.v7.min.js`. Deployed by Cloudflare Pages straight from git, with `./public` as the build output dir (`wrangler.toml`).

## Running locally

The site is served from `public/`; `app.js` `fetch`es `data.json`, so `file://` will not work — a local server is required.

```bash
cd public
python3 -m http.server 8000   # or: npx serve .   |   php -S localhost:8000
```

Locales live at `/`, `/pt-br/`, `/es/`. There are no tests, linters, or build commands in this repo.

## Architecture

**Three parallel entry documents, one shared runtime.** `public/index.html`, `public/pt-br/index.html`, and `public/es/index.html` are structurally identical documents that all load the *same* `/css/style.css` and `/js/app.js` via root-absolute paths. What differs per locale is only translated copy plus locale metadata (`lang`, `canonical`, `og:locale`, JSON-LD `inLanguage`). Verify parity with `diff <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' public/index.html) <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' public/pt-br/index.html)` — it must come back empty.

**Data lives beside its document.** `app.js` calls `d3.json("data.json")` with a *relative* path, so each locale directory ships its own copy: `public/data.json`, `public/pt-br/data.json`, `public/es/data.json`. All three are ~1410 nodes and must stay structurally isomorphic — same tree shape, same `type`/`url`/`model_examples`, only `name` and `short_definition` translated. Editing content means editing all three.

Node schema (recursive):

```jsonc
{
  "name": "Machine Learning",
  "type": "folder",          // "folder" | "url" | "category" (a few one-offs exist)
  "short_definition": "...", // shown in the hover panel
  "url": "https://...",      // leaves only; renders the label as an external link
  "model_examples": ["..."], // optional list rendered under the definition
  "children": [ ... ]
}
```

**`app.js` (383 lines, no modules — top-level script).** Key pieces:

- `update(source)` is the D3 enter/update/exit reconciliation. It does *not* use D3's default `nodeSize` x-spacing for columns: it measures every label with a hidden `<g class="text-measure">` (`measureLabel`, memoized in `labelWidthCache`) and computes per-depth `columnX` from the widest right-anchored label of the previous depth plus the widest left-anchored label of the current one. Anchoring flips based on whether a node has children. The SVG is then resized to the visible tree on every toggle. Changing font size, font family, or label text affects layout through this measurement path.
- `toggle(d)` swaps `children` ↔ `_children`; everything below the root is collapsed on load.
- Hover panel: `showPanel`/`movePanel`/`hidePanel` with a 300 ms `hideTimer` so the pointer can travel into the panel. `mousedown` on the panel triggers `copyHoverContent()`, which appends a locale-aware academic citation (site name, current URL, localized date) built from `document.documentElement.lang`.
- `getLang()` derives the locale from `window.location.pathname` prefix (`/pt-br/`, `/es/`, else `en`) — this is the locale key for analytics and for the message lookup tables. Note it returns `pt-br` while `copyHoverContent` keys off the HTML `lang` attribute `pt-BR`; they are separate maps, keep both in sync.
- Newsletter: `#newsletter-form` posts to Buttondown with `mode: "no-cors"`, so the response is unreadable and success is assumed. `umami.track("newsletter_signup")` therefore measures *intent*, not confirmed subscription.
- Analytics calls are all guarded by `if (window.umami)`. Events: `node_click` (with `node_label`, `depth`, `action`, `lang`), `outbound_click`, `newsletter_signup`.

**Shared-JS i18n trap.** Because one `app.js` serves all three locales, any user-facing string added there needs an entry in the per-locale lookup objects (`getSignupMessage`, the citation `templates`, the error map). `renderPanel` currently hardcodes the English heading `"Model examples"` on every locale — that is a known gap, not a pattern to copy.

**Dead field.** `nodeEnter.append("title").text(d => d.data.description)` reads `description`, which no node in `data.json` has; native tooltips are empty by design-drift. Use `short_definition` if you ever wire it up.

**Styling.** `public/css/style.css` is a single flat stylesheet. Dark mode is a `dark-Mode` class toggled on `<body>` (note the capital M) with per-component overrides in a block near the bottom; any new component needs its own `.dark-Mode` override. Breakpoints at 960px and 768px. Asset URLs in the HTML carry cache-busting query strings (`style.css?v=3`, `app.js?v=2`) — bump them when shipping changes to those files, since `_headers` caches `/css/*` and `/js/*` for 24 h.

## Project constitution

`.specify/memory/constitution.md` (v1.0.0, ratified) is binding for this repo. The operative constraints:

1. **Static-first.** Any backend, dynamic runtime, or server-side component requires a written justification and a MAJOR constitutional amendment *before* implementation. Prefer static-compatible third parties (Buttondown, Umami).
2. **Trilingual parity.** i18n content or shared-asset changes must touch all three entry documents in the same change; no locale may drift.
3. **SEO/a11y baseline (non-negotiable).** Every entry document keeps its canonical URL, `WebSite` JSON-LD, verified OG image, correct heading order, and contrast. Lighthouse Accessibility = 1.0 and SEO = 1.0 on all three URLs before merge. Third-party property verification goes in DNS TXT, never in the HTML (it would break structural parity).
4. **Release discipline (non-negotiable).** `main` is protected; direct pushes are forbidden. branch → push → PR → green Cloudflare Pages check → merge.
5. **Measurement integrity.** Umami events do not fire on `*.pages.dev` previews; validate analytics in production only.

Spec-driven work uses GitHub Spec Kit: `.specify/` templates and the `speckit-*` skills in `.claude/skills/`.

## Content pipeline

`auxiliar/` is gitignored and holds the local-only Python tooling that generated and translated `data.json` (OpenAI/Anthropic scripts for `short_definition` generation, `model_examples`, pt-BR/es translation with on-disk caches, and diff/audit helpers), plus source image files. It runs against `.venvai/` and reads keys from `auxiliar/.env`. It is not part of the deployed site and is not required to work on the site itself.

## Conventions

- Update `CHANGELOG.md` (Keep a Changelog format, `[Unreleased]` section) for user-visible changes.
- New pages must be added to `public/sitemap.xml` with the full `hreflang` alternates block, and `public/llms.txt` if they are a top-level resource.
- Existing comments in `app.js` are in Portuguese; new code and docs are in English.
