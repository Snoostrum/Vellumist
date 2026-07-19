# 云服务器 Dashboard 页面 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个暗色主题 Dashboard 风格的单页应用，替换 Nginx 默认页，后端未通时正常降级展示。

**Architecture:** 纯静态三文件（HTML/CSS/JS），零依赖。HTML 定义结构骨架，CSS 通过 CSS 变量控制暗色主题，JS 负责导航切换、API 轮询和离线降级。后端 API 不可用时页面不做任何阻塞 — 所有 fetch 失败静默降级到占位内容。

**Tech Stack:** HTML5 + CSS3（CSS 变量 + Flexbox + Grid）+ 原生 JavaScript（fetch + DOM API），Nginx 托管静态文件。

## Global Constraints

- 纯原生，零依赖（无 webpack/vite/npm 包）
- 结构/样式/交互三文件分离
- 桌面优先，不做移动端适配
- 后端不可用时页面必须完整展示，不报错、不白屏
- API 端点：`GET /api/health`、`GET /api/info`、`GET /api/projects`

---

### Task 1: HTML 结构 — 侧边栏 + 主内容区骨架

**Files:**
- Create: `frontend/index.html`

**Interfaces:**
- Produces: 页面 DOM 结构，供 CSS 选择器和 JS 操作
  - 侧边栏 id: `sidebar`，导航项 class: `.nav-item`，data 属性: `data-section`
  - 内容区 section id: `section-overview`、`section-projects`、`section-skills`、`section-apistatus`
  - 状态卡片 id: `card-server-status`、`card-api-status`、`card-resources`
  - 项目容器 id: `project-list`
  - 技能容器 id: `skill-cloud`
  - API 详情容器 id: `api-detail`

- [ ] **Step 1: 编写完整 HTML 文件**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Dashboard</title>
  <link rel="stylesheet" href="css/dashboard.css">
</head>
<body>
  <!-- 侧边栏 -->
  <aside id="sidebar">
    <div class="sidebar-header">
      <h1 class="logo">⚡ Dashboard</h1>
      <p class="subtitle">Snoostrum's Server</p>
    </div>
    <nav class="sidebar-nav">
      <button class="nav-item active" data-section="overview">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">概览</span>
      </button>
      <button class="nav-item" data-section="projects">
        <span class="nav-icon">📊</span>
        <span class="nav-label">项目</span>
      </button>
      <button class="nav-item" data-section="skills">
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">技能标签</span>
      </button>
      <button class="nav-item" data-section="apistatus">
        <span class="nav-icon">📡</span>
        <span class="nav-label">API 状态</span>
      </button>
    </nav>
    <div class="sidebar-footer">
      <p>&copy; 2026 Snoostrum</p>
    </div>
  </aside>

  <!-- 主内容区 -->
  <main id="main-content">
    <!-- 概览 Section -->
    <section id="section-overview" class="content-section active">
      <!-- 状态卡片行 -->
      <div class="status-cards">
        <div class="card status-card" id="card-server-status">
          <div class="card-header">
            <span class="card-icon">🖥️</span>
            <span class="card-title">服务器状态</span>
          </div>
          <div class="card-body">
            <span class="status-indicator offline" id="server-indicator"></span>
            <span class="status-text" id="server-status-text">离线</span>
          </div>
        </div>

        <div class="card status-card" id="card-api-status">
          <div class="card-header">
            <span class="card-icon">🔌</span>
            <span class="card-title">API 接口</span>
          </div>
          <div class="card-body">
            <span class="status-indicator developing" id="api-indicator"></span>
            <span class="status-text" id="api-status-text">开发中</span>
          </div>
        </div>

        <div class="card status-card" id="card-resources">
          <div class="card-header">
            <span class="card-icon">📈</span>
            <span class="card-title">系统资源</span>
          </div>
          <div class="card-body">
            <div class="resource-item">
              <span class="resource-label">CPU</span>
              <span class="resource-value" id="cpu-value">--</span>
            </div>
            <div class="resource-item">
              <span class="resource-label">内存</span>
              <span class="resource-value" id="mem-value">--</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 项目列表 -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon">📊</span>
          <span class="card-title">项目列表</span>
        </div>
        <div class="card-body" id="project-list">
          <!-- JS 动态填充 -->
        </div>
      </div>

      <!-- 技能标签 -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon">⚙️</span>
          <span class="card-title">技术栈</span>
        </div>
        <div class="card-body" id="skill-cloud">
          <!-- JS 动态填充 -->
        </div>
      </div>
    </section>

    <!-- 项目 Section -->
    <section id="section-projects" class="content-section">
      <div class="card">
        <div class="card-header">
          <span class="card-icon">📊</span>
          <span class="card-title">所有项目</span>
        </div>
        <div class="card-body" id="project-list-full">
          <!-- JS 动态填充 -->
        </div>
      </div>
    </section>

    <!-- 技能 Section -->
    <section id="section-skills" class="content-section">
      <div class="card">
        <div class="card-header">
          <span class="card-icon">⚙️</span>
          <span class="card-title">技能标签</span>
        </div>
        <div class="card-body" id="skill-cloud-full">
          <!-- JS 动态填充 -->
        </div>
      </div>
    </section>

    <!-- API 状态 Section -->
    <section id="section-apistatus" class="content-section">
      <div class="card">
        <div class="card-header">
          <span class="card-icon">📡</span>
          <span class="card-title">API 接口状态</span>
        </div>
        <div class="card-body" id="api-detail">
          <!-- JS 动态填充 -->
        </div>
      </div>
    </section>
  </main>

  <script src="js/dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: 确认文件创建成功**

