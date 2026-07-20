# 全栈个人博客 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个部署到自有服务器的全栈个人博客 — Spring Boot REST API + 原生 HTML/CSS/JS 前端 + 网易云音乐推荐。

**Architecture:** Spring Boot 3.5 提供 REST API（JdbcTemplate 访问 H2/MySQL），原生前端通过 Nginx 托管静态文件并反向代理 `/api/*` 到后端，音乐推荐通过后端代理调用本地 NeteaseCloudMusicApi Node 服务。

**Tech Stack:** Java 25, Spring Boot 3.5, Spring Web, Spring JDBC, H2 (dev) / MySQL (deploy), JdbcTemplate, 原生 HTML/CSS/JS, Nginx, NeteaseCloudMusicApi

## Global Constraints

- 配色：背景 `#000000`，前景 `#FFFFFF`，强调色 `#abbbf3`，辅助灰 `#747474`
- API 统一响应格式：`{"code": 200, "data": {...}, "message": "ok"}`
- 文章不支持标签/分类，无评论系统，无登录认证
- 所有 API 路径前缀 `/api/`
- Java package: `com.blog`
- 项目根目录: `blog/`

---

### Task 1: Spring Boot 项目骨架

**Files:**
- Create: `blog/backend/pom.xml`
- Create: `blog/backend/src/main/java/com/blog/BlogApplication.java`
- Create: `blog/backend/src/main/java/com/blog/config/WebConfig.java`
- Create: `blog/backend/src/main/resources/application.properties`

**Interfaces:**
- Produces: `BlogApplication` — Spring Boot 入口；`WebConfig` — 允许跨域；`application.properties` — H2 控制台、端口 8080、数据源配置

- [ ] **Step 1: 创建 pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.0</version>
    </parent>

    <groupId>com.blog</groupId>
    <artifactId>blog</artifactId>
    <version>0.0.1</version>
    <name>blog</name>

    <properties>
        <java.version>25</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc</artifactId>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: 创建 application.properties**

```properties
server.port=8080

# H2 数据库（开发环境）
spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=-1
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true

# 启动时执行 schema.sql 和 data.sql
spring.sql.init.mode=always
spring.sql.init.schema-locations=classpath:schema.sql
spring.sql.init.data-locations=classpath:data.sql
```

- [ ] **Step 3: 创建 BlogApplication.java**

```java
package com.blog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BlogApplication {
    public static void main(String[] args) {
        SpringApplication.run(BlogApplication.class, args);
    }
}
```

- [ ] **Step 4: 创建 WebConfig.java（CORS 配置）**

```java
package com.blog.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE");
            }
        };
    }
}
```

- [ ] **Step 5: 编译验证**

```bash
cd blog/backend && ./mvnw compile -q
```

Expected: BUILD SUCCESS，无错误。

- [ ] **Step 6: 启动验证**

```bash
cd blog/backend && ./mvnw spring-boot:run
```

Expected: 日志出现 `Started BlogApplication in ...`，`http://localhost:8080/h2-console` 可访问。

- [ ] **Step 7: Commit**

```bash
cd blog/backend && git init && git add -A && git commit -m "chore: init Spring Boot 3.5 project with CORS config"
```

---

### Task 2: 数据模型与数据库初始化

**Files:**
- Create: `blog/backend/src/main/java/com/blog/model/Article.java`
- Create: `blog/backend/src/main/java/com/blog/model/MusicRec.java`
- Create: `blog/backend/src/main/java/com/blog/model/ApiResponse.java`
- Create: `blog/backend/src/main/resources/schema.sql`
- Create: `blog/backend/src/main/resources/data.sql`

**Interfaces:**
- Consumes: `application.properties`（Task 1 中的 H2 配置）
- Produces: `Article`（id, title, summary, content, coverImage, viewCount, createdAt, updatedAt），`MusicRec`（id, songName, artist, coverUrl, linkUrl, createdAt），`ApiResponse<T>`（code, data, message, 泛型静态工厂方法），DDL + 种子数据

- [ ] **Step 1: 创建 Article.java**

```java
package com.blog.model;

import java.time.LocalDateTime;

public class Article {
    private Long id;
    private String title;
    private String summary;
    private String content;
    private String coverImage;
    private int viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Article() {}

    public Article(Long id, String title, String summary, String content,
                   String coverImage, int viewCount,
                   LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.coverImage = coverImage;
        this.viewCount = viewCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public int getViewCount() { return viewCount; }
    public void setViewCount(int viewCount) { this.viewCount = viewCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
```

- [ ] **Step 2: 创建 MusicRec.java**

```java
package com.blog.model;

import java.time.LocalDateTime;

public class MusicRec {
    private Long id;
    private String songName;
    private String artist;
    private String coverUrl;
    private String linkUrl;
    private LocalDateTime createdAt;

    public MusicRec() {}

    public MusicRec(Long id, String songName, String artist,
                    String coverUrl, String linkUrl, LocalDateTime createdAt) {
        this.id = id;
        this.songName = songName;
        this.artist = artist;
        this.coverUrl = coverUrl;
        this.linkUrl = linkUrl;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSongName() { return songName; }
    public void setSongName(String songName) { this.songName = songName; }
    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 3: 创建 ApiResponse.java**

```java
package com.blog.model;

public class ApiResponse<T> {
    private int code;
    private T data;
    private String message;

