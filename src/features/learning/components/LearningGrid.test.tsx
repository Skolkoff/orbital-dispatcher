import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LearningGrid } from './LearningGrid'

afterEach(cleanup)

it('moves the point cursor with the keyboard and selects only after Enter', () => {
  const onChange = vi.fn()
  render(<LearningGrid answerKind="plot-point" grid={{ min: -5, max: 5 }} onChange={onChange} />)

  const graph = screen.getByRole('button', { name: /координатная плоскость/i })
  fireEvent.keyDown(graph, { key: 'ArrowRight' })
  fireEvent.keyDown(graph, { key: 'ArrowUp' })
  expect(screen.getByRole('status').textContent).toContain('Точка не выбрана')
  fireEvent.keyDown(graph, { key: 'Enter' })

  expect(onChange).toHaveBeenLastCalledWith({ kind: 'plot-point', point: { x: 1, y: 1 } })
  expect(screen.getByRole('status').textContent).toContain('(1; 1)')
})

it('keeps route waypoints in selection order and allows undoing the last point', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<LearningGrid answerKind="route" grid={{ min: 0, max: 6 }} targetLength={3} onChange={onChange} />)

  for (const [x, y] of [['1', '1'], ['4', '1'], ['4', '4']]) {
    await user.type(screen.getByLabelText('X'), x)
    await user.type(screen.getByLabelText('Y'), y)
    await user.click(screen.getByRole('button', { name: /добавить точку/i }))
  }

  expect(onChange).toHaveBeenLastCalledWith({
    kind: 'route',
    points: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }],
  })
  await user.click(screen.getByRole('button', { name: /убрать последнюю/i }))
  expect(onChange).toHaveBeenLastCalledWith({
    kind: 'route',
    points: [{ x: 1, y: 1 }, { x: 4, y: 1 }],
  })
})

it('records coordinate-entry only after valid integers are submitted', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<LearningGrid answerKind="coordinate-entry" grid={{ min: -5, max: 5 }} markedPoint={{ x: -3, y: 2 }} onChange={onChange} />)

  expect(screen.getByRole('img', { name: /отмеченная точка/i })).toBeTruthy()
  expect(screen.getByRole('status').textContent).toContain('(−3; 2)')
  await user.type(screen.getByLabelText('X'), '-3')
  await user.type(screen.getByLabelText('Y'), '2.5')
  expect(screen.getByRole('button', { name: /проверить координаты/i }).hasAttribute('disabled')).toBe(true)
  await user.clear(screen.getByLabelText('Y'))
  await user.type(screen.getByLabelText('Y'), '2')
  await user.click(screen.getByRole('button', { name: /проверить координаты/i }))

  expect(onChange).toHaveBeenLastCalledWith({ kind: 'coordinate-entry', point: { x: -3, y: 2 } })
})
