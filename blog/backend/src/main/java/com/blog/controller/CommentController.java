package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.model.Comment;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 访客评论公开接口：任何访问者可查看文章评论并发表评论。
 * 防滥用：同 IP 60 秒内最多 1 条；昵称 ≤30 字、内容 ≤1000 字；
 * 内容在前端渲染时统一转义（防 XSS），数据库存原文。
 */
@RestController
@RequestMapping("/api/articles/{articleId}/comments")
public class CommentController {

    private static final long DEFAULT_RATE_LIMIT_MS = 60_000L;
    private static final int MAX_AUTHOR_LEN = 30;
    private static final int MAX_CONTENT_LEN = 1000;

    private final JdbcTemplate jdbc;

    /** 同 IP 评论间隔（毫秒），可用 blog.comments.rate-limit-ms 覆盖 */
    @Value("${blog.comments.rate-limit-ms:60000}")
    private long rateLimitMs;

    /** key = 客户端IP，value = 上次发表时间戳 */
    private final Map<String, Long> lastPostByIp = new ConcurrentHashMap<>();

    public CommentController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public ApiResponse<List<Comment>> list(@PathVariable Long articleId) {
        if (!isArticlePublished(articleId)) {
            return ApiResponse.error(404, "文章不存在");
        }
        List<Comment> comments = jdbc.query("""
                SELECT id, article_id, author_name, content, created_at
                FROM comments WHERE article_id = ?
                ORDER BY created_at ASC
                """, (rs, rowNum) -> new Comment(
                        rs.getLong("id"),
                        rs.getLong("article_id"),
                        rs.getString("author_name"),
                        rs.getString("content"),
                        rs.getTimestamp("created_at").toLocalDateTime()),
                articleId);
        return ApiResponse.ok(comments);
    }

    @PostMapping
    public ApiResponse<Comment> create(@PathVariable Long articleId,
                                       @RequestBody Map<String, String> body,
                                       HttpServletRequest request) {
        if (!isArticlePublished(articleId)) {
            return ApiResponse.error(404, "文章不存在");
        }

        // 同 IP 限流：rateLimitMs 间隔内最多 1 条
        String clientIp = getClientIp(request);
        long now = System.currentTimeMillis();
        Long last = lastPostByIp.get(clientIp);
        if (rateLimitMs > 0 && last != null && now - last < rateLimitMs) {
            return ApiResponse.error(429, "评论太频繁了，请稍后再试");
        }

        String rawName = body.getOrDefault("authorName", "").trim();
        String authorName = rawName.isEmpty() ? "匿名" : rawName;
        String content = body.getOrDefault("content", "").trim();
        if (authorName.length() > MAX_AUTHOR_LEN) {
            return ApiResponse.error(400, "昵称不能超过 " + MAX_AUTHOR_LEN + " 字");
        }
        if (content.isEmpty()) {
            return ApiResponse.error(400, "评论内容不能为空");
        }
        if (content.length() > MAX_CONTENT_LEN) {
            return ApiResponse.error(400, "评论不能超过 " + MAX_CONTENT_LEN + " 字");
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO comments (article_id, author_name, content) VALUES (?, ?, ?)",
                    new String[]{"id"});
            ps.setLong(1, articleId);
            ps.setString(2, authorName);
            ps.setString(3, content);
            return ps;
        }, keyHolder);

        lastPostByIp.put(clientIp, now);

        Comment comment = new Comment();
        comment.setId(keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null);
        comment.setArticleId(articleId);
        comment.setAuthorName(authorName);
        comment.setContent(content);
        return ApiResponse.ok(comment);
    }

    private boolean isArticlePublished(Long articleId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM articles WHERE id = ? AND status = 'PUBLISHED'",
                Integer.class, articleId);
        return count != null && count > 0;
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
