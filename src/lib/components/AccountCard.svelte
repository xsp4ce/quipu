<script lang="ts">
	import { ACCOUNT_KIND_LABELS, type AccountSummary } from '#lib/account-form.ts';
	import { formatShortDay } from '#lib/dates.ts';
	import { formatCents } from '#lib/money.ts';

	let { account }: { account: AccountSummary } = $props();
</script>

<a href="/accounts/{account.id}" class="block rounded-2xl bg-white p-4 shadow-sm active:bg-stone-50 dark:bg-stone-900 dark:active:bg-stone-800">
	<div class="flex items-baseline justify-between gap-3">
		<p class="truncate font-medium">{account.name}</p>
		<p class="shrink-0 text-xs text-stone-500">{account.institution ?? ACCOUNT_KIND_LABELS[account.kind]}</p>
	</div>

	{#if account.card}
		<div class="mt-2 flex flex-wrap gap-x-4 text-lg font-semibold tabular-nums">
			{#each account.currencies as currency (currency)}
				<span>{formatCents(account.card.debt[currency], currency)}</span>
			{/each}
		</div>
		<p class="mt-1 text-sm text-stone-500">
			Deuda · Corte {formatShortDay(account.card.nextStatement)} · Pago {formatShortDay(account.card.nextPaymentDue)}
		</p>
	{:else}
		<div class="mt-2 flex flex-wrap gap-x-4 text-lg font-semibold tabular-nums">
			{#each account.currencies as currency (currency)}
				<span class:text-red-600={account.balances[currency] < 0}>{formatCents(account.balances[currency], currency)}</span>
			{/each}
		</div>
	{/if}
</a>
