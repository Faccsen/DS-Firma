interface Props {
  size?: number;
  className?: string;
}

/** Compact monochrome Phaenatics seal — used as a brand mark in the UI. */
export function PhaenaticsSeal({ size = 36, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Phaenatics"
    >
      <defs>
        <path
          id="pseal-ring"
          d="M 110,110 m -92,0 a 92,92 0 1,1 184,0 a 92,92 0 1,1 -184,0"
          fill="none"
        />
        <g id="pseal-leaf">
          <path d="M 0,0 Q -2,-12 -3,-28 Q -4,-50 -2,-72 Q 0,-92 0,-100 Q 0,-92 2,-72 Q 4,-50 3,-28 Q 2,-12 0,0 Z" />
          <path
            d="M 0,0 Q -2,-10 -3,-22 Q -4,-38 -2,-55 Q 0,-72 0,-78 Q 0,-72 2,-55 Q 4,-38 3,-22 Q 2,-10 0,0 Z"
            transform="rotate(32)"
          />
          <path
            d="M 0,0 Q -2,-10 -3,-22 Q -4,-38 -2,-55 Q 0,-72 0,-78 Q 0,-72 2,-55 Q 4,-38 3,-22 Q 2,-10 0,0 Z"
            transform="rotate(-32)"
          />
          <path
            d="M 0,0 Q -2,-8 -2,-16 Q -3,-28 -2,-40 Q 0,-54 0,-58 Q 0,-54 2,-40 Q 3,-28 2,-16 Q 2,-8 0,0 Z"
            transform="rotate(58)"
          />
          <path
            d="M 0,0 Q -2,-8 -2,-16 Q -3,-28 -2,-40 Q 0,-54 0,-58 Q 0,-54 2,-40 Q 3,-28 2,-16 Q 2,-8 0,0 Z"
            transform="rotate(-58)"
          />
          <path
            d="M 0,0 Q -1,-5 -2,-11 Q -2,-19 -1,-27 Q 0,-35 0,-38 Q 0,-35 1,-27 Q 2,-19 2,-11 Q 1,-5 0,0 Z"
            transform="rotate(82)"
          />
          <path
            d="M 0,0 Q -1,-5 -2,-11 Q -2,-19 -1,-27 Q 0,-35 0,-38 Q 0,-35 1,-27 Q 2,-19 2,-11 Q 1,-5 0,0 Z"
            transform="rotate(-82)"
          />
        </g>
      </defs>

      <circle cx="110" cy="110" r="62" fill="#f2e8d0" />

      <text
        fill="#f2e8d0"
        style={{
          fontFamily: "'Fraunces','Playfair Display',serif",
          fontSize: 9.5,
          fontWeight: 500,
          letterSpacing: 2.8,
        }}
      >
        <textPath href="#pseal-ring" startOffset="0">
          {" · PHAENATICS E.V. · PROFESSIONELLER CANNABIS SOCIAL CLUB IN LÜNEBURG "}
        </textPath>
      </text>

      <use
        href="#pseal-leaf"
        fill="#17402f"
        transform="translate(104,116) rotate(-30) scale(0.5)"
      />
      <use
        href="#pseal-leaf"
        fill="#17402f"
        transform="translate(116,104) rotate(150) scale(0.5)"
      />
    </svg>
  );
}

/** Minimal cannabis-leaf glyph for inline use. */
export function CannabisLeaf({ className = "", size = 16 }: Props) {
  return (
    <svg
      viewBox="-50 -102 100 108"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <g fill="currentColor">
        <path d="M 0,0 Q -2,-12 -3,-28 Q -4,-50 -2,-72 Q 0,-92 0,-100 Q 0,-92 2,-72 Q 4,-50 3,-28 Q 2,-12 0,0 Z" />
        <path
          d="M 0,0 Q -2,-10 -3,-22 Q -4,-38 -2,-55 Q 0,-72 0,-78 Q 0,-72 2,-55 Q 4,-38 3,-22 Q 2,-10 0,0 Z"
          transform="rotate(32)"
        />
        <path
          d="M 0,0 Q -2,-10 -3,-22 Q -4,-38 -2,-55 Q 0,-72 0,-78 Q 0,-72 2,-55 Q 4,-38 3,-22 Q 2,-10 0,0 Z"
          transform="rotate(-32)"
        />
        <path
          d="M 0,0 Q -2,-8 -2,-16 Q -3,-28 -2,-40 Q 0,-54 0,-58 Q 0,-54 2,-40 Q 3,-28 2,-16 Q 2,-8 0,0 Z"
          transform="rotate(58)"
        />
        <path
          d="M 0,0 Q -2,-8 -2,-16 Q -3,-28 -2,-40 Q 0,-54 0,-58 Q 0,-54 2,-40 Q 3,-28 2,-16 Q 2,-8 0,0 Z"
          transform="rotate(-58)"
        />
        <path
          d="M 0,0 Q -1,-5 -2,-11 Q -2,-19 -1,-27 Q 0,-35 0,-38 Q 0,-35 1,-27 Q 2,-19 2,-11 Q 1,-5 0,0 Z"
          transform="rotate(82)"
        />
        <path
          d="M 0,0 Q -1,-5 -2,-11 Q -2,-19 -1,-27 Q 0,-35 0,-38 Q 0,-35 1,-27 Q 2,-19 2,-11 Q 1,-5 0,0 Z"
          transform="rotate(-82)"
        />
      </g>
    </svg>
  );
}
