import { FC } from 'hono/jsx';

const DateText: FC<{ date: Date }> = ({ date }) => {
	const options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		timeZoneName: 'short',
	};
	const formattedDate = date.toLocaleString('en-US', options);
	return (
		<span>
			<time datetime={date.toISOString()}>{formattedDate}</time>
		</span>
	);
};

export default DateText;
