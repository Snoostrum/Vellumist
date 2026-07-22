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

INSERT INTO users (username, password) VALUES ('admin', '$2a$10$GTX1pedTR00D1bMqGRdaC.YtdYeNt4XITZc6vWDD0SnuZgrgXqvIO');

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
