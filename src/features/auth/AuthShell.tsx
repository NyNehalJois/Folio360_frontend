import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { FolioLogo } from '@/design/components/FolioLogo';
import { ThemeToggle } from '@/design/components/ThemeToggle';
import { StrandCanvas } from '@/design/strands/StrandCanvas';

interface AuthShellProps {
  eyebrow: string;
  heading: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  eyebrow,
  heading,
  description,
  children,
  footer,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      >
        <StrandCanvas variant="subtle" className="h-full w-full" />
      </div>

      <header className="relative z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-main)]/85 backdrop-blur-xs">
        <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center justify-between px-6 md:px-10">
          <FolioLogo to="/" />
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 md:py-14">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[448px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/95 p-7 shadow-sm backdrop-blur-xs sm:p-9"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {eyebrow}
          </p>
          <h1 className="mt-2.5 font-serif text-[2.35rem] leading-[1.08] tracking-[-0.01em] text-[var(--text-primary)]">
            {heading}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>

          <div className="mt-7">{children}</div>

          {footer && (
            <div className="mt-7 border-t border-[var(--border-subtle)] pt-5 text-xs text-[var(--text-secondary)]">
              {footer}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};
