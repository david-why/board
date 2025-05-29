DROP TABLE IF EXISTS users;
CREATE TABLE users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT NOT NULL,
	username TEXT NOT NULL,
	created_at REAL DEFAULT (unixepoch('subsec'))
);

CREATE INDEX idx_users_email ON users (email);
CREATE UNIQUE INDEX idx_users_username ON users (username);

DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	message TEXT NOT NULL,
	user_id INTEGER NOT NULL,
	created_at REAL DEFAULT (unixepoch('subsec')),
	updated_at REAL DEFAULT (unixepoch('subsec')),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_created_at ON posts (created_at);
CREATE INDEX idx_posts_user_id ON posts (user_id);

DROP TABLE IF EXISTS codes;
CREATE TABLE codes (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	code TEXT NOT NULL,
	user_id INTEGER NOT NULL,
	created_at REAL DEFAULT (unixepoch('subsec')),
	expires_at AS (created_at + 600),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_codes_created_at ON codes (created_at);
CREATE INDEX idx_codes_user_id ON codes (user_id);
