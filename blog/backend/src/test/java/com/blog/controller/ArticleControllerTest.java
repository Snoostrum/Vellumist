package com.blog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public class ArticleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldListArticles() throws Exception {
        mockMvc.perform(get("/api/articles?page=1&size=3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.total").value(10));
    }

    @Test
    void shouldFilterArticlesByCategory() throws Exception {
        // 示例文章都没有分配分类，按 categoryId=1 过滤应返回空
        mockMvc.perform(get("/api/articles?page=1&size=5&categoryId=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(0))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void shouldListCategoriesWithCounts() throws Exception {
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].articleCount").isNumber());
    }

    @Test
    void shouldGetArticleDetail() throws Exception {
        mockMvc.perform(get("/api/articles/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.title").isNotEmpty());
    }

    @Test
    void shouldReturn404ForMissingArticle() throws Exception {
        mockMvc.perform(get("/api/articles/99999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    void shouldGetRandomArticle() throws Exception {
        mockMvc.perform(get("/api/articles/random"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.title").isNotEmpty());
    }

    @Test
    void shouldGetDatesByMonth() throws Exception {
        mockMvc.perform(get("/api/articles/dates?year=2026&month=6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    @Test
    void shouldGetSiteStats() throws Exception {
        mockMvc.perform(get("/api/site-stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.articleCount").value(10))
                .andExpect(jsonPath("$.data.totalWordCount").isNumber());
    }
}
