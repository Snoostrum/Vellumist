// ===== articles.js — 文章列表页：分类筛选 + 分页 =====

const PAGE_SIZE = 5;

// 从 URL 读取初始分类筛选（?category=分类ID）
const urlParams = new URLSearchParams(window.location.search);
let currentCategory = urlParams.get('category') ? parseInt(urlParams.get('category')) : null;

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadArticles(1);
});

// ===== 分类筛选 =====

function loadCategories() {
    fetchCategories().then((res) => {
        const container = document.getElementById('category-filter');
        if (!container) return;
        if (!res || res.code !== 200 || !res.data || res.data.length === 0) {
            container.style.display = 'none';
            return;
        }

        const allActive = currentCategory === null ? 'active' : '';
        let html = `<a class="cat-chip ${allActive}" href="articles.html">全部</a>`;
        html += res.data
            .map((c) => {
                const active = currentCategory === c.id ? 'active' : '';
                return `<a class="cat-chip ${active}" href="articles.html?category=${c.id}">${escapeHtml(c.name)} <span class="cat-count">${c.articleCount}</span></a>`;
            })
            .join('');
        container.innerHTML = html;
    });
}

// ===== 文章列表 + 分页 =====

function loadArticles(page) {
    fetchArticles(page, PAGE_SIZE, currentCategory).then((res) => {
        const container = document.getElementById('article-list');
        if (!container) return;

        if (res && res.code === 200 && res.data.length > 0) {
            container.innerHTML = res.data
                .map((a) => renderArticleCard(a))
                .join('');
            // stagger animation
            const cards = container.querySelectorAll('.card-stagger');
            cards.forEach((card, i) => {
                card.style.animationDelay = `${i * 0.08}s`;
            });
        } else {
            container.innerHTML =
                '<p style="color: var(--color-muted);">该分类下暂无文章</p>';
        }

        const total = res ? res.total || 0 : 0;
        renderPagination(total, page, PAGE_SIZE);
    });
}

function renderPagination(total, page, size) {
    const el = document.getElementById('article-pagination');
    if (!el) return;
    const pages = Math.max(1, Math.ceil(total / size));
    if (pages <= 1) {
        el.innerHTML = '';
        return;
    }

    const btn = (label, target, disabled, active) => `
    <button class="page-btn ${active ? 'active' : ''}" ${disabled ? 'disabled' : ''} data-page="${target}">${label}</button>`;

    let html = '<div class="pagination">';
    html += btn('← 上一页', page - 1, page <= 1, false);
    // 最多显示 7 个页码，当前页居中
    let start = Math.max(1, page - 3);
    let end = Math.min(pages, start + 6);
    start = Math.max(1, end - 6);
    for (let i = start; i <= end; i++) {
        html += btn(String(i), i, false, i === page);
    }
    html += btn('下一页 →', page + 1, page >= pages, false);
    html += `<span class="page-info">共 ${total} 篇</span>`;
    html += '</div>';
    el.innerHTML = html;

    el.querySelectorAll('.page-btn').forEach((b) => {
        if (b.disabled) return;
        b.addEventListener('click', () => {
            loadArticles(parseInt(b.dataset.page));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function renderArticleCard(article) {
    const date = new Date(article.createdAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const categoryTag = article.categoryName
        ? `<a class="card-category" href="articles.html?category=${article.categoryId}">${escapeHtml(article.categoryName)}</a>`
        : '';
    return `
        <a href="article.html?id=${article.id}"
           class="card article-card card-stagger"
           style="text-decoration: none;">
            <div class="article-date">${date}${categoryTag}</div>
            <div class="article-title">${escapeHtml(article.title)}</div>
            ${article.summary ? `<div class="article-summary">${escapeHtml(article.summary)}</div>` : ''}
        </a>
    `;
}
