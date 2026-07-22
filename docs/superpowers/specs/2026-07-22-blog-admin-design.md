# 博客后台管理系统 — 设计文档

> 日期: 2026-07-22
> 分支: feature/login

## 1. 概述

为「不如睡觉」个人博客添加完整的后台管理功能。管理员通过 JWT 认证后，在页面右侧滑出抽屉面板，管理文章、分类、标签和评论。

## 2. 技术选型

| 层面 | 技术 |
|------|------|
| 认证框架 | Spring Security |
| Token | JWT（jjwt 库） |
| 密码加密 | BCrypt |
| 数据访问 | JdbcTemplate（与现有架构一致） |
| 前端编辑器 | marked.js（Markdown 实时预览） |
| UI 模式 | 固定定位抽屉面板，JS 动态注入 |

## 3. 数据库设计

### 3.1 articles 表扩展

```sql
ALTER TABLE articles ADD COLUMN status VARCHAR(20) DEFAULT 'PUBLISHED';
ALTER TABLE articles ADD COLUMN category_id BIGINT;
```

### 3.2 新增表

**users** — 管理员账户
```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**categories** — 文章分类
```sql
CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**tags** — 文章标签
```sql
CREATE TABLE tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**article_tags** — 文章-标签关联
```sql
CREATE TABLE article_tags (
    article_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (article_id, tag_id)
);
```

**comments** — 访客评论
```sql
CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    article_id BIGINT NOT NULL,
    author_name VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 4. 后端架构

### 4.1 认证流程

```
POST /api/auth/login {username, password}
  → 查 users 表
  → BCrypt 校验密码
  → 生成 JWT（sub=username, exp=24h）
  → 返回 {token, username}

管理请求:
  Authorization: Bearer <token>
  → JwtAuthFilter 拦截 /api/admin/**
  → 校验签名 + 过期时间
  → 设置 SecurityContext
```

### 4.2 新增 Java 类

```
com.blog.security/
├── JwtUtil.java           — 生成/解析/校验 JWT
└── JwtAuthFilter.java     — OncePerRequestFilter

com.blog.config/
└── SecurityConfig.java    — SecurityFilterChain，放行 /api/** GET，保护 /api/admin/**

com.blog.controller/
├── AuthController.java    — POST /api/auth/login
└── AdminController.java   — 统一管理 API（文章CRUD / 分类 / 标签 / 评论 / 上传）

com.blog.service/
└── AdminService.java      — 管理端业务逻辑

com.blog.model/
├── LoginRequest.java      — {username, password}
├── LoginResponse.java     — {token, username}
├── Category.java
├── Tag.java
└── Comment.java
```

### 4.3 API 路由

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/login` | 登录 | 无 |
| GET | `/api/admin/articles` | 文章列表（含草稿） | JWT |
| POST | `/api/admin/articles` | 创建文章 | JWT |
| PUT | `/api/admin/articles/{id}` | 更新文章 | JWT |
| DELETE | `/api/admin/articles/{id}` | 删除文章 | JWT |
| GET | `/api/admin/categories` | 分类列表 | JWT |
| POST | `/api/admin/categories` | 新增分类 | JWT |
| PUT | `/api/admin/categories/{id}` | 编辑分类 | JWT |
| DELETE | `/api/admin/categories/{id}` | 删除分类 | JWT |
| GET | `/api/admin/tags` | 标签列表 | JWT |
| POST | `/api/admin/tags` | 新增标签 | JWT |
| DELETE | `/api/admin/tags/{id}` | 删除标签 | JWT |
| DELETE | `/api/admin/comments/{id}` | 删除评论 | JWT |
| POST | `/api/admin/upload` | 上传图片 | JWT |

### 4.4 图片上传

- 接口接收 `MultipartFile`，校验类型和大小（≤5MB，仅 jpg/png/gif/webp）
- 文件名 UUID 重命名，存入 `uploads/` 目录
- 返回可访问 URL（Nginx 反代或 Spring 静态资源配置）
- 前端回调：自动插入 `![alt](url)` 到 Markdown 编辑区

### 4.5 现有 API 兼容

- 公开 GET 接口 `/api/articles`、`/api/articles/random` 等只返回 `status='PUBLISHED'` 的文章
- 管理端 `/api/admin/articles` 列表返回全部文章，每篇标记 status 字段

## 5. 前端架构

### 5.1 抽屉面板

- **注入方式**：`auth.js` + `admin.js` 通过 `<script>` 标签同时引入到 `index.html` 和 `article.html`
- **触发**：顶栏右侧齿轮 ⚙️ 按钮，未登录跳登录表单，已登录开关抽屉
- **样式**：`position: fixed; right: 0; top: 0; height: 100vh; width: 420px;` + CSS `transform` 滑入动画
- **层级**：`z-index` 高于页面内容，背景半透明遮罩

### 5.2 登录状态管理

```
localStorage:
  - blog_token: JWT 字符串
  - blog_username: 用户名

auth.js:
  - isLoggedIn()     → 检查 token 是否存在且未过期
  - login(u, p)      → POST /api/auth/login → 存 token
  - logout()         → 清除 token，关闭抽屉
  - getAuthHeaders() → {Authorization: "Bearer <token>"}
```

### 5.3 抽屉内四个 Tab

| Tab | 内容 |
|-----|------|
| 📄 文章管理 | 文章列表（发布/草稿标签）+「+ 新建」按钮 → 展开 Markdown 编辑器（左侧 textarea + 右侧 marked.js 预览）+ 选择分类/标签 |
| 📁 分类管理 | 列表 + 新增行 + 编辑/删除 |
| 🏷️ 标签管理 | 列表 + 新增行 + 删除 |
| 💬 评论管理 | 按文章分组，显示评论内容和时间，删除按钮 |

### 5.4 Markdown 编辑器

- 左侧 `<textarea>` 编辑区
- 右侧 `<div>` 预览区，调用 `marked.js` 实时渲染
- 工具栏：预览/编辑切换、图片上传按钮
- 图片上传：`<input type="file">` → `FormData` → `POST /api/admin/upload` → 返回 URL → 插入 `![](url)`

### 5.5 新增文件

```
blog/frontend/
├── js/
│   ├── auth.js       — 登录/登出/token 管理
│   └── admin.js      — 抽屉逻辑 + Tab 渲染 + Markdown 编辑器
└── css/
    └── admin.css     — 抽屉面板 + 编辑器 + 遮罩 + 管理列表样式
```

## 6. 错误处理

- **401**：token 过期或无效 → 清除 localStorage，弹出登录表单
- **404**：文章/分类不存在 → toast 提示
- **413**：图片过大 → 提示 "图片不能超过 5MB"
- **500**：服务端错误 → 通用错误 toast
- 前端统一在 `api.js` 的 `fetchJSON` 基础上封装 `authFetch`（自动带 token，拦截 401）

## 7. 测试策略

| 范围 | 内容 |
|------|------|
| 单元测试 | `JwtUtil`（生成/校验/过期）、`AdminService`（CRUD 逻辑） |
| 集成测试 | `AuthController`（登录成功/失败）、`AdminController`（CRUD 各接口 + 401 拦截） |
| 手工验证 | 前端抽屉交互、Markdown 预览、图片上传 |

## 8. 依赖新增

```xml
<!-- pom.xml 新增 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```
