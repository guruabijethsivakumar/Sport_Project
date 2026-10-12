import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export interface ComingSoonPageProps {
  title: string;
  description: string;
  backTo?: string;
  backLabel?: string;
}

export function ComingSoonPage({
  title,
  description,
  backTo = '/login',
  backLabel = 'Back to Sign in',
}: ComingSoonPageProps): React.ReactElement {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md text-center shadow-lg border-border">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Link to={backTo}>
            <Button variant="outline" className="w-full">
              {backLabel}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
