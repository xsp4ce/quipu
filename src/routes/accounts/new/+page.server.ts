import { fail, redirect } from '@sveltejs/kit';
import { createAccount, parseAccountForm } from '#lib/server/accounts.ts';
import { requireUser } from '#lib/server/session.ts';
import type { AccountFormValues } from '#lib/account-form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireUser(locals);
	const values: AccountFormValues = {
		kind: 'bank',
		name: '',
		institution: '',
		currencies: ['PEN'],
		openingPEN: '',
		openingUSD: '',
		creditLimit: '',
		available: '',
		statementDay: '',
		paymentDueDay: ''
	};
	return { values };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = requireUser(locals);
		const parsed = parseAccountForm(await request.formData());

		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const result = await createAccount(user.id, parsed.input);
		if ('error' in result) return fail(400, { values: parsed.values, errors: { name: result.error } });

		redirect(303, `/accounts/${result.id}`);
	}
};
