import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Mail,
  Settings,
  Bot,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Building2, label: 'Companies', id: 'companies' },
  { icon: Mail, label: 'Emails', id: 'emails' },
  { icon: Bot, label: 'Agent', id: 'agent' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

export default function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-collapse on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
        setMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleNav(id) {
    onNavigate(id);
    setMobileOpen(false);
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 rounded-md p-2 text-muted-foreground hover:bg-secondary md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200 z-50',
          // Mobile: slide in/out
          'fixed inset-y-0 left-0 md:relative',
          mobileOpen ? 'translate-x-0 w-56' : '-translate-x-full md:translate-x-0',
          // Desktop: collapse toggle
          !mobileOpen && (collapsed ? 'md:w-16' : 'md:w-56')
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {(!collapsed || mobileOpen) && (
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Internship Hunter
            </span>
          )}
          {/* Close on mobile, collapse on desktop */}
          <button
            onClick={() => {
              if (mobileOpen) setMobileOpen(false);
              else setCollapsed(!collapsed);
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activePage === id
                  ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!collapsed || mobileOpen) && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {(!collapsed || mobileOpen) && (
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground">v1.0 — Internship Hunter</p>
          </div>
        )}
      </aside>
    </>
  );
}
