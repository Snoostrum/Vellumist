package com.blog.model;

import java.time.LocalDateTime;

public class MusicRec {
    private Long id;
    private String songName;
    private String artist;
    private String coverUrl;
    private String linkUrl;
    private LocalDateTime createdAt;

    public MusicRec() {}

    public MusicRec(Long id, String songName, String artist,
                    String coverUrl, String linkUrl, LocalDateTime createdAt) {
        this.id = id;
        this.songName = songName;
        this.artist = artist;
        this.coverUrl = coverUrl;
        this.linkUrl = linkUrl;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSongName() { return songName; }
    public void setSongName(String songName) { this.songName = songName; }
    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
