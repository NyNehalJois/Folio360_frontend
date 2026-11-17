import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/design/theme';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      role="group"
      aria-label="Theme switcher"
      className={`inline-flex items-center rounded-full border border-[var(--border-medium)] bg-[var(--bg-secondary)] p-0.5 transition-colors ${className}`}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-label="Light mode"
        aria-pressed={!isDark}
        className={`flex h-7 w-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
          !isDark
            ? 'bg-[var(--bg-main)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Sun className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-label="Dark mode"
        aria-pressed={isDark}
        className={`flex h-7 w-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
          isDark
            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Moon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
};
