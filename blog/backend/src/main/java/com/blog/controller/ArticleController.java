package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.model.Article;
import com.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/articles")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping
    public ApiResponse<List<Article>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size) {
        if (page < 1) page = 1;
        if (size < 1 || size > 20) size = 5;
        List<Article> articles = articleService.findAll(page, size);
        return ApiResponse.ok(articles);
    }

    @GetMapping("/{id}")
    public ApiResponse<Article> detail(@PathVariable Long id) {
        Optional<Article> article = articleService.findById(id);
        if (article.isPresent()) {
            articleService.incrementViewCount(id);
            return ApiResponse.ok(article.get());
        }
        return ApiResponse.error(404, "文章不存在");
    }

    @GetMapping("/random")
    public ApiResponse<Article> random() {
        Article article = articleService.findRandom();
        if (article != null) {
            return ApiResponse.ok(article);
        }
        return ApiResponse.error(404, "暂无文章");
    }

    @GetMapping("/dates")
    public ApiResponse<List<String>> dates(
            @RequestParam int year,
            @RequestParam int month) {
        List<String> dates = articleService.findDatesByMonth(year, month);
        return ApiResponse.ok(dates);
    }
}
