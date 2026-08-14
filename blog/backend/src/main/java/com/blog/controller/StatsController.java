package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.service.ArticleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class StatsController {

    private final ArticleService articleService;

    public StatsController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping("/site-stats")
    public ApiResponse<Map<String, Object>> stats() {
        Map<String, Object> stats = Map.of(
            "articleCount", articleService.getArticleCount(),
            "totalWordCount", articleService.getTotalWordCount()
        );
        return ApiResponse.ok(stats);
    }

    /** 服务器时间（ISO-8601 UTC），供首页时间区块校准偏移 */
    @GetMapping("/time")
    public ApiResponse<Map<String, String>> time() {
        return ApiResponse.ok(Map.of("iso", OffsetDateTime.now(ZoneOffset.UTC).toString()));
    }
}
