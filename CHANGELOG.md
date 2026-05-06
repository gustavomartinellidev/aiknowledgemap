# Changelog

All notable changes to **AI Knowledge Map** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-05-06

### 🎉 Initial Release

The first public version of the AI Knowledge Map — a curated, interactive visualization of the AI ecosystem, from foundational concepts to tools, ethics, governance, and risk management.

### Added

#### Interactive Map
- D3.js v7 collapsible tree layout with smooth transitions (1250ms duration).
- Dynamic horizontal column layout that adapts to label widths, preventing overlap on long concept names.
- Click-to-expand / click-to-collapse on any node (name or circle).
- Hover panel showing each concept's short definition and model examples.
- Click-to-copy on the hover panel — copies the definition together with an academic-style reference (site name, current URL, retrieval date) automatically attached, ready for notes and citations.
- Auto-resizing SVG that adapts to the depth and breadth of the visible tree.
- Visited-link styling and external-link safety (`target="_blank"` + `rel="noopener noreferrer"`).

#### Multi-language Support
- 🇺🇸 English (default at `/`).
- 🇧🇷 Portuguese — Brazil (`/pt-br/`).
- 🇪🇸 Spanish (`/es/`).
- Language selector with country flags in the header.
- Proper `hreflang` annotations (including `x-default`) for SEO across locales.

#### UI / UX
- Dark mode toggle with full theme override (background, cards, panels, text).
- Glassmorphism-style header controls (mode toggle + language selector) with `backdrop-filter` blur.
- Responsive layout with breakpoints at 960px and 768px.
- Information cards in the landing area: *How to Use the Map*, *Stay Updated*, *Feedback*, *Roadmap*, and *About the Project*.
- Inter + Outfit typography served via Google Fonts with `preconnect` for performance.
- Subtle hover transitions on info cards (`translateY(-5px)` + shadow).
- Smooth gradient header with a tinted brand wordmark.

#### Branding & Assets
- Custom favicons in multiple sizes (16x16, 32x32, `.ico`, Apple touch icon).
- `site.webmanifest` for PWA-friendly install behavior.
- Theme color metadata (`#2563eb`).
- Logo asset (`aikm_img_name.png`) in the header.

#### SEO & Discoverability
- Descriptive `<title>` and `<meta name="description">` per locale.
- Open Graph metadata (type, url, title, description, image, locale, site_name).
- Twitter Card metadata (`summary_large_image`).
- `sitemap.xml` and `robots.txt`.
- Theme color metadata for mobile browsers.

#### Project Setup
- MIT License (2026).
- Initial repository structure separating `css/`, `js/`, locale folders, and static data.
- Knowledge data externalized to `data.json` for easier contribution.

[1.0.0]: https://github.com/gustavomartinellidev/aiknowledgemap/releases/tag/v1.0.0
