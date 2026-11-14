# Hestia — Hotel Operations Demo

[Open the live public demonstration](https://jfaugustin.github.io/hestia-ui-demo/)

This public repository provides Hestia's **synthetic, browser-local hotel operations preview**. It is not connected to payment processing, a production PMS, or the separate private Hestia backend. Do not enter real guest data, personal payment information, incident evidence, or employee records.

## Architecture

The site is served as a static application from GitHub Pages. The entrypoint is intentionally small:

| File | Responsibility |
|---|---|
| `index.html` | Document shell, branded sidebar and versioned module loading only |
| `logo.svg` | Architectural H monogram, shared by sidebar and browser favicon |
| `core.js` | Sample data initialization, reservation details, folios, dispatch state machine, security and financial demo workflows |
| `core.css` | Shared visual elements and existing operation component styles |
| `front-office.js` | Guest-service catalog, specialized request forms, linked department workflows |
| `front-office.css` | Responsive Front Office service workspace |
| `app-shell.js` | Authoritative single-pass renderer, nine-section navigation, overview, shared Rooms inventory and Operations |
| `app-shell.css` | Compact responsive design system |
| `housekeeping.js` | Role-specific Housekeeping views, workload allocation, inspection checklists, guest preferences, Engineering holds, supplies, and passdowns |
| `housekeeping.css` | Housekeeping-specific responsive workspace |
| `sw.js` | Network-first navigation fallback for static shell only (no ticket data cached) |

The app retains localStorage persistence for the original demonstration dataset. Existing synthetic records are preserved across releases until the user selects **Reset demo**. The reset action intentionally restores all sample records.

## Housekeeping operational rules

Housekeeping remains a standalone department. An attendant sees assigned rooms; a supervisor manages allocation and inspections; a manager additionally sees quality and supply tracking. Role selection is **preview-only** and is not authenticated. Room inventory tracks occupancy separately from each Housekeeping job’s cleaning and inspection state. A departure check-out creates a turnover, inspection requires recorded checklist completion, and blocking Engineering work prevents room release and Front Office check-in. Do Not Disturb and refused-service requests inhibit cleaning entry until documented clearance. Workload weights and priorities are illustrative rather than validated staffing targets.

## Engineering conventions

1. **One production render path:** `app-shell.js` owns the live demo renderer. Keep other modules focused on data and views; do not add a chained renderer or trigger a separate initial paint.
2. **One assignment function and one ticket lifecycle.** The `core.js` dispatch functions are authoritative within this demo.
3. **Keep guest service templates in `front-office.js`**, not in a second dispatch engine. Specialized requests share statuses, audit trails and assignment controls.
4. **Keep navigation in `app-shell.js`**. Departmental interfaces (including Housekeeping) remain distinct; contextual tabs support workflows within departments.
5. **Do not add real guest or payment integration to GitHub Pages.** Real authorization, storage and accounting belong behind a securely hosted backend.
6. Whenever updating a CSS or JS module, increment its version query in `index.html` to avoid stale browser caches, and update the matching regression assertions.

## Automated checks

The GitHub Actions Pages workflow must pass all five scripts before publishing:

```sh
node tests/demo-smoke.cjs
node tests/front-office-smoke.cjs
node tests/app-shell-smoke.cjs
node tests/housekeeping-smoke.cjs
node tests/brand-startup-smoke.cjs
```

These validate JavaScript execution, reservations/folios, ticket transitions, guest service templates, Housekeeping assignments and inspections, checkout-to-cleaning coordination, departmental navigation, the logo assets, and exactly one DOM render on startup and per navigation action. They are **not** browser-device, security, concurrency or production load tests.

## Hosting and mobile

The site deploys using [GitHub Actions](.github/workflows/deploy.yml). Use [the hosted preview](https://jfaugustin.github.io/hestia-ui-demo/) in Safari on iPhone rather than opening the ZIP or raw HTML file. If a stale cached version appears, reload the hosted page.

Production features such as authenticated roles, cross-device ticket synchronization, reliable push notifications and real card processing require additional private infrastructure.
