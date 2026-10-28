export const missionSummaries = [
  { id: 'mission-1', title: 'Зажги первый маяк', topic: 'Точка в первой четверти', description: 'Найди точку по двум координатам и отправь первый сигнал.', symbol: '✦' },
  { id: 'mission-2', title: 'Проложи маршрут', topic: 'Порядок точек', description: 'Соедини контрольные точки в нужном порядке и выведи корабль на орбиту.', symbol: '↗' },
  { id: 'mission-3', title: 'За пределами нуля', topic: 'Отрицательные координаты', description: 'Исследуй все четыре четверти координатной плоскости.', symbol: '±' },
  { id: 'mission-4', title: 'Зеркальная орбита', topic: 'Симметрия относительно оси', description: 'Найди отражение точки и настрой второй спутник.', symbol: '◇' },
  { id: 'mission-5', title: 'Точка встречи', topic: 'Координатное смещение', description: 'Рассчитай перемещение и доставь корабль к станции.', symbol: '⌖' },
]

export interface MissionMapProps {
  completedMissionIds: string[]
  onStartMission: (id: string) => void
}

export function MissionMap({ completedMissionIds, onStartMission }: MissionMapProps) {
  return <section className="mission-map" aria-labelledby="mission-map-title">
    <div className="section-heading">
      <div><p className="eyebrow">Пять шагов к уверенной навигации</p><h2 id="mission-map-title">Карта космических миссий</h2></div>
      <span className="map-count">05 миссий</span>
    </div>
    <ol className="mission-list">
      {missionSummaries.map((mission, index) => {
        const completed = completedMissionIds.includes(mission.id)
        const available = completed || index === 0 || completedMissionIds.includes(missionSummaries[index - 1].id)
        const state = completed ? 'completed' : available ? 'available' : 'locked'
        return <li className={`mission-card mission-card--${state}`} key={mission.id}>
          <div className="mission-symbol" aria-hidden="true"><span className="mission-number">0{index + 1}</span>{completed ? '✓' : available ? mission.symbol : '⌑'}</div>
          <div className="mission-copy">
            <span className="mission-state">{completed ? 'Пройдено ✓' : available ? 'Можно начать' : 'Заблокировано'}</span>
            <h3>{mission.title}</h3>
            <p className="mission-topic">{mission.topic}</p>
            <p>{mission.description}</p>
          </div>
          <div className="mission-action">
            {available ? <button className={completed ? 'button button-secondary' : 'button button-dark'} onClick={() => onStartMission(mission.id)} aria-label={`${completed ? 'Повторить' : 'Начать'}: ${mission.title}`}>
              {completed ? 'Повторить' : 'Начать'} <span aria-hidden="true">→</span>
            </button> : <p>После миссии {index}</p>}
          </div>
        </li>
      })}
    </ol>
  </section>
}
