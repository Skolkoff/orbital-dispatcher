import type { Exercise, GridBounds, Point } from '../types'

function coordinate(value: number) {
  return value < 0 ? '−' + Math.abs(value) : String(value)
}

function pointLabel(point: Point) {
  return '(' + coordinate(point.x) + '; ' + coordinate(point.y) + ')'
}

function nextCoordinate(value: number, bounds: GridBounds, variantIndex: number) {
  if (value === 0) return 0
  const limit = value > 0 ? bounds.max : Math.abs(bounds.min)
  const magnitude = Math.abs(value)
  const nextMagnitude = ((magnitude - 1 + (variantIndex % limit)) % limit) + 1
  return Math.sign(value) * nextMagnitude
}

function nextPoint(point: Point, bounds: GridBounds, variantIndex: number): Point {
  return {
    x: nextCoordinate(point.x, bounds, variantIndex),
    y: nextCoordinate(point.y, bounds, variantIndex),
  }
}

function feedbackForPoint(point: Point) {
  return {
    hints: [
      'Сначала найди положение по горизонтальной оси X.',
      'Затем двигайся по вертикали Y; каждый знак задаёт своё направление.',
      'Адрес этой точки: ' + pointLabel(point) + '.',
    ],
    correction: 'Проверь адрес по шагам: сначала X = ' + coordinate(point.x) + ', затем Y = ' + coordinate(point.y) + '.',
    correctFeedback: 'Верно: точка ' + pointLabel(point) + ' отмечена по координатам X, затем Y.',
  }
}

