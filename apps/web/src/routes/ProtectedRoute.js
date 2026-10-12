import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
export function ProtectedRoute({ children, allowedRoles, redirectTo = '/login', }) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary", role: "status", children: _jsx("span", { className: "sr-only", children: "Loading..." }) }) }));
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: redirectTo, state: { from: location }, replace: true });
    }
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user?.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return _jsx(Navigate, { to: "/unauthorized", replace: true });
        }
    }
    return _jsx(_Fragment, { children: children });
}
