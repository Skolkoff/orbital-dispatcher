# Orbital Dispatcher Learning Redesign Implementation Plan

> **For agentic workers:** Use the assigned subagent task only. Read the two linked specs and this task. Do not edit files owned by another task.

**Goal:** Turn the current demo into a Stitch-inspired self-study trainer with six coordinate modules, at least 30 varied practice steps, useful progress, and working mobile interactions.

**Architecture:** Keep React, TypeScript, and Vite. A typed course catalog and pure answer checker provide content; a versioned local progress service records attempts; reusable lesson and exercise screens render the course. The root agent owns routes, shared layout, and integration; three small agents own independent domain, storage, and brand files.

**Tech Stack:** Existing React 19, TypeScript, Vite, Vitest, Testing Library, Playwright. No new dependencies unless a demonstrated need is approved.

**Specs:** [Product redesign](PRODUCT-REDESIGN.md); [learning plan](LEARNING-PLAN.md).

## Global Constraints

- Keep ordinary npm startup; no Docker, backend, accounts, or external AI.
- Keep the six modules, five practice steps per module, mixed review, and misconception-specific feedback from the learning plan.
- Use the Stitch palette: paper `#FFF8E8`, elevated paper `#FFFDF7`, grid `#E8DFC5`, ink `#191919`, violet `#7057E8`, lime `#C9F45B`, coral `#F07891`; use Plus Jakarta Sans, Inter, and Space Grotesk.
- Preserve touch, keyboard, mobile layouts at 360/768 px, desktop at 1280 px, and `prefers-reduced-motion`.
- Preserve hash-based navigation so refreshes work on static REG.RU hosting without SPA rewrite rules.
- Store only course IDs and learning evidence in local storage; validate the schema and preserve the old demo completion list as history, never as mastery.
- The user-provided rocket logo and cadet image are local assets; do not use remote image URLs.
- Keep Stitch exports and local planning artifacts outside Git. Public docs stay in `Docs/`.

## Review Focus

1. A point on an axis, including `(0; 0)`, is not assigned to a quadrant; cover in the course catalog tests.
2. Negative X/Y signs map to the correct direction and quadrant; cover in answer-checker tests.
3. A hint opened before answering cannot count as independent first-try evidence, while a later correct answer still completes the task; cover in progress tests.
4. Malformed storage and old `mission-*` progress never crash or create false mastery; cover in migration tests. The app catalog selector rejects unknown IDs before persistence.
5. A learner cannot bypass module order; touch and keyboard work without clipping at mobile widths; cover in app/E2E tests.

---

## Work Allocation

Use three focused agents with empty-history prompts to reduce context cost. Each owns a disjoint file set and returns a short summary with test commands/results. The root agent owns integration and the final review; no agent rewrites the whole project or repeats curriculum research.

| Worker | Owns | Does not touch |
| --- | --- | --- |
| Agent A — course domain | `src/features/learning/types.ts`, `src/features/learning/data/course.ts`, `src/features/learning/services/checkAnswer.ts`, corresponding tests | App routes, progress storage, global styles |
| Agent B — progress | `src/features/progress/LearningProgressService.ts` and its tests | Course data/types, screens, global styles |
| Agent C — brand | `public/assets/`, `src/components/BrandLogo.tsx`, `src/components/CadetGuide.tsx`, `src/components/OrbiCompanion.tsx`, `src/styles/brand.css` | `App.tsx`, `AppShell.tsx`, `global.css`, course/progress files |
| Root — integration | Screens, route map, `AppShell`, dashboard/map, shared styles, E2E, docs, integration and CI verification | — |

All agents use the exact task prompt from this plan, receive no full conversation history, and avoid duplicate test suites. Root integrates only after each owned unit passes its focused tests.

Workers edit only their listed paths and never stage or commit concurrently in the shared checkout. Root reviews each returned slice, stages only that slice, and creates one small commit per accepted slice.

### Token and coordination budget

