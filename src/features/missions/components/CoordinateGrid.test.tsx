import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoordinateGrid } from './CoordinateGrid'
afterEach(cleanup)
// Catch a preselected answer, dropped numeric input, reordered waypoints, and keyboard/pointer regressions.
it('starts without a selected point', () => {
  render(<CoordinateGrid kind="point" min={-5} max={5} onChange={() => {}} />)
  expect(screen.getByRole('status').textContent).toContain('Точка не выбрана')
})
it('selects a point from both numeric coordinates', async () => {
  const user = userEvent.setup()
  render(<CoordinateGrid kind="point" min={-5} max={5} onChange={() => {}} />)
  await user.type(screen.getByLabelText('X'), '-3')
  expect(screen.getByRole('button', { name: 'Выбрать точку' }).hasAttribute('disabled')).toBe(true)
  await user.type(screen.getByLabelText('Y'), '2')
  await user.click(screen.getByRole('button', { name: 'Выбрать точку' }))
  expect(screen.getByRole('status').textContent).toContain('(−3; 2)')
})
it('collects route waypoints in selection order and can undo', async () => {
  const user = userEvent.setup()
  render(<CoordinateGrid kind="route" min={0} max={6} onChange={() => {}} />)
  for (const [x, y] of [['4', '1'], ['1', '1'], ['4', '4']]) {
    await user.clear(screen.getByLabelText('X')); await user.type(screen.getByLabelText('X'), x)
    await user.clear(screen.getByLabelText('Y')); await user.type(screen.getByLabelText('Y'), y)
    await user.click(screen.getByRole('button', { name: 'Добавить точку' }))
  }
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['(4; 1)', '(1; 1)', '(4; 4)'])
  await user.click(screen.getByRole('button', { name: 'Убрать последнюю' }))
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})
it('moves a keyboard cursor without selecting until Enter', () => {
  render(<CoordinateGrid kind="point" min={-5} max={5} onChange={() => {}} />)
  const graph = screen.getByRole('button', { name: /Координатная плоскость/ })
  fireEvent.keyDown(graph, { key: 'ArrowRight' }); fireEvent.keyDown(graph, { key: 'ArrowUp' })
  expect(screen.getByRole('status').textContent).toContain('Точка не выбрана')
  fireEvent.keyDown(graph, { key: 'Enter' })
  expect(screen.getByRole('status').textContent).toContain('(1; 1)')
})
it('selects a pointer coordinate using the rendered graph bounds', () => {
  render(<CoordinateGrid kind="point" min={-5} max={5} onChange={() => {}} />)
  const graph = screen.getByRole('button', { name: /Координатная плоскость/ })
  graph.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON() {} })
  fireEvent(graph, new MouseEvent('pointerdown', { bubbles: true, clientX: 260, clientY: 140 }))
  expect(screen.getByRole('status').textContent).toContain('(2; 2)')
})
it('rejects fractional and out-of-range numeric coordinates', async () => {
  const user = userEvent.setup()
  render(<CoordinateGrid kind="point" min={-5} max={5} onChange={() => {}} />)
  await user.type(screen.getByLabelText('X'), '6')
  await user.type(screen.getByLabelText('Y'), '1.5')
  expect(screen.getByRole('button', { name: 'Выбрать точку' }).hasAttribute('disabled')).toBe(true)
})