```bash
ls -la frontend/index.html
```

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat: add dashboard HTML structure with sidebar and content sections

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: CSS 暗色主题 — 侧边栏 + 卡片 + 栅格布局

**Files:**
- Create: `frontend/css/dashboard.css`

**Interfaces:**
- Consumes: `frontend/index.html` 中的 class/id 选择器
- Produces: 完整的暗色主题视觉系统
  - CSS 变量: `--bg-primary`、`--bg-secondary`、`--bg-card`、`--text-primary`、`--text-secondary`、`--accent`、`--success`、`--warning`、`--danger`、`--border`
  - 布局: Flexbox sidebar + main，Grid 状态卡片三列

- [ ] **Step 1: 编写完整 CSS 文件**

```css
/* ========================================
   CSS Variables — 暗色主题
   ======================================== */
:root {
  --bg-primary: #0f1117;
  --bg-secondary: #161822;
  --bg-card: #1c1f2e;
  --bg-card-hover: #232738;
  --text-primary: #e4e6ef;
  --text-secondary: #8b8fa3;
  --text-muted: #5c6072;
  --accent: #6c8cff;
  --accent-dim: #4a5fb3;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #f87171;
  --border: #2a2d3a;
  --sidebar-width: 240px;
  --radius: 8px;
  --transition: 0.2s ease;
  --font-mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ========================================
   Reset & Base
   ======================================== */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  display: flex;
  min-height: 100vh;
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

/* ========================================
   Sidebar
   ======================================== */
#sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.sidebar-header {
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--border);
}

.sidebar-header .logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.sidebar-header .subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 4px;
  font-family: var(--font-mono);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition);
  text-align: left;
  font-family: var(--font-sans);
}

.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-dim);
  color: #fff;
}

.nav-icon {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ========================================
   Main Content
   ======================================== */
#main-content {
  margin-left: var(--sidebar-width);
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.content-section {
  display: none;
}

.content-section.active {
  display: block;
}

/* ========================================
   Status Cards Row
   ======================================== */
.status-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

/* ========================================
   Card Base
   ======================================== */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 16px;
  overflow: hidden;
  transition: border-color var(--transition);
}

.card:hover {
  border-color: var(--text-muted);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.card-icon {
  font-size: 1rem;
}

.card-body {
  padding: 20px;
}

/* ========================================
   Status Card Specific
   ======================================== */
.status-card .card-body {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.online {
  background: var(--success);
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
}

.status-indicator.offline {
  background: var(--text-muted);
}

.status-indicator.developing {
  background: var(--warning);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
}

.status-text {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--text-primary);
}

/* Resource items inside resource card */
.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.resource-item + .resource-item {
  border-top: 1px solid var(--border);
}

.resource-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.resource-value {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-primary);
}

/* ========================================
   Project Cards
   ======================================== */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.project-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  transition: border-color var(--transition), background var(--transition);
}

.project-card:hover {
  border-color: var(--accent-dim);
  background: var(--bg-card-hover);
}

.project-card .project-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.project-card .project-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.5;
}

.project-card .project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.project-placeholder {
  border-style: dashed;
  opacity: 0.6;
}

.project-placeholder .project-name {
  color: var(--text-muted);
}

/* ========================================
   Tag Badge
   ======================================== */
.tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 0.75rem;
  border-radius: 4px;
  background: rgba(108, 140, 255, 0.12);
  color: var(--accent);
  font-family: var(--font-mono);
  border: 1px solid rgba(108, 140, 255, 0.2);
}

/* ========================================
   Skill Cloud
   ======================================== */
.skill-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  transition: all var(--transition);
  cursor: default;
}

.skill-tag:hover {
  border-color: var(--accent);
  color: var(--text-primary);
  background: var(--bg-card-hover);
}

/* ========================================
   API Status Table
   ======================================== */
.api-table {
  width: 100%;
  border-collapse: collapse;
}

.api-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

.api-table td {
  padding: 12px;
  font-size: 0.88rem;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.api-table .api-method {
  color: var(--accent);
  font-weight: 600;
}

.api-status-badge {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 600;
}

.api-status-badge.online {
  background: rgba(74, 222, 128, 0.12);
  color: var(--success);
}

.api-status-badge.offline {
  background: rgba(92, 96, 114, 0.15);
  color: var(--text-muted);
}

/* ========================================
   Scrollbar
   ======================================== */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

- [ ] **Step 2: 确认文件创建成功**

```bash
ls -la frontend/css/dashboard.css
```

- [ ] **Step 3: Commit**

```bash
git add frontend/css/dashboard.css
git commit -m "feat: add dark-theme dashboard CSS with sidebar, cards, and grid layout

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: JavaScript 交互 — 导航切换 + API 轮询 + 动态渲染

