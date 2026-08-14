// ===== admin.js — 后台管理抽屉面板 =====

document.addEventListener('DOMContentLoaded', () => {
    injectDrawer();
});

// ===== DOM 注入 =====

function injectDrawer() {
    const html = `
        <button class="admin-trigger" id="admin-trigger" title="管理">⚙️</button>
        <div class="admin-overlay" id="admin-overlay"></div>
        <div class="admin-drawer" id="admin-drawer">
            <div class="drawer-header">
                <h3>管理面板</h3>
                <button class="drawer-close" id="drawer-close">✕</button>
            </div>
            <div class="drawer-tabs" id="drawer-tabs">
                <button class="drawer-tab active" data-tab="articles">📄 文章</button>
                <button class="drawer-tab" data-tab="categories">📁 分类</button>
                <button class="drawer-tab" data-tab="tags">🏷️ 标签</button>
                <button class="drawer-tab" data-tab="music">🎵 音乐</button>
                <button class="drawer-tab" data-tab="comments">💬 评论</button>
            </div>
            <div class="drawer-body" id="drawer-body"></div>
        </div>
        <div class="admin-toast" id="admin-toast"></div>
    `;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    // 把触发按钮插入 topbar
    const topbar = document.querySelector('.topbar');
    if (topbar) {
        topbar.appendChild(wrapper.querySelector('#admin-trigger'));
    }
    // 其余元素插入 body
    document.body.appendChild(wrapper.querySelector('#admin-overlay'));
    document.body.appendChild(wrapper.querySelector('#admin-drawer'));
    document.body.appendChild(wrapper.querySelector('#admin-toast'));

    bindEvents();
}

function bindEvents() {
    const trigger = document.getElementById('admin-trigger');
    const close = document.getElementById('drawer-close');
    const overlay = document.getElementById('admin-overlay');

    trigger.addEventListener('click', toggleDrawer);
    close.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    document.getElementById('drawer-tabs').addEventListener('click', (e) => {
        if (e.target.classList.contains('drawer-tab')) {
            switchTab(e.target.dataset.tab);
        }
    });
}

function toggleDrawer() {
    if (!isLoggedIn()) {
        showLoginOverlay();
        return;
    }
    const drawer = document.getElementById('admin-drawer');
    const overlay = document.getElementById('admin-overlay');
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
        closeDrawer();
    } else {
        openDrawer();
    }
}

function openDrawer() {
    document.getElementById('admin-drawer').classList.add('open');
    document.getElementById('admin-overlay').classList.add('open');
    if (isLoggedIn()) {
        switchTab('articles');
    }
}

function closeDrawer() {
    document.getElementById('admin-drawer').classList.remove('open');
    document.getElementById('admin-overlay').classList.remove('open');
}

// ===== 登录表单 =====

function showLoginOverlay() {
    openDrawer();
    const body = document.getElementById('drawer-body');
    body.innerHTML = `
        <form class="login-form" id="login-form">
            <h3 style="margin:0">🔐 管理员登录</h3>
            <input type="text" id="login-username" placeholder="用户名" autocomplete="username" />
            <input type="password" id="login-password" placeholder="密码" autocomplete="current-password" />
            <p class="login-error" id="login-error" style="display:none"></p>
            <button type="submit" class="btn">登录</button>
        </form>
    `;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const success = await login(username, password);
        if (success) {
            toast('登录成功');
            switchTab('articles');
        } else {
            errorEl.textContent = '用户名或密码错误';
            errorEl.style.display = 'block';
        }
    });
}

// ===== Tab 切换 =====

function switchTab(tab) {
    document.querySelectorAll('.drawer-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    switch (tab) {
        case 'articles':    renderArticlesTab();    break;
        case 'categories':  renderCategoriesTab();  break;
        case 'tags':        renderTagsTab();        break;
        case 'music':       renderMusicTab();       break;
        case 'comments':    renderCommentsTab();    break;
    }
}

// ===== Toast =====

let toastTimer = null;
function toast(msg, isError) {
    const el = document.getElementById('admin-toast');
    el.textContent = msg;
    el.className = 'admin-toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.classList.remove('show');
    }, 2500);
}

