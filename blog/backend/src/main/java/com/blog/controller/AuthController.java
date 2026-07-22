package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.model.LoginRequest;
import com.blog.model.LoginResponse;
import com.blog.security.JwtUtil;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;

    public AuthController(JwtUtil jwtUtil, PasswordEncoder passwordEncoder,
                          JdbcTemplate jdbc) {
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request) {
        var results = jdbc.query(
                "SELECT password FROM users WHERE username = ?",
                (rs, rowNum) -> rs.getString("password"),
                request.getUsername());

        if (results.isEmpty()) {
            return ApiResponse.error(401, "用户名或密码错误");
        }

        String storedHash = results.get(0);
        if (!passwordEncoder.matches(request.getPassword(), storedHash)) {
            return ApiResponse.error(401, "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(request.getUsername());
        return ApiResponse.ok(new LoginResponse(token, request.getUsername()));
    }
}
