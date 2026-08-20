/**
 * Selo do RPGcord: losango violeta com um d20 visto de frente.
 * Fica inline em vez de <img> para herdar o tema, escalar sem pixel e nao
 * custar uma requisicao extra dentro do iframe do Discord.
 * A mesma marca vetorial esta em public/brand/ para uso fora do app.
 */
export function BrandMark({ size = 38, title }: { size?: number; title?: string }) {
  const id = "brand-" + size;
  return (
    <svg className="brand-seal" width={size} height={size} viewBox="0 0 64 64" role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`${id}-seal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#45376d" />
          <stop offset="1" stopColor="#8b73d8" />
        </linearGradient>
        <linearGradient id={`${id}-die`} x1=".15" y1="0" x2=".85" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eadcff" />
        </linearGradient>
      </defs>
      <g transform="rotate(45 32 32)">
        <rect x="12" y="12" width="40" height="40" rx="9.984" fill={`url(#${id}-seal)`} />
        <rect x="12" y="12" width="40" height="40" rx="9.984" fill="none" stroke="#d5c9f4" strokeOpacity=".5" strokeWidth="1.472" />
      </g>
      <g fill="none" stroke={`url(#${id}-die)`} strokeWidth="2.112" strokeLinejoin="round" strokeLinecap="round">
        <path d="M32.00 19.01 L43.25 25.50 L43.25 38.50 L32.00 44.99 L20.75 38.50 L20.75 25.50 Z" />
        <path d="M32.00 25.50 L37.63 35.25 L26.37 35.25 Z" fill="#ffffff" fillOpacity=".2" />
        <path d="M32.00 25.50 L32.00 19.01" />
        <path d="M26.37 35.25 L20.75 38.50" />
        <path d="M37.63 35.25 L43.25 38.50" />
        <path d="M32.00 25.50 L43.25 25.50" />
        <path d="M37.63 35.25 L32.00 44.99" />
        <path d="M26.37 35.25 L20.75 25.50" />
      </g>
      <path d="M48.768 10.24 Q49.979 14.533 54.272 15.744 Q49.979 16.955 48.768 21.248 Q47.557 16.955 43.264 15.744 Q47.557 14.533 48.768 10.24 Z" fill="#f0d9a6" opacity=".95" />
    </svg>
  );
}
