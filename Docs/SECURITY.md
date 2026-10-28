# Security checks

This repository is currently a frontend-only learning demo. It has no user accounts, passwords, authentication cookies, or server-side learner records. The browser stores only completed mission IDs in localStorage. Browser storage can be edited by its owner and is not an authentication or authorization boundary.

## Local checks

Install Gitleaks and Semgrep, then run:

```sh
npm run security:check
```

The command runs:

- `npm audit --audit-level=high` for dependency advisories;
- Gitleaks over staged changes, working-tree changes, and Git history for accidentally committed secrets;
- Semgrep JavaScript and TypeScript rules over app and E2E source.

Individual commands are available as `npm run security:audit`, `npm run security:secrets`, and `npm run security:static`. On macOS, install the tools with `brew install gitleaks semgrep`; on other systems, use the tools' official installation instructions.

The test suite also checks that mission input is validated, wrong answers do not unlock content, direct links cannot bypass the mission order, and feedback is rendered as text. Playwright covers retry, completion, progress after reload, keyboard selection, a touch tap on the graph, and 360 px / 768 px layouts.

## GitHub Actions

Pull requests targeting `product`, pushes to `product`, and manual runs execute lint, TypeScript checks, Vitest, Playwright, npm audit, Gitleaks, Semgrep, and the production build. The workflow uses a read-only `GITHUB_TOKEN`; it does not expose hosting secrets to pull request jobs. Third-party actions are pinned to full commit SHAs. The build is uploaded as an artifact for the later deployment job.

When the Laravel/MySQL backend is added, authentication, authorization, input validation, CSRF/session handling, ownership checks, rate limiting, and database-safe queries must be covered by server tests before automatic deployment is enabled.
