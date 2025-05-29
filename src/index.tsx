import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { Style } from 'hono/css';
import { ErrorBoundary } from 'hono/jsx';
import { jsxRenderer } from 'hono/jsx-renderer';
import type { H as HonoH } from 'hono/types';
import { auth, requireAuth, sendCode, signIn, signOut } from './auth';
import PostForm from './components/PostForm';
import PostSummary from './components/PostSummary';
import TimeZoneForm from './components/TimeZoneForm';
import { ErrorLayout } from './layout';
import { addPost, getRecentPosts } from './repositories/post';
import { getOrCreateUser, updateUsername } from './repositories/user';
import { addCode, checkCode } from './repositories/code';

declare global {
	interface HonoEnv {
		Bindings: Env;
	}
	type H = HonoH<HonoEnv>;
	type C = Context<HonoEnv>;
}

declare module 'hono' {
	interface ContextVariableMap {
		utcOffset: number;
		user?: User;
	}
}

const app = new Hono<HonoEnv>();

app.use(auth);

app.use(async (c, next) => {
	let utcOffset = parseFloat(getCookie(c, 'utcOffset') || '');
	if (isNaN(utcOffset)) {
		setCookie(c, 'utcOffset', '8', {
			maxAge: 60 * 60 * 24 * 365, // 1 year
		});
		utcOffset = 8;
	}
	c.set('utcOffset', utcOffset);
	return next();
});

app.use(async (c, next) => {
	await next();
	if (c.error) {
		console.error('Error occurred:', c.error);
		c.status(500);
		c.res = await c.render(<ErrorLayout>{c.error.message || 'An unexpected error occurred.'}</ErrorLayout>);
	}
});

app.use(
	jsxRenderer(({ children }) => (
		<html>
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<meta name="robots" content="noindex" />
				<link rel="stylesheet" href="/styles.css" />
				<Style />
			</head>
			<body>
				<ErrorBoundary fallbackRender={(error) => <ErrorLayout>{error.message}</ErrorLayout>}>{children}</ErrorBoundary>
			</body>
		</html>
	)),
);

app.notFound((c) => {
	return c.render(
		<>
			<h1>404 Not Found</h1>
			<p>The page you are looking for does not exist.</p>
			<p>
				<a href="/">Go back to the homepage</a>
			</p>
		</>,
	);
});

app.get('/', async (c) => {
	const posts = await getRecentPosts(c, 10);
	const utcOffset = parseFloat(getCookie(c, 'utcOffset') || '0');
	return c.render(
		<>
			<h1>Welcome to The Board</h1>
			<PostForm />
			<h2>Recent Posts</h2>
			{!!posts.length && posts.map((post) => <PostSummary post={post} utcOffset={utcOffset}></PostSummary>)}
			{!posts.length && (
				<>
					<p>No posts yet.</p>
					<hr />
				</>
			)}
			<TimeZoneForm utcOffset={utcOffset} />
		</>,
	);
});

app.get('/login', (c) => {
	const user = c.get('user');
	if (user) {
		return c.redirect('/');
	}
	return c.render(
		<>
			<h1>Sign In</h1>
			<p>You must sign in to post messages. Your email address will not be displayed anywhere.</p>
			<form action="/api/login" method="post">
				<p>
					<input name="email" placeholder="Email" type="email" required />
				</p>
				<p>
					<button type="submit">Sign In</button>
				</p>
			</form>
		</>,
	);
});

app.get('/logout', async (c) => {
	await signOut(c);
	return c.redirect('/');
});

app.get('/verify', async (c) => {
	const userId = c.req.query('id');
	if (!userId) {
		c.status(400);
		throw new Error('Invalid verification link.');
	}
	return c.render(
		<>
			<h1>Verify Your Email</h1>
			<p>A verification code has been sent to your Teams account. Please enter it below.</p>
			<form action="/api/verify" method="post">
				<p>
					<input name="id" type="hidden" value={userId} />
					<input name="code" placeholder="Verification code" required />
				</p>
				<p>
					<button type="submit">Verify</button>
				</p>
			</form>
		</>,
	);
});

app.use('/api/post', requireAuth);

app.post('/api/post', async (c) => {
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

app.post('/api/set-timezone', async (c) => {
	const body = await c.req.formData();
	const hour = parseInt(body.get('hour') as string);
	const minute = parseInt(body.get('minute') as string);
	if (isNaN(hour) || isNaN(minute)) {
		throw new Error('Invalid timezone.');
	}
	console.log(hour, minute);
	const utcOffset = hour + (minute / 60) * (hour / Math.abs(hour));
	setCookie(c, 'utcOffset', utcOffset.toString(), {
		maxAge: 60 * 60 * 24 * 365, // 1 year
	});
	return c.redirect('/');
});

app.post('/api/set-username', async (c) => {
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

app.post('/api/login', async (c) => {
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
	const params = new URLSearchParams();
	params.set('id', user.id.toString());
	return c.redirect(`/verify?${params.toString()}`);
});

app.post('/api/verify', async (c) => {
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

export default {
	fetch: app.fetch,
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		await env.DB.prepare('DELETE FROM codes WHERE expires_at < unixepoch()').run();
		console.log('Cleaned up expired verification codes.');
	},
};
