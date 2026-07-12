const API_BASE_URL = 'http://localhost:8080/api/v1';

async function apiRequest(path, options = {}) {
    const accessToken = localStorage.getItem('accessToken');

    const headers = {
        Accept: 'application/json',
        ...options.headers
    };

    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            data?.detail ||
            data?.title ||
            `Ошибка HTTP ${response.status}`
        );

        error.status = response.status;
        error.code = data?.code;
        error.violations = data?.violations ?? [];

        throw error;
    }

    return data;
}

function createIdempotencyKey() {
    return crypto.randomUUID();
}