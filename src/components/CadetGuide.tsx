import '../styles/brand.css'

export function CadetGuide({ className = '' }: { className?: string }) {
  return <img
    className={`cadet-guide ${className}`.trim()}
    src="/assets/orbital-dispatcher-cadet.jpg"
    alt="Курсантка-наставница в космической форме"
  />
}
