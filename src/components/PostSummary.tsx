import type { FC } from 'hono/jsx';

const PostSummary: FC<{ post: Post }> = ({ post }) => {
	return (
		<div>
			<p>
				<b>{post.username}</b> @ <span>{new Date(post.created_at).toLocaleString()}</span>
			</p>
			<blockquote>{post.message}</blockquote>
			<p>
				<a href={`/post/${post.id}`}>View</a>
			</p>
			<hr />
		</div>
	);
};

export default PostSummary;
