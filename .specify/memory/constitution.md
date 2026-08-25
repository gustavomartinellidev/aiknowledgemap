<!--
SYNC IMPACT REPORT
- Version change: 1.0.0 → 1.1.0
- Ratification date: 2026-08-25 (unchanged)
- Last amended: 2026-08-25
- Modified principles:
  - II. Trilingual Parity (i18n) — expanded: partial locale updates are explicitly
    a violation even when untouched locales still render.
- Added principles:
  - III. Cache-Busting on Cached Assets — promoted from an unnumbered draft section
    to a numbered principle covering every file under /css/ and /js/, not only
    style.css and app.js.
- Renumbered (content unchanged):
  - III. SEO & Accessibility Baseline → IV
  - IV. Release Discipline → V
  - V. Measurement Integrity → VI
  - Cross-references in Governance updated to the new numbering.
- Added sections: none
- Removed sections: none
- Templates status: plan-template.md ✅ reviewed · spec-template.md ✅ reviewed
  review · tasks-template.md ✅ reviewed
- Follow-up TODOs: CLAUDE.md summarizes these constraints as a 5-item list and now
  omits the cache-busting principle as a governance rule; refresh it in a separate
  change.
-->

# AI Knowledge Map Constitution

## Core Principles

### I. Static-First Architecture

The site's default and current architecture is a static, multilingual D3.js
application with no backend runtime. All behavior ships as pre-built HTML, CSS,
JS, and static assets served by Cloudflare Pages. Any capability that would
otherwise require a server, database, or runtime secret MUST first be delegated
to a static-compatible third-party service (e.g., Buttondown for newsletter,
Umami for analytics) whenever feasible.

Introducing a backend, dynamic runtime, or server-side component is NOT
forbidden — but it is a constitutional change. It MUST be justified in writing
(cost, attack surface, portability, and reviewability trade-offs), approved, and
ratified via a MAJOR version amendment to this document BEFORE implementation
begins. No backend may be added ad hoc or mid-sprint.

Rationale: statelessness keeps hosting free/cheap, minimizes the attack surface,
and preserves portability and reviewability. Making the shift a deliberate,
versioned decision — rather than an outright ban — keeps those benefits by
default while leaving a clear, auditable path for the project to mature when it
genuinely outgrows the static model.

### II. Trilingual Parity (i18n)

The three entry documents — root `index.html`, `/pt-br/index.html`, and
`/es/index.html` — MUST stay structurally identical and be updated together in a
single change whenever i18n content or any shared asset changes. No locale may
drift ahead of the others. Language-specific differences are limited to
translated copy and locale metadata (e.g., `hreflang`, `lang`). Partial updates
(one or two locales) are a violation, even when the untouched locales still
render.

Rationale: divergence between locales silently breaks SEO, accessibility, and
user trust; lockstep edits make parity verifiable in review.

### III. Cache-Busting on Cached Assets

The site has no build step, and `_headers` applies a 24-hour cache to `/css/*`
and `/js/*`. Therefore, any change to a file served from `/css/` or `/js/` — not
only `style.css` or `app.js` — MUST bump the version query string (`?v=N` →
`?v=N+1`) on every reference to that file, in all three `index.html` files, in
the same pull request.

Rationale: without the bump, returning visitors receive the cached (stale) asset
for up to 24 hours after deploy, even after a Cloudflare purge.

### IV. SEO & Accessibility Baseline (NON-NEGOTIABLE)

Every entry document MUST preserve the validated on-page baseline: a canonical
URL, `WebSite` Schema.org JSON-LD, a verified Open Graph image, correct heading
order (no skipped levels), sufficient color contrast, and an accessible
`llms.txt`. Automated audits (Lighthouse / PageSpeed Insights) MUST report
Accessibility = 1.0, SEO = 1.0, and agentic-browsing = 1.0 on all three URLs
before merge. Property verification for third-party tools MUST live outside the
HTML (DNS TXT), keeping the three documents structurally identical (see
Principle II).

Rationale: discoverability and accessibility are the product's core value; a
measurable, enforced baseline prevents silent regressions.

### V. Release Discipline (NON-NEGOTIABLE)

`main` is protected by a Ruleset; direct pushes are forbidden. Every change MUST
flow through: branch → push → pull request → green Cloudflare Pages status check
→ merge. A red or missing status check blocks merge. Changes affecting i18n or
shared assets MUST touch all three entry documents in the same PR.

Rationale: the deploy preview and required check are the project's only
integration gate; bypassing them removes the sole guarantee that production stays
green.

### VI. Measurement Integrity

Analytics event behavior MUST be validated in production only; Umami events are
NOT expected to fire on `*.pages.dev` preview deployments and MUST NOT be treated
as validated there. Event semantics MUST be documented and stable: the
`newsletter_signup` event measures INTENT (it fires on form submit), not
confirmed subscription; confirmation rate is derived by cross-referencing
Buttondown. Third-party property verification (e.g., Ahrefs) MUST use DNS TXT,
not in-page scripts.

Rationale: conflating preview with production, or intent with confirmation,
corrupts the only signals used to decide traction — and traction gates later
phases (e.g., monetization).

## Performance & Third-Party Debt

The Best Practices score has a ceiling imposed by third-party scripts
(analytics/fonts) whose deprecations and cookies are outside the project's
control. This is documented, accepted debt, not a defect to chase. Any
first-party change that lowers Best Practices, Total Blocking Time, or introduces
third-party cookies (e.g., the Ahrefs `analytics.js` planting `__cflb` /
`_cfuvid` / `__cf_bm`) MUST be justified or removed. Removal of a third-party
verification script MUST NOT precede confirmation that a valid alternative
verification (DNS TXT) is active.

Known open items are tracked outside this document (roadmap / release checklist)
and do not amend these principles.

## Governance

This constitution supersedes ad hoc practice. It is the source of truth for
release and quality gates.

- **Amendments**: proposed via PR that edits this file, reviewed against the
  release discipline in Principle V, and merged only with a green status check.
- **Versioning**: semantic. MAJOR = removal or redefinition of a principle;
  MINOR = a new principle or materially expanded guidance; PATCH = clarifications
  and wording that do not change intent. Every amendment updates the Sync Impact
  Report and the version line below.
- **Compliance review**: each PR is checked for parity (Principle II), asset
  cache-busting (Principle III), baseline scores (Principle IV), and release flow
  (Principle V) before merge.
- **Dates**: recorded in ISO `YYYY-MM-DD`.

**Version**: 1.1.0 | **Ratified**: 2026-08-25 | **Last Amended**: 2026-08-25
