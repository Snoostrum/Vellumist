package com.blog.controller;

import com.blog.model.ApiResponse;
import com.blog.model.MusicRec;
import com.blog.service.MusicService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/music")
public class MusicController {

    private final MusicService musicService;

    public MusicController(MusicService musicService) {
        this.musicService = musicService;
    }

    @GetMapping("/recommendations")
    public ApiResponse<List<MusicRec>> recommendations() {
        return ApiResponse.ok(musicService.findAll());
    }
}
