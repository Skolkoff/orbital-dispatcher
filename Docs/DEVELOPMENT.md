# Development workflow

## Requirements and startup

Use Node.js 22.13+ within major version 22, with npm. `.nvmrc` selects Node 22 for nvm users. The minimum patch version accommodates the current lint tooling; Vite's Node requirements are documented in its [getting started guide](https://vite.dev/guide/).

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Visit [http://localhost:5173](http://localhost:5173). Vite uses a strict port and exits if 5173 is busy. The host option makes the server available to other devices on your local network for responsive checks. Use `npm run dev` for the default local-only binding.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exactly the committed lockfile; requires registry access on first install. |
| `npm run dev` | Start Vite with hot reload on port 5173. |
| `npm run lint` | Run ESLint on project source and configuration; warnings fail. |
| `npm run typecheck` | Check app and tool configuration TypeScript without emitting files. |
| `npm run test` | Run the Vitest unit and component suites. |
| `npx playwright install chromium` | Install the browser used by Playwright (once per machine). |
| `npm run test:e2e` | Run Playwright end-to-end scenarios; starts Vite automatically if it is not running. |
| `npm run security:check` | Run npm audit, Gitleaks history scan, and Semgrep static analysis. Requires Gitleaks and Semgrep on `PATH`. |
| `npm run security:audit` | Check installed npm dependencies against the advisory database. |
| `npm run security:secrets` | Scan staged changes, working-tree changes, and Git history for secrets with Gitleaks. |
| `npm run security:static` | Scan app and E2E source with Semgrep JavaScript/TypeScript rules. |
| `npm run build` | Typecheck and produce a static build in `dist/`. |
| `npm run preview` | Serve the built `dist/` locally on strict port 4173. |

For local security tooling on macOS, install Gitleaks with `brew install gitleaks` and Semgrep with `brew install semgrep` (or install Semgrep with `uv tool install semgrep`). GitHub Actions installs the scanners in its security job. The Playwright browser is separate from npm dependencies and is installed with the command above.

## Project conventions

React renders the minimal entry in `src/main.tsx`. `index.html` sets Russian as the page language. Vite handles the development server and static production bundle; TypeScript checks app files and tool configuration separately. Keep UI text in Russian and preserve keyboard/touch usability as screens are added.

Use mock data and completed mission IDs for local demos. Do not add credentials, passwords, account records, or personal data. Frontend environment variables are public to the browser and must never contain secrets. No environment file is needed for this foundation.

Commit application source, the npm lockfile, root README, and public documentation under `Docs/`. Keep `node_modules/`, `dist/`, environment files, local design exports in `stitch_web_app/`, and local planning documents in `docs/superpowers/` out of Git. Deployment and server setup are deferred; local development uses ordinary npm commands without Docker.
