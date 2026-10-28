import { describe, expect, it } from 'vitest'
import { generateMission } from './generateMission'
import type { MissionMap } from '../types'
import { findShortestSafePath } from './routeRules'

function samePoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x === b.x && a.y === b.y
}

function isObstacle(map: MissionMap, point: { x: number; y: number }) {
  return map.obstacles.some((obstacle) => samePoint(obstacle, point))
}

describe('generateMission', () => {
  it('creates endpoints inside the inclusive grid that are distinct', () => {
    const map = generateMission()
    expect(map.min).toBe(-4)
    expect(map.max).toBe(4)
    for (const point of [map.start, map.goal, ...map.obstacles]) {
      expect(Number.isInteger(point.x) && point.x >= -4 && point.x <= 4).toBe(true)
      expect(Number.isInteger(point.y) && point.y >= -4 && point.y <= 4).toBe(true)
    }
    expect(samePoint(map.start, map.goal)).toBe(false)
  })

  it('keeps endpoints distinct when the random source always repeats the same value', () => {
    const map = generateMission(() => 0)
    expect(samePoint(map.start, map.goal)).toBe(false)
    expect(findShortestSafePath(map)).not.toBeNull()
  })

  it('returns the same map for the same deterministic random sequence', () => {
    const values = [0.2, 0.7, 0.1, 0.9, 0.3, 0.6]
    const first = generateMission(() => values.shift() ?? 0.5)
    const secondValues = [0.2, 0.7, 0.1, 0.9, 0.3, 0.6]
    const second = generateMission(() => secondValues.shift() ?? 0.5)
    expect(first).toEqual(second)
  })

  it('always has a safe route and places no obstacle on a shortest safe path', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      let state = seed
      const map = generateMission(() => {
        state = (state * 48271) % 2147483647
        return state / 2147483647
      })
      const path = findShortestSafePath(map)
      expect(path).not.toBeNull()
      expect(path?.[0]).toEqual(map.start)
      expect(path?.at(-1)).toEqual(map.goal)
      for (const point of path ?? []) expect(isObstacle(map, point)).toBe(false)
    }
  })
})
