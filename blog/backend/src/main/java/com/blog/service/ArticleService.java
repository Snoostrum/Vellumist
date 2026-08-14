package com.blog.service;

import com.blog.model.Article;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ArticleService {

    private final JdbcTemplate jdbc;

    public ArticleService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_COLUMNS = """
        SELECT a.id, a.title, a.summary, a.content, a.cover_image,
               a.view_count, a.status, a.category_id, c.name AS category_name,
               a.created_at, a.updated_at
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        """;

    /** 分页查询已发布文章；categoryId 非空时按分类过滤 */
    public List<Article> findPage(int page, int size, Long categoryId) {
        int offset = (page - 1) * size;
        StringBuilder sql = new StringBuilder(SELECT_COLUMNS);
        sql.append("WHERE a.status = 'PUBLISHED'");
        List<Object> params = new ArrayList<>();
        if (categoryId != null) {
            sql.append(" AND a.category_id = ?");
            params.add(categoryId);
        }
        sql.append(" ORDER BY a.created_at DESC LIMIT ? OFFSET ?");
        params.add(size);
        params.add(offset);
        return jdbc.query(sql.toString(), new ArticleRowMapper(), params.toArray());
    }

    /** 已发布文章总数（可按分类过滤） */
    public long countPublished(Long categoryId) {
        StringBuilder sql = new StringBuilder(
                "SELECT COUNT(*) FROM articles a WHERE a.status = 'PUBLISHED'");
        List<Object> params = new ArrayList<>();
        if (categoryId != null) {
            sql.append(" AND a.category_id = ?");
            params.add(categoryId);
        }
        Long result = jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return result != null ? result : 0L;
    }

    public Optional<Article> findById(Long id) {
        String sql = SELECT_COLUMNS + " WHERE a.id = ? AND a.status = 'PUBLISHED'";
        List<Article> results = jdbc.query(sql, new ArticleRowMapper(), id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public Article findRandom() {
        String sql = SELECT_COLUMNS + """
             WHERE a.status = 'PUBLISHED' ORDER BY RAND() LIMIT 1
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
            article.setCategoryName(rs.getString("category_name"));
            return article;
        }
    }
}
