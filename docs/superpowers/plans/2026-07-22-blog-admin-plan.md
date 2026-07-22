# 博客后台管理系统 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为「不如睡觉」个人博客添加 Spring Security + JWT 认证 + 侧滑抽屉式后台管理面板

**Architecture:** Spring Security Filter Chain 保护 `/api/admin/**` 路径，JWT（jjwt）24h 过期，BCrypt 密码加密。前端通过 JS 动态注入固定定位抽屉面板到现有页面，marked.js 做 Markdown 实时预览。

**Tech Stack:** Spring Boot 3.5, Java 25, JdbcTemplate, H2/MySQL, Spring Security, jjwt 0.12.6, BCrypt, vanilla HTML/CSS/JS, marked.js

## Global Constraints

- Java 25, Spring Boot 3.5, JdbcTemplate（不引入 JPA/MyBatis）
- 遵循现有代码风格：构造器注入、ApiResponse<T> 统一返回、`"""` text block SQL
- 公开 GET API 只返回 status='PUBLISHED' 的文章
- 密码 BCrypt 加密存储
- JWT 过期时间 24 小时
- 图片上传限制 ≤5MB，仅 jpg/png/gif/webp
- 抽屉宽度 420px，复用现有 CSS 变量（--color-*, --radius-*, --space-*）

---

### Task 1: 添加依赖

**Files:**
- Modify: `blog/backend/pom.xml`

**Interfaces:**
- Produces: `spring-boot-starter-security`, `jjwt-api`, `jjwt-impl`, `jjwt-jackson` 三个 jjwt 依赖供所有后续任务使用

- [ ] **Step 1: 在 pom.xml 的 `<dependencies>` 中添加四个新依赖**

```xml
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

插入位置：在 `spring-boot-starter-test` 依赖之后、`</dependencies>` 之前。

- [ ] **Step 2: 验证依赖下载成功**

```bash
cd blog/backend && mvn dependency:resolve -q
```

Expected: BUILD SUCCESS，无错误。

- [ ] **Step 3: 提交**

```bash
git add blog/backend/pom.xml
git commit -m "build: add Spring Security and jjwt dependencies"
```

---

### Task 2: 数据库 Schema 和种子数据

**Files:**
- Modify: `blog/backend/src/main/resources/schema.sql`
- Modify: `blog/backend/src/main/resources/data.sql`

**Interfaces:**
- Produces: 新表 `users`, `categories`, `tags`, `article_tags`, `comments`；articles 表新增 `status`, `category_id` 列；admin 种子用户

- [ ] **Step 1: 更新 schema.sql — 扩展 articles 表 + 新增 5 张表**

在现有 `CREATE TABLE IF NOT EXISTS articles` 语句中，`updated_at` 后新增两列：

```sql
CREATE TABLE IF NOT EXISTS articles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)  NOT NULL,
    summary     VARCHAR(500),
    content     TEXT          NOT NULL,
    cover_image VARCHAR(500),
    view_count  INT DEFAULT 0,
    status      VARCHAR(20)  DEFAULT 'PUBLISHED',
    category_id BIGINT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

在现有 music_recs 建表语句之后追加：

```sql
CREATE TABLE IF NOT EXISTS users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    slug       VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    slug       VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS article_tags (
    article_id BIGINT NOT NULL,
    tag_id     BIGINT NOT NULL,
    PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS comments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    article_id  BIGINT NOT NULL,
    author_name VARCHAR(50) NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: 生成 BCrypt 密码哈希**

在 `blog/backend` 目录下创建临时文件 `HashGenerator.java`：

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashGenerator {
    public static void main(String[] args) {
        System.out.println(new BCryptPasswordEncoder().encode("admin123"));
    }
}
```

由于 spring-boot-starter-security 已在 Task 1 添加到 classpath，直接运行：

```bash
cd blog/backend
# 编译并运行（利用 Maven 管理的 classpath）
mvn -q exec:java -Dexec.mainClass="HashGenerator" 2>/dev/null || \
  java -cp "target/classes:$(mvn -q dependency:build-classpath -Dmdep.outputFile=/dev/stdout)" HashGenerator
```

如果上面命令不成功（因为 HashGenerator 还没编译到 target），改用更简单的方式：在已有 Spring Boot 测试中临时加一行打印，或者直接在 data.sql 中使用一个预先计算好的已知哈希。

**备用方案**：使用已知 BCrypt 哈希值。对密码 `admin123`，一个有效的 BCrypt 哈希是：
```
$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36PQm4sEPhMNPfIYULoBhFW
```
（如果此哈希校验不通过，启动应用后在 AuthController 测试中会发现。届时用 Spring Boot 自带的 `BCryptPasswordEncoder` 重新生成并替换即可。）

- [ ] **Step 3: 更新 data.sql — 添加 admin 用户 + 分类 + 标签**

在现有 data.sql 末尾追加（`<BCRYPT_HASH>` 替换为 Step 2 生成的哈希）：

```sql
INSERT INTO users (username, password) VALUES ('admin', '<BCRYPT_HASH>');

INSERT INTO categories (name, slug) VALUES
('技术', 'tech'),
('生活', 'life'),
('笔记', 'notes');

INSERT INTO tags (name, slug) VALUES
('Java', 'java'),
('Spring Boot', 'spring-boot'),
('前端', 'frontend'),
('Git', 'git'),
('Nginx', 'nginx'),
('SQL', 'sql');

INSERT INTO comments (article_id, author_name, content, created_at) VALUES
(1, '小明', '写得很清楚，跟着做成功了！', '2026-06-12 15:00:00'),
(1, '小红', '请问 JDK 版本最低要求是多少？', '2026-06-13 09:00:00'),
(2, '小刚', 'Git 确实比 SVN 好用多了', '2026-06-18 20:00:00');
```

- [ ] **Step 4: 验证应用启动正常**

```bash
cd blog/backend && mvn spring-boot:run
```

等待启动后访问 `http://localhost:8081/h2-console`，确认新表存在。然后 Ctrl+C 停止。

- [ ] **Step 5: 删除临时文件 + 提交**

```bash
rm -f blog/backend/HashGenerator.java
git add blog/backend/src/main/resources/schema.sql blog/backend/src/main/resources/data.sql
git commit -m "feat: add users/categories/tags/comments tables and seed data"
```

---

### Task 3: 新模型类

**Files:**
- Create: `blog/backend/src/main/java/com/blog/model/LoginRequest.java`
- Create: `blog/backend/src/main/java/com/blog/model/LoginResponse.java`
- Create: `blog/backend/src/main/java/com/blog/model/Category.java`
- Create: `blog/backend/src/main/java/com/blog/model/Tag.java`
- Create: `blog/backend/src/main/java/com/blog/model/Comment.java`

**Interfaces:**
- Produces: `LoginRequest(String username, String password)`, `LoginResponse(String token, String username)`, `Category(Long id, String name, String slug, LocalDateTime createdAt)`, `Tag(Long id, String name, String slug, LocalDateTime createdAt)`, `Comment(Long id, Long articleId, String authorName, String content, LocalDateTime createdAt)` — 全字段 getter/setter + 无参构造器

