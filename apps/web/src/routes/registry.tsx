import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import type { AppRouteDefinition } from './types';
import { dev1Routes } from './dev1.routes';
import { dev2Routes } from './dev2.routes';
import { dev3Routes } from './dev3.routes';
import { KitShowcasePage } from '../pages/KitShowcasePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';

export const coreRoutes: AppRouteDefinition[] = [
  {
    path: '/kit',
    element: <KitShowcasePage />,
    owner: 'Core',
  },
  {
    path: '/unauthorized',
    element: <ForbiddenPage />,
    owner: 'Core',
  },
  {
    path: '/404',
    element: <NotFoundPage />,
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
