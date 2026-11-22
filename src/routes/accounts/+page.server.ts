import { listAccountSummaries } from '#lib/server/accounts.ts';
import { requireUser } from '#lib/server/session.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const accounts = await listAccountSummaries(user.id);

	return {
		active: accounts.filter((account) => !account.archived),
		archived: accounts.filter((account) => account.archived)
	};
};
