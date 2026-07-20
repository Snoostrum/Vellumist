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
