# Понятные задания и игровая миссия — план реализации

**Статус:** реализовано и проверено, 2026-10-28

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for the independent exercise-content and game-rules slices, then root-owned integration and review.

**Goal:** Make exercise instructions unmistakable, explain learner progress in plain language, and add a responsive coordinate-route game with a randomized solvable map, animated ship, collision feedback, elapsed time, and score.

**Architecture:** Keep the existing course/progress flow intact and add a separate `#/game` route. Put map generation, pathfinding, route rules, and scoring in pure game services; render those through new game-specific components rather than changing the existing lesson `LearningGrid` or the unused fixed-mission prototype.

**Tech Stack:** Existing React, TypeScript, Vite, Vitest, Testing Library, and Playwright. No new runtime dependencies; inline SVG for the spacecraft.

**Spec:** [Docs/INTERACTIVE-MISSION-DESIGN.md](./INTERACTIVE-MISSION-DESIGN.md)

## Global Constraints

- Keep the app compatible with Node `>=22.13.0 <23` and the current dependency set.
- Keep hash navigation and add the route `#/game`; do not require server rewrites.
- Keep the six course modules, their unlock order, and learning-progress schema unchanged.
- Use integer coordinates from `−4` through `4`; a route step moves exactly one node horizontally or vertically.
- Generate a distinct start and goal at least two units apart on both axes, and a new map for each mission; block both one-turn L-shaped routes while keeping at least one obstacle-free route.
- Start elapsed time on first launch; continue it across a collision and stop on a safe landing.
- Score a safe landing as `max(0, 1000 − 100 × (route steps − shortest safe steps))`; elapsed time is informational and does not change score.
- Support pointer/touch, coordinate entry, keyboard, narrow screens, and `prefers-reduced-motion`.
- Keep all project documentation inside `Docs/`; do not add generated or Stitch assets.

## Review Focus

- RNG outputs at grid boundaries, including a constant/repeating source, and maps with the minimum/maximum obstacle count still produce distinct endpoints and a reachable goal; both simple L routes are blocked. Pin with generator boundary and reachability tests in Task 3.
- A route with a jump, an obstacle, a repeated point, or a legal return to an earlier waypoint behaves as specified. Pin with route-service and grid interaction tests in Tasks 3–4.
- Collision followed by correction preserves elapsed time; a new map resets route/time/result. Pin with game-screen tests in Task 4 and the full flow in Task 5.
- Long task text and the separate scenario remain legible at 360 px; progress labels explain the status without course jargon. Pin with component tests and responsive E2E checks in Tasks 1, 2, and 5.
- Reduced-motion users receive the same collision and arrival feedback without animated travel. Pin with a component test and a Playwright reduced-motion check in Tasks 4–5.

---

### Task 1: Clarify course questions and answer instructions

**Files:**
- Modify: `src/features/learning/types.ts`
- Modify: `src/features/learning/data/course.ts`
- Modify: `src/features/learning/services/createExerciseVariant.ts`
- Modify: `src/features/learning/screens/PracticeScreen.tsx`
- Create: `src/features/learning/screens/PracticeScreen.test.tsx`
- Modify: `src/features/learning/data/course.test.ts`
- Modify: `e2e/learning.spec.ts`
- Modify: `src/styles/learning.css`

**Interfaces:**
- Add optional `context?: string` to `ExerciseBase`; keep `prompt: string` as the direct task instruction.
- `createExerciseVariant(exercise, index)` preserves `context` while generating a new `prompt` for review.
- `PracticeScreen` renders the task instruction within the answer card under the visible label `Твоя задача`; context, when present, is labeled `Ситуация`.

- [x] **Step 1: Write failing tests** for the prompt inside the answer card, separate optional context, review-variant context retention, every course instruction being non-empty and direct, and the existing Playwright flow locating the prompt in its new position.
- [x] **Step 2: Run targeted tests and confirm they fail** for the missing context and task-card behavior.
- [x] **Step 3: Add the optional context and rewrite all 30 prompts** as short, explicit actions/questions; move only necessary story setup into context. Reduce the top heading to module/practice identity and place the clearly labeled, readable instruction beside its answer UI.
- [x] **Step 4: Run targeted tests, then** `npm run test` **and** `npx playwright test e2e/learning.spec.ts`.

### Task 2: Make progress understandable

**Files:**
- Modify: `src/components/BottomNavigation.tsx`
- Modify: `src/features/learning/screens/SkillsScreen.tsx`
- Create: `src/features/learning/screens/SkillsScreen.test.tsx`
- Run existing: `src/App.test.tsx`

**Interfaces:**
- Keep the hash path `#/skills` for existing bookmarks; display the nav label `Мой прогресс` and heading `Мои успехи`.
- Explain each progress state in learner-facing language without changing confidence calculation or stored data.

- [x] **Step 1: Write failing tests** for the plain-language page heading, explanation, status labels, and active navigation label.
- [x] **Step 2: Run the focused tests and confirm the expected failures.**
- [x] **Step 3: Update the labels/copy and provide one sentence explaining what the counts mean.**
- [x] **Step 4: Run the focused screen and app tests.**

### Task 3: Implement random map, route rules, and score

**Files:**
- Create: `src/features/game/types.ts`
- Create: `src/features/game/services/generateMission.ts`
- Create: `src/features/game/services/generateMission.test.ts`
- Create: `src/features/game/services/routeRules.ts`
- Create: `src/features/game/services/routeRules.test.ts`

