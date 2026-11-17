import React from 'react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] border border-transparent',
  secondary:
    'bg-transparent text-[var(--text-primary)] border border-[var(--border-medium)] hover:border-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/70',
  ghost:
    'bg-transparent text-[var(--text-primary)] border border-transparent hover:bg-[var(--bg-secondary)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-4 text-xs font-medium',
  md: 'h-10 px-5 text-sm font-medium',
  lg: 'h-11 px-6 text-sm font-medium',
};

export interface PillButtonProps
  extends BaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  to?: string;
}

export const PillButton: React.FC<PillButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  to,
  children,
  type = 'button',
  ...rest
}) => {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full transition-colors duration-200 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
};
