CREATE TABLE github_backlog_item (
    id_backlog_item  INT PRIMARY KEY REFERENCES backlog_item(id) ON DELETE CASCADE,
    branch_name      TEXT NOT NULL,
    pr_number        INT  NULL,
    pr_url           TEXT NULL,
    pr_status        TEXT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);