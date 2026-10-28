import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackPanel } from './FeedbackPanel'

afterEach(cleanup)

const panelProps = {
  hint: 'Иди сначала вправо, затем вверх.',
  nextMissionHref: '#/mission/mission-2',
  nextMissionLabel: 'Следующая миссия →',
  onRetry: vi.fn(),
}

it('reveals a hint when the learner asks for it', async () => {
  const user = userEvent.setup()
  render(<FeedbackPanel {...panelProps} result={null} />)

  expect(screen.queryByText(panelProps.hint)).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Подсказка' }))
  expect(screen.getByText(panelProps.hint)).toBeTruthy()
})

it('explains a wrong answer and lets the learner retry', async () => {
  const user = userEvent.setup()
  const onRetry = vi.fn()
  render(<FeedbackPanel {...panelProps} onRetry={onRetry} result={{ correct: false, feedback: 'Проверь порядок точек.' }} />)

  expect(screen.getByText('Попробуй ещё раз')).toBeTruthy()
  expect(screen.getByText('Проверь порядок точек.')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }))
  expect(onRetry).toHaveBeenCalledOnce()
})

it('shows the next mission after a correct answer', () => {
  render(<FeedbackPanel {...panelProps} result={{ correct: true, feedback: 'Координаты верны!' }} />)

  const nextMissionLink = screen.getByRole('link', { name: panelProps.nextMissionLabel })
  expect(screen.getByText('Отличная навигация!')).toBeTruthy()
  expect(nextMissionLink.getAttribute('href')).toBe(panelProps.nextMissionHref)
})

it('renders untrusted feedback as text rather than executable markup', () => {
  const payload = '<img src=x onerror=alert(1)>'
  render(<FeedbackPanel {...panelProps} result={{ correct: false, feedback: payload }} />)

  expect(screen.getByText(payload)).toBeTruthy()
  expect(screen.queryByRole('img')).toBeNull()
})
