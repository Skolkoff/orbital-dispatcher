import { CadetGuide } from '../../components/CadetGuide'
import { OrbiCompanion } from '../../components/OrbiCompanion'
import { Spacecraft } from '../game/components/Spacecraft'
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
  const activeModule = modules.find((item) => !item.summary.completed)
  const nextModule = activeModule?.module ?? modules[0]?.module
  const completedModules = modules.filter((item) => item.summary.completed).length
  const actionLabel = solved === 0 ? 'Начать обучение' : solved === total ? 'Повторить курс' : 'Продолжить полёт'

  return <div className="dashboard-screen">
    <section className="dashboard-hero graph-paper" aria-labelledby="dashboard-title">
      <div className="dashboard-hero__copy">
          <p className="eyebrow"><span className="pill">5–6 класс</span> Координатная плоскость</p>
          <p className="dashboard-hero__welcome" aria-live="polite">{solved === 0 ? 'Привет, курсант! Твоя первая миссия уже готова.' : solved === total ? 'Весь курс пройден — можно закрепить навыки повторением.' : 'С возвращением! Корабль ждёт продолжения маршрута.'}</p>
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
        <div className="dashboard-next-step" aria-label="Твой следующий шаг">
          <span className="dashboard-next-step__icon" aria-hidden="true">⌖</span>
          <span><strong>{solved === 0 ? 'Начни с первой миссии' : solved === total ? 'Маршрут завершён' : 'Следующий шаг'}</strong><small>{activeModule ? activeModule.module.title + ' · ' + activeModule.summary.solved + ' из ' + activeModule.summary.total + ' заданий' : 'Все ' + completedModules + ' модулей пройдены'}</small></span>
          <span className="dashboard-next-step__progress" aria-label={'Пройдено модулей: ' + completedModules + ' из ' + modules.length}>{completedModules}/{modules.length}</span>
        </div>
      </div>
      <aside className="dashboard-hero__guide" aria-label="Курсантка и помощник Орби">
        <div className="dashboard-hero__orbit" aria-hidden="true">✦ ✧ ·</div>
        <CadetGuide className="dashboard-hero__portrait" />
        <OrbiCompanion state="idle" />
        <span className="dashboard-hero__sticker">Курс на знания!</span>
      </aside>
    </section>

    <section className="mission-launch" aria-labelledby="mission-launch-title">
      <div className="mission-launch__copy">
        <p className="eyebrow">Свободная миссия · тренажёр</p>
        <h2 id="mission-launch-title">Прокладывай курс среди астероидов</h2>
        <p>Расставь маршрут по координатам, проверь его в полёте и найди безопасный путь. Можно пробовать снова — прогресс курса не потеряется.</p>
        <div className="mission-launch__details" aria-label="Чему учит миссия">
          <span>Соседние точки</span><span>Оси X и Y</span><span>Планирование маршрута</span>
        </div>
        <a className="button button-dark" href="#/game"><span aria-hidden="true">↗</span> Проложить маршрут <span aria-hidden="true">→</span></a>
      </div>
      <svg className="mission-launch__art" viewBox="0 0 240 170" aria-hidden="true">
        <path className="mission-launch__orbit mission-launch__orbit--outer" d="M18 119 C45 31 172 13 218 75 C240 104 201 145 151 148" />
        <path className="mission-launch__route" d="M28 126 H83 V92 H139 V53 H198" />
        <circle className="mission-launch__start" cx="28" cy="126" r="8" />
        <circle className="mission-launch__goal" cx="198" cy="53" r="10" />
        <circle className="mission-launch__obstacle" cx="83" cy="67" r="8" />
        <g transform="translate(139 53)"><Spacecraft direction={90} /></g>
        <text x="20" y="151">(−4; −2)</text><text x="173" y="35">цель</text>
      </svg>
    </section>

    <section className="flight-stats" aria-label="Учебный прогресс">
      <article className="flight-stat flight-stat--lime">
        <span className="flight-stat__icon" aria-hidden="true">✓</span>
        <p>Заданий решено <span className="flight-stat__help">Сколько задач курса ты выполнил.</span></p>
        <strong>{solved}<small> / {total}</small></strong>
      </article>
      <article className="flight-stat flight-stat--violet">
        <span className="flight-stat__icon" aria-hidden="true">↗</span>
        <p>Верно с первой попытки <span className="flight-stat__help">Правильные ответы без подсказки.</span></p>
        <strong>{firstCorrect}<small> из {attempted}</small></strong>
      </article>
      <article className="flight-stat flight-stat--coral">
        <span className="flight-stat__icon" aria-hidden="true">↻</span>
        <p>Ответов дано <span className="flight-stat__help">Включая повторные попытки.</span></p>
        <strong>{attempts}<small> всего</small></strong>
      </article>
      <article className="flight-stat">
        <span className="flight-stat__icon" aria-hidden="true">✧</span>
        <p>Подсказки использованы <span className="flight-stat__help">В скольких заданиях пригодилась подсказка.</span></p>
        <strong>{hints}<small> заданий с подсказкой</small></strong>
      </article>
    </section>

    <MissionMap modules={modules} onOpenModule={onOpenModule} />
  </div>
}
