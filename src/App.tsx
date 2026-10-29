import { useEffect, useState } from 'react'
import { AuthProvider } from './features/auth/AuthProvider'
import { AuthScreen } from './features/auth/AuthScreen'
import { PrivacyScreen } from './features/auth/PrivacyScreen'
import type { AuthPage } from './features/auth/AuthScreen'
import './styles/auth.css'
import type { ReactNode } from 'react'
import { AppShell } from './components/AppShell'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import { MissionMap } from './features/dashboard/MissionMap'
import { courseModules } from './features/learning/data/course'
import { checkAnswer } from './features/learning/services/checkAnswer'
import { createExerciseVariant } from './features/learning/services/createExerciseVariant'
import { buildModuleProgress } from './features/learning/progressView'
import { LessonScreen } from './features/learning/screens/LessonScreen'
import { ModuleResultScreen } from './features/learning/screens/ModuleResultScreen'
import { PracticeScreen } from './features/learning/screens/PracticeScreen'
import { SkillsScreen } from './features/learning/screens/SkillsScreen'
import { GameScreen } from './features/game/screens/GameScreen'
import { MarketingScreen } from './features/marketing/MarketingScreen'
import { learningProgressService } from './features/progress/LearningProgressService'
import type { LearningProgress } from './features/progress/LearningProgressService'
import type { ExerciseAnswer } from './features/learning/types'

type AppRoute =
  | { page: 'landing' }
  | { page: 'auth'; authPage: AuthPage; token?: string; email?: string }
  | { page: 'dashboard' }
  | { page: 'game' }
  | { page: 'notFound' }
  | { page: 'map' }
  | { page: 'privacy' }
  | { page: 'skills' }
  | { page: 'lesson' | 'practice' | 'result'; moduleId: string; exerciseId?: string }
  | { page: 'review'; exerciseId: string }

function readRoute(): AppRoute {
  const path = window.location.hash.replace(/^#\/?/, '')
  const reset = /^reset-password\/([^?]+)(?:\?(.*))?$/.exec(path)
  if (reset) return { page: 'auth', authPage: 'reset-password', token: decodeURIComponent(reset[1]), email: new URLSearchParams(reset[2] ?? '').get('email') ?? '' }
  if (['login', 'register', 'forgot-password', 'account'].includes(path)) return { page: 'auth', authPage: path as AuthPage }
  if (path === 'privacy') return { page: 'privacy' }
  if (!path) return { page: 'landing' }
  if (path === 'dashboard') return { page: 'dashboard' }
  if (path === 'map') return { page: 'map' }
  if (path === 'game') return { page: 'game' }
  if (path === 'skills') return { page: 'skills' }
  const lesson = /^module\/([^/]+)\/lesson$/.exec(path)
  if (lesson) return { page: 'lesson', moduleId: lesson[1] }
  const practice = /^module\/([^/]+)\/practice(?:\/([^/]+))?$/.exec(path)
  if (practice) return { page: 'practice', moduleId: practice[1], exerciseId: practice[2] }
  const result = /^module\/([^/]+)\/result$/.exec(path)
  if (result) return { page: 'result', moduleId: result[1] }
  const review = /^review\/([^/]+)$/.exec(path)
  if (review) return { page: 'review', exerciseId: review[1] }
  return { page: 'notFound' }
}

function newSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
}

function reviewExerciseForRoute(route: AppRoute, progress: LearningProgress) {
  if (route.page === 'review') return route.exerciseId
  if (route.page !== 'practice') return null
  const module = courseModules.find((item) => item.id === route.moduleId)
  const exercise = module?.exercises.find((item) => item.id === route.exerciseId)
    ?? module?.exercises.find((item) => !progress.exerciseResults[item.id]?.solved)
    ?? module?.exercises[0]
  return exercise && progress.exerciseResults[exercise.id]?.solved ? exercise.id : null
}

function variantIndexForRoute(route: AppRoute, progress: LearningProgress) {
  const exerciseId = reviewExerciseForRoute(route, progress)
  return exerciseId ? progress.exerciseResults[exerciseId]?.attempts ?? 0 : 0
}

function RouteNotice({ title, children }: { title: string; children: ReactNode }) {
  return <section className="route-notice panel" aria-labelledby="route-notice-title">
    <span className="route-notice__icon" aria-hidden="true">⌖</span>
    <p className="eyebrow">Проверка маршрута</p>
    <h1 id="route-notice-title">{title}</h1>
    <p>{children}</p>
    <a className="button button-dark" href="#/map">К карте курса <span aria-hidden="true">→</span></a>
  </section>
}

export default function App() {
  return <AuthProvider><CourseApp /></AuthProvider>
}

