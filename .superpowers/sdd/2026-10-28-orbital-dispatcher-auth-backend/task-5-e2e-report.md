# Task 5 E2E report

Implemented the live browser coverage in `e2e/auth.spec.ts` and configured `playwright.config.ts` to launch Laravel plus Vite. Laravel runs with `APP_ENV=local`, `DB_DATABASE=orbital_dispatcher_test`, database sessions, array cache, synchronous queues, and the array mailer. The app key and MySQL host/user/password come from the local `server/.env`; CI-provided process environment values take precedence. The startup step applies pending migrations without dropping or resetting the database.

The auth scenarios cover registration with anonymous progress import, answer persistence, logout and login restoration, separation between two learners, same-account offline sync recovery, equal forgot-password responses for known and unknown addresses, successful password reset, password-confirmed account deletion and session invalidation, CSRF rejection for a stateful SPA-origin request without a CSRF token, and auth screen layouts at 360, 768, and 1280 pixels. The reset scenario gets a real token from Laravel's password broker through a child `php artisan tinker --execute` process. The Playwright worker captures stdout/stderr in memory, validates the token without logging it, navigates to the hash reset route, then replaces the address bar hash immediately after the reset screen mounts. It proves the old password fails and the new password succeeds.

Playwright traces and failure screenshots are disabled so submitted credentials and reset URL values are not retained as artifacts. Test account email addresses are generated uniquely per run; assertions and test output do not include password, cookie, or token values.

## Verification

RED check for the new successful-reset assertion (before broker-token setup):

```text
$ npm run test:e2e -- e2e/auth.spec.ts --workers=1 --grep "forgot-password response"
Running 1 test using 1 worker
  ✘  1 [chromium] › forgot-password response is non-enumerating and reset rejects an invalid token (8.1s)
Error: expect(locator).toContainText(expected) failed
Expected substring: "Пароль изменён"
Error: element(s) not found
1 failed
```

Focused auth run:

```text
$ npm run test:e2e -- e2e/auth.spec.ts --workers=1
Running 8 tests using 1 worker
8 passed (16.2s)
```

Full E2E run:

```text
$ npm run test:e2e -- --workers=1
Running 28 tests using 1 worker
28 passed (34.9s)
```

The first RED run, before adding the Laravel server to Playwright, failed against the unavailable API and exposed an ambiguous label selector; after server configuration and selector correction, all focused and full E2E scenarios passed.
