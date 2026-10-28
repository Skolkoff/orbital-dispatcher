import { describe, expect, it } from 'vitest'
import { mockPracticeService } from './mockPracticeService'

// Catch accepting approximate coordinates, swapping axes, or ignoring route sequence/length.
describe('mission answer checking', () => {
  it('accepts the exact first-quadrant point', async () => {
    expect((await mockPracticeService.check('mission-1', { kind: 'point', point: { x: 3, y: 4 } })).correct).toBe(true)
  })
  it('rejects a wrong point', async () => {
    expect((await mockPracticeService.check('mission-1', { kind: 'point', point: { x: 4, y: 3 } })).correct).toBe(false)
  })
  it('accepts the ordered route', async () => {
    expect((await mockPracticeService.check('mission-2', { kind: 'route', points: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }] })).correct).toBe(true)
  })
  it('rejects the same waypoints in the wrong order', async () => {
    expect((await mockPracticeService.check('mission-2', { kind: 'route', points: [{ x: 4, y: 1 }, { x: 1, y: 1 }, { x: 4, y: 4 }] })).correct).toBe(false)
  })
  it.each([
    [{ x: 1, y: 1 }, { x: 4, y: 1 }],
    [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }, { x: 5, y: 5 }],
  ])('rejects routes with an incorrect length (%j)', async (...points) => {
    expect((await mockPracticeService.check('mission-2', { kind: 'route', points })).correct).toBe(false)
  })
  it.each([
    ['mission-3', -3, 2], ['mission-4', -2, 3], ['mission-5', 2, -1],
  ])('checks the target for %s', async (id, x, y) => {
    expect((await mockPracticeService.check(id, { kind: 'point', point: { x, y } })).correct).toBe(true)
  })
  it('rejects incompatible answer kinds and unknown missions', async () => {
    expect((await mockPracticeService.check('mission-1', { kind: 'route', points: [] })).correct).toBe(false)
    expect((await mockPracticeService.check('unknown', { kind: 'point', point: { x: 3, y: 4 } })).correct).toBe(false)
  })
})
