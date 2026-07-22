document.addEventListener("DOMContentLoaded", () => {
  renderGreeting();
  loadServerTime();
  loadRandomArticle();
  loadArticles(1);
  loadMusicPlayer();
  loadSiteStats();
  renderSocialLinks();
});

function renderGreeting() {
  const el = document.getElementById("greeting");
  if (!el) return;

  const hour = new Date().getHours();
  let greeting;
  if (hour < 6) greeting = "夜深了";
  else if (hour < 12) greeting = "早上好";
  else if (hour < 18) greeting = "下午好";
  else greeting = "晚上好";

  el.innerHTML = `${greeting}<br>I'm <span class="name">Vellumist</span>，nice to meet you！`;
}

let serverTimeOffset = 0; // 服务端时间与本地时间的偏移（毫秒）
let timeTimer = null;

function loadServerTime() {
  const valueEl = document.getElementById("time-value");
  const statusEl = document.getElementById("time-status");
  if (!valueEl || !statusEl) return;

  fetchServerTime()
    .then((res) => {
      if (res && res.code === 200 && res.data && res.data.iso) {
        // 计算服务端与本地时间偏移
        const serverMs = new Date(res.data.iso).getTime();
        const localMs = Date.now();
        serverTimeOffset = serverMs - localMs;

        // 标记已连接
        statusEl.textContent = "● 已同步";
        statusEl.className = "time-status connected";

        // 立即更新一次
        updateTimeDisplay();

        // 每 15 秒刷新
        if (timeTimer) clearInterval(timeTimer);
        timeTimer = setInterval(updateTimeDisplay, 15000);
      } else {
        // 连接失败，回退到本地时间
        serverTimeOffset = 0;
        statusEl.textContent = "○ 离线（使用本地时间）";
        statusEl.className = "time-status";
        updateTimeDisplay();
        if (timeTimer) clearInterval(timeTimer);
        timeTimer = setInterval(updateTimeDisplay, 15000);
      }
    })
    .catch(() => {
      // 网络错误，回退到本地时间
      serverTimeOffset = 0;
      statusEl.textContent = "○ 离线（使用本地时间）";
      statusEl.className = "time-status";
      updateTimeDisplay();
      if (timeTimer) clearInterval(timeTimer);
      timeTimer = setInterval(updateTimeDisplay, 15000);
    });
}

function updateTimeDisplay() {
  const valueEl = document.getElementById("time-value");
  if (!valueEl) return;

  const now = new Date(Date.now() + serverTimeOffset);
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hours24 = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hh = hours24 % 12 || 12;

  valueEl.textContent = `${dd}-${mm}-${yyyy} ${String(hh).padStart(2, "0")}:${minutes} ${ampm}`;
}

function loadRandomArticle() {
  fetchRandomArticle().then((res) => {
    const container = document.getElementById("random-article");
    if (!container) return;
    if (res && res.code === 200 && res.data) {
      container.innerHTML = renderArticleCard(res.data, true);
    } else {
      container.innerHTML =
        '<p style="color: var(--color-muted);">暂无文章</p>';
    }
  });
}

function loadArticles(page) {
  fetchArticles(page, 5).then((res) => {
    const container = document.getElementById("article-list");
    if (!container) return;

    if (res && res.code === 200 && res.data.length > 0) {
      container.innerHTML = res.data
        .map((a) => renderArticleCard(a, false))
        .join("");
      // stagger animation
      const cards = container.querySelectorAll(".card-stagger");
      cards.forEach((card, i) => {
        card.style.animationDelay = `${i * 0.08}s`;
      });
    } else {
      container.innerHTML =
        '<p style="color: var(--color-muted);">暂无文章</p>';
    }
  });
}

// ===== 音乐播放器 =====
const player = {
  audio: null,
  tracks: [],
  currentIdx: -1,
  currentSongId: null,
};

function loadMusicPlayer() {
  // 创建全局 Audio 实例
  if (!player.audio) {
    player.audio = new Audio();
    player.audio.volume = 0.8;
  }

  // 直接从后端获取本地音乐列表
  fetchMusicRecommendations().then((res) => {
    if (res && res.code === 200 && res.data.length > 0) {
      // 将后端字段映射为播放器需要的字段
      player.tracks = res.data.map(t => ({
        id: t.id,
        name: t.songName,
        artist: t.artist,
        coverUrl: t.coverUrl,
        fileUrl: t.filePath,
        duration: 0,
      }));
      player.currentIdx = -1;
      renderTrackList();
      setupPlayerControls();
    } else {
      showMusicFallback("暂无音乐，去后台管理上传吧");
    }
  });
}

function renderTrackList() {
  const listEl = document.getElementById("track-list");
  if (!listEl) return;

  listEl.innerHTML = player.tracks
    .map(
      (t, i) => `
        <div class="track-item" data-index="${i}">
          <span class="track-idx">${String(i + 1).padStart(2, "0")}</span>
          <span class="track-name">${escapeHtml(t.name)}</span>
          <span class="track-dur">${formatDuration(t.duration)}</span>
        </div>
      `,
    )
    .join("");

  // 点击曲目
  listEl.querySelectorAll(".track-item").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.index);
      playTrack(idx);
    });
  });
}

