import { fail } from '@sveltejs/kit';
import { getAuthenticatorName } from '@better-auth/passkey';
import { auth } from '#lib/server/auth.ts';
import { getReferenceRate, parseReferenceRate, saveReferenceRate } from '#lib/server/settings.ts';
import { requireUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, request }) => {
	const user = requireUser(locals);
	const [passkeys, referenceRate] = await Promise.all([
		auth.api.listPasskeys({ headers: request.headers }),
		getReferenceRate(user.id)
	]);

	return {
		userName: user.name,
		userEmail: user.email,
		referenceRate: referenceRate === null ? '' : String(referenceRate),
		passkeys: passkeys.map((passkey) => ({
			id: passkey.id,
			label: passkey.name || getAuthenticatorName(passkey.aaguid) || 'Passkey',
			createdAt: passkey.createdAt
		}))
	};
};

export const actions: Actions = {
	saveRate: async ({ locals, request }) => {
		const user = requireUser(locals);
		const input = String((await request.formData()).get('referenceRate') ?? '');
		const rate = parseReferenceRate(input);

		if (rate === undefined) return fail(400, { rateError: 'Ingresa un tipo de cambio válido, por ejemplo 3.75', rateValue: input });

		await saveReferenceRate(user.id, rate);
		return { rateSaved: true };
	},
	deletePasskey: async ({ locals, request }) => {
		requireUser(locals);
		const id = String((await request.formData()).get('id') ?? '');

		try {
			await auth.api.deletePasskey({ body: { id }, headers: request.headers });
		} catch {
			return fail(400, { passkeyError: 'No se pudo eliminar la passkey.' });
		}
	}
};
