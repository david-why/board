import { FC } from 'hono/jsx';

const TimeZoneForm: FC<{ utcOffset: number }> = ({ utcOffset }) => {
	utcOffset = utcOffset || 0;
	const selectedHour = utcOffset >= 0 ? Math.floor(utcOffset) : Math.ceil(utcOffset);
	const selectedMinute = (Math.abs(utcOffset) % 1) * 60;
	return (
		<form action="/api/set-timezone" method="post">
			<p>
				<b>Set your timezone: UTC </b>
				<select name="hour">
					{[-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((hour) => (
						<option value={hour} selected={hour === selectedHour}>
							{hour >= 10 ? `+${hour}` : hour >= 0 ? `+0${hour}` : hour >= -9 ? `-0${-hour}` : hour}
						</option>
					))}
				</select>
				<span>:</span>
				<select name="minute">
					{[0, 15, 30, 45].map((minute) => (
						<option value={minute} selected={minute === selectedMinute}>
							{minute < 10 ? `0${minute}` : minute}
						</option>
					))}
				</select>
				<button type="submit">Set</button>
			</p>
		</form>
	);
};

export default TimeZoneForm;
