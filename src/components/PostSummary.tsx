import type { FC } from 'hono/jsx';
import DateText from './DateText';

const PostSummary: FC<{ post: PostWithUsername; utcOffset: number }> = ({ post, utcOffset }) => {
	return (
		<div>
			<p>
				<b>{post.username}</b> @ <DateText date={post.created_at} />
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
