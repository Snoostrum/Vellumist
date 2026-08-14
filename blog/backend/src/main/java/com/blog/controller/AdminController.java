package com.blog.controller;

import com.blog.model.*;
import com.blog.service.AdminService;
import com.blog.service.MusicService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Set<String> IMAGE_EXTS =
            Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");
    private static final Set<String> AUDIO_EXTS =
            Set.of(".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac");

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
        // 校验音频大小（≤20MB）
        if (file.getSize() > 20 * 1024 * 1024) {
            return ApiResponse.error(413, "音频不能超过 20MB");
        }
        // 校验音频扩展名 + 文件头（Content-Type 客户端可伪造，不能作为唯一依据）
        String fileExt = getExtension(Objects.requireNonNull(file.getOriginalFilename())).toLowerCase();
        if (!AUDIO_EXTS.contains(fileExt)) {
            return ApiResponse.error(400, "仅支持 mp3/wav/flac/ogg/m4a 格式");
        }
        if (!isValidAudio(readHeader(file))) {
            return ApiResponse.error(400, "音频文件内容校验失败");
        }
        // 校验封面（扩展名 + 文件头）
        String coverExtRaw = getExtension(Objects.requireNonNull(cover.getOriginalFilename())).toLowerCase();
        if (!IMAGE_EXTS.contains(coverExtRaw)) {
            return ApiResponse.error(400, "封面仅支持 jpg/png/gif/webp 格式");
        }
        if (!isValidImage(readHeader(cover))) {
            return ApiResponse.error(400, "封面图片内容校验失败");
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
        // 校验大小
        if (file.getSize() > 5 * 1024 * 1024) {
            return ApiResponse.error(413, "图片不能超过 5MB");
        }
        // 校验扩展名 + 文件头（Content-Type 客户端可伪造，不能作为唯一依据）
        String imgExt = getExtension(Objects.requireNonNull(file.getOriginalFilename())).toLowerCase();
        if (!IMAGE_EXTS.contains(imgExt)) {
            return ApiResponse.error(400, "仅支持 jpg/png/gif/webp 格式");
        }
        if (!isValidImage(readHeader(file))) {
            return ApiResponse.error(400, "图片内容校验失败");
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

    // ===== 文件头（magic bytes）校验，防止伪造扩展名上传可执行/HTML 文件 =====

    private byte[] readHeader(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(16);
        } catch (IOException e) {
            return new byte[0];
        }
    }

    private boolean isValidImage(byte[] h) {
        if (h.length < 12) return false;
        // JPEG: FF D8 FF
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return true;
        // PNG: 89 50 4E 47
        if (h[0] == (byte) 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return true;
        // GIF: "GIF8"
        if (h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') return true;
        // WEBP: "RIFF" .... "WEBP"
        if (h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return true;
        return false;
    }

    private boolean isValidAudio(byte[] h) {
        if (h.length < 12) return false;
        // MP3: ID3v2 标签，或 0xFF Ex 帧头
        if (h[0] == 'I' && h[1] == 'D' && h[2] == '3') return true;
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xE0) == 0xE0) return true;
        // WAV: "RIFF" .... "WAVE"
        if (h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'A' && h[10] == 'V' && h[11] == 'E') return true;
        // FLAC: "fLaC"
        if (h[0] == 'f' && h[1] == 'L' && h[2] == 'a' && h[3] == 'C') return true;
        // OGG: "OggS"
        if (h[0] == 'O' && h[1] == 'g' && h[2] == 'g' && h[3] == 'S') return true;
        // M4A/AAC (MP4 容器): offset 4 为 "ftyp"
        if (h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p') return true;
        return false;
    }
}
