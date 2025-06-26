import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie';
import { getUser } from './repositories/user';
import authProviders from './authProviders';

const AUTH_VERSION = 2;

export const auth: H = async (c, next) => {
	const token = await getSignedCookie(c, c.env.AUTH_SECRET, 'token');
	if (token) {
		const payload = JSON.parse(token);
		if (payload.version !== AUTH_VERSION) {
			deleteCookie(c, 'token');
		} else {
			const user = await getUser(c, payload.id);
			if (!user) {
				deleteCookie(c, 'token');
			} else {
				c.set('user', user);
			}
		}
	}
	return next();
};

export const requireAuth: H = async (c, next) => {
	const user = c.get('user');
	if (!user) {
		throw new Error('You must be signed in to access this page.');
	}
	return next();
};

export const signIn = async (c: C, id: number) => {
	const user = await getUser(c, id);
	if (!user) {
		throw new Error(`User with ID ${id} not found`);
	}
	const token = JSON.stringify({ id, version: AUTH_VERSION });
	await setSignedCookie(c, 'token', token, c.env.AUTH_SECRET, {
		maxAge: 60 * 60 * 24 * 30, // 30 days
		httpOnly: true,
		sameSite: 'lax',
	});
	c.set('user', user);
};

export const signOut = async (c: C) => {
	deleteCookie(c, 'token');
	c.set('user', undefined);
};

export const getAuthProvider = (c: C) => {
	for (const provider of authProviders) {
		if (provider.isActive(c)) {
			console.log(`Using active authentication provider: ${provider.name}`);
			return provider;
		}
	}
	throw new Error('No active authentication provider found.');
}

export const setupAuthProviders = async (app: App) => {
	for (const provider of authProviders) {
		await provider.setup(app);
	}
}
