import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { BrandLogo } from './BrandLogo'
import { CadetGuide } from './CadetGuide'
import { OrbiCompanion } from './OrbiCompanion'

afterEach(cleanup)

it('uses local logo and cadet artwork with descriptive alternative text', () => {
  render(<>
    <BrandLogo />
    <CadetGuide />
  </>)

  const logo = screen.getByRole('img', { name: 'Эмблема тренажёра «Орбитальный диспетчер»' })
  expect(logo.getAttribute('src')).toBe('/assets/orbital-dispatcher-logo.jpg')

  const cadet = screen.getByRole('img', { name: 'Курсантка-наставница в космической форме' })
  expect(cadet.getAttribute('src')).toBe('/assets/orbital-dispatcher-cadet.jpg')
})

it('announces Orbi’s correction state as accessible text', () => {
  render(<OrbiCompanion state="correction" />)

  expect(screen.getByRole('img', { name: 'Орби помогает исправить ошибку' })).toBeTruthy()
  expect(screen.getByRole('status').textContent).toBe('Орби помогает исправить ошибку.')
})

it('provides distinct accessible labels for each companion state', () => {
  const labels = [
    ['idle', 'Орби на связи'],
    ['hint', 'Орби подсказывает следующий шаг'],
    ['correction', 'Орби помогает исправить ошибку'],
    ['success', 'Орби празднует успех'],
  ] as const

  for (const [state, label] of labels) {
    const { unmount } = render(<OrbiCompanion state={state} />)
    expect(screen.getByRole('img', { name: label })).toBeTruthy()
    unmount()
  }
})
