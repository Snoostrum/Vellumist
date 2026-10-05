# 个人博客部署指南

技术栈：Spring Boot 3.5（Java 25）+ 原生 HTML/CSS/JS 前端 + MySQL 8.0 + Nginx。

## 环境要求

- Java 25（**注意：JAVA_HOME 必须指向 JDK 25**，JDK 8 无法编译文本块语法）
- Maven Wrapper（`./mvnw`，无需单独安装 Maven）
- MySQL 8.0+
- Nginx

## 安全配置（环境变量）

后端所有敏感配置都通过环境变量注入，**不要**写死在配置文件里：

| 环境变量 | 说明 | 示例 |
|---|---|---|
| `BLOG_DB_PASSWORD` | 数据库密码（必填） | `export BLOG_DB_PASSWORD='your-password'` |
| `BLOG_JWT_SECRET` | JWT 签名密钥，≥32 字节强随机（必填） | `export BLOG_JWT_SECRET=$(openssl rand -base64 48)` |
| `BLOG_JWT_COOKIE_SECURE` | 登录 cookie 仅 HTTPS 传输，默认 `true` | 本地 http 调试时设 `false` |
| `BLOG_CORS_ALLOWED_ORIGINS` | 跨域前端白名单（逗号分隔），同源部署留空 | 如 `https://blog.example.com` |
| `BLOG_ADMIN_PASSWORD` | 首次启动初始管理员密码（可选） | 不设置则随机生成并打印到日志 |

## 部署步骤

### 1. 构建后端

```bash
cd blog/backend
# 确认 JAVA_HOME 指向 JDK 25，例如：
# export JAVA_HOME=/usr/lib/jvm/jdk-25
./mvnw clean package -DskipTests
# 产物：target/blog-0.0.1.jar
```

### 2. 初始化数据库

```sql
CREATE DATABASE blog CHARACTER SET utf8mb4;
CREATE USER 'blog_user'@'localhost' IDENTIFIED BY '你的强密码';
GRANT ALL ON blog.* TO 'blog_user'@'localhost';
```

表结构由 Spring Boot 启动时自动执行 `schema.sql` 创建（`blog/backend/src/main/resources/schema.sql`）。

### 3. 部署后端

```bash
# 复制到服务器
scp blog/backend/target/blog-0.0.1.jar user@server:/opt/blog/
scp blog/deploy/application-mysql.properties user@server:/opt/blog/

# 在服务器上设置环境变量并启动（建议用 systemd 托管）
export BLOG_DB_PASSWORD='...'
export BLOG_JWT_SECRET='...'
java -jar /opt/blog/blog-0.0.1.jar --spring.config.location=/opt/blog/application-mysql.properties
```

**首次启动会自动创建管理员账号 `admin`**：密码取 `BLOG_ADMIN_PASSWORD`，未设置则随机生成并打印在启动日志中（仅首次）。登录后请立即修改密码。

### 4. 部署前端

```bash
# 复制前端文件到 Nginx 目录
scp -r blog/frontend/* user@server:/var/www/blog/frontend/
```

### 5. 配置 Nginx

```bash
# 复制配置（已包含 /api 与 /uploads 反代、上传大小限制、安全响应头）
scp blog/deploy/nginx.conf user@server:/etc/nginx/sites-available/blog
# 启用
ssh user@server "ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/ && nginx -t && nginx -s reload"
```

记得修改 `nginx.conf` 中的 `server_name`，并建议配置 HTTPS（登录 cookie 依赖 `BLOG_JWT_COOKIE_SECURE=true`，HTTP 下不会生效）。

### 6. 上传目录

后端会把上传的图片/音乐保存到运行目录下的 `uploads/`（如 `/opt/blog/uploads/`）。
确保运行后端的用户对该目录有写权限；该目录已加入 `.gitignore`，不会进入仓库。

## 本地开发

- 后端：`cd blog/backend && ./mvnw spring-boot:run`（默认 8080，H2 内存库 + 示例数据）
- 前端：任意静态服务器托管 `blog/frontend`，建议端口 8081（前端会自动把 API 指向 `http://localhost:8080/api`）
- 开发库内置账号：首次启动且 `users` 表为空时由 `AdminBootstrapRunner` 创建 `admin`，密码取环境变量 `BLOG_ADMIN_PASSWORD`，未设置则随机生成并打印在启动日志里

## 测试

```bash
cd blog/backend
./mvnw test   # 60 个测试：控制器、服务、安全配置
```
