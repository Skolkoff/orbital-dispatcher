import '../styles/brand.css'

export function BrandLogo({ className = '' }: { className?: string }) {
  return <img
    className={`brand-logo ${className}`.trim()}
    src={`${import.meta.env.BASE_URL}assets/orbital-dispatcher-logo.jpg`}
    alt="Эмблема тренажёра «Орбитальный диспетчер»"
  />
}
