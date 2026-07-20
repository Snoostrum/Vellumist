package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.service.ArticleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
