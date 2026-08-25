# Feature Specification: PWA Installability (Layer 1)

**Feature Branch**: `001-pwa-installability` *(not yet created — no git extension hook is registered; branch must be cut manually per Constitution Principle V)*

**Created**: 2026-08-25

**Status**: Draft

**Input**: User description: "Make the site installable as a Progressive Web App (PWA Layer 1 — installability only). Visitors on desktop and mobile should be able to install AI Knowledge Map to their device/home screen and launch it as a standalone app (its own window, app icon, and name) instead of a browser tab. Explicitly excludes offline capability, service workers, push notifications, background sync, and app-store packaging. Must preserve trilingual parity, static-first architecture, and the SEO/accessibility/agentic-browsing baseline."

## Overview

AI Knowledge Map is currently only reachable as a browser tab. This feature makes it
**installable** — a visitor can add it to their home screen or desktop and launch it in
its own window, with the project's real name and icon, on all three locales.

The site already ships most of the raw material: a `site.webmanifest`, 192px and 512px
app icons, a 180px Apple touch icon, and favicons, all referenced identically from the
three entry documents. This feature therefore **corrects and completes** existing
declarations rather than introducing a new subsystem. A baseline audit performed while
writing this spec found the following gaps, which set the scope:

| Observed today | Why it matters |
| --- | --- |
| Manifest declares `name: "AI Map Explorer"`, `short_name: "AI Map"` | The brand everywhere else (`og:site_name`, JSON-LD `name`, `<title>`) is **AI Knowledge Map**. An installed app would sit on the home screen under a name that appears nowhere else on the site. |
| No icon declared with maskable purpose | Android adaptive-icon platforms letterbox or white-box a non-maskable icon, producing a visibly degraded home-screen icon. |
| No stable application identity declared | Application identity falls back to the launch URL, so a later change to the launch URL is treated as a different app by installed clients. |
| `start_url` is `/` for all three locales | A visitor who installs from `/pt-br/` or `/es/` launches into **English**. The install is silently wrong for two of three audiences. |
| No standalone-capable declaration for iOS Safari, and no iOS-specific app title | iOS ignores most manifest fields; without these, "Add to Home Screen" can open in a browser chrome rather than standalone, under a truncated page title. |
| No declared manifest language/direction | Assistive technology and app listings have no declared language for the app name. |

Icon **dimensions** were verified as correct (192×192, 512×512, 180×180), so no icon
re-cutting is required for the base sizes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install on an Android phone (Priority: P1)

A visitor browsing AI Knowledge Map on an Android phone is offered an "Install app" /
"Add to Home Screen" option by their browser. They accept, and an AI Knowledge Map icon
appears on their home screen. Tapping it opens the map full-screen, in its own task,
with no browser address bar — showing the project's correct name and a crisp, correctly
shaped icon.

**Why this priority**: Mobile home-screen presence is the single largest driver of
return visits and the most visible expression of "this is a product, not a page." It is
also the strictest environment: an install that satisfies Android satisfies the
installability requirements of every other platform in scope.

**Independent Test**: Open the production URL on an Android device (or a mobile-emulated
Chromium session), confirm the browser offers installation, install, and launch from the
home screen. Delivers the full return-visit value on its own, with no other story shipped.

**Acceptance Scenarios**:

1. **Given** a visitor on an Android browser that supports installation, **When** they open any locale of the site, **Then** the browser offers an install / Add to Home Screen option without the visitor taking any special action.
2. **Given** the visitor accepts the install, **When** the icon is placed on the home screen, **Then** the icon is the project's app icon, correctly shaped for the platform (no white box, no letterboxing, no clipped artwork), and the label reads as the project's name.
3. **Given** the app is installed, **When** the visitor launches it from the home screen, **Then** the map opens in a standalone window with no browser address bar and is fully interactive (nodes expand, hover panel opens, theme toggle works).
4. **Given** the app is installed, **When** the visitor launches it, **Then** the window's system/status colouring matches the site's declared theme colour rather than a browser default.

---

### User Story 2 - Install on desktop (Priority: P2)

A visitor on a Chromium-based desktop browser sees the install control in the address
bar, installs AI Knowledge Map, and it opens in its own resizable window with the
project's icon in the taskbar/dock — separate from their browser tabs.

