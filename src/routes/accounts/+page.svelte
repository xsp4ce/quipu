<script lang="ts">
	import AccountCard from '#lib/components/AccountCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sections = $derived([
		{ title: 'Efectivo y bancos', accounts: data.active.filter((account) => account.kind !== 'credit_card') },
		{ title: 'Tarjetas de crédito', accounts: data.active.filter((account) => account.kind === 'credit_card') }
	]);
</script>

<svelte:head>
	<title>Cuentas · Quipu</title>
</svelte:head>

<header class="flex items-center justify-between py-2">
	<div class="flex items-center gap-3">
		<a href="/" class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800">
			‹ Inicio
		</a>
		<h1 class="text-lg font-semibold">Cuentas</h1>
	</div>
	<a href="/accounts/new" class="rounded-full bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white active:scale-95 dark:bg-teal-600">
		+ Nueva
	</a>
</header>

{#each sections as section (section.title)}
	{#if section.accounts.length > 0}
		<section class="mt-6">
			<h2 class="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">{section.title}</h2>
			<div class="flex flex-col gap-3">
				{#each section.accounts as account (account.id)}
					<AccountCard {account} />
				{/each}
			</div>
		</section>
	{/if}
{/each}

{#if data.archived.length > 0}
	<details class="mt-8">
		<summary class="cursor-pointer text-sm text-stone-500">Archivadas ({data.archived.length})</summary>
		<div class="mt-3 flex flex-col gap-3 opacity-70">
			{#each data.archived as account (account.id)}
				<AccountCard {account} />
			{/each}
		</div>
	</details>
{/if}
