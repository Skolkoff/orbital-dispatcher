# Орбитальный диспетчер

Russian-language coordinate-plane trainer for pupils in grades 5–6. This repository currently contains the React + TypeScript + Vite foundation; interactive missions and automated behavior tests come in the next implementation tasks.

## Local quick start

Install Node.js 22 (22.13 or newer within the 22.x line) and npm. If using nvm, run `nvm install` and `nvm use` in this directory.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open [http://localhost:5173](http://localhost:5173). Port 5173 is fixed: stop the other process if it is already occupied. Docker and credentials are not required.

```sh
npm run lint
npm run typecheck
npm run build
npm run preview
```

The build writes `dist/`; preview serves it at [http://localhost:4173](http://localhost:4173).

`npm run test`, `npm run test:e2e`, and `npm run security:check` provide the Vitest, Playwright, and npm dependency-audit entry points. Test suites will be added in a later task; the test commands currently report no tests rather than a passing suite.

See [product overview](Docs/OVERVIEW.md) and [development workflow](Docs/DEVELOPMENT.md). This frontend uses demo data only; do not enter real account details or personal data.
