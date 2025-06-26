export default {
	name: 'url',
	isActive(c: C) {
		return !!c.env.VERIFY_CODE_URL;
	},
	async setup() {},
	async sendCode(c: C, email: string, code: number) {
		const result = await fetch(c.env.VERIFY_CODE_URL!, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				email,
				code: code.toString(),
			}),
		});
		if (!result.ok) {
			throw new Error(`Failed to create verification code`);
		}
		const data = await result.json<{ success: boolean }>();
		if (!data.success) {
			throw new Error(`Failed to send verification code`);
		}
	},
};