**Why this priority**: The map's wide, label-heavy layout is most usable on a large
screen, and a dedicated window is where a research tool earns repeat use. It depends on
the same declared identity as Story 1, so it ships as a near-free increment, but the
mobile home screen is the higher-traffic surface.

**Independent Test**: Load the production URL in a Chromium-based desktop browser,
confirm the install control appears, install, and launch from the OS launcher.

**Acceptance Scenarios**:

1. **Given** a visitor on a Chromium-based desktop browser, **When** they load any locale, **Then** the browser's install control is available in the address bar.
2. **Given** they install, **When** the app is launched from the OS launcher/dock/taskbar, **Then** it opens in a standalone window with the project's icon and name, and no browser tab strip or address bar.
3. **Given** the standalone window, **When** the visitor resizes it from narrow to wide, **Then** the map's responsive layout behaves exactly as it does in a browser tab at the same widths.

---

### User Story 3 - Install from a non-English locale (Priority: P2)

A Brazilian visitor reading the map at `/pt-br/`, or a Spanish-speaking visitor at
`/es/`, installs the app. Launching the installed icon takes them back to the map **in
the language they installed from**, not to the English root.

**Why this priority**: Two of the site's three audiences are non-English. An install that
silently relaunches in English converts the feature from an asset into a defect for the
majority of installers. It is separated from Story 1 because it is independently
testable and carries its own decision (see Clarification Q1).

**Independent Test**: Install from `/pt-br/` on a clean profile, launch from the home
screen, and confirm the language of the loaded map and of the app label.

**Acceptance Scenarios**:

1. **Given** a visitor on `/pt-br/`, **When** they install and then launch the installed app, **Then** the map opens in Portuguese.
2. **Given** a visitor on `/es/`, **When** they install and then launch the installed app, **Then** the map opens in Spanish.
3. **Given** any of the three locales, **When** an installability audit is run against that locale's URL, **Then** it reports the page as installable with the same result as the other two.
4. **Given** the three entry documents, **When** their element structure is compared, **Then** they remain structurally identical — differences are limited to translated copy and locale metadata values.

---

### User Story 4 - Add to Home Screen on iOS (Priority: P3)

An iPhone visitor uses Safari's Share → "Add to Home Screen". The saved icon carries the
project's artwork and a readable name, and tapping it opens the map without Safari's
address bar.

**Why this priority**: iOS Safari has no install prompt and ignores most declared app
metadata, so this journey cannot be made as seamless as Stories 1–2 and depends on
platform-specific declarations. It is real value for a meaningful share of mobile
visitors, but it is the smallest and least controllable slice.

**Independent Test**: On an iPhone, use Share → Add to Home Screen, then launch the
resulting icon and observe the chrome, icon, and title.

**Acceptance Scenarios**:

1. **Given** an iPhone visitor on any locale, **When** they use Share → Add to Home Screen, **Then** the proposed name is the project's app name rather than a truncated page title.
2. **Given** the icon is added, **When** they launch it, **Then** the map opens without Safari's address bar and displays the project's icon during launch.
3. **Given** the icon on the home screen, **When** it is viewed at normal size, **Then** the artwork is not stretched, padded with an unintended background, or visibly low-resolution.

---

### Edge Cases

