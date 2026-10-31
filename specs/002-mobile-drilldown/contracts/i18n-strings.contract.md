# Contract: Drill-Down User-Facing Strings

**Scope**: every string this feature adds to shared `public/js/app.js`, in all three locales.
**Satisfies**: FR-020, FR-021; Story 3 sc. 5; SC-009; Constitution Principle II.

## S1 — Table

Keyed by `getLang()` (`"en"`, `"pt-br"`, `"es"`), stored in one module-level object
`DD_STRINGS` next to `getSignupMessage`, accessed through `ddText(key, name)`; an unknown
locale falls back to `"en"` exactly as `getSignupMessage` does.

| Key | Used for | `en` | `pt-br` | `es` |
| --- | --- | --- | --- | --- |
| `home` | first crumb (root) | Home | Início | Inicio |
| `back` | back control label | Back | Voltar | Volver |
| `breadcrumb` | `aria-label` of the `<nav>` | Breadcrumb | Trilha de navegação | Ruta de navegación |
| `open(name)` | `aria-label` of a section row's trailing control | Open {name} | Abrir {name} | Abrir {name} |
| `openLink(name)` | `aria-label` of a linked leaf's trailing control | Open link: {name} | Abrir link: {name} | Abrir enlace: {name} |

`{name}` is interpolated from `node.data.name` (already localized in the per-locale
`data.json`).

## S2 — Rules

- S2.1 All five keys exist in all three locales. A locale missing a key is a Principle II
  violation, not a fallback case.
- S2.2 No other string literal reaches the DOM from the drill-down renderer. Glyphs `›`
  and `↗` are decorative (`aria-hidden`) and are not strings in this sense.
- S2.3 The `<h2 class="dd-title">` at the top level shows the root node's **name** from
  data (e.g. "Inteligência Artificial"), not `home`. The crumb shows `home`.
- S2.4 The pre-existing English `"Model examples"` heading inside `renderPanel` is a
  known gap and is **not** in scope; it is not made worse. SC-009 counts English-only
  strings on the non-English pages and requires the count to stay at that baseline of 1.
- S2.5 The citation templates in `copyHoverContent` key off `document.documentElement.lang`
  (`"pt-BR"`), not `getLang()` (`"pt-br"`). This feature does not touch them and must not
  conflate the two maps.

## S3 — Verification

On `/pt-br/` and `/es/` at 360 px, inspect: crumb text, back text, `nav[aria-label]`,
and the `aria-label` of one section row and one linked row — each must match the table.
`grep -n '"en"' public/js/app.js` must show the new table alongside the existing maps,
and no new English literal elsewhere in the drill-down section.
