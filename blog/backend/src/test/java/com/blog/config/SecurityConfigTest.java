package com.blog.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldAllowPublicGetToArticles() throws Exception {
        mockMvc.perform(get("/api/articles"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldAllowPublicGetToSiteStats() throws Exception {
        mockMvc.perform(get("/api/site-stats"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldBlockUnauthenticatedAccessToAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/articles"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void shouldAllowLoginWithoutAuth() throws Exception {
        // AuthController 已创建，POST /api/auth/login 不应被 Security 拦截
        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"admin\",\"password\":\"whatever-not-a-real-password\"}"))
                .andExpect(status().isOk()); // 登录接口已存在，返回 200
    }
}
