  CREATE TABLE proyecto_github_config (
    id_proyecto        INT PRIMARY KEY REFERENCES proyecto(id),
    github_org         TEXT NOT NULL,        -- "mi-empresa"
    github_repo        TEXT NOT NULL,        -- "mi-proyecto"
    installation_id    BIGINT NOT NULL,      -- lo que GitHub te manda
    created_at         TIMESTAMPTZ DEFAULT NOW()
  );