// ===== 文章管理 =====

async function renderArticlesTab() {
    const body = document.getElementById('drawer-body');
    body.innerHTML = '<p style="color:var(--color-muted)">加载中…</p>';

    const res = await authFetch(API_BASE + '/admin/articles');
    if (!res || res.code !== 200) {
        body.innerHTML = '<p style="color:#e55">加载失败</p>';
        return;
    }

    const articles = res.data;
    let html = `<button class="btn-primary" id="btn-new-article" style="margin-bottom:var(--space-md);width:100%">+ 新建文章</button>`;
    html += articles.map(a => `
        <div class="admin-list-item">
            <span class="item-title">${escapeHtml(a.title)}</span>
            <span class="item-status ${a.status === 'PUBLISHED' ? 'published' : 'draft'}">${a.status === 'PUBLISHED' ? '已发布' : '草稿'}</span>
            <button class="edit-btn" data-id="${a.id}">✎</button>
            <button class="del-btn" data-id="${a.id}">✕</button>
        </div>
    `).join('') || '<p style="color:var(--color-muted)">暂无文章</p>';

    body.innerHTML = html;

    document.getElementById('btn-new-article').addEventListener('click', () => renderArticleEditor(null));
    body.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const article = articles.find(a => a.id === parseInt(btn.dataset.id));
            renderArticleEditor(article);
        });
    });
    body.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除这篇文章？')) return;
            const res = await authFetch(API_BASE + '/admin/articles/' + btn.dataset.id, { method: 'DELETE' });
            if (res && res.code === 200) {
                toast('已删除');
                renderArticlesTab();
            } else {
                toast('删除失败', true);
            }
        });
    });
}

// ===== 文章编辑器 =====

let currentEditorArticle = null;

