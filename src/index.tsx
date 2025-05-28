import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { Style } from 'hono/css';
import { jsxRenderer } from 'hono/jsx-renderer';
import type { H as HonoH } from 'hono/types';
import PostForm from './components/PostForm';
import PostSummary from './components/PostSummary';
import TimeZoneForm from './components/TimeZoneForm';
import { ErrorLayout } from './layout';
import { auth, requireAuth, sendCode, signIn, signOut } from './auth';
import { ErrorBoundary } from 'hono/jsx';

declare global {
	interface HonoEnv {
		Bindings: Env;
	}
	type H = HonoH<HonoEnv>;
	type C = Context<HonoEnv>;
}

declare module 'hono' {
	interface ContextVariableMap {
		email?: string;
	}
}

const app = new Hono<HonoEnv>();

app.use(auth);

app.use(async (c, next) => {
	await next();
	if (c.error) {
		c.res = await c.render(<ErrorLayout>{c.error.message || 'An unexpected error occurred.'}</ErrorLayout>);
		c.res.status = 500;
	}
});

app.use(
	jsxRenderer(({ children }) => {
		return (
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
		);
	}),
);

app.get('/', async (c) => {
	const posts = await c.env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 10').all<Post>();
	const utcOffset = parseFloat(getCookie(c, 'utcOffset') || '0');
	return c.render(
		<>
			<h1>Welcome to The Board</h1>
			<PostForm />
			<h2>Recent Posts</h2>
			{!!posts.results.length && posts.results.map((post) => <PostSummary post={post} utcOffset={utcOffset}></PostSummary>)}
			{!posts.results.length && (
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
	const email = c.get('email');
	if (email) {
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
	const email = c.req.query('email');
	if (!email) {
		c.status(400);
		throw new Error('Invalid verification link.');
	}
	return c.render(
		<>
			<h1>Verify Your Email</h1>
			<p>A verification code has been sent to your Teams account. Please enter it below.</p>
			<form action="/api/verify" method="post">
				<p>
					<input name="email" type="hidden" value={email} />
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
	const body = await c.req.formData();
	const message = body.get('message');
	const username = body.get('username');
	if (!message || typeof message !== 'string' || !username || typeof username !== 'string') {
		c.status(400);
		throw new Error('Message and username cannot be empty.');
	}
	const email = c.get('email');
	if (!email) {
		c.status(401);
		throw new Error('You must be signed in to post messages.');
	}
	await c.env.DB.prepare('INSERT INTO posts (message, username, email) VALUES (?, ?, ?)').bind(message, username, email).run();
	setCookie(c, 'username', username, {
		maxAge: 60 * 60 * 24 * 365, // 1 year
	});
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
	await c.env.DB.prepare('DELETE FROM codes WHERE email = ?').bind(email).run();
	await c.env.DB.prepare('INSERT INTO codes (email, code) VALUES (?, ?)').bind(email, code.toString()).run();
	const params = new URLSearchParams();
	params.set('email', email);
	return c.redirect(`/verify?${params.toString()}`);
});

app.post('/api/verify', async (c) => {
	const body = await c.req.formData();
	const email = body.get('email');
	const code = body.get('code');
	if (!email || typeof email !== 'string' || !code || typeof code !== 'string') {
		// return c.render(<Error>Invalid verification code.</Error>);
		throw new Error('Invalid verification code.');
	}
	const result = await c.env.DB.prepare('SELECT * FROM codes WHERE email = ? AND code = ?').bind(email, code).first();
	if (!result) {
		// return c.render(<Error>Invalid verification code.</Error>);
		throw new Error('Invalid verification code.');
	}
	await c.env.DB.prepare('DELETE FROM codes WHERE email = ?').bind(email).run();
	await signIn(c, email);
	return c.redirect('/');
});

export default {
	fetch: app.fetch,
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		await env.DB.prepare('DELETE FROM codes WHERE created_at < datetime("now", "-10 minutes")').run();
		console.log('Cleaned up expired verification codes.');
	},
};
