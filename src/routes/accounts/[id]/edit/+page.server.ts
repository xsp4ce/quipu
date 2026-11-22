import { error, fail, redirect } from '@sveltejs/kit';
import { isAccountKind } from '#lib/account-form.ts';
import { getAccountFormValues, getAccountSummary, parseAccountForm, setAccountArchived, updateAccount } from '#lib/server/accounts.ts';
import { requireUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const [values, summary] = await Promise.all([
		getAccountFormValues(user.id, params.id),
		getAccountSummary(user.id, params.id)
	]);

	if (!values || !summary) error(404, 'Cuenta no encontrada');

	return { values, accountId: params.id, archived: summary.archived };
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const current = await getAccountFormValues(user.id, params.id);
		if (!current || !isAccountKind(current.kind)) error(404, 'Cuenta no encontrada');

		const parsed = parseAccountForm(await request.formData(), current.kind);
		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const result = await updateAccount(user.id, params.id, parsed.input);
		if (result) return fail(400, { values: parsed.values, errors: { form: result.error } });

		redirect(303, `/accounts/${params.id}`);
	},
	archive: async ({ locals, params }) => {
		const user = requireUser(locals);
		if (!(await setAccountArchived(user.id, params.id, true))) error(404, 'Cuenta no encontrada');
		redirect(303, '/accounts');
	},
	unarchive: async ({ locals, params }) => {
		const user = requireUser(locals);
		if (!(await setAccountArchived(user.id, params.id, false))) error(404, 'Cuenta no encontrada');
		redirect(303, `/accounts/${params.id}`);
	}
};
