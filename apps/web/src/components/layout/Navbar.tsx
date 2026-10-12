import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DropdownMenu } from '../ui/DropdownMenu';
import { Avatar } from '../ui/Avatar';
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
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

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

  const displayName = user?.name || user?.email || 'Player';

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
            <DropdownMenu
              align="end"
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg p-1.5 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  aria-label="User menu"
                >
                  <Avatar fallbackText={displayName} size="sm" />
                  <span className="text-sm font-medium hidden lg:inline max-w-28 truncate">
                    {displayName}
                  </span>
                  <Icon name="chevron-down" size={14} className="text-muted-foreground" />
                </button>
              }
              items={[
                {
                  key: 'profile-name',
                  label: displayName,
                  disabled: true,
                  onSelect: () => {},
                },
                'separator',
                {
                  key: 'onboarding',
                  label: 'Onboarding / Profile',
                  icon: 'user',
                  onSelect: () => navigate('/onboarding'),
                },
                {
                  key: 'kit',
                  label: 'UI Kit Showcase',
                  icon: 'sparkles',
                  onSelect: () => navigate('/kit'),
                },
                'separator',
                {
                  key: 'logout',
                  label: 'Sign out',
                  icon: 'logout',
                  destructive: true,
                  onSelect: handleLogout,
                },
              ]}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
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

          {isAuthenticated && (
            <Link
              to="/onboarding"
              onClick={() => setMobileOpen(false)}
              className="text-base font-medium text-foreground py-2 border-b border-border-subtle/30"
            >
              Onboarding / Profile
            </Link>
          )}

          <Link
            to="/kit"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-muted-foreground py-2 border-b border-border-subtle/30"
          >
            UI Kit Showcase
          </Link>

          <div className="pt-4 space-y-2">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-1 py-2">
                  <Avatar fallbackText={displayName} size="sm" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                >
                  <Icon name="logout" size={16} className="mr-2" />
                  Sign out
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full mb-2">
                    Log in
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
