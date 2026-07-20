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

            document.title = `${article.title} — lvy-neko`;

            container.innerHTML = `
                <h1 class="article-title">${escapeHtml(article.title)}</h1>
                <div class="article-meta">📅 ${date} · 👁 ${article.viewCount} 次阅读</div>
                <div class="article-content">${simpleMarkdown(article.content)}</div>
            `;
        } else {
            container.innerHTML = '<p style="color: var(--color-muted);">文章不存在</p>';
        }
    });
}

function simpleMarkdown(md) {
    if (!md) return '';
    return md
        // 代码块 (```...```)
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // 行内代码 (`...`)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // 标题 (## ...)
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        // 段落（双换行分隔）
        .replace(/\n\n/g, '</p><p>')
        // 单换行 → <br>
        .replace(/\n/g, '<br>');
}
