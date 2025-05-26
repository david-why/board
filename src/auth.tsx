import { getCookie, getSignedCookie, setCookie, setSignedCookie, deleteCookie } from 'hono/cookie';

export const auth: H = async (c, next) => {
	const token = await getSignedCookie(c, 'token', c.env.AUTH_SECRET);
	if (token) {
		const payload = JSON.parse(token);
		c.set('email', payload.email);
	}
	return next();
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
	c.setLayout
};
