CREATE TABLE IF NOT EXISTS github_usuario (
  id_usuario       INT          PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
  github_id        BIGINT       NOT NULL UNIQUE,
  github_username  TEXT         NOT NULL,
  github_avatar_url TEXT,
  github_access_token TEXT      NOT NULL,
  connected_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
