import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { courseModules } from '../data/course'
import { ExerciseRenderer } from './ExerciseRenderer'
import type { ExerciseAnswer } from '../types'

afterEach(cleanup)

const exercises = courseModules.flatMap((module) => module.exercises)

it('renders an accessible input surface for every course response mode', () => {
  const expected: Record<string, () => void> = {
    choice: () => { expect(screen.getByRole('group', { name: 'Выбери один ответ' })).toBeTruthy() },
    'plot-point': () => { expect(screen.getByRole('button', { name: /координатная плоскость/i })).toBeTruthy() },
    'coordinate-entry': () => { expect(screen.getByRole('img', { name: /отмеченная точка/i })).toBeTruthy() },
    route: () => { expect(screen.getByRole('button', { name: /координатная плоскость/i })).toBeTruthy() },
    shape: () => { expect(screen.getByRole('button', { name: /координатная плоскость/i })).toBeTruthy() },
    number: () => { expect(screen.getByRole('spinbutton', { name: /ответ/i })).toBeTruthy() },
  }

  for (const [kind, assertSurface] of Object.entries(expected)) {
    const exercise = exercises.find((item) => item.kind === kind)
    if (!exercise) throw new Error('No course exercise for mode ' + kind)
    const { unmount } = render(<ExerciseRenderer exercise={exercise} value={null} onChange={() => {}} />)
    assertSurface()
    unmount()
  }
})

it('returns the selected option and numeric answer through the controlled input contract', async () => {
  const user = userEvent.setup()
  const choice = exercises.find((exercise) => exercise.kind === 'choice')
  const number = exercises.find((exercise) => exercise.kind === 'number')
  if (!choice || choice.kind !== 'choice' || !number || number.kind !== 'number') throw new Error('Choice and number exercises are required')
  let choiceAnswer: ExerciseAnswer | null = null
  const onChoiceChange = (answer: ExerciseAnswer | null) => { choiceAnswer = answer }
  const choiceView = render(<ExerciseRenderer exercise={choice} value={choiceAnswer} onChange={onChoiceChange} />)
  await user.click(screen.getByRole('radio', { name: choice.options.find((option) => option.id === choice.correctOptionId)!.label }))
  expect(choiceAnswer).toEqual({ kind: 'choice', optionId: choice.correctOptionId })
  choiceView.unmount()

  let numberAnswer: ExerciseAnswer | null = null
  const numberView = render(<ExerciseRenderer exercise={number} value={numberAnswer} onChange={(answer) => { numberAnswer = answer }} />)
  await user.type(screen.getByRole('spinbutton', { name: /ответ/i }), String(number.target))
  expect(numberAnswer).toEqual({ kind: 'number', value: number.target })
  numberView.unmount()
})