    private ApiResponse(int code, T data, String message) {
        this.code = code;
        this.data = data;
        this.message = message;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(200, data, "ok");
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, null, message);
    }

    public int getCode() { return code; }
    public T getData() { return data; }
    public String getMessage() { return message; }
}
```

- [ ] **Step 4: 创建 schema.sql**

```sql
CREATE TABLE IF NOT EXISTS articles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)  NOT NULL,
    summary     VARCHAR(500),
    content     TEXT          NOT NULL,
    cover_image VARCHAR(500),
    view_count  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS music_recs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    song_name   VARCHAR(200) NOT NULL,
    artist      VARCHAR(200),
    cover_url   VARCHAR(500),
    link_url    VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 5: 创建 data.sql（种子数据，5 篇示例文章 + 3 首示例音乐）**

```sql
INSERT INTO articles (title, summary, content, view_count, created_at, updated_at)
VALUES
('Spring Boot 入门笔记',
 '从零开始搭建第一个 Spring Boot REST API 的完整过程，包括项目初始化、依赖配置、第一个 Controller 和测试接口。',
 '## 环境准备\n\n- JDK 25\n- Maven Wrapper（无需安装 Maven）\n- IntelliJ IDEA\n\n## 创建项目\n\n使用 Spring Initializr 或手动编写 pom.xml...\n\n## 第一个接口\n\n```java\n@RestController\npublic class HelloController {\n    @GetMapping("/hello")\n    public String hello() {\n        return "Hello, Spring Boot!";\n    }\n}\n```\n\n启动项目后访问 `http://localhost:8080/hello` 即可看到返回结果。\n\n## 关键理解\n\nSpring Boot 的核心是**约定优于配置**：你只需要写业务代码，框架帮你处理配置、依赖、服务器等基础设施。',
 128, '2026-06-10 10:00:00', '2026-06-10 10:00:00'),

('Git 完全入门指南',
 '面向零基础新手的 Git 教程，涵盖初始化仓库、提交、分支、远程推送、合并等日常操作。',
 '## 为什么需要 Git\n\n代码版本管理是程序员的基本功。Git 让你可以：\n- 保存每次修改的快照\n- 回退到任意历史版本\n- 多人协作互不干扰\n\n## 基本操作\n\n```bash\ngit init           # 初始化仓库\ngit add .          # 暂存所有改动\ngit commit -m "msg" # 提交\ngit push           # 推送到远程\n```\n\n## 分支管理\n\n分支让你可以在不影响主线的情况下开发新功能。\n\n```bash\ngit branch feature/login   # 创建分支\ngit switch feature/login   # 切换分支\ngit merge feature/login    # 合并回主线\n```',
 256, '2026-06-15 14:30:00', '2026-06-15 14:30:00'),

('Java 集合框架速查',
 'ArrayList、HashMap、HashSet 的底层原理、时间复杂度、使用场景和常见面试题。',
 '## ArrayList\n\n底层是动态数组，随机访问 O(1)，插入删除 O(n)。\n\n```java\nList<String> list = new ArrayList<>();\nlist.add("hello");\nlist.get(0); // "hello"\n```\n\n## HashMap\n\n底层是数组+链表+红黑树（JDK 8+），get/put 平均 O(1)。\n\n```java\nMap<String, Integer> map = new HashMap<>();\nmap.put("key", 1);\nmap.get("key"); // 1\n```\n\n## 面试要点\n\n- HashMap 扩容机制：默认容量 16，负载因子 0.75，超过阈值时扩容为 2 倍\n- ArrayList vs LinkedList：随机访问用 ArrayList，频繁插入删除用 LinkedList',
 89, '2026-06-20 09:15:00', '2026-06-20 09:15:00'),

('Nginx 反向代理配置详解',
 '从安装到配置，手把手教你用 Nginx 部署静态网站并反向代理到后端 API 服务。',
 '## 安装 Nginx\n\n### Windows\n下载 Nginx 压缩包，解压后运行 `nginx.exe`。\n\n### Linux\n```bash\nsudo apt install nginx\nsudo systemctl start nginx\n```\n\n## 核心配置\n\n```nginx\nserver {\n    listen 80;\n    server_name example.com;\n\n    location / {\n        root /var/www/html;\n        index index.html;\n    }\n\n    location /api/ {\n        proxy_pass http://localhost:8080;\n    }\n}\n```\n\n## 关键理解\n\n`location /api/` 匹配所有以 `/api/` 开头的请求，`proxy_pass` 将请求转发到 Spring Boot。',
 67, '2026-07-01 16:45:00', '2026-07-01 16:45:00'),

('为什么我建议每个后端程序员先学 SQL',
 'SQL 是后端开发的基本功。本文从实际场景出发，解释为什么先学原生 SQL 再学 ORM 是更合理的学习路径。',
 '## 先学 SQL 的三个理由\n\n### 1. ORM 只是 SQL 的封装\n\nMyBatis、JPA、Hibernate 底层都是生成 SQL 语句。不理解 SQL 就理解不了 ORM 的行为。\n\n### 2. 问题排查绕不开 SQL\n\n线上慢查询、死锁、数据不一致——这些问题都需要你直接看 SQL 来分析。\n\n### 3. SQL 是通用的\n\nSQL 标准语法在 MySQL、PostgreSQL、Oracle 中大致相同，而 ORM 框架各家不同。\n\n## 建议的学习顺序\n\n1. 基本 CRUD 语句\n2. JOIN 和子查询\n3. 索引和查询优化\n4. 然后才学 JdbcTemplate / MyBatis\n5. 最后学 JPA / Hibernate',
 198, '2026-07-10 11:00:00', '2026-07-10 11:00:00');

