# Feature Specification: Mobile Drill-Down Navigation

**Feature Branch**: `feat/002-mobile-drilldown` *(already checked out; no git extension hook is registered, so the branch was cut manually per Constitution Principle V)*

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "Make the map usable on phones by replacing the D3 tree with a drill-down navigation on small screens, while leaving the desktop experience untouched." — the full brief, including decided solution, rejected alternatives, open questions, constraints, and success criteria, is reproduced verbatim in [Original brief](#original-brief) at the end of this document.

## Overview

AI Knowledge Map is a 1,448-node, six-level-deep tree of AI concepts, drawn as a single
wide diagram that the visitor expands node by node. That diagram is the right tool on a
large screen and the wrong one on a phone: it is drawn at a fixed width several times
wider than a phone viewport inside a container that scrolls sideways, so labels are cut
off at both edges and every expansion pushes content further off-screen. Visitors on
phones drag, lose their place, and leave.

This feature gives narrow screens a different way to **navigate** the same tree — one
level at a time, as a tappable list with a breadcrumb trail — while keeping everything
else exactly as it is. The way a visitor **reads** a node (the definition panel with
model examples and tap-to-copy citation) already works on touch and is reused unchanged.
The desktop map is not touched.

A baseline audit performed while writing this spec establishes the facts the design has
to accommodate:

| Observed today | Why it matters for this feature |
| --- | --- |
| The map is drawn at a fixed ~1,580 px width inside a container that scrolls in both directions. | This is the mechanism behind the phone symptom. Any narrow-screen mode must not inherit it: the list must fit the viewport width with no sideways scrolling. |
| Tree shape is identical in all three locales: 1 root → 7 top-level sections → 1,448 nodes, maximum depth 6, up to 14 children under one node. | A breadcrumb can be up to seven segments long on a phone-width screen; a single screen can list up to 14 rows. Both must stay usable. |
| The longest node label is 143 characters in English, 162 in Spanish, 188 in Portuguese. | Rows must wrap long labels rather than truncate them — "no label cut off" is a success criterion, and the Portuguese labels are the stress test. |
| Every one of the 1,448 nodes has a definition; 43 leaf nodes additionally carry an external link; no non-leaf node carries a link. | There is no "empty definition" case to design for. The external-link behavior only ever applies to leaves. |
| Reading a node on desktop is a *hover* (opens the panel) and acting on it is a *click* (expand/collapse, or follow the link). On a phone there is only a *tap*. | The two desktop gestures collapse into one on touch. Each row therefore carries two tap targets — the name reads, a trailing control goes — see FR-010 (settled at specification: Question 1, option A). |
| The definition panel opens on hover, follows the pointer, and copies its content (plus an academic citation) on press. On touch devices today this already works via the browser's synthesized mouse events. | The panel is reused as-is; the feature only needs to open it from the new list and keep it fully visible on a narrow screen. |
| All three locales' app manifests already declare the installed app as standalone. | The "installed app always uses drill-down" rule has a reliable signal to key off. |
| Analytics today emit `node_click` (label, depth, expand/collapse/leaf, locale), `outbound_click` (label, URL, locale), and `newsletter_signup`. | Drill-down must keep the outbound event identical and must not break existing dashboards built on `node_click`. |
| The panel's "Model examples" heading is hard-coded in English on every locale. | A known pre-existing gap. This feature must not add more untranslated strings; fixing the existing one is not required here. |

Three design points were settled in the brief and are **not** open for discussion in
this feature: one level visible at a time (never the whole tree on a phone); the existing
panel is the only definition UI; and the mode is chosen by how wide the viewport is, not
by what device the visitor is using.

## Clarifications

### Session 2026-10-31

- Q: Which viewport width is the boundary below which phones and tablets get the drill-down view instead of the desktop map? → A: ≤ 960 px → drill-down; > 960 px → desktop map.
- Q: When a visitor rotates their device or resizes the window across 960 px while on the page, should the view switch modes immediately, or keep the mode chosen at load until reload? → A: Switch live, in either direction; the new view starts from its initial state.
- Q: When a phone visitor drills into a node or goes back up via the breadcrumb or back control, how should that be recorded in analytics? → A: Reuse `node_click` with the same fields; drilling in and going up are two new `action` values; opening the panel records nothing; outbound links reuse `outbound_click` verbatim.
- Q: Should each row in the drill-down list show a one-line excerpt of the node's definition under its name, or only the name? → A: Name only; definitions are read only through the panel.
- Q: What should the first drill-down screen show when the page loads on a phone? → A: The seven top-level sections as the first list; breadcrumb shows only "Home", no back control; tapping "Home" at the top level opens the root's definition in the panel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore the tree on a phone by drilling down (Priority: P1)

A visitor opens the site on a phone. Instead of a sideways-scrolling diagram they see a
vertical list of the top-level sections of the map. They tap "Machine Learning" and the
screen is replaced by the list of Machine Learning's children, with a breadcrumb at the
top reading *Home › Machine Learning*. They keep tapping deeper. At any point they can
tap any earlier crumb — or a back control — to return to that ancestor's list. Nothing
ever extends past the right edge of the screen.

**Why this priority**: This is the feature. Without it the other stories have no surface
to run on, and it alone turns a phone visit from "give up" into "can reach every node".

**Independent Test**: On a phone-width viewport, starting from the first screen, reach a
node six levels deep by taps alone, then return to the first screen with one tap on the
first crumb. Confirm at no point does the page scroll horizontally and no label is
clipped. Delivers the full navigation value with no other story shipped.

**Acceptance Scenarios**:

1. **Given** a visitor on a phone-width viewport, **When** the page finishes loading, **Then** they see a vertical list of the map's seven top-level sections, a breadcrumb reading only "Home" (localized), no back control, and no wide diagram.
2. **Given** the visitor is viewing any list, **When** they tap the trailing "open" control of a row that has children, **Then** the list is replaced by that node's children and the breadcrumb gains that node as its last segment.
3. **Given** the visitor is three or more levels deep, **When** they tap an earlier breadcrumb segment, **Then** the list for that ancestor is shown and the breadcrumb is trimmed back to it.
4. **Given** the visitor is any number of levels deep, **When** they tap the first breadcrumb segment, **Then** they are back at the top-level list in that single tap.
5. **Given** the visitor is at least one level deep, **When** they use the back control, **Then** they are shown the parent's list (one level up).
6. **Given** a node with 14 children and the longest Portuguese label, **When** its list is shown on a 360 px-wide viewport, **Then** every row is fully readable, long labels wrap onto additional lines, and the page scrolls vertically only.
7. **Given** a visitor who navigates with a keyboard or a screen reader, **When** they move through the list, breadcrumb, and back control, **Then** each control — including both the name and the trailing control of every row — is reachable in document order (breadcrumb → back → heading → each row's name, then its trailing control), is announced with its visible label, and activates with the standard key.
8. **Given** the dark theme is switched on, **When** the drill-down view is shown, **Then** the list, breadcrumb, and back control follow the dark theme like the rest of the page.
9. **Given** the production site, **When** the visitor drills into a node and then goes up one level, **Then** two `node_click` events are recorded with the existing fields and the two new action values, distinguishable from desktop expand/collapse in existing reports (validated in production only).

---

### User Story 2 - Desktop visitors notice nothing (Priority: P1)

A visitor on a laptop or desktop opens the site and gets exactly the map they have
always had: same layout, same spacing, same hover panel, same click-to-expand, same
analytics.

**Why this priority**: Equal to Story 1 because it is a non-negotiable constraint, not an
enhancement. The desktop map is the product's established experience and the reference
against which the success criteria are checked. A phone improvement that nudges the
desktop by a pixel is a regression.

**Independent Test**: Capture the production page at a desktop width on all three
locales before and after the change, compare pixel-for-pixel, and walk the hover /
expand / collapse / outbound-link interactions. No difference is acceptable.

**Acceptance Scenarios**:

1. **Given** a viewport wider than 960 px, **When** the page loads, **Then** the rendered page is pixel-identical to the current production page on all three locales.
2. **Given** the desktop map, **When** the visitor hovers, clicks, expands, collapses, and follows a link, **Then** every interaction and every analytics event behaves exactly as today.
3. **Given** a phone visitor who has asked their browser for the desktop site, **When** the page loads with the resulting wide viewport, **Then** they get the desktop map, not drill-down.

---

### User Story 3 - Read a definition and copy a citation on a phone (Priority: P2)

While drilling down, the visitor wants to know what "Reinforcement Learning" actually
means before going into it. They open its definition and the familiar panel appears —
definition, model examples where present — fully on screen. A tap on the panel copies
its text together with the academic citation, exactly as it does on desktop.

**Why this priority**: Reading is the point of navigating, but the panel already works on
touch; this story is about wiring it to the new list and keeping it visible, which is a
small increment over Story 1.

**Independent Test**: From any list on a phone-width viewport, open the definition of a
row, confirm the panel content matches the desktop panel for the same node, tap the
panel, and paste: the clipboard holds the definition plus the localized citation for the
current locale and date.

**Acceptance Scenarios**:

1. **Given** a row in the drill-down list, **When** the visitor taps the node's name, **Then** the existing definition panel opens showing that node's definition and, where the node has them, its model examples — and the visitor stays on the current list.
2. **Given** the panel is open on a phone-width viewport, **When** it is displayed, **Then** it is entirely within the viewport — no part of it is off-screen and the page does not gain horizontal scroll.
3. **Given** the panel is open, **When** the visitor taps it, **Then** the panel's text plus the locale-appropriate citation (site name, current page address, localized date) is placed on the clipboard — identical to the desktop behavior for the same locale.
4. **Given** the panel is open, **When** the visitor dismisses it or navigates to another list, **Then** the panel closes and does not linger over the new list.
5. **Given** the Portuguese or Spanish locale, **When** the panel opens from the drill-down list, **Then** its content is in that locale, and no string introduced by this feature appears in English.
6. **Given** the visitor is at the top-level list, **When** they tap the "Home" crumb, **Then** the panel opens with the root node's own definition ("Artificial Intelligence" in the page's locale) and the list does not change.

---

### User Story 4 - Follow a leaf's external link on a phone (Priority: P2)

The visitor reaches a leaf that points to an external resource. Activating it opens the
resource in a new tab, so the map stays where they left it, and the visit is counted the
same way an outbound click from the desktop map is.

**Why this priority**: 43 of 1,448 nodes carry links; it is a small share of the content
but the behavior is already specified by the desktop map, and mismatching it would make
the two modes feel like two products.

**Independent Test**: Navigate to a leaf with a link on a phone-width viewport, activate
it, and confirm a new tab opens to that address while the original tab still shows the
same list; confirm the outbound analytics event is recorded with the same fields as on
desktop (validated in production only, per Constitution Principle VI).

**Acceptance Scenarios**:

1. **Given** a leaf row that carries a link, **When** the visitor taps its trailing "open link" control, **Then** the link opens in a new tab and the current tab remains on the same list.
2. **Given** a leaf row that carries a link, **When** it is activated, **Then** the outbound-click event is recorded with the same label, address, and locale fields as a desktop outbound click.
3. **Given** a leaf row without a link, **When** it is displayed, **Then** it has no trailing control; tapping its name opens the panel and nothing navigates away.
4. **Given** a leaf row that carries a link, **When** the visitor taps its name, **Then** the definition panel opens and no link is followed — reading and following are separate taps.

---

### User Story 5 - The right mode in every situation (Priority: P3)

The mode is chosen by how wide the viewport is. A visitor who has installed the site as
an app always gets drill-down, regardless of width. Switching modes never carries state
across: each mode starts fresh from its natural starting point.

**Why this priority**: Correctness of mode selection matters, but the common cases (a
phone in portrait; a desktop browser) are already covered by Stories 1 and 2. This story
pins down the edges — installed app, rotation, resizing — so they are deliberate rather
than accidental.

**Independent Test**: Open the installed app on a tablet in landscape and confirm
drill-down; resize a desktop browser window across the threshold and confirm the mode
that results matches the documented rule; confirm the new mode starts from its initial
state rather than mirroring the other mode's position.

**Acceptance Scenarios**:

1. **Given** the site is running as an installed standalone app, **When** it launches at any viewport width, **Then** the drill-down mode is used.
2. **Given** a browser tab wider than 960 px showing the desktop map with several nodes expanded, **When** the viewport is narrowed to 960 px or less (window resize or device rotation), **Then** the drill-down view replaces the map immediately, starting at the top-level list, with no reload.
3. **Given** a browser tab at 960 px or narrower showing a drill-down list several levels deep, **When** the viewport is widened beyond 960 px, **Then** the desktop map replaces the list immediately, in its initial fully collapsed state, with no reload.
4. **Given** either mode, **When** the visitor reloads the page, **Then** the mode is chosen from the current viewport and installed-app status alone — no previous position is remembered.

---

### Edge Cases

- **Seven-segment breadcrumb on a 360 px screen**: at maximum depth the trail may not fit on one line. It must remain fully usable (every segment reachable) — wrapping or compacting the middle segments are both acceptable; hiding the first segment is not, because one-tap return to the top is a success criterion.
- **Longest label (188 characters) in a row and in the breadcrumb**: must wrap, never be clipped or ellipsised in the list; in the breadcrumb a compact form is acceptable as long as the full name is available to assistive technology.
- **Fourteen children in one list**: the screen scrolls vertically; the breadcrumb and back control stay reachable without scrolling back to the top (or are reachable again at the bottom).
- **Rotation exactly at the threshold width**: a viewport exactly 960 px wide is drill-down (the threshold belongs to the drill-down side); 961 px is the desktop map.
- **Tap on the panel to copy vs. tap to dismiss**: a touch visitor who taps the panel to close it will trigger a copy, as on desktop today. This is existing behavior and is not changed by this feature; it is noted so the implementation does not make dismissal harder.
- **Data fails to load**: the desktop map has no failure state today (the map region stays empty; the error goes to the console). The drill-down view must fail no worse — an empty map region with no broken controls; a localized failure message is out of scope.
- **Browser back button while drilling down**: this feature does not add per-node history (deep-linking is a later phase); the browser's back button therefore leaves the page, as it does on desktop today. The in-page back control is the way to go up a level.
- **Visitor zooms the page**: a narrow viewport combined with browser zoom still fits — the list is fluid, not fixed-width.
- **Installed app on a desktop-sized window**: drill-down is used (per the brief), even though the width would otherwise choose the desktop map.

## Requirements *(mandatory)*

### Functional Requirements

#### Mode selection

- **FR-001**: The system MUST choose between the desktop map and the drill-down view based solely on viewport width and installed-app status — never on the device type, operating system, or browser identification.
- **FR-002**: Viewports **960 px wide or narrower** MUST receive the drill-down view; viewports **wider than 960 px** MUST receive the desktop map. This is the site's existing wider layout breakpoint, so the mode switch and the page's single-column switch happen at the same width.
- **FR-003**: When the site is running as an installed standalone app, the drill-down view MUST be used at every viewport width.
- **FR-004**: When the viewport crosses 960 px in either direction while the page is open (device rotation, window resize), the view MUST switch modes immediately, without a reload. No navigation state (expanded nodes, current list, breadcrumb, open panel) MUST be carried from one mode to the other; a mode always begins from its initial state when it is entered — the top-level list for drill-down, the fully collapsed map for desktop.

#### Drill-down navigation

- **FR-005**: The drill-down view MUST present the children of the current node as a vertical list of rows, one node per row, showing the node's full name and nothing else from its content — no definition excerpt, no model examples. The panel (FR-013) is the only place a definition is rendered.
- **FR-006**: Exactly one level of the tree MUST be visible at a time; the drill-down view MUST never render the whole tree or multiple levels at once.
- **FR-007**: The drill-down view MUST show a breadcrumb trail from the top level to the current node, in which every ancestor segment is a control that returns the visitor to that ancestor's list. The first segment is always "Home" (localized) and stands for the root node. On first load the view MUST show the root's children (the seven top-level sections) with the breadcrumb reading only "Home". When the visitor is already at the top level, activating "Home" MUST open the root node's definition in the panel instead of navigating, so the root's definition is readable on a phone.
- **FR-008**: The drill-down view MUST provide a back control that returns the visitor to the parent list; at the top level the back control MUST be absent or inert.
- **FR-009**: Activating the trailing control of a row with children MUST replace the current list with that node's children and extend the breadcrumb.
- **FR-010**: Every row MUST offer two separately tappable targets: the node's **name**, which opens the definition panel (*read*), and a **trailing action control** at the row's end, which descends into the node's children, or opens the external link for a linked leaf (*go*). A definition-only leaf (no children, no link) has no trailing control. Both targets MUST be individually focusable and announced by assistive technology — the name as the node's name, the trailing control as "Open {name}" (for children) or "Open link: {name}" (for a linked leaf), in the page's locale.
- **FR-011**: The drill-down view MUST fit within the viewport width: the page MUST NOT scroll horizontally, and no row label or breadcrumb may be clipped. Labels MUST wrap rather than truncate.
- **FR-012**: Every node in the tree MUST be reachable from the top level by activating rows and breadcrumb/back controls alone, with no other gesture (drag, pinch, scroll-to-find).

#### Reading and acting on nodes

- **FR-013**: The drill-down view MUST open the **existing** definition panel to show a node's definition and model examples. No second definition presentation MUST be introduced.
- **FR-014**: When opened from the drill-down view, the definition panel MUST be positioned entirely within the viewport and MUST NOT introduce horizontal scroll.
- **FR-015**: The panel's press-to-copy behavior, including the locale-aware academic citation, MUST work unchanged when the panel is opened from the drill-down view.
- **FR-016**: Activating a linked leaf from the drill-down view MUST open the link in a new tab and MUST record the same outbound-click event, with the same fields, as the desktop map.
- **FR-017**: A leaf without a link MUST be presented as a definition-only row with no trailing control; tapping its name opens the panel and nothing navigates anywhere.

#### Desktop invariance

- **FR-018**: At viewport widths above the threshold, in a browser tab (not an installed app), the page MUST be visually and behaviorally identical to the current production page on all three locales: same layout, same panel, same interactions, same analytics events and fields.

#### Accessibility, localization, and parity

- **FR-019**: Every drill-down control (rows, breadcrumb segments, back control) MUST be reachable and operable by keyboard, MUST carry an accessible name matching its visible label, and MUST meet the site's existing contrast baseline in both light and dark themes.
- **FR-020**: Every user-facing string introduced by this feature (the "Home" crumb, the back control's label, and the accessible names of the per-row "open" and "open link" controls) MUST be available in all three locales and selected by the page's locale.
- **FR-021**: Any change to the entry documents MUST be applied to all three locales in the same change, preserving their structural parity, canonical URLs, structured data, and heading order.
- **FR-022**: Every reference to a changed cached asset MUST have its version marker bumped in all three entry documents in the same change.
- **FR-023**: The drill-down view MUST follow the site's light/dark theme toggle like every other component.

#### Data and analytics

- **FR-024**: The feature MUST consume the existing per-locale content as-is: same files, same node structure, no new fields.
- **FR-025**: Drilling into a node and going up (via a breadcrumb segment or the back control) MUST each record the existing `node_click` event with its current fields — node label, depth, action, locale — using two new `action` values that distinguish "drill in" from "go up" alongside today's expand / collapse / leaf. The label and depth are those of the node whose list is being shown after the action. Opening the definition panel MUST NOT record an event (matching desktop hover). The outbound-click event MUST be reused verbatim for linked leaves. The two new `action` values MUST be documented alongside the existing ones.
- **FR-026**: The feature MUST introduce no backend, no build step, no new third-party script, and no cookie.

### Key Entities

- **Node**: one concept in the map — a name, a definition, optional model examples, an optional external link (leaves only), and zero or more child nodes. Unchanged by this feature.
- **Current level**: the node whose children are being listed. Starts at the root ("Home"). Exists only in drill-down mode and only for the life of the page.
- **Navigation path**: the ordered chain of nodes from the root to the current level — what the breadcrumb renders. Each entry is a return point.
- **View mode**: one of *desktop map* or *drill-down*, derived from viewport width and installed-app status; never persisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 360 px-wide viewport, 100% of the 1,448 nodes are reachable by taps on rows, breadcrumb segments, and the back control alone, with zero horizontal scrolling at any point and zero clipped labels — verified on all three locales.
- **SC-002**: From any node at any depth, the top-level list is reached with exactly one tap on the first breadcrumb segment.
- **SC-003**: For any node, the definition panel opened from the drill-down view shows the same definition and model examples as the panel opened on desktop for the same node, and a tap on it places on the clipboard the same text plus citation the desktop produces for that locale.
- **SC-004**: All 43 linked leaves open in a new tab when activated from the drill-down view, and each records an outbound-click event with the same fields as the desktop map (verified in production).
- **SC-005**: At desktop widths, screenshots of all three locales after the change are pixel-identical to the production page before the change, and every desktop interaction and analytics event is unchanged.
- **SC-006**: Lighthouse Accessibility = 1.0, SEO = 1.0, and agentic-browsing = 1.0 on all three production URLs after the change, matching the current baseline.
- **SC-007**: A keyboard-only visitor on a phone-width viewport can reach a node six levels deep and return to the top using only Tab, Enter/Space, and arrow keys where applicable, with every control — both targets of every row, each crumb, and the back control — announced by name.
- **SC-008**: A first-time phone visitor, given the task "find the definition of Reinforcement Learning," completes it in under 60 seconds without instructions, in moderated testing with at least five participants.
- **SC-009**: No new untranslated string appears on the Portuguese or Spanish pages; the count of English-only strings on those pages does not increase from today's baseline of one ("Model examples").

## Assumptions

The brief lists five questions it expects `/speckit-clarify` to settle. Each has a
default below so planning can proceed; clarification may overturn any of them.

- **Threshold width (open question 1) — settled, see Clarifications**: **960 px**, belonging to the drill-down side (≤ 960 px → drill-down; > 960 px → desktop map). Rationale: the desktop map is ~1,580 px wide, so a 769–960 px tablet still cannot show it without sideways scrolling; drill-down is the better experience there.
- **Rotation / resize across the threshold (open question 2) — settled, see Clarifications**: **switch live** in either direction, each mode starting from its initial state. Rationale: the brief's statement that "switching mode starts that mode from its natural starting point" already anticipates switching; locking at load would leave a rotated tablet in the wrong mode until reload.
- **Row preview of the definition (open question 3) — settled, see Clarifications**: **no preview** — rows show the name only; definitions are read exclusively through the panel. Rationale: a per-row excerpt is a second definition UI by another name, and at 14 rows with long labels it works against "no label cut off".
- **Root screen on first load (open question 4) — settled, see Clarifications**: the **list of the seven top-level sections**, with the breadcrumb reading just "Home" and the back control absent. The root node's own definition is reachable by tapping the "Home" crumb while already at the top level (where it has nowhere to navigate to), so the root is not the one node a phone visitor can never read.
- **Analytics for drill-down navigation (open question 5) — settled, see Clarifications**: **reuse `node_click`** with the same fields; two new `action` values distinguish drilling in from going up, so existing dashboards keep working and the new mode is distinguishable. Opening the panel records nothing. The outbound event is reused verbatim. Validation happens in production only (Constitution Principle VI).
- "Home" is the first breadcrumb segment in every locale, rendered in that locale's word, and stands for the root node ("Artificial Intelligence" / "Inteligência Artificial" / "Inteligencia Artificial").
- The existing panel is reused as-is apart from being kept within the viewport; its visual design, content, copy behavior, and hide timing are unchanged. Keeping it on-screen is a positioning constraint, not a redesign.
- The pre-existing hard-coded English "Model examples" heading in the panel is a known gap and is not expanded by this feature; fixing it is welcome but not required for this feature to be complete.
- Browser-history integration (back button moving up one level) belongs to the later deep-linking phase and is not expected here.
- The info cards below the map, the newsletter form, the theme toggle, and the header are unchanged; on narrow screens they continue to render as they do today beneath the drill-down view.
- Lighthouse scores are checked on the three production URLs after merge, as the constitution requires; previews are used only for visual and functional verification.

## Out of Scope

- Full-text search across the tree.
- Any change to the desktop map's layout algorithm, spacing, or rendering.
- Offline support or a service worker.
- Per-node URLs / deep-linking and browser-history integration (Phase 3).
- Redesign of the definition panel.
- Changes to the information cards below the map.
- Per-row definition previews or excerpts.
- Pan/zoom, fit-to-width scaling, or reliance on native pinch zoom — rejected alternatives recorded in the brief.

## Original brief

> Make the map usable on phones by replacing the D3 tree with a drill-down navigation on small screens, while leaving the desktop experience untouched.
>
> **PROBLEM**
> On a phone the current D3 tree is wider than the viewport: labels are cut off at both edges, and reaching any node requires dragging a canvas larger than the screen and chasing lines that disappear off-edge. Users get lost and give up. The hover panel itself already works on touch (tap opens it, tap-to-copy works), so the problem is navigating the tree, not reading a definition.
>
> **SOLUTION (decided; do not reopen)**
>
> - Drill-down by screen replacement: the user sees the children of the current node as a tappable vertical list; tapping a node with children replaces the screen with that node's children; a breadcrumb (Home › ... › current) and a back control let the user return to any ancestor. One level visible at a time, never the whole tree.
> - The existing hover panel (definition, model examples, tap-to-copy with academic citation) is REUSED as the way to read a node's definition in drill-down mode. Do not build a second definition UI.
> - A leaf node that has a url opens that link in a new tab, matching desktop behavior and the existing outbound_click analytics event.
> - Mode selection is by viewport width, not user agent: narrow viewport → drill-down; wide viewport → the current desktop D3 map, unchanged. A phone user who requests the desktop site therefore gets the desktop map, because the browser reports a wide viewport.
> - When the site runs as an installed PWA (display-mode: standalone), drill-down is used unconditionally.
> - No state is carried between modes: switching mode starts that mode from its natural starting point.
> - Desktop (wide viewport) must be visually and behaviorally identical to today: same layout algorithm, same hover panel, same analytics events.
>
> **REJECTED ALTERNATIVES (for the record)**
> Pan/zoom with d3.zoom, fit-to-width scaling, and relying on native pinch zoom. All keep a representation that does not fit the screen and require the user to learn a gesture; drill-down is self-evident.
>
> **OPEN QUESTIONS (expected to be settled at /speckit-clarify)**
>
> - Exact breakpoint, aligned with the existing 960px and 768px CSS breakpoints.
> - Behavior on device rotation across the breakpoint: switch mode live, or lock the mode chosen at page load.
> - Whether each list row shows a one-line preview of the definition, or definitions are read only through the panel.
> - What the root screen shows on first load in drill-down mode.
> - Whether drill-down navigation emits an analytics event (and which), or reuses node_click as-is.
>
> **CONSTRAINTS (constitution; these are requirements)**
>
> - Static-first: no backend, no build step, no new third-party script or cookie.
> - Trilingual parity: any markup change touches all three entry documents in the same change; any new user-facing string in shared JS gets entries in the per-locale lookup maps, like the existing newsletter messages. Locale comes from getLang().
> - Cache-busting: this feature changes files under /js/ and likely /css/, so every reference gets its ?v= bump in all three index.html in the same PR.
> - Accessibility = 1.0, SEO = 1.0, agentic-browsing = 1.0 on all three production URLs must hold. Drill-down controls must be keyboard-reachable and labeled.
> - Data stays as is: the same per-locale data.json, same node schema; no new fields.
>
> **OUT OF SCOPE**
> Full-text search; changes to the D3 layout; offline/service worker; URL deep-linking per node (Phase 3); redesign of the hover panel; changes to the info cards below the map.
>
> **SUCCESS CRITERIA**
>
> - On a phone-width viewport, every node in the tree is reachable by taps alone, with no horizontal scrolling and no label cut off.
> - From any node, the user can return to the root in one tap on the breadcrumb.
> - Tapping a node shows its definition in the existing panel, and tap-to-copy still produces the citation.
> - Leaf links open in a new tab.
> - At desktop widths the page is pixel-identical to the current production page.
> - Lighthouse Accessibility, SEO, and agentic-browsing unchanged on all three locales.
