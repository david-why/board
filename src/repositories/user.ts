interface DbUser {
	id: number;
	email: string;
	username: string;
	created_at: number;
}

const mapUser = (user: DbUser): User => ({
	id: user.id,
	email: user.email,
	username: user.username,
	created_at: new Date(user.created_at * 1000),
});

const UPDATE_USERNAME_SQL = `
UPDATE users SET username = ? WHERE id = ?;
`;

export const updateUsername = async (c: C, userId: number, username: string): Promise<void> => {
	await c.env.DB.prepare(UPDATE_USERNAME_SQL).bind(username, userId).run();
};

const GET_USER_BY_EMAIL_SQL = `
SELECT * FROM users WHERE email = ?;
`;

export const getUserByEmail = async (c: C, email: string): Promise<User | null> => {
	const user = await c.env.DB.prepare(GET_USER_BY_EMAIL_SQL).bind(email.toLowerCase()).first<DbUser>();
	return user && mapUser(user);
}

const CREATE_USER_SQL = `
INSERT INTO users (email, username) VALUES (?, ?);
`;

export const getOrCreateUser = async (c: C, email: string): Promise<User> => {
	email = email.toLowerCase();
	const existingUser = await getUserByEmail(c, email);
	if (existingUser) {
		return existingUser;
	}
	const username = `user_${Math.random().toString(36).substring(2, 10)}`;
	await c.env.DB.prepare(CREATE_USER_SQL).bind(email, username).run();
	const newUser = await getUserByEmail(c, email);
	if (!newUser) {
		throw new Error(`Failed to create user with email ${email}`);
	}
	return newUser;
}

const GET_USER_SQL = `
SELECT * FROM users WHERE id = ?;
`;

export const getUser = async (c: C, userId: number): Promise<User | null> => {
	const user = await c.env.DB.prepare(GET_USER_SQL).bind(userId).first<DbUser>();
	return user && mapUser(user);
}
