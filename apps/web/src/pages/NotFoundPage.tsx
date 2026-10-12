import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

export function NotFoundPage(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-primary mb-4">
        <Icon name="help-circle" size={32} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Page Not Found</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" leftIcon="arrow-right">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
