import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

export function ForbiddenPage(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
        <Icon name="x-circle" size={32} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Access Forbidden</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        You do not possess the required permissions or role to view this area.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="outline">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
