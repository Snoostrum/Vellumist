document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');

    if (!articleId) {
        document.getElementById('article-detail').innerHTML =
            '<p style="color: var(--color-muted);">未指定文章 ID</p>';
        return;
    }

    loadArticle(articleId);
    loadComments(articleId);
    initCommentForm(articleId);
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
            document.getElementById('comment-section')?.remove();
        }
    });
}

// ===== 评论区 =====

function loadComments(articleId) {
    fetchComments(articleId).then(res => {
        const list = document.getElementById('comment-list');
        const count = document.getElementById('comment-count');
        if (!list || !count) return;

        if (res && res.code === 200) {
            const comments = res.data || [];
            count.textContent = comments.length;
            if (comments.length === 0) {
                list.innerHTML = '<p class="comment-empty">还没有评论，来抢沙发～</p>';
            } else {
                list.innerHTML = comments.map(c => `
                    <div class="comment-item">
                        <div class="comment-head">
                            <span class="comment-author">${escapeHtml(c.authorName)}</span>
                            <span class="comment-time">${formatCommentTime(c.createdAt)}</span>
                        </div>
                        <div class="comment-body">${escapeHtml(c.content)}</div>
                    </div>
                `).join('');
            }
        }
    });
}

function initCommentForm(articleId) {
    const form = document.getElementById('comment-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const authorEl = document.getElementById('comment-author');
        const contentEl = document.getElementById('comment-content');
        const statusEl = document.getElementById('comment-status');
        const submitBtn = form.querySelector('button[type="submit"]');

        const content = contentEl.value.trim();
        if (!content) {
            statusEl.textContent = '评论内容不能为空';
            statusEl.className = 'comment-status err';
            return;
        }

        submitBtn.disabled = true;
        statusEl.textContent = '发表中…';
        statusEl.className = 'comment-status';

        const res = await postComment(articleId, authorEl.value.trim(), content);

        if (res && res.code === 200) {
            contentEl.value = '';
            statusEl.textContent = '评论成功 ✅';
            statusEl.className = 'comment-status ok';
            loadComments(articleId);
        } else {
            statusEl.textContent = res && res.message ? res.message : '评论失败，请稍后再试';
            statusEl.className = 'comment-status err';
        }
        submitBtn.disabled = false;
    });
}

function formatCommentTime(iso) {
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return diffMin + ' 分钟前';
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return diffHour + ' 小时前';
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return diffDay + ' 天前';
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}
