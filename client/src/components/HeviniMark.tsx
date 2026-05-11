interface Props {
  size?: number;
  className?: string;
}

export default function HeviniMark({ size = 32, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="87" fill="none" stroke="currentColor" strokeWidth="11" />

      {/* S-shaped filled half with oval cutout (evenodd punches the hole) */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M 100 13
           C 68 32, 58 68, 100 100
           C 142 132, 132 168, 100 187
           A 87 87 0 0 0 100 13 Z
           M 126 65
           A 14 18 0 0 1 154 65
           A 14 18 0 0 1 126 65 Z"
      />

      {/* Dividing S-curve stroke */}
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        d="M 100 13 C 68 32, 58 68, 100 100 C 142 132, 132 168, 100 187"
      />
    </svg>
  );
}
