import { fail } from '@sveltejs/kit';
import { getAuthenticatorName } from '@better-auth/passkey';
import { auth } from '#lib/server/auth.ts';
import { requireUser } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, request }) => {
	const user = requireUser(locals);
	const passkeys = await auth.api.listPasskeys({ headers: request.headers });

	return {
		userName: user.name,
		userEmail: user.email,
		passkeys: passkeys.map((passkey) => ({
			id: passkey.id,
			label: passkey.name || getAuthenticatorName(passkey.aaguid) || 'Passkey',
			createdAt: passkey.createdAt
		}))
	};
};

export const actions: Actions = {
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
