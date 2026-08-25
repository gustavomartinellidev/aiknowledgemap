# Phase 0 Research: PWA Installability (Layer 1)

**Date**: 2026-08-25 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All Technical Context unknowns are resolved below. Findings marked **measured** were
obtained by inspecting the repository or the live production deployment on the date above;
findings marked **documented** come from vendor documentation; one item (R6) is marked
**verify at implementation** because authoritative confirmation was not obtained.

---

## R1 — Is the manifest already served with a content type browsers accept?

**Decision**: Do **not** add a `Content-Type` rule to `_headers`. Satisfy FR-020 by live
verification, and re-verify after deploy.

**Rationale** (measured): `curl -sSI https://aiknowledgemap.org/site.webmanifest` returns

```text
HTTP/2 200
content-type: application/manifest+json
cache-control: public, max-age=0, must-revalidate
```

Cloudflare Pages already maps the `.webmanifest` extension correctly, and its default
`max-age=0, must-revalidate` is the *right* caching posture for a manifest — it is
revalidated on every launch, so a corrected app name propagates immediately instead of
being pinned for hours. Icons return `image/png` with `max-age=14400, must-revalidate`
(also a Pages default; `/css/style.css` returns `max-age=86400`, confirming `_headers`
rules do take effect).

**Alternatives considered**:

- *Add `/site.webmanifest → Content-Type: application/manifest+json`* — rejected. Two
  problems. Cloudflare's `_headers` documentation does not list `Content-Type` among
  settable headers, so the rule may be silently ignored; and where two rules match one
  path, Cloudflare **joins duplicate header values with a comma** rather than letting the
  more specific rule win. A rule that *did* apply on top of the existing correct value
  could yield `application/manifest+json, application/manifest+json` and break
  installability that works today. Adding risk to a working header for no benefit.
- *Add a long `Cache-Control` for the manifests* — rejected. Manifests are tiny and their
  whole job is to carry identity; a stale manifest is exactly the failure mode this
  feature exists to fix.
- *Add an icon cache rule* (`/*.png → max-age=604800`) — **optional, low value**. It
  raises icon caching from 4 h to a week and does not overlap any existing
  `Cache-Control` rule (`/js/*`, `/css/*`, `/data.json` are the only ones), so the
  comma-join hazard does not apply. Include only if wanted; it is not required by any FR.

---

## R2 — Does the existing 512px artwork survive the maskable safe zone?

**Decision**: **No.** A new, separately-authored maskable file is required; padding the
existing file is not enough on its own because it is also transparent.

**Rationale** (measured, `public/android-chrome-512x512.png` via PIL):

| Measurement | Value |
|---|---|
| Canvas | 512 × 512, RGBA |
| All four corners | alpha = 0 (**transparent background**) |
| Content bounding box | 434 × 455 px |
| Margins (L / T / R / B) | 42 / 26 / 36 / 31 px |
| Content pixels outside the 80 % safe **circle** | **17.71 %** |
| Content pixels outside a centred 80 % square | 5.82 % |

The maskable safe zone is a centred circle of radius 40 % of the icon width — diameter
80 %, i.e. 409.6 px on a 512 canvas (documented). Content whose bounding box measures
434 × 455 has a diagonal of ≈ 629 px, well beyond that circle, so a platform that masks to
a circle or squircle would crop roughly one content pixel in six. Separately, maskable
icons **must be opaque** (documented); a transparent maskable icon shows the platform's
own background through the mask, which is precisely the "white box" failure SC-005
forbids.

**Recipe** (deterministic, no redesign): new 512 × 512 canvas → fill `#ffffff` → composite
the existing artwork scaled so its 434 × 455 content box fits inside the safe circle →
save as `public/android-chrome-maskable-512x512.png`. Fitting the *bounding box* inside
the inscribed square of the safe circle (side 409.6 / √2 ≈ 290 px) gives scale ≈ **0.63**
and is the conservative choice: it guarantees zero clipping under any mask shape. Exact
parameters and a verification script are in [quickstart.md](./quickstart.md).

