CREATE TABLE IF NOT EXISTS migrations (
    id INT PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO migrations (id) VALUES (0) ON CONFLICT (id) DO NOTHING;

-- TODO: Since we make migration 0 above, we need to create all the tables here ("init migration")