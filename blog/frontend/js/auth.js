// ===== auth.js — 认证和会话管理（HttpOnly Cookie 模式） =====
// token 由后端写入 HttpOnly cookie，JS 无法读取，可防 XSS 窃取。
// 本地只保存非敏感的登录标记用于 UI 判断，真正的鉴权由服务端完成。

const AUTH_USER = 'blog_username';
const AUTH_TS = 'blog_login_ts';
const SESSION_MS = 24 * 60 * 60 * 1000; // 与 JWT 有效期一致

function isLoggedIn() {
    const user = localStorage.getItem(AUTH_USER);
    const ts = parseInt(localStorage.getItem(AUTH_TS) || '0', 10);
    if (!user || Date.now() - ts > SESSION_MS) {
        logout();
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
    if (res && res.code === 200) {
        localStorage.setItem(AUTH_USER, res.data.username);
        localStorage.setItem(AUTH_TS, String(Date.now()));
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem(AUTH_USER);
    localStorage.removeItem(AUTH_TS);
    // 通知服务端清除 HttpOnly cookie（尽力而为，失败不影响本地状态）
    fetch(API_BASE + '/auth/logout', { method: 'POST', credentials: 'include' })
        .catch(() => {});
}

function getAuthHeaders() {
    // token 存于 HttpOnly cookie，浏览器自动携带，无需手动附加
    return {};
}

async function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    // 不覆盖已有 Content-Type（如 FormData 上传时不需要）
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    try {
        const res = await fetch(url, { ...options, headers, credentials: 'include' });
        if (res.status === 401 || res.status === 403) {
            logout();
            // 由当前页面决定过期后的行为（管理后台：回到登录页）
            if (typeof window.onAuthExpired === 'function') {
                window.onAuthExpired();
            }
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
