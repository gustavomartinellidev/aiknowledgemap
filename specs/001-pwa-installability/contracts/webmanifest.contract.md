# Contract: Web App Manifest (three locale instances)

**Consumer**: the browser's install machinery (Chrome/Chromium, Edge, Samsung Internet,
Firefox Android). **Producer**: static files in `public/`.

This is the interface the site exposes to installing user agents. It is versionless and
unnegotiated — the browser reads it or ignores it — so correctness is entirely on us.

---

## Field contract

| Field | Type | Required | Constraint |
|---|---|---|---|
| `id` | string | yes | Origin-relative. Unique per locale. Never changed after release — changing it makes existing installs orphans. |
| `name` | string | yes | `AI Knowledge Map`. Identical in all three. |
| `short_name` | string | yes | `AI Map`. ≤ 12 chars. Identical in all three. |
| `description` | string | yes | Translated per locale. ≤ 120 chars. |
| `lang` | string | yes | BCP 47: `en`, `pt-BR`, `es`. Matches the document's `lang` attribute. |
| `dir` | string | yes | `ltr` |
| `start_url` | string | yes | Origin-relative, matches the locale's canonical path. |
| `scope` | string | yes | `/` in all three — the whole origin is one app. |
| `display` | string | yes | `standalone` |
| `theme_color` | string | yes | `#2563eb` |
| `background_color` | string | yes | `#ffffff` |
| `icons` | array | yes | Exactly 3 entries: two `any`, one `maskable`. Identical in all three. |

**Not declared** (deliberate, per spec Out of Scope): `screenshots`, `shortcuts`,
`orientation`, `categories`, `share_target`, `file_handlers`, `protocol_handlers`,
`display_override`, `related_applications`.

---

## Instance 1 — `public/site.webmanifest` (English, root)

```json
{
  "id": "/",
  "name": "AI Knowledge Map",
  "short_name": "AI Map",
  "description": "A free, interactive AI knowledge map for students, researchers, and professionals.",
  "lang": "en",
  "dir": "ltr",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/android-chrome-maskable-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Instance 2 — `public/pt-br/site.webmanifest`

Identical to Instance 1 except:

```json
{
  "id": "/pt-br/",
  "description": "Um mapa de conhecimento de IA gratuito e interativo para estudantes, pesquisadores e profissionais.",
  "lang": "pt-BR",
  "start_url": "/pt-br/"
}
```

## Instance 3 — `public/es/site.webmanifest`

Identical to Instance 1 except:

```json
{
  "id": "/es/",
  "description": "Un mapa de conocimiento de IA gratuito e interactivo para estudiantes, investigadores y profesionales.",
  "lang": "es",
  "start_url": "/es/"
}
```

---

## Changes from the manifest shipped today

| Field | Today | Contract | Why |
|---|---|---|---|
| `name` | `AI Map Explorer` | `AI Knowledge Map` | FR-002 — matches `og:site_name`, JSON-LD `name`, and every page title. The current value appears nowhere else on the site. |
| `short_name` | `AI Map` | `AI Map` | unchanged |
| `description` | English only | per-locale | FR-009 |
| `id` | absent | per-locale | FR-007 |
| `lang`, `dir` | absent | declared | FR-008 |
| `scope` | absent | `/` | cross-locale navigation stays in-window |
| `icons` | 2 entries, both `any` | 3 entries, one `maskable` | FR-004, SC-005 |
| `start_url` | `/` for every locale | per-locale | FR-009 |
| `theme_color`, `background_color`, `display` | correct | unchanged | — |

---

## Contract tests

| ID | Assertion | How |
|---|---|---|
| C1 | All three files parse as JSON | `python3 -m json.tool` on each |
| C2 | The eight invariant fields are byte-identical across the three | strip `id`/`start_url`/`lang`/`description`, compare remainders |
| C3 | `id` == `start_url` == the locale's canonical path, per file | compare against each document's `<link rel="canonical">` |
| C4 | The three `id` values are distinct | set size == 3 |
| C5 | `short_name` ≤ 12 chars | length check |
| C6 | Every `icons[].src` resolves to a file that exists and whose real pixel size matches its declared `sizes` | filesystem + PIL |
| C7 | Exactly one entry has `"purpose": "maskable"`, and no entry combines purposes | count and substring check |
| C8 | The maskable file is fully opaque | PIL alpha min == 255 |
| C9 | No content pixel of the maskable file falls outside the 40 %-radius safe circle | PIL geometry check |
| C10 | Each file is served from production as `application/manifest+json` | `curl -sSI` after deploy |

Runnable forms of C1–C10 are in [quickstart.md](../quickstart.md).
