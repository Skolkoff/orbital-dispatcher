import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { MissionMap } from '../types'
import { GameScreen } from './GameScreen'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function advanceFlight(milliseconds: number) {
  await act(async () => vi.advanceTimersByTimeAsync(milliseconds))
}

const firstMap: MissionMap = {
  min: -4,
  max: 4,
  start: { x: 0, y: 0 },
  goal: { x: 2, y: 0 },
  obstacles: [{ x: 1, y: 0 }],
}
const secondMap: MissionMap = {
  min: -4,
  max: 4,
  start: { x: -2, y: 1 },
  goal: { x: 1, y: 3 },
  obstacles: [{ x: 0, y: 2 }],
}

function addPoint(x: number, y: number) {
  fireEvent.change(screen.getByLabelText('Координата X'), { target: { value: String(x) } })
  fireEvent.change(screen.getByLabelText('Координата Y'), { target: { value: String(y) } })
  fireEvent.click(screen.getByRole('button', { name: 'Добавить точку' }))
}

it('explains the route mission and keeps launch disabled until the route reaches its goal', () => {
  render(<GameScreen createMission={() => firstMap} />)

  expect(screen.getByRole('heading', { name: 'Проведи корабль к цели' })).toBeTruthy()
  expect(screen.getByText('Старт (0; 0)')).toBeTruthy()
  expect(screen.getByText('Цель (2; 0)')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Запустить полёт' }) as HTMLButtonElement).disabled).toBe(true)

  addPoint(2, 0)
  expect(screen.getByText(/следующая точка должна быть соседней/i)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Запустить полёт' }) as HTMLButtonElement).disabled).toBe(true)

  addPoint(1, 0)
  addPoint(2, 0)
  expect((screen.getByRole('button', { name: 'Запустить полёт' }) as HTMLButtonElement).disabled).toBe(false)

  addPoint(1, 0)
  expect(screen.getByText('Точек в маршруте: 2')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Запустить полёт' }) as HTMLButtonElement).disabled).toBe(true)
})

it('stops at an obstacle and lets the learner correct the route without resetting the clock', async () => {
  vi.useFakeTimers()
  render(<GameScreen createMission={() => firstMap} />)

  addPoint(1, 0)
  addPoint(2, 0)
  fireEvent.click(screen.getByRole('button', { name: 'Запустить полёт' }))
  await advanceFlight(320)
  expect(screen.getByText('Корабль задел препятствие в точке (1; 0).')).toBeTruthy()
  expect(screen.getByRole('alert').textContent).toMatch(/нажми на точку маршрута до столкновения/i)

  await advanceFlight(1_000)
  const timeAfterCollision = screen.getByRole('timer').textContent
  addPoint(0, 0)
  for (const [x, y] of [[0, 1], [1, 1], [2, 1], [2, 0]]) addPoint(x, y)
  fireEvent.click(screen.getByRole('button', { name: 'Запустить полёт' }))
  expect(screen.getByRole('timer').textContent).not.toBe('00:00')

  await advanceFlight(1_280)
  expect(screen.getByRole('heading', { name: 'Миссия выполнена!' })).toBeTruthy()
  const successResult = screen.getByRole('heading', { name: 'Миссия выполнена!' }).closest('[role="status"]')
  expect(successResult?.textContent).toMatch(/1[\s\u00a0]?000 очков/)
  expect(screen.getByRole('timer').textContent).not.toBe(timeAfterCollision)
})

it('creates a new map after success and resets route, time, and result', async () => {
  vi.useFakeTimers()
  const maps = [firstMap, secondMap]
  const createMission = vi.fn(() => maps.shift() ?? secondMap)
  render(<GameScreen createMission={createMission} />)

  for (const [x, y] of [[0, 1], [1, 1], [2, 1], [2, 0]]) addPoint(x, y)
  fireEvent.click(screen.getByRole('button', { name: 'Запустить полёт' }))
  await advanceFlight(1_280)
  expect(screen.getByRole('heading', { name: 'Миссия выполнена!' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /новая карта/i }))

  expect(screen.getByText('Старт (−2; 1)')).toBeTruthy()
  expect(screen.getByText('Цель (1; 3)')).toBeTruthy()
  expect(screen.getByRole('timer').textContent).toBe('00:00')
  expect(screen.getByText('Точек в маршруте: 1')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Запустить полёт' }) as HTMLButtonElement).disabled).toBe(true)
  expect(createMission).toHaveBeenCalledTimes(2)
})
