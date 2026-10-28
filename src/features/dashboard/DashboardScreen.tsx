import { MissionMap, missionSummaries } from './MissionMap'
import type { MissionMapProps } from './MissionMap'

export function DashboardScreen({ completedMissionIds, onStartMission }: MissionMapProps) {
  const completedCount = missionSummaries.filter((mission) => completedMissionIds.includes(mission.id)).length
  const nextMission = missionSummaries.find((mission) => !completedMissionIds.includes(mission.id))
  return <>
    <section className="dashboard-hero graph-paper" aria-labelledby="dashboard-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="pill">5–6 класс</span> Координатная плоскость</p>
        <h1 id="dashboard-title">Координаты?<br /><span>Возьмём</span> <em>курс!</em></h1>
        <p className="hero-description">Находи точки, прокладывай маршруты и управляй спутниками. Пять космических миссий помогут разобраться с координатами.</p>
        <div className="hero-actions">
          <button className="button button-dark" onClick={() => onStartMission((nextMission ?? missionSummaries[0]).id)}>
            <span aria-hidden="true">↗</span> {nextMission ? completedCount ? 'Продолжить полёт' : 'Начать первую миссию' : 'Повторить полёт'} <span aria-hidden="true">→</span>
          </button>
          <a className="text-link" href="#/map">Карта миссий ↗</a>
        </div>
        <p className="hero-note">Без оценок и спешки. Ошибки помогают учиться.</p>
      </div>
      <aside className="flight-assistant" aria-label="Совет спутника Орби">
        <div className="assistant-top"><span className="eyebrow">● На связи с ЦУП</span><span aria-hidden="true">✧</span></div>
        <div className="assistant-message">«Привет, курсант! Запомни: сначала <strong>X</strong> — по горизонтали, затем <strong>Y</strong> — по вертикали. Полетели?»</div>
        <div className="assistant-identity"><span className="orbi" aria-hidden="true">☻</span><div><strong>Спутник Орби</strong><small>Твой помощник в полёте</small></div></div>
      </aside>
    </section>
    <div className="dashboard-columns">
      <MissionMap completedMissionIds={completedMissionIds} onStartMission={onStartMission} />
      <aside className="dashboard-sidebar">
        <section className="panel progress-panel" aria-labelledby="progress-title">
          <p className="eyebrow">Бортовой журнал</p><h2 id="progress-title">Твой прогресс</h2>
          <p className="progress-number">{completedCount}<span> / 5</span></p>
          <label htmlFor="mission-progress">Миссий пройдено</label>
          <progress id="mission-progress" value={completedCount} max={5}>{completedCount} из 5</progress>
          <p>{nextMission ? `Следующая цель: «${nextMission.title}».` : 'Все миссии пройдены! Можно повторить любую.'}</p>
          <span className="pill pill-lime">Каждый шаг — новое открытие</span>
        </section>
        <section className="panel navigator-note" aria-labelledby="navigator-title"><p className="eyebrow">Памятка штурмана</p><h2 id="navigator-title">У каждой точки — свой адрес</h2><p>Первое число показывает шаги по оси X, второе — по оси Y.</p><div className="coordinate-example">A ( <strong>X</strong> ; <em>Y</em> )</div></section>
      </aside>
    </div>
  </>
}