- **Browser without install support** (e.g., desktop Firefox, or a browser in private mode): the site MUST behave exactly as it does today — no broken control, no error, no visible placeholder for a feature that cannot run.
- **Launch with no network connection**: because offline support is explicitly out of scope, an installed app opened without connectivity shows the browser's standard network-error page. This is an accepted, documented limitation of Layer 1, not a defect.
- **Already installed**: a visitor who has already installed must not be offered a redundant install affordance, and re-visiting the site in a browser tab must continue to work normally.
- **Install from a locale, then navigate away**: a visitor who installs from `/pt-br/` and then navigates to `/es/` inside the installed window stays within the app window (no unexpected hand-off to the browser) — all three locales are part of the same application.
- **Dark mode**: the site's dark theme is a runtime toggle, while the app's declared theme and launch colours are static. The launch appearance must not flash a colour that clashes badly with either theme.
- **Short name truncation**: home-screen labels truncate at roughly 12 characters on common launchers; the short name must remain recognisable when truncated.
- **Icon safe zone**: platforms that mask icons to a circle or squircle crop up to the outer ~20% of the artwork; the icon must survive that crop without losing the mark.
- **Manifest served with the wrong content type**: if the host serves the app description file as plain text, browsers ignore it and installability silently fails — this must be verified against the live deployment, not assumed.
- **Locale drift**: a change that adds app metadata to one entry document but not the others is a Principle II violation even if all three still render correctly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST publish a machine-readable application description that installing browsers can discover from every locale entry point.
- **FR-002**: The application description MUST declare the project's real brand name, consistent with the name already used in the site's structured data, social metadata, and page titles.
- **FR-003**: The application description MUST declare a short label that remains recognisable when a launcher truncates it to roughly 12 characters.
- **FR-004**: The application description MUST declare app icons at every size required for installation on the platforms in scope, including at least one icon prepared for platforms that mask icons into a system shape.
- **FR-005**: The application description MUST declare that the app launches in a standalone window with no browser address bar.
- **FR-006**: The application description MUST declare a launch colour and a theme colour so that the launch and window chrome match the site's visual identity rather than a browser default.
- **FR-007**: The application description MUST declare a stable application identity that does not change if the launch URL is later adjusted, so that an update is not treated by installed clients as a different app.
- **FR-008**: The application description MUST declare the language of its own text so that assistive technology and app listings render the app name correctly.
- **FR-009**: Launching the installed app MUST return the visitor to the map in the locale they installed from. [NEEDS CLARIFICATION: Q1 — should each locale ship its own application description with a locale-specific launch URL and translated app name, or should all three share one description launching into English?]
- **FR-010**: All three entry documents MUST reference the application description and any app metadata in the same change, keeping their element structure identical; only metadata *values* may differ per locale.
- **FR-011**: The site MUST declare the platform-specific metadata iOS Safari requires to launch a home-screen icon without browser chrome and under the correct title.
- **FR-012**: The site MUST NOT register a service worker, cache assets for offline use, request notification permission, or register for background sync as part of this feature.
- **FR-013**: The install experience MUST rely on affordances that require no server, runtime, or third-party service — the application description and icons are static files served by the existing host.
- **FR-014**: On browsers that do not support installation, the site MUST render and behave exactly as it does today, with no visible artefact of the feature.
- **FR-015**: The site MUST NOT regress its published quality baseline: automated audits MUST continue to report Accessibility = 1.0, SEO = 1.0, and agentic-browsing = 1.0 on all three locale URLs, with no new third-party cookie and no Best-Practices regression.
- **FR-016**: If any file served from the cached asset paths (`/css/`, `/js/`) is modified by this feature, every reference to it in all three entry documents MUST have its version query string bumped in the same change.
- **FR-017**: Any newly published static file that constitutes a top-level resource MUST be reflected in the site's discovery files (sitemap with full hreflang alternates, and `llms.txt` where applicable).
- **FR-018**: The site MUST provide the install affordance described in the user journeys. [NEEDS CLARIFICATION: Q2 — is the browser's own native install control sufficient, or must the site also present its own in-page install button/prompt (which would add a UI component, shared-script strings in three locales, and a dark-mode treatment)?]
- **FR-019**: The install dialogue presented by the browser MUST identify the app clearly enough for a visitor to recognise what they are installing. [NEEDS CLARIFICATION: Q3 — should the application description include preview screenshots, which unlock a richer install dialogue on Android and desktop but require producing and maintaining new image assets?]
- **FR-020**: The application description and icon files MUST be verified against the **live deployment**, not only the source tree, confirming they are reachable and served in a form browsers accept.

### Key Entities

- **Application Identity**: What a visitor's device records when they install — the app's name, short label, language, stable identity, launch destination, window mode, and colours. Currently declared once, globally, and partly incorrect.
- **App Icon Set**: The artwork used for the home-screen icon, launcher, task switcher, and launch screen, in the sizes and shapes each platform demands. Base sizes exist and are correctly dimensioned; a mask-safe variant is missing.
- **Locale Entry Point**: One of the three URLs (`/`, `/pt-br/`, `/es/`) a visitor may install from. Each must yield an install that is correct for that audience while keeping the three documents structurally identical.
- **Quality Baseline**: The audited scores (Accessibility, SEO, agentic-browsing) and the structural-parity check that together gate merge. This feature must leave all of them intact and should improve the installability audit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An automated installability audit run against all three locale URLs reports the site as installable, with **zero** blocking findings, on 3 of 3 URLs.
- **SC-002**: A visitor on a supported mobile browser can go from landing on the site to a working home-screen icon in **under 30 seconds** and **no more than 3 taps** beyond the browser's own prompt.
- **SC-003**: A visitor on a supported desktop browser can go from landing on the site to a standalone app window in **under 30 seconds**.
- **SC-004**: The name shown under the installed icon and in the app window matches the project's brand name in **100%** of installs across the platforms in scope — measured as zero occurrences of any legacy or alternative name.
- **SC-005**: The installed icon renders with no visible white box, letterboxing, or clipping of the mark on **all** tested platforms, including at least one platform that masks icons to a system shape.
- **SC-006**: Launching the installed app from any of the three locales lands the visitor in the map **in the language they installed from**, verified on 3 of 3 locales.
- **SC-007**: The installed app opens with **no browser address bar** on 3 of 3 tested platforms (Android, Chromium desktop, iOS).
- **SC-008**: The structural-parity comparison of the three entry documents returns **empty** (zero differences) after the change.
- **SC-009**: Automated audits report Accessibility = 1.0, SEO = 1.0, and agentic-browsing = 1.0 on 3 of 3 locale URLs after the change — equal to or better than the pre-change measurement, with **zero** newly introduced third-party cookies.
- **SC-010**: The map's core interactions — expanding a node, opening the hover panel, copying a definition, toggling the theme, and submitting the newsletter form — all work inside the installed standalone window, verified as **5 of 5 passing**.
- **SC-011**: Visitors on browsers without install support see **zero** new UI elements, errors, or console errors attributable to this feature.
- **SC-012**: The change introduces **zero** service workers, **zero** cached-for-offline assets, and **zero** permission prompts — verifiable by inspection of the deployed site.

## Assumptions

- **Existing assets are the starting point.** The current `site.webmanifest`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png`, and favicons are corrected and extended rather than replaced. Their dimensions were verified correct (192×192, 512×512, 180×180); only declarations and, for the mask-safe icon, artwork treatment are in question.
- **Brand name.** Absent direction to the contrary, the app name becomes **"AI Knowledge Map"** (matching `og:site_name`, the JSON-LD `name`, and the page titles) and the short label becomes **"AI Map"**, replacing the current "AI Map Explorer" / "AI Map". This is treated as a correction of an inconsistency, not a rebrand.
- **Colours.** The existing declared theme colour (`#2563eb`) and white launch background are retained. The site's dark-mode toggle is a runtime state and is **not** mirrored into per-scheme launch colours in this feature.
- **Scope of the app.** All three locales belong to one application; navigating between them inside the installed window stays in the window.
- **HTTPS.** The site is already served over HTTPS by the existing host, satisfying the transport precondition for installation without any change.
- **Platforms in scope for verification.** Android/Chrome, a Chromium-based desktop browser, and iOS/Safari. Firefox desktop, which does not support installation, is verified only for non-regression.
- **Offline is out of scope and its consequence is accepted.** An installed app launched without connectivity will show a network error. Making that experience graceful is PWA Layer 2 work.
- **PWA Layer 2 gating.** The constitution (v1.1.0) contains no clause naming PWA layers. The gate on service workers is **derived**: a service worker's caching strategy directly conflicts with Principle III (cache-busting on `/css/` and `/js/`, which `_headers` caches for 24 h), and it introduces a client-side runtime whose relationship to Principle I (static-first) has not been adjudicated. Layer 2 therefore requires an explicit evaluation — and, depending on that reading, a constitutional amendment — before it is specified. This feature deliberately stays on the near side of that line.
- **Host behaviour.** The application description file is assumed to be served by the existing host with a content type browsers accept; FR-020 requires this to be **verified against production**, not assumed, because a wrong content type causes a silent installability failure.
- **No analytics requirement.** Instrumenting install events is not part of this feature. If added later, Principle VI applies (production-only validation).
- **Release flow.** Delivery follows Principle V — feature branch, pull request, green Cloudflare Pages check, merge. `main` is protected and no branch has been created by this command.

## Out of Scope

- Service workers, offline caching, and any asset pre-caching (PWA Layer 2).
- Push notifications and notification permission prompts.
- Background sync, periodic sync, and background fetch.
- App-store packaging (Google Play / TWA, Microsoft Store, App Store).
- File-handling, share-target, protocol-handling, shortcut, and widget declarations.
- Analytics instrumentation of install or launch events.
- Any change to the map's data, layout algorithm, or visual design.
