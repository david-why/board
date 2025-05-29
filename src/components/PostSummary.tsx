import type { FC } from 'hono/jsx';
import DateText from './DateText';

const PostSummary: FC<{ post: PostWithUsername; utcOffset: number }> = ({ post, utcOffset }) => {
	const date = new Date(post.created_at);
	date.setHours(date.getHours() - date.getTimezoneOffset() / 60);
	date.setTime(date.getTime() + utcOffset * 3600000);
	return (
		<div>
			<p>
				<b>{post.username}</b> @ <DateText date={date} />
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
