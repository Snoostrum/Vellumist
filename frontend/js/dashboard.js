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
  if (!indicator || !text) return;
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
  if (!cpuEl || !memEl) return;
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
  let connectedCount = 0;
  for (const ep of endpoints) {
    const badgeId = `badge-${ep.replace(/\//g, '-').slice(1)}`;
    const badge = document.getElementById(badgeId);
    if (!badge) continue;
    const data = await apiFetch(ep);
    if (data) {
      badge.textContent = '已连接';
      badge.className = 'api-status-badge online';
      connectedCount++;
    } else {
      badge.textContent = '未连接';
      badge.className = 'api-status-badge offline';
    }
  }
  // 更新概览区 API 状态卡片
  const apiIndicator = document.getElementById('api-indicator');
  const apiStatusText = document.getElementById('api-status-text');
  if (apiIndicator && apiStatusText) {
    if (connectedCount === endpoints.length) {
      apiIndicator.className = 'status-indicator online';
      apiStatusText.textContent = `${connectedCount} 个接口在线`;
    } else if (connectedCount > 0) {
      apiIndicator.className = 'status-indicator developing';
      apiStatusText.textContent = `${connectedCount}/${endpoints.length} 在线`;
    } else {
      apiIndicator.className = 'status-indicator offline';
      apiStatusText.textContent = '未连接';
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
