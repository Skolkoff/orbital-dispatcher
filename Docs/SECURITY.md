# Security checks

This repository is currently a frontend-only learning demo. It has no user accounts, passwords, authentication cookies, or server-side learner records. The browser stores versioned exercise completion and learning evidence in localStorage. Browser storage can be edited by its owner and is not an authentication or authorization boundary. Legacy completed mission IDs are preserved as history only and do not count as mastery.

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

The unit suite checks course data, answer validation, migration, and progress-confidence rules. Playwright covers all six answer modes, feedback and hints, completion and progress after reload, locked direct links, the random game route/collision/correction/score/reset flow, keyboard and touch input, reduced motion, and 360 px / 768 px / 1280 px layouts. These are product behavior checks; browser progress remains editable by the learner and must never authorize protected server data.

## GitHub Actions

Pull requests targeting `product`, pushes to `product`, and manual runs execute lint, TypeScript checks, Vitest, Playwright, npm audit, Gitleaks, Semgrep, and the production build. The workflow uses a read-only `GITHUB_TOKEN`; it does not expose hosting secrets to pull request jobs. Third-party actions are pinned to full commit SHAs. The build is uploaded as an artifact for the later deployment job.

When the Laravel/MySQL backend is added, authentication, authorization, input validation, CSRF/session handling, ownership checks, rate limiting, and database-safe queries must be covered by server tests before automatic deployment is enabled.
