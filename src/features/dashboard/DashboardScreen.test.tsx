import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { courseModules } from '../learning/data/course'
import type { ModuleProgressView } from '../learning/progressView'
import { DashboardScreen } from './DashboardScreen'

afterEach(cleanup)

function moduleViews(completedFirst = false): ModuleProgressView[] {
  return courseModules.map((module, index) => {
    const completed = completedFirst && index === 0
    return {
      module,
      summary: { solved: completed ? 5 : 0, total: 5, completed, firstTryCorrect: completed ? 3 : 0, confidence: completed ? 'practice' : 'new' },
      attempted: completed ? 5 : 0,
      attempts: completed ? 7 : 0,
      hintsUsed: completed ? 2 : 0,
    }
  })
}

it('introduces the course and leaves later modules locked until the previous one is complete', () => {
  render(<DashboardScreen modules={moduleViews()} onOpenModule={() => {}} />)

  expect(screen.getByRole('heading', { name: /координатная плоскость/i })).toBeTruthy()
  expect(screen.getAllByRole('listitem')).toHaveLength(6)
  expect(screen.getByRole('button', { name: 'Изучить: ' + courseModules[0].title })).toBeTruthy()
  expect(screen.getAllByText('Заблокировано')).toHaveLength(5)
})

it('unlocks the next module and lets the learner revisit a completed one', async () => {
  const user = userEvent.setup()
  const onOpenModule = vi.fn()
  render(<DashboardScreen modules={moduleViews(true)} onOpenModule={onOpenModule} />)

  await user.click(screen.getByRole('button', { name: 'Изучить: ' + courseModules[1].title }))
  expect(onOpenModule).toHaveBeenCalledWith('module-2')
  await user.click(screen.getByRole('button', { name: 'Повторить: ' + courseModules[0].title }))
  expect(onOpenModule).toHaveBeenCalledWith('module-1')
})