**Background colour — why `#ffffff`**: the logo's dominant opaque colours are dark navy
and teal (`#003060`, `#2090a0`, `#105070`, with a `#c0f0f0` highlight). White gives the
strongest contrast, matches the manifest's existing `background_color: #ffffff`, and
matches `--bg: #ffffff` in the stylesheet. The brand primary `#2563eb` was rejected: a
mid-blue field behind a navy-and-teal mark muddies it.

**Alternatives considered**:

- *Reuse the existing icon with `"purpose": "any maskable"`* — rejected. It is transparent
  (invalid as maskable) and would clip 17.7 % of content. Overloading one file also forces
  the padded, shrunken maskable geometry onto the "any" slot, where the icon should be
  full-bleed like a favicon (documented guidance).
- *Only pad, keep transparency* — rejected. Padding fixes the crop but not the
  transparency; the mask would still reveal the platform background.
- *Author a new 1024 px master* — rejected as out of proportion. A deterministic
  scale-and-flatten of existing artwork keeps the change auditable and reviewable, which
  is an explicit goal of this feature.

---

## R3 — One manifest or three, and how should identity be declared?

**Decision**: Three manifests — `public/site.webmanifest`, `public/pt-br/site.webmanifest`,
`public/es/site.webmanifest`. Each declares its own `start_url`, `id`, `lang`, and
translated `description`. `name`, `short_name`, `scope`, `display`, colours, and the icon
array are byte-identical across all three.

**Rationale**: FR-009 requires launching into the locale installed from, which is a
property of `start_url`; a single manifest can carry only one. Declaring a distinct `id`
per locale makes the three genuinely separate installable apps, so a visitor may install
Portuguese and English side by side without one replacing the other. `id` also decouples
app identity from `start_url`, satisfying FR-007: a later change to the launch URL is then
an update to the same app rather than a new one (without `id`, identity falls back to
`start_url`). Placing each manifest beside its own document mirrors the repo's existing
`data.json` idiom.

**`scope` is `/` in all three** — deliberately *not* narrowed to the locale. The spec's
edge case requires that navigating from `/pt-br/` to `/es/` inside the installed window
stays in the window; a scope of `/pt-br/` would hand that navigation off to the browser.
All three locales are one site, so all three apps scope the whole origin.

**Alternatives considered**:

- *One shared manifest at `/site.webmanifest`* — rejected at spec time (Q1). Every
  installer would relaunch in English.
- *Locale-scoped `scope` values* — rejected; breaks the cross-locale navigation edge case.
- *`id` omitted* — rejected; identity would be pinned to `start_url` (FR-007).

---

## R4 — Does per-locale `href` break trilingual parity?

**Decision**: No. Parity is preserved and the project's own parity check proves it.

**Rationale** (measured): the documented check compares the *sequence of element names*:

```bash
diff <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' public/index.html) \
     <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' public/pt-br/index.html)
```

It compares tags, not attribute values, so a differing `href` cannot register. This is the
same mechanism by which `<link rel="canonical">`, `og:url`, `og:locale`, and JSON-LD
`inLanguage` already differ per locale without violating Principle II — the constitution
states plainly that "language-specific differences are limited to translated copy and
locale metadata". A manifest `href` is locale metadata of exactly that kind. The parity
requirement that *does* bind here is structural: the `<link rel="manifest">` element and
the four iOS `<meta>` elements must appear in the **same position and order** in all three
documents, which the head contract fixes.

---

## R5 — What does iOS Safari need, and is it in scope?

**Decision**: Add four meta tags per document. This exceeds the user's stated change list
and is flagged as deviation **D2** in [plan.md](./plan.md).

**Rationale** (documented): iOS Safari does not use the manifest for standalone launch or
for the home-screen label. Without `apple-mobile-web-app-capable` / `mobile-web-app-capable`,
"Add to Home Screen" produces an icon that opens **inside Safari's chrome** — failing
SC-007, which requires no address bar on 3 of 3 platforms including iOS. Without
`apple-mobile-web-app-title`, the proposed label is the full `<title>`
("AI Knowledge Map - Learn AI Concepts & Definitions", 49 characters) rather than the app
name — failing User Story 4 AC-1.