function choiceVariant(exercise: Extract<Exercise, { kind: 'choice' }>, attemptIndex: number): Exercise {
  let prompt: string
  let labels: Record<string, string>

  if (exercise.skillId === 'grid' && exercise.correctOptionId === '1') {
    const distractor = 1 + ((attemptIndex - 1) % 5)
    prompt = 'Точка O — пересечение осей X = 0 и Y = 0. Какой адрес у начала координат?'
    labels = { '1': '(0; 0)', '2': '(' + distractor + '; 0)', '3': '(0; ' + distractor + ')' }
  } else if (exercise.skillId === 'grid') {
    const x = 2 + ((attemptIndex - 1) % 5)
    const y = 1 + (attemptIndex % 5)
    prompt = 'Точка A ' + pointLabel({ x, y }) + ' переместилась на 1 единицу по направлению увеличения X. Куда она сдвинулась?'
    labels = { '1': 'На 1 единицу влево', '2': 'На 1 единицу вправо', '3': 'На 1 единицу вверх' }
  } else if (exercise.skillId === 'signs-quadrants' && exercise.correctOptionId === '2') {
    const x = 1 + (attemptIndex % 5)
    const y = 1 + ((attemptIndex + 1) % 5)
    prompt = 'Координаты точки: X = −' + x + ', Y = +' + y + '. В каких направлениях она расположена от начала?'
    labels = { '1': 'Вправо и вниз', '2': 'Влево и вверх', '3': 'Вправо и вверх' }
  } else if (exercise.skillId === 'signs-quadrants') {
    const x = 1 + (attemptIndex % 5)
    const y = 1 + ((attemptIndex + 2) % 5)
    prompt = 'Точка имеет адрес ' + pointLabel({ x, y: -y }) + '. В какой четверти она находится?'
    labels = { '1': 'I четверть (справа и выше)', '2': 'III четверть (слева и ниже)', '3': 'IV четверть (справа и ниже)' }
  } else if (exercise.skillId === 'reading-records' && exercise.correctOptionId === '3') {
    const bounds = { min: -6, max: 6 }
    const a = nextPoint({ x: -2, y: 1 }, bounds, attemptIndex)
    const b = nextPoint({ x: 1, y: -2 }, bounds, attemptIndex)
    const c = nextPoint({ x: -2, y: -1 }, bounds, attemptIndex)
    prompt = 'В журнале маяки A ' + pointLabel(a) + ', B ' + pointLabel(b) + ', C ' + pointLabel(c) + '. Какой находится на ' + Math.abs(c.x) + ' влево и ' + Math.abs(c.y) + ' вниз от начала?'
    labels = { '1': 'Маяк A', '2': 'Маяк B', '3': 'Маяк C' }
  } else if (exercise.skillId === 'reading-records') {
    const bounds = { min: -6, max: 6 }
    const a = nextPoint({ x: -3, y: 2 }, bounds, attemptIndex)
    const b = nextPoint({ x: 4, y: 2 }, bounds, attemptIndex)
    const c = nextPoint({ x: -3, y: -4 }, bounds, attemptIndex)
    prompt = 'В журнале точки A ' + pointLabel(a) + ', B ' + pointLabel(b) + ', C ' + pointLabel(c) + '. Сравни отдельно первые и вторые координаты.'
    labels = {
      '1': 'A и B имеют одинаковый X',
      '2': 'A и C имеют одинаковый X; A и B — одинаковый Y',
      '3': 'Все три точки совпадают',
    }
  } else if (exercise.skillId === 'translations') {
    const x = 2 + ((attemptIndex - 1) % 5)
    const y = 1 + (attemptIndex % 5)
    prompt = 'Сравни маршруты: A: (0; 0) → (' + x + '; 0) → (' + x + '; ' + y + '); B: (0; 0) → (0; ' + y + ') → (' + x + '; ' + y + '). Что верно?'
    labels = {
      '1': 'Маршруты полностью одинаковы',
      '2': 'Финиш одинаков, промежуточные точки различаются',
      '3': 'Финиши различаются',
    }
  } else if (exercise.skillId === 'coordinate-geometry') {
    const bounds = { min: -6, max: 6 }
    const a = nextPoint({ x: -4, y: -1 }, bounds, attemptIndex)
    const b = nextPoint({ x: 2, y: -1 }, bounds, attemptIndex)
    const c = nextPoint({ x: 2, y: 3 }, bounds, attemptIndex)
    const d = nextPoint({ x: -4, y: 3 }, bounds, attemptIndex)
    prompt = 'Вершины прямоугольника: A ' + pointLabel(a) + ', B ' + pointLabel(b) + ', C ' + pointLabel(c) + ', D ' + pointLabel(d) + '. Какая запись о его сторонах верна?'
    labels = {
      '1': 'A и B — горизонтальная сторона; B и C — вертикальная',
      '2': 'A и C — горизонтальная сторона; B и D — вертикальная',
      '3': 'У всех вершин одинаковый Y',
    }
  } else {
    prompt = 'Повторная проверка: выбери верное утверждение и проверь его по координатной сетке.'
    labels = Object.fromEntries(exercise.options.map((option) => [option.id, option.label]))
  }

  const options = exercise.options.map((option) => ({ ...option, label: labels[option.id] ?? option.label }))
  const offset = 1 + ((attemptIndex - 1) % (options.length - 1))
  return { ...exercise, prompt, options: [...options.slice(offset), ...options.slice(0, offset)] }
}

