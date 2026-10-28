export function Spacecraft({ direction = 0 }: { direction?: number }) {
  return <g
    className="mission-ship"
    aria-label="Космический корабль"
    role="img"
    transform={'rotate(' + direction + ' 0 0)'}
  >
    <path className="mission-ship__engine" d="M-5 10 L0 19 L5 10 Z" />
    <path className="mission-ship__wing" d="M-7 1 L-17 9 L-8 11 M7 1 L17 9 L8 11" />
    <path className="mission-ship__body" d="M0 -18 C7 -10 9 -2 7 9 L0 14 L-7 9 C-9 -2 -7 -10 0 -18Z" />
    <path className="mission-ship__window" d="M0 -9 C3 -6 4 -3 3 0 L0 2 L-3 0 C-4 -3 -3 -6 0 -9Z" />
    <path className="mission-ship__fin" d="M-7 7 L-12 14 L-4 12 M7 7 L12 14 L4 12" />
    <path className="mission-ship__shine" d="M-3 -10 C-5 -5 -5 0 -4 4" />
  </g>
}
