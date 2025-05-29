import { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';

function offsetToTimeZone(offset: number): string {
	const hour = Math.floor(Math.abs(offset)).toString().padStart(2, '0');
	const minute = Math.floor((Math.abs(offset) % 1) * 60).toString().padStart(2, '0');
	return `${offset >= 0 ? '+' : ''}${hour}:${minute}`;
}

const DateText: FC<{ date: Date }> = ({ date }) => {
	const c: C = useRequestContext();
	const utcOffset = c.get('utcOffset');
	const options: Intl.DateTimeFormatOptions = {
		timeZone: offsetToTimeZone(utcOffset),
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZoneName: 'shortOffset',
	};
	const formattedDate = date.toLocaleString('en-CA', options);
	return (
		<span>
			<time datetime={date.toISOString()}>{formattedDate}</time>
		</span>
	);
};

export default DateText;