- [ ] **Step 1: 创建 LoginRequest.java**

```java
package com.blog.model;

public class LoginRequest {
    private String username;
    private String password;

    public LoginRequest() {}

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
```

- [ ] **Step 2: 创建 LoginResponse.java**

```java
package com.blog.model;

public class LoginResponse {
    private String token;
    private String username;

    public LoginResponse() {}

    public LoginResponse(String token, String username) {
        this.token = token;
        this.username = username;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
}
```

- [ ] **Step 3: 创建 Category.java**

```java
package com.blog.model;

import java.time.LocalDateTime;

public class Category {
    private Long id;
    private String name;
    private String slug;
    private LocalDateTime createdAt;

    public Category() {}

    public Category(Long id, String name, String slug, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 4: 创建 Tag.java**

```java
package com.blog.model;

import java.time.LocalDateTime;

public class Tag {
    private Long id;
    private String name;
    private String slug;
    private LocalDateTime createdAt;

    public Tag() {}

    public Tag(Long id, String name, String slug, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 5: 创建 Comment.java**

```java
package com.blog.model;

import java.time.LocalDateTime;

public class Comment {
    private Long id;
    private Long articleId;
    private String authorName;
    private String content;
    private LocalDateTime createdAt;

    public Comment() {}

    public Comment(Long id, Long articleId, String authorName,
                   String content, LocalDateTime createdAt) {
        this.id = id;
        this.articleId = articleId;
        this.authorName = authorName;
        this.content = content;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getArticleId() { return articleId; }
    public void setArticleId(Long articleId) { this.articleId = articleId; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 6: 编译验证**

```bash
cd blog/backend && mvn compile -q
```

Expected: BUILD SUCCESS。

- [ ] **Step 7: 提交**

```bash
git add blog/backend/src/main/java/com/blog/model/LoginRequest.java \
        blog/backend/src/main/java/com/blog/model/LoginResponse.java \
        blog/backend/src/main/java/com/blog/model/Category.java \
        blog/backend/src/main/java/com/blog/model/Tag.java \
        blog/backend/src/main/java/com/blog/model/Comment.java
git commit -m "feat: add LoginRequest/LoginResponse/Category/Tag/Comment models"
```

---

### Task 4: JWT 工具类 + 单元测试

**Files:**
- Create: `blog/backend/src/main/java/com/blog/security/JwtUtil.java`
- Create: `blog/backend/src/test/java/com/blog/security/JwtUtilTest.java`

**Interfaces:**
- Produces: `JwtUtil(String secretKey)` 构造器, `String generateToken(String username)`, `String extractUsername(String token)`, `boolean isTokenValid(String token)`
- Consumes: jjwt 依赖（Task 1）

- [ ] **Step 1: 编写 JwtUtilTest（TDD — 先写测试）**

```java
package com.blog.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil("my-secret-key-for-testing-purposes-12345");
    }

    @Test
    void shouldGenerateToken() {
        String token = jwtUtil.generateToken("admin");
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void shouldExtractUsername() {
        String token = jwtUtil.generateToken("admin");
        String username = jwtUtil.extractUsername(token);
        assertEquals("admin", username);
    }

    @Test
    void shouldValidateValidToken() {
        String token = jwtUtil.generateToken("admin");
        assertTrue(jwtUtil.isTokenValid(token));
    }

    @Test
    void shouldRejectInvalidToken() {
        assertFalse(jwtUtil.isTokenValid("invalid.token.here"));
    }

    @Test
    void shouldRejectExpiredToken() {
        // 创建一个极短过期时间的 JwtUtil 实例来测试过期
        JwtUtil shortLived = new JwtUtil("test-key-for-expired-token-1234567", 1); // 1ms 过期
        String token = shortLived.generateToken("admin");
        // 等待 token 过期
        try { Thread.sleep(10); } catch (InterruptedException e) { /* ignore */ }
        assertFalse(shortLived.isTokenValid(token));
    }
}
```

- [ ] **Step 2: 运行测试 — 预期全部 FAIL（类不存在）**

```bash
cd blog/backend && mvn test -Dtest=JwtUtilTest -q
```

Expected: BUILD FAILURE，编译错误（JwtUtil 类不存在）。

- [ ] **Step 3: 实现 JwtUtil.java**

```java
package com.blog.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.util.Date;

public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(String secretKey) {
        this(secretKey, 24 * 60 * 60 * 1000); // 默认 24h
    }

    public JwtUtil(String secretKey, long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
        this.expirationMs = expirationMs;
    }

