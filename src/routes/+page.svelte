<script lang="ts">
	import { CURRENCIES, formatAbsCents, formatCents } from '#lib/money.ts';
	import { formatTime } from '#lib/dates.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<header class="flex items-center justify-between py-2">
	<h1 class="text-xl font-semibold tracking-tight">Quipu</h1>
	<nav class="flex gap-1">
		<a
			href="/accounts"
			class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800"
		>
			Cuentas
		</a>
		<a
			href="/settings"
			class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800"
		>
			Ajustes
		</a>
	</nav>
</header>

<nav class="mt-4 flex items-center justify-between" aria-label="Cambiar de día">
	<a
		href={data.previousHref}
		class="flex size-11 items-center justify-center rounded-full bg-white text-xl shadow-sm active:scale-95 dark:bg-stone-900"
		aria-label="Día anterior"
	>
		‹
	</a>
	<div class="text-center">
		<p class="text-lg font-medium first-letter:uppercase">{data.dayLabel}</p>
		{#if !data.isToday}
			<a href="/" class="text-sm text-teal-700 dark:text-teal-400">Ir a hoy</a>
		{/if}
	</div>
	{#if data.nextHref}
		<a
			href={data.nextHref}
			class="flex size-11 items-center justify-center rounded-full bg-white text-xl shadow-sm active:scale-95 dark:bg-stone-900"
			aria-label="Día siguiente"
		>
			›
		</a>
	{:else}
		<span class="flex size-11 items-center justify-center rounded-full text-xl text-stone-300 dark:text-stone-700" aria-hidden="true">›</span>
	{/if}
</nav>

<section class="mt-5 grid grid-cols-2 gap-3" aria-label="Total del día">
	{#each CURRENCIES as currency (currency)}
		<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
			<p class="text-xs font-medium tracking-wide text-stone-500 uppercase">{currency}</p>
			<p class="mt-1 text-xl font-semibold tabular-nums">{formatCents(data.totals[currency], currency)}</p>
		</div>
	{/each}
</section>

<section class="mt-6 pb-24">
	{#if data.expenses.length === 0}
		<p class="py-12 text-center text-stone-500">No hay gastos registrados este día.</p>
	{:else}
		<ul class="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-stone-800 dark:bg-stone-900">
			{#each data.expenses as expense (expense.id)}
				<li>
					<a href="/movements/{expense.id}" class="flex items-center justify-between gap-3 px-4 py-3 active:bg-stone-50 dark:active:bg-stone-800">
						<div class="min-w-0">
							<p class="font-medium">{expense.categoryName}</p>
							<p class="truncate text-sm text-stone-500">
								{formatTime(expense.occurredAt)} · {expense.accountName}{#if expense.description}&nbsp;· {expense.description}{/if}
							</p>
						</div>
						<p class="shrink-0 font-semibold tabular-nums">{formatAbsCents(expense.amountCents, expense.currency)}</p>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<a
	href={data.isToday ? '/movements/new' : `/movements/new?day=${data.day}`}
	class="fixed right-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] translate-x-1/2 rounded-full bg-teal-700 px-6 py-3.5 font-semibold text-white shadow-lg active:scale-95 dark:bg-teal-600"
>
	+ Registrar
</a>
