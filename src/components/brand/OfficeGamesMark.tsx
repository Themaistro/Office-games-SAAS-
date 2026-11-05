/** Brand mark, deliberately separate from the brain icons used inside games. */
export default function OfficeGamesMark({
  className = "h-11 w-11",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22 13c0-4-4-6-7-4-3 1-4 4-4 7-5 1-7 7-4 11-3 5 0 11 6 11 2 5 9 4 9-2V13Z"
        fill="var(--primary)"
      />
      <path
        d="M22 13c0-4-4-6-7-4-3 1-4 4-4 7-5 1-7 7-4 11-3 5 0 11 6 11 2 5 9 4 9-2V13Z"
        transform="translate(48 0) scale(-1 1)"
        fill="var(--primary)"
      />
      <g
        stroke="var(--background)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 13v6l-5 5v5h6v7M32 13v6l5 5v5h-6v7" />
        <path d="M16 19h6M32 19h-6M17 29l5-5M31 29l-5-5" strokeOpacity=".55" />
      </g>
      <g fill="var(--background)">
        <circle cx="16" cy="13" r="1.7" />
        <circle cx="32" cy="13" r="1.7" />
        <circle cx="11" cy="24" r="1.7" />
        <circle cx="37" cy="24" r="1.7" />
        <circle cx="17" cy="36" r="1.7" />
        <circle cx="31" cy="36" r="1.7" />
      </g>
    </svg>
  );
}