function playTrack(idx) {
  if (idx < 0 || idx >= player.tracks.length) return;
  player.currentIdx = idx;

  const track = player.tracks[idx];
  player.currentSongId = track.id;

  // 更新显示信息
  document.getElementById("np-name").textContent = track.name;
  document.getElementById("np-artist").textContent = track.artist;
  const coverEl = document.getElementById("np-cover");
  coverEl.src = track.coverUrl;
  coverEl.onerror = function () {
    this.src =
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><rect fill="#abbbf3" width="52" height="52"/><text x="26" y="34" text-anchor="middle" fill="#000" font-size="24">♪</text></svg>',
      );
  };

  // 高亮当前曲目
  document.querySelectorAll(".track-item").forEach((el) => {
    el.classList.toggle("active", parseInt(el.dataset.index) === idx);
  });

  // 直接使用本地文件播放
  if (track.fileUrl) {
    player.audio.src = track.fileUrl;
    player.audio.play().catch(() => {});
    document.getElementById("btn-play").textContent = "⏸";
    coverEl.classList.add("playing");
    document.getElementById("np-artist").textContent =
      track.artist + " ● 播放中";
  } else {
    document.getElementById("np-artist").textContent =
      track.artist + " ● 无文件";
    setTimeout(() => playNext(), 1500);
  }
}

function playNext() {
  if (player.tracks.length === 0) return;
  const next = (player.currentIdx + 1) % player.tracks.length;
  playTrack(next);
}

function playPrev() {
  if (player.tracks.length === 0) return;
  const prev =
    (player.currentIdx - 1 + player.tracks.length) % player.tracks.length;
  playTrack(prev);
}

function setupPlayerControls() {
  const audio = player.audio;
  const progressBar = document.getElementById("progress-bar");
  const volSlider = document.getElementById("vol-slider");
  const btnPlay = document.getElementById("btn-play");
  const btnNext = document.getElementById("btn-next");
  const btnPrev = document.getElementById("btn-prev");
  const volIcon = document.getElementById("vol-icon");

  // 播放/暂停
  btnPlay.addEventListener("click", () => {
    if (player.currentIdx === -1 && player.tracks.length > 0) {
      playTrack(0);
      return;
    }
    if (audio.paused) {
      audio.play();
      btnPlay.textContent = "⏸";
    } else {
      audio.pause();
      btnPlay.textContent = "▶";
    }
  });

  // 上一首/下一首
  btnNext.addEventListener("click", playNext);
  btnPrev.addEventListener("click", playPrev);

  // 进度条拖动
  progressBar.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

  // 音量
  volSlider.addEventListener("input", () => {
    audio.volume = volSlider.value / 100;
    updateVolIcon();
  });
  volIcon.addEventListener("click", () => {
    if (audio.volume > 0) {
      audio.dataset.prevVolume = audio.volume;
      audio.volume = 0;
      volSlider.value = 0;
    } else {
      const prev = parseFloat(audio.dataset.prevVolume || 0.8);
      audio.volume = prev;
      volSlider.value = prev * 100;
    }
    updateVolIcon();
  });

  // audio 事件
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.value = pct;
    document.getElementById("time-current").textContent =
      formatDuration(audio.currentTime);
  });

  audio.addEventListener("loadedmetadata", () => {
    document.getElementById("time-total").textContent = formatDuration(
      audio.duration,
    );
  });

  audio.addEventListener("ended", playNext);

  audio.addEventListener("play", () => {
    btnPlay.textContent = "⏸";
    document.getElementById("np-cover").classList.add("playing");
  });

  audio.addEventListener("pause", () => {
    btnPlay.textContent = "▶";
    document.getElementById("np-cover").classList.remove("playing");
  });

  // 初始音量
  volSlider.value = audio.volume * 100;
  updateVolIcon();
}

function updateVolIcon() {
  const icon = document.getElementById("vol-icon");
  const v = player.audio.volume;
  if (v === 0) icon.textContent = "🔇";
  else if (v < 0.3) icon.textContent = "🔈";
  else if (v < 0.7) icon.textContent = "🔉";
  else icon.textContent = "🔊";
}

function formatDuration(sec) {
  if (!sec || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function showMusicFallback(msg) {
  document.getElementById("track-list").innerHTML =
    '<div class="np-placeholder">' + msg + "</div>";
}

function loadSiteStats() {
  fetchSiteStats().then((res) => {
    const container = document.getElementById("site-stats");
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
  const container = document.getElementById("social-links");
  if (!container) return;

  const links = [
    { name: "GitHub", url: "https://github.com/" },
    { name: "Bilibili", url: "https://bilibili.com/" },
  ];
  container.innerHTML = links
    .map(
      (l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.name}</a>`,
    )
    .join("");
}

function renderArticleCard(article, isRandom) {
  const date = new Date(article.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const tagClass = isRandom ? "" : "card-stagger";
  return `
        <a href="article.html?id=${article.id}"
           class="card article-card ${tagClass}"
           style="text-decoration: none;">
            <div class="article-date">${date}</div>
            <div class="article-title">${escapeHtml(article.title)}</div>
            ${article.summary ? `<div class="article-summary">${escapeHtml(article.summary)}</div>` : ""}
        </a>
    `;
}
