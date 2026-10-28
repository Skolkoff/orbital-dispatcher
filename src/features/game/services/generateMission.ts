import type { GridPoint, MissionMap } from '../types'
import { findShortestSafePath } from './routeRules'

const coordinates: GridPoint[] = []
for (let y = -4; y <= 4; y += 1) {
  for (let x = -4; x <= 4; x += 1) coordinates.push({ x, y })
}
const endpointPairs = coordinates.flatMap((start) => coordinates
  .filter((goal) => Math.abs(start.x - goal.x) >= 2 && Math.abs(start.y - goal.y) >= 2)
  .map((goal) => ({ start, goal })))

function randomIndex(random: () => number, length: number): number {
  const value = random()
  if (!Number.isFinite(value)) return 0
  return Math.min(length - 1, Math.max(0, Math.floor(value * length)))
}

export function generateMission(random: () => number = Math.random): MissionMap {
  const { start, goal } = endpointPairs[randomIndex(random, endpointPairs.length)]

  const safePath: GridPoint[] = [start]
  let x = start.x
  let y = start.y
  let moveHorizontal = randomIndex(random, 2) === 0
  while (x !== goal.x || y !== goal.y) {
    if ((moveHorizontal && x !== goal.x) || y === goal.y) x += Math.sign(goal.x - x)
    else y += Math.sign(goal.y - y)
    safePath.push({ x, y })
    moveHorizontal = !moveHorizontal
  }

  const protectedPoints = new Set(safePath.map(({ x: px, y: py }) => `${px},${py}`))
  const horizontalFirst = axisFirstRoute(start, goal, true)
  const verticalFirst = axisFirstRoute(start, goal, false)
  const firstUnprotectedPoint = (route: GridPoint[]) => route.slice(1, -1)
    .find(({ x: px, y: py }) => !protectedPoints.has(`${px},${py}`))
  const guaranteedObstacles = [firstUnprotectedPoint(horizontalFirst), firstUnprotectedPoint(verticalFirst)]
  const protectedObstacles = new Set(guaranteedObstacles.filter((point): point is GridPoint => point !== undefined)
    .map(({ x: px, y: py }) => `${px},${py}`))
  const candidates = coordinates.filter(({ x: px, y: py }) =>
    !protectedPoints.has(`${px},${py}`) && !protectedObstacles.has(`${px},${py}`))
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(random, index + 1)
    ;[candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]]
  }
  const obstacles = [...guaranteedObstacles.filter((point): point is GridPoint => point !== undefined), ...candidates.slice(0, 8)]
  const map: MissionMap = { min: -4, max: 4, start, goal, obstacles }

  // Keep generation resilient if map rules change: return with a verified safe route.
  if (findShortestSafePath(map) === null) return { ...map, obstacles: [] }
  return map
}

function axisFirstRoute(start: GridPoint, goal: GridPoint, horizontalFirst: boolean): GridPoint[] {
  const route = [start]
  let x = start.x
  let y = start.y
  const moveX = () => {
    x += Math.sign(goal.x - x)
    route.push({ x, y })
  }
  const moveY = () => {
    y += Math.sign(goal.y - y)
    route.push({ x, y })
  }
  if (horizontalFirst) {
    while (x !== goal.x) moveX()
    while (y !== goal.y) moveY()
  } else {
    while (y !== goal.y) moveY()
    while (x !== goal.x) moveX()
  }
  return route
}
