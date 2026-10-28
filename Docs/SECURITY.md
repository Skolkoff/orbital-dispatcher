# Security

## Account and session boundaries

The Laravel API owns accounts and authenticated learning progress. React authenticates with Sanctum's stateful, HTTP-only session cookie and sends the CSRF token on state-changing requests. Protected routes use the authenticated session as the sole source of account identity. The browser never receives a password hash or session secret.

Passwords are hashed by Laravel. Registration, sign-in, password reset, and reset-token use are rate-limited. Password-reset responses do not reveal whether an email address has an account. Account deletion requires the current password, ends the session, and cascades to the account's progress record.

Each account has one progress document in MySQL. The API validates its shape and size, merges progress monotonically, and scopes reads and writes to the authenticated learner. Browser storage is an offline cache and retry queue, keyed by account id; it is not an authorization boundary. A pending queue from one account must never be replayed into another account. Anonymous progress is imported during registration only.

## Local security checks

Run from the repository root:

```sh
npm run security:check
```

This runs:

- `npm audit --audit-level=high` for npm dependency advisories;
- Gitleaks over staged changes, working-tree changes, and Git history;
- Semgrep JavaScript, TypeScript, and PHP rules over the frontend, E2E tests, Laravel application, and routes.

Run server dependency and formatting checks from `server/`:

```sh
composer audit
vendor/bin/pint --test
php artisan test
```

The Laravel feature suite uses the dedicated `orbital_dispatcher_test` MySQL database and deletes/recreates its tables. Never configure that name to point at real or valuable data. The browser suite also requires the local MySQL databases and Playwright Chromium; see [Development](DEVELOPMENT.md).

On macOS, install Gitleaks and Semgrep with `brew install gitleaks semgrep`. Playwright installs its browser separately with `npx playwright install chromium`.

## Production configuration

Before a public deployment:

- Set `APP_ENV=production`, `APP_DEBUG=false`, a unique generated `APP_KEY`, and HTTPS `APP_URL`.
- Set `SESSION_SECURE_COOKIE=true`; keep the session cookie HTTP-only and use HTTPS for the SPA and API.
- Set `SANCTUM_STATEFUL_DOMAINS` and `SESSION_DOMAIN` to the actual same-site host configuration. Do not enable permissive credentialed CORS.
- Configure a real SMTP provider and verify password-reset email delivery. The local log mailer is for development only.
- Store credentials in the hosting environment or GitHub Actions secrets. Never place server credentials in Vite variables or committed files.
- Use a least-privilege MySQL account for the app and keep backups of account/progress data.

The deployment target is not yet configured. Do not enable automatic production publishing until its host, document root, transfer method, host key, and secrets have been verified.

## GitHub Actions

Pull requests targeting `product`, pushes to `product`, and manual runs execute frontend checks, browser flows, production build/preview, PHP and MySQL feature tests, dependency auditing, secret scanning, and static analysis. Workflow token permissions are read-only. Deployment secrets are not exposed to pull-request jobs, and the current workflow does not deploy to production.
