# Quickstart: Validating Mobile Drill-Down Navigation

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contracts**: [contracts/](./contracts/)

This is the verification procedure for the feature. It adds no dependency to the repo:
every gate is a shell command using tools already on the machine (`google-chrome`,
ImageMagick `compare`, `python3`, `git`) or a manual step in DevTools. Gates A–F run
locally on the branch; Gate G and H run against production after merge. Run them in order;
each gate names the spec items it proves.

## Prerequisites

```bash
cd /home/GUSTAVO.MARTINELLI/Documentos/Gustavo/Projetos/aiknowledgemap
git branch --show-current          # feat/002-mobile-drilldown
which google-chrome compare python3
```

Serve the site locally (required — `app.js` fetches `data.json`):

```bash
cd public && python3 -m http.server 8000     # http://localhost:8000/
```

For Gate B you also need a second checkout of `main` served on another port:

```bash
git worktree add /tmp/akm-main main
cd /tmp/akm-main/public && python3 -m http.server 8001
```

## Gate A — Parity and cache-busting (Principle II, III; FR-021, FR-022)

```bash
# element-sequence parity — must print nothing
diff <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' public/index.html) <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' public/pt-br/index.html)
diff <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' public/index.html) <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' public/es/index.html)

# version bumps — all three must show style.css?v=4 and app.js?v=3
grep -nE '\?v=' public/index.html public/pt-br/index.html public/es/index.html

# only the expected files changed
git diff --stat main -- . ':!specs' ':!.specify'
#   CHANGELOG.md, public/css/style.css, public/js/app.js, public/{,pt-br/,es/}index.html — nothing else
git diff main -- public/index.html public/pt-br/index.html public/es/index.html | grep '^[+-]' | grep -v '^[+-]{3}' 
#   only the two ?v= lines per file
```

**Expected**: empty diffs, six `?v=` lines at the new versions, and the index.html diff
limited to version strings.

## Gate B — Desktop pixel-identical (FR-018, SC-005; Story 2)

Headless screenshots of `main` (port 8001) and the branch (port 8000) at a desktop width,
after the 1,250 ms load transition settles.

```bash
mkdir -p /tmp/akm-shots
for loc in "" "pt-br/" "es/"; do
  tag=${loc%/}; tag=${tag:-en}
  google-chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1400,2200 \
    --virtual-time-budget=4000 --screenshot=/tmp/akm-shots/main-$tag.png  "http://localhost:8001/$loc"
  google-chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1400,2200 \
    --virtual-time-budget=4000 --screenshot=/tmp/akm-shots/branch-$tag.png "http://localhost:8000/$loc"
  compare -metric AE /tmp/akm-shots/main-$tag.png /tmp/akm-shots/branch-$tag.png /tmp/akm-shots/diff-$tag.png; echo "  <- $tag differing pixels"
done
```

**Expected**: `0` differing pixels for `en`, `pt-br`, `es`. Any non-zero result: open
`diff-<tag>.png` to locate the regression. (Web-font timing can cause false positives;
re-run once before investigating.)

Also diff the source: `git diff main -- public/js/app.js` must show `update(` with **no**
changed lines inside its body, and `git diff main -- public/css/style.css` must show only
additions matching `.dd`, `.dark-Mode .dd`, or the media-gated `#hover-panel` block
(contract D4.1).

## Gate C — Mode selection and live switch (FR-001…FR-004; Story 5; contract M7)

Open `http://localhost:8000/` in Chrome, DevTools → device toolbar → **Responsive**.

| Step | Width | Expected |
| --- | --- | --- |
| C1 | 961 | `#body` holds one `<svg>`, no `.dd` (console: `document.querySelectorAll('#body > *')`). |
| C2 | 960 | `.dd` present, no `<svg>`; 7 rows; 1 crumb; no back control. |
| C3 | 961 → expand 3 nodes → 960 | List shows the 7 top-level sections (fresh state). |
| C4 | 960 → drill 3 levels → 961 | Map shows only the root's children, collapsed (fresh state). |
| C5 | 960, open a panel → 961 | `#hover-panel` has class `hidden` immediately. |
| C6 | 961, click a node, resize to 960 within 1 s | No `<svg>` remains; no console errors. |
| C7 | 500 → 700 | No re-render (DOM nodes keep identity — set a breakpoint or check `.dd` is the same element). |

Standalone (FR-003):

```bash
google-chrome --app=http://localhost:8000/ --window-size=1300,900
```

**Expected**: a 1,300 px-wide app window shows the drill-down, styled (component rules
are unconditional, contract D4.2), with the panel as a bottom sheet.

## Gate D — Drill-down behavior (Story 1, 3, 4; FR-005…FR-017; SC-001…SC-004)

At 360 × 740 in the device toolbar, on each locale (`/`, `/pt-br/`, `/es/`):

