import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  Briefcase,
  ChevronDown,
  FileText,
  FolderGit2,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Settings,
  Share2,
  Sparkles,
  User,
  Vault,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { FolioLogo } from '@/design/components/FolioLogo';
import { ThemeToggle } from '@/design/components/ThemeToggle';
import { useApiQuery } from '@/hooks/useApiQuery';
import { analyticsService } from '@/services/api';

interface NavItem {
  label: string;
  to: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const SIDEBAR_ITEMS: NavItem[] = [
  { label: 'Overview', to: '/workspace', end: true, icon: Home },
  { label: 'Profile', to: '/workspace/profile', icon: User },
  { label: 'Education', to: '/workspace/education', icon: GraduationCap },
  { label: 'Projects', to: '/workspace/projects', icon: FolderGit2 },
  { label: 'Skills', to: '/workspace/skills', icon: Sparkles },
  { label: 'Certificates', to: '/workspace/certificates', icon: Award },
  { label: 'Experience', to: '/workspace/experience', icon: Briefcase },
  { label: 'Documents', to: '/workspace/documents', icon: Vault },
  { label: 'Resume Studio', to: '/workspace/resumes', icon: FileText },
  { label: 'Sharing', to: '/workspace/sharing', icon: Share2 },
];

export const WorkspaceLayout: React.FC = () => {
  const { user, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: dashboard } = useApiQuery(() => analyticsService.getDashboard(), []);

  const initials = useMemo(() => {
    const name = user?.full_name || 'Folio360 Member';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user?.full_name]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    navigate('/');
  };

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav aria-label="Workspace navigation" className="flex flex-col gap-1">
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                isActive
                  ? 'font-medium text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/70 border border-transparent'
              }`
            }
            style={({ isActive }) => (isActive ? { background: 'var(--nav-active-bg)' } : undefined)}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.65} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-main)]/95 px-4 md:px-8 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open workspace menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-primary)] lg:hidden cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>
          <FolioLogo to="/workspace" size="sm" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center">
            <ThemeToggle />
          </div>

          {/* Activity / Notifications Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setActivityOpen((v) => !v);
                setUserMenuOpen(false);
              }}
              aria-label="Recent activity and reviews"
              aria-expanded={activityOpen}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Bell className="h-4 w-4" strokeWidth={1.75} />
              {(dashboard?.counts.pending_reviews ?? 0) > 0 && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              )}
            </button>

            {activityOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-main)] p-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    Activity &amp; Reviews
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivityOpen(false)}
                    aria-label="Close activity"
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {(dashboard?.counts.pending_reviews ?? 0) > 0 && (
                  <Link
                    to="/workspace/documents"
                    onClick={() => setActivityOpen(false)}
                    className="mt-3 block rounded-lg border border-[var(--border-accent)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)] hover:opacity-90"
                  >
                    {dashboard?.counts.pending_reviews} document awaiting OCR review
                  </Link>
                )}

                <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                  {(dashboard?.recent_activity ?? []).slice(0, 4).map((ev) => (
                    <li key={ev.id} className="py-2 text-xs">
                      <p className="text-[var(--text-primary)]">{ev.label}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase text-[var(--text-secondary)]">
                        {ev.verb} · {ev.entity_type}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* User Avatar Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen((v) => !v);
                setActivityOpen(false);
              }}
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
              className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-medium)] bg-[var(--bg-secondary)] font-serif text-sm text-[var(--text-primary)]">
                {initials}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-main)] p-2 shadow-lg">
                <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {user?.full_name || 'Folio360 Member'}
                  </p>
                  <p className="truncate font-mono text-[11px] text-[var(--text-secondary)]">
                    {user?.email || 'demo@example.com'}
                  </p>
                </div>

                <div className="py-1.5">
                  <Link
                    to="/workspace/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <User className="h-3.5 w-3.5" />
                    Profile
                  </Link>
                  <Link
                    to="/workspace/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </Link>
                  <Link
                    to="/"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Home className="h-3.5 w-3.5" />
                    Public Home
                  </Link>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-1.5 flex items-center justify-between px-3 py-1.5 sm:hidden">
                  <span className="text-xs text-[var(--text-secondary)]">Theme</span>
                  <ThemeToggle />
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-[var(--danger-text)] hover:bg-[var(--danger-bg)] cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoutAll}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out all devices
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-[228px] shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-main)] px-3.5 py-6">
          {renderNavLinks()}
          <div className="px-3 pt-6 border-t border-[var(--border-subtle)]">
            <p className="font-mono text-[10px] tracking-wider text-[var(--text-secondary)]">
              folio360.in/@{user?.slug || 'username'}
            </p>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative z-10 flex w-64 flex-col justify-between bg-[var(--bg-main)] p-5 shadow-xl border-r border-[var(--border-subtle)]">
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <FolioLogo to="/workspace" size="sm" />
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation"
                    className="rounded-full p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {renderNavLinks(() => setSidebarOpen(false))}
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Theme</span>
                <ThemeToggle />
              </div>
            </aside>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 min-w-0 bg-[var(--bg-main)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
