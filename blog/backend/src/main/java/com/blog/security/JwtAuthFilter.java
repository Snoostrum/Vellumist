package com.blog.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String TOKEN_COOKIE = "blog_token";

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null && jwtUtil.isTokenValid(token)) {
            String username = jwtUtil.extractUsername(token);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                            username, null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * 优先读取 Authorization: Bearer 头（兼容 API 调用方），
     * 其次读取 HttpOnly cookie（浏览器端，防 XSS 窃取）。
     */
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (TOKEN_COOKIE.equals(cookie.getName())) {
                    String value = cookie.getValue();
                    return value == null || value.isEmpty() ? null : value;
                }
            }
        }
        return null;
    }
}
