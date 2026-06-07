CREATE TABLE IF NOT EXISTS migrations (
    id INT PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    username STRING NOT NULL,
    avatar_url STRING NOT NULL,
    discord_id STRING NOT NULL,
);

CREATE TABLE IF NOT EXISTS templates_cards (
    id UUID PRIMARY KEY,
    name STRING NOT NULL,
    description STRING,
    width INT NOT NULL,
    height INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates_buckets (
    id UUID PRIMARY KEY,
    name STRING NOT NULL,
    card_id UUID, -- Can be null as this could be a standalone bucket template
    weight FLOAT NOT NULL,
    standalone BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates_prompts (
    id UUID PRIMARY KEY,
    card_id UUID, -- Can be null as it could belong to a standalone bucket template
    bucket_id UUID NOT NULL,
    prompt STRING NOT NULL,
    description STRING,
);

CREATE TABLE IF NOT EXISTS templates_freespaces (
    id UUID PRIMARY KEY,
    card_id UUID, -- Can be null as it could belong to a standalone bucket template
    bucket_id UUID NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    image_url STRING NOT NULL,
    source_name STRING NOT NULL,
    source_url STRING,
    stretch BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY,
    name STRING NOT NULL,
    description STRING,
    width INT NOT NULL,
    height INT NOT NULL,
    date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buckets (
    id UUID PRIMARY KEY,
    card_id UUID NOT NULL,
    name STRING NOT NULL,
    weight FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY,
    card_id UUID NOT NULL,
    bucket_id UUID NOT NULL,
    prompt STRING NOT NULL,
    description STRING,
);

CREATE TABLE IF NOT EXISTS freespaces (
    id UUID PRIMARY KEY,
    card_id UUID NOT NULL,
    bucket_id UUID NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    image_url STRING NOT NULL,
    source_name STRING NOT NULL,
    source_url STRING,
    stretch BOOLEAN NOT NULL
);

INSERT INTO migrations (id) VALUES (0) ON CONFLICT (id) DO NOTHING;