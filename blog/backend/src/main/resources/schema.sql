CREATE TABLE IF NOT EXISTS articles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)  NOT NULL,
    summary     VARCHAR(500),
    content     TEXT          NOT NULL,
    cover_image VARCHAR(500),
    view_count  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS music_recs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    song_name   VARCHAR(200) NOT NULL,
    artist      VARCHAR(200),
    cover_url   VARCHAR(500),
    link_url    VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