function CourseApp() {
  const [route, setRoute] = useState<AppRoute>(readRoute)
  const [progress, setProgress] = useState<LearningProgress>(() => learningProgressService.load())
  const [sessionId] = useState(newSessionId)
  const [reviewExerciseId, setReviewExerciseId] = useState<string | null>(() => reviewExerciseForRoute(route, progress))
  const [exerciseVariantIndex, setExerciseVariantIndex] = useState(() => variantIndexForRoute(route, progress))
  useEffect(() => learningProgressService.subscribe(() => setProgress(learningProgressService.load())), [])
  const moduleProgress = buildModuleProgress(progress)
  const moduleById = new Map(courseModules.map((module) => [module.id, module]))
  const exerciseById = new Map(courseModules.flatMap((module) => module.exercises).map((exercise) => [exercise.id, exercise]))
  const viewsById = new Map(moduleProgress.map((view) => [view.module.id, view]))

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = readRoute()
      setRoute(nextRoute)
      setReviewExerciseId(reviewExerciseForRoute(nextRoute, progress))
      setExerciseVariantIndex(variantIndexForRoute(nextRoute, progress))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [progress])

  function navigate(path: string) {
    if (window.location.hash === path) {
      const nextRoute = readRoute()
      setRoute(nextRoute)
      setReviewExerciseId(reviewExerciseForRoute(nextRoute, progress))
      setExerciseVariantIndex(variantIndexForRoute(nextRoute, progress))
      window.scrollTo(0, 0)
    } else {
      window.location.hash = path
    }
  }

  function isUnlocked(moduleId: string) {
    const index = courseModules.findIndex((module) => module.id === moduleId)
    return index >= 0 && (index === 0 || moduleProgress.slice(0, index).every((view) => view.summary.completed))
  }

  function openModule(moduleId: string) {
    const view = viewsById.get(moduleId)
    if (!view || !isUnlocked(moduleId)) return
    if (view.summary.completed) navigate('#/review/' + view.module.exercises[0].id)
    else navigate('#/module/' + moduleId + '/lesson')
  }

  function startPractice(moduleId: string) {
    const view = viewsById.get(moduleId)
    if (!view || !isUnlocked(moduleId)) return
    if (view.summary.completed) {
      navigate('#/review/' + view.module.exercises[0].id)
      return
    }
    const firstUnsolved = view.module.exercises.find((exercise) => !progress.exerciseResults[exercise.id]?.solved)
    navigate('#/module/' + moduleId + '/practice/' + (firstUnsolved ?? view.module.exercises[0]).id)
  }

  function submitAnswer(exerciseId: string, answer: ExerciseAnswer, hintSeenBeforeAnswer: boolean, isReview: boolean, variantIndex = 0) {
    const exercise = exerciseById.get(exerciseId)
    if (!exercise) return false
    const correct = checkAnswer(createExerciseVariant(exercise, variantIndex), answer).correct
    setProgress(learningProgressService.recordAnswer({
      exerciseId: exercise.id,
      correct,
      hintSeenBeforeAnswer,
      sessionId,
      isReview,
    }))
    return correct
  }

  function goToNextExercise(moduleId: string, exerciseId: string, isReview: boolean) {
    if (isReview) {
      navigate('#/skills')
      return
    }
    const module = moduleById.get(moduleId)
    if (!module) return
    const currentIndex = module.exercises.findIndex((exercise) => exercise.id === exerciseId)
    const nextExercise = module.exercises[currentIndex + 1]
    if (nextExercise) navigate('#/module/' + moduleId + '/practice/' + nextExercise.id)
    else navigate('#/module/' + moduleId + '/result')
  }

  let content: ReactNode
  if (route.page === 'landing') {
    content = <MarketingScreen />
  } else if (route.page === 'privacy') {
    content = <PrivacyScreen />
  } else if (route.page === 'auth') {
    content = <AuthScreen key={route.authPage + (route.token ?? '')} page={route.authPage} token={route.token} email={route.email} />
  } else if (route.page === 'dashboard') {
    content = <DashboardScreen modules={moduleProgress} onOpenModule={openModule} />
  } else if (route.page === 'game') {
    content = <GameScreen />
  } else if (route.page === 'map') {
    content = <div className="map-screen">
      <header className="map-screen__heading">
        <p className="eyebrow">Твой полётный план</p>
        <h1>От первой сетки<br />до геометрии в космосе</h1>
        <p>Шесть связанных тем ведут от начала координат к построению фигур. Каждый модуль открывается после предыдущего.</p>
      </header>
      <MissionMap modules={moduleProgress} onOpenModule={openModule} />
    </div>
  } else if (route.page === 'skills') {
    content = <SkillsScreen modules={moduleProgress} />
  } else if (route.page === 'review') {
    const exercise = exerciseById.get(route.exerciseId)
    const view = exercise ? viewsById.get(exercise.moduleId) : undefined
    if (!exercise || !view) {
      content = <RouteNotice title="Задание не найдено">Проверь ссылку и выбери доступный навык из карты курса.</RouteNotice>
    } else if (!isUnlocked(view.module.id)) {
      content = <RouteNotice title="Сначала пройди предыдущий модуль">Материалы открываются по порядку, чтобы новые правила опирались на уже изученные.</RouteNotice>
    } else {
      const displayExercise = createExerciseVariant(exercise, exerciseVariantIndex)
      const exerciseIndex = view.module.exercises.findIndex((item) => item.id === exercise.id)
      const earlierIncomplete = view.module.exercises.slice(0, exerciseIndex).some((item) => !progress.exerciseResults[item.id]?.solved)
      content = earlierIncomplete
        ? <RouteNotice title="Сначала реши предыдущие задания">Практика идёт по шагам; так каждое новое действие опирается на предыдущее.</RouteNotice>
        : <PracticeScreen
            key={'review-' + exercise.id + '-' + exerciseVariantIndex}
            exercise={displayExercise}
            exerciseNumber={exerciseIndex + 1}
            exerciseTotal={view.module.exercises.length}
            isReview
            onSubmit={(item, answer, hintSeen, review) => submitAnswer(item.id, answer, hintSeen, review, exerciseVariantIndex)}
            onNext={() => goToNextExercise(view.module.id, exercise.id, true)}
          />
    }
  } else if (route.page === 'lesson' || route.page === 'practice' || route.page === 'result') {
    const view = viewsById.get(route.moduleId)
    const module = moduleById.get(route.moduleId)
    if (!view || !module) {
      content = <RouteNotice title="Модуль не найден">Вернись к карте курса, чтобы открыть один из шести учебных модулей.</RouteNotice>
    } else if (!isUnlocked(module.id)) {
      content = <RouteNotice title="Сначала пройди предыдущий модуль">Модули открываются по порядку. После завершения предыдущей темы здесь появится следующий урок.</RouteNotice>
    } else if (route.page === 'lesson') {
      content = <LessonScreen module={module} onStartPractice={() => startPractice(module.id)} />
    } else if (route.page === 'result') {
      if (!view.summary.completed) {
        content = <RouteNotice title="Модуль ещё не завершён">Заверши все пять шагов, чтобы увидеть результаты и открыть следующую тему.</RouteNotice>
      } else {
        const moduleIndex = courseModules.findIndex((item) => item.id === module.id)
        const nextModule = moduleProgress[moduleIndex + 1]?.module
        content = <ModuleResultScreen view={view} nextModule={nextModule} />
      }
    } else {
      const exercise = route.exerciseId
        ? exerciseById.get(route.exerciseId)
        : module.exercises.find((item) => !progress.exerciseResults[item.id]?.solved) ?? module.exercises[0]
      if (!exercise || exercise.moduleId !== module.id) {
        content = <RouteNotice title="Задание не найдено">Выбери упражнение из открытого модуля, чтобы продолжить практику.</RouteNotice>
      } else {
        const exerciseIndex = module.exercises.findIndex((item) => item.id === exercise.id)
        const earlierIncomplete = module.exercises.slice(0, exerciseIndex).some((item) => !progress.exerciseResults[item.id]?.solved)
        if (earlierIncomplete) {
          content = <RouteNotice title="Сначала реши предыдущие задания">Практика открывается по шагам. Сначала закончи предыдущую задачу.</RouteNotice>
        } else {
          const isReview = reviewExerciseId === exercise.id
          const activeVariantIndex = isReview ? exerciseVariantIndex : 0
          const displayExercise = createExerciseVariant(exercise, activeVariantIndex)
          content = <PracticeScreen
            key={module.id + '-' + exercise.id + '-' + String(isReview) + '-' + activeVariantIndex}
            exercise={displayExercise}
            exerciseNumber={exerciseIndex + 1}
            exerciseTotal={module.exercises.length}
            isReview={isReview}
            onSubmit={(item, answer, hintSeen, review) => submitAnswer(item.id, answer, hintSeen, review, activeVariantIndex)}
            onNext={() => goToNextExercise(module.id, exercise.id, isReview)}
          />
        }
      }
    }
  } else {
    content = <RouteNotice title="Страница не найдена">Выбери раздел из навигации и продолжи полёт по курсу.</RouteNotice>
  }

  if (route.page === 'landing') return <>{content}</>
  const shellPage = route.page === 'review' ? 'practice' : route.page === 'notFound' || route.page === 'auth' || route.page === 'privacy' ? 'dashboard' : route.page
  return <AppShell page={shellPage}>{content}</AppShell>
}
