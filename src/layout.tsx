import { css, Style } from 'hono/css';
import type { FC } from 'hono/jsx';

export const Layout: FC = ({ children }) => {
	const styles = css`
		body {
			margin: 40px auto;
			font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			max-width: 800px;
			line-height: 1.6;
			color: #333;
			padding: 0 10px;
			font-size: 16px;
		}
		input, textarea {
			font-family: inherit;
			font-size: inherit;
			color: inherit;
		}
	`;
	return (
		<html>
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<meta name="robots" content="noindex" />
				<Style>{styles}</Style>
			</head>
			<body>{children}</body>
		</html>
	);
};

export const Error: FC = ({ children }) => {
	return (
		<Layout>
			<h1>Error</h1>
			<p>{children}</p>
			<p>
				<a href="javascript:history.back()">Go back</a>
			</p>
		</Layout>
	);
}
