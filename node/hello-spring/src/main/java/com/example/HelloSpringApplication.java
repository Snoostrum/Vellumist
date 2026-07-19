package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot 入口类
 * @SpringBootApplication = 三个注解的合体：
 *   1. @Configuration  — 告诉 Spring 这个类里可能有 Bean 定义
 *   2. @EnableAutoConfiguration — 让 Spring Boot 自动配置（核心魔法）
 *   3. @ComponentScan   — 扫描当前包及子包下的所有组件
 */
@SpringBootApplication
public class HelloSpringApplication {

    public static void main(String[] args) {
        // 就这一行，启动整个 Spring 应用
        SpringApplication.run(HelloSpringApplication.class, args);
    }
}