    public String generateToken(String username) {
        Date now = new Date();
        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException | MalformedJwtException
                 | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

- [ ] **Step 4: 运行测试 — 预期全部 PASS**

```bash
cd blog/backend && mvn test -Dtest=JwtUtilTest -q
```

Expected: Tests run: 5, Failures: 0, BUILD SUCCESS。

- [ ] **Step 5: 提交**

```bash
git add blog/backend/src/main/java/com/blog/security/JwtUtil.java \
        blog/backend/src/test/java/com/blog/security/JwtUtilTest.java
git commit -m "feat: add JwtUtil with token generation, validation, and expiry"
```

---

### Task 5: SecurityConfig + JwtAuthFilter + 集成测试

**Files:**
- Create: `blog/backend/src/main/java/com/blog/security/JwtAuthFilter.java`
- Create: `blog/backend/src/main/java/com/blog/config/SecurityConfig.java`
- Create: `blog/backend/src/test/java/com/blog/config/SecurityConfigTest.java`

**Interfaces:**
- Consumes: `JwtUtil`（Task 4）
- Produces: Spring Security Filter Chain 配置 — `/api/auth/login` 公开，`/api/admin/**` 需 JWT，其他 `/api/**` GET 公开

- [ ] **Step 1: 实现 JwtAuthFilter.java**

```java
package com.blog.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                String username = jwtUtil.extractUsername(token);
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                username, null, Collections.emptyList());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
```

- [ ] **Step 2: 实现 SecurityConfig.java**

```java
package com.blog.config;

import com.blog.security.JwtAuthFilter;
import com.blog.security.JwtUtil;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtUtil jwtUtil() {
        // 生产环境应从配置文件读取
        return new JwtUtil("blog-jwt-secret-key-must-be-at-least-256-bits!!");
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtUtil jwtUtil) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/**").permitAll()
                .requestMatchers("/api/admin/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(new JwtAuthFilter(jwtUtil),
                    UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

- [ ] **Step 3: 编写 SecurityConfigTest.java（集成测试）**

```java
package com.blog.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldAllowPublicGetToArticles() throws Exception {
        mockMvc.perform(get("/api/articles"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldAllowPublicGetToSiteStats() throws Exception {
        mockMvc.perform(get("/api/site-stats"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldBlockUnauthenticatedAccessToAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/articles"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void shouldAllowLoginWithoutAuth() throws Exception {
        // 此时 AuthController 还未创建，先验证不会被 Security 拦截
        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk()); // 会 404 但不会 401/403
    }
}
```

- [ ] **Step 4: 运行集成测试**

```bash
cd blog/backend && mvn test -Dtest=SecurityConfigTest -q
```

Expected: `shouldAllowPublicGetToArticles` 和 `shouldAllowPublicGetToSiteStats` 通过（200）；`shouldBlockUnauthenticatedAccessToAdmin` 通过（401/403）；`shouldAllowLoginWithoutAuth` 通过（不被 Security 拦截，返回 404 因为 Controller 还不存在）。

- [ ] **Step 5: 提交**

```bash
git add blog/backend/src/main/java/com/blog/security/JwtAuthFilter.java \
        blog/backend/src/main/java/com/blog/config/SecurityConfig.java \
        blog/backend/src/test/java/com/blog/config/SecurityConfigTest.java
git commit -m "feat: add SecurityConfig with JWT filter for /api/admin/** protection"
```

---

### Task 6: AuthController + 集成测试

**Files:**
- Create: `blog/backend/src/main/java/com/blog/controller/AuthController.java`
- Create: `blog/backend/src/test/java/com/blog/controller/AuthControllerTest.java`

**Interfaces:**
- Consumes: `JwtUtil`（Task 4）, `PasswordEncoder`（Task 5）, `JdbcTemplate`（Spring 自动注入）, `LoginRequest` / `LoginResponse`（Task 3）
- Produces: `POST /api/auth/login` → `ApiResponse<LoginResponse>`

- [ ] **Step 1: 编写 AuthControllerTest（TDD）**

```java
package com.blog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldLoginSuccessfully() throws Exception {
        String body = "{\"username\":\"admin\",\"password\":\"admin123\"}";
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.username").value("admin"));
    }

    @Test
    void shouldFailLoginWithWrongPassword() throws Exception {
        String body = "{\"username\":\"admin\",\"password\":\"wrong\"}";
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void shouldFailLoginWithMissingUser() throws Exception {
        String body = "{\"username\":\"nobody\",\"password\":\"admin123\"}";
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401));
    }
}
```

- [ ] **Step 2: 运行测试 — 预期 FAIL（AuthController 不存在）**

```bash
cd blog/backend && mvn test -Dtest=AuthControllerTest -q
```

Expected: BUILD FAILURE。

- [ ] **Step 3: 实现 AuthController.java**

```java
package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.model.LoginRequest;
import com.blog.model.LoginResponse;
import com.blog.security.JwtUtil;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;

    public AuthController(JwtUtil jwtUtil, PasswordEncoder passwordEncoder,
                          JdbcTemplate jdbc) {
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request) {
        var results = jdbc.query(
                "SELECT password FROM users WHERE username = ?",
                (rs, rowNum) -> rs.getString("password"),
                request.getUsername());

        if (results.isEmpty()) {
            return ApiResponse.error(401, "用户名或密码错误");
        }

        String storedHash = results.get(0);
        if (!passwordEncoder.matches(request.getPassword(), storedHash)) {
            return ApiResponse.error(401, "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(request.getUsername());
        return ApiResponse.ok(new LoginResponse(token, request.getUsername()));
    }
}
```

- [ ] **Step 4: 运行测试 — 预期 PASS（如果密码哈希不匹配，回到 Task 2 重新生成）**

```bash
cd blog/backend && mvn test -Dtest=AuthControllerTest -q
```

Expected: Tests run: 3, Failures: 0, BUILD SUCCESS。
如果 `shouldLoginSuccessfully` 失败（密码哈希不匹配），返回 Task 2 Step 2 重新生成 BCrypt 哈希并更新 data.sql。

- [ ] **Step 5: 提交**

```bash
git add blog/backend/src/main/java/com/blog/controller/AuthController.java \
        blog/backend/src/test/java/com/blog/controller/AuthControllerTest.java
git commit -m "feat: add AuthController with JWT login endpoint"
```

---

### Task 7: AdminService + 单元测试

**Files:**
- Create: `blog/backend/src/main/java/com/blog/service/AdminService.java`
- Create: `blog/backend/src/test/java/com/blog/service/AdminServiceTest.java`

**Interfaces:**
- Consumes: `JdbcTemplate`（Spring 自动注入）, `Category` / `Tag` / `Comment` / `Article` 模型（Task 3）
- Produces: AdminService 包含文章 CRUD、分类 CRUD、标签 CRUD、评论删除、图片上传保存

- [ ] **Step 1: 编写 AdminServiceTest（TDD）**

```java
package com.blog.service;

import com.blog.model.Article;
import com.blog.model.Category;
import com.blog.model.Comment;
import com.blog.model.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminServiceTest {

    @Autowired
    private AdminService adminService;

    @Test
    void shouldFindAllArticlesIncludingDrafts() {
        List<Article> articles = adminService.findAllArticles();
        assertNotNull(articles);
        assertTrue(articles.size() >= 5); // seed data has 5 articles
    }

    @Test
    void shouldCreateAndDeleteArticle() {
        Article article = new Article();
        article.setTitle("Test Article");
        article.setContent("Test content");
        article.setStatus("DRAFT");
        article.setCategoryId(1L);

        Article created = adminService.createArticle(article);
        assertNotNull(created.getId());
        assertEquals("DRAFT", created.getStatus());

        adminService.deleteArticle(created.getId());
        // 验证已删除：再次查询应该不包含
        List<Article> after = adminService.findAllArticles();
        assertTrue(after.stream().noneMatch(a -> a.getId().equals(created.getId())));
    }

    @Test
    void shouldUpdateArticle() {
        Article article = new Article();
        article.setTitle("Before Update");
        article.setContent("Content");
        article.setStatus("DRAFT");
        Article created = adminService.createArticle(article);

        created.setTitle("After Update");
        created.setStatus("PUBLISHED");
        adminService.updateArticle(created);

        List<Article> articles = adminService.findAllArticles();
        Article updated = articles.stream()
                .filter(a -> a.getId().equals(created.getId()))
                .findFirst().orElseThrow();
        assertEquals("After Update", updated.getTitle());
        assertEquals("PUBLISHED", updated.getStatus());

        adminService.deleteArticle(created.getId());
    }

    @Test
    void shouldFindAllCategories() {
        List<Category> categories = adminService.findAllCategories();
        assertTrue(categories.size() >= 3);
    }

    @Test
    void shouldCreateAndDeleteCategory() {
        Category cat = adminService.createCategory("测试分类", "test-cat");
        assertNotNull(cat.getId());
        assertEquals("测试分类", cat.getName());

        adminService.deleteCategory(cat.getId());
    }

    @Test
    void shouldUpdateCategory() {
        Category cat = adminService.createCategory("旧名称", "old-slug");
        adminService.updateCategory(cat.getId(), "新名称", "new-slug");

        List<Category> all = adminService.findAllCategories();
        Category updated = all.stream()
                .filter(c -> c.getId().equals(cat.getId()))
                .findFirst().orElseThrow();
        assertEquals("新名称", updated.getName());
        assertEquals("new-slug", updated.getSlug());

        adminService.deleteCategory(cat.getId());
    }

    @Test
    void shouldFindAllTags() {
        List<Tag> tags = adminService.findAllTags();
        assertTrue(tags.size() >= 6);
    }

    @Test
    void shouldCreateAndDeleteTag() {
        Tag tag = adminService.createTag("Docker", "docker");
        assertNotNull(tag.getId());

        adminService.deleteTag(tag.getId());
    }

    @Test
    void shouldFindAllComments() {
        List<Comment> comments = adminService.findAllComments();
        assertTrue(comments.size() >= 3);
    }

    @Test
    void shouldDeleteComment() {
        List<Comment> before = adminService.findAllComments();
        if (!before.isEmpty()) {
            adminService.deleteComment(before.get(0).getId());
            List<Comment> after = adminService.findAllComments();
            assertEquals(before.size() - 1, after.size());
        }
    }
}
```

- [ ] **Step 2: 运行测试 — 预期 FAIL（AdminService 不存在）**

```bash
cd blog/backend && mvn test -Dtest=AdminServiceTest -q
```

Expected: BUILD FAILURE。

- [ ] **Step 3: 实现 AdminService.java**

```java
package com.blog.service;

import com.blog.model.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminService {

    private final JdbcTemplate jdbc;

    public AdminService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ===== 文章管理 =====

    public List<Article> findAllArticles() {
        String sql = """
            SELECT id, title, summary, content, cover_image,
                   view_count, status, category_id, created_at, updated_at
            FROM articles
            ORDER BY created_at DESC
            """;
        return jdbc.query(sql, new ArticleRowMapper());
    }

    public Article createArticle(Article article) {
        String sql = """
            INSERT INTO articles (title, summary, content, cover_image, status, category_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, article.getTitle());
            ps.setString(2, article.getSummary());
            ps.setString(3, article.getContent());
            ps.setString(4, article.getCoverImage());
            ps.setString(5, article.getStatus() != null ? article.getStatus() : "DRAFT");
            if (article.getCategoryId() != null) {
                ps.setLong(6, article.getCategoryId());
            } else {
                ps.setNull(6, Types.BIGINT);
            }
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key != null) {
            article.setId(key.longValue());
        }
        return article;
    }

    public void updateArticle(Article article) {
        String sql = """
            UPDATE articles
            SET title = ?, summary = ?, content = ?, cover_image = ?,
                status = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;
        jdbc.update(sql,
                article.getTitle(),
                article.getSummary(),
                article.getContent(),
                article.getCoverImage(),
                article.getStatus(),
                article.getCategoryId(),
                article.getId());
    }

    public void deleteArticle(Long id) {
        jdbc.update("DELETE FROM article_tags WHERE article_id = ?", id);
        jdbc.update("DELETE FROM comments WHERE article_id = ?", id);
        jdbc.update("DELETE FROM articles WHERE id = ?", id);
    }

    // ===== 分类管理 =====

    public List<Category> findAllCategories() {
        String sql = "SELECT id, name, slug, created_at FROM categories ORDER BY id";
        return jdbc.query(sql, (rs, rowNum) -> new Category(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("slug"),
                rs.getTimestamp("created_at").toLocalDateTime()));
    }

    public Category createCategory(String name, String slug) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO categories (name, slug) VALUES (?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name);
            ps.setString(2, slug);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        Category cat = new Category();
        cat.setId(key != null ? key.longValue() : null);
        cat.setName(name);
        cat.setSlug(slug);
        return cat;
    }

    public void updateCategory(Long id, String name, String slug) {
        jdbc.update("UPDATE categories SET name = ?, slug = ? WHERE id = ?",
                name, slug, id);
    }

    public void deleteCategory(Long id) {
        jdbc.update("UPDATE articles SET category_id = NULL WHERE category_id = ?", id);
        jdbc.update("DELETE FROM categories WHERE id = ?", id);
    }

    // ===== 标签管理 =====

    public List<Tag> findAllTags() {
        String sql = "SELECT id, name, slug, created_at FROM tags ORDER BY id";
        return jdbc.query(sql, (rs, rowNum) -> new Tag(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("slug"),
                rs.getTimestamp("created_at").toLocalDateTime()));
    }

    public Tag createTag(String name, String slug) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO tags (name, slug) VALUES (?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name);
            ps.setString(2, slug);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        Tag tag = new Tag();
        tag.setId(key != null ? key.longValue() : null);
        tag.setName(name);
        tag.setSlug(slug);
        return tag;
    }

    public void deleteTag(Long id) {
        jdbc.update("DELETE FROM article_tags WHERE tag_id = ?", id);
        jdbc.update("DELETE FROM tags WHERE id = ?", id);
    }

    // ===== 评论管理 =====

    public List<Comment> findAllComments() {
        String sql = """
            SELECT id, article_id, author_name, content, created_at
            FROM comments ORDER BY created_at DESC
            """;
        return jdbc.query(sql, (rs, rowNum) -> new Comment(
                rs.getLong("id"),
                rs.getLong("article_id"),
                rs.getString("author_name"),
                rs.getString("content"),
                rs.getTimestamp("created_at").toLocalDateTime()));
    }

    public void deleteComment(Long id) {
        jdbc.update("DELETE FROM comments WHERE id = ?", id);
    }

    // ===== RowMapper（匹配加了 status/category_id 的 articles 表）=====

    private static class ArticleRowMapper implements RowMapper<Article> {
        @Override
        public Article mapRow(ResultSet rs, int rowNum) throws SQLException {
            Article article = new Article(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("summary"),
                rs.getString("content"),
                rs.getString("cover_image"),
                rs.getInt("view_count"),
                rs.getTimestamp("created_at").toLocalDateTime(),
                rs.getTimestamp("updated_at").toLocalDateTime()
            );
            article.setStatus(rs.getString("status"));
            long catId = rs.getLong("category_id");
            if (!rs.wasNull()) {
                article.setCategoryId(catId);
            }
            return article;
        }
    }
}
```

- [ ] **Step 4: 运行测试 — 预期全部 PASS**

```bash
cd blog/backend && mvn test -Dtest=AdminServiceTest -q
```

Expected: Tests run: 9, Failures: 0, BUILD SUCCESS。

- [ ] **Step 5: 提交**

```bash
git add blog/backend/src/main/java/com/blog/service/AdminService.java \
        blog/backend/src/test/java/com/blog/service/AdminServiceTest.java
git commit -m "feat: add AdminService with full CRUD for articles/categories/tags/comments"
```

---

### Task 8: AdminController + 集成测试

**Files:**
- Create: `blog/backend/src/main/java/com/blog/controller/AdminController.java`
- Create: `blog/backend/src/test/java/com/blog/controller/AdminControllerTest.java`

**Interfaces:**
- Consumes: `AdminService`（Task 7）, `JwtUtil`（Task 4）
- Produces: `/api/admin/**` 下所有管理 API

- [ ] **Step 1: 编写 AdminControllerTest（TDD）**

```java
package com.blog.controller;

import com.blog.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    private String token;

    @BeforeEach
    void setUp() {
        token = jwtUtil.generateToken("admin");
    }

    // ===== 文章管理 =====

    @Test
    void shouldListAllArticles() throws Exception {
        mockMvc.perform(get("/api/admin/articles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(5));
    }

    @Test
    void shouldCreateArticle() throws Exception {
        String body = """
            {"title":"New Post","content":"Hello world","status":"DRAFT"}
            """;
        mockMvc.perform(post("/api/admin/articles")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.title").value("New Post"));
    }

    @Test
    void shouldUpdateArticle() throws Exception {
        String body = """
            {"id":1,"title":"Updated Title","content":"Updated","status":"PUBLISHED"}
            """;
        mockMvc.perform(put("/api/admin/articles/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void shouldDeleteArticle() throws Exception {
        // 先创建一个文章，再删除
        String createBody = """
            {"title":"To Delete","content":"Will be deleted"}
            """;
        String response = mockMvc.perform(post("/api/admin/articles")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(createBody))
                .andReturn().getResponse().getContentAsString();
        // 简易提取 ID
        int idStart = response.indexOf("\"id\":") + 5;
        int idEnd = response.indexOf(",", idStart);
        String articleId = response.substring(idStart, idEnd).trim();

        mockMvc.perform(delete("/api/admin/articles/" + articleId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void shouldRejectWithoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/articles"))
                .andExpect(status().is4xxClientError());
    }

    // ===== 分类管理 =====

    @Test
    void shouldListCategories() throws Exception {
        mockMvc.perform(get("/api/admin/categories")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void shouldCreateCategory() throws Exception {
        String body = "{\"name\":\"新分类\",\"slug\":\"new-cat\"}";
        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    // ===== 标签管理 =====

    @Test
    void shouldListTags() throws Exception {
        mockMvc.perform(get("/api/admin/tags")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void shouldCreateTag() throws Exception {
        String body = "{\"name\":\"新标签\",\"slug\":\"new-tag\"}";
        mockMvc.perform(post("/api/admin/tags")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    // ===== 评论管理 =====

    @Test
    void shouldListComments() throws Exception {
        mockMvc.perform(get("/api/admin/comments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void shouldDeleteComment() throws Exception {
        mockMvc.perform(delete("/api/admin/comments/1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
```

- [ ] **Step 2: 运行测试 — 预期 FAIL（AdminController 不存在）**

```bash
cd blog/backend && mvn test -Dtest=AdminControllerTest -q
```

Expected: BUILD FAILURE。

- [ ] **Step 3: 实现 AdminController.java**

```java
package com.blog.controller;

import com.blog.model.*;
import com.blog.service.AdminService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ===== 文章管理 =====

    @GetMapping("/articles")
    public ApiResponse<List<Article>> listArticles() {
        return ApiResponse.ok(adminService.findAllArticles());
    }

    @PostMapping("/articles")
    public ApiResponse<Article> createArticle(@RequestBody Article article) {
        Article created = adminService.createArticle(article);
        return ApiResponse.ok(created);
    }

    @PutMapping("/articles/{id}")
    public ApiResponse<Void> updateArticle(@PathVariable Long id,
                                           @RequestBody Article article) {
        article.setId(id);
        adminService.updateArticle(article);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/articles/{id}")
    public ApiResponse<Void> deleteArticle(@PathVariable Long id) {
        adminService.deleteArticle(id);
        return ApiResponse.ok(null);
    }

    // ===== 分类管理 =====

    @GetMapping("/categories")
    public ApiResponse<List<Category>> listCategories() {
        return ApiResponse.ok(adminService.findAllCategories());
    }

    @PostMapping("/categories")
    public ApiResponse<Category> createCategory(@RequestBody Map<String, String> body) {
        Category cat = adminService.createCategory(body.get("name"), body.get("slug"));
        return ApiResponse.ok(cat);
    }

    @PutMapping("/categories/{id}")
    public ApiResponse<Void> updateCategory(@PathVariable Long id,
                                            @RequestBody Map<String, String> body) {
        adminService.updateCategory(id, body.get("name"), body.get("slug"));
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable Long id) {
        adminService.deleteCategory(id);
        return ApiResponse.ok(null);
    }

    // ===== 标签管理 =====

    @GetMapping("/tags")
    public ApiResponse<List<Tag>> listTags() {
        return ApiResponse.ok(adminService.findAllTags());
    }

    @PostMapping("/tags")
    public ApiResponse<Tag> createTag(@RequestBody Map<String, String> body) {
        Tag tag = adminService.createTag(body.get("name"), body.get("slug"));
        return ApiResponse.ok(tag);
    }

    @DeleteMapping("/tags/{id}")
    public ApiResponse<Void> deleteTag(@PathVariable Long id) {
        adminService.deleteTag(id);
        return ApiResponse.ok(null);
    }

    // ===== 评论管理 =====

    @GetMapping("/comments")
    public ApiResponse<List<Comment>> listComments() {
        return ApiResponse.ok(adminService.findAllComments());
    }

    @DeleteMapping("/comments/{id}")
    public ApiResponse<Void> deleteComment(@PathVariable Long id) {
        adminService.deleteComment(id);
        return ApiResponse.ok(null);
    }

    // ===== 图片上传 =====

    @PostMapping("/upload")
    public ApiResponse<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file) {
        // 校验类型
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ApiResponse.error(400, "仅支持图片文件");
        }
        String[] allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"};
        if (!Arrays.asList(allowed).contains(contentType)) {
            return ApiResponse.error(400, "仅支持 jpg/png/gif/webp 格式");
        }
        // 校验大小
        if (file.getSize() > 5 * 1024 * 1024) {
            return ApiResponse.error(413, "图片不能超过 5MB");
        }

        try {
            Path uploadDir = Path.of("uploads");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String ext = getExtension(Objects.requireNonNull(file.getOriginalFilename()));
            String filename = UUID.randomUUID() + ext;
            Path filePath = uploadDir.resolve(filename);
            file.transferTo(filePath.toFile());

            Map<String, String> data = Map.of("url", "/uploads/" + filename);
            return ApiResponse.ok(data);
        } catch (IOException e) {
            return ApiResponse.error(500, "上传失败: " + e.getMessage());
        }
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }
}
```

- [ ] **Step 4: 添加 uploads 静态资源映射到 SecurityConfig**

在 `SecurityConfig.java` 的 `securityFilterChain` 方法中添加 requestMatcher，同时在 WebConfig 中添加静态资源映射。

在 `SecurityConfig.java` 的 `authorizeHttpRequests` 块中追加一行（放在 `.anyRequest().permitAll()` 之前）：

```java
.requestMatchers("/uploads/**").permitAll()
```

在 `WebConfig.java` 的 `corsConfigurer` bean 后方新增一个 bean：

```java
@Bean
public WebMvcConfigurer staticResourceConfigurer() {
    return new WebMvcConfigurer() {
        @Override
        public void addResourceHandlers(ResourceHandlerRegistry registry) {
            registry.addResourceHandler("/uploads/**")
                    .addResourceLocations("file:uploads/");
        }
    };
}
```

需要在 WebConfig.java 顶部添加 import：
```java
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
```

- [ ] **Step 5: 运行集成测试 — 预期全部 PASS**

```bash
cd blog/backend && mvn test -Dtest=AdminControllerTest -q
```

Expected: Tests run: 11, Failures: 0, BUILD SUCCESS。

- [ ] **Step 6: 提交**

```bash
git add blog/backend/src/main/java/com/blog/controller/AdminController.java \
        blog/backend/src/test/java/com/blog/controller/AdminControllerTest.java \
        blog/backend/src/main/java/com/blog/config/SecurityConfig.java \
        blog/backend/src/main/java/com/blog/config/WebConfig.java
git commit -m "feat: add AdminController with all admin APIs and image upload"
```

---

### Task 9: 更新 Article 模型、ArticleService 和现有控制器的 status 过滤

**Files:**
- Modify: `blog/backend/src/main/java/com/blog/model/Article.java`
- Modify: `blog/backend/src/main/java/com/blog/service/ArticleService.java`
- Modify: `blog/backend/src/test/java/com/blog/service/ArticleServiceTest.java`

**Interfaces:**
- 现有公开 API 只返回 `status='PUBLISHED'` 的数据
- Article 新增 `status` 和 `categoryId` 字段

- [ ] **Step 1: 更新 Article.java — 新增 status 和 categoryId 字段**

在 Article.java 中新增两个字段 + getter/setter：

在 `private LocalDateTime updatedAt;` 之后添加：

```java
private String status;
private Long categoryId;
```

在 `setUpdatedAt` 方法之后添加：

```java
public String getStatus() { return status; }
public void setStatus(String status) { this.status = status; }
public Long getCategoryId() { return categoryId; }
public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
```

- [ ] **Step 2: 更新 ArticleService.java — 所有公开查询加 status 过滤**

修改 `findAll` 方法的 SQL，在 `FROM articles` 后添加 `WHERE status = 'PUBLISHED'`：

```java
public List<Article> findAll(int page, int size) {
    int offset = (page - 1) * size;
    String sql = """
        SELECT id, title, summary, content, cover_image,
               view_count, status, category_id, created_at, updated_at
        FROM articles
        WHERE status = 'PUBLISHED'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """;
    return jdbc.query(sql, new ArticleRowMapper(), size, offset);
}
```

修改 `findById`：

```java
public Optional<Article> findById(Long id) {
    String sql = """
        SELECT id, title, summary, content, cover_image,
               view_count, status, category_id, created_at, updated_at
        FROM articles WHERE id = ? AND status = 'PUBLISHED'
        """;
    List<Article> results = jdbc.query(sql, new ArticleRowMapper(), id);
    return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
}
```

修改 `findRandom`：

```java
public Article findRandom() {
    String sql = """
        SELECT id, title, summary, content, cover_image,
               view_count, status, category_id, created_at, updated_at
        FROM articles WHERE status = 'PUBLISHED' ORDER BY RAND() LIMIT 1
        """;
    List<Article> results = jdbc.query(sql, new ArticleRowMapper());
    return results.isEmpty() ? null : results.get(0);
}
```

修改 `getTotalWordCount` 和 `getArticleCount` 添加 `WHERE status = 'PUBLISHED'`：

```java
public long getTotalWordCount() {
    String sql = """
        SELECT COALESCE(SUM(CHAR_LENGTH(content)), 0)
        FROM articles WHERE status = 'PUBLISHED'
        """;
    Long result = jdbc.queryForObject(sql, Long.class);
    return result != null ? result : 0L;
}

public int getArticleCount() {
    String sql = "SELECT COUNT(*) FROM articles WHERE status = 'PUBLISHED'";
    Integer result = jdbc.queryForObject(sql, Integer.class);
    return result != null ? result : 0;
}
```

更新 `ArticleRowMapper` 内部类：

```java
private static class ArticleRowMapper implements RowMapper<Article> {
    @Override
    public Article mapRow(ResultSet rs, int rowNum) throws SQLException {
        Article article = new Article(
            rs.getLong("id"),
            rs.getString("title"),
            rs.getString("summary"),
            rs.getString("content"),
            rs.getString("cover_image"),
            rs.getInt("view_count"),
            rs.getTimestamp("created_at").toLocalDateTime(),
            rs.getTimestamp("updated_at").toLocalDateTime()
        );
        article.setStatus(rs.getString("status"));
        long catId = rs.getLong("category_id");
        if (!rs.wasNull()) {
            article.setCategoryId(catId);
        }
        return article;
    }
}
```

- [ ] **Step 3: 运行所有现有测试，确保兼容**

```bash
cd blog/backend && mvn test -q
```

Expected: 所有测试全部 PASS（包括 ArticleControllerTest、JwtUtilTest、SecurityConfigTest、AuthControllerTest、AdminServiceTest、AdminControllerTest）。

- [ ] **Step 4: 提交**

```bash
git add blog/backend/src/main/java/com/blog/model/Article.java \
        blog/backend/src/main/java/com/blog/service/ArticleService.java
git commit -m "feat: add status/categoryId to Article, filter public APIs by PUBLISHED status"
```

---

### Task 10: 前端 — auth.js + admin.css

**Files:**
- Create: `blog/frontend/js/auth.js`
- Create: `blog/frontend/css/admin.css`

**Interfaces:**
- Produces: `auth.js` 导出 `authFetch(url, options)`（自动带 JWT + 401 拦截）、`isLoggedIn()`、`login(username, password)`、`logout()`
- Produces: `admin.css` 提供抽屉面板、遮罩、登录表单、编辑器、管理列表的样式

- [ ] **Step 1: 创建 auth.js**

```javascript
// ===== auth.js — 认证和 token 管理 =====

const AUTH_KEY = 'blog_token';
const AUTH_USER = 'blog_username';

function isLoggedIn() {
    const token = localStorage.getItem(AUTH_KEY);
    if (!token) return false;
    // 检查 JWT 是否过期（解析 payload 中的 exp）
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            logout();
            return false;
        }
    } catch (e) {
        return false;
    }
    return true;
}

async function login(username, password) {
    const res = await fetchJSON(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (res && res.code === 200 && res.data) {
        localStorage.setItem(AUTH_KEY, res.data.token);
        localStorage.setItem(AUTH_USER, res.data.username);
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_USER);
}

function getAuthHeaders() {
    const token = localStorage.getItem(AUTH_KEY);
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

async function authFetch(url, options = {}) {
    const headers = {
        ...(options.headers || {}),
        ...getAuthHeaders(),
    };
    // 不覆盖已有 Content-Type（如 FormData 上传时不需要）
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    try {
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401 || res.status === 403) {
            logout();
            showLoginOverlay();
            return null;
        }
        if (!res.ok) {
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return null;
            }
        }
        return await res.json();
    } catch (err) {
        console.error('Auth fetch error:', url, err);
        return null;
    }
}
```

同时更新 `api.js` 的 `fetchJSON` 以支持自定义 options：

在 `api.js` 的 `fetchJSON` 函数签名和实现中，将单参数 `url` 改为 `(url, options = {})` 并合并 options：

```javascript
async function fetchJSON(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('API error:', url, err);
        return null;
    }
}
```

- [ ] **Step 2: 创建 admin.css**

```css
/* ===== admin.css — 后台管理抽屉面板样式 ===== */

/* 遮罩层 */
.admin-overlay {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 998;
    opacity: 0; visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
}
.admin-overlay.open {
    opacity: 1; visibility: visible;
}

/* 触发的齿轮按钮 */
.admin-trigger {
    cursor: pointer;
    font-size: 1.2rem;
    background: none; border: none;
    color: var(--color-text);
    opacity: 0.7; transition: opacity 0.2s;
    line-height: 1;
    padding: var(--space-xs);
}
.admin-trigger:hover { opacity: 1; }

/* 抽屉面板 */
.admin-drawer {
    position: fixed;
    top: 0; right: 0;
    width: 420px; max-width: 100vw;
    height: 100vh;
    background: #0a0a0a;
    border-left: 1px solid var(--color-border);
    z-index: 999;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    display: flex; flex-direction: column;
    overflow: hidden;
}
.admin-drawer.open {
    transform: translateX(0);
}

/* 抽屉头部 */
.drawer-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
}
.drawer-header h3 {
    margin: 0; font-size: 1rem; font-weight: 600;
}
.drawer-close {
    cursor: pointer; background: none; border: none;
    color: var(--color-muted); font-size: 1.4rem;
    line-height: 1; padding: var(--space-xs);
}
.drawer-close:hover { color: var(--color-text); }

/* Tab 导航 */
.drawer-tabs {
    display: flex; flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
}
.drawer-tab {
    flex: 1; padding: var(--space-sm) 0;
    text-align: center; cursor: pointer;
    color: var(--color-muted); font-size: 0.85rem;
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
    background: none; border-top: none; border-left: none; border-right: none;
}
.drawer-tab:hover { color: var(--color-text); }
.drawer-tab.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
}

