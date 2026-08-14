// API 地址：部署时由 nginx 同源反代，用相对路径；
// 本地开发时前端静态服务跑在 8081、后端在 8080，自动指向后端。
const API_BASE = (() => {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (isLocal && window.location.port === '8081') {
        return 'http://localhost:8080/api';
    }
    return '/api';
})();

async function fetchJSON(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('API error:', url, err);
        return null;
    }
}

function fetchArticles(page = 1, size = 5, categoryId = null) {
    const cat = categoryId ? `&categoryId=${categoryId}` : '';
    return fetchJSON(`${API_BASE}/articles?page=${page}&size=${size}${cat}`);
}

function fetchArticle(id) {
    return fetchJSON(`${API_BASE}/articles/${id}`);
}

function fetchComments(articleId) {
    return fetchJSON(`${API_BASE}/articles/${articleId}/comments`);
}

function postComment(articleId, authorName, content) {
    return fetchJSON(`${API_BASE}/articles/${articleId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, content }),
    });
}

function fetchCategories() {
    return fetchJSON(`${API_BASE}/categories`);
}

function fetchRandomArticle() {
    return fetchJSON(`${API_BASE}/articles/random`);
}

function fetchArticleDates(year, month) {
    return fetchJSON(`${API_BASE}/articles/dates?year=${year}&month=${month}`);
}

function fetchMusicRecommendations() {
    return fetchJSON(`${API_BASE}/music/recommendations`);
}

function fetchSiteStats() {
    return fetchJSON(`${API_BASE}/site-stats`);
}

function fetchServerTime() {
    return fetchJSON(`${API_BASE}/time`);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