- Start only Agents A, B, and C in parallel; their file ownership does not overlap.
- Keep all six modules with one course author so topic progression and difficulty stay consistent.
- Give each worker only its assignment and this plan reference (`fork_turns: none`); ask for changed paths, exported interfaces, focused command, and pass/fail summary, not a full walkthrough.
- Workers run only their focused tests. Root runs the full suite and build once after integration; the final independent review is one compact pass.
- Root owns the tightly coupled screens, routes, and E2E work to avoid extra handoffs and repeated context.

## File and Interface Map

### Agent A: course domain

Create `src/features/learning/types.ts` with these shared contracts:

```ts
type Point = { x: number; y: number }
type GridBounds = { min: number; max: number }
type ExerciseMode = 'choice' | 'plot-point' | 'coordinate-entry' | 'route' | 'shape' | 'number'
type ExerciseAnswer =
  | { kind: 'choice'; optionId: string }
  | { kind: 'plot-point' | 'coordinate-entry'; point: Point }
  | { kind: 'route' | 'shape'; points: Point[] }
  | { kind: 'number'; value: number }
type ExerciseBase = {
  id: string; moduleId: string; skillId: string; prompt: string
  difficulty: 1 | 2 | 3; hints: string[]; correctFeedback: string
  correction: string; isTransfer: boolean
}
type Exercise =
  | (ExerciseBase & { kind: 'choice'; options: { id: string; label: string }[]; correctOptionId: string })
  | (ExerciseBase & { kind: 'plot-point'; grid: GridBounds; target: Point })
  | (ExerciseBase & { kind: 'coordinate-entry'; grid: GridBounds; markedPoint: Point; target: Point })
  | (ExerciseBase & { kind: 'route'; grid: GridBounds; targetPoints: Point[] })
  | (ExerciseBase & { kind: 'shape'; grid: GridBounds; vertices: Point[]; closeShape: boolean })
  | (ExerciseBase & { kind: 'number'; target: number; tolerance?: number })
type CourseModule = {
  id: string; title: string; skillId: string; outcome: string
  lesson: { rule: string; workedExample: string; diagramCue: string; recallQuestion: string }
  exercises: Exercise[]
}
```

Export the contracts above. `Exercise` is discriminated on `kind`, matching `ExerciseAnswer`. Keep option IDs unique inside each exercise. Every exercise has a unique ID, difficulty (`1 | 2 | 3`), progressive hints, feedback, and a transfer flag. All plotted coordinates in this course are integers. Route targets include the start point and are ordered. Route and shape checkers compare ordered points; a shape closes only when `closeShape` is true. A number tolerance defaults to zero.

Create `course.ts` with six ordered modules and five exercise items per module. A module has `id`, title, skill id, measurable outcome, and a lesson card containing one rule, one worked example, one diagram cue, and a one-line recall question. Use the exact sequence and topic boundaries in `LEARNING-PLAN.md`; every response mode must occur across the catalog. Keep coordinates, wording, hints, and corrections mathematically consistent with the lesson.

Create `checkAnswer(exercise: Exercise, answer: ExerciseAnswer): { correct: boolean }` as a pure checker. It must reject mismatched answer kinds, malformed values, incomplete routes/shapes, non-integer coordinates, and coordinates outside the exercise grid. Compare routes and shapes in order and apply a number exercise's tolerance only when configured.

**Tests:** `course.test.ts` verifies the six-module order, five exercises per module, unique IDs, required skills/modes, no broken references, and explicit teaching that axis points and `(0; 0)` are not in a quadrant. `checkAnswer.test.ts` covers correct, wrong, malformed, boundary, wrong-kind, point-sign, and ordering/closure cases across all modes.

### Agent B: local progress

Create `LearningProgressService.ts` with:

