import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MissionMap } from '../types'
import { CoordinateMissionGrid } from './CoordinateMissionGrid'

afterEach(cleanup)

const map: MissionMap = {
  min: -4,
  max: 4,
  start: { x: 0, y: 0 },
  goal: { x: 2, y: 0 },
  obstacles: [{ x: 1, y: 0 }],
}

it('shows start, goal, and obstacles as named map features', () => {
  render(<CoordinateMissionGrid map={map} route={[map.start]} shipPosition={map.start} flightState="planning" onSelectPoint={() => {}} />)

  expect(screen.getByRole('application', { name: /координатная карта маршрута/i })).toBeTruthy()
  expect(screen.getByText('Старт (0; 0)')).toBeTruthy()
  expect(screen.getByText('Цель (2; 0)')).toBeTruthy()
  expect(screen.getByRole('img', { name: 'Препятствие в точке (1; 0)' })).toBeTruthy()
})

it('adds a point entered by coordinates, including a visible obstacle point', async () => {
  const user = userEvent.setup()
  const onSelectPoint = vi.fn()
  render(<CoordinateMissionGrid map={map} route={[map.start]} shipPosition={map.start} flightState="planning" onSelectPoint={onSelectPoint} />)

  await user.type(screen.getByLabelText('Координата X'), '1')
  await user.type(screen.getByLabelText('Координата Y'), '0')
  await user.click(screen.getByRole('button', { name: 'Добавить точку' }))

  expect(onSelectPoint).toHaveBeenCalledWith({ x: 1, y: 0 })
})

it('selects the nearest coordinate with pointer input and the keyboard cursor', () => {
  const onSelectPoint = vi.fn()
  render(<CoordinateMissionGrid map={map} route={[map.start]} shipPosition={map.start} flightState="planning" onSelectPoint={onSelectPoint} />)
  const board = screen.getByRole('application', { name: /координатная карта маршрута/i })
  board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON() {} })

  fireEvent.pointerDown(board, { clientX: 237.5, clientY: 200 })
  expect(onSelectPoint).toHaveBeenLastCalledWith({ x: 1, y: 0 })

  board.focus()
  fireEvent.keyDown(board, { key: 'ArrowRight' })
  fireEvent.keyDown(board, { key: 'Enter' })
  expect(onSelectPoint).toHaveBeenLastCalledWith({ x: 2, y: 0 })
})

it('keeps edge coordinates selectable when a tap lands a few pixels beyond the grid line', () => {
  const onSelectPoint = vi.fn()
  render(<CoordinateMissionGrid map={map} route={[map.start]} shipPosition={map.start} flightState="planning" onSelectPoint={onSelectPoint} />)
  const board = screen.getByRole('application', { name: /координатная карта маршрута/i })
  board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON() {} })

  fireEvent.pointerDown(board, { clientX: 350, clientY: 50 })

  expect(onSelectPoint).toHaveBeenCalledWith({ x: 4, y: 4 })
})

it('resets the keyboard cursor and coordinate inputs when a new map is loaded', async () => {
  const user = userEvent.setup()
  const onSelectPoint = vi.fn()
  const { rerender } = render(<CoordinateMissionGrid map={map} route={[map.start]} shipPosition={map.start} flightState="planning" onSelectPoint={onSelectPoint} />)
  await user.type(screen.getByLabelText('Координата X'), '3')
  await user.type(screen.getByLabelText('Координата Y'), '2')

  const nextMap: MissionMap = { ...map, start: { x: -2, y: 1 }, goal: { x: 1, y: 3 } }
  rerender(<CoordinateMissionGrid map={nextMap} route={[nextMap.start]} shipPosition={nextMap.start} flightState="planning" onSelectPoint={onSelectPoint} />)

  expect((screen.getByLabelText('Координата X') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Координата Y') as HTMLInputElement).value).toBe('')
  const board = screen.getByRole('application', { name: /координатная карта маршрута/i })
  board.focus()
  fireEvent.keyDown(board, { key: 'ArrowRight' })
  fireEvent.keyDown(board, { key: 'Enter' })
  expect(onSelectPoint).toHaveBeenLastCalledWith({ x: -1, y: 1 })
})
