package com.example.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST 控制器
 * @RestController = @Controller + @ResponseBody
 *   意思是：这个类的方法返回值直接写入 HTTP 响应体（JSON/字符串），不跳页面
 */
@RestController
public class HelloController {

    /**
     * 访问 http://localhost:8080/hello 就能看到结果
     * @GetMapping 把 HTTP GET 请求映射到这个方法上
     */
    @GetMapping("/hello")
    public String hello() {
        return "Hello, Spring Boot! 🚀";
    }

    /**
     * 带参数的接口：http://localhost:8080/hello?name=你的名字
     * @RequestParam 从 URL 参数里取值，defaultValue 是没传参数时的默认值
     */
    @GetMapping("/greet")
    public String greet(@RequestParam(defaultValue = "World") String name) {
        return "你好, " + name + "!";
    }
}