```ts
type LearningProgress = {
  version: 2
  legacyCompletedMissionIds: string[]
  exerciseResults: Record<string, {
    solved: boolean
    attempts: number
    firstIndependentCorrect: boolean | null
    hintUsed: boolean
    firstSessionId: string | null
    lastPracticedAt: string | null
    reviewFirstTryCorrect: boolean | null
    reviewSessionId: string | null
  }>
}

load(): LearningProgress
recordAnswer(input: {
  exerciseId: string
  correct: boolean
  hintSeenBeforeAnswer: boolean
  sessionId: string
  isReview: boolean
}): LearningProgress

summarizeModule(
  progress: LearningProgress,
  exerciseIds: string[],
  transferExerciseIds: string[]
): { solved: number; total: number; completed: boolean; firstTryCorrect: number; confidence: 'new' | 'practice' | 'confident' }
```

Use storage key `orbital-dispatcher.learning-progress.v2`. Completion is recorded after any correct answer, including after hints. On the first submitted answer only, set `firstIndependentCorrect` to `correct` when no hint was seen before that answer, otherwise set it to `false`; never change it on retries. Set `firstSessionId` on the first submission. Set `hintUsed` when any submitted answer reports that a hint was seen before it. For an item explicitly submitted as a review in a session different from its first session, capture only its first review answer in `reviewFirstTryCorrect` and `reviewSessionId`. `summarizeModule` counts at least four correct first independent responses across five exercises, including a transfer exercise, plus a correct review item in a later session, as `confident`; incomplete evidence remains `practice`. `solved` and confidence remain separate. Unknown IDs are rejected by the root integration’s catalog selector before any service write.

Migration reads the existing `orbital-dispatcher.progress.v1` list, deduplicates string IDs into `legacyCompletedMissionIds`, and starts new skill evidence empty. Validate both v2 and v1 storage shapes. Malformed storage and storage exceptions return a safe empty state; write migrated v2 data under the new key and leave the old key untouched.

**Tests:** malformed JSON, invalid v2 shape, unavailable/read-only storage, v1 migration and deduplication, repeat attempts, hint-before-answer, hint-after-wrong-answer, completion, later-session review (and same-session non-review), confidence threshold, and transfer-item inclusion. The root integration tests that the catalog selector rejects unknown IDs before calling the service.

### Agent C: visual identity

Copy the supplied `/Users/sam/Downloads/unnamed.jpg` and `unnamed-2.jpg` into descriptive files under `public/assets/`. Build small reusable components for the rocket brand, the cadet guide image, and a clean Orbi SVG companion. Keep the portrait as the course guide and Orbi as the small hint/feedback companion. Implement idle, hint, correction, and success animation states in `brand.css`; disable motion under `prefers-reduced-motion`. Import the brand stylesheet from one of the owned brand components. Do not edit existing shell or global CSS.

**Check:** asset paths resolve locally, images have meaningful alt text, the companion accepts an explicit state prop, and animation states do not carry essential text or meaning by themselves.

### Root: screens, route integration, and verification