/* 抽屉内容区 */
.drawer-body {
    flex: 1; overflow-y: auto;
    padding: var(--space-md) var(--space-lg);
}

/* 登录表单 */
.login-form {
    display: flex; flex-direction: column; gap: var(--space-md);
    padding: var(--space-lg) 0;
}
.login-form input {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    outline: none;
}
.login-form input:focus {
    border-color: var(--color-accent);
}
.login-form .btn {
    background: var(--color-accent);
    color: #000; border: none;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    cursor: pointer; font-weight: 600;
    font-size: 0.9rem;
}
.login-error {
    color: #e55; font-size: 0.85rem;
}

/* 管理列表项 */
.admin-list-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.9rem;
}
.admin-list-item .item-title { flex: 1; }
.admin-list-item .item-status {
    font-size: 0.75rem; padding: 2px 8px; border-radius: 12px;
    margin-left: var(--space-sm);
}
.item-status.published { background: rgba(171,187,243,0.2); color: var(--color-accent); }
.item-status.draft    { background: rgba(116,116,116,0.2); color: var(--color-muted); }

.admin-list-item button {
    background: none; border: none; color: var(--color-muted);
    cursor: pointer; font-size: 0.85rem; padding: 2px 6px;
}
.admin-list-item button:hover { color: #e55; }

/* Markdown 编辑器 */
.md-editor {
    display: flex; flex-direction: column; gap: var(--space-md);
    height: 100%;
}
.md-editor-toolbar {
    display: flex; gap: var(--space-sm);
}
.md-editor-toolbar button {
    background: none; border: 1px solid var(--color-border);
    color: var(--color-muted); padding: 4px 10px;
    border-radius: var(--radius-sm); cursor: pointer;
    font-size: 0.8rem;
}
.md-editor-toolbar button:hover { color: var(--color-text); border-color: var(--color-accent); }
.md-editor-toolbar button.active { color: var(--color-accent); border-color: var(--color-accent); }

.md-editor-panes {
    display: flex; gap: var(--space-sm); flex: 1; min-height: 300px;
}
.md-editor-panes textarea {
    flex: 1; resize: none;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text); font-family: var(--font-mono);
    font-size: 0.85rem; padding: var(--space-sm);
    outline: none; line-height: 1.6;
}
.md-editor-panes textarea:focus { border-color: var(--color-accent); }
.md-preview {
    flex: 1; overflow-y: auto;
    padding: var(--space-sm);
    font-size: 0.85rem; line-height: 1.6;
    color: var(--color-text);
    background: rgba(255,255,255,0.02);
    border-radius: var(--radius-sm);
}
.md-preview h1, .md-preview h2, .md-preview h3 { margin-top: var(--space-md); }
.md-preview pre { background: rgba(255,255,255,0.05); padding: var(--space-sm); border-radius: var(--radius-sm); overflow-x: auto; }
.md-preview code { font-family: var(--font-mono); font-size: 0.8rem; }
.md-preview img { max-width: 100%; border-radius: var(--radius-sm); }

