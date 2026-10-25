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

  // Guest Navbar: strictly logo and "Log in" only
  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-border-subtle/50 bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              P
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">PlayMatch</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Authenticated: Home, Recommendations, Leaderboard
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
          </nav>
        </div>

        {/* Desktop User Menu & Notification Slot */}
        <div className="hidden md:flex items-center gap-3">
          <NavbarNotificationSlot />

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
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider hidden sm:inline-flex ${
                    (user?.role || '').toLowerCase() === 'admin'
                      ? 'bg-danger/15 text-danger border border-danger/30'
                      : (user?.role || '').toLowerCase() === 'venue_owner'
                      ? 'bg-success/15 text-success border border-success/30'
                      : 'bg-primary/15 text-primary border border-primary/30'
                  }`}
                >
                  {(user?.role || '').toLowerCase() === 'admin'
                    ? 'Admin'
                    : (user?.role || '').toLowerCase() === 'venue_owner'
                    ? 'Host'
                    : 'Player'}
                </span>
                <Icon name="chevron-down" size={14} className="text-muted-foreground" />
              </button>
            }
            items={[
              {
                key: 'profile',
                label: 'Profile',
                icon: 'user',
                onSelect: () => navigate('/profile'),
              },
              ...(user?.role?.toLowerCase() === 'admin'
                ? [
                    {
                      key: 'admin' as const,
                      label: 'Admin Operations',
                      icon: 'shield-check' as const,
                      onSelect: () => navigate('/admin'),
                    },
                  ]
                : []),
              {
                key: 'theme',
                label: resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode',
                icon: resolvedTheme === 'dark' ? 'sun' : 'moon',
                onSelect: toggleTheme,
              },

              'separator',
              {
                key: 'logout',
                label: 'Log out',
                icon: 'logout',
                destructive: true,
                onSelect: handleLogout,
              },
            ]}
          />
        </div>

        {/* Mobile Header Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <NavbarNotificationSlot />
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

          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className="text-base font-medium text-foreground py-2 border-b border-border-subtle/30"
          >
            Profile
          </Link>

          <button
            type="button"
            onClick={() => {
              toggleTheme();
            }}
            className="flex items-center justify-between text-base font-medium text-foreground py-2 border-b border-border-subtle/30 text-left"
          >
            <span>Theme</span>
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={14} />
              {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>



          <div className="pt-4 space-y-3">
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
              Log out
            </Button>
          </div>
        </div>
      </Sheet>
    </header>
  );
}