function varyNumber(exercise: Extract<Exercise, { kind: 'number' }>, variantIndex: number): Exercise {
  if (exercise.skillId === 'grid') {
    const target = exercise.target === 6
      ? exercise.target + 2 * variantIndex
      : ((exercise.target - 1 + variantIndex) % 6) + 1
    const scaled = exercise.target === 6
    return {
      ...exercise,
      target,
      prompt: scaled
        ? 'На оси отметки идут через 2 единицы: 0, 2, 4, …, ' + target + '. Какое расстояние от нуля до последней отметки?'
        : 'Между отметками 0 и ' + target + ' сколько единичных промежутков?',
      hints: ['Считай промежутки между отметками.', 'Нулевая отметка задаёт начало отсчёта, но не добавляет шаг.', 'Расстояние от 0 до ' + target + ' равно ' + target + ' единицам.'],
      correction: 'Проверь число промежутков от нуля и учти расстояние между соседними отметками.',
      correctFeedback: 'Верно: от нуля до отметки ' + target + ' — ' + target + ' единиц.',
    }
  }

  if (exercise.skillId === 'ordered-pairs') {
    const target = ((exercise.target - 1 + variantIndex) % 6) + 1
    return {
      ...exercise,
      target,
      prompt: 'У точки (5; ' + target + ') какое число показывает положение по вертикали Y?',
      hints: ['В упорядоченной паре сначала записан X.', 'Координата Y стоит на втором месте.', 'У точки (5; ' + target + ') второе число равно ' + target + '.'],
      correction: 'Найди второе число пары: именно оно задаёт координату Y.',
      correctFeedback: 'Верно: в паре (5; ' + target + ') координата Y равна ' + target + '.',
    }
  }

  const start = -2 - ((variantIndex - 1) % 4)
  const target = 2 - start
  return {
    ...exercise,
    target,
    prompt: 'Спутник переместился по горизонтали из X = ' + coordinate(start) + ' в X = 2. Сколько единичных шагов он прошёл?',
    hints: ['Считай шаги по оси X, включая переход через ноль.', 'От ' + coordinate(start) + ' до 0 — ' + Math.abs(start) + ' шагов; затем посчитай от 0 до 2.', 'Сложи расстояния слева и справа от нуля.'],
    correction: 'Конечная координата — положение, а не длина пути. Посчитай все промежутки от ' + coordinate(start) + ' до 2.',
    correctFeedback: 'Верно: от X = ' + coordinate(start) + ' до X = 2 — ' + target + ' шагов.',
  }
}

export function createExerciseVariant(exercise: Exercise, attemptIndex: number): Exercise {
  if (!Number.isInteger(attemptIndex) || attemptIndex <= 0) return exercise

  if (exercise.kind === 'choice') {
    if (exercise.options.length < 2) return exercise
    return choiceVariant(exercise, attemptIndex)
  }

  if (exercise.kind === 'number') return varyNumber(exercise, attemptIndex)

  if (exercise.kind === 'plot-point') {
    const target = nextPoint(exercise.target, exercise.grid, attemptIndex)
    return {
      ...exercise,
      target,
      prompt: 'Повторная проверка: построй точку ' + pointLabel(target) + ' на координатной плоскости.',
      ...feedbackForPoint(target),
    }
  }

  if (exercise.kind === 'coordinate-entry') {
    const markedPoint = nextPoint(exercise.markedPoint, exercise.grid, attemptIndex)
    const target = nextPoint(exercise.target, exercise.grid, attemptIndex)
    return {
      ...exercise,
      markedPoint,
      target,
      prompt: 'Повторная проверка: прочитай адрес отмеченной точки. Сначала X, затем Y.',
      ...feedbackForPoint(target),
    }
  }

  if (exercise.kind === 'route') {
    const targetPoints = exercise.targetPoints.map((point) => nextPoint(point, exercise.grid, attemptIndex))
    const routeText = targetPoints.map((point, index) => String.fromCharCode(65 + index) + ' ' + pointLabel(point)).join(' → ')
    return {
      ...exercise,
      targetPoints,
      prompt: 'Повторная проверка: отметь контрольные точки маршрута по порядку: ' + routeText + '.',
      hints: ['Каждую пару читай в порядке X, затем Y.', 'Сохраняй порядок контрольных точек из условия.', 'Маршрут: ' + routeText + '.'],
      correction: 'Проверь координаты каждой точки и порядок маршрута: ' + routeText + '.',
      correctFeedback: 'Верно: все контрольные точки маршрута отмечены в заданном порядке.',
    }
  }

  const vertices = exercise.vertices.map((point) => nextPoint(point, exercise.grid, attemptIndex))
  const shapeText = vertices.map((point, index) => String.fromCharCode(65 + index) + ' ' + pointLabel(point)).join('; ')
  return {
    ...exercise,
    vertices,
    prompt: 'Повторная проверка: построй фигуру по адресам вершин в этом порядке: ' + shapeText + '.',
    hints: ['Одна пара задаёт одну вершину.', 'Отмечай вершины последовательно и не меняй X с Y.', 'Порядок вершин: ' + shapeText + '.'],
    correction: 'Сверь координаты и порядок каждой вершины: ' + shapeText + '.',
    correctFeedback: 'Верно: вершины построены в указанном порядке' + (exercise.closeShape ? ', контур замкнут.' : '.'),
  }
}