/* 文章编辑表单 */
.article-form {
    display: flex; flex-direction: column; gap: var(--space-md);
}
.article-form input,
.article-form select,
.article-form textarea {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--color-border);
    color: var(--color-text); padding: var(--space-sm);
    border-radius: var(--radius-sm); font-size: 0.9rem;
    outline: none;
}
.article-form input:focus,
.article-form select:focus { border-color: var(--color-accent); }

.article-form .btn-primary {
    background: var(--color-accent); color: #000;
    border: none; padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-sm); cursor: pointer;
    font-weight: 600; font-size: 0.9rem; align-self: flex-start;
}
.article-form .btn-secondary {
    background: transparent; color: var(--color-muted);
    border: 1px solid var(--color-border); padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-sm); cursor: pointer;
    font-size: 0.9rem; align-self: flex-start;
}

/* Toast */
.admin-toast {
    position: fixed; bottom: var(--space-lg); right: var(--space-lg);
    z-index: 1001;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    color: var(--color-text);
    opacity: 0; transform: translateY(10px);
    transition: opacity 0.3s, transform 0.3s;
}
.admin-toast.show { opacity: 1; transform: translateY(0); }
.admin-toast.error { border-color: #e55; color: #e55; }

/* 新建行（分类/标签） */
.inline-add {
    display: flex; gap: var(--space-sm); margin-top: var(--space-sm);
}
.inline-add input {
    flex: 1; background: rgba(255,255,255,0.05);
    border: 1px solid var(--color-border); color: var(--color-text);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm); font-size: 0.85rem;
    outline: none;
}
.inline-add input:focus { border-color: var(--color-accent); }
.inline-add button {
    background: var(--color-accent); color: #000;
    border: none; padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm); cursor: pointer;
    font-size: 0.85rem;
}
```

- [ ] **Step 3: 验证 CSS/JS 语法（无构建工具，人工确认文件内容）**

确认 `auth.js` 语法正确（无多余逗号、括号匹配）。
确认 `admin.css` 语法正确。

- [ ] **Step 4: 提交**

```bash
git add blog/frontend/js/auth.js blog/frontend/css/admin.css
# 如果 api.js 有修改，也要添加
git add blog/frontend/js/api.js
git commit -m "feat: add auth.js (JWT management) and admin.css (drawer panel styles)"
```

---

### Task 11: 前端 — admin.js（抽屉逻辑 + 四个 Tab + Markdown 编辑器）

**Files:**
- Create: `blog/frontend/js/admin.js`

**Interfaces:**
- Consumes: `auth.js` 的 `authFetch`, `isLoggedIn`, `login`, `logout`；`api.js` 的 `API_BASE`, `escapeHtml`
- Produces: 抽屉面板完整交互——登录、Tab 切换、文章 CRUD、分类/标签管理、评论管理、Markdown 编辑器 + 图片上传

- [ ] **Step 1: 创建 admin.js — 基础结构和抽屉管理**

```javascript
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
    // 如果有其他被 wrapper 包裹的元素，确保都被正确移动
    // （上面的 querySelector 会自动把元素从 wrapper 中移出）

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
        case 'comments':    renderCommentsTab();    break;
    }
}
```

- [ ] **Step 2: 实现 Toast 工具函数**

在 `bindEvents()` 函数之后追加：

```javascript
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
```

- [ ] **Step 3: 实现文章管理 Tab（列表 + 新建 → 编辑器）**

```javascript
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
```

- [ ] **Step 4: 实现 Markdown 编辑器**

```javascript
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
            <input type="text" id="art-title" placeholder="文章标题" value="${escapeHtml(currentEditorArticle.title || '')}" />
            <input type="text" id="art-summary" placeholder="文章摘要（可选）" value="${escapeHtml(currentEditorArticle.summary || '')}" />
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
                    <textarea id="art-content" placeholder="Markdown 内容…">${escapeHtml(currentEditorArticle.content || '')}</textarea>
                    <div class="md-preview" id="md-preview" style="display:none"></div>
                </div>
            </div>
            <div style="display:flex;gap:var(--space-sm)">
                <button class="btn-primary" id="btn-save-article">保存</button>
                <button class="btn-secondary" id="btn-cancel-edit">取消</button>
            </div>
        </div>
    `;

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
```

