// ===== dock.js — 悬浮岛式侧边栏（全站功能索引） =====
// 依赖：api.js 中的 escapeHtml（请确保本文件在 api.js 之后加载）
// 任何页面在 <body> 中加入 <nav class="dock" id="dock"></nav> 即可自动渲染。

// ============================================================
// ★ 功能索引配置：以后要新增/调整入口，只改这个数组即可 ★
// 字段说明：
//   icon     —— 图标（emoji 或字符）
//   label    —— 悬停提示 / 读屏标签
//   href     —— 跳转链接（可选，与 action 二选一）
//   action   —— 动作名（可选）：'scroll-top' 回到顶部
//                        'scroll-to' 滚动到 target 指定元素
//   target   —— 配合 action='scroll-to' 使用的元素 id
//   divider  —— true 时在该条目后插入分隔线
// ============================================================
const DOCK_ITEMS = [
  { id: "home",     icon: "🏠", label: "首页",     href: "index.html" },
  { id: "articles", icon: "📄", label: "文章",     href: "articles.html" },
  { id: "music",    icon: "🎵", label: "音乐",     action: "scroll-to", target: "music-player" },
  { id: "divider1", divider: true },
  { id: "top",      icon: "↑",  label: "回到顶部", action: "scroll-top" },
  // ↓ 以后新功能入口加在这里，例如：
  // { id: "about", icon: "👤", label: "关于我", href: "about.html" },
  // { id: "rss",   icon: "📡", label: "RSS",    href: "/feed.xml" },
];

document.addEventListener("DOMContentLoaded", () => {
  renderDock();
});

function renderDock() {
  const dock = document.getElementById("dock");
  if (!dock) return;

  dock.innerHTML = DOCK_ITEMS.map((item) => {
    if (item.divider) {
      return '<div class="dock-divider"></div>';
    }
    return `
      <button class="dock-item" data-action="${item.action || ""}"
              data-target="${item.target || ""}" title="${escapeHtml(item.label)}"
              aria-label="${escapeHtml(item.label)}">
        ${item.href ? `<a href="${item.href}" class="dock-link">${item.icon}</a>` : `<span class="dock-icon">${item.icon}</span>`}
        <span class="dock-tip">${escapeHtml(item.label)}</span>
      </button>
    `;
  }).join("");

  // 绑定动作类条目（href 条目由 <a> 原生跳转）
  dock.querySelectorAll(".dock-item").forEach((btn) => {
    const action = btn.dataset.action;
    if (!action) return;
    btn.addEventListener("click", () => {
      if (action === "scroll-top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (action === "scroll-to") {
        const target = document.getElementById(btn.dataset.target);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
}
