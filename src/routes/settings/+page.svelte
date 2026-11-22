<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let message = $state<{ text: string; isError: boolean } | null>(null);
	let loading = $state(false);

	async function registerPasskey() {
		loading = true;
		message = null;
		const result = await authClient.passkey.addPasskey({ name: navigator.platform || 'Dispositivo' });
		loading = false;
		message = result?.error
			? { text: 'No se pudo registrar Face ID.', isError: true }
			: { text: 'Face ID registrado. Ya puedes usarlo para entrar.', isError: false };
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

<section class="mt-4 flex flex-col gap-3">
	<button
		type="button"
		onclick={registerPasskey}
		disabled={loading}
		class="rounded-2xl bg-teal-700 py-4 font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-60 dark:bg-teal-600"
	>
		Registrar Face ID en este dispositivo
	</button>
	{#if message}
		<p class="text-center text-sm {message.isError ? 'text-red-600' : 'text-teal-700 dark:text-teal-400'}" role="status">
			{message.text}
		</p>
	{/if}
	<button
		type="button"
		onclick={signOut}
		class="rounded-2xl py-4 font-semibold text-red-600 active:bg-red-50 dark:active:bg-red-950"
	>
		Cerrar sesión
	</button>
</section>