**Files:**
- Create: `frontend/js/dashboard.js`

**Interfaces:**
- Consumes:
  - DOM: `#sidebar .nav-item[data-section]`、`.content-section`、status card spans、`#project-list`、`#project-list-full`、`#skill-cloud`、`#skill-cloud-full`、`#api-detail`
  - API: `GET /api/health`、`GET /api/info`、`GET /api/projects`
- Produces:
  - `switchSection(sectionName)` — 侧边栏导航切换
  - `checkHealth()` — 轮询 health 端点，更新状态卡片
  - `fetchInfo()` — 拉取服务器资源信息
  - `fetchProjects()` — 拉取项目列表并渲染卡片
  - `renderStaticContent()` — 渲染不依赖后端的技能标签和占位项目

- [ ] **Step 1: 编写完整 JS 文件**

```javascript
/* ========================================
   Dashboard — 导航切换 + API 轮询 + 动态渲染
   ======================================== */

// ---------- 静态数据 ----------

const SKILLS = [
  'Java', 'Spring Boot', 'MySQL', 'Redis',
  'Linux', 'Nginx', 'Docker', 'Git',
  'HTML', 'CSS', 'JavaScript', 'REST API',
];

const PLACEHOLDER_PROJECTS = [
  {
    name: 'Server Dashboard',
    desc: '你正在看的这个页面 — 暗色主题控制台风格，预留后端 API 联动接口',
    tags: ['HTML', 'CSS', 'JavaScript', 'Nginx'],
    placeholder: false,
  },
  {
    name: 'Spring Boot API',
    desc: '后端服务框架，提供 /api/health、/api/info、/api/projects 接口',
    tags: ['Java', 'Spring Boot', 'Maven'],
    placeholder: true,
  },
  {
    name: '你的下一个项目',
    desc: '这个位置留给你即将开始的项目，完成后替换掉这张卡片',
    tags: ['???'],
    placeholder: true,
  },
];

// ---------- 导航切换 ----------

function switchSection(sectionName) {
  // 更新侧边栏 active
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionName);
  });
  // 更新内容区
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.toggle('active', section.id === `section-${sectionName}`);
  });
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchSection(item.dataset.section));
});

// ---------- API 调用 ----------

const API_BASE = '/api';

async function apiFetch(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- 服务器状态 ----------

async function checkHealth() {
  const indicator = document.getElementById('server-indicator');
  const text = document.getElementById('server-status-text');
  const data = await apiFetch('/health');

  if (data && data.status === 'UP') {
    indicator.className = 'status-indicator online';
    text.textContent = data.uptime || '运行中';
  } else {
    indicator.className = 'status-indicator offline';
    text.textContent = '离线';
  }
}

// ---------- 系统资源 ----------

async function fetchInfo() {
  const cpuEl = document.getElementById('cpu-value');
  const memEl = document.getElementById('mem-value');
  const data = await apiFetch('/info');

  if (data) {
    cpuEl.textContent = data.cpu != null ? `${data.cpu}%` : '--';
    memEl.textContent = data.memory != null ? `${data.memory}%` : '--';
  }
}

// ---------- 项目列表 ----------

function renderProjectCard(project) {
  const card = document.createElement('div');
  card.className = `project-card${project.placeholder ? ' project-placeholder' : ''}`;
  card.innerHTML = `
    <div class="project-name">${escapeHtml(project.name)}</div>
    <div class="project-desc">${escapeHtml(project.desc)}</div>
    <div class="project-tags">
      ${project.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
    </div>
  `;
  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderProjects(projects, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'project-grid';
  projects.forEach(p => grid.appendChild(renderProjectCard(p)));
  container.appendChild(grid);
}

async function fetchProjects() {
  const data = await apiFetch('/projects');
  const projects = (data && data.length > 0) ? data : PLACEHOLDER_PROJECTS;

  // 将后端项目转换为前端格式（如果后端返回了数据）
  const formatted = data
    ? data.map(p => ({
        name: p.name || '未命名项目',
        desc: p.description || '',
        tags: p.techStack || [],
        placeholder: false,
      }))
    : PLACEHOLDER_PROJECTS;

  renderProjects(formatted, 'project-list');
  renderProjects(formatted, 'project-list-full');
}

// ---------- 技能标签 ----------

function renderSkills(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const cloud = document.createElement('div');
  cloud.className = 'skill-cloud';
  SKILLS.forEach(skill => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.textContent = skill;
    cloud.appendChild(tag);
  });
  container.appendChild(cloud);
}

// ---------- API 状态面板 ----------

function renderApiStatus() {
  const container = document.getElementById('api-detail');
  if (!container) return;

  const endpoints = [
    { method: 'GET', path: '/api/health', desc: '服务器健康检查' },
    { method: 'GET', path: '/api/info', desc: '服务器资源信息' },
    { method: 'GET', path: '/api/projects', desc: '项目列表' },
  ];

  const table = document.createElement('table');
  table.className = 'api-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>方法</th>
        <th>路径</th>
        <th>说明</th>
        <th>状态</th>
      </tr>
    </thead>
    <tbody>
      ${endpoints.map(ep => `
        <tr>
          <td><span class="api-method">${ep.method}</span></td>
          <td>${ep.path}</td>
          <td>${ep.desc}</td>
          <td><span class="api-status-badge offline" id="badge-${ep.path.replace(/\//g, '-').slice(1)}">未连接</span></td>
        </tr>
      `).join('')}
    </tbody>
  `;
  container.innerHTML = '';
  container.appendChild(table);
}

