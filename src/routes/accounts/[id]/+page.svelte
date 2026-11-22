<script lang="ts">
	import { ACCOUNT_KIND_LABELS } from '#lib/account-form.ts';
	import { formatDateTime, formatShortDay } from '#lib/dates.ts';
	import { formatAbsCents, formatCents } from '#lib/money.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const account = $derived(data.account);

	function movementTitle(movement: (typeof data.movements)[number]): string {
		if (movement.type === 'opening_balance') return account.card ? 'Deuda inicial' : 'Saldo inicial';
		if (movement.type === 'transfer_out') return `Transferencia a ${movement.counterpart ?? 'otra cuenta'}`;
		if (movement.type === 'transfer_in') return `Transferencia desde ${movement.counterpart ?? 'otra cuenta'}`;
		return movement.categoryName ?? 'Movimiento';
	}

	const movementHref = (movement: (typeof data.movements)[number]) =>
		movement.type === 'opening_balance' ? `/accounts/${account.id}/edit` : `/movements/${movement.id}`;
</script>

<svelte:head>
	<title>{account.name} · Quipu</title>
</svelte:head>

<header class="flex items-center justify-between py-2">
	<a href="/accounts" class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800">
		‹ Cuentas
	</a>
	<a
		href="/accounts/{account.id}/edit"
		class="rounded-full px-3 py-1.5 text-sm text-stone-600 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800"
	>
		Editar
	</a>
</header>

<section class="mt-2">
	<h1 class="text-2xl font-semibold tracking-tight">{account.name}</h1>
	<p class="text-sm text-stone-500">
		{ACCOUNT_KIND_LABELS[account.kind]}{#if account.institution}&nbsp;· {account.institution}{/if}{#if account.archived}&nbsp;· Archivada{/if}
	</p>
</section>

{#if account.card}
	{@const card = account.card}
	<section class="mt-5 grid grid-cols-2 gap-3">
		{#each account.currencies as currency (currency)}
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
				<p class="text-xs font-medium tracking-wide text-stone-500 uppercase">Deuda {currency}</p>
				<p class="mt-1 text-xl font-semibold tabular-nums">{formatCents(card.debt[currency], currency)}</p>
				<p class="mt-1 text-xs text-stone-500">Ciclo actual: {formatCents(card.cycleSpending[currency], currency)}</p>
			</div>
		{/each}
	</section>
	<section class="mt-3 rounded-2xl bg-white p-4 text-sm shadow-sm dark:bg-stone-900">
		<dl class="grid grid-cols-2 gap-y-2">
			<dt class="text-stone-500">Línea</dt>
			<dd class="text-right tabular-nums">{formatCents(card.creditLimitCents, 'PEN')}</dd>
			<dt class="text-stone-500">Disponible</dt>
			<dd class="text-right tabular-nums">
				{#if card.availableCents === null}
					<a href="/settings" class="text-teal-700 dark:text-teal-400">Define el tipo de cambio</a>
				{:else}
					<span class:text-red-600={card.availableCents < 0}>{formatCents(card.availableCents, 'PEN')}</span>
				{/if}
			</dd>
			<dt class="text-stone-500">Último corte</dt>
			<dd class="text-right">{formatShortDay(card.lastStatement)}</dd>
			<dt class="text-stone-500">Próximo corte</dt>
			<dd class="text-right">{formatShortDay(card.nextStatement)}</dd>
			<dt class="text-stone-500">Próximo pago</dt>
			<dd class="text-right font-medium">{formatShortDay(card.nextPaymentDue)}</dd>
		</dl>
		{#if card.debt.USD > 0 && data.referenceRate}
			<p class="mt-3 text-xs text-stone-500">Disponible calculado con tipo de cambio {data.referenceRate}.</p>
		{/if}
	</section>
{:else}
	<section class="mt-5 grid grid-cols-2 gap-3">
		{#each account.currencies as currency (currency)}
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
				<p class="text-xs font-medium tracking-wide text-stone-500 uppercase">Saldo {currency}</p>
				<p class="mt-1 text-xl font-semibold tabular-nums" class:text-red-600={account.balances[currency] < 0}>
					{formatCents(account.balances[currency], currency)}
				</p>
			</div>
		{/each}
	</section>
{/if}

<section class="mt-6 pb-24">
	<h2 class="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">Movimientos</h2>
	{#if data.movements.length === 0}
		<p class="py-8 text-center text-stone-500">Sin movimientos.</p>
	{:else}
		<ul class="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-stone-800 dark:bg-stone-900">
			{#each data.movements as movement (movement.id)}
				<li>
					<a href={movementHref(movement)} class="flex items-center justify-between gap-3 px-4 py-3 active:bg-stone-50 dark:active:bg-stone-800">
						<div class="min-w-0">
							<p class="truncate font-medium">{movementTitle(movement)}</p>
							<p class="truncate text-sm text-stone-500">
								{formatDateTime(movement.occurredAt)}{#if movement.description}&nbsp;· {movement.description}{/if}
							</p>
						</div>
						<p class="shrink-0 font-semibold tabular-nums" class:text-teal-700={movement.amountCents > 0} class:dark:text-teal-400={movement.amountCents > 0}>
							{movement.amountCents > 0 ? '+' : '−'}{formatAbsCents(movement.amountCents, movement.currency)}
						</p>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if !account.archived}
	<a
		href="/movements/new?accountId={account.id}"
		class="fixed right-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] translate-x-1/2 rounded-full bg-teal-700 px-6 py-3.5 font-semibold text-white shadow-lg active:scale-95 dark:bg-teal-600"
	>
		+ Registrar
	</a>
{/if}
