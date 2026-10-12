import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-bg text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