async function checkApiEndpoints() {
  const endpoints = ['/health', '/info', '/projects'];
  for (const ep of endpoints) {
    const badgeId = `badge-${ep.replace(/\//g, '-').slice(1)}`;
    const badge = document.getElementById(badgeId);
    if (!badge) continue;
    const data = await apiFetch(ep);
    if (data) {
      badge.textContent = '已连接';
      badge.className = 'api-status-badge online';
    } else {
      badge.textContent = '未连接';
      badge.className = 'api-status-badge offline';
    }
  }
}

// ---------- 初始化 ----------

function init() {
  // 渲染静态内容（不依赖后端）
  renderProjects(PLACEHOLDER_PROJECTS, 'project-list');
  renderProjects(PLACEHOLDER_PROJECTS, 'project-list-full');
  renderSkills('skill-cloud');
  renderSkills('skill-cloud-full');
  renderApiStatus();

  // 尝试连接后端
  checkHealth();
  fetchInfo();
  fetchProjects();
  checkApiEndpoints();

  // 每 30 秒轮询
  setInterval(() => {
    checkHealth();
    fetchInfo();
    fetchProjects();
    checkApiEndpoints();
  }, 30000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 2: 确认文件创建成功**

```bash
ls -la frontend/js/dashboard.js
```

- [ ] **Step 3: Commit**

```bash
git add frontend/js/dashboard.js
git commit -m "feat: add dashboard JS — navigation, API polling, dynamic rendering with offline fallback

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 验证 — 在浏览器中打开确认效果

**Files:**
- 无新增，验证已有文件

- [ ] **Step 1: 在浏览器中打开页面**

```bash
# Windows 下直接用浏览器打开
start frontend/index.html
```

- [ ] **Step 2: 目视检查以下内容**
  - 暗色主题是否正确渲染（深色背景、卡片边框、侧边栏）
  - 侧边栏四个导航项点击切换是否正常
  - 状态卡片显示"离线"和"开发中"（灰色/黄色指示点）
  - 系统资源显示 "--"
  - 项目卡片显示 3 张（1 个真实 + 2 个虚线占位）
  - 技能标签云正常展示
  - API 状态表格显示 3 个端点均为"未连接"

- [ ] **Step 3: 提交最终验证通过的 commit**

```bash
git add -A
git commit -m "chore: final verification — all files in place, ready for deployment

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Nginx 部署配置

**Files:**
- 修改服务器上的 Nginx 配置（非本地文件，手动操作）

**Interfaces:**
- Consumes: `frontend/` 目录下的所有静态文件
- Produces: Nginx 正确托管 Dashboard 页面，并为后端 API 预留反向代理

> ⚠️ 此任务需要在云服务器上操作，不在本地执行。

- [ ] **Step 1: 上传前端文件到服务器**

```bash
# 将 frontend 目录上传到服务器（替换 YOUR_SERVER_IP）
scp -r frontend/ root@YOUR_SERVER_IP:/var/www/dashboard/
```

- [ ] **Step 2: 配置 Nginx**

在服务器上编辑 `/etc/nginx/sites-available/default`（或创建新配置文件）：

```nginx
server {
    listen 80;
    server_name _;  # 或你的域名

    # 静态文件 — Dashboard 页面
    root /var/www/dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理 — 预留，后端启动后取消注释
    # location /api/ {
    #     proxy_pass http://127.0.0.1:8080;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    # }
}
```

- [ ] **Step 3: 重载 Nginx**

```bash
ssh root@YOUR_SERVER_IP "nginx -t && systemctl reload nginx"
```

预期输出：`nginx: configuration file ... test is successful`

- [ ] **Step 4: 浏览器访问验证**

打开 `http://YOUR_SERVER_IP/`，确认看到 Dashboard 页面。同时确认：
- `http://YOUR_SERVER_IP/api/health` 返回 Nginx 404（后端未启动，`/api/` 的代理规则被注释了 — 这是预期的，等后端就绪后再取消注释）
- Dashboard 页面 JS 的 fetch 虽然 404，但因为 apiFetch 容错，页面不会报错，状态卡片显示"离线"
