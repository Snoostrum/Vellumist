document.addEventListener('DOMContentLoaded', () => {
    renderGreeting();
    loadArticleDates();
    loadRandomArticle();
    loadArticles(1);
    loadMusicRecommendations();
    loadSiteStats();
    renderSocialLinks();
    setupSidebar();
});

function renderGreeting() {
    const el = document.getElementById('greeting');
    if (!el) return;

    const hour = new Date().getHours();
    let greeting;
    if (hour < 6) greeting = '夜深了';
    else if (hour < 12) greeting = '早上好';
    else if (hour < 18) greeting = '下午好';
    else greeting = '晚上好';

    el.innerHTML = `${greeting}<br>我是 <span class="name">lvy</span>，很高兴遇见你！`;
}

function loadArticleDates() {
    const now = new Date();
    fetchArticleDates(now.getFullYear(), now.getMonth() + 1).then(res => {
        if (res && res.code === 200) {
            renderCalendar(now.getFullYear(), now.getMonth() + 1, res.data);
        }
    });
}

function loadRandomArticle() {
    fetchRandomArticle().then(res => {
        const container = document.getElementById('random-article');
        if (!container) return;
        if (res && res.code === 200 && res.data) {
            container.innerHTML = renderArticleCard(res.data, true);
        } else {
            container.innerHTML = '<p style="color: var(--color-muted);">暂无文章</p>';
        }
    });
}

function loadArticles(page) {
    fetchArticles(page, 5).then(res => {
        const container = document.getElementById('article-list');
        if (!container) return;

        if (res && res.code === 200 && res.data.length > 0) {
            container.innerHTML = res.data.map(a => renderArticleCard(a, false)).join('');
            // stagger animation
            const cards = container.querySelectorAll('.card-stagger');
            cards.forEach((card, i) => {
                card.style.animationDelay = `${i * 0.08}s`;
            });
        } else {
            container.innerHTML = '<p style="color: var(--color-muted);">暂无文章</p>';
        }
    });
}

function loadMusicRecommendations() {
    fetchMusicRecommendations().then(res => {
        const container = document.getElementById('music-list');
        if (!container) return;

        if (res && res.code === 200 && res.data.length > 0) {
            container.innerHTML = res.data.map(m => `
                <a href="${escapeHtml(m.linkUrl)}" target="_blank" rel="noopener"
                   class="card music-card card-stagger" style="text-decoration: none;">
                    <img src="${escapeHtml(m.coverUrl)}" alt="${escapeHtml(m.songName)}"
                         class="music-cover" loading="lazy"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><rect fill=%22%23abbbf3%22 width=%2248%22 height=%2248%22/><text x=%2224%22 y=%2230%22 text-anchor=%22middle%22 fill=%22%23000%22 font-size=%2220%22>♪</text></svg>'">
                    <div class="music-info">
                        <div class="music-name">${escapeHtml(m.songName)}</div>
                        <div class="music-artist">${escapeHtml(m.artist)}</div>
                    </div>
                </a>
            `).join('');
            // stagger animation
            const cards = container.querySelectorAll('.card-stagger');
            cards.forEach((card, i) => {
                card.style.animationDelay = `${i * 0.08}s`;
            });
        } else {
            container.innerHTML = '<p style="color: var(--color-muted);">音乐推荐暂不可用，请确保 NeteaseCloudMusicApi 已启动</p>';
        }
    });
}

function loadSiteStats() {
    fetchSiteStats().then(res => {
        const container = document.getElementById('site-stats');
        if (!container) return;

        if (res && res.code === 200 && res.data) {
            container.innerHTML = `
                共 <span>${res.data.articleCount}</span> 篇文章 ·
                总计 <span>${res.data.totalWordCount.toLocaleString()}</span> 字
            `;
        }
    });
}

function renderSocialLinks() {
    const container = document.getElementById('social-links');
    if (!container) return;

    const links = [
        { name: 'GitHub', url: 'https://github.com/' },
        { name: 'Bilibili', url: 'https://bilibili.com/' },
    ];
    container.innerHTML = links.map(l =>
        `<a href="${l.url}" target="_blank" rel="noopener">${l.name}</a>`
    ).join('');
}

function renderArticleCard(article, isRandom) {
    const date = new Date(article.createdAt).toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const tagClass = isRandom ? '' : 'card-stagger';
    return `
        <a href="article.html?id=${article.id}"
           class="card article-card ${tagClass}"
           style="text-decoration: none;">
            <div class="article-date">${date}</div>
            <div class="article-title">${escapeHtml(article.title)}</div>
            ${article.summary ? `<div class="article-summary">${escapeHtml(article.summary)}</div>` : ''}
        </a>
    `;
}

function setupSidebar() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // 点击页面其他区域关闭侧边栏
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
}
