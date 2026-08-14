package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.model.LoginRequest;
import com.blog.model.LoginResponse;
import com.blog.security.JwtAuthFilter;
import com.blog.security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final long LOCKOUT_MS = 15 * 60 * 1000L; // 锁定 15 分钟
    private static final int MAX_ATTEMPTS = 5;              // 5 次失败触发锁定

    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;

    @Value("${blog.jwt.cookie-secure:false}")
    private boolean cookieSecure;

    // 登录失败计数：key = "客户端IP|用户名"
    private final Map<String, FailRecord> failRecords = new ConcurrentHashMap<>();

    public AuthController(JwtUtil jwtUtil, PasswordEncoder passwordEncoder,
                          JdbcTemplate jdbc) {
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request,
                                            HttpServletRequest httpRequest,
                                            HttpServletResponse httpResponse) {
        String failKey = getClientIp(httpRequest) + "|" + request.getUsername();

        FailRecord record = failRecords.get(failKey);
        if (record != null && record.isLocked()) {
            long remainMin = (record.lockedUntil - System.currentTimeMillis()) / 60000 + 1;
            return ApiResponse.error(429, "失败次数过多，请 " + remainMin + " 分钟后再试");
        }

        var results = jdbc.query(
                "SELECT password FROM users WHERE username = ?",
                (rs, rowNum) -> rs.getString("password"),
                request.getUsername());

        if (results.isEmpty() || !passwordEncoder.matches(request.getPassword(), results.get(0))) {
            recordFailure(failKey);
            return ApiResponse.error(401, "用户名或密码错误");
        }

        failRecords.remove(failKey);

        String token = jwtUtil.generateToken(request.getUsername());
        setTokenCookie(httpResponse, token);
        // body 中仍返回 token，供非浏览器客户端使用；浏览器端请使用 HttpOnly cookie
        return ApiResponse.ok(new LoginResponse(token, request.getUsername()));
    }

    @GetMapping("/me")
    public ApiResponse<String> me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ApiResponse.error(401, "未登录");
        }
        return ApiResponse.ok(authentication.getName());
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletResponse httpResponse) {
        clearTokenCookie(httpResponse);
        return ApiResponse.ok(null);
    }

    // ===== 内部工具 =====

    private void setTokenCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(JwtAuthFilter.TOKEN_COOKIE, token);
        cookie.setHttpOnly(true);            // 阻止 JS 读取，防 XSS 窃取
        cookie.setSecure(cookieSecure);      // HTTPS 部署时开启
        cookie.setPath("/");
        cookie.setMaxAge(24 * 60 * 60);      // 与 JWT 有效期一致
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private void clearTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(JwtAuthFilter.TOKEN_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void recordFailure(String key) {
        FailRecord rec = failRecords.computeIfAbsent(key, k -> new FailRecord());
        rec.failures++;
        if (rec.failures >= MAX_ATTEMPTS) {
            rec.lockedUntil = System.currentTimeMillis() + LOCKOUT_MS;
        }
    }

    private static class FailRecord {
        int failures;
        long lockedUntil;

        boolean isLocked() {
            if (lockedUntil == 0) return false;
            if (System.currentTimeMillis() > lockedUntil) {
                lockedUntil = 0;
                failures = 0;
                return false;
            }
            return true;
        }
    }
}
