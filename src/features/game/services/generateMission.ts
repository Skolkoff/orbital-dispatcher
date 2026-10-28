import type { GridPoint, MissionMap } from '../types'
import { findShortestSafePath } from './routeRules'

const coordinates: GridPoint[] = []
for (let y = -4; y <= 4; y += 1) {
  for (let x = -4; x <= 4; x += 1) coordinates.push({ x, y })
}

function randomIndex(random: () => number, length: number): number {
  const value = random()
  if (!Number.isFinite(value)) return 0
  return Math.min(length - 1, Math.max(0, Math.floor(value * length)))
}

export function generateMission(random: () => number = Math.random): MissionMap {
  const startIndex = randomIndex(random, coordinates.length)
  const rawGoalIndex = randomIndex(random, coordinates.length - 1)
  const goalIndex = rawGoalIndex >= startIndex ? rawGoalIndex + 1 : rawGoalIndex
  const start = coordinates[startIndex]
  const goal = coordinates[goalIndex]

  const safePath: GridPoint[] = [start]
  let x = start.x
  let y = start.y
  while (x !== goal.x) {
    x += Math.sign(goal.x - x)
    safePath.push({ x, y })
  }
  while (y !== goal.y) {
    y += Math.sign(goal.y - y)
    safePath.push({ x, y })
  }

  const protectedPoints = new Set(safePath.map(({ x: px, y: py }) => `${px},${py}`))
  const candidates = coordinates.filter(({ x: px, y: py }) => !protectedPoints.has(`${px},${py}`))
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(random, index + 1)
    ;[candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]]
  }
  const obstacles = candidates.slice(0, 10)
  const map: MissionMap = { min: -4, max: 4, start, goal, obstacles }

  // Keep generation resilient if map rules change: return with a verified safe route.
  if (findShortestSafePath(map) === null) return { ...map, obstacles: [] }
  return map
}
