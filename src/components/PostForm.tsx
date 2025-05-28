import { getCookie } from 'hono/cookie';
import { css } from 'hono/css';
import { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';

const PostForm: FC = () => {
	const c = useRequestContext<HonoEnv>();
	const email = c.get('email');
	const loggedIn = !!email;

	const username = getCookie(c, 'username') || '';

	const textarea = css`
		width: 100%;
		height: 200px;
		resize: vertical;
	`;
	const input = css`
		width: 100%;
	`;

	if (!loggedIn) {
		return (
			<p>
				Although this is an anonymous messaging board, you must <a href="/login">sign in</a> to post in order to prevent spam.
			</p>
		);
	}

	return (
		<form action="/api/post" method="post">
			<p>
				You are logged in as <strong>{email}</strong>. Your email will not be displayed anywhere.
			</p>
			<p>
				<textarea name="message" placeholder="Write something..." required class={textarea}></textarea>
			</p>
			<p>
				<input name="username" placeholder="Username" required value={username} class={input} />
			</p>
			<p>
				<button type="submit">Post</button>
			</p>
		</form>
	);
};

export default PostForm;
