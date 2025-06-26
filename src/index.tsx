import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { Style } from 'hono/css';
import { ErrorBoundary } from 'hono/jsx';
import { jsxRenderer } from 'hono/jsx-renderer';
import type { H as HonoH } from 'hono/types';
import api from './api';
import { auth, setupAuthProviders, signOut } from './auth';
import PostForm from './components/PostForm';
import PostSummary from './components/PostSummary';
import TimeZoneForm from './components/TimeZoneForm';
import { ErrorLayout } from './layout';
import { getPost, getRecentPosts } from './repositories/post';

declare global {
	interface Env {
		VERIFY_SENT_MESSAGE?: string;

		VERIFY_CODE_URL?: string;

		VERIFY_OUTLOOK_CLIENT_ID?: string;
		VERIFY_OUTLOOK_CLIENT_SECRET?: string;
		VERIFY_OUTLOOK_TENANT?: string;
	}
}

declare global {
	interface HonoEnv {
		Bindings: Env;
	}
	type H = HonoH<HonoEnv>;
	type C = Context<HonoEnv>;
	type App = Hono<HonoEnv>;
}

declare module 'hono' {
	interface ContextVariableMap {
		utcOffset: number;
		user?: User;
	}
}

const app = new Hono<HonoEnv>();

await setupAuthProviders(app);

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

app.onError((err, c) => {
	console.error(err);
	return c.render(<ErrorLayout>{err.message || 'An unexpected error occurred.'}</ErrorLayout>);
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
			{!!posts.length && posts.map((post) => <PostSummary post={post}></PostSummary>)}
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
			<p>You must sign in to post messages. Your email address will not be displayed anywhere. Please use your Teams email address. uwu~</p>
			<form action="/api/login" method="post">
				<p>
					<input name="email" placeholder="Email" type="email" autocomplete="email" required />
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
	const message = c.env.VERIFY_SENT_MESSAGE || 'A verification code has been sent to your email address.';
	return c.render(
		<>
			<h1>Verify Your Email</h1>
			<p>{message} Please enter it below.</p>
			<form action="/api/verify" method="post">
				<p>
					<input name="id" type="hidden" value={userId} />
					<input name="code" placeholder="Verification code" autocomplete="one-time-code" required />
				</p>
				<p>
					<button type="submit">Verify</button>
				</p>
			</form>
		</>,
	);
});

app.get('/post/:id/delete', async (c) => {
	const user = c.get('user');
	if (!user) {
		c.status(401);
		throw new Error('You must be signed in to delete posts.');
	}
	const postId = parseInt(c.req.param('id'));
	if (isNaN(postId)) {
		c.status(400);
		throw new Error('Invalid post ID.');
	}
	const post = await getPost(c, postId);
	if (!post) {
		c.status(404);
		throw new Error('Post not found.');
	}
	if (post.username !== user.username) {
		c.status(403);
		throw new Error('You can only delete your own posts.');
	}
	return c.render(
		<>
			<h1>Delete Post</h1>
			<p>Are you sure you want to delete the following post?</p>
			<hr />
			<PostSummary post={post} showLinks={false} />
			<p>This action cannot be undone.</p>
			<form action="/api/post/delete" method="post">
				<input type="hidden" name="id" value={postId} />
				<p>
					<button type="submit">Delete</button>
				</p>
			</form>
			<p>
				<a href="javascript:history.back()">Cancel</a>
			</p>
		</>,
	);
});

app.get('/post/:id/edit', async (c) => {
	const user = c.get('user');
	if (!user) {
		c.status(401);
		throw new Error('You must be signed in to edit posts.');
	}
	const postId = parseInt(c.req.param('id'));
	if (isNaN(postId)) {
		c.status(400);
		throw new Error('Invalid post ID.');
	}
	const post = await getPost(c, postId);
	if (!post) {
		c.status(404);
		throw new Error('Post not found.');
	}
	if (post.username !== user.username) {
		c.status(403);
		throw new Error('You can only edit your own posts.');
	}
	return c.render(
		<>
			<h1>Edit Post</h1>
			<PostForm post={post} callback={'/api/post/edit?id=' + post.id} />
			<p>
				<a href="javascript:history.back()">Cancel</a>
			</p>
		</>,
	);
});

app.route('/api', api);

export default {
	fetch: app.fetch,
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(env.DB.prepare('DELETE FROM codes WHERE expires_at < unixepoch()').run());
		console.log('Cleaned up expired verification codes.');
	},
};
