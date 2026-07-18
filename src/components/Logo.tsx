export function Mark({ size = 38, decorative = false }: { size?: number; decorative?: boolean }) {
  return <img className="mark" width={size} height={size} src={`${import.meta.env.BASE_URL}mark.svg`} alt={decorative ? '' : 'Keepside logo'} />
}

export function Wordmark() {
  return <div className="wordmark" aria-label="Keepside"><Mark decorative /><span className="wordmark__name" aria-hidden="true">keepside</span></div>
}
