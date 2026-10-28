import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MissionScreen } from './MissionScreen'
afterEach(cleanup)
// Catch premature submission, missing feedback, incorrect completion, or stale answers on navigation.
it.each([
  ['mission-1', [['3', '4']]],
  ['mission-2', [['1', '1'], ['4', '1'], ['4', '4']]],
  ['mission-3', [['-3', '2']]],
  ['mission-4', [['-2', '3']]],
  ['mission-5', [['2', '-1']]],
])('completes %s only after a complete correct answer', async (missionId, points) => {
  const user = userEvent.setup()
  const completed: string[] = []
  render(<MissionScreen missionId={missionId} onComplete={(id) => completed.push(id)} />)
  expect(screen.getByRole('button', { name: 'Проверить ответ' }).hasAttribute('disabled')).toBe(true)
  for (const [x, y] of points) {
    await user.clear(screen.getByLabelText('X')); await user.type(screen.getByLabelText('X'), x)
    await user.clear(screen.getByLabelText('Y')); await user.type(screen.getByLabelText('Y'), y)
    await user.click(screen.getByRole('button', { name: missionId === 'mission-2' ? 'Добавить точку' : 'Выбрать точку' }))
    if (missionId === 'mission-2' && y === '1') expect(screen.getByRole('button', { name: 'Проверить ответ' }).hasAttribute('disabled')).toBe(true)
  }
  await user.click(screen.getByRole('button', { name: 'Проверить ответ' }))
  expect(await screen.findByText(/Миссия выполнена/)).toBeTruthy()
  expect(completed).toEqual([missionId])
})
it('explains a wrong answer and allows a retry with a hint', async () => {
  const user = userEvent.setup()
  const completed: string[] = []
  render(<MissionScreen missionId="mission-1" onComplete={(id) => completed.push(id)} />)
  await user.click(screen.getByRole('button', { name: 'Подсказка' }))
  expect(screen.getByText(/Сначала 3 шага/)).toBeTruthy()
  await user.type(screen.getByLabelText('X'), '4'); await user.type(screen.getByLabelText('Y'), '3')
  await user.click(screen.getByRole('button', { name: 'Выбрать точку' }))
  await user.click(screen.getByRole('button', { name: 'Проверить ответ' }))
  expect(await screen.findByText(/Первая координата/)).toBeTruthy()
  expect(completed).toEqual([])
  expect(screen.getByRole('button', { name: 'Проверить ответ' }).hasAttribute('disabled')).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }))
  expect(screen.getByText('Точка не выбрана')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Проверить ответ' }).hasAttribute('disabled')).toBe(true)
})
it('clears the answer when navigating between missions', async () => {
  const user = userEvent.setup()
  const { rerender } = render(<MissionScreen missionId="mission-1" onComplete={() => {}} />)
  await user.type(screen.getByLabelText('X'), '3'); await user.type(screen.getByLabelText('Y'), '4')
  await user.click(screen.getByRole('button', { name: 'Выбрать точку' }))
  rerender(<MissionScreen missionId="mission-3" onComplete={() => {}} />)
  expect(screen.getByRole('button', { name: 'Проверить ответ' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByText('Точка не выбрана')).toBeTruthy()
})
