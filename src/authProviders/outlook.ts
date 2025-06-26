async function getToken(c: C) {
	const token = await c.env.KV.get('board-outlook-access-token');
	if (!token) {
		return null;
	}
	const expiry = await c.env.KV.get('board-outlook-token-expiry');
	if (!expiry || Date.now() > parseInt(expiry, 10)) {
		const refreshToken = await c.env.KV.get('board-outlook-refresh-token');
		if (!refreshToken) {
			return null;
		}
		const clientId = c.env.VERIFY_OUTLOOK_CLIENT_ID!;
		const clientSecret = c.env.VERIFY_OUTLOOK_CLIENT_SECRET!;
		const tenant = c.env.VERIFY_OUTLOOK_TENANT || 'common';
		const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: refreshToken,
				grant_type: 'refresh_token',
			}),
		});
		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json<any>();
			throw new Error(`Failed to refresh token: ${errorData.error_description || 'Unknown error'}`);
		}
		const tokenData = await tokenResponse.json<any>();
		if (!tokenData.access_token) {
			throw new Error('No token received during refresh');
		}
		await Promise.all([
			c.env.KV.put('board-outlook-access-token', tokenData.access_token),
			c.env.KV.put('board-outlook-refresh-token', tokenData.refresh_token || ''),
			c.env.KV.put('board-outlook-token-expiry', (Date.now() + tokenData.expires_in * 1000).toString()),
		]);
		return tokenData.access_token;
	}
	return token;
}

export default {
	name: 'outlook',
	isActive(c: C) {
		return !!c.env.VERIFY_OUTLOOK_CLIENT_ID;
	},
	async setup(app: App) {
		app.get('/api/admin/outlook-auth', async (c) => {
			const clientId = c.env.VERIFY_OUTLOOK_CLIENT_ID!;
			const tenant = c.env.VERIFY_OUTLOOK_TENANT || 'common';
			const authSecret = c.env.AUTH_SECRET;

			if (c.req.query('auth') !== authSecret) {
				return c.notFound();
			}

			return c.redirect(
				`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(c.req.url.split('?')[0] + '-callback')}&response_mode=query&scope=openid%20email%20offline_access%20Mail.Send`,
			);
		});
		app.get('/api/admin/outlook-auth-callback', async (c) => {
			const code = c.req.query('code');
			if (!code) {
				c.status(400);
				throw new Error('Missing authorization code.');
			}

			const clientId = c.env.VERIFY_OUTLOOK_CLIENT_ID;
			const clientSecret = c.env.VERIFY_OUTLOOK_CLIENT_SECRET;
			const tenant = c.env.VERIFY_OUTLOOK_TENANT || 'common';

			if (!clientId || !clientSecret) {
				throw new Error('Outlook client ID or secret is not configured.');
			}

			const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: clientId,
					client_secret: clientSecret,
					code,
					redirect_uri: c.req.url.split('?')[0],
					grant_type: 'authorization_code',
				}),
			});

			if (!tokenResponse.ok) {
				const errorData = await tokenResponse.json<any>();
				throw new Error(`Failed to exchange code for token: ${errorData.error_description || 'Unknown error'}`);
			}

			const tokenData = await tokenResponse.json<any>();
			if (!tokenData.access_token) {
				throw new Error('No access token received from Outlook.');
			}

			await Promise.all([
				c.env.KV.put('board-outlook-access-token', tokenData.access_token),
				c.env.KV.put('board-outlook-refresh-token', tokenData.refresh_token || ''),
				c.env.KV.put('board-outlook-token-expiry', (Date.now() + tokenData.expires_in * 1000).toString()),
			]);

			return c.json({ success: true, message: 'Outlook authentication successful.' });
		});
	},
	async sendCode(c: C, email: string, code: number) {
		const accessToken = await getToken(c);
		if (!accessToken) {
			throw new Error('Code sending not configured');
		}
		const result = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: {
					subject: 'Your Verification Code',
					body: {
						contentType: 'Text',
						content: `Your verification code is ${code}.`,
					},
					toRecipients: [
						{
							emailAddress: {
								address: email,
							},
						},
					],
				},
			}),
		});
		if (!result.ok) {
			throw new Error(`Failed to create verification code`);
		}
	},
};
