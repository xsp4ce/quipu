import { fail, redirect } from '@sveltejs/kit';
import { homeHrefForDay, isValidDay, todayInLima } from '#lib/dates.ts';
import { isMovementType } from '#lib/movement-form.ts';
import { listAccountOptions } from '#lib/server/accounts.ts';
import { createMovement, emptyMovementValues, findLastUsedAccountId, listCategories, parseMovementForm } from '#lib/server/movements.ts';
import { hrefForTarget } from '#lib/server/navigation.ts';
import { requireUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

const PAST_DAY_DEFAULT_TIME = '12:00';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const today = todayInLima();
	const day = url.searchParams.get('day');
	const isPastDay = day !== null && isValidDay(day) && day < today;
	const requestedType = url.searchParams.get('type');
	const requestedAccountId = url.searchParams.get('accountId');

	const [accounts, categories, lastUsedAccountId] = await Promise.all([
		listAccountOptions(user.id),
		listCategories(user.id),
		findLastUsedAccountId(user.id)
	]);

	const preferredAccountId = [requestedAccountId, lastUsedAccountId, accounts[0]?.id].find(
		(id) => id && accounts.some((account) => account.id === id)
	);

	return {
		values: emptyMovementValues({
			type: isMovementType(requestedType) ? requestedType : 'expense',
			accountId: preferredAccountId ?? '',
			...(isPastDay ? { occurredAt: `${day}T${PAST_DAY_DEFAULT_TIME}` } : {})
		}),
		accounts,
		categories,
		backHref: requestedAccountId ? `/accounts/${requestedAccountId}` : isPastDay ? homeHrefForDay(day) : '/'
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = requireUser(locals);
		const parsed = await parseMovementForm(user.id, await request.formData());

		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const target = await createMovement(user.id, parsed.input);
		redirect(303, hrefForTarget(target));
	}
};