| Step | Action | Expected |
| --- | --- | --- |
| D1 | Load | 7 rows, crumb "Home/Início/Inicio", `<h2>` = root name, no horizontal scroll (`document.documentElement.scrollWidth === 360`). |
| D2 | Tap "›" on the first row | Screen replaced; 2 crumbs; `<h2>` = that node; focus is on the `<h2>` (`document.activeElement.className === 'dd-title'`). |
| D3 | Repeat to depth 6 | Crumbs wrap to several lines; all visible; still no horizontal scroll. |
| D4 | Tap the first crumb | Back at top in one tap; 1 crumb. |
| D5 | Navigate to "Classification" (14 children) on `/pt-br/` | All 14 rows fully readable, long labels wrapped, vertical scroll only. |
| D6 | Tap a row's **name** | Panel opens as a bottom sheet, fully inside the viewport, showing definition (+ model examples if any); list unchanged. |
| D7 | Tap the panel | Clipboard = panel text + localized citation (paste into a text field to confirm; `Fonte:`/`Fuente:`/`Source:` with today's date). |
| D8 | Tap outside the panel | Panel hides. Tap "›" with the panel open → panel hides and screen changes. |
| D9 | At top level, tap the "Home" crumb | Panel opens with the root's definition; list unchanged. |
| D10 | Find a linked leaf (e.g. under AI Incidents) and tap "↗" | New tab opens to the URL; original tab unchanged. Tap its **name** → panel, no navigation. |
| D11 | A definition-only leaf | Has no trailing control; name tap opens the panel. |
| D12 | Toggle dark mode | List, crumbs, back, title, and panel adopt dark colours. |
| D13 | Strings on `/pt-br/` and `/es/` | Crumb, back label, `nav[aria-label]`, and the two `aria-label` patterns match [i18n-strings.contract.md](./contracts/i18n-strings.contract.md). |

## Gate E — Keyboard and screen reader (FR-019; SC-007; contract D2)

At 360 px, keyboard only:

1. Tab from the page top: reaches crumb buttons → back → each row's name then its "›"/"↗".
   The `<h2>` is skipped by Tab but is where focus lands after Enter on "›".
2. Enter on "›" drills; Enter on a crumb goes up; Enter/Space on a name opens the panel.
3. Reach depth 6 and return to the top using only Tab + Enter.
4. With a screen reader (Orca on Linux, VoiceOver on iOS if available): the breadcrumb is
   announced as navigation with its label; the current crumb as "current page"; trailing
   controls as "Open …" / "Open link: …"; the heading is announced after each move.

## Gate F — Accessibility and SEO, local pre-check (Principle IV)

```bash
npx --yes lighthouse http://localhost:8000/ --only-categories=accessibility,seo --form-factor=mobile  --quiet --output=json --output-path=/tmp/akm-shots/lh-mobile.json
npx --yes lighthouse http://localhost:8000/ --only-categories=accessibility,seo --form-factor=desktop --preset=desktop --quiet --output=json --output-path=/tmp/akm-shots/lh-desktop.json
python3 -I -c "import json,sys; [print(f, {k:v['score'] for k,v in json.load(open(f))['categories'].items()}) for f in sys.argv[1:]]" /tmp/akm-shots/lh-mobile.json /tmp/akm-shots/lh-desktop.json
```

**Expected**: accessibility 1 and seo 1 on both form factors. The mobile run renders the
drill-down view — this is the gate for the new DOM (`button-name`, `link-name`,
`heading-order`, `color-contrast`, `tap-targets`, `list`). Fix before opening the PR.

## Gate G — Production audit (Principle IV; SC-006) — after merge

On PageSpeed Insights for `https://aiknowledgemap.org/`, `/pt-br/`, `/es/`, mobile and
desktop: Accessibility = 1.0, SEO = 1.0, agentic-browsing = 1.0. Record the six results
in the PR before closing it. Compare with the pre-merge baseline captured the same way.

## Gate H — Analytics (Principle VI; FR-025; SC-004) — production only

Follow [analytics-events.contract.md § E4](./contracts/analytics-events.contract.md#e4--verification-production-only).
`drill`, `up`, and `outbound_click` events must appear in Umami with the documented fields
and the right `lang` for each locale; desktop `expand`/`collapse`/`leaf` unchanged.

## Merge checklist

- [ ] Gate A: parity diffs empty; `style.css?v=4`, `app.js?v=3` in all three documents; file set limited to the six expected files
- [ ] Gate B: 0 differing pixels on all three locales at desktop width; `update()` body unchanged in the diff
- [ ] Gate C: C1–C7 pass; `--app=` window uses drill-down, styled
- [ ] Gate D: D1–D13 pass on all three locales
- [ ] Gate E: keyboard-only round trip to depth 6 and back
- [ ] Gate F: local Lighthouse accessibility = 1, seo = 1, mobile and desktop
- [ ] `CHANGELOG.md` `[Unreleased] › Added` entry present
- [ ] PR opened from `feat/002-mobile-drilldown`; Cloudflare Pages check green
- [ ] Gate G after merge: six PSI results recorded on the PR
- [ ] Gate H after merge: Umami shows `drill` / `up` / `outbound_click` from each locale