async function renderArticleEditor(article) {
    currentEditorArticle = article || { title: '', summary: '', content: '', status: 'DRAFT', categoryId: null };
    const body = document.getElementById('drawer-body');

    // 加载分类列表
    const catRes = await authFetch(API_BASE + '/admin/categories');
    const categories = (catRes && catRes.code === 200) ? catRes.data : [];

    const catOptions = categories.map(c =>
        `<option value="${c.id}" ${currentEditorArticle.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');

    body.innerHTML = `
        <button class="btn-secondary" id="btn-back-articles" style="margin-bottom:var(--space-sm)">← 返回列表</button>
        <div class="article-form">
            <input type="text" id="art-title" placeholder="文章标题" />
            <input type="text" id="art-summary" placeholder="文章摘要（可选）" />
            <select id="art-category" style="font-size:0.9rem;padding:var(--space-sm);background:rgba(255,255,255,0.05);border:1px solid var(--color-border);color:var(--color-text);border-radius:var(--radius-sm)">
                <option value="">无分类</option>
                ${catOptions}
            </select>
            <select id="art-status" style="font-size:0.9rem;padding:var(--space-sm);background:rgba(255,255,255,0.05);border:1px solid var(--color-border);color:var(--color-text);border-radius:var(--radius-sm)">
                <option value="DRAFT" ${currentEditorArticle.status === 'DRAFT' ? 'selected' : ''}>草稿</option>
                <option value="PUBLISHED" ${currentEditorArticle.status === 'PUBLISHED' ? 'selected' : ''}>发布</option>
            </select>
            <div class="md-editor">
                <div class="md-editor-toolbar">
                    <button id="btn-edit-mode" class="active">编辑</button>
                    <button id="btn-preview-mode">预览</button>
                    <button id="btn-upload-img">📷 插入图片</button>
                    <input type="file" id="img-file-input" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none" />
                </div>
                <div class="md-editor-panes">
                    <textarea id="art-content" placeholder="Markdown 内容…"></textarea>
                    <div class="md-preview" id="md-preview" style="display:none"></div>
                </div>
            </div>
            <div style="display:flex;gap:var(--space-sm)">
                <button class="btn-primary" id="btn-save-article">保存</button>
                <button class="btn-secondary" id="btn-cancel-edit">取消</button>
            </div>
        </div>
    `;

    // 用 DOM 属性赋值（而非 HTML 转义插值），避免 < > & 等内容被二次转义污染
    document.getElementById('art-title').value = currentEditorArticle.title || '';
    document.getElementById('art-summary').value = currentEditorArticle.summary || '';
    document.getElementById('art-content').value = currentEditorArticle.content || '';

    document.getElementById('btn-back-articles').addEventListener('click', () => renderArticlesTab());

    // 编辑/预览切换
    const textarea = document.getElementById('art-content');
    const preview = document.getElementById('md-preview');
    const btnEdit = document.getElementById('btn-edit-mode');
    const btnPreview = document.getElementById('btn-preview-mode');

    btnEdit.addEventListener('click', () => {
        textarea.style.display = ''; preview.style.display = 'none';
        btnEdit.classList.add('active'); btnPreview.classList.remove('active');
    });
    btnPreview.addEventListener('click', () => {
        textarea.style.display = 'none'; preview.style.display = '';
        preview.innerHTML = marked.parse(textarea.value);
        btnPreview.classList.add('active'); btnEdit.classList.remove('active');
    });
    // 实时预览（延迟更新）
    let previewTimer;
    textarea.addEventListener('input', () => {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(() => {
            if (preview.style.display !== 'none') {
                preview.innerHTML = marked.parse(textarea.value);
            }
        }, 300);
    });

    // 图片上传
    document.getElementById('btn-upload-img').addEventListener('click', () => {
        document.getElementById('img-file-input').click();
    });
    document.getElementById('img-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        toast('上传中…');
        const res = await authFetch(API_BASE + '/admin/upload', { method: 'POST', body: formData });
        if (res && res.code === 200 && res.data) {
            const imgMd = `![${file.name}](${res.data.url})`;
            const ta = document.getElementById('art-content');
            ta.value = ta.value + '\n' + imgMd + '\n';
            toast('图片已插入');
        } else {
            toast(res ? res.message : '上传失败', true);
        }
        e.target.value = '';
    });

    // 保存
    document.getElementById('btn-save-article').addEventListener('click', async () => {
        const data = {
            title: document.getElementById('art-title').value,
            summary: document.getElementById('art-summary').value,
            content: document.getElementById('art-content').value,
            status: document.getElementById('art-status').value,
            categoryId: document.getElementById('art-category').value ? parseInt(document.getElementById('art-category').value) : null,
        };

        let res;
        if (currentEditorArticle.id) {
            data.id = currentEditorArticle.id;
            res = await authFetch(API_BASE + '/admin/articles/' + currentEditorArticle.id, {
                method: 'PUT', body: JSON.stringify(data),
            });
        } else {
            res = await authFetch(API_BASE + '/admin/articles', {
                method: 'POST', body: JSON.stringify(data),
            });
        }

        if (res && res.code === 200) {
            toast(currentEditorArticle.id ? '已更新' : '已创建');
            renderArticlesTab();
        } else {
            toast('保存失败', true);
        }
    });

    document.getElementById('btn-cancel-edit').addEventListener('click', () => renderArticlesTab());
}

// ===== 分类管理 =====

async function renderCategoriesTab() {
    const body = document.getElementById('drawer-body');
    body.innerHTML = '<p style="color:var(--color-muted)">加载中…</p>';

    const res = await authFetch(API_BASE + '/admin/categories');
    if (!res || res.code !== 200) {
        body.innerHTML = '<p style="color:#e55">加载失败</p>';
        return;
    }

    let html = res.data.map(c => `
        <div class="admin-list-item">
            <span class="item-title">${escapeHtml(c.name)} <span style="color:var(--color-muted);font-size:0.8rem">/${c.slug}</span></span>
            <button class="edit-cat-btn" data-id="${c.id}" data-name="${escapeHtml(c.name)}" data-slug="${c.slug}">✎</button>
            <button class="del-cat-btn" data-id="${c.id}">✕</button>
        </div>
    `).join('');

    html += `
        <div class="inline-add">
            <input type="text" id="new-cat-name" placeholder="分类名称" />
            <input type="text" id="new-cat-slug" placeholder="slug" style="max-width:120px" />
            <button id="btn-add-cat">添加</button>
        </div>
    `;

    body.innerHTML = html;

    document.getElementById('btn-add-cat').addEventListener('click', async () => {
        const name = document.getElementById('new-cat-name').value.trim();
        const slug = document.getElementById('new-cat-slug').value.trim();
        if (!name) return;
        const res = await authFetch(API_BASE + '/admin/categories', {
            method: 'POST', body: JSON.stringify({ name, slug }),
        });
        if (res && res.code === 200) { toast('已添加'); renderCategoriesTab(); }
        else { toast(res ? res.message : '添加失败', true); }
    });

    body.querySelectorAll('.del-cat-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除？')) return;
            const res = await authFetch(API_BASE + '/admin/categories/' + btn.dataset.id, { method: 'DELETE' });
            if (res && res.code === 200) { toast('已删除'); renderCategoriesTab(); }
            else { toast(res ? res.message : '删除失败', true); }
        });
    });

    body.querySelectorAll('.edit-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            const slug = btn.dataset.slug;
            const newName = prompt('新名称', name);
            if (!newName) return;
            const newSlug = prompt('新 slug', slug);
            if (!newSlug) return;
            authFetch(API_BASE + '/admin/categories/' + id, {
                method: 'PUT', body: JSON.stringify({ name: newName, slug: newSlug }),
            }).then(res => {
                if (res && res.code === 200) { toast('已更新'); renderCategoriesTab(); }
                else { toast('更新失败', true); }
            });
        });
    });
}

// ===== 标签管理 =====

async function renderTagsTab() {
    const body = document.getElementById('drawer-body');
    body.innerHTML = '<p style="color:var(--color-muted)">加载中…</p>';

    const res = await authFetch(API_BASE + '/admin/tags');
    if (!res || res.code !== 200) {
        body.innerHTML = '<p style="color:#e55">加载失败</p>';
        return;
    }

    let html = res.data.map(t => `
        <div class="admin-list-item">
            <span class="item-title">${escapeHtml(t.name)} <span style="color:var(--color-muted);font-size:0.8rem">/${t.slug}</span></span>
            <button class="del-tag-btn" data-id="${t.id}">✕</button>
        </div>
    `).join('');

    html += `
        <div class="inline-add">
            <input type="text" id="new-tag-name" placeholder="标签名称" />
            <input type="text" id="new-tag-slug" placeholder="slug" style="max-width:120px" />
            <button id="btn-add-tag">添加</button>
        </div>
    `;

    body.innerHTML = html;

    document.getElementById('btn-add-tag').addEventListener('click', async () => {
        const name = document.getElementById('new-tag-name').value.trim();
        const slug = document.getElementById('new-tag-slug').value.trim();
        if (!name) return;
        const res = await authFetch(API_BASE + '/admin/tags', {
            method: 'POST', body: JSON.stringify({ name, slug }),
        });
        if (res && res.code === 200) { toast('已添加'); renderTagsTab(); }
        else { toast(res ? res.message : '添加失败', true); }
    });

    body.querySelectorAll('.del-tag-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除？')) return;
            const res = await authFetch(API_BASE + '/admin/tags/' + btn.dataset.id, { method: 'DELETE' });
            if (res && res.code === 200) { toast('已删除'); renderTagsTab(); }
            else { toast(res ? res.message : '删除失败', true); }
        });
    });
}

// ===== 评论管理 =====

async function renderCommentsTab() {
    const body = document.getElementById('drawer-body');
    body.innerHTML = '<p style="color:var(--color-muted)">加载中…</p>';

    const res = await authFetch(API_BASE + '/admin/comments');
    if (!res || res.code !== 200) {
        body.innerHTML = '<p style="color:#e55">加载失败</p>';
        return;
    }

    // 按 articleId 分组
    const grouped = {};
    res.data.forEach(c => {
        const key = c.articleId || 'unknown';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
    });

    let html = '';
    for (const [articleId, comments] of Object.entries(grouped)) {
        html += `<div style="margin-bottom:var(--space-md)">`;
        html += `<div style="color:var(--color-muted);font-size:0.8rem;margin-bottom:var(--space-xs)">文章 #${articleId}</div>`;
        comments.forEach(c => {
            const date = new Date(c.createdAt).toLocaleDateString('zh-CN');
            html += `
                <div class="admin-list-item">
                    <div>
                        <strong>${escapeHtml(c.authorName)}</strong>
                        <span style="color:var(--color-muted);font-size:0.75rem;margin-left:8px">${date}</span>
                        <div style="color:var(--color-muted);font-size:0.85rem;margin-top:2px">${escapeHtml(c.content)}</div>
                    </div>
                    <button class="del-comment-btn" data-id="${c.id}">✕</button>
                </div>
            `;
        });
        html += `</div>`;
    }

    if (!res.data.length) {
        html = '<p style="color:var(--color-muted)">暂无评论</p>';
    }

    body.innerHTML = html;

    body.querySelectorAll('.del-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除这条评论？')) return;
            const res = await authFetch(API_BASE + '/admin/comments/' + btn.dataset.id, { method: 'DELETE' });
            if (res && res.code === 200) { toast('已删除'); renderCommentsTab(); }
            else { toast('删除失败', true); }
        });
    });
}

