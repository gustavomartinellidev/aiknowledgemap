<!--
SYNC IMPACT REPORT
- Version change: (none) → 1.0.0
- Ratification date: 2026-08-25
- Last amended: 2026-08-25
- Principles: initial set (I–V) established
  - Principle I reformulated from "Static, No-Backend Architecture (NON-NEGOTIABLE)"
    to "Static-First Architecture": backend adoption is no longer forbidden but
    gated behind a deliberate MAJOR-version constitutional amendment.
- Added sections: Performance & Third-Party Debt; Governance
- Templates status: plan-template.md ⚠ pending review · spec-template.md ⚠ pending review · tasks-template.md ⚠ pending review
- Follow-up TODOs: fill ratification/amend dates before merge
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
translated copy and locale metadata (e.g., `hreflang`, `lang`).

Rationale: divergence between locales silently breaks SEO, accessibility, and
user trust; lockstep edits make parity verifiable in review.

### III. SEO & Accessibility Baseline (NON-NEGOTIABLE)

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

### IV. Release Discipline (NON-NEGOTIABLE)

`main` is protected by a Ruleset; direct pushes are forbidden. Every change MUST
flow through: branch → push → pull request → green Cloudflare Pages status check
→ merge. A red or missing status check blocks merge. Changes affecting i18n or
shared assets MUST touch all three entry documents in the same PR.

Rationale: the deploy preview and required check are the project's only
integration gate; bypassing them removes the sole guarantee that production stays
green.

### V. Measurement Integrity

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
  release discipline in Principle IV, and merged only with a green status check.
- **Versioning**: semantic. MAJOR = removal or redefinition of a principle;
  MINOR = a new principle or materially expanded guidance; PATCH = clarifications
  and wording that do not change intent. Every amendment updates the Sync Impact
  Report and the version line below.
- **Compliance review**: each PR is checked for parity (Principle II), baseline
  scores (Principle III), and release flow (Principle IV) before merge.
- **Dates**: recorded in ISO `YYYY-MM-DD`.

**Version**: 1.0.0 · **Ratified**: TODO(RATIFICATION_DATE) · **Last Amended**: TODO(AMEND_DATE)
