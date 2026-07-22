// ===== auth.js — 认证和 token 管理 =====

const AUTH_KEY = 'blog_token';
const AUTH_USER = 'blog_username';

function isLoggedIn() {
    const token = localStorage.getItem(AUTH_KEY);
    if (!token) return false;
    // 检查 JWT 是否过期（解析 payload 中的 exp）
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            logout();
            return false;
        }
    } catch (e) {
        return false;
    }
    return true;
}

async function login(username, password) {
    const res = await fetchJSON(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (res && res.code === 200 && res.data) {
        localStorage.setItem(AUTH_KEY, res.data.token);
        localStorage.setItem(AUTH_USER, res.data.username);
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_USER);
}

function getAuthHeaders() {
    const token = localStorage.getItem(AUTH_KEY);
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

async function authFetch(url, options = {}) {
    const headers = {
        ...(options.headers || {}),
        ...getAuthHeaders(),
    };
    // 不覆盖已有 Content-Type（如 FormData 上传时不需要）
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    try {
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401 || res.status === 403) {
            logout();
            showLoginOverlay();
            return null;
        }
        if (!res.ok) {
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return null;
            }
        }
        return await res.json();
    } catch (err) {
        console.error('Auth fetch error:', url, err);
        return null;
    }
}
