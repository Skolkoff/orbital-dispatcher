import { CadetGuide } from '../../components/CadetGuide'
import { OrbiCompanion } from '../../components/OrbiCompanion'
import type { ModuleProgressView } from '../learning/progressView'
import { MissionMap } from './MissionMap'

export type DashboardScreenProps = {
  modules: ModuleProgressView[]
  onOpenModule: (moduleId: string) => void
}

export function DashboardScreen({ modules, onOpenModule }: DashboardScreenProps) {
  const solved = modules.reduce((total, item) => total + item.summary.solved, 0)
  const total = modules.reduce((sum, item) => sum + item.summary.total, 0)
  const attempted = modules.reduce((sum, item) => sum + item.attempted, 0)
  const firstCorrect = modules.reduce((sum, item) => sum + item.summary.firstTryCorrect, 0)
  const attempts = modules.reduce((sum, item) => sum + item.attempts, 0)
  const hints = modules.reduce((sum, item) => sum + item.hintsUsed, 0)
  const nextModule = modules.find((item) => !item.summary.completed)?.module ?? modules[0]?.module
  const actionLabel = solved === 0 ? 'Начать обучение' : solved === total ? 'Повторить курс' : 'Продолжить полёт'

  return <div className="dashboard-screen">
    <section className="dashboard-hero graph-paper" aria-labelledby="dashboard-title">
      <div className="dashboard-hero__copy">
        <p className="eyebrow"><span className="pill">5–6 класс</span> Координатная плоскость</p>
          <h1 id="dashboard-title" aria-label="Координатная плоскость — целая вселенная!">Координатная<br /><span>плоскость</span> —<br /><em>целая вселенная!</em></h1>
        <p className="dashboard-hero__description">
          Учись читать координаты, находить точки и строить маршруты. Шесть коротких модулей помогут освоить тему шаг за шагом.
        </p>
        <div className="dashboard-hero__actions">
          <button className="button button-dark" onClick={() => nextModule && onOpenModule(nextModule.id)}>
            <span aria-hidden="true">✦</span> {actionLabel}<span aria-hidden="true">→</span>
          </button>
          <a className="text-link" href="#/map">Посмотреть карту курса ↗</a>
        </div>
        <p className="dashboard-hero__note">Без оценок и спешки. Ошибки помогают понять следующий шаг.</p>
      </div>
      <aside className="dashboard-hero__guide" aria-label="Курсантка и помощник Орби">
        <div className="dashboard-hero__orbit" aria-hidden="true">✦ ✧ ·</div>
        <CadetGuide className="dashboard-hero__portrait" />
        <OrbiCompanion state="idle" />
        <span className="dashboard-hero__sticker">Курс на знания!</span>
      </aside>
    </section>

    <section className="flight-stats" aria-label="Учебный прогресс">
      <article className="flight-stat flight-stat--lime">
        <span className="flight-stat__icon" aria-hidden="true">✓</span>
        <p>Заданий решено</p>
        <strong>{solved}<small> / {total}</small></strong>
      </article>
      <article className="flight-stat flight-stat--violet">
        <span className="flight-stat__icon" aria-hidden="true">↗</span>
        <p>Первые ответы</p>
        <strong>{firstCorrect}<small> из {attempted}</small></strong>
      </article>
      <article className="flight-stat flight-stat--coral">
        <span className="flight-stat__icon" aria-hidden="true">↻</span>
        <p>Попыток</p>
        <strong>{attempts}<small> всего</small></strong>
      </article>
      <article className="flight-stat">
        <span className="flight-stat__icon" aria-hidden="true">✧</span>
        <p>Подсказки</p>
        <strong>{hints}<small> заданий с подсказкой</small></strong>
      </article>
    </section>

    <MissionMap modules={modules} onOpenModule={onOpenModule} />
  </div>
}