// ===== 音乐管理 =====

async function renderMusicTab() {
    const body = document.getElementById('drawer-body');
    body.innerHTML = '<p style="color:var(--color-muted)">加载中…</p>';

    const res = await authFetch(API_BASE + '/admin/music');
    if (!res || res.code !== 200) {
        body.innerHTML = '<p style="color:#e55">加载失败</p>';
        return;
    }

    let html = '<h4 style="margin-bottom:var(--space-md)">上传新音乐</h4>';
    html += `
        <div class="article-form">
            <input type="text" id="music-name" placeholder="歌曲名称" />
            <input type="text" id="music-artist" placeholder="艺术家" />
            <label style="color:var(--color-muted);font-size:0.85rem">音频文件 (mp3/wav/flac, ≤20MB)</label>
            <input type="file" id="music-file" accept="audio/*" />
            <label style="color:var(--color-muted);font-size:0.85rem">封面图片</label>
            <input type="file" id="music-cover" accept="image/*" />
            <button class="btn-primary" id="btn-upload-music">上传</button>
            <span id="music-upload-status" style="color:var(--color-muted);font-size:0.85rem"></span>
        </div>
    `;

    html += '<h4 style="margin-top:var(--space-lg);margin-bottom:var(--space-md)">已有音乐 (' + res.data.length + ')</h4>';
    html += res.data.map(m => `
        <div class="admin-list-item">
            <span class="item-title">${escapeHtml(m.songName)} — ${escapeHtml(m.artist || '未知')}</span>
            <button class="del-music-btn" data-id="${m.id}">✕</button>
        </div>
    `).join('') || '<p style="color:var(--color-muted)">暂无音乐</p>';

    body.innerHTML = html;

    document.getElementById('btn-upload-music').addEventListener('click', async () => {
        const songName = document.getElementById('music-name').value.trim();
        const artist = document.getElementById('music-artist').value.trim();
        const file = document.getElementById('music-file').files[0];
        const cover = document.getElementById('music-cover').files[0];
        const status = document.getElementById('music-upload-status');

        if (!songName || !file || !cover) {
            status.textContent = '请填写所有字段并选择文件';
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            status.textContent = '音频文件不能超过20MB';
            return;
        }

        status.textContent = '上传中…';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('cover', cover);
        formData.append('songName', songName);
        formData.append('artist', artist);

        const uploadRes = await authFetch(API_BASE + '/admin/music', {
            method: 'POST',
            body: formData,
        });

        if (uploadRes && uploadRes.code === 200) {
            toast('音乐上传成功');
            renderMusicTab();
        } else {
            status.textContent = uploadRes ? uploadRes.message : '上传失败';
        }
    });

    body.querySelectorAll('.del-music-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除？将同时删除文件。')) return;
            const res = await authFetch(API_BASE + '/admin/music/' + btn.dataset.id, { method: 'DELETE' });
            if (res && res.code === 200) { toast('已删除'); renderMusicTab(); }
            else { toast('删除失败', true); }
        });
    });
}
