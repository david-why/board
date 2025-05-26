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
	const utcOffset = parseInt(getCookie(c, 'utcOffset') || '0');
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
			{!!posts.results.length && posts.results.map((post) => <PostSummary post={post} utcOffset={utcOffset}></PostSummary>)}
			{!posts.results.length && (
				<>
					<p>No posts yet.</p>
					<hr />
				</>
			)}
			<p>
				<form action="/set-timezone" method="post">
					<b>Set your timezone: UTC </b>
					<select name="hour">
						{[-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((hour) => (
							<option value={hour} selected={hour === utcOffset}>
								{hour >= 10 ? `+${hour}` : hour >= 0 ? `+0${hour}` : hour >= -9 ? `-0${-hour}` : hour}
							</option>
						))}
					</select>
					<span>:</span>
					<select name="minute">
						{[0, 15, 30, 45].map((minute) => (
							<option value={minute} selected={minute === (utcOffset % 1) * 60}>
								{minute < 10 ? `0${minute}` : minute}
							</option>
						))}
					</select>
					<button type="submit">Set</button>
				</form>
			</p>
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

app.post('/set-timezone', async (c) => {
	const body = await c.req.formData();
	const hour = parseInt(body.get('hour') as string);
	const minute = parseInt(body.get('minute') as string);
	if (isNaN(hour) || isNaN(minute)) {
		return c.html(<Error>Invalid timezone.</Error>, { status: 400 });
	}
	const utcOffset = hour + minute / 60;
	setCookie(c, 'utcOffset', utcOffset.toString());
	return c.redirect('/');
});

export default app;
