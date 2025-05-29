import { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';

const UsernameForm: FC = () => {
	const c: C = useRequestContext();
	const user = c.get('user');

	if (!user) {
		return <p>You must be signed in to set your username.</p>;
	}

	const { username } = user;

	return (
		<form action="/api/set-username" method="post">
			<p>
				{username ? (
					<>
						Your username is <b>{username}</b>
					</>
				) : (
					'You do not have a username yet'
				)}
				. Change your username: <input name="username" autocomplete="off" placeholder="New username" value={username} required />{' '}
				<button type="submit">Update</button>
			</p>
		</form>
	);
};

export default UsernameForm;
