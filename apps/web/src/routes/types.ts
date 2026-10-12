import React from 'react';
import type { RouteObject } from 'react-router-dom';

/**
 * Route definition with optional authentication and role gating metadata.
 */
export interface AppRouteDefinition {
  path: string;
  element: React.ReactElement;
  children?: AppRouteDefinition[];
  isProtected?: boolean;
  allowedRoles?: string[];
  owner?: 'Dev 1' | 'Dev 2' | 'Dev 3' | 'Core';
}

export type DomainRouteModule = AppRouteDefinition[];
