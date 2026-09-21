# Product

## Register

product

## Users
Municipal administrators and city staff (public works, accessibility, environmental desks) reviewing StreetSync citizen reports. They work at desks or in dispatch rooms, often under time pressure, scanning many tickets to decide what to dispatch next. Companion surfaces: `street_sync` (Flutter reporting app) and the StreetSync marketing demo site.

## Product Purpose
Give municipal admins a single ops console to triage citizen infrastructure reports: see open / in-progress / closed volume at a glance, browse and filter the full queue, locate issues on a map (with heatmap density), open a report detail, and update status. Success is faster prioritization and clearer geographic awareness of where problems cluster.

## Brand Personality
* **Three-word personality:** Clear, Operational, Trustworthy
* **Voice & Tone:** Direct municipal software — short labels, concrete status language, no marketing fluff.
* **Emotional Goals:** Confidence that nothing critical is buried; calm control over the queue.

## Anti-references
* Cluttered legacy 311 / municipal portals with dense form chrome
* Generic purple/neon SaaS dashboards and glassmorphism
* Consumer “file manager” toyfulness that hides severity and aging
* Dark-mode ops theater unless requested

## Design Principles
1. **Queue First** — Status counts and the report list are the primary job; decoration never outranks triage.
2. **Geography as Evidence** — Map and heatmap exist to answer “where is this breaking?” not as wallpaper.
3. **StreetSync Continuity** — Match the citizen app: `#F7F8FA` canvas, charcoal (`#111827`) CTAs, Nunito wordmark + Inter UI, glass stats strip, divider report rows. Not a blue SaaS admin skin.
4. **Actionable Detail** — Selecting a report reveals enough to act (severity, category, location, photo, status change).
5. **Honest Demo Data** — Synthetic reports are labeled as such until live API wiring lands.

## Accessibility & Inclusion
* WCAG 2.1 AA contrast for body text and controls
* Keyboard-reachable list, map alternatives (table always available), and visible focus rings
* Respect `prefers-reduced-motion`
* Color never sole severity/status signal — pair with labels
