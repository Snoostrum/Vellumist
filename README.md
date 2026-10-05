# 不如睡觉

全栈个人博客：Spring Boot 后端 + 原生 HTML/CSS/JavaScript 前端 + MySQL，Nginx 托管静态文件并反向代理接口。

- **后端**：Spring Boot 3.5 / Java 25 / Spring Security + JWT
- **数据**：MySQL 8（生产）、H2（开发与测试）；用 JdbcTemplate 手写 SQL，没有引入 ORM
- **前端**：原生 HTML/CSS/JS，没有框架、没有构建步骤
- **部署**：见 [blog/README.md](blog/README.md)

## 功能

访客侧：

- 文章列表与详情，按分类、标签筛选，按月归档
- 正文用 Markdown 写，浏览器端渲染。marked 已本地化（不依赖 CDN），渲染时转义原始 HTML 并过滤 `javascript:` / `data:` 协议，防存储型 XSS
- 访客评论
- 音乐播放器（音频 + 封面）

管理侧（`admin.html`）：

- 文章、分类、标签、评论、音乐的增删改查
- 文件上传：校验扩展名和文件头，不只信客户端传来的 Content-Type
- 修改密码、站点统计

## 几个实现细节

| 关注点 | 做法 |
| --- | --- |
| 登录 | JWT 放在 HttpOnly Cookie 里，前端 JS 读不到；登录接口按 IP 限流 |
| 敏感配置 | 数据库密码、JWT 密钥等全部由环境变量注入，仓库里没有任何明文凭据 |
| 管理员账号 | 首次启动且 `users` 表为空时，`AdminBootstrapRunner` 自动创建 `admin`：密码取 `BLOG_ADMIN_PASSWORD`，未设置则随机生成并打印在启动日志里 |
| 建表与初始数据 | 启动时执行 `schema.sql` 建表，`data.sql` 写入开发用的示例文章 |
| 测试 | 60 个，覆盖控制器、服务与安全配置（Spring Boot Test + MockMvc） |

## 本地运行

需要 JDK 25（`JAVA_HOME` 指向 25，JDK 8 编不过代码里的文本块语法）和 Node.js。

```bash
# 后端（终端 1）
cd blog/backend
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run
# 跑在 8080，用内存 H2 + data.sql 的示例数据

# 前端（终端 2）
cd blog
node serve.js 8081 frontend     # Windows 也可以双击 start-frontend.cmd
# 打开 http://localhost:8081
```

前端在 8081、后端在 8080，这个对应关系写在 `frontend/js/api.js` 里，两个端口不要随意改。也不要直接双击打开 html 文件，`file://` 协议下接口调用不通。

## 测试

```bash
cd blog/backend
./mvnw test
```

## 仓库结构

```text
blog/            项目本体
  backend/       Spring Boot 后端（含测试）
  frontend/      前端页面与静态资源
  deploy/        Nginx 配置与生产环境配置样例
  serve.js       本地开发用的静态文件服务器
docs/            开发时写的设计文档与计划
```
