interface DbPost {
	id: number;
	message: string;
	user_id: number;
	created_at: number;
}

const GET_RECENT_POSTS_SQL = `
SELECT
	p.*,
	u.username,
	u.email
FROM
	posts p
INNER JOIN
	users u ON p.user_id = u.id
ORDER BY
	p.created_at DESC
LIMIT ?;
`;

export const getRecentPosts = async (c: C, limit: number = 10): Promise<PostWithUsername[]> => {
	const posts = await c.env.DB.prepare(GET_RECENT_POSTS_SQL).bind(limit).all<DbPost & { username: string; email: string }>();
	return posts.results.map((post) => ({
		id: post.id,
		message: post.message,
		username: post.username,
		email: post.email,
		created_at: new Date(post.created_at * 1000),
	}));
}

const ADD_POST_SQL = `
INSERT INTO posts (message, user_id) VALUES (?, ?);
`;

export const addPost = async (c: C, message: string, userId: number): Promise<number> => {
	const result = await c.env.DB.prepare(ADD_POST_SQL).bind(message, userId).run();
	return result.meta.last_row_id;
}
