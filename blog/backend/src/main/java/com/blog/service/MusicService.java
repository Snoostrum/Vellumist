package com.blog.service;

import com.blog.model.MusicRec;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MusicService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String NETEASE_API = "http://localhost:3000";

    @SuppressWarnings("unchecked")
    public List<MusicRec> getRecommendations() {
        try {
            String url = NETEASE_API + "/personalized?limit=6";
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null || !response.containsKey("result")) {
                return getFallbackRecommendations();
            }

            List<Map<String, Object>> playlists =
                    (List<Map<String, Object>>) response.get("result");

            List<MusicRec> recs = new ArrayList<>();
            for (Map<String, Object> pl : playlists) {
                MusicRec rec = new MusicRec();
                rec.setSongName((String) pl.get("name"));
                rec.setCoverUrl((String) pl.get("picUrl"));
                Number id = (Number) pl.get("id");
                rec.setLinkUrl("https://music.163.com/playlist?id=" + id);
                rec.setArtist("推荐歌单");
                recs.add(rec);
            }
            return recs;
        } catch (Exception e) {
            return getFallbackRecommendations();
        }
    }

    private List<MusicRec> getFallbackRecommendations() {
        // 当网易云 API 不可用时返回空列表，前端会显示 fallback 内容
        return List.of();
    }
}
