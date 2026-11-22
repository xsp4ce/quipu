import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '#lib/server/auth.ts';

const PUBLIC_PATHS = new Set(['/login']);

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	const guardedResolve: typeof resolve = (guardedEvent, options) => {
		if (!guardedEvent.locals.user && !PUBLIC_PATHS.has(guardedEvent.url.pathname)) {
			return new Response(null, { status: 303, headers: { location: '/login' } });
		}
		return resolve(guardedEvent, options);
	};

	return svelteKitHandler({ event, resolve: guardedResolve, auth, building });
};
