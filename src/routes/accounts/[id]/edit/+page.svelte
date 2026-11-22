<script lang="ts">
	import { enhance } from '$app/forms';
	import AccountForm from '#lib/components/AccountForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Editar cuenta · Quipu</title>
</svelte:head>

<header class="flex items-center gap-3 py-2">
	<a
		href="/accounts/{data.accountId}"
		class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800"
	>
		‹ Volver
	</a>
	<h1 class="text-lg font-semibold">Editar cuenta</h1>
</header>

<div class="mt-4">
	{#key form}
		<AccountForm action="?/update" values={form?.values ?? data.values} errors={form?.errors} kindLocked submitLabel="Guardar cambios" />
	{/key}
</div>

<form
	method="POST"
	action={data.archived ? '?/unarchive' : '?/archive'}
	class="mt-4"
	use:enhance={({ cancel }) => {
		if (!data.archived && !confirm('¿Archivar esta cuenta? Dejará de aparecer en los formularios, pero conservará sus movimientos.')) cancel();
	}}
>
	<button
		type="submit"
		class="w-full rounded-2xl py-4 font-semibold {data.archived ? 'text-teal-700 dark:text-teal-400' : 'text-red-600 active:bg-red-50 dark:active:bg-red-950'}"
	>
		{data.archived ? 'Desarchivar cuenta' : 'Archivar cuenta'}
	</button>
</form>