1. Add `LessonScreen`, `PracticeScreen`, `ExerciseRenderer`, `ModuleResultScreen`, and `LearningGrid` under `src/features/learning/`. Render the six exercise modes from Agent A’s union. Lesson flow is warm-up → worked example → practice → feedback/retry → result.
2. Update `App.tsx` and `AppShell.tsx` for dashboard, map, skills, lesson, practice, and result routes. Preserve sequential unlocks and block direct links to locked modules/exercises.
3. Generate one fresh opaque `sessionId` per app boot and pass it to progress writes. Update dashboard/map to six modules, progress per skill, first-answer accuracy with denominators, attempts, hints, and review links. Completion and confidence remain separate states.
4. Match the Stitch design tokens and responsive composition in the shared shell and screen styles. Reuse Agent C’s brand components and local assets. Keep buttons touch-sized and prevent fixed mobile navigation from covering content.
5. Add component tests for lesson/practice/results, invalid submissions, retry after hints, correct completion, and locked routes. Add Playwright flows for representative exercise modes, progress after reload, keyboard/touch, and 360/768/1280 px layouts.
6. Update README and `Docs/OVERVIEW.md`, `Docs/DEVELOPMENT.md`, `Docs/SECURITY.md`. Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`, `npm run security:check`, and `actionlint .github/workflows/ci.yml`.

## Task Checklist

### Task 1 — Agent A: course data and answer rules

**Files:** `src/features/learning/types.ts`, `src/features/learning/data/course.ts`, `src/features/learning/services/checkAnswer.ts`, and adjacent Vitest files.

- [ ] Write `course.test.ts` and `checkAnswer.test.ts` for six-by-five unique content, required modes, correct/wrong responses, malformed answers, and grid bounds.
- [ ] Run `npx vitest run src/features/learning`; confirm the new tests fail before the modules exist.
- [ ] Implement the exact union in the interface map, lesson cards, six modules, 30 exercises, and pure checker.
- [ ] Run `npx vitest run src/features/learning`; require all focused tests to pass.
- [ ] Return the exact exported types and a short test summary. Root reviews and commits only these paths.

### Task 2 — Agent B: versioned local progress

**Files:** `src/features/progress/LearningProgressService.ts` and its Vitest file.

- [ ] Write tests for v1 migration, malformed storage, hint-before-answer, retry/completion, later-session review, and the four-of-five confidence threshold.
- [ ] Run `npx vitest run src/features/progress/LearningProgressService.test.ts`; confirm the tests fail before implementation.
- [ ] Implement `load()` and `recordAnswer()` with the v2 key/shape, migration, and pure safe fallbacks.
- [ ] Run the focused progress test command; require all tests to pass.
- [ ] Return the interface and a short test summary. Root reviews and commits only these paths.

### Task 3 — Agent C: local brand assets

**Files:** `public/assets/*`, `src/components/BrandLogo.tsx`, `src/components/CadetGuide.tsx`, `src/components/OrbiCompanion.tsx`, `src/components/BrandComponents.test.tsx`, `src/styles/brand.css`.

- [ ] Write a component test for local image paths, meaningful alt text, and Orbi's state label.
- [ ] Run `npx vitest run src/components/BrandComponents.test.tsx`; confirm failure before implementation.
- [ ] Copy the two supplied images and implement the components plus reduced-motion-aware animation.
- [ ] Run `npx vitest run src/components/BrandComponents.test.tsx`; require the focused test to pass.
- [ ] Return a brief visual description and test summary. Root reviews and commits only these paths.

### Task 4 — Root: learning flow and navigation

**Files:** `src/App.tsx`, `src/components/AppShell.tsx`, new screens/components under `src/features/learning/`, updated dashboard/map components, their tests, and scoped styles.

- [ ] Write route/lesson/practice tests for unlock order, one wrong answer with hint and retry, a correct completion, and the next-module link.
- [ ] Run the focused screen tests; confirm failure before implementing the flow.
- [ ] Implement lesson, exercise renderer, results, dashboard, map, and skills overview against Agent A/B interfaces.
- [ ] Run focused tests, `npm run lint`, `npm run typecheck`, and `npm run test`.
- [ ] Review the user journey in the browser at mobile and desktop widths; commit the integration slice after fixes.

### Task 5 — Root: full acceptance and CI

**Files:** `e2e/learning.spec.ts`, related existing E2E tests, `README.md`, and `Docs/OVERVIEW.md`, `Docs/DEVELOPMENT.md`, `Docs/SECURITY.md`.

- [ ] Add Playwright coverage for point, route, choice/error-analysis, shape or number mode, progress after reload, locked deep links, touch/keyboard, and 360/768/1280 px layouts.
- [ ] Run `npm run test:e2e`; fix any product defects found in the browser.
- [ ] Run the full local quality, security, and workflow-syntax commands listed above; all must pass before final review.
- [ ] Update docs with npm startup, six modules, progress semantics, and checks. Root commits the final acceptance slice.

## Execution Order

1. After this plan is approved, start Agents A, B, and C in parallel with short task-specific prompts and no copied chat history.
2. Review their summaries and focused test results; resolve interface mismatches before integration.
3. Root builds the lesson/practice flow and dashboard against the interfaces above, adding tests before each behavior.
4. Run the complete local check list, perform a manual course walkthrough, and ask one fresh reviewer for a final pass.
5. Do not push to `product` until the integrated review and checks pass; the existing GitHub workflow then runs on the push.
