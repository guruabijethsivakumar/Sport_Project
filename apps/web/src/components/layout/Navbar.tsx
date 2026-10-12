import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { allDomainRoutes } from '../../routes/registry';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { NavbarNotificationSlot } from '../slots/NavbarNotificationSlot';
import { NavbarRecommendedSlot } from '../slots/NavbarRecommendedSlot';

export function Navbar(): React.ReactElement {
  const { isAuthenticated, user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Extract navigable routes dynamically from route registry
  const navItems = allDomainRoutes
    .filter((r) => r.nav)
    .filter((r) => {
      if (r.nav?.requiresAuth && !isAuthenticated) return false;
      if (r.nav?.roles && r.nav.roles.length > 0) {
        if (!user?.role || !r.nav.roles.includes(user.role)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.nav?.order || 0) - (b.nav?.order || 0));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle/50 bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              P
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">PlayMatch</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-muted text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.nav?.label}
                </Link>
              );
            })}
            <NavbarRecommendedSlot />
          </nav>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <NavbarNotificationSlot />

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Toggle theme"
          >
            <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {user?.name || user?.email || 'Player'}
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="Toggle theme"
          >
            <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
            aria-label="Open mobile menu"
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="right" title="Navigation">
        <div className="flex flex-col gap-4 mt-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className="text-base font-medium text-foreground py-2 border-b border-border-subtle/30"
            >
              {item.nav?.label}
            </Link>
          ))}

          <div className="pt-4 space-y-2">
            {isAuthenticated ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
              >
                Sign out
              </Button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full mb-2">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </Sheet>
    </header>
  );
}
