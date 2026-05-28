interface GippyLogoProps {
  /** Высота SVG в пикселях. Ширина вычисляется автоматически из viewBox 100:70. */
  size?: number;
  theme?: "light" | "dark";
  className?: string;
}

export function GippyLogo({ size = 40, theme = "dark", className }: GippyLogoProps) {
  const color = theme === "dark" ? "#fff" : "#1e293b";
  const width = Math.round(size * (100 / 70));

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 100 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Антенна */}
      <circle cx="50" cy="8" r="3" fill="none" stroke={color} strokeWidth="2.5" />
      <line x1="50" y1="11" x2="50" y2="20" stroke={color} strokeWidth="3" strokeLinecap="round" />

      {/* Голова */}
      <rect x="18" y="20" width="64" height="44" rx="8" fill="none" stroke={color} strokeWidth="3.5" />

      {/* Очки */}
      <circle cx="38" cy="38" r="10" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="62" cy="38" r="10" fill="none" stroke={color} strokeWidth="3" />

      {/* Перемычка очков */}
      <line x1="48" y1="38" x2="52" y2="38" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

      {/* Зрачки */}
      <circle cx="38" cy="38" r="4" fill={color} />
      <circle cx="62" cy="38" r="4" fill={color} />

      {/* Улыбка */}
      <path d="M 35 52 Q 50 58 65 52" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
