package com.blog.service;

import com.blog.model.Article;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class ArticleServiceTest {

    @Autowired
    private ArticleService articleService;

    @Test
    void shouldFindAllWithPagination() {
        List<Article> page1 = articleService.findAll(1, 2);
        assertEquals(2, page1.size());
        // 按时间倒序，第一页应该是最新的文章
        assertTrue(page1.get(0).getCreatedAt()
                .isAfter(page1.get(1).getCreatedAt()));
    }

    @Test
    void shouldFindById() {
        List<Article> all = articleService.findAll(1, 10);
        assertFalse(all.isEmpty());

        Article first = all.get(0);
        Article found = articleService.findById(first.getId()).orElse(null);

        assertNotNull(found);
        assertEquals(first.getTitle(), found.getTitle());
    }

    @Test
    void shouldReturnEmptyForMissingId() {
        assertTrue(articleService.findById(99999L).isEmpty());
    }

    @Test
    void shouldFindRandom() {
        Article random = articleService.findRandom();
        assertNotNull(random);
        assertNotNull(random.getTitle());
    }

    @Test
    void shouldFindDatesByMonth() {
        // 种子数据中 2026 年 6 月有 3 篇文章
        List<String> dates = articleService.findDatesByMonth(2026, 6);
        assertFalse(dates.isEmpty());
        assertEquals(3, dates.size());
    }

    @Test
    void shouldReturnTotalWordCount() {
        long count = articleService.getTotalWordCount();
        assertTrue(count > 0, "种子数据中的文章应该有内容");
    }

    @Test
    void shouldReturnArticleCount() {
        int count = articleService.getArticleCount();
        assertEquals(5, count, "种子数据应包含 5 篇文章");
    }
}
