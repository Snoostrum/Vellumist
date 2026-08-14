// ===== archive.js — 归档页：按分类浏览全部文章 =====

document.addEventListener('DOMContentLoaded', () => {
    loadArchive();
});

async function loadArchive() {
    const container = document.getElementById('archive-list');
    if (!container) return;

    const catRes = await fetchCategories();
    if (!catRes || catRes.code !== 200) {
        container.innerHTML = '<p style="color: var(--color-muted);">加载失败，请稍后刷新</p>';
        return;
    }
    const categories = catRes.data || [];

    if (categories.length === 0) {
        container.innerHTML = '<p style="color: var(--color-muted);">暂无分类</p>';
        return;
    }

    let html = '';
    for (const c of categories) {
        html += `<section class="archive-cat fade-section">
            <h2 class="archive-cat-title">
                ${escapeHtml(c.name)}
                <span class="archive-cat-count">${c.articleCount} 篇</span>
            </h2>
            <div class="archive-list">`;

        const artRes = await fetchArticles(1, 50, c.id);
        if (artRes && artRes.code === 200 && artRes.data.length > 0) {
            html += artRes.data.map(a => `
                <a class="archive-item" href="article.html?id=${a.id}">
                    <span class="archive-item-date">${formatArchiveDate(a.createdAt)}</span>
                    <span class="archive-item-title">${escapeHtml(a.title)}</span>
                </a>
            `).join('');
        } else {
            html += '<p class="archive-empty">暂无文章</p>';
        }
        html += '</div></section>';
    }

    container.innerHTML = html;
}

function formatArchiveDate(iso) {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
