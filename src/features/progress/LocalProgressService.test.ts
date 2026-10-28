import { afterEach, expect, it } from 'vitest'
import { localProgressService, PROGRESS_STORAGE_KEY } from './LocalProgressService'

afterEach(() => localStorage.clear())

it('persists a completed mission and loads it again', () => {
  expect(localProgressService.complete('mission-1')).toEqual(['mission-1'])
  expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBe('["mission-1"]')
  expect(localProgressService.load()).toEqual(['mission-1'])
})

it('does not duplicate completions or accept unknown mission IDs', () => {
  localProgressService.complete('mission-1')
  expect(localProgressService.complete('mission-1')).toEqual(['mission-1'])
  expect(localProgressService.complete('mission-unknown')).toEqual(['mission-1'])
})

it('recovers from malformed stored data with an empty demo state', () => {
  localStorage.setItem(PROGRESS_STORAGE_KEY, '{bad json')
  expect(localProgressService.load()).toEqual([])
})

it('rejects parsed data with an unexpected shape or unknown missions', () => {
  localStorage.setItem(PROGRESS_STORAGE_KEY, '{"mission":"mission-1"}')
  expect(localProgressService.load()).toEqual([])
  localStorage.setItem(PROGRESS_STORAGE_KEY, '["mission-1","mission-99"]')
  expect(localProgressService.load()).toEqual([])
})
