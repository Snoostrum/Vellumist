package com.blog.model;

import java.time.LocalDateTime;

public class Comment {
    private Long id;
    private Long articleId;
    private String authorName;
    private String content;
    private LocalDateTime createdAt;

    public Comment() {}

    public Comment(Long id, Long articleId, String authorName,
                   String content, LocalDateTime createdAt) {
        this.id = id;
        this.articleId = articleId;
        this.authorName = authorName;
        this.content = content;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getArticleId() { return articleId; }
    public void setArticleId(Long articleId) { this.articleId = articleId; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