INSERT INTO music_recs (song_name, artist, cover_url, link_url)
VALUES
('晴天', '周杰伦', 'https://p2.music.126.net/xxx1.jpg', 'https://music.163.com/song?id=186016'),
('Lemon', '米津玄師', 'https://p2.music.126.net/xxx2.jpg', 'https://music.163.com/song?id=536622304'),
('Stay', 'The Kid LAROI, Justin Bieber', 'https://p2.music.126.net/xxx3.jpg', 'https://music.163.com/song?id=1863364874');
```

- [ ] **Step 6: 编译验证**

```bash
cd blog/backend && ./mvnw compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 7: 启动验证数据库初始化**

```bash
cd blog/backend && ./mvnw spring-boot:run
```

启动后访问 `http://localhost:8080/h2-console`，用 JDBC URL `jdbc:h2:mem:blog` 连接，执行 `SELECT * FROM articles;` 应返回 5 行数据。

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add data models, schema, and seed data"
```

---

### Task 3: ArticleService — 文章业务逻辑

**Files:**
- Create: `blog/backend/src/main/java/com/blog/service/ArticleService.java`
- Create: `blog/backend/src/test/java/com/blog/service/ArticleServiceTest.java`

**Interfaces:**
- Consumes: `Article` model（Task 2），`JdbcTemplate`（Spring 自动注入），`schema.sql`（数据库表已建）
- Produces: `ArticleService` — `findAll(int page, int size)` → `List<Article>`，`findById(Long id)` → `Optional<Article>`，`findRandom()` → `Article`，`findDatesByMonth(int year, int month)` → `List<String>`，`getTotalWordCount()` → `long`，`getArticleCount()` → `int`

- [ ] **Step 1: 创建 ArticleService.java**

```java
package com.blog.service;

import com.blog.model.Article;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Service
public class ArticleService {

    private final JdbcTemplate jdbc;

    public ArticleService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Article> findAll(int page, int size) {
        int offset = (page - 1) * size;
        String sql = """
            SELECT id, title, summary, content, cover_image,
                   view_count, created_at, updated_at
            FROM articles
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """;
        return jdbc.query(sql, new ArticleRowMapper(), size, offset);
    }

