# 全栈个人博客 — 设计文档

**日期**：2026-07-20
**状态**：设计已确认
**参考**：[lvyovo-wiki.tech](https://lvyovo-wiki.tech/)

---

## 1. 项目定位

- **性质**：Spring Boot 练习项目，非面试作品
- **部署**：自有服务器，Nginx + Spring Boot + NeteaseCloudMusicApi
- **目标**：通过完整开发—部署流程，建立 Spring Boot REST API 实战能力

## 2. 功能模块

| 模块 | 说明 | 数据来源 |
|------|------|---------|
| 文章展示 | 文章列表（分页）+ 文章详情 + 随机推荐 | 后端数据库 |
| 日历小部件 | 当月日历，有文章的日期高亮 | 前端生成 + 后端返回有文章的日期 |
| 插画展示 | 静态插画图片，页面加载淡入动画 | 前端静态资源 |
| 音乐推荐 | 首页展示推荐歌曲（歌名、歌手、封面） | 网易云 API（后端代理） |

**不做**：文章标签/分类、评论系统、登录后台（后续迭代再加）。

## 3. 配色方案

| 角色 | 色值 | 用途 |
|------|------|------|
| 背景色 | `#000000`（黑） | 主背景 |
| 前景色 | `#FFFFFF`（白） | 主要文字 |
| 主强调色 | `#abbbf3` | 链接、高亮、侧边栏选中指示条 |
| 辅助灰 | `#747474` | 次要文字、时间戳、边界线 |
| 卡片背景 | `rgba(255,255,255,0.05)` 或深灰 | 文章卡片、音乐卡片 |

暗色主题为主，后续可按需加亮色切换。

## 4. 架构

```
用户浏览器
    │
    ▼
Nginx :80
    │
    ├── /                     → 前端静态文件（HTML/CSS/JS/images）
    │
    └── /api/*                → 反向代理 → Spring Boot :8080
                                    │
                                    └── MusicService → localhost:3000
                                                            │
                                              NeteaseCloudMusicApi (Node.js)
```

## 5. 技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| 后端框架 | Spring Boot 3.5 + Java 25 | 用户学习方向 |
| 数据库 | H2（开发）/ MySQL（部署） | 零配置开发，部署时切换 |
| 数据访问 | Spring JDBC / JdbcTemplate | 简单够用，不用 JPA 额外学习 |
| 前端 | 原生 HTML + CSS + JS | 复用 dashboard 项目经验，不引入框架 |
| 前端样式 | CSS 自定义属性 | 暗色主题、配色统一管理 |
| 反向代理 | Nginx | 部署在用户服务器 |
| 音乐 API | NeteaseCloudMusicApi | 社区方案，本地部署 |

## 6. API 设计

### 统一响应格式

```json
{
  "code": 200,
  "data": { ... },
  "message": "ok"
}
```

### 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/articles?page=1&size=5` | 文章分页列表（含摘要） |
| GET | `/api/articles/{id}` | 文章详情（全文） |
| GET | `/api/articles/random` | 随机推荐一篇文章 |
| GET | `/api/articles/dates?year=2026&month=7` | 当月有文章的日期列表 |
| GET | `/api/music/recommendations` | 音乐推荐列表 |
| GET | `/api/site-stats` | 站点统计（总字数、文章数） |

## 7. 数据库模型

```sql
articles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)  NOT NULL,
    summary     VARCHAR(500),
    content     TEXT          NOT NULL,
    cover_image VARCHAR(500),
    view_count  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

music_recs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    song_name   VARCHAR(200) NOT NULL,
    artist      VARCHAR(200),
    cover_url   VARCHAR(500),
    link_url    VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

音乐推荐数据来自网易云 API 缓存（定期刷新或首次取时写入）。

## 8. 前端页面

### 首页（index.html）— 双栏布局

```
┌──────────────┬──────────────────────────────────┐
│   SIDEBAR    │          MAIN CONTENT            │
│   (固定)      │                                  │
│              │   欢迎语（时间自适应）              │
│  📝 最近文章  │   📅 日历小部件                    │
│  🎵 音乐推荐  │                                  │
│  🎨 插画     │   🎨 插画展示区（淡入动画）         │
│              │                                  │
│              │   🎵 音乐推荐卡片（封面旋转动画）    │
│              │                                  │
│              │   📝 最新文章列表（分页）            │
│              │   随机推荐文章                     │
└──────────────┴──────────────────────────────────┘
```

- 左侧固定 240px，右侧自适应
- 移动端（<768px）：侧边栏收起到顶部汉堡菜单

### 文章详情页（article.html）

- 文章标题 + 日期 + 全文内容（Markdown 渲染）
- 回到首页链接

### 动画 & 交互

| 元素 | 效果 |
|------|------|
| 插画 | 加载时 `opacity 0→1` + `translateY 20px→0` |
| 文章/音乐卡片 | hover 时 `scale(1.02)` + 阴影加深 |
| 音乐封面 | 持续旋转动画（`animation: spin 20s linear infinite`） |
| 日历日期 | 有文章的日期使用 `#abbbf3` 高亮小圆点 |
| 侧边栏 | hover 过渡、选中项指示条 |

## 9. 项目目录结构

```
blog/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/blog/
│       ├── BlogApplication.java
│       ├── controller/
│       │   ├── ArticleController.java
│       │   ├── MusicController.java
│       │   └── StatsController.java
│       ├── service/
│       │   ├── ArticleService.java
│       │   └── MusicService.java
│       ├── model/
│       │   ├── Article.java
│       │   ├── MusicRec.java
│       │   └── ApiResponse.java
│       └── config/
│           └── WebConfig.java
│
├── frontend/
│   ├── index.html
│   ├── article.html
│   ├── css/
│   │   ├── variables.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   └── animations.css
│   ├── js/
│   │   ├── api.js
│   │   ├── home.js
│   │   ├── article.js
│   │   └── calendar.js
│   └── images/
│       └── illustration.png
│
└── deploy/
    └── nginx.conf
```

## 10. 不在本期范围

- 文章标签/分类
- 评论系统
- 后台管理界面（文章通过直接操作数据库或 SQL 脚本录入）
- 用户登录/认证
- 亮色主题切换
- RSS 订阅
