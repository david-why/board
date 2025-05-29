const ADD_CODE_SQL = `
INSERT INTO codes (user_id, code) VALUES (?, ?);
`;

export const addCode = async (c: C, id: number, code: string): Promise<void> => {
	await cleanupCodes(c);
	await c.env.DB.prepare(ADD_CODE_SQL).bind(id, code).run();
};

const CHECK_CODE_SQL = `
SELECT * FROM codes WHERE user_id = ? AND code = ?;
`;

export const checkCode = async (c: C, id: number, code: string): Promise<boolean> => {
	await cleanupCodes(c);
	const result = await c.env.DB.prepare(CHECK_CODE_SQL).bind(id, code).first();
	return !!result;
}

const CLEANUP_CODES_SQL = `
DELETE FROM codes WHERE expires_at < unixepoch();
`;

export const cleanupCodes = async (c: C) => {
	await c.env.DB.exec(CLEANUP_CODES_SQL);
}
