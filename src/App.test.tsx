import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { localProgressService, PROGRESS_STORAGE_KEY } from './features/progress/LocalProgressService'

beforeEach(() => vi.spyOn(window, 'scrollTo').mockImplementation(() => {}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ''
  vi.restoreAllMocks()
})

it('does not allow opening a locked mission through a direct URL', () => {
  window.location.hash = '#/mission/mission-3'
  render(<App />)

  expect(screen.getByRole('heading', { name: 'Сначала заверши предыдущий этап' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'К карте миссий →' }).getAttribute('href')).toBe('#/map')
})

it('saves only a correct completion and unlocks the next mission', async () => {
  const user = userEvent.setup()
  window.location.hash = '#/mission/mission-1'
  render(<App />)

  await user.type(screen.getByLabelText('X'), '3')
  await user.type(screen.getByLabelText('Y'), '4')
  await user.click(screen.getByRole('button', { name: 'Выбрать точку' }))
  await user.click(screen.getByRole('button', { name: 'Проверить ответ' }))
  expect(await screen.findByText(/Координаты верны/)).toBeTruthy()
  expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBe('["mission-1"]')

  await user.click(screen.getByRole('link', { name: 'Следующая миссия →' }))
  expect(await screen.findByRole('heading', { name: 'Проложи маршрут' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Проверить ответ' }).hasAttribute('disabled')).toBe(true)
  expect(localProgressService.load()).toEqual(['mission-1'])
})

it('restores the completed mission state when the application is mounted again', () => {
  localProgressService.complete('mission-1')
  window.location.hash = '#/dashboard'
  render(<App />)

  expect(screen.getByText('1')).toBeTruthy()
  expect(screen.getByText('Миссий пройдено')).toBeTruthy()
  expect(screen.getByText('Продолжить полёт')).toBeTruthy()
})
