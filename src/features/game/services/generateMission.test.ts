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

function axisFirstRoute(map: MissionMap, horizontalFirst: boolean) {
  const route = [{ ...map.start }]
  let { x, y } = map.start
  const moveX = () => {
    x += Math.sign(map.goal.x - x)
    route.push({ x, y })
  }
  const moveY = () => {
    y += Math.sign(map.goal.y - y)
    route.push({ x, y })
  }
  if (horizontalFirst) {
    while (x !== map.goal.x) moveX()
    while (y !== map.goal.y) moveY()
  } else {
    while (y !== map.goal.y) moveY()
    while (x !== map.goal.x) moveX()
  }
  return route
}

describe('generateMission', () => {
  it('creates endpoints inside the inclusive grid that are distinct', () => {
    const map = generateMission()
    expect(map.min).toBe(-10)
    expect(map.max).toBe(10)
    for (const point of [map.start, map.goal, ...map.obstacles]) {
      expect(Number.isInteger(point.x) && point.x >= -10 && point.x <= 10).toBe(true)
      expect(Number.isInteger(point.y) && point.y >= -10 && point.y <= 10).toBe(true)
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

  it('blocks both single-turn routes while preserving a safe alternate path', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      let state = seed
      const map = generateMission(() => {
        state = (state * 48271) % 2147483647
        return state / 2147483647
      })
      const safePath = findShortestSafePath(map) ?? []

      expect(Math.abs(map.start.x - map.goal.x)).toBeGreaterThanOrEqual(4)
      expect(Math.abs(map.start.y - map.goal.y)).toBeGreaterThanOrEqual(4)
      for (const route of [axisFirstRoute(map, true), axisFirstRoute(map, false)]) {
        expect(route.slice(1, -1).some((point) => isObstacle(map, point))).toBe(true)
      }
      expect(safePath.length).toBeGreaterThan(0)
      expect(safePath.every((point) => !isObstacle(map, point))).toBe(true)
    }
  })
})
