import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import type { AppRouteDefinition } from './types';
import { dev1Routes } from './dev1.routes';
import { dev2Routes } from './dev2.routes';
import { dev3Routes } from './dev3.routes';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';

import { HomePage } from '../pages/home/HomePage';

export const coreRoutes: AppRouteDefinition[] = [
  {
    path: '/',
    element: <HomePage />,
    isProtected: false,
    owner: 'Core',
    nav: {
      label: 'Home',
      order: 10,
      requiresAuth: true,
    },
  },

  {
    path: '/unauthorized',
    element: <ForbiddenPage />,
    isProtected: false,
    owner: 'Core',
  },
  {
    path: '/404',
    element: <NotFoundPage />,
    isProtected: false,
    owner: 'Core',
  },
];

/**
 * All registered domain routes merged in defined order.
 */
export const allDomainRoutes: AppRouteDefinition[] = [
  ...coreRoutes,
  ...dev1Routes,
  ...dev2Routes,
  ...dev3Routes,
];

/**
 * Transforms an AppRouteDefinition into a standard React Router Route element.
 */
export function renderRoute(def: AppRouteDefinition): React.ReactElement {
  const element = def.isProtected ? (
    <ProtectedRoute allowedRoles={def.allowedRoles}>{def.element}</ProtectedRoute>
  ) : (
    def.element
  );

  return (
    <Route key={def.path} path={def.path} element={element}>
      {def.children?.map((child) => renderRoute(child))}
    </Route>
  );
}
