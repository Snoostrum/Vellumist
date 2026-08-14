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
            SELECT a.id, a.title, a.summary, a.content, a.cover_image,
                   a.view_count, a.status, a.category_id, c.name AS category_name,
                   a.created_at, a.updated_at
            FROM articles a
            LEFT JOIN categories c ON a.category_id = c.id
            ORDER BY a.created_at DESC
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
            PreparedStatement ps = con.prepareStatement(sql, new String[]{"id"});
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
                    new String[]{"id"});
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
                    new String[]{"id"});
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
            article.setCategoryName(rs.getString("category_name"));
            return article;
        }
    }
}
