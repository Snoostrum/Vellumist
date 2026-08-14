// ===== admin.js — 独立管理后台（admin.html）=====
// 访客页面不再注入任何管理代码；本文件只运行在 admin.html

document.addEventListener('DOMContentLoaded', () => {
    initAdminPage();
});

// 登录态过期时（authFetch 401/403）回到登录界面
window.onAuthExpired = () => {
    renderLoginPage('登录已过期，请重新登录');
};

// 网络层失败（后端未启动/被关闭）时提示
window.onApiDown = () => {
    toast('无法连接服务器，请确认后端已启动', true);
};

function initAdminPage() {
    if (isLoggedIn()) {
        renderPanel();
    } else {
        renderLoginPage();
    }
}

// ===== 登录 =====

function renderLoginPage(msg) {
    document.getElementById('admin-header').hidden = true;
    document.getElementById('admin-layout').hidden = true;
    const area = document.getElementById('login-area');
    area.hidden = false;

    const errorEl = document.getElementById('login-error');
    if (msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
    }

    // 绑定登录表单（避免重复绑定）
    const form = document.getElementById('login-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const ok = await login(username, password);
        if (ok) {
            renderPanel();
        } else {
            errorEl.textContent = '用户名或密码错误';
            errorEl.style.display = 'block';
        }
    };
}

// ===== 管理面板 =====

function renderPanel() {
    document.getElementById('login-area').hidden = true;
    document.getElementById('admin-header').hidden = false;
    document.getElementById('admin-layout').hidden = false;

    document.getElementById('btn-logout').onclick = () => {
        logout();
        renderLoginPage();
    };

    document.getElementById('btn-change-password').onclick = () => {
        renderChangePasswordForm();
    };

    // 侧边栏 tab 切换（替换式绑定，避免重复）
    const side = document.querySelector('.admin-side');
    side.onclick = (e) => {
        const btn = e.target.closest('.admin-side-item');
        if (btn) switchTab(btn.dataset.tab);
    };

    switchTab('articles');
}

// ===== 修改密码 =====

function renderChangePasswordForm() {
    const body = document.getElementById('admin-main');
    body.innerHTML = `
        <button class="btn-secondary" id="btn-back-password" style="margin-bottom:var(--space-sm)">← 返回管理面板</button>
        <div class="article-form" style="max-width:420px">
            <h4 style="margin:0">🔑 修改密码</h4>
            <input type="password" id="pw-old" placeholder="原密码" autocomplete="current-password" />
            <input type="password" id="pw-new" placeholder="新密码（至少 8 位）" autocomplete="new-password" />
            <input type="password" id="pw-new2" placeholder="确认新密码" autocomplete="new-password" />
            <span id="pw-status" style="color:var(--color-muted);font-size:0.85rem"></span>
            <div style="display:flex;gap:var(--space-sm)">
                <button class="btn-primary" id="btn-save-password">确认修改</button>
            </div>
        </div>
    `;

    document.getElementById('btn-back-password').onclick = () => switchTab('articles');

    document.getElementById('btn-save-password').onclick = async () => {
        const oldPw = document.getElementById('pw-old').value;
        const newPw = document.getElementById('pw-new').value;
        const newPw2 = document.getElementById('pw-new2').value;
        const status = document.getElementById('pw-status');

        if (!oldPw || !newPw) {
            status.textContent = '请填写完整';
            status.style.color = '#e55';
            return;
        }
        if (newPw.length < 8) {
            status.textContent = '新密码至少 8 位';
            status.style.color = '#e55';
            return;
        }
        if (newPw !== newPw2) {
            status.textContent = '两次输入的新密码不一致';
            status.style.color = '#e55';
            return;
        }

        const res = await authFetch(API_BASE + '/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
        });

        if (res && res.code === 200) {
            toast('密码已修改，请用新密码重新登录');
            logout();
            setTimeout(() => renderLoginPage('密码已修改，请用新密码重新登录'), 300);
        } else {
            status.textContent = res && res.message ? res.message : '修改失败';
            status.style.color = '#e55';
        }
    };
}

function switchTab(tab) {
    document.querySelectorAll('.admin-side-item').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
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
    const body = document.getElementById('admin-main');
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
    const body = document.getElementById('admin-main');

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
    const body = document.getElementById('admin-main');
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
    const body = document.getElementById('admin-main');
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
    const body = document.getElementById('admin-main');
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

// ===== 音乐管理（上传 + 编辑） =====

async function renderMusicTab() {
    const body = document.getElementById('admin-main');
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
            <label style="color:var(--color-muted);font-size:0.85rem">音频文件 (mp3/wav/flac/ogg/m4a, ≤20MB)</label>
            <input type="file" id="music-file" accept="audio/*" />
            <label style="color:var(--color-muted);font-size:0.85rem">封面图片 (jpg/png/gif/webp)</label>
            <input type="file" id="music-cover" accept="image/*" />
            <button class="btn-primary" id="btn-upload-music">上传</button>
            <span id="music-upload-status" style="color:var(--color-muted);font-size:0.85rem"></span>
        </div>
    `;

    html += '<h4 style="margin-top:var(--space-lg);margin-bottom:var(--space-md)">已有音乐 (' + res.data.length + ')</h4>';
    html += res.data.map(m => `
        <div class="admin-list-item">
            <span class="item-title">${escapeHtml(m.songName)} — ${escapeHtml(m.artist || '未知')}</span>
            <span>
                <button class="edit-music-btn" data-id="${m.id}" data-name="${escapeHtml(m.songName)}" data-artist="${escapeHtml(m.artist || '')}">✎</button>
                <button class="del-music-btn" data-id="${m.id}">✕</button>
            </span>
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
            status.textContent = '请填写歌曲名称并选择音频和封面';
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

    // 编辑音乐信息（歌名/艺术家）
    body.querySelectorAll('.edit-music-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const newName = prompt('新歌名', btn.dataset.name);
            if (!newName || !newName.trim()) return;
            const newArtist = prompt('新艺术家（可留空）', btn.dataset.artist) || '';
            const res = await authFetch(API_BASE + '/admin/music/' + id, {
                method: 'PUT',
                body: JSON.stringify({ songName: newName.trim(), artist: newArtist.trim() }),
            });
            if (res && res.code === 200) {
                toast('已更新');
                renderMusicTab();
            } else {
                toast(res ? res.message : '更新失败', true);
            }
        });
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