    public Optional<Article> findById(Long id) {
        String sql = """
            SELECT id, title, summary, content, cover_image,
                   view_count, created_at, updated_at
            FROM articles WHERE id = ?
            """;
        List<Article> results = jdbc.query(sql, new ArticleRowMapper(), id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public Article findRandom() {
        String sql = """
            SELECT id, title, summary, content, cover_image,
                   view_count, created_at, updated_at
            FROM articles ORDER BY RANDOM() LIMIT 1
            """;
        List<Article> results = jdbc.query(sql, new ArticleRowMapper());
        return results.isEmpty() ? null : results.get(0);
    }

    public List<String> findDatesByMonth(int year, int month) {
        String sql = """
            SELECT DISTINCT CAST(created_at AS DATE) as article_date
            FROM articles
            WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
            ORDER BY article_date
            """;
        return jdbc.query(sql,
                (rs, rowNum) -> rs.getString("article_date"),
                year, month);
    }

    public long getTotalWordCount() {
        String sql = """
            SELECT COALESCE(SUM(CHAR_LENGTH(content)), 0)
            FROM articles
            """;
        Long result = jdbc.queryForObject(sql, Long.class);
        return result != null ? result : 0L;
    }

    public int getArticleCount() {
        String sql = "SELECT COUNT(*) FROM articles";
        Integer result = jdbc.queryForObject(sql, Integer.class);
        return result != null ? result : 0;
    }

    public void incrementViewCount(Long id) {
        String sql = """
            UPDATE articles SET view_count = view_count + 1,
            updated_at = CURRENT_TIMESTAMP WHERE id = ?
            """;
        jdbc.update(sql, id);
    }

    private static class ArticleRowMapper implements RowMapper<Article> {
        @Override
        public Article mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Article(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("summary"),
                rs.getString("content"),
                rs.getString("cover_image"),
                rs.getInt("view_count"),
                rs.getTimestamp("created_at").toLocalDateTime(),
                rs.getTimestamp("updated_at").toLocalDateTime()
            );
        }
    }
}
```

- [ ] **Step 2: 创建 ArticleServiceTest.java**

```java
package com.blog.service;

import com.blog.model.Article;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class ArticleServiceTest {

    @Autowired
    private ArticleService articleService;

    @Test
    void shouldFindAllWithPagination() {
        List<Article> page1 = articleService.findAll(1, 2);
        assertEquals(2, page1.size());
        // 按时间倒序，第一页应该是最新的文章
        assertTrue(page1.get(0).getCreatedAt()
                .isAfter(page1.get(1).getCreatedAt()));
    }

    @Test
    void shouldFindById() {
        List<Article> all = articleService.findAll(1, 10);
        assertFalse(all.isEmpty());

        Article first = all.get(0);
        Article found = articleService.findById(first.getId()).orElse(null);

        assertNotNull(found);
        assertEquals(first.getTitle(), found.getTitle());
    }

    @Test
    void shouldReturnEmptyForMissingId() {
        assertTrue(articleService.findById(99999L).isEmpty());
    }

    @Test
    void shouldFindRandom() {
        Article random = articleService.findRandom();
        assertNotNull(random);
        assertNotNull(random.getTitle());
    }

    @Test
    void shouldFindDatesByMonth() {
        // 种子数据中 2026 年 6 月有 3 篇文章
        List<String> dates = articleService.findDatesByMonth(2026, 6);
        assertFalse(dates.isEmpty());
        assertEquals(3, dates.size());
    }

    @Test
    void shouldReturnTotalWordCount() {
        long count = articleService.getTotalWordCount();
        assertTrue(count > 0, "种子数据中的文章应该有内容");
    }

    @Test
    void shouldReturnArticleCount() {
        int count = articleService.getArticleCount();
        assertEquals(5, count, "种子数据应包含 5 篇文章");
    }
}
```

- [ ] **Step 3: 运行测试**

```bash
cd blog/backend && ./mvnw test -q
```

Expected: Tests run: 6, Failures: 0, Errors: 0, Skipped: 0

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add ArticleService with pagination, random, date lookup, and stats"
```

---

### Task 4: ArticleController + StatsController

**Files:**
- Create: `blog/backend/src/main/java/com/blog/controller/ArticleController.java`
- Create: `blog/backend/src/main/java/com/blog/controller/StatsController.java`
- Create: `blog/backend/src/test/java/com/blog/controller/ArticleControllerTest.java`

**Interfaces:**
- Consumes: `ArticleService`（Task 3），`ApiResponse`（Task 2）
- Produces: `ArticleController` — `GET /api/articles`，`GET /api/articles/{id}`，`GET /api/articles/random`，`GET /api/articles/dates`；`StatsController` — `GET /api/site-stats`

- [ ] **Step 1: 创建 ArticleController.java**

```java
package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.model.Article;
import com.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/articles")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping
    public ApiResponse<List<Article>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size) {
        if (page < 1) page = 1;
        if (size < 1 || size > 20) size = 5;
        List<Article> articles = articleService.findAll(page, size);
        return ApiResponse.ok(articles);
    }

    @GetMapping("/{id}")
    public ApiResponse<Article> detail(@PathVariable Long id) {
        Optional<Article> article = articleService.findById(id);
        if (article.isPresent()) {
            articleService.incrementViewCount(id);
            return ApiResponse.ok(article.get());
        }
        return ApiResponse.error(404, "文章不存在");
    }

    @GetMapping("/random")
    public ApiResponse<Article> random() {
        Article article = articleService.findRandom();
        if (article != null) {
            return ApiResponse.ok(article);
        }
        return ApiResponse.error(404, "暂无文章");
    }

    @GetMapping("/dates")
    public ApiResponse<List<String>> dates(
            @RequestParam int year,
            @RequestParam int month) {
        List<String> dates = articleService.findDatesByMonth(year, month);
        return ApiResponse.ok(dates);
    }
}
```

- [ ] **Step 2: 创建 StatsController.java**

```java
package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.service.ArticleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class StatsController {

    private final ArticleService articleService;

    public StatsController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping("/site-stats")
    public ApiResponse<Map<String, Object>> stats() {
        Map<String, Object> stats = Map.of(
            "articleCount", articleService.getArticleCount(),
            "totalWordCount", articleService.getTotalWordCount()
        );
        return ApiResponse.ok(stats);
    }
}
```

- [ ] **Step 3: 创建 ArticleControllerTest.java**

```java
package com.blog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class ArticleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldListArticles() throws Exception {
        mockMvc.perform(get("/api/articles?page=1&size=3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    @Test
    void shouldGetArticleDetail() throws Exception {
        mockMvc.perform(get("/api/articles/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.title").isNotEmpty());
    }

    @Test
    void shouldReturn404ForMissingArticle() throws Exception {
        mockMvc.perform(get("/api/articles/99999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    void shouldGetRandomArticle() throws Exception {
        mockMvc.perform(get("/api/articles/random"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.title").isNotEmpty());
    }

    @Test
    void shouldGetDatesByMonth() throws Exception {
        mockMvc.perform(get("/api/articles/dates?year=2026&month=6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    @Test
    void shouldGetSiteStats() throws Exception {
        mockMvc.perform(get("/api/site-stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.articleCount").value(5))
                .andExpect(jsonPath("$.data.totalWordCount").isNumber());
    }
}
```

- [ ] **Step 4: 运行测试**

```bash
cd blog/backend && ./mvnw test -q
```

Expected: Tests run: 6, Failures: 0, Errors: 0, Skipped: 0（ArticleControllerTest）
加上 Task 3 的 6 个测试，共 12 个测试全部通过。

- [ ] **Step 5: 手动接口验证**

```bash
curl http://localhost:8080/api/articles?page=1&size=3
curl http://localhost:8080/api/articles/1
curl http://localhost:8080/api/articles/random
curl "http://localhost:8080/api/articles/dates?year=2026&month=6"
curl http://localhost:8080/api/site-stats
```

Expected: 所有接口返回统一 JSON 格式，`code: 200`。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add ArticleController, StatsController, and integration tests"
```

---

### Task 5: MusicService + MusicController（网易云 API 代理）

**Files:**
- Create: `blog/backend/src/main/java/com/blog/service/MusicService.java`
- Create: `blog/backend/src/main/java/com/blog/controller/MusicController.java`
- Create: `blog/backend/src/test/java/com/blog/controller/MusicControllerTest.java`

**Interfaces:**
- Consumes: `MusicRec` model（Task 2），`RestTemplate`（Spring 内置），NeteaseCloudMusicApi `localhost:3000`
- Produces: `MusicService` — `getRecommendations()` → `List<MusicRec>`；`MusicController` — `GET /api/music/recommendations`

- [ ] **Step 1: 创建 MusicService.java**

```java
package com.blog.service;

import com.blog.model.MusicRec;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MusicService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String NETEASE_API = "http://localhost:3000";

