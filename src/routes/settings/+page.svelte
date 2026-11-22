<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let message = $state<{ text: string; isError: boolean } | null>(null);
	let loading = $state(false);

	const dateFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' });

	async function createPasskey() {
		loading = true;
		message = null;
		const result = await authClient.passkey.addPasskey();
		loading = false;
		if (result?.error) {
			message = { text: 'No se pudo crear la passkey.', isError: true };
			return;
		}
		message = { text: 'Passkey creada. Ya puedes usarla para entrar.', isError: false };
		await invalidateAll();
	}

	async function signOut() {
		await authClient.signOut();
		await goto('/login', { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>Ajustes · Quipu</title>
</svelte:head>

<header class="flex items-center gap-3 py-2">
	<a href="/" class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800">
		‹ Volver
	</a>
	<h1 class="text-lg font-semibold">Ajustes</h1>
</header>

<section class="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
	<p class="font-medium">{data.userName}</p>
	<p class="text-sm text-stone-500">{data.userEmail}</p>
</section>

<section class="mt-6">
	<h2 class="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">Tipo de cambio de referencia (USD → PEN)</h2>
	<form method="POST" action="?/saveRate" use:enhance={() => async ({ update }) => update({ reset: false })} class="flex gap-2">
		<input
			name="referenceRate"
			inputmode="decimal"
			autocomplete="off"
			placeholder="3.75"
			value={form?.rateValue ?? data.referenceRate}
			class="min-w-0 flex-1 rounded-2xl border-0 bg-white px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-600 dark:bg-stone-900"
		/>
		<button type="submit" class="rounded-2xl bg-stone-900 px-5 font-semibold text-white active:scale-[0.98] dark:bg-stone-100 dark:text-stone-900">
			Guardar
		</button>
	</form>
	<p class="mt-1 text-xs text-stone-500">Se usa para calcular la línea disponible de las tarjetas con deuda en dólares.</p>
	{#if form?.rateError}<p class="mt-1 text-sm text-red-600" role="alert">{form.rateError}</p>{/if}
	{#if form?.rateSaved}<p class="mt-1 text-sm text-teal-700 dark:text-teal-400" role="status">Tipo de cambio guardado.</p>{/if}
</section>

<section class="mt-6">
	<h2 class="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">Passkeys</h2>
	{#if data.passkeys.length === 0}
		<p class="rounded-2xl bg-white p-4 text-sm text-stone-500 shadow-sm dark:bg-stone-900">Aún no tienes passkeys.</p>
	{:else}
		<ul class="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-stone-800 dark:bg-stone-900">
			{#each data.passkeys as passkey (passkey.id)}
				<li class="flex items-center justify-between gap-3 px-4 py-3">
					<div class="min-w-0">
						<p class="truncate font-medium">{passkey.label}</p>
						{#if passkey.createdAt}
							<p class="text-sm text-stone-500">Creada el {dateFormatter.format(new Date(passkey.createdAt))}</p>
						{/if}
					</div>
					<form
						method="POST"
						action="?/deletePasskey"
						use:enhance={({ cancel }) => {
							if (!confirm(`¿Eliminar la passkey "${passkey.label}"? Ya no podrás usarla para entrar.`)) cancel();
						}}
					>
						<input type="hidden" name="id" value={passkey.id} />
						<button type="submit" class="rounded-full px-3 py-1.5 text-sm font-medium text-red-600 active:bg-red-50 dark:active:bg-red-950">
							Eliminar
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
	{#if form?.passkeyError}
		<p class="mt-2 text-center text-sm text-red-600" role="alert">{form.passkeyError}</p>
	{/if}

	<button
		type="button"
		onclick={createPasskey}
		disabled={loading}
		class="mt-3 w-full rounded-2xl bg-teal-700 py-4 font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-60 dark:bg-teal-600"
	>
		Crear passkey
	</button>
	{#if message}
		<p class="mt-2 text-center text-sm {message.isError ? 'text-red-600' : 'text-teal-700 dark:text-teal-400'}" role="status">
			{message.text}
		</p>
	{/if}
</section>

<section class="mt-6">
	<button
		type="button"
		onclick={signOut}
		class="w-full rounded-2xl py-4 font-semibold text-red-600 active:bg-red-50 dark:active:bg-red-950"
	>
		Cerrar sesión
	</button>
</section>
