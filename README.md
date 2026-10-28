# Орбитальный диспетчер

«Орбитальный диспетчер» — учебный тренажёр по координатной плоскости для учеников 5–6 классов. Шесть модулей и 30 заданий ведут от устройства сетки и упорядоченных пар к отрицательным координатам, маршрутам и построению фигур. Перед практикой ученик читает короткий урок с правилом, примером и вопросом для самопроверки.

На главной есть отдельная свободная миссия: ученик задаёт маршрут космического корабля соседними координатами, обходит случайно расставленные астероиды и проверяет план в полёте. При столкновении можно исправить путь, а после безопасной посадки видны время и очки. Эта игра помогает применить координаты и планирование маршрута, но не меняет результаты прохождения учебных модулей.

Задания чередуют выбор ответа, построение точки, ввод координат, число, маршрут и фигуру. После ошибки тренажёр объясняет следующий шаг и предлагает подсказки. Успешные решения, самостоятельность первых ответов и использование подсказок сохраняются в этом браузере.

## Local quick start

Install Node.js 22 (22.13 or newer within the 22.x line) and npm. If using nvm, run `nvm install` and `nvm use` in this directory.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open [http://localhost:5173](http://localhost:5173). Port 5173 is fixed: stop the other process if it is already occupied. Docker, credentials, and a backend are not required. Hash-based routes keep direct links and refreshes working on ordinary static hosting.

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

See the [product overview](Docs/OVERVIEW.md), [learning plan](Docs/LEARNING-PLAN.md), [development workflow](Docs/DEVELOPMENT.md), and [security notes](Docs/SECURITY.md). Progress is stored in this browser only; this frontend has no account or password flow. Do not enter real personal data.
