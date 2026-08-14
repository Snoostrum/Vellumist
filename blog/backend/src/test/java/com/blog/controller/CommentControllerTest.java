package com.blog.controller;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0",
    "blog.comments.rate-limit-ms=0"
})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @Order(1)
    void shouldListSeedComments() throws Exception {
        mockMvc.perform(get("/api/articles/1/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @Order(2)
    void shouldPostComment() throws Exception {
        String body = "{\"authorName\":\"访客小王\",\"content\":\"写得不错，学习了！\"}";
        mockMvc.perform(post("/api/articles/1/comments")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.authorName").value("访客小王"));
    }

    @Test
    @Order(3)
    void shouldSeeNewCommentInList() throws Exception {
        mockMvc.perform(get("/api/articles/1/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    @Test
    @Order(4)
    void shouldRejectEmptyContent() throws Exception {
        String body = "{\"authorName\":\"测试\",\"content\":\"   \"}";
        mockMvc.perform(post("/api/articles/1/comments")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    @Order(5)
    void shouldRejectTooLongContent() throws Exception {
        String longContent = "啊".repeat(1001);
        String body = "{\"authorName\":\"测试\",\"content\":\"" + longContent + "\"}";
        mockMvc.perform(post("/api/articles/1/comments")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    @Order(6)
    void shouldRejectCommentOnMissingArticle() throws Exception {
        String body = "{\"authorName\":\"测试\",\"content\":\"你好\"}";
        mockMvc.perform(post("/api/articles/99999/comments")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }
}
