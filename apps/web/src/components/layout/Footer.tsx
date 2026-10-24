import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function Footer(): React.ReactElement {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="w-full border-t border-border-subtle/50 bg-card/40 py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
            P
          </div>
          <span className="font-semibold text-foreground">PlayMatch</span>
          <span className="text-xs text-muted-foreground">Electric Amber & Ink</span>
        </div>

        {isAuthenticated && (
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm">
            <Link to="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <Link to="/leaderboard" className="transition-colors hover:text-foreground">
              Leaderboard
            </Link>
            <Link to="/recommendations" className="transition-colors hover:text-foreground">
              Recommendations
            </Link>
            <Link to="/kit" className="font-medium text-primary transition-colors hover:underline">
              UI Kit Showcase
            </Link>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PlayMatch. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
