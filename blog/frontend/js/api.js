const API_BASE = '/api';

async function fetchJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('API error:', url, err);
        return null;
    }
}

function fetchArticles(page = 1, size = 5) {
    return fetchJSON(`${API_BASE}/articles?page=${page}&size=${size}`);
}

function fetchArticle(id) {
    return fetchJSON(`${API_BASE}/articles/${id}`);
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