    @SuppressWarnings("unchecked")
    public List<MusicRec> getRecommendations() {
        try {
            String url = NETEASE_API + "/personalized?limit=6";
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null || !response.containsKey("result")) {
                return getFallbackRecommendations();
            }

            List<Map<String, Object>> playlists =
                    (List<Map<String, Object>>) response.get("result");

            List<MusicRec> recs = new ArrayList<>();
            for (Map<String, Object> pl : playlists) {
                MusicRec rec = new MusicRec();
                rec.setSongName((String) pl.get("name"));
                rec.setCoverUrl((String) pl.get("picUrl"));
                Number id = (Number) pl.get("id");
                rec.setLinkUrl("https://music.163.com/playlist?id=" + id);
                rec.setArtist("推荐歌单");
                recs.add(rec);
            }
            return recs;
        } catch (Exception e) {
            return getFallbackRecommendations();
        }
    }

    private List<MusicRec> getFallbackRecommendations() {
        // 当网易云 API 不可用时返回空列表，前端会显示 fallback 内容
        return List.of();
    }
}
```

- [ ] **Step 2: 创建 MusicController.java**

```java
package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.model.MusicRec;
import com.blog.service.MusicService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/music")
public class MusicController {

    private final MusicService musicService;

    public MusicController(MusicService musicService) {
        this.musicService = musicService;
    }

    @GetMapping("/recommendations")
    public ApiResponse<List<MusicRec>> recommendations() {
        List<MusicRec> recs = musicService.getRecommendations();
        return ApiResponse.ok(recs);
    }
}
```

- [ ] **Step 3: 创建 MusicControllerTest.java（用 Spring MockMvc 验证接口结构）**

```java
package com.blog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class MusicControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnMusicRecommendations() throws Exception {
        // 网易云 API 不可用时返回空列表（fallback），不报错
        mockMvc.perform(get("/api/music/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray());
    }
}
```

- [ ] **Step 4: 运行测试**

```bash
cd blog/backend && ./mvnw test -q
```

Expected: MusicControllerTest 通过（fallback 返回空数组），加上之前的 12 个测试，共 13 个全部通过。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add MusicService with NeteaseCloudMusicApi proxy and fallback"
```

---

### Task 6: 前端 CSS — 配色变量、布局、组件、动画

**Files:**
- Create: `blog/frontend/css/variables.css`
- Create: `blog/frontend/css/layout.css`
- Create: `blog/frontend/css/components.css`
- Create: `blog/frontend/css/animations.css`

**Interfaces:**
- Consumes: 配色方案 spec（`#000000`, `#FFFFFF`, `#abbbf3`, `#747474`）
- Produces: 4 个 CSS 文件，供 `index.html` 和 `article.html` 引用

- [ ] **Step 1: 创建 variables.css**

```css
:root {
    /* 主色 */
    --color-bg:        #000000;
    --color-text:      #FFFFFF;
    --color-accent:    #abbbf3;
    --color-muted:     #747474;

    /* 衍生 */
    --color-card:      rgba(255, 255, 255, 0.05);
    --color-card-hover:rgba(255, 255, 255, 0.10);
    --color-border:    rgba(255, 255, 255, 0.08);
    --color-sidebar:   rgba(255, 255, 255, 0.03);

    /* 排版 */
    --font-sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
    --font-mono: 'Consolas', 'Monaco', monospace;

    /* 间距 */
    --space-xs:  4px;
    --space-sm:  8px;
    --space-md:  16px;
    --space-lg:  24px;
    --space-xl:  32px;
    --space-2xl: 48px;

    /* 圆角 */
    --radius-sm: 8px;
    --radius-md: 16px;
    --radius-lg: 24px;
    --radius-squircle: 32px;  /* 参考网站的 squircle 风格 */

    /* 侧边栏 */
    --sidebar-width: 240px;
}
```

- [ ] **Step 2: 创建 layout.css**

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-sans);
    line-height: 1.6;
    min-height: 100vh;
}

/* === 双栏布局 === */
.app-layout {
    display: flex;
    min-height: 100vh;
}

/* 侧边栏 */
.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    background-color: var(--color-sidebar);
    border-right: 1px solid var(--color-border);
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    z-index: 10;
    overflow-y: auto;
}

.sidebar-brand {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-accent);
    text-decoration: none;
}

.sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.sidebar-nav a {
    color: var(--color-muted);
    text-decoration: none;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    transition: color 0.2s, background-color 0.2s;
    font-size: 0.95rem;
}

.sidebar-nav a:hover,
.sidebar-nav a.active {
    color: var(--color-accent);
    background-color: var(--color-card);
}

/* 主内容区 */
.main-content {
    margin-left: var(--sidebar-width);
    flex: 1;
    padding: var(--space-2xl);
    max-width: 900px;
}

/* 汉堡菜单按钮（移动端） */
.hamburger {
    display: none;
    position: fixed;
    top: var(--space-md);
    right: var(--space-md);
    z-index: 20;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 1.2rem;
    align-items: center;
    justify-content: center;
}

