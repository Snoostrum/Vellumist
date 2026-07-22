const API_BASE = 'http://localhost:8081/api';

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

function fetchPlaylistTracks(playlistId) {
    return fetchJSON(`${API_BASE}/music/playlist/${playlistId}/tracks`);
}

function fetchSongUrl(songId) {
    return fetchJSON(`${API_BASE}/music/song/${songId}/url`);
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

