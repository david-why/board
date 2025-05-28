import { getCookie, getSignedCookie, setCookie, setSignedCookie, deleteCookie } from 'hono/cookie';

export const auth: H = async (c, next) => {
	const token = await getSignedCookie(c, c.env.AUTH_SECRET, 'token');
	if (token) {
		const payload = JSON.parse(token);
		c.set('email', payload.email);
	}
	return next();
};

export const requireAuth: H = async (c, next) => {
	const email = c.get('email');
	if (!email) {
		throw new Error('You must be signed in to access this page.');
	}
	return next();
};

export const sendCode = async (c: C, email: string) => {
	const code = Math.floor(Math.random() * 900000) + 100000;
	const result = await fetch(c.env.VERIFY_CODE_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			email,
			code: code.toString(),
		}),
	});
	if (!result.ok) {
		throw new Error(`Failed to create verification code`);
	}
	const data = await result.json<{ success: false } | { success: true; name: string }>();
	if (!data.success) {
		throw new Error(`Failed to send verification code`);
	}
	return code;
};

export const signIn = async (c: C, email: string) => {
	const token = JSON.stringify({ email });
	await setSignedCookie(c, 'token', token, c.env.AUTH_SECRET, {
		maxAge: 60 * 60 * 24 * 30, // 30 days
		httpOnly: true,
		sameSite: 'lax',
	});
	c.set('email', email);
};

export const signOut = async (c: C) => {
	deleteCookie(c, 'token');
	c.set('email', undefined);
};