/* 移动端响应式 */
@media (max-width: 768px) {
    .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
    }

    .sidebar.open {
        transform: translateX(0);
    }

    .main-content {
        margin-left: 0;
        padding: var(--space-lg);
    }

    .hamburger {
        display: flex;
    }
}
```

- [ ] **Step 3: 创建 components.css**

```css
/* === 卡片（squircle 风格） === */
.card {
    background-color: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-squircle);
    padding: var(--space-lg);
    transition: transform 0.2s, background-color 0.2s, box-shadow 0.2s;
    cursor: pointer;
}

.card:hover {
    transform: scale(1.02);
    background-color: var(--color-card-hover);
    box-shadow: 0 4px 24px rgba(171, 187, 243, 0.08);
}

/* === 文章卡片 === */
.article-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.article-card .article-date {
    font-size: 0.85rem;
    color: var(--color-muted);
}

.article-card .article-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    text-decoration: none;
}

.article-card .article-title:hover {
    color: var(--color-accent);
}

.article-card .article-summary {
    font-size: 0.9rem;
    color: var(--color-muted);
    line-height: 1.5;
}

/* === 文章列表 === */
.article-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.section-title {
    font-size: 1rem;
    color: var(--color-muted);
    margin-bottom: var(--space-md);
    letter-spacing: 1px;
    text-transform: uppercase;
}

/* === 音乐卡片 === */
.music-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-md);
}

.music-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
}

.music-card .music-cover {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    animation: spin 20s linear infinite;
}

.music-card .music-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.music-card .music-name {
    font-size: 0.9rem;
    font-weight: 600;
}

.music-card .music-artist {
    font-size: 0.8rem;
    color: var(--color-muted);
}

/* === 日历小部件 === */
.calendar {
    background-color: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    width: fit-content;
}

.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    font-weight: 600;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--space-xs);
    text-align: center;
}

.calendar-grid .day-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    padding: var(--space-xs) 0;
}

.calendar-grid .day {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 0.85rem;
    cursor: default;
    position: relative;
}

.calendar-grid .day.has-article::after {
    content: '';
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: var(--color-accent);
}

.calendar-grid .day.empty {
    color: transparent;
}

/* === 插画展示区 === */
.illustration {
    max-width: 360px;
    margin: 0 auto var(--space-2xl);
    opacity: 0;
    transform: translateY(20px);
    animation: fadeInUp 0.8s ease forwards;
}

.illustration img {
    width: 100%;
    border-radius: var(--radius-squircle);
}

/* === 欢迎语 === */
.greeting {
    font-size: 1.8rem;
    font-weight: 300;
    margin-bottom: var(--space-2xl);
    line-height: 1.4;
}

.greeting .name {
    color: var(--color-accent);
    font-weight: 600;
}

/* === 社交链接 === */
.social-links {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-2xl);
    flex-wrap: wrap;
}

.social-links a {
    color: var(--color-muted);
    text-decoration: none;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    transition: color 0.2s, border-color 0.2s;
}

.social-links a:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
}

/* === 站点统计 === */
.site-stats {
    display: flex;
    gap: var(--space-lg);
    margin-bottom: var(--space-2xl);
    font-size: 0.85rem;
    color: var(--color-muted);
}

.site-stats span {
    font-weight: 600;
    color: var(--color-accent);
}

/* === 返回链接 === */
.back-link {
    display: inline-block;
    color: var(--color-accent);
    text-decoration: none;
    margin-bottom: var(--space-lg);
    font-size: 0.9rem;
}

.back-link:hover {
    text-decoration: underline;
}

/* === 文章详情 === */
.article-detail {
    max-width: 720px;
}

.article-detail .article-title {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: var(--space-sm);
    line-height: 1.3;
}

.article-detail .article-meta {
    color: var(--color-muted);
    font-size: 0.9rem;
    margin-bottom: var(--space-xl);
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
}

.article-detail .article-content {
    line-height: 1.8;
}

.article-detail .article-content h1,
.article-detail .article-content h2,
.article-detail .article-content h3 {
    color: var(--color-accent);
    margin-top: var(--space-xl);
    margin-bottom: var(--space-md);
}

.article-detail .article-content p {
    margin-bottom: var(--space-md);
}

.article-detail .article-content code {
    background-color: var(--color-card);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.9em;
}

.article-detail .article-content pre {
    background-color: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    overflow-x: auto;
    margin-bottom: var(--space-md);
}

.article-detail .article-content pre code {
    background: none;
    padding: 0;
}
```

- [ ] **Step 4: 创建 animations.css**

```css
/* 插画淡入上浮 */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 封面旋转 */
@keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}

