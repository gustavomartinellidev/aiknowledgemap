# Quickstart: Validating PWA Installability (Layer 1)

**Date**: 2026-08-25 | **Plan**: [plan.md](./plan.md)

How to prove this feature works. Gates A–C run locally on the branch; gates D–F run
against the deployed preview or production. Implementation steps belong in `tasks.md` —
this document validates, it does not build.

**Prerequisites**: Python 3 with Pillow (verified available: PIL 7.0.0), `curl`, a
Chromium-based browser, and — for gate F — an Android device, a desktop OS, and an iPhone.

```bash
cd /home/GUSTAVO.MARTINELLI/Documentos/Gustavo/Projetos/aiknowledgemap
python3 -m http.server 8000 --directory public   # local server; file:// will not work
```

---

## Gate A — Manifest contract (C1–C7)

Covers FR-002, FR-003, FR-007, FR-008, FR-009, FR-009a, FR-004.

```bash
python3 - <<'PY'
import json, itertools, pathlib
root = pathlib.Path('public')
paths = {'en': root/'site.webmanifest',
         'pt-BR': root/'pt-br'/'site.webmanifest',
         'es': root/'es'/'site.webmanifest'}
expect_start = {'en': '/', 'pt-BR': '/pt-br/', 'es': '/es/'}
VARY = {'id', 'start_url', 'lang', 'description'}
ms = {}
for k, p in paths.items():
    assert p.exists(), f"C1 FAIL: missing {p}"
    ms[k] = json.loads(p.read_text(encoding='utf-8'))      # C1
print("C1 pass — three manifests parse as JSON")

inv = [{k: v for k, v in m.items() if k not in VARY} for m in ms.values()]
assert all(i == inv[0] for i in inv), "C2 FAIL: invariant fields differ across locales"
print("C2 pass — invariant fields byte-identical")

for k, m in ms.items():
    assert m['start_url'] == expect_start[k], f"C3 FAIL {k}: start_url {m['start_url']}"
    assert m['id'] == expect_start[k], f"C3 FAIL {k}: id {m['id']}"
print("C3 pass — id == start_url == canonical path, per locale")

ids = {m['id'] for m in ms.values()}
assert len(ids) == 3, f"C4 FAIL: ids not distinct: {ids}"
print("C4 pass — three distinct app identities")

sn = ms['en']['short_name']
assert len(sn) <= 12, f"C5 FAIL: short_name {sn!r} is {len(sn)} chars"
assert ms['en']['name'] == 'AI Knowledge Map', "C5 FAIL: brand name not corrected"
print(f"C5 pass — name 'AI Knowledge Map', short_name {sn!r} ({len(sn)} chars)")

icons = ms['en']['icons']
purposes = [i.get('purpose') for i in icons]
assert purposes.count('maskable') == 1, f"C7 FAIL: maskable count {purposes.count('maskable')}"
assert not any(p and ' ' in p for p in purposes), "C7 FAIL: a file combines purposes"
print("C7 pass — exactly one maskable entry, no combined purposes")
PY
```

## Gate B — Icon contract (C6, C8, C9, V12, V13)

Covers FR-004, SC-005, and Story 4 AC-3.

