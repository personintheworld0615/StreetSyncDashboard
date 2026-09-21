# Design System: StreetSync Municipal Dashboard

Visual authority is the current StreetSync Flutter app (`street_sync` HomeScreen / ReportListCard / MainShell), not a generic SaaS ops template.

## 1. Visual Theme & Atmosphere
Daylight civic ops console. Same StreetSync materials as the mobile app (paper-gray, charcoal, Inter, capsule pills) composed as a **desktop dispatch surface**, not a scaled-up HomeScreen.

Physical scene: city staff at a bright desk; map and queue share the screen.

* **Density:** 7 (scan-first)
* **Variance:** 3 (stable shell)
* **Motion:** 3 (180ms ease-out; honor reduced motion)

## 2. Color Palette
* **Canvas** `#F7F8FA`
* **Ink / CTA** `#111827`
* **Muted** `#757575` / labels `#6B7280`
* **Selected pill** `#E8EAED`
* **Icon well** `#EEF0F3`
* **Hairline** `#E5E7EB`
* **Dock / surface** `#FFFFFFF8`
* **High** `#E53935` fill `#FFEBEE`
* **Medium** `#FB8C00` fill `#FFF3E0`
* **Low** `#43A047` fill `#E8F5E9`
* **Open** `#4B5563` fill `#F3F4F6`
* **In progress** `#EA580C` fill `#FFF1E8`
* **Resolved** `#0F766E` fill `#E6F4F1`

Strategy: **Restrained**. Charcoal owns actions. Seed blue `#2196F3` is not dashboard chrome.

## 3. Typography
* **Wordmark:** Nunito 700, modest (~22px) in the top bar — not the 50px mobile splash
* **UI / body:** Inter
* Report titles: Inter 600, 14px
* Meta: Inter 400, 12–13px, `#757575`

## 4. Layout
* Compact top bar: small wordmark, inline status counts, search, charcoal view toggle
* Left queue + map (or table) filling the remaining viewport; detail is an in-flow third column
* Do not clone mobile home: no photo hero, no greeting, no “Near you”, no full-width charcoal banner
* Report rows: circular icon, title, `location · pill · time` — not nested cards
* Category filters: selected `#E8EAED` capsule
* Primary actions: charcoal, radius 999, sized for desktop (compact segmented controls, not 54px mobile CTAs)

## 5. Motion
* 160–180ms ease-out for chips, selection, detail panel
* Reduced motion: crossfade / instant

## 6. Anti-Patterns
* No Material-blue sidebar, progress “queue load” widget, or lucide-in-colored-square KPI tiles
* No outline badges as the default pill
* No uppercase tracked section kickers
* No glassmorphism on the dashboard (the mobile hero glass is a HomeScreen device, not a console one)
* Color never sole carrier of status/severity
