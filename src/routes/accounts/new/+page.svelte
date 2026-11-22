<script lang="ts">
	import AccountForm from '#lib/components/AccountForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Nueva cuenta · Quipu</title>
</svelte:head>

<header class="flex items-center gap-3 py-2">
	<a href="/accounts" class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800">
		‹ Volver
	</a>
	<h1 class="text-lg font-semibold">Nueva cuenta</h1>
</header>

<div class="mt-4">
	{#key form}
		<AccountForm values={form?.values ?? data.values} errors={form?.errors} submitLabel="Crear cuenta" />
	{/key}
</div>
