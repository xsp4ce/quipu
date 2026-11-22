<script lang="ts">
	import MovementForm from '#lib/components/MovementForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Registrar movimiento · Quipu</title>
</svelte:head>

<header class="flex items-center gap-3 py-2">
	<a href={data.backHref} class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800">
		‹ Volver
	</a>
	<h1 class="text-lg font-semibold">Registrar</h1>
</header>

<div class="mt-4">
	{#if data.accounts.length === 0}
		<p class="rounded-2xl bg-white p-4 text-sm text-stone-500 shadow-sm dark:bg-stone-900">
			Primero crea una cuenta en <a href="/accounts/new" class="text-teal-700 dark:text-teal-400">Cuentas</a>.
		</p>
	{:else}
		{#key form}
			<MovementForm
				values={form?.values ?? data.values}
				errors={form?.errors}
				accounts={data.accounts}
				categories={data.categories}
				submitLabel="Guardar"
			/>
		{/key}
	{/if}
</div>