The chosen title value is **"AI Map"**, matching `short_name`, because launcher labels
truncate near 12 characters; "AI Knowledge Map" is 16 and would render as "AI Knowledge…".

**Alternatives considered**:

- *Drop iOS support* — viable but consequential: it strikes User Story 4 and narrows
  SC-007 to two platforms. Offered as an explicit choice rather than taken silently.
- *`apple-mobile-web-app-status-bar-style: black-translucent`* — rejected. It draws page
  content under the status bar, which would need layout work in a feature that is supposed
  to add no CSS. `default` is the no-op-safe value.

---

## R6 — `apple-mobile-web-app-capable` is deprecated; ship one tag or both?

**Decision**: Ship **both** `mobile-web-app-capable` and `apple-mobile-web-app-capable`.

**Rationale**: `mobile-web-app-capable` is the non-prefixed successor and is what current
Chrome expects; the Apple-prefixed form remains necessary for older iOS versions that
predate support for the standard name. Shipping both is the conventional compatibility
pairing and costs one line.

**Confidence — verify at implementation**: authoritative documentation for the exact
Chrome console-warning behaviour was **not** obtained during research (MDN's meta-name
reference does not cover vendor-prefixed names). The specific claim that including the
non-prefixed tag *silences* the deprecation notice is therefore unconfirmed. This matters
only for the Best Practices audit, which the constitution's Performance & Third-Party Debt
section asks us not to regress. [quickstart.md](./quickstart.md) includes an explicit
DevTools console check; if a Deprecated-API entry still appears, drop
`apple-mobile-web-app-capable` and accept that iOS versions below Safari 17 launch with
browser chrome — a P3 degradation, not a gate failure.

---

## R7 — Do the manifests belong in `sitemap.xml` or `llms.txt`?

**Decision**: No.

**Rationale**: FR-017 covers "top-level resources" — pages a person or crawler navigates
to. `sitemap.xml` currently lists the three locale URLs with full `hreflang` alternate
blocks; a manifest is a machine-read metadata file, not a destination, and listing it
would pollute the hreflang graph. `llms.txt` lists human-readable entry points and
resources (the three locales, sitemap, GitHub). Neither gains from a manifest entry.

**What FR-017 *does* require here**: nothing. Verified (measured) that no existing file
references `site.webmanifest` outside the three entry documents — `sitemap.xml`,
`llms.txt`, and `_headers` contain no reference to it, so introducing per-locale manifests
creates no dangling pointer anywhere in the repo.

---

## R8 — Is a `CHANGELOG.md` entry required?

**Decision**: Yes — an `[Unreleased] → Added` entry.

**Rationale**: repo convention (CLAUDE.md) requires a CHANGELOG entry for user-visible
changes, and "the site can now be installed as an app" is as user-visible as it gets. The
`[Unreleased]` section already exists and carries `Added` / `Changed` / `Removed`
subsections in Keep a Changelog format.

---

## Resolved unknowns summary

| Unknown | Resolution | Basis |
|---|---|---|
| Manifest content type in production | Already `application/manifest+json`; no `_headers` rule | measured |
| `_headers` conflict risk | Duplicate matching rules comma-join values; new rules must not overlap existing `Cache-Control` paths | documented |
| Maskable safe zone survival | Fails — 17.7 % of content outside the circle; artwork also transparent | measured |
| Maskable background colour | `#ffffff` (logo is navy/teal; matches `background_color` and `--bg`) | measured |
| Manifest count and identity | Three files; per-locale `start_url` + `id` + `lang` + `description`; shared `scope: "/"` | derived from FR-007/FR-009 |
| Parity impact of differing `href` | None — parity check compares element names, not attribute values | measured |
| iOS requirements | 4 meta tags; exceeds requested scope (D2) | documented |
| Deprecation posture | Ship both capable tags; confirm console at implementation | **unconfirmed** |
| Discovery files | No sitemap/llms.txt change; no dangling references exist | measured |