/* 卡片入场（stagger） */
@keyframes fadeInCard {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.card-stagger {
    opacity: 0;
    animation: fadeInCard 0.4s ease forwards;
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add frontend CSS — dark theme, squircle cards, calendar, music cover spin"
```

---

### Task 7: 前端 HTML 页面

**Files:**
- Create: `blog/frontend/index.html`
- Create: `blog/frontend/article.html`
- Create: `blog/frontend/images/favicon.svg`
- Create: `blog/frontend/images/.gitkeep`

**Interfaces:**
- Consumes: 4 个 CSS 文件（Task 6），4 个 JS 文件（Task 8），后端 API（Task 4, 5）
- Produces: 首页 + 文章详情页，通过 JS 动态渲染内容

- [ ] **Step 1: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="个人博客 — 记录学习与思考">
    <title>lvy-neko</title>
    <link rel="stylesheet" href="css/variables.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/animations.css">
    <link rel="icon" href="images/favicon.svg" type="image/svg+xml">
</head>
<body>
    <div class="app-layout">
        <!-- 移动端汉堡按钮 -->
        <button class="hamburger" id="hamburger" aria-label="菜单">☰</button>

        <!-- 侧边栏 -->
        <aside class="sidebar" id="sidebar">
            <a href="index.html" class="sidebar-brand">lvy-neko</a>
            <nav class="sidebar-nav">
                <a href="#articles" class="active">📝 近期文章</a>
                <a href="#music">🎵 音乐推荐</a>
            </nav>
            <div style="margin-top: auto; font-size: 0.8rem; color: var(--color-muted);">
                (开发中)
            </div>
        </aside>

        <!-- 主内容区 -->
        <main class="main-content">
            <!-- 欢迎语 -->
            <div class="greeting" id="greeting"></div>

            <!-- 日历小部件 -->
            <div class="calendar" id="calendar"></div>

            <!-- 插画展示区 -->
            <div class="illustration">
                <img src="images/illustration.png" alt="illustration" id="illustration-img"
                     onerror="this.parentElement.style.display='none'">
            </div>

            <!-- 社交链接 -->
            <div class="social-links" id="social-links"></div>

            <!-- 随机推荐 -->
            <section id="random-article-section">
                <div class="section-title">🔀 随机推荐</div>
                <div id="random-article"></div>
            </section>

            <!-- 最新文章 -->
            <section id="articles">
                <div class="section-title">📝 最新文章</div>
                <div class="article-list" id="article-list"></div>
                <div id="article-pagination" style="margin-top: var(--space-lg);"></div>
            </section>

            <!-- 音乐推荐 -->
            <section id="music">
                <div class="section-title">🎵 音乐推荐</div>
                <div class="music-list" id="music-list"></div>
            </section>

            <!-- 站点统计 -->
            <div class="site-stats" id="site-stats" style="margin-top: var(--space-2xl);"></div>
        </main>
    </div>

    <script src="js/api.js"></script>
    <script src="js/calendar.js"></script>
    <script src="js/home.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 article.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文章 — lvy-neko</title>
    <link rel="stylesheet" href="css/variables.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/animations.css">
    <link rel="icon" href="images/favicon.svg" type="image/svg+xml">
</head>
<body>
    <div class="app-layout">
        <!-- 侧边栏 -->
        <aside class="sidebar" id="sidebar">
            <a href="index.html" class="sidebar-brand">lvy-neko</a>
            <nav class="sidebar-nav">
                <a href="index.html">📝 返回首页</a>
            </nav>
        </aside>

        <!-- 主内容区 -->
        <main class="main-content">
            <a href="index.html" class="back-link">← 返回首页</a>
            <article class="article-detail" id="article-detail"></article>
        </main>
    </div>

    <script src="js/api.js"></script>
    <script src="js/article.js"></script>
</body>
</html>
```

- [ ] **Step 3: 创建 favicon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y="0.9em" font-size="80">🐱</text>
</svg>
```

保存到 `blog/frontend/images/favicon.svg`。

- [ ] **Step 4: 创建 illustration.png 占位说明**

在 `blog/frontend/images/` 目录下创建 `.gitkeep`，插画图片后续自行放入。HTML 中已用 `onerror` 处理图片缺失的情况。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add frontend HTML pages — home with sidebar, article detail"
```

---

### Task 8: 前端 JavaScript

**Files:**
- Create: `blog/frontend/js/api.js`
- Create: `blog/frontend/js/calendar.js`
- Create: `blog/frontend/js/home.js`
- Create: `blog/frontend/js/article.js`

**Interfaces:**
- Consumes: 后端 REST API（Task 4, 5），HTML 结构（Task 7），CSS 类名（Task 6）
- Produces: `api.js` — `fetchArticles(page, size)`，`fetchArticle(id)`，`fetchRandomArticle()`，`fetchArticleDates(year, month)`，`fetchMusicRecommendations()`，`fetchSiteStats()`；`calendar.js` — `renderCalendar(year, month, articleDates)`；`home.js` — 首页渲染逻辑；`article.js` — 文章详情渲染 + Markdown 转 HTML

- [ ] **Step 1: 创建 api.js**

```javascript
const API_BASE = '/api';

async function fetchJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('API error:', url, err);
        return null;
    }
}

function fetchArticles(page = 1, size = 5) {
    return fetchJSON(`${API_BASE}/articles?page=${page}&size=${size}`);
}

function fetchArticle(id) {
    return fetchJSON(`${API_BASE}/articles/${id}`);
}

function fetchRandomArticle() {
    return fetchJSON(`${API_BASE}/articles/random`);
}

function fetchArticleDates(year, month) {
    return fetchJSON(`${API_BASE}/articles/dates?year=${year}&month=${month}`);
}

function fetchMusicRecommendations() {
    return fetchJSON(`${API_BASE}/music/recommendations`);
}

function fetchSiteStats() {
    return fetchJSON(`${API_BASE}/site-stats`);
}
```

- [ ] **Step 2: 创建 calendar.js**

```javascript
function renderCalendar(year, month, articleDates) {
    const container = document.getElementById('calendar');
    if (!container) return;

    const monthNames = [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const dateSet = new Set(articleDates || []);

    let html = `<div class="calendar-header">
        <span>${year}年 ${monthNames[month - 1]}</span>
    </div>`;

    html += '<div class="calendar-grid">';
    dayLabels.forEach(d => {
        html += `<div class="day-label">${d}</div>`;
    });

    // 填充空白
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="day empty"></div>';
    }

    // 日期
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasArticle = dateSet.has(dateStr) ? ' has-article' : '';
        html += `<div class="day${hasArticle}">${d}</div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}
```

- [ ] **Step 3: 创建 home.js**

```javascript
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

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
```

- [ ] **Step 4: 创建 article.js**

```javascript
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');

    if (!articleId) {
        document.getElementById('article-detail').innerHTML =
            '<p style="color: var(--color-muted);">未指定文章 ID</p>';
        return;
    }

    loadArticle(articleId);
});

