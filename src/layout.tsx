import type { FC } from 'hono/jsx';
import { StatusCode } from 'hono/utils/http-status';

export const ErrorLayout: FC<{ children: any; status?: StatusCode }> = ({ children, status }) => {
	return (
		<>
			<h1>Error</h1>
			<p>{children}</p>
			<p>
				<a href="javascript:history.back()">Go back</a>
			</p>
		</>
	);
};
