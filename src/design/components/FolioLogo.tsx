import React from 'react';
import { Link } from 'react-router-dom';

interface FolioLogoProps {
  to?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const FolioLogo: React.FC<FolioLogoProps> = ({
  to = '/',
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 20 : 24;
  const textClass = size === 'sm' ? 'text-xl' : 'text-[1.45rem]';

  const content = (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Organic calligraphic ring matching the Folio360 brand mark */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M14 3.2C7.9 3.2 3.4 7.7 3.4 14C3.4 20.1 8.1 24.8 14.3 24.8C20.2 24.8 24.6 20.3 24.6 14.2C24.6 8.3 20.4 3.5 14.6 3.2"
          stroke="var(--text-primary)"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M14.2 5.4C9.5 5.6 5.9 9.2 5.9 14C5.9 18.8 9.6 22.6 14.4 22.6"
          stroke="var(--accent)"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
      </svg>
      <span
        className={`font-serif tracking-[-0.015em] leading-none text-[var(--text-primary)] ${textClass}`}
      >
        Folio360
      </span>
    </span>
  );

  if (!to) return content;

  return (
    <Link
      to={to}
      className="inline-flex items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] rounded-sm"
    >
      {content}
    </Link>
  );
};
