import type { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';
import DateText from './DateText';

const PostSummary: FC<{
	post: PostWithUsername;
	showLinks?: boolean;
}> = ({ post, showLinks }) => {
	const c = useRequestContext();
	const user = c.get('user');
	const username = user?.username;
	return (
		<div>
			<p>
				<b>{post.username}</b> @ <DateText date={post.created_at} />
			</p>
			<blockquote>{post.message}</blockquote>
			{showLinks !== false && (
				<p>
					{post.username === username && (
						<>
							<a href={`/post/${post.id}/edit`}>Edit</a> | <a href={`/post/${post.id}/delete`}>Delete</a>
						</>
					)}
				</p>
			)}
			<hr />
		</div>
	);
};

export default PostSummary;
