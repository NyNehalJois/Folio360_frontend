import React, { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { FolioLogo } from '@/design/components/FolioLogo';
import { PillButton } from '@/design/components/PillButton';
import { ThemeToggle } from '@/design/components/ThemeToggle';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const navLinks = [
    { label: 'Home', href: '/', isRoute: true },
    { label: 'Features', href: isHome ? '#features' : '/#features', isRoute: false },
    { label: 'How It Works', href: isHome ? '#how-it-works' : '/#how-it-works', isRoute: false },
    { label: 'Explore', href: isHome ? '#explore' : '/#explore', isRoute: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-main)]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-6 md:px-10">
          <FolioLogo to="/" />

          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-8">
            {navLinks.map((item) =>
              item.isRoute ? (
                <NavLink
                  key={item.label}
                  to={item.href}
                  className={({ isActive }) =>
                    `relative py-1 text-sm transition-colors ${
                      isActive
                        ? 'font-medium text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive && (
                        <span className="absolute inset-x-0 -bottom-0.5 h-[1.5px] bg-[var(--text-primary)]" />
                      )}
                    </>
                  )}
                </NavLink>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="py-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <PillButton to="/workspace" variant="primary" size="sm" className="h-9 px-4">
                Workspace
                <ArrowUpRight className="h-3.5 w-3.5" />
              </PillButton>
            ) : (
              <>
                <PillButton to="/auth/login" variant="secondary" size="sm" className="h-9 px-4">
                  Sign In
                </PillButton>
                <PillButton to="/auth/register" variant="primary" size="sm" className="h-9 px-4">
                  Get Started
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </PillButton>
              </>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] text-[var(--text-primary)] cursor-pointer"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-main)] px-6 py-5">
            <nav className="flex flex-col gap-4">
              {navLinks.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-medium text-[var(--text-primary)]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm text-[var(--text-secondary)]"
                  >
                    {item.label}
                  </a>
                ),
              )}
              <div className="mt-2 flex flex-wrap gap-3 pt-4 border-t border-[var(--border-subtle)]">
                {isAuthenticated ? (
                  <PillButton
                    to="/workspace"
                    variant="primary"
                    size="md"
                    onClick={() => setMobileOpen(false)}
                    className="w-full"
                  >
                    Open Workspace
                    <ArrowUpRight className="h-4 w-4" />
                  </PillButton>
                ) : (
                  <>
                    <PillButton
                      to="/auth/login"
                      variant="secondary"
                      size="md"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1"
                    >
                      Sign In
                    </PillButton>
                    <PillButton
                      to="/auth/register"
                      variant="primary"
                      size="md"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1"
                    >
                      Get Started
                      <ArrowUpRight className="h-4 w-4" />
                    </PillButton>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-main)]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex flex-col gap-1.5">
            <FolioLogo to="/" size="sm" />
            <p className="text-xs text-[var(--text-secondary)]">
              One person. One unified academic and professional identity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)]">
            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">
              How It Works
            </a>
            <Link to="/workspace" className="hover:text-[var(--text-primary)] transition-colors">
              Workspace
            </Link>
            <Link to="/auth/login" className="hover:text-[var(--text-primary)] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
