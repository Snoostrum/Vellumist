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
                   view_count, status, category_id, created_at, updated_at
            FROM articles
            WHERE status = 'PUBLISHED'
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """;
        return jdbc.query(sql, new ArticleRowMapper(), size, offset);
    }

    public Optional<Article> findById(Long id) {
        String sql = """
            SELECT id, title, summary, content, cover_image,
                   view_count, status, category_id, created_at, updated_at
            FROM articles WHERE id = ? AND status = 'PUBLISHED'
            """;
        List<Article> results = jdbc.query(sql, new ArticleRowMapper(), id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public Article findRandom() {
        String sql = """
            SELECT id, title, summary, content, cover_image,
                   view_count, status, category_id, created_at, updated_at
            FROM articles WHERE status = 'PUBLISHED' ORDER BY RAND() LIMIT 1
            """;
        List<Article> results = jdbc.query(sql, new ArticleRowMapper());
        return results.isEmpty() ? null : results.get(0);
    }

    public List<String> findDatesByMonth(int year, int month) {
        String sql = """
            SELECT DISTINCT CAST(created_at AS DATE) as article_date
            FROM articles
            WHERE status = 'PUBLISHED' AND YEAR(created_at) = ? AND MONTH(created_at) = ?
            ORDER BY article_date
            """;
        return jdbc.query(sql,
                (rs, rowNum) -> rs.getString("article_date"),
                year, month);
    }

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
