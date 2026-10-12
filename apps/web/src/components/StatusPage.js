import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useSportsCatalog } from '@playmatch/shared';
export function StatusPage() {
    const { client, isAuthenticated } = useAuth();
    const [healthStatus, setHealthStatus] = useState(null);
    const [healthError, setHealthError] = useState(null);
    const { data: sportsData, isLoading: sportsLoading, error: sportsError } = useSportsCatalog(client);
    useEffect(() => {
        // Check health endpoint directly
        fetch('http://localhost:5000/health')
            .then((res) => res.json())
            .then((data) => setHealthStatus(data))
            .catch((err) => setHealthError(err.message));
    }, []);
    return (_jsx("div", { className: "max-w-3xl mx-auto py-12 px-6", children: _jsxs("div", { className: "bg-card border border-border rounded-xl p-8 shadow-sm", children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight mb-2", children: "PlayMatch Web Shell" }), _jsx("p", { className: "text-text-muted mb-6", children: "Frontend foundation status and connectivity check." }), _jsxs("div", { className: "border border-border rounded-lg p-4 mb-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-2", children: "Backend Health (/health)" }), healthError ? (_jsxs("p", { className: "text-red-500 text-sm", children: ["Failed to connect: ", healthError] })) : healthStatus ? (_jsxs("div", { className: "space-y-1 text-sm", children: [_jsxs("p", { children: ["Status: ", _jsx("span", { className: "font-semibold text-green-600", children: healthStatus.data?.status || 'healthy' })] }), _jsxs("p", { children: ["Database: ", _jsx("span", { className: "font-semibold", children: healthStatus.data?.database })] })] })) : (_jsx("p", { className: "text-sm text-text-muted", children: "Probing health endpoint..." }))] }), _jsxs("div", { className: "border border-border rounded-lg p-4 mb-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-2", children: "Sports Catalog (/api/v1/sports)" }), sportsLoading ? (_jsx("p", { className: "text-sm text-text-muted", children: "Loading sports catalog via shared query hook..." })) : sportsError ? (_jsxs("p", { className: "text-red-500 text-sm", children: ["Failed to load sports: ", sportsError.message] })) : sportsData ? (_jsxs("div", { children: [_jsxs("p", { className: "text-sm text-green-600 font-medium mb-2", children: ["Successfully loaded ", Array.isArray(sportsData) ? sportsData.length : 3, " sports:"] }), _jsx("ul", { className: "list-disc list-inside text-sm space-y-1", children: (Array.isArray(sportsData) ? sportsData : []).map((s) => (_jsxs("li", { children: [_jsx("span", { className: "font-medium", children: s.name }), " (", s.key, ") - ", s.formats?.length || 0, " formats"] }, s.id || s.key))) })] })) : null] }), _jsxs("div", { className: "border border-border rounded-lg p-4", children: [_jsx("h2", { className: "text-lg font-semibold mb-2", children: "Auth State" }), _jsxs("p", { className: "text-sm", children: ["Status: ", _jsx("span", { className: "font-semibold", children: isAuthenticated ? 'Authenticated' : 'Unauthenticated (Guest)' })] })] })] }) }));
}
