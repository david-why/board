DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	message TEXT NOT NULL,
	username TEXT NOT NULL,
	email TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_created_at ON posts (created_at);
CREATE INDEX idx_posts_email ON posts (email);

DROP TABLE IF EXISTS codes;
CREATE TABLE codes (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	code TEXT NOT NULL,
	email TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_codes_created_at ON codes (created_at);
CREATE INDEX idx_codes_email ON codes (email);