- [ ] **Step 5: 实现分类管理 Tab**

```javascript
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
```

- [ ] **Step 6: 实现标签管理 Tab**

```javascript
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
```

- [ ] **Step 7: 实现评论管理 Tab**

```javascript
// ===== 评论管理 =====

async function renderCommentsTab() {
    const body = document.getElementById('drawer-body');
    body.innerHTML = '<p style="color:var(--color-muted)">加载中…</p>';

    const res = await authFetch(API_BASE + '/admin/comments');
    if (!res || res.code !== 200) {
        body.innerHTML = '<p style="color:#e55">加载失败</p>';
        return;
    }

    // 按 article_id 分组
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
```

- [ ] **Step 8: 验证编译（无前端构建，人工确认 JS 语法完整性）**

检查所有函数定义闭合，无遗漏括号。

- [ ] **Step 9: 提交**

```bash
git add blog/frontend/js/admin.js
git commit -m "feat: add admin.js with drawer panel, four tabs, and Markdown editor"
```

---

### Task 12: 接入 HTML + 引入 marked.js + 最终验证

**Files:**
- Modify: `blog/frontend/index.html`
- Modify: `blog/frontend/article.html`

**Interfaces:**
- 在页面中引入 `auth.js`、`admin.js`、`admin.css`、`marked.js`

