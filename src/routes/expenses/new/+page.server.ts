import { fail, redirect } from '@sveltejs/kit';
import { homeHrefForDay, isValidDay, toLimaDateTimeInput, toLimaDay, todayInLima } from '#lib/dates.ts';
import { createExpense, listCategories, parseExpenseForm } from '#lib/server/expenses.ts';
import { requireUser } from '#lib/server/session.ts';
import type { ExpenseFormValues } from '#lib/expense-form.ts';
import type { Actions, PageServerLoad } from './$types';

const PAST_DAY_DEFAULT_TIME = '12:00';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const today = todayInLima();
	const day = url.searchParams.get('day');
	const isPastDay = day !== null && isValidDay(day) && day < today;

	const values: ExpenseFormValues = {
		currency: 'PEN',
		amount: '',
		categoryId: '',
		description: '',
		occurredAt: isPastDay ? `${day}T${PAST_DAY_DEFAULT_TIME}` : toLimaDateTimeInput(new Date())
	};

	return {
		values,
		categories: await listCategories(user.id),
		backHref: isPastDay ? homeHrefForDay(day) : '/'
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = requireUser(locals);
		const parsed = await parseExpenseForm(user.id, await request.formData());

		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		await createExpense(user.id, parsed.input);
		redirect(303, homeHrefForDay(toLimaDay(parsed.input.occurredAt)));
	}
};