```bash
python3 - <<'PY'
import json, math, pathlib
from PIL import Image
root = pathlib.Path('public')
m = json.loads((root/'site.webmanifest').read_text(encoding='utf-8'))

for entry in m['icons']:                                   # C6
    f = root / entry['src'].lstrip('/')
    assert f.exists(), f"C6 FAIL: {entry['src']} does not exist"
    w, h = Image.open(f).size
    assert f"{w}x{h}" == entry['sizes'], f"C6 FAIL: {f.name} is {w}x{h}, declares {entry['sizes']}"
print("C6 pass — every declared icon exists at its declared size")

mk = root / [e['src'] for e in m['icons'] if e.get('purpose') == 'maskable'][0].lstrip('/')
im = Image.open(mk).convert('RGBA'); w, h = im.size; px = im.load()
alphas = {px[x, y][3] for y in range(h) for x in range(w)}
assert alphas == {255}, f"C8 FAIL: maskable icon has transparency (alpha values {sorted(alphas)[:3]}…)"
print("C8 pass — maskable icon fully opaque")

bg = px[0, 0]
cx, cy, r = w/2, h/2, 0.4*w
out = sum(1 for y in range(h) for x in range(w)
          if any(abs(px[x, y][i]-bg[i]) > 24 for i in range(3))
          and math.hypot(x+.5-cx, y+.5-cy) > r)
assert out == 0, f"C9 FAIL: {out} content pixels outside the 40%-radius safe circle"
print("C9 pass — all content inside the maskable safe circle")

ap = Image.open(root/'apple-touch-icon.png').convert('RGBA'); w, h = ap.size
assert (w, h) == (180, 180), f"V12 FAIL: apple-touch-icon is {w}x{h}"
apx = ap.load()
tr = sum(1 for y in range(h) for x in range(w) if apx[x, y][3] < 255)
assert tr == 0, f"V12 FAIL: apple-touch-icon has {tr} non-opaque pixels (iOS composites onto black)"
print("V12 pass — apple-touch-icon 180x180 and fully opaque")
PY
```

> **Baseline for comparison.** Before the change these assertions fail as follows, which is
> the defect this feature fixes: C8 — the only 512px icon is transparent in all four
> corners; C9 — **17.71 %** of content pixels fall outside the safe circle (content box
> 434 × 455 in a 512 canvas); V12 — `apple-touch-icon.png` is ~68 % transparent.
>
> Maskable generation parameters (the build step itself belongs in `tasks.md`): 512 × 512
> canvas, fill `#ffffff`, composite the existing `android-chrome-512x512.png` content box
> scaled by ≈ **0.63** and centred — derived from fitting a 434 × 455 box inside the
> inscribed square of a 409.6 px safe circle (409.6 / √2 ≈ 290 px).

## Gate C — Entry-document parity (H1–H6)

Covers FR-010, SC-008 and Constitution Principle II. **H1 must print nothing.**

```bash
cd public
for pair in "index.html pt-br/index.html" "index.html es/index.html"; do
  set -- $pair
  echo "H1 parity: $1 vs $2"
  diff <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' "$1") <(grep -oE '<[a-zA-Z][a-zA-Z0-9-]*' "$2") \
    && echo "  pass (empty)"
done

echo "--- H3: each document points at its own manifest ---"
grep -H 'rel="manifest"' index.html pt-br/index.html es/index.html

echo "--- H5: exactly one manifest link per document ---"
for f in index.html pt-br/index.html es/index.html; do
  printf '%s: %s\n' "$f" "$(grep -c 'rel="manifest"' "$f")"
done

echo "--- H2: iOS meta values identical across locales ---"
for f in index.html pt-br/index.html es/index.html; do
  printf '%s -> %s\n' "$f" "$(grep -oE 'name="(mobile-web-app-capable|apple-mobile-web-app-[a-z-]+)" content="[^"]*"' "$f" | tr '\n' ' ')"
done

echo "--- H4/FR-016: no /css/ or /js/ file touched, so no ?v= bump due ---"
git diff --name-only main -- public/css public/js | grep . && echo "  FR-016 FIRES: bump ?v=N in all three documents" || echo "  pass — nothing under /css/ or /js/ changed"
cd ..
```

## Gate D — Live delivery (C10, FR-020)

Run against the Cloudflare Pages preview first, then **again against production** after
merge. Content type is the silent-failure mode: a manifest served as `text/plain` is
ignored and installability fails with no visible error.

```bash
BASE=https://aiknowledgemap.org     # or the *.pages.dev preview URL
for p in /site.webmanifest /pt-br/site.webmanifest /es/site.webmanifest \
         /android-chrome-maskable-512x512.png /apple-touch-icon.png; do
  printf '%-42s ' "$p"
  curl -sSI --max-time 15 "$BASE$p" | grep -iE '^(HTTP|content-type)' | tr '\n' ' '; echo
done
```

