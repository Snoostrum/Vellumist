package com.blog.service;

import com.blog.model.Article;
import com.blog.model.Category;
import com.blog.model.Comment;
import com.blog.model.Tag;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
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
    @Order(1)
    void shouldFindAllComments() {
        List<Comment> comments = adminService.findAllComments();
        assertTrue(comments.size() >= 3);
    }

    @Test
    @Order(2)
    void shouldDeleteComment() {
        List<Comment> before = adminService.findAllComments();
        if (!before.isEmpty()) {
            adminService.deleteComment(before.get(0).getId());
            List<Comment> after = adminService.findAllComments();
            assertEquals(before.size() - 1, after.size());
        }
    }
}
