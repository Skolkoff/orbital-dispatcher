import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { courseModules } from '../data/course'
import { LessonDiagram } from './LessonDiagram'

afterEach(cleanup)

it('places a negative-X example to the left of the vertical axis', () => {
  render(<LessonDiagram module={courseModules[2]} />)

  const diagram = screen.getByRole('img', { name: /отрицательные координаты/i })
  const axis = within(diagram).getByTestId('axis-y')
  const point = within(diagram).getByTestId('point-A')
  expect(Number(point.getAttribute('cx'))).toBeLessThan(Number(axis.getAttribute('x1')))
})

it('draws the movement module as an ordered three-point route', () => {
  render(<LessonDiagram module={courseModules[4]} />)

  const diagram = screen.getByRole('img', { name: /маршрут спутника/i })
  expect(diagram.querySelectorAll('[data-point]')).toHaveLength(3)
  expect(within(diagram).getByTestId('lesson-route')).toBeTruthy()
})

it('draws the geometry module as a closed four-vertex shape', () => {
  render(<LessonDiagram module={courseModules[5]} />)

  const diagram = screen.getByRole('img', { name: /геометрия на координатной плоскости/i })
  expect(diagram.querySelectorAll('[data-point]')).toHaveLength(4)
  expect(within(diagram).getByTestId('lesson-shape')).toBeTruthy()
})

it('labels the origin only once', () => {
  render(<LessonDiagram module={courseModules[5]} />)

  const diagram = screen.getByRole('img', { name: /геометрия на координатной плоскости/i })
  const zeroLabels = [...diagram.querySelectorAll('text')].filter((label) => label.textContent === '0')
  expect(zeroLabels).toHaveLength(1)
})
