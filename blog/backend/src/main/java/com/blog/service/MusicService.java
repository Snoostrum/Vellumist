package com.blog.service;

import com.blog.model.MusicRec;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.List;

@Service
public class MusicService {

    private final JdbcTemplate jdbc;

    public MusicService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<MusicRec> findAll() {
        String sql = """
            SELECT id, song_name, artist, cover_url, file_path, created_at
            FROM music_recs ORDER BY created_at DESC
            """;
        return jdbc.query(sql, new MusicRecRowMapper());
    }

    public MusicRec create(String songName, String artist, String coverUrl, String filePath) {
        String sql = """
            INSERT INTO music_recs (song_name, artist, cover_url, file_path)
            VALUES (?, ?, ?, ?)
            """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, new String[]{"id"});
            ps.setString(1, songName);
            ps.setString(2, artist);
            ps.setString(3, coverUrl);
            ps.setString(4, filePath);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        MusicRec rec = new MusicRec();
        rec.setId(key != null ? key.longValue() : null);
        rec.setSongName(songName);
        rec.setArtist(artist);
        rec.setCoverUrl(coverUrl);
        rec.setFilePath(filePath);
        return rec;
    }

    public void delete(Long id) {
        // 获取文件路径以便删除
        String filePath = jdbc.queryForObject(
                "SELECT file_path FROM music_recs WHERE id = ?",
                String.class, id);
        if (filePath != null) {
            try {
                java.nio.file.Files.deleteIfExists(java.nio.file.Path.of(filePath));
            } catch (Exception e) {
                // 文件不存在就算了
            }
        }
        jdbc.update("DELETE FROM music_recs WHERE id = ?", id);
    }

    /** 编辑音乐信息（歌名/艺术家） */
    public boolean update(Long id, String songName, String artist) {
        int rows = jdbc.update(
                "UPDATE music_recs SET song_name = ?, artist = ? WHERE id = ?",
                songName, artist, id);
        return rows > 0;
    }

    private static class MusicRecRowMapper implements RowMapper<MusicRec> {
        @Override
        public MusicRec mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new MusicRec(
                rs.getLong("id"),
                rs.getString("song_name"),
                rs.getString("artist"),
                rs.getString("cover_url"),
                rs.getString("file_path"),
                rs.getTimestamp("created_at").toLocalDateTime()
            );
        }
    }
}
