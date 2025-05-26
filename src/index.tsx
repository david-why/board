import { Hono, type Context } from 'hono';
import { css } from 'hono/css';
import type { H as HonoH } from 'hono/types';
import { Layout, Error } from './layout';

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
	return c.html(
		<Layout>
			<h1>Welcome to The Board</h1>
			<form action="/post" method="post">
				<p>
					<textarea name="message" placeholder="Write something..." class={textarea}></textarea>
				</p>
				<p><input name="username" placeholder='Username' class={input} /></p>
				<p>
					<button>Post</button>
				</p>
			</form>
			<h2>Recent Posts</h2>
			{!!posts.results.length &&
				posts.results.map((post) => (
					<>
						<span>{new Date(post.created_at).toLocaleString()}</span>
						<p>{post.message}</p>
					</>
				))}
			{!posts.results.length && <p>No posts yet.</p>}
		</Layout>,
	);
});

app.post('/post', async (c) => {
	const body = await c.req.formData();
	const message = body.get('message');
	const username = body.get('username');
	if (!message || !username) {
		return c.html(<Error>Message cannot be empty.</Error>, { status: 400 });
	}
	// console.log(`Post sent: ${body.get('message')}`);
	await c.env.DB.prepare('INSERT INTO posts (message, username) VALUES (?)').bind(body.get('message')).run();
	return c.redirect('/');
});

export default app;
