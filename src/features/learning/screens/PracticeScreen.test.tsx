import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { courseModules } from '../data/course'
import { PracticeScreen } from './PracticeScreen'

afterEach(cleanup)
const exercise = courseModules[0].exercises[0]
const props = { exerciseNumber: 1, exerciseTotal: 5, isReview: false, onSubmit: () => true, onNext: () => {} }

it('places the labeled instruction beside the answer controls in the task card', () => {
  render(<PracticeScreen {...props} exercise={exercise} />)
  const task = within(screen.getByRole('region', { name: 'Задание' }))
  expect(task.getByText('Твоя задача')).toBeTruthy()
  expect(task.getByRole('heading', { name: exercise.prompt })).toBeTruthy()
  expect(task.getByRole('group', { name: 'Выбери один ответ' })).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Практика · модуль 1')
})

it('shows a separate labeled situation only when supplied', () => {
  const view = render(<PracticeScreen {...props} exercise={{ ...exercise, context: 'Маяк стоит на пересечении осей.' }} />)
  const task = within(screen.getByRole('region', { name: 'Задание' }))
  expect(task.getByText('Ситуация')).toBeTruthy()
  expect(task.getByText('Маяк стоит на пересечении осей.')).toBeTruthy()
  view.rerender(<PracticeScreen {...props} exercise={exercise} />)
  expect(screen.queryByText('Ситуация')).toBeNull()
})

it('names the review screen independently from the task instruction', () => {
  render(<PracticeScreen {...props} exercise={exercise} isReview />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Повторение навыка')
})
