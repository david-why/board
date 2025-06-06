import { getCookie } from 'hono/cookie';
import { css } from 'hono/css';
import { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';
import UsernameForm from './UsernameForm';

const PostForm: FC<{ post?: Post; callback?: string }> = ({ post, callback }) => {
	const c = useRequestContext<HonoEnv>();
	const user = c.get('user');
	const loggedIn = !!user;

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
		<>
			<p>
				You are logged in as <b>{user.email}</b>. Your email will not be displayed anywhere.
			</p>
			<UsernameForm />
			<form action={callback || '/api/post'} method="post">
				<p>
					<textarea name="message" placeholder="Write something..." required autofocus class={textarea}>{post?.message}</textarea>
				</p>
				<p>
					<button type="submit">Post</button>
				</p>
			</form>
		</>
	);
};

export default PostForm;