**Expected**: `200` for all five; `application/manifest+json` for the three manifests
(production already does this today — the reason no `_headers` content-type rule is
added); `image/png` for the two images.

## Gate E — Installability audit (SC-001, SC-009)

For each of the three production URLs:

1. DevTools → **Application → Manifest**: confirm name "AI Knowledge Map", the locale's
   `start_url` and `id`, and that the maskable icon previews **without** a white box.
   Chrome's manifest pane flags safe-zone problems directly.
2. DevTools → **Console**: confirm no new deprecation entry from
   `apple-mobile-web-app-capable`. This is research R6's unconfirmed item — if an entry
   appears, drop that tag per the contract's fallback.
3. Lighthouse (or PSI) on the production URL: **Accessibility = 1.0, SEO = 1.0,
   agentic-browsing = 1.0**, Best Practices not below its pre-change value, and zero new
   third-party cookies.
4. Record all three URLs' scores before and after; Principle IV gates merge on them.

> Principle VI: analytics events do not fire on `*.pages.dev`. Nothing in this feature
> emits analytics, but the same origin logic matters here for a different reason — an
> install performed on a preview origin is a *different app* from a production install and
> proves nothing about production identity.

## Gate F — Manual install and launch (SC-002…SC-007, SC-010…SC-012)

| # | Platform | Steps | Pass |
|---|---|---|---|
| F1 | Android / Chrome | Open each locale → accept the browser's install offer → inspect the home-screen icon | Offer appears unprompted; icon has no white box, no letterboxing, no clipped mark; label reads "AI Map"; under 30 s and ≤ 3 taps (SC-002) |
| F2 | Android / Chrome | Launch from the home screen | Standalone, no address bar; status/system colour is `#2563eb`, not a browser default |
| F3 | Chromium desktop | Install from the address-bar control; launch from the OS launcher | Own window, project icon and name in taskbar/dock, no tab strip (SC-003, SC-007) |
| F4 | Chromium desktop | Resize the standalone window narrow → wide | Responsive behaviour identical to a browser tab at the 768 px and 960 px breakpoints |
| F5 | `/pt-br/` and `/es/` | Install from each, launch | Map opens **in the language installed from** (SC-006); installing all three yields three separate apps |
| F6 | any installed app | Navigate from `/pt-br/` to `/es/` inside the window | Stays in the app window — no hand-off to the browser (`scope: "/"`) |
| F7 | iOS Safari | Share → Add to Home Screen | Proposed name is "AI Map", not the 49-character page title; launch shows no Safari address bar; icon is not black-backed |
| F8 | any installed app | Expand a node · open the hover panel · copy a definition · toggle the theme · submit the newsletter form | 5 of 5 work inside the standalone window (SC-010) |
| F9 | Firefox desktop | Load all three locales | No new UI, no errors, no console errors (SC-011, FR-014) |
| F10 | Android, airplane mode | Launch the installed app | Browser's standard network-error page — **expected**, documented Layer 1 limitation, not a defect |
| F11 | any installed app | DevTools → Application → Service Workers / Cache Storage | **Zero** service workers, **zero** caches, **zero** permission prompts (SC-012, FR-012) |

---

## Merge checklist

- [ ] Branch `001-pwa-installability` cut from `main` (Principle V — `main` is protected)
- [ ] Gates A, B, C pass locally
- [ ] Gate C's parity `diff` returns **empty** for both pairs
- [ ] `CHANGELOG.md` `[Unreleased] → Added` entry written
- [ ] PR opened; Cloudflare Pages check green
- [ ] Gate D passes on the preview
- [ ] Gate E scores recorded, all three URLs, before and after
- [ ] Gate F1–F11 executed, or explicitly deferred with the platform named
- [ ] Gate D re-run against **production** after merge (FR-020)
