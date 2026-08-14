package com.blog.controller;

import com.blog.model.ApiResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** 公开分类列表：访客浏览归档页使用，附带每个分类的已发布文章数 */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final JdbcTemplate jdbc;

    public CategoryController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list() {
        List<Map<String, Object>> categories = jdbc.query("""
                SELECT c.id, c.name, c.slug,
                       COUNT(a.id) AS article_count
                FROM categories c
                LEFT JOIN articles a ON a.category_id = c.id AND a.status = 'PUBLISHED'
                GROUP BY c.id, c.name, c.slug
                ORDER BY c.id
                """, (rs, rowNum) -> Map.of(
                        "id", rs.getLong("id"),
                        "name", rs.getString("name"),
                        "slug", rs.getString("slug"),
                        "articleCount", rs.getLong("article_count")));
        return ApiResponse.ok(categories);
    }
}