- [ ] **Step 1: 更新 index.html**

在 `index.html` 的 `<head>` 中添加 admin.css 和 marked.js CDN：

```html
<!-- 在 animations.css 之后添加 -->
<link rel="stylesheet" href="css/admin.css" />
<!-- 在 </head> 之前添加 -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

在 `index.html` 的底部，`<script src="js/home.js"></script>` 前添加：

```html
<script src="js/auth.js"></script>
<script src="js/admin.js"></script>
```

完整的脚本引入顺序变为：

```html
<script src="js/api.js"></script>
<script src="js/auth.js"></script>
<script src="js/admin.js"></script>
<script src="js/home.js"></script>
```

- [ ] **Step 2: 更新 article.html**

在 `article.html` 的 `<head>` 中同样添加：

```html
<link rel="stylesheet" href="css/admin.css" />
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

在 `article.html` 底部，脚本引入顺序：

```html
<script src="js/api.js"></script>
<script src="js/auth.js"></script>
<script src="js/admin.js"></script>
<script src="js/article.js"></script>
```

- [ ] **Step 3: 启动应用进行手工验证**

```bash
cd blog/backend && mvn spring-boot:run
```

然后在浏览器打开 `http://localhost:8081/index.html`，验证：

1. **顶栏右侧出现齿轮 ⚙️ 按钮** → 点击打开抽屉
2. **首次打开显示登录表单** → 输入 admin / admin123 → 登录成功
3. **抽屉自动切换到文章管理 Tab** → 看到 5 篇已有文章（标记「已发布」）
4. **新建文章** → 输入标题、选择草稿 → Markdown 编辑器可用 → 保存 → 列表中可见
5. **编辑已有文章** → 点击 ✎ → 修改内容 → 保存
6. **删除文章** → 点击 ✕ → 确认 → 列表刷新
7. **分类管理** → 添加/编辑/删除分类
8. **标签管理** → 添加/删除标签
9. **评论管理** → 查看现有评论 → 删除一条
10. **图片上传** → 在编辑器中点击 📷 → 选择图片 → 自动插入 Markdown
11. **刷新页面后登录状态保持** → 因为 token 在 localStorage
12. **未登录访问时仍显示登录表单** → （在 DevTools → Application → Local Storage 中清除 blog_token，然后刷新页面）

- [ ] **Step 4: 提交**

```bash
git add blog/frontend/index.html blog/frontend/article.html
git commit -m "feat: wire admin panel into index.html and article.html"
```

---

### Task 13: 完整回归测试 + 最终提交

- [ ] **Step 1: 运行全部后端测试**

```bash
cd blog/backend && mvn test
```

Expected: 所有测试 PASS，无回归。

- [ ] **Step 2: 最终提交（如有遗漏文件）**

```bash
git status
# 如有未提交的修改，逐一检查并提交
git add <any-missing-files>
git commit -m "chore: final polish for admin backend"
```

---

## 完成标准

- [ ] 所有后端测试通过（JwtUtil、AuthController、AdminService、AdminController、SecurityConfig、原有 ArticleController）
- [ ] 公开 API `/api/articles` 只返回已发布文章
- [ ] `/api/admin/**` 在无 JWT 时返回 401
- [ ] 登录接口 `/api/auth/login` 正确返回 JWT
- [ ] 前端抽屉面板可打开/关闭
- [ ] 文章 CRUD 功能正常
- [ ] 分类/标签/评论管理正常
- [ ] Markdown 编辑器 + 预览 + 图片上传正常
