export const webClientConfig = {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
    timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000,
    pollingIntervalMs: Number(import.meta.env.VITE_QUERY_POLLING_INTERVAL_MS) || 10000,
    features: {
        recommendationsMode: import.meta.env.VITE_FEATURE_RECOMMENDATIONS_MODE || 'mock',
        teamsMode: import.meta.env.VITE_FEATURE_TEAMS_MODE || 'mock',
        resultsMode: import.meta.env.VITE_FEATURE_RESULTS_MODE || 'mock',
        notificationsMode: import.meta.env.VITE_FEATURE_NOTIFICATIONS_MODE || 'mock',
        reliabilityMode: import.meta.env.VITE_FEATURE_RELIABILITY_MODE || 'mock',
    },
};
