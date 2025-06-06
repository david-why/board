import { Hono } from 'hono';
import { requireAuth, sendCode, signIn } from '../auth';
import { addPost, deletePost, editPost } from '../repositories/post';
import { setCookie } from 'hono/cookie';
import { getOrCreateUser, updateUsername } from '../repositories/user';
import { addCode, checkCode } from '../repositories/code';

const app = new Hono<HonoEnv>();

app.use('/post', requireAuth);

app.post('/post', async (c) => {
	const user = c.get('user');
	if (!user) {
		c.status(401);
		throw new Error('You must be signed in to post messages.');
	}
	const body = await c.req.formData();
	const message = body.get('message');
	if (!message || typeof message !== 'string') {
		c.status(400);
		throw new Error('Message cannot be empty.');
	}
	await addPost(c, message, user.id);
	return c.redirect('/');
});

app.post('/set-timezone', async (c) => {
	const body = await c.req.formData();
	const hour = parseInt(body.get('hour') as string);
	const minute = parseInt(body.get('minute') as string);
	if (isNaN(hour) || isNaN(minute)) {
		throw new Error('Invalid timezone.');
	}

	const utcOffset = hour + (minute / 60) * (hour / Math.abs(hour));
	setCookie(c, 'utcOffset', utcOffset.toString(), {
		maxAge: 60 * 60 * 24 * 365, // 1 year
	});

	return c.redirect('/');
});

app.post('/set-username', async (c) => {
	const user = c.get('user');
	if (!user) {
		c.status(401);
		throw new Error('You must be signed in to set your username.');
	}
	const body = await c.req.formData();
	const username = body.get('username');
	if (!username || typeof username !== 'string' || username.length < 3 || username.length > 20) {
		c.status(400);
		throw new Error('Username must be between 3 and 20 characters long.');
	}
	if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
		c.status(400);
		throw new Error('Username can only contain letters, numbers, underscores, and dashes.');
	}

	try {
		await updateUsername(c, user.id, username);
	} catch (error: any) {
		c.status(500);
		throw new Error('Failed to update username. Possibly already taken.');
	}

	return c.redirect('/');
});

app.post('/login', async (c) => {
	const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') || '' });
	if (!success) {
		throw new Error('Too many requests. Please try again later.');
	}

	const body = await c.req.formData();
	const email = body.get('email');
	if (!email || typeof email !== 'string') {
		throw new Error('Email cannot be empty.');
	}

	let code: number;
	try {
		code = await sendCode(c, email);
	} catch (error: any) {
		throw new Error(error.message || 'Failed to send verification code.');
	}

	const user = await getOrCreateUser(c, email);
	await addCode(c, user.id, code.toString());

	return c.redirect(`/verify?id=${user.id}`);
});

app.post('/verify', async (c) => {
	const body = await c.req.formData();
	const userIdString = body.get('id');
	const code = body.get('code');
	if (!userIdString || typeof userIdString !== 'string' || !code || typeof code !== 'string') {
		throw new Error('Invalid verification code.');
	}
	const userId = parseInt(userIdString);
	if (isNaN(userId)) {
		throw new Error('Invalid user ID.');
	}

	const isCorrect = await checkCode(c, userId, code);
	if (!isCorrect) {
		throw new Error('Invalid verification code.');
	}

	await signIn(c, userId);

	return c.redirect('/');
});

app.post('/post/delete', async (c) => {
	const user = c.get('user');
	if (!user) {
		c.status(401);
		throw new Error('You must be signed in to delete posts.');
	}
	const body = await c.req.formData();
	const postIdString = body.get('id');
	if (!postIdString || typeof postIdString !== 'string') {
		c.status(400);
		throw new Error('Invalid post ID.');
	}
	const postId = parseInt(postIdString);
	if (isNaN(postId)) {
		c.status(400);
		throw new Error('Invalid post ID.');
	}
	await deletePost(c, postId, user.id);
	return c.redirect('/');
});

app.post('/post/edit', async (c) => {
	const postIdString = c.req.query('id');
	const user = c.get('user');
	if (!user) {
		c.status(401);
		throw new Error('You must be signed in to edit posts.');
	}
	const body = await c.req.formData();
	const message = body.get('message');
	if (!postIdString || !message || typeof message !== 'string') {
		c.status(400);
		throw new Error('Invalid post ID or message.');
	}
	const postId = parseInt(postIdString);
	if (isNaN(postId)) {
		c.status(400);
		throw new Error('Invalid post ID.');
	}
	await editPost(c, postId, message, user.id);
	return c.redirect('/');
});

export default app;
