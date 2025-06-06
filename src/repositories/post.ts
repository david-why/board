interface DbPost {
	id: number;
	message: string;
	user_id: number;
	created_at: number;
}

const GET_RECENT_POSTS_SQL = `
SELECT
	p.*,
	u.username
FROM
	posts p
INNER JOIN
	users u ON p.user_id = u.id
ORDER BY
	p.created_at DESC
LIMIT ?;
`;

export const getRecentPosts = async (c: C, limit: number = 10): Promise<PostWithUsername[]> => {
	const posts = await c.env.DB.prepare(GET_RECENT_POSTS_SQL).bind(limit).all<DbPost & { username: string }>();
	return posts.results.map((post) => ({
		id: post.id,
		message: post.message,
		username: post.username,
		user_id: post.user_id,
		created_at: new Date(post.created_at * 1000),
	}));
};

const ADD_POST_SQL = `
INSERT INTO posts (message, user_id) VALUES (?, ?);
`;

export const addPost = async (c: C, message: string, userId: number): Promise<number> => {
	const result = await c.env.DB.prepare(ADD_POST_SQL).bind(message, userId).run();
	return result.meta.last_row_id;
};

const GET_POST_SQL = `
SELECT
	p.*,
	u.username
FROM
	posts p
INNER JOIN
	users u ON p.user_id = u.id
WHERE
	p.id = ?;
`;

export const getPost = async (c: C, postId: number): Promise<PostWithUsername | null> => {
	const post = await c.env.DB.prepare(GET_POST_SQL).bind(postId).first<DbPost & { username: string }>();
	if (!post) return null;
	return {
		id: post.id,
		message: post.message,
		username: post.username,
		user_id: post.user_id,
		created_at: new Date(post.created_at * 1000),
	};
};

const DELETE_POST_SQL = `
DELETE FROM posts WHERE id = ? AND user_id = ?;
`;

export const deletePost = async (c: C, postId: number, userId: number): Promise<void> => {
	const result = await c.env.DB.prepare(DELETE_POST_SQL).bind(postId, userId).run();
	if (result.meta.changes === 0) {
		throw new Error('Post not found or you do not have permission to delete it.');
	}
};

const EDIT_POST_SQL = `
UPDATE posts SET message = ? WHERE id = ? AND user_id = ?;
`;

export const editPost = async (c: C, postId: number, message: string, userId: number): Promise<void> => {
	const result = await c.env.DB.prepare(EDIT_POST_SQL).bind(message, postId, userId).run();
	if (result.meta.changes === 0) {
		throw new Error('Post not found or you do not have permission to edit it.');
	}
};
