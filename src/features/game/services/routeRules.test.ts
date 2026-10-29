import { describe, expect, it } from 'vitest'
import type { MissionMap } from '../types'
import { calculateMissionScore, findShortestSafePath, formatElapsedTime, isNextRoutePointValid } from './routeRules'

const map: MissionMap = {
  min: -4,
  max: 4,
  start: { x: 0, y: 0 },
  goal: { x: 2, y: 0 },
  obstacles: [{ x: 1, y: 0 }],
}

describe('routeRules', () => {
  it('finds a shortest orthogonal path including endpoints while avoiding obstacles', () => {
    const path = findShortestSafePath(map)
    expect(path?.[0]).toEqual(map.start)
    expect(path?.at(-1)).toEqual(map.goal)
    expect(path?.length).toBe(5)
    expect(path?.some((point) => point.x === 1 && point.y === 0)).toBe(false)
    for (let index = 1; index < (path?.length ?? 0); index += 1) {
      const previous = path?.[index - 1]
      const current = path?.[index]
      expect(Math.abs((current?.x ?? 0) - (previous?.x ?? 0)) + Math.abs((current?.y ?? 0) - (previous?.y ?? 0))).toBe(1)
    }
  })

  it('returns null when no safe route exists', () => {
    const blocked: MissionMap = { ...map, start: { x: 0, y: 0 }, goal: { x: 2, y: 0 }, obstacles: Array.from({ length: 9 }, (_, index) => ({ x: 1, y: index - 4 })) }
    expect(findShortestSafePath(blocked)).toBeNull()
  })

  it('accepts in-bounds points along either axis, including long segments', () => {
    const route = [{ x: 0, y: 0 }, { x: 0, y: 1 }]
    expect(isNextRoutePointValid(map, route, { x: 4, y: 1 })).toBe(true)
    expect(isNextRoutePointValid(map, route, { x: 0, y: 2 })).toBe(true)
    expect(isNextRoutePointValid(map, route, { x: 1, y: 2 })).toBe(false)
    expect(isNextRoutePointValid(map, route, { x: 5, y: 1 })).toBe(false)
  })

  it('allows a valid next route point to be an obstacle so flight can detect collision', () => {
    expect(isNextRoutePointValid(map, [{ x: 0, y: 0 }], { x: 1, y: 0 })).toBe(true)
  })

  it('scores safe routes by detour length and never returns a negative score', () => {
    expect(calculateMissionScore([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])).toBe(1000)
    expect(calculateMissionScore(Array.from({ length: 5 }, (_, x) => ({ x, y: 0 })), [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])).toBe(800)
    expect(calculateMissionScore(Array.from({ length: 15 }, (_, x) => ({ x, y: 0 })), [{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(0)
  })

  it('formats non-negative elapsed time as MM:SS with minutes beyond 59', () => {
    expect(formatElapsedTime(0)).toBe('00:00')
    expect(formatElapsedTime(65_000)).toBe('01:05')
    expect(formatElapsedTime(3_600_000)).toBe('60:00')
    expect(formatElapsedTime(-5_000)).toBe('00:00')
  })
})
