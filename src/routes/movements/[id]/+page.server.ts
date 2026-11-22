import { error, fail, redirect } from '@sveltejs/kit';
import { listAccountOptions } from '#lib/server/accounts.ts';
import { deleteMovement, findMovementForEdit, listCategories, parseMovementForm, updateMovement } from '#lib/server/movements.ts';
import { hrefForTarget } from '#lib/server/navigation.ts';
import { requireUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const movement = await findMovementForEdit(user.id, params.id);

	if (!movement) error(404, 'Movimiento no encontrado');

	const [accounts, categories] = await Promise.all([listAccountOptions(user.id), listCategories(user.id)]);

	return {
		values: movement.values,
		accounts,
		categories,
		backHref: hrefForTarget(movement.target)
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const parsed = await parseMovementForm(user.id, await request.formData());

		if (!parsed.ok) return fail(400, { values: parsed.values, errors: parsed.errors });

		const target = await updateMovement(user.id, params.id, parsed.input);
		if (!target) error(404, 'Movimiento no encontrado');

		redirect(303, hrefForTarget(target));
	},
	delete: async ({ locals, params }) => {
		const user = requireUser(locals);
		const movement = await findMovementForEdit(user.id, params.id);

		if (!movement || !(await deleteMovement(user.id, params.id))) error(404, 'Movimiento no encontrado');

		redirect(303, hrefForTarget(movement.target));
	}
};