function loadArticle(id) {
    fetchArticle(id).then(res => {
        const container = document.getElementById('article-detail');
        if (!container) return;

        if (res && res.code === 200 && res.data) {
            const article = res.data;
            const date = new Date(article.createdAt).toLocaleDateString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            document.title = `${article.title} — lvy-neko`;

            container.innerHTML = `
                <h1 class="article-title">${escapeHtml(article.title)}</h1>
                <div class="article-meta">📅 ${date} · 👁 ${article.viewCount} 次阅读</div>
                <div class="article-content">${simpleMarkdown(article.content)}</div>
            `;
        } else {
            container.innerHTML = '<p style="color: var(--color-muted);">文章不存在</p>';
        }
    });
}

function simpleMarkdown(md) {
    if (!md) return '';
    return md
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
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add frontend JavaScript — API client, calendar, home rendering, Markdown parser"
```

---

### Task 9: Nginx 配置与部署

**Files:**
- Create: `blog/deploy/nginx.conf`
- Create: `blog/deploy/application-mysql.properties`

**Interfaces:**
- Consumes: 前端静态文件（`blog/frontend/`），Spring Boot jar（`blog/backend/target/blog-0.0.1.jar`）
- Produces: Nginx 配置文件，MySQL 部署配置

- [ ] **Step 1: 创建 nginx.conf**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP

    # 前端静态文件
    root /var/www/blog/frontend;
    index index.html;

    # 静态文件直接返回
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 请求反向代理到 Spring Boot
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态资源缓存
    location ~* \.(css|js|png|jpg|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 2: 创建 MySQL 部署配置 application-mysql.properties**

```properties
server.port=8080

# MySQL 数据库（部署环境）
spring.datasource.url=jdbc:mysql://localhost:3306/blog?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.username=blog_user
spring.datasource.password=your_password_here

spring.sql.init.mode=always
spring.sql.init.schema-locations=classpath:schema.sql
```

- [ ] **Step 3: 编写部署步骤文档（README）**

在 `blog/README.md` 中：

```markdown
# 个人博客部署指南

## 环境要求
- Java 25
- Node.js 22+（NeteaseCloudMusicApi）
- Nginx
- MySQL 8.0+

## 部署步骤

### 1. 构建后端
```bash
cd backend
./mvnw clean package -DskipTests
# 产物：target/blog-0.0.1.jar
```

### 2. 部署后端
```bash
# 复制到服务器
scp target/blog-0.0.1.jar user@server:/opt/blog/

# 在服务器上启动
java -jar /opt/blog/blog-0.0.1.jar --spring.config.location=/opt/blog/application-mysql.properties &
```

### 3. 部署前端
```bash
# 复制前端文件到 Nginx 目录
scp -r frontend/* user@server:/var/www/blog/frontend/
```

### 4. 配置 Nginx
```bash
# 复制配置
scp deploy/nginx.conf user@server:/etc/nginx/sites-available/blog
# 启用
ssh user@server "ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/ && nginx -t && nginx -s reload"
```

### 5. 启动 NeteaseCloudMusicApi
```bash
git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git
cd NeteaseCloudMusicApi
npm install
node app.js  # 默认监听 :3000
```

### 6. 初始化数据库
```sql
CREATE DATABASE blog CHARACTER SET utf8mb4;
CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL ON blog.* TO 'blog_user'@'localhost';
```

表结构由 Spring Boot 启动时自动执行 `schema.sql` 创建。
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Nginx config, MySQL deployment config, and README"
```

---

## Task Summary

| Task | 产出 | 测试 |
|------|------|------|
| 1. 项目骨架 | pom.xml, Application, WebConfig, properties | 编译 + 启动 |
| 2. 数据模型 | Article, MusicRec, ApiResponse, DDL, 种子数据 | H2 Console 查询 |
| 3. ArticleService | 文章业务逻辑 | 6 个单元测试 |
| 4. 文章 + 统计接口 | ArticleController, StatsController | 6 个集成测试 |
| 5. 音乐接口 | MusicService, MusicController | 1 个集成测试 |
| 6. 前端 CSS | 4 个 CSS 文件 | 浏览器预览 |
| 7. 前端 HTML | index.html, article.html | 浏览器预览 |
| 8. 前端 JS | 4 个 JS 文件 | 浏览器预览 + API 联调 |
| 9. Nginx 部署 | nginx.conf, 部署文档 | 服务器验证 |

**总计：9 个任务，13 个自动化测试，约 1000 行 Java + 500 行前端代码。**
