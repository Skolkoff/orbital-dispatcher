# Орбитальный диспетчер

«Орбитальный диспетчер» — учебный тренажёр по координатной плоскости для учеников 5–6 классов. Пять игровых миссий постепенно знакомят с координатами, маршрутами, отрицательными числами, симметрией и перемещениями.

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

Install the Playwright browser once with `npx playwright install chromium`, then run the automated checks:

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run security:check
npm run build
```

Security scans require Gitleaks and Semgrep on `PATH`; see [Security](Docs/SECURITY.md). GitHub Actions runs the same unit, browser, dependency, secret, and static-analysis checks for changes to `product`.

See [product overview](Docs/OVERVIEW.md), [development workflow](Docs/DEVELOPMENT.md), and [security](Docs/SECURITY.md). Progress is stored in this browser only; this frontend has no account or password flow. Do not enter real personal data.
