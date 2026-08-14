package com.blog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:blog;DB_CLOSE_DELAY=0"
})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldLoginSuccessfully() throws Exception {
        String body = "{\"username\":\"admin\",\"password\":\"Test-Only-Admin-Pw-2026\"}";
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.username").value("admin"));
    }

    @Test
    void shouldFailLoginWithWrongPassword() throws Exception {
        String body = "{\"username\":\"admin\",\"password\":\"wrong\"}";
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void shouldFailLoginWithMissingUser() throws Exception {
        String body = "{\"username\":\"nobody\",\"password\":\"admin123\"}";
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401));
    }

    // ===== 修改密码 =====
    // 自包含测试：改密码 -> 新密码登录成功 -> 改回原密码，不影响其他测试

    private String loginAndGetToken(String password) throws Exception {
        String body = "{\"username\":\"admin\",\"password\":\"" + password + "\"}";
        String resp = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn().getResponse().getContentAsString();
        int start = resp.indexOf("\"token\":\"") + 9;
        int end = resp.indexOf("\"", start);
        return resp.substring(start, end);
    }

    @Test
    void shouldChangePasswordAndRevert() throws Exception {
        String token = loginAndGetToken("Test-Only-Admin-Pw-2026");

        // 未登录 -> 拒绝
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/auth/change-password")
                        .contentType("application/json")
                        .content("{\"oldPassword\":\"Test-Only-Admin-Pw-2026\",\"newPassword\":\"NewPass12345\"}"))
                .andExpect(status().is4xxClientError());

        // 原密码错误 -> 401
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"oldPassword\":\"wrong-password\",\"newPassword\":\"NewPass12345\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401));

        // 新密码太短 -> 400
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"oldPassword\":\"Test-Only-Admin-Pw-2026\",\"newPassword\":\"short\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        // 修改成功 -> 200
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"oldPassword\":\"Test-Only-Admin-Pw-2026\",\"newPassword\":\"NewPass12345\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 新密码可登录
        loginAndGetToken("NewPass12345");

        // 改回原密码（保持其他测试与初始账号一致）
        String token2 = loginAndGetToken("NewPass12345");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token2)
                        .contentType("application/json")
                        .content("{\"oldPassword\":\"NewPass12345\",\"newPassword\":\"Test-Only-Admin-Pw-2026\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
