import { useId } from 'react';

/** KeyRush mark: dark rounded tile, white bolt, green dot. */
export default function Logo({ size = 40 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="kr-logo" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="KeyRush" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4e4e8" />
          <stop offset=".45" stopColor="#6b6b75" stopOpacity=".9" />
          <stop offset="1" stopColor="#3f3f46" stopOpacity=".8" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16171b" />
          <stop offset="1" stopColor="#0b0b0e" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${id}-fill)`} stroke={`url(#${id}-edge)`} strokeWidth="2" />
      <path d="M36.5 12.5 20.5 35h10.5l-3.5 17L44 28.5H33.5z" fill="#fff" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="48.5" cy="47.5" r="4.5" fill="#9a9aa4" />
    </svg>
  );
}
