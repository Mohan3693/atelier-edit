import { useId } from 'react';

export function BrandMark({ className = 'w-7 h-7' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `ov-mark-bg-${uid}`;
  const goldId = `ov-mark-gold-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={bgId} x1="8" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9E1F3E" />
          <stop offset="55%" stopColor="#7B152E" />
          <stop offset="100%" stopColor="#4A0D1C" />
        </linearGradient>
        <linearGradient id={goldId} x1="20" y1="10" x2="44" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F6DFB6" />
          <stop offset="100%" stopColor="#D4A662" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${bgId})`} />
      <rect
        x="4.5"
        y="4.5"
        width="55"
        height="55"
        rx="12.5"
        stroke={`url(#${goldId})`}
        strokeOpacity="0.38"
        strokeWidth="1.5"
      />
      <path
        d="M27.2 19.5C27.2 16.4 29.35 14.2 32 14.2C34.65 14.2 36.8 16.25 36.8 18.8C36.8 20.95 35.3 22.35 33.4 23.35L32 24.1V26.4"
        stroke={`url(#${goldId})`}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 26.2L14.2 38.9C12.35 40.22 13.28 43.2 15.56 43.2H48.44C50.72 43.2 51.65 40.22 49.8 38.9L32 26.2Z"
        stroke="#FAF8F4"
        strokeWidth="4.2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="49.5" r="2.6" fill={`url(#${goldId})`} />
    </svg>
  );
}
