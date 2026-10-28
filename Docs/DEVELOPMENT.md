# Development

## Requirements

- Node.js 22.13 or newer within the 22.x line, with npm
- PHP 8.3 or newer with the extensions required by Laravel and PDO MySQL
- Composer 2
- MySQL 8.4 (or a compatible MySQL 8 release)

The project uses ordinary local processes; Docker is not required.

## First-time setup

Create a development database and a separate test database in MySQL:

```sql
CREATE DATABASE orbital_dispatcher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE orbital_dispatcher_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Install the frontend and configure Laravel:

```sh
npm ci
cd server
composer install
cp .env.example .env
php artisan key:generate
```

Edit `server/.env` with the local MySQL username and password. Keep the development values for the SPA URL and Sanctum stateful domains when using `localhost:5173` and `localhost:8000`; use the same hostname in the browser for both the SPA and API. Then run migrations:

```sh
php artisan migrate
```

The default local `array` mailer discards messages without logging reset tokens. To manually receive reset links, configure `MAIL_MAILER=smtp` with a local SMTP inbox and its host/port settings. Never log reset messages or tokens.

## Run the application

Use two terminals from the repository root. In the first:

```sh
cd server
php artisan serve --host=127.0.0.1 --port=8000
```

In the second:

```sh
npm run dev -- --host 127.0.0.1
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/api` and `/sanctum` to Laravel. If port 5173 or 8000 is occupied, stop the existing process before starting the app.

Anonymous learners can explore lessons and play the orbital route game without an account. Registering creates an account with a call sign and email and imports the anonymous learning-progress snapshot. Signing in restores only that account's server progress. Passwords are hashed by Laravel and are never returned to the browser. Offline progress is queued in browser storage under the signed-in account; it synchronizes when that same account reconnects.

## Checks

Run frontend checks from the repository root:

```sh
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run test:preview
npm run security:check
```

Install Playwright's Chromium browser once with `npx playwright install chromium`. The E2E suite starts Laravel and Vite and applies any pending migrations to `orbital_dispatcher_test`; keep MySQL and that dedicated test database available. Laravel feature tests use the same test database and reset their tables, so never point it at user data.

Run Laravel checks from `server/`:

```sh
composer audit
vendor/bin/pint --test
php artisan test
```

`npm run build` writes the production SPA assets under `server/public/app/`; Laravel serves the app and API on the same origin in production. `npm run test:preview` verifies the built asset base. For local static preview, run `npm run preview` after the build.

Security scans need Gitleaks and Semgrep installed locally. On macOS, install them with `brew install gitleaks semgrep`. The workflow installs the scanners in GitHub Actions.

## Project conventions

React renders from `src/main.tsx`; keep user-facing interface text in Russian and preserve keyboard and touch usability. Course data and pure answer validation live in `src/features/learning/data/course.ts`. The account UI and API client are under `src/features/auth/`; progress migration and per-account synchronization are under `src/features/progress/`.

Laravel routes are in `server/routes/`, with auth and progress controllers under `server/app/Http/Controllers/`. Account-owned progress comes from the authenticated Sanctum session only. Do not accept a user id from the client as an authorization source. Add feature tests for authorization, input validation, session/CSRF behavior, and data ownership whenever server behavior changes.

Commit app source, `package-lock.json`, the root README, `Docs/`, and brand assets in `public/assets/`. Keep `.env` files, `server/vendor/`, `server/public/app/`, `node_modules/`, and local planning exports out of Git. GitHub Actions runs checks for pull requests and pushes to `product`; production deployment is not enabled until hosting details and secrets are configured.
