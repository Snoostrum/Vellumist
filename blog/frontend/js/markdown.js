// ===== markdown.js — Markdown 渲染（marked + XSS 防护 + 回退） =====
// 依赖：api.js 中的 escapeHtml（请确保本文件在 api.js 之后加载）
// marked 已本地化到 js/vendor/marked.min.js，不依赖国外 CDN

// 配置 marked：禁用原始 HTML（转义输出）、过滤危险链接协议
function configureMarked() {
    if (typeof marked === 'undefined') return;

    const isSafeUrl = (url) => !/^(javascript|data|vbscript):/i.test((url || '').trim());

    marked.use({
        breaks: true, // 单换行渲染为 <br>，与旧的 simpleMarkdown 行为一致
        gfm: true,    // 表格、删除线等 GFM 语法
        renderer: {
            // 文章中的原始 HTML 一律转义为文本，防止存储型 XSS
            html(token) {
                const raw = token && token.raw != null ? token.raw : String(token || '');
                return escapeHtml(raw);
            },
            // 链接：过滤 javascript:/data: 协议，外链新窗口打开
            link(token) {
                const href = token && token.href ? token.href : '';
                if (!isSafeUrl(href)) {
                    return escapeHtml(token && token.raw != null ? token.raw : '[' + token.text + '](' + href + ')');
                }
                const title = token && token.title ? ' title="' + escapeHtml(token.title) + '"' : '';
                const text = marked.parseInline
                    ? marked.parseInline(token.text || '')
                    : escapeHtml(token.text || '');
                return '<a href="' + escapeHtml(href) + '"' + title +
                       ' target="_blank" rel="noopener noreferrer">' + text + '</a>';
            },
            // 图片：过滤危险协议，懒加载
            image(token) {
                const src = token && token.href ? token.href : '';
                if (!isSafeUrl(src)) {
                    return escapeHtml(token && token.raw != null ? token.raw : '![' + token.text + '](' + src + ')');
                }
                return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(token.text || '') +
                       '" loading="lazy" />';
            },
        },
    });
}

// 渲染 Markdown 正文：优先 marked；marked 未加载时回退到 simpleMarkdown
function renderMarkdown(md) {
    if (!md) return '';
    if (typeof marked !== 'undefined') {
        try {
            return marked.parse(md);
        } catch (e) {
            console.error('marked parse error:', e);
        }
    }
    return simpleMarkdown(md);
}

// ===== 简单回退渲染（仅当 marked 未加载时使用，保留原行为） =====
function simpleMarkdown(md) {
    // 1. Escape HTML first to prevent XSS
    let html = escapeHtml(md);
    // 2. Convert markdown patterns to HTML tags
    html = html
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
    return '<p>' + html + '</p>';
}

// 页面加载即配置（marked 已在 head 同步加载，此时必然就绪）
configureMarked();
