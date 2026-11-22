<script lang="ts">
	import { enhance } from '$app/forms';
	import MovementForm from '#lib/components/MovementForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let deleting = $state(false);
	const isTransfer = $derived(data.values.type === 'transfer');
</script>

<svelte:head>
	<title>Editar movimiento · Quipu</title>
</svelte:head>

<header class="flex items-center gap-3 py-2">
	<a href={data.backHref} class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800">
		‹ Volver
	</a>
	<h1 class="text-lg font-semibold">Editar movimiento</h1>
</header>

<div class="mt-4">
	{#key form}
		<MovementForm
			action="?/update"
			values={form?.values ?? data.values}
			errors={form?.errors}
			accounts={data.accounts}
			categories={data.categories}
			submitLabel="Guardar cambios"
		/>
	{/key}
</div>

<form
	method="POST"
	action="?/delete"
	class="mt-4"
	use:enhance={({ cancel }) => {
		const message = isTransfer
			? '¿Eliminar esta transferencia y su comisión? Esta acción no se puede deshacer.'
			: '¿Eliminar este movimiento? Esta acción no se puede deshacer.';
		if (!confirm(message)) {
			cancel();
			return;
		}
		deleting = true;
		return async ({ update }) => {
			await update();
			deleting = false;
		};
	}}
>
	<button
		type="submit"
		disabled={deleting}
		class="w-full rounded-2xl py-4 font-semibold text-red-600 active:bg-red-50 disabled:opacity-60 dark:active:bg-red-950"
	>
		{deleting ? 'Eliminando…' : 'Eliminar'}
	</button>
</form>
