document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');

    if (!articleId) {
        document.getElementById('article-detail').innerHTML =
            '<p style="color: var(--color-muted);">未指定文章 ID</p>';
        return;
    }

    loadArticle(articleId);
});

function loadArticle(id) {
    fetchArticle(id).then(res => {
        const container = document.getElementById('article-detail');
        if (!container) return;

        if (res && res.code === 200 && res.data) {
            const article = res.data;
            const date = new Date(article.createdAt).toLocaleDateString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            document.title = `${article.title} — 不如睡觉`;

            container.innerHTML = `
                <h1 class="article-title">${escapeHtml(article.title)}</h1>
                <div class="article-meta">📅 ${date} · 👁 ${article.viewCount} 次阅读</div>
                <div class="article-content">${renderMarkdown(article.content)}</div>
            `;
        } else {
            container.innerHTML = '<p style="color: var(--color-muted);">文章不存在</p>';
        }
    });
}
