import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { css } from 'hono/css';
import type { H as HonoH } from 'hono/types';
import PostSummary from './components/PostSummary';
import { Error, Layout } from './layout';

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

app.get('/', async (c) => {
	const textarea = css`
		width: 100%;
		height: 200px;
	`;
	const input = css`
		width: 100%;
	`;
	const posts = await c.env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 10').all<Post>();
	const usernameCache = getCookie(c, 'username');
	return c.html(
		<Layout>
			<h1>Welcome to The Board</h1>
			<form action="/post" method="post">
				<p>
					<textarea name="message" placeholder="Write something..." class={textarea}></textarea>
				</p>
				<p>
					<input name="username" placeholder="Username" value={usernameCache} class={input} />
				</p>
				<p>
					<button>Post</button>
				</p>
			</form>
			<h2>Recent Posts</h2>
			{!!posts.results.length && posts.results.map((post) => <PostSummary post={post}></PostSummary>)}
			{!posts.results.length && <p>No posts yet.</p>}
		</Layout>,
	);
});

app.post('/post', async (c) => {
	const body = await c.req.formData();
	const message = body.get('message');
	const username = body.get('username');
	if (!message || typeof message !== 'string' || !username || typeof username !== 'string') {
		return c.html(<Error>Message and username cannot be empty.</Error>, { status: 400 });
	}
	// console.log(`Post sent: ${body.get('message')}`);
	await c.env.DB.prepare('INSERT INTO posts (message, username) VALUES (?, ?)').bind(message, username).run();
	setCookie(c, 'username', username as string);
	return c.redirect('/');
});

export default app;
