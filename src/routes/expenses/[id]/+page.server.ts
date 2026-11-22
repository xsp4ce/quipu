import { error, fail, redirect } from '@sveltejs/kit';
import { homeHrefForDay, toLimaDateTimeInput, toLimaDay } from '#lib/dates.ts';
import { centsToInput } from '#lib/money.ts';
import { deleteExpense, findExpense, listCategories, parseExpenseForm, updateExpense } from '#lib/server/expenses.ts';
import { requireUser } from '#lib/server/session.ts';
import type { ExpenseFormValues } from '#lib/expense-form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const expense = await findExpense(user.id, params.id);

	if (!expense) error(404, 'Gasto no encontrado');

	const values: ExpenseFormValues = {
		currency: expense.currency,
		amount: centsToInput(expense.amountCents),
		categoryId: expense.categoryId,
		description: expense.description ?? '',
		occurredAt: toLimaDateTimeInput(expense.occurredAt)
	};

	return {
		values,
		categories: await listCategories(user.id),
		backHref: homeHrefForDay(toLimaDay(expense.occurredAt))
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const parsed = await parseExpenseForm(user.id, await request.formData());

		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const updated = await updateExpense(user.id, params.id, parsed.input);
		if (!updated) error(404, 'Gasto no encontrado');

		redirect(303, homeHrefForDay(toLimaDay(parsed.input.occurredAt)));
	},
	delete: async ({ locals, params }) => {
		const user = requireUser(locals);
		const expense = await findExpense(user.id, params.id);

		if (!expense || !(await deleteExpense(user.id, params.id))) error(404, 'Gasto no encontrado');

		redirect(303, homeHrefForDay(toLimaDay(expense.occurredAt)));
	}
};
