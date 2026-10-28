# Product overview

«Орбитальный диспетчер» is a Russian-language coordinate-plane trainer for grades 5–6. Six connected modules contain 30 progressively harder exercises, starting with the grid and ordered pairs and moving through negative coordinates, tables, routes, and coordinate geometry.

Each module opens with a short lesson: one rule, one worked example, a diagram, and a recall prompt. Practice rotates among six response modes: choice, point plotting, coordinate entry, number entry, ordered route, and shape construction. Wrong answers get a focused correction and progressive hints. A correct answer completes the task; a separate confidence measure reflects independent first answers and later review.

The dashboard introduces the goal and reports solved tasks, first answers, attempts, and hints. The course map shows locked, available, and completed modules; the skills screen tracks evidence for each topic. Interactive grids support touch, pointer, keyboard, and coordinate fields. Hash navigation, responsive layouts, and local progress persistence support static hosting and resume in the same browser.

This frontend stores versioned exercise evidence in `localStorage` and migrates legacy mission completion IDs as history only. It has no authentication, real passwords, personal data collection, or backend connection. Cloud accounts and synchronized progress belong to a later server phase. See [the learning plan](LEARNING-PLAN.md) for topic sequence, misconception coverage, and the reasoning behind the exercises.