**Interfaces:**
- `type GridPoint = { x: number; y: number }`
- `type MissionMap = { min: -4; max: 4; start: GridPoint; goal: GridPoint; obstacles: GridPoint[] }`
- `generateMission(random?: () => number): MissionMap` returns distinct endpoints and a map with a safe route.
- `findShortestSafePath(map: MissionMap): GridPoint[] | null` returns a shortest orthogonal path, including both endpoints.
- `isNextRoutePointValid(map: MissionMap, route: GridPoint[], point: GridPoint): boolean` accepts only a grid point one Manhattan step from the current route end and in bounds. It allows obstacle coordinates so the flight can show a collision; collision is evaluated during flight, not route entry.
- `calculateMissionScore(route: GridPoint[], shortestPath: GridPoint[]): number` returns the specified non-negative score for a collision-free route.
- `formatElapsedTime(milliseconds: number): string` displays non-negative elapsed time as `MM:SS` (minutes may exceed 59).

- [x] **Step 1: Write failing tests** for bounds, distinct endpoints even when RNG repeats the same value, at least two divisions of separation per axis, both simple L routes blocked, deterministic RNG, reachability, obstacle avoidance in the shortest path, adjacency and bounds validation, score floor/detour behavior, and elapsed-time formatting.
- [x] **Step 2: Run the focused tests and confirm they fail because the service exports are absent.**
- [x] **Step 3: Implement pure deterministic functions.** Build a protected route that alternates axes, place at least one obstacle on each axis-first L route and other obstacles away from the protected route, and verify reachability with breadth-first search.
- [x] **Step 4: Run the focused test files.**

### Task 4: Build the interactive game screen

**Files:**
- Create: `src/features/game/components/CoordinateMissionGrid.tsx`
- Create: `src/features/game/components/CoordinateMissionGrid.test.tsx`
- Create: `src/features/game/components/Spacecraft.tsx`
- Create: `src/features/game/screens/GameScreen.tsx`
- Create: `src/features/game/screens/GameScreen.test.tsx`
- Modify: `src/styles/learning.css`

**Interfaces:**
- `CoordinateMissionGrid` receives `map`, `route`, `shipPosition`, `flightState`, and `onSelectPoint(point)`; it draws the grid, coordinates, obstacles, start/goal, route, and ship.
- `GameScreen` owns the generated map, editable route, flight state, elapsed time, and final score; optional `createMission?: () => MissionMap` defaults to `generateMission` and allows deterministic screen tests. Its `onNewMission` behavior creates a new map and resets mission-only state.
- `GameScreen` uses `formatElapsedTime(milliseconds)` from `routeRules.ts` for the timer and final result.

- [x] **Step 1: Write failing component tests** for coordinate selection, invalid jumps, route truncation at a selected prior waypoint, obstacle rendering, and accessible controls.
- [x] **Step 2: Run the component tests and confirm they fail.**
- [x] **Step 3: Implement the responsive coordinate grid and inline SVG ship.** Support selecting any in-bounds point with mouse/touch or keyboard, coordinate entry, explicit validation for the next step, and removal of later route points when a prior point is selected.
- [x] **Step 4: Write failing game-screen tests** for gated launch, animated safe arrival, collision coordinate feedback, timer persistence across a collision, score, and new-map reset.
- [x] **Step 5: Run the game-screen tests and confirm they fail.**
- [x] **Step 6: Implement the mission state machine.** Start the timer at first launch, animate one route step at a time, stop at obstacles, preserve the route and timer for correction, and show a green result only at safe arrival. Clamp the score at zero; respect reduced motion.
- [x] **Step 7: Run all game component tests.**

### Task 5: Integrate navigation and verify the user flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/BottomNavigation.tsx`
- Modify: `src/features/dashboard/DashboardScreen.tsx`
- Modify: `src/features/dashboard/DashboardScreen.test.tsx`
- Modify: `src/App.test.tsx`
- Create: `e2e/game.spec.ts`
- Modify: `src/styles/learning.css`

**Interfaces:**
- `App` recognizes `#/game` and renders `GameScreen` inside `AppShell`.
- Main navigation shows `Играть`; dashboard provides a prominent mission card with a direct link to the game.
- Route state maps to the active navigation item; existing routes and module unlock rules remain unchanged.

- [x] **Step 1: Write failing tests** for the dashboard CTA, game route, active nav, and unknown-route behavior.
- [x] **Step 2: Run focused tests and confirm failures.**
- [x] **Step 3: Integrate the route, nav, dashboard card, and responsive styling.**
- [x] **Step 4: Add Playwright coverage** for a randomized mission using an obstacle-free path, collision and correction, score/time result, new map reset, 360/768/1280 px layout, keyboard operation, and reduced motion.
- [x] **Step 5: Run the focused E2E file.**

### Task 6: Final quality pass and documentation

**Files:**
- Modify: `README.md`
- Modify: `Docs/DEVELOPMENT.md`
- Modify: `Docs/OVERVIEW.md`
- Modify: `Docs/LEARNING-PLAN.md`
- Modify: `Docs/SECURITY.md` only if implementation changes the documented client-side security boundary.

- [x] **Step 1: Review task wording and screenshots** at mobile and desktop widths; correct any unclear copy or overlap.
- [x] **Step 2: Run** `npm run test`, `npm run test:e2e`, `npm run build`, `npm run lint`, and `npm run security:check`.
- [x] **Step 3: Run** `git diff --check`; confirm only project files and `Docs/` changed.
- [x] **Step 4: Update project run instructions and describe game mechanics and score in the overview.**
- [x] **Step 5: Commit the completed implementation and documentation in reviewable slices. Do not push or deploy without a separate user request.**
