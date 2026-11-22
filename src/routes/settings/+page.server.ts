import { requireUser } from '#lib/server/session.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const user = requireUser(locals);
	return { userName: user.name, userEmail: user.email };
};
