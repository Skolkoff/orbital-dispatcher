import type { Exercise, ExerciseAnswer } from '../types'
import { LearningGrid } from './LearningGrid'

type ExerciseRendererProps = {
  exercise: Exercise
  value: ExerciseAnswer | null
  onChange: (answer: ExerciseAnswer | null) => void
}

export function ExerciseRenderer({ exercise, value, onChange }: ExerciseRendererProps) {
  if (exercise.kind === 'choice') {
    return <fieldset className="exercise-choice">
      <legend>Выбери один ответ</legend>
      {exercise.options.map((option) => (
        <label className="exercise-choice__option" key={option.id}>
          <input
            type="radio"
            name={exercise.id}
            value={option.id}
            checked={value?.kind === 'choice' && value.optionId === option.id}
            onChange={() => onChange({ kind: 'choice', optionId: option.id })}
          />
          <span className="exercise-choice__mark" aria-hidden="true" />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  }

  if (exercise.kind === 'number') {
    return <div className="exercise-number">
      <label htmlFor={exercise.id + '-answer'}>Твой ответ
        <input
          id={exercise.id + '-answer'}
          aria-label="Ответ"
          type="number"
          step="any"
          value={value?.kind === 'number' ? String(value.value) : ''}
          onChange={(event) => {
            const raw = event.target.value
            onChange(raw === '' ? null : { kind: 'number', value: Number(raw) })
          }}
        />
      </label>
      <p>Введи число и проверь, какой математический шаг оно описывает.</p>
    </div>
  }

  if (exercise.kind === 'plot-point') {
    return <LearningGrid answerKind="plot-point" grid={exercise.grid} onChange={onChange} />
  }
  if (exercise.kind === 'coordinate-entry') {
    return <LearningGrid answerKind="coordinate-entry" grid={exercise.grid} markedPoint={exercise.markedPoint} onChange={onChange} />
  }
  if (exercise.kind === 'route') {
    return <LearningGrid answerKind="route" grid={exercise.grid} targetLength={exercise.targetPoints.length} onChange={onChange} />
  }
  return <LearningGrid answerKind="shape" grid={exercise.grid} targetLength={exercise.vertices.length} closeShape={exercise.closeShape} onChange={onChange} />
}
