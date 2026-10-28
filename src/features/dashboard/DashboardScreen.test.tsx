import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardScreen } from './DashboardScreen'

afterEach(cleanup)

it('shows the first mission as available and keeps later missions locked', () => {
  render(<DashboardScreen completedMissionIds={[]} onStartMission={() => {}} />)

  expect(screen.getByRole('button', { name: 'Начать: Зажги первый маяк' })).toBeTruthy()
  expect(screen.getAllByText('Заблокировано')).toHaveLength(4)
  expect(screen.getByText('После миссии 1')).toBeTruthy()
})

it('unlocks the following mission and allows replay of a completed mission', async () => {
  const user = userEvent.setup()
  const onStartMission = vi.fn()
  render(<DashboardScreen completedMissionIds={['mission-1']} onStartMission={onStartMission} />)

  await user.click(screen.getByRole('button', { name: 'Начать: Проложи маршрут' }))
  expect(onStartMission).toHaveBeenCalledWith('mission-2')
  await user.click(screen.getByRole('button', { name: 'Повторить: Зажги первый маяк' }))
  expect(onStartMission).toHaveBeenCalledWith('mission-1')
})
