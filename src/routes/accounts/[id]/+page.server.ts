import { error } from '@sveltejs/kit';
import { getAccountSummary, listAccountMovements } from '#lib/server/accounts.ts';
import { getReferenceRate } from '#lib/server/settings.ts';
import { requireUser } from '#lib/server/session.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const account = await getAccountSummary(user.id, params.id);

	if (!account) error(404, 'Cuenta no encontrada');

	const [movements, referenceRate] = await Promise.all([
		listAccountMovements(user.id, account.id),
		account.card ? getReferenceRate(user.id) : Promise.resolve(null)
	]);

	return { account, movements, referenceRate };
};
