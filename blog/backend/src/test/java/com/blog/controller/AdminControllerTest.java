package com.blog.controller;

import com.blog.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    private String token;

    @BeforeEach
    void setUp() {
        token = jwtUtil.generateToken("admin");
    }

    // ===== 文章管理 =====

    @Test
    @Order(1)
    void shouldListAllArticles() throws Exception {
        mockMvc.perform(get("/api/admin/articles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(5));
    }

    @Test
    @Order(2)
    void shouldCreateArticle() throws Exception {
        String body = """
            {"title":"New Post","content":"Hello world","status":"DRAFT"}
            """;
        mockMvc.perform(post("/api/admin/articles")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.title").value("New Post"));
    }

    @Test
    @Order(3)
    void shouldUpdateArticle() throws Exception {
        String body = """
            {"id":1,"title":"Updated Title","content":"Updated","status":"PUBLISHED"}
            """;
        mockMvc.perform(put("/api/admin/articles/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @Order(4)
    void shouldDeleteArticle() throws Exception {
        // 先创建一个文章，再删除
        String createBody = """
            {"title":"To Delete","content":"Will be deleted"}
            """;
        String response = mockMvc.perform(post("/api/admin/articles")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(createBody))
                .andReturn().getResponse().getContentAsString();
        // 简易提取 ID
        int idStart = response.indexOf("\"id\":") + 5;
        int idEnd = response.indexOf(",", idStart);
        String articleId = response.substring(idStart, idEnd).trim();

        mockMvc.perform(delete("/api/admin/articles/" + articleId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @Order(5)
    void shouldRejectWithoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/articles"))
                .andExpect(status().is4xxClientError());
    }

    // ===== 分类管理 =====

    @Test
    @Order(6)
    void shouldListCategories() throws Exception {
        mockMvc.perform(get("/api/admin/categories")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @Order(7)
    void shouldCreateCategory() throws Exception {
        String body = "{\"name\":\"新分类\",\"slug\":\"new-cat\"}";
        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    // ===== 标签管理 =====

    @Test
    @Order(8)
    void shouldListTags() throws Exception {
        mockMvc.perform(get("/api/admin/tags")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @Order(9)
    void shouldCreateTag() throws Exception {
        String body = "{\"name\":\"新标签\",\"slug\":\"new-tag\"}";
        mockMvc.perform(post("/api/admin/tags")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    // ===== 评论管理 =====

    @Test
    @Order(10)
    void shouldListComments() throws Exception {
        mockMvc.perform(get("/api/admin/comments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @Order(11)
    void shouldDeleteComment() throws Exception {
        mockMvc.perform(delete("/api/admin/comments/1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
