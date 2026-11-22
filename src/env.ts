import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {},
	BETTER_AUTH_SECRET: {},
	BETTER_AUTH_URL: {}
});
