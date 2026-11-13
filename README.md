# Hestia — Interactive Hotel Operating System Demo

This public repository contains **only** the standalone demonstration interface for Hestia.

- **Web app:** [index.html](index.html), a self-contained responsive HTML, CSS and JavaScript application.
- **Synthetic data only:** reservations, service requests, room statuses and financial figures are demonstration records.
- **No server-side backend:** changes are saved in the current browser's local storage, not synchronized across devices.
- **Not suitable for real guest data.**

## Hosting
GitHub Pages deployment is defined in [the workflow](.github/workflows/deploy.yml).
Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** to activate deployment if needed.

When Pages is active, the expected URL is https://jfaugustin.github.io/hestia-ui-demo/ .
Do not treat this address as live until the deployment completes successfully.

## iPhone
Open the hosted GitHub Pages URL in Safari, not the `index.html` source viewer or a ZIP file preview.

The production-oriented backend remains in a separate, private repository.
