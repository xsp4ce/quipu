import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { passkey } from '@better-auth/passkey';
import { getRequestEvent } from '$app/server';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '$app/env/private';
import { db } from './db';
import * as schema from './db/schema';

const DAY_IN_SECONDS = 60 * 60 * 24;

export const auth = betterAuth({
	appName: 'Quipu',
	baseURL: BETTER_AUTH_URL,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true
	},
	session: {
		expiresIn: DAY_IN_SECONDS * 30,
		updateAge: DAY_IN_SECONDS
	},
	plugins: [
		passkey({
			rpID: new URL(BETTER_AUTH_URL).hostname,
			rpName: 'Quipu'
		}),
		sveltekitCookies(getRequestEvent)
	]
});
