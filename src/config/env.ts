const trimTrailingSlash = (value = '') => String(value).trim().replace(/\/+$/, '');

export const AUTH_BASE_URL = trimTrailingSlash(
    import.meta.env.VITE_AUTH_API_BASE || 'https://api.rilakbest.com',
);

export const STORAGE_BASE_URL = trimTrailingSlash(
    import.meta.env.VITE_STORAGE_API_BASE || 'https://api.rilakbest.com',
);
