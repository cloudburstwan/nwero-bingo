CREATE TABLE IF NOT EXISTS "migrations" (
                                            "name" TEXT NOT NULL UNIQUE,
                                            "applied_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                            PRIMARY KEY("name")
    );




CREATE TABLE IF NOT EXISTS "users" (
                                       "id" UUID NOT NULL UNIQUE,
                                       "username" TEXT NOT NULL,
                                       "avatar_url" TEXT,
                                       "avatar_hash" TEXT,
                                       "discord_id" TEXT NOT NULL,
                                       PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "templates_cards" (
                                                 "id" UUID NOT NULL UNIQUE,
                                                 "name" TEXT NOT NULL,
                                                 "description" TEXT,
                                                 "width" INTEGER NOT NULL,
                                                 "height" INTEGER NOT NULL,
                                                 "created_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                                 "updated_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                                 PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "templates_buckets" (
                                                   "id" UUID NOT NULL UNIQUE,
                                                   "name" TEXT NOT NULL,
                                                   "card_id" UUID,
                                                   "weight" DECIMAL NOT NULL,
                                                   "standalone" BOOLEAN NOT NULL,
                                                   "created_at" TIMESTAMPTZ DEFAULT TIMEZONE('UTC', NOW()),
                                                   "updated_at" TIMESTAMPTZ DEFAULT TIMEZONE('UTC', NOW()),
                                                   PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "templates_prompts" (
                                                   "id" UUID NOT NULL UNIQUE,
                                                   "bucket_id" UUID NOT NULL,
                                                   "prompt" TEXT NOT NULL,
                                                   "description" TEXT,
                                                   PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "templates_free_spaces" (
                                                       "id" UUID NOT NULL UNIQUE,
                                                       "card_id" UUID NOT NULL,
                                                       "artwork_id" UUID,
                                                       "x" INTEGER NOT NULL,
                                                       "y" INTEGER NOT NULL,
                                                       "stretch" BOOLEAN NOT NULL,
                                                       PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "cards" (
                                       "id" UUID NOT NULL UNIQUE,
                                       "name" TEXT NOT NULL,
                                       "description" TEXT,
                                       "width" INTEGER NOT NULL,
                                       "height" INTEGER NOT NULL,
                                       "date" TIMESTAMPTZ NOT NULL,
                                       "created_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                       "updated_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                       PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "archived_cards" (
                                                "id" UUID NOT NULL UNIQUE,
                                                "name" TEXT NOT NULL,
                                                "date" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                                "archived_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                                PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "buckets" (
                                         "id" UUID NOT NULL UNIQUE,
                                         "card_id" UUID NOT NULL,
                                         "name" TEXT NOT NULL,
                                         "weight" DECIMAL NOT NULL,
                                         PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "prompts" (
                                         "id" UUID NOT NULL UNIQUE,
                                         "bucket_id" UUID NOT NULL,
                                         "prompt" TEXT NOT NULL,
                                         "description" TEXT,
                                         PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "artworks" (
                                          "id" UUID NOT NULL UNIQUE,
                                          "src" TEXT NOT NULL,
                                          "source_name" TEXT NOT NULL,
                                          "source_url" TEXT,
                                          "created_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                          PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "free_spaces" (
                                             "id" UUID NOT NULL UNIQUE,
                                             "card_id" UUID NOT NULL,
                                             "artwork_id" UUID,
                                             "x" INTEGER NOT NULL,
                                             "y" INTEGER NOT NULL,
                                             "stretch" BOOLEAN NOT NULL,
                                             PRIMARY KEY("id")
    );




CREATE TABLE IF NOT EXISTS "history" (
                                         "id" UUID NOT NULL UNIQUE,
                                         "user_id" UUID NOT NULL,
                                         "table" TEXT NOT NULL,
                                         "action" INTEGER NOT NULL,
                                         "primary_key" TEXT,
                                         "data" JSON NOT NULL,
                                         "created_at" TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('UTC', NOW()),
                                         PRIMARY KEY("id")
    );

INSERT INTO "migrations" ("name") VALUES ('db-init');
INSERT INTO "users" ("id", "username", "avatar_url", "discord_id") VALUES ('00000000-0000-0000-0000-000000000000', 'System', '/admin/system-avatar.png', '000000000000000000');
INSERT INTO "history" ("id", "user_id", "table", "action", "primary_key", "data") VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'users', 1, '00000000-0000-0000-0000-000000000000', '{"username":"System","avatar_url":"{CDN}/admin/system-avatar.png","discord_id":"000000000000000000"}');
INSERT INTO "history" ("id", "user_id", "table", "action", "primary_key", "data") VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'migrations', 1, 'db-init', '{}');