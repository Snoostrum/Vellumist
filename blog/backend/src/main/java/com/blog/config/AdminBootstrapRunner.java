package com.blog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * 管理员引导：
 * 当 users 表为空时，启动时自动创建初始管理员 admin，密码取 blog.admin.init-password
 * （生产用环境变量 BLOG_ADMIN_PASSWORD 注入）；未设置则生成随机密码并打印到日志（仅首次启动）。
 * 注意：data.sql 已不再内置 admin，因此开发/测试环境同样走这条路径 ——
 * 测试在 @SpringBootTest 的 properties 里指定密码，见 AuthControllerTest。
 */
@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    @Value("${blog.admin.init-password:}")
    private String initPassword;

    public AdminBootstrapRunner(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        try {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
            if (count != null && count > 0) {
                return;
            }
        } catch (Exception e) {
            // 表不存在等异常时静默跳过，避免启动失败
            return;
        }

        String password = (initPassword == null || initPassword.isBlank())
                ? generateRandomPassword(16)
                : initPassword;

        jdbc.update("INSERT INTO users (username, password) VALUES ('admin', ?)",
                passwordEncoder.encode(password));

        log.warn("==============================================================");
        log.warn("已创建初始管理员账号：admin");
        log.warn("初始密码：{}", password);
        log.warn("请立即登录后台修改密码！也可通过环境变量 BLOG_ADMIN_PASSWORD 预置密码后重启。");
        log.warn("==============================================================");
    }

    private String generateRandomPassword(int length) {
        String chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%^&*";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
