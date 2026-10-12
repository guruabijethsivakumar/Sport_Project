import { jsx as _jsx } from "react/jsx-runtime";
import { Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { dev1Routes } from './dev1.routes';
import { dev2Routes } from './dev2.routes';
import { dev3Routes } from './dev3.routes';
export const coreRoutes = [];
/**
 * All registered domain routes merged in defined order.
 */
export const allDomainRoutes = [
    ...coreRoutes,
    ...dev1Routes,
    ...dev2Routes,
    ...dev3Routes,
];
/**
 * Transforms an AppRouteDefinition into a standard React Router Route element.
 */
export function renderRoute(def) {
    const element = def.isProtected ? (_jsx(ProtectedRoute, { allowedRoles: def.allowedRoles, children: def.element })) : (def.element);
    return (_jsx(Route, { path: def.path, element: element, children: def.children?.map((child) => renderRoute(child)) }, def.path));
}
