import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { courseModules } from '../data/course'
import type { ModuleProgressView } from '../progressView'
import { SkillsScreen } from './SkillsScreen'

afterEach(cleanup)

function moduleViews(): ModuleProgressView[] {
  return courseModules.map((module, index) => {
    const confidence = index === 0 ? 'new' : index === 1 ? 'practice' : 'confident'
    const completed = index > 0
    return {
      module,
      summary: { solved: completed ? 5 : 0, total: 5, completed, firstTryCorrect: completed ? 4 : 0, confidence },
      attempted: completed ? 5 : 0,
      attempts: completed ? 6 : 0,
      hintsUsed: completed ? 1 : 0,
    }
  })
}

it('explains progress and replaces unfamiliar skill labels with plain-language states', () => {
  render(<SkillsScreen modules={moduleViews()} />)

  expect(screen.getByRole('heading', { name: 'Мои успехи' })).toBeTruthy()
  expect(screen.getByText(/навык — это то, что ты учишься делать/i)).toBeTruthy()
  expect(screen.getByText('Ещё не пробовал')).toBeTruthy()
  expect(screen.getByText('Уже тренирую')).toBeTruthy()
  expect(screen.getAllByText('Уверенно получается').length).toBeGreaterThan(0)
  expect(screen.getAllByText('С первого раза: 4 из 5').length).toBeGreaterThan(0)
})
