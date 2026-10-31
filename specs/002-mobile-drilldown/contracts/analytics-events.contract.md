# Contract: Analytics Events

**Scope**: Umami events emitted by `public/js/app.js` after this feature. This document is the "documented and stable semantics" Constitution Principle VI requires.
**Satisfies**: FR-016, FR-018, FR-025; Story 1 sc. 9; Story 4 sc. 2; SC-004.

All calls remain guarded by `if (window.umami)`. Events fire on production only;
`*.pages.dev` previews are not a validation surface (Principle VI).

## E1 — `node_click` (existing event, extended `action` domain)

| Field | Type | Desktop (unchanged) | Drill-down (new) |
| --- | --- | --- | --- |
| `node_label` | string | name of the clicked node | name of the node whose list is shown **after** the action |
| `depth` | number | depth of the clicked node | depth of that same node (root = 0) |
| `action` | enum | `"expand"` \| `"collapse"` \| `"leaf"` | `"drill"` \| `"up"` |
| `lang` | enum | `getLang()` → `"en"` \| `"pt-br"` \| `"es"` | same |

Semantics of the new values:

| `action` | Fires when | `node_label` / `depth` |
| --- | --- | --- |
| `"drill"` | The visitor activates a section row's trailing control and the screen is replaced by that node's children. | The node entered. |
| `"up"` | The visitor activates an ancestor crumb **or** the back control, regardless of how many levels are skipped. | The ancestor whose list is now shown. Returning to the top level gives `node_label` = root name, `depth` = 0. |

Not emitted: opening the panel (`.dd-name` click, or the top-level "Home" crumb),
exactly as desktop hover emits nothing. No field is added, removed, or renamed, so
existing `node_click` reports keep working; filtering `action IN ("drill","up")`
isolates mobile navigation.

Example — a phone visitor on `/pt-br/` opens "Aprendizado de Máquina" then returns home:

```json
{ "node_label": "Aprendizado de Máquina", "depth": 1, "action": "drill", "lang": "pt-br" }
{ "node_label": "Inteligência Artificial", "depth": 0, "action": "up",    "lang": "pt-br" }
```

## E2 — `outbound_click` (existing event, unchanged)

| Field | Type | Value |
| --- | --- | --- |
| `node_label` | string | `d.data.name` |
| `url` | string | `d.data.url` |
| `lang` | enum | `getLang()` |

Emitted from the `click` handler of the `<a target="_blank">` in both renderers — the
desktop label link and the drill-down `a.dd-open`. The handler body is the same three
fields; navigation is not prevented.

## E3 — `newsletter_signup` (unchanged)

Not touched by this feature. Still measures intent on submit, not confirmed subscription.

## E4 — Verification (production only)

1. Open `https://aiknowledgemap.org/` on a phone (or DevTools at 360 px against
   production), drill one level, go back via the crumb, drill a linked leaf and follow it.
2. In Umami, filter `node_click` by `action = drill` and `action = up`, and
   `outbound_click` by the `url` used — each shows one event with the fields above and
   `lang = en`. Repeat once on `/pt-br/` and `/es/` to confirm `lang`.
3. Confirm desktop still emits `expand` / `collapse` / `leaf` with no change in shape.
