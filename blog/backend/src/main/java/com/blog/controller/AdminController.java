package com.blog.controller;

import com.blog.model.*;
import com.blog.service.AdminService;
import com.blog.service.MusicService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final MusicService musicService;

    public AdminController(AdminService adminService, MusicService musicService) {
        this.adminService = adminService;
        this.musicService = musicService;
    }

    // ===== 文章管理 =====

    @GetMapping("/articles")
    public ApiResponse<List<Article>> listArticles() {
        return ApiResponse.ok(adminService.findAllArticles());
    }

    @PostMapping("/articles")
    public ApiResponse<Article> createArticle(@RequestBody Article article) {
        Article created = adminService.createArticle(article);
        return ApiResponse.ok(created);
    }

    @PutMapping("/articles/{id}")
    public ApiResponse<Void> updateArticle(@PathVariable Long id,
                                           @RequestBody Article article) {
        article.setId(id);
        adminService.updateArticle(article);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/articles/{id}")
    public ApiResponse<Void> deleteArticle(@PathVariable Long id) {
        adminService.deleteArticle(id);
        return ApiResponse.ok(null);
    }

    // ===== 分类管理 =====

    @GetMapping("/categories")
    public ApiResponse<List<Category>> listCategories() {
        return ApiResponse.ok(adminService.findAllCategories());
    }

    @PostMapping("/categories")
    public ApiResponse<Category> createCategory(@RequestBody Map<String, String> body) {
        Category cat = adminService.createCategory(body.get("name"), body.get("slug"));
        return ApiResponse.ok(cat);
    }

    @PutMapping("/categories/{id}")
    public ApiResponse<Void> updateCategory(@PathVariable Long id,
                                            @RequestBody Map<String, String> body) {
        adminService.updateCategory(id, body.get("name"), body.get("slug"));
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable Long id) {
        adminService.deleteCategory(id);
        return ApiResponse.ok(null);
    }

    // ===== 标签管理 =====

    @GetMapping("/tags")
    public ApiResponse<List<Tag>> listTags() {
        return ApiResponse.ok(adminService.findAllTags());
    }

    @PostMapping("/tags")
    public ApiResponse<Tag> createTag(@RequestBody Map<String, String> body) {
        Tag tag = adminService.createTag(body.get("name"), body.get("slug"));
        return ApiResponse.ok(tag);
    }

    @DeleteMapping("/tags/{id}")
    public ApiResponse<Void> deleteTag(@PathVariable Long id) {
        adminService.deleteTag(id);
        return ApiResponse.ok(null);
    }

    // ===== 评论管理 =====

    @GetMapping("/comments")
    public ApiResponse<List<Comment>> listComments() {
        return ApiResponse.ok(adminService.findAllComments());
    }

    @DeleteMapping("/comments/{id}")
    public ApiResponse<Void> deleteComment(@PathVariable Long id) {
        adminService.deleteComment(id);
        return ApiResponse.ok(null);
    }

    // ===== 音乐管理 =====

    @GetMapping("/music")
    public ApiResponse<List<MusicRec>> listMusic() {
        return ApiResponse.ok(musicService.findAll());
    }

    @PostMapping("/music")
    public ApiResponse<MusicRec> uploadMusic(
            @RequestParam("file") MultipartFile file,
            @RequestParam("cover") MultipartFile cover,
            @RequestParam("songName") String songName,
            @RequestParam("artist") String artist) {
        // 校验音频类型
        String audioType = file.getContentType();
        if (audioType == null || !audioType.startsWith("audio/")) {
            return ApiResponse.error(400, "仅支持音频文件");
        }
        // 校验音频大小（≤20MB）
        if (file.getSize() > 20 * 1024 * 1024) {
            return ApiResponse.error(413, "音频不能超过 20MB");
        }
        // 校验封面
        String coverType = cover.getContentType();
        if (coverType == null || !coverType.startsWith("image/")) {
            return ApiResponse.error(400, "封面仅支持图片文件");
        }

        try {
            Path musicDir = Path.of("uploads/music");
            if (!Files.exists(musicDir)) {
                Files.createDirectories(musicDir);
            }

            // 保存音频文件
            String audioExt = getExtension(Objects.requireNonNull(file.getOriginalFilename()));
            if (audioExt.isEmpty()) audioExt = ".mp3";
            String audioFilename = UUID.randomUUID() + audioExt;
            Path audioPath = musicDir.resolve(audioFilename);
            file.transferTo(audioPath.toFile());

            // 保存封面图
            String coverExt = getExtension(Objects.requireNonNull(cover.getOriginalFilename()));
            if (coverExt.isEmpty()) coverExt = ".jpg";
            String coverFilename = UUID.randomUUID() + coverExt;
            Path coverPath = musicDir.resolve(coverFilename);
            cover.transferTo(coverPath.toFile());

            String fileUrl = "/uploads/music/" + audioFilename;
            String coverUrl = "/uploads/music/" + coverFilename;

            MusicRec rec = musicService.create(songName, artist, coverUrl, fileUrl);
            return ApiResponse.ok(rec);
        } catch (IOException e) {
            return ApiResponse.error(500, "上传失败: " + e.getMessage());
        }
    }

    @DeleteMapping("/music/{id}")
    public ApiResponse<Void> deleteMusic(@PathVariable Long id) {
        musicService.delete(id);
        return ApiResponse.ok(null);
    }

    // ===== 图片上传 =====

    @PostMapping("/upload")
    public ApiResponse<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file) {
        // 校验类型
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ApiResponse.error(400, "仅支持图片文件");
        }
        String[] allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"};
        if (!Arrays.asList(allowed).contains(contentType)) {
            return ApiResponse.error(400, "仅支持 jpg/png/gif/webp 格式");
        }
        // 校验大小
        if (file.getSize() > 5 * 1024 * 1024) {
            return ApiResponse.error(413, "图片不能超过 5MB");
        }

        try {
            Path uploadDir = Path.of("uploads");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String ext = getExtension(Objects.requireNonNull(file.getOriginalFilename()));
            String filename = UUID.randomUUID() + ext;
            Path filePath = uploadDir.resolve(filename);
            file.transferTo(filePath.toFile());

            Map<String, String> data = Map.of("url", "/uploads/" + filename);
            return ApiResponse.ok(data);
        } catch (IOException e) {
            return ApiResponse.error(500, "上传失败: " + e.getMessage());
        }
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }
}
