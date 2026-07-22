package com.blog.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil("my-secret-key-for-testing-purposes-12345");
    }

    @Test
    void shouldGenerateToken() {
        String token = jwtUtil.generateToken("admin");
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void shouldExtractUsername() {
        String token = jwtUtil.generateToken("admin");
        String username = jwtUtil.extractUsername(token);
        assertEquals("admin", username);
    }

    @Test
    void shouldValidateValidToken() {
        String token = jwtUtil.generateToken("admin");
        assertTrue(jwtUtil.isTokenValid(token));
    }

    @Test
    void shouldRejectInvalidToken() {
        assertFalse(jwtUtil.isTokenValid("invalid.token.here"));
    }

    @Test
    void shouldRejectExpiredToken() {
        // 创建一个极短过期时间的 JwtUtil 实例来测试过期
        JwtUtil shortLived = new JwtUtil("test-key-for-expired-token-1234567", 1); // 1ms 过期
        String token = shortLived.generateToken("admin");
        // 等待 token 过期
        try { Thread.sleep(10); } catch (InterruptedException e) { /* ignore */ }
        assertFalse(shortLived.isTokenValid(token));
    }
}
