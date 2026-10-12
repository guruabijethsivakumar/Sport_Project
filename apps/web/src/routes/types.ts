import React from 'react';

/**
 * Route definition with optional authentication and role gating metadata.
 */
export interface NavItemConfig {
  label: string;
  order?: number;
  roles?: string[];
  requiresAuth?: boolean;
}

export interface AppRouteDefinition {
  path: string;
  element: React.ReactElement;
  children?: AppRouteDefinition[];
  isProtected: boolean;
  allowedRoles?: string[];
  owner?: 'Dev 1' | 'Dev 2' | 'Dev 3' | 'Core';
  nav?: NavItemConfig;
}

export type DomainRouteModule = AppRouteDefinition[];
