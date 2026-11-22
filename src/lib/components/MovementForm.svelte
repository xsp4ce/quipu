<script lang="ts">
	import { enhance } from '$app/forms';
	import { ACCOUNT_KIND_LABELS, ACCOUNT_KINDS } from '#lib/account-form.ts';
	import { formatCents, parseAmountToCents, parseOptionalAmountToCents, type Currency } from '#lib/money.ts';
	import {
		MOVEMENT_TYPE_LABELS,
		MOVEMENT_TYPES,
		type AccountOption,
		type CategoryOption,
		type MovementFormErrors,
		type MovementFormValues
	} from '#lib/movement-form.ts';

	type Props = {
		values: MovementFormValues;
		errors?: MovementFormErrors;
		accounts: AccountOption[];
		categories: CategoryOption[];
		submitLabel: string;
		action?: string;
	};

	let { values, errors = {}, accounts, categories, submitLabel, action }: Props = $props();

	let type = $derived(values.type);
	let accountId = $derived(values.accountId);
	let currency = $derived(values.currency);
	let toAccountId = $derived(values.toAccountId);
	let toCurrency = $derived(values.toCurrency);
	let amount = $derived(values.amount);
	let commission = $derived(values.commission);
	let submitting = $state(false);

	const accountGroups = $derived(
		ACCOUNT_KINDS.map((kind) => ({ kind, accounts: accounts.filter((account) => account.kind === kind) })).filter(
			(group) => group.accounts.length > 0
		)
	);

	const currenciesOf = (id: string): Currency[] => accounts.find((account) => account.id === id)?.currencies ?? [];
	const pick = (available: Currency[], preferred: string): string =>
		available.includes(preferred as Currency) ? preferred : available.includes('PEN') ? 'PEN' : (available[0] ?? '');

	const fromCurrencies = $derived(currenciesOf(accountId));
	const toCurrencies = $derived(currenciesOf(toAccountId));
	const effectiveCurrency = $derived(pick(fromCurrencies, currency));
	const effectiveToCurrency = $derived(pick(toCurrencies, toCurrency));
	const isTransfer = $derived(type === 'transfer');
	const crossCurrency = $derived(isTransfer && effectiveCurrency !== '' && effectiveToCurrency !== '' && effectiveCurrency !== effectiveToCurrency);
	const visibleCategories = $derived(categories.filter((category) => category.kind === type));

	const arrivingPreview = $derived.by(() => {
		if (!isTransfer || crossCurrency || !effectiveCurrency) return null;
		const total = parseAmountToCents(amount);
		const fee = parseOptionalAmountToCents(commission);
		if (total === null || !fee || fee >= total) return null;
		return formatCents(total - fee, effectiveCurrency as Currency);
	});

	const inputClass =
		'w-full rounded-2xl border-0 bg-white px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-600 dark:bg-stone-900';
	const labelClass = 'mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400';
	const segmentClass =
		'cursor-pointer rounded-xl py-2.5 text-center text-sm font-semibold text-stone-600 has-checked:bg-white has-checked:text-stone-900 has-checked:shadow-sm dark:text-stone-400 dark:has-checked:bg-stone-950 dark:has-checked:text-stone-100';
</script>

{#snippet accountSelect(name: string, id: string, label: string, selected: string, onchange: (value: string) => void, error?: string)}
	<div>
		<label for={id} class={labelClass}>{label}</label>
		<select {id} {name} value={selected} onchange={(event) => onchange(event.currentTarget.value)} class={inputClass}>
			<option value="" disabled>Elige una cuenta</option>
			{#each accountGroups as group (group.kind)}
				<optgroup label={ACCOUNT_KIND_LABELS[group.kind]}>
					{#each group.accounts as account (account.id)}
						<option value={account.id}>{account.name}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
		{#if error}<p class="mt-1 text-sm text-red-600">{error}</p>{/if}
	</div>
{/snippet}

{#snippet currencyPicker(name: string, available: Currency[], selected: string, onchange: (value: string) => void, error?: string)}
	{#if available.length > 1}
		<fieldset>
			<legend class={labelClass}>Moneda</legend>
			<div class="grid grid-cols-2 gap-2 rounded-2xl bg-stone-200 p-1 dark:bg-stone-800">
				{#each available as option (option)}
					<label class={segmentClass}>
						<input type="radio" {name} value={option} checked={selected === option} onchange={() => onchange(option)} class="sr-only" />
						{option === 'PEN' ? 'S/ Soles' : 'US$ Dólares'}
					</label>
				{/each}
			</div>
			{#if error}<p class="mt-1 text-sm text-red-600">{error}</p>{/if}
		</fieldset>
	{:else}
		<input type="hidden" {name} value={selected} />
		{#if error}<p class="text-sm text-red-600">{error}</p>{/if}
	{/if}
{/snippet}

<form
	method="POST"
	{action}
	class="flex flex-col gap-6"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<div class="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200 p-1 dark:bg-stone-800">
		{#each MOVEMENT_TYPES as option (option)}
			<label class={segmentClass}>
				<input type="radio" name="type" value={option} checked={type === option} onchange={() => (type = option)} class="sr-only" />
				{MOVEMENT_TYPE_LABELS[option]}
			</label>
		{/each}
	</div>

	{@render accountSelect('accountId', 'accountId', isTransfer ? 'Desde' : 'Cuenta', accountId, (value) => (accountId = value), errors.accountId)}
	{@render currencyPicker('currency', fromCurrencies, effectiveCurrency, (value) => (currency = value), errors.currency)}

	{#if isTransfer}
		{@render accountSelect('toAccountId', 'toAccountId', 'Hacia', toAccountId, (value) => (toAccountId = value), errors.toAccountId)}
		{@render currencyPicker('toCurrency', toCurrencies, effectiveToCurrency, (value) => (toCurrency = value), errors.toCurrency)}
	{/if}

	<div>
		<label for="amount" class={labelClass}>{isTransfer ? 'Monto que sale' : 'Monto'}</label>
		<input
			id="amount"
			name="amount"
			inputmode="decimal"
			autocomplete="off"
			placeholder="0.00"
			bind:value={amount}
			class="{inputClass} py-4 text-3xl font-semibold tabular-nums"
		/>
		{#if errors.amount}<p class="mt-1 text-sm text-red-600">{errors.amount}</p>{/if}
	</div>

	{#if isTransfer}
		{#if crossCurrency}
			<div>
				<label for="toAmount" class={labelClass}>Monto que llega ({effectiveToCurrency})</label>
				<input id="toAmount" name="toAmount" inputmode="decimal" autocomplete="off" placeholder="0.00" value={values.toAmount} class={inputClass} />
				{#if errors.toAmount}<p class="mt-1 text-sm text-red-600">{errors.toAmount}</p>{/if}
			</div>
		{/if}
		<div>
			<label for="commission" class={labelClass}>
				Comisión <span class="font-normal text-stone-400">(opcional)</span>
			</label>
			<input id="commission" name="commission" inputmode="decimal" autocomplete="off" placeholder="0.00" bind:value={commission} class={inputClass} />
			{#if arrivingPreview}<p class="mt-1 text-sm text-stone-500">Llega: {arrivingPreview}</p>{/if}
			{#if errors.commission}<p class="mt-1 text-sm text-red-600">{errors.commission}</p>{/if}
		</div>
	{:else}
		<fieldset>
			<legend class={labelClass}>Categoría</legend>
			<div class="flex flex-wrap gap-2">
				{#each visibleCategories as category (category.id)}
					<label
						class="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm has-checked:bg-teal-700 has-checked:text-white dark:bg-stone-900 dark:has-checked:bg-teal-600"
					>
						<input type="radio" name="categoryId" value={category.id} checked={values.categoryId === category.id} class="sr-only" />
						{category.name}
					</label>
				{/each}
			</div>
			{#if errors.categoryId}<p class="mt-1 text-sm text-red-600">{errors.categoryId}</p>{/if}
		</fieldset>
	{/if}

	<div>
		<label for="description" class={labelClass}>
			Descripción <span class="font-normal text-stone-400">(opcional)</span>
		</label>
		<input id="description" name="description" maxlength="200" value={values.description} class={inputClass} />
		{#if errors.description}<p class="mt-1 text-sm text-red-600">{errors.description}</p>{/if}
	</div>

	<div>
		<label for="occurredAt" class={labelClass}>Fecha y hora</label>
		<input id="occurredAt" name="occurredAt" type="datetime-local" value={values.occurredAt} class={inputClass} />
		{#if errors.occurredAt}<p class="mt-1 text-sm text-red-600">{errors.occurredAt}</p>{/if}
	</div>

	{#if errors.type}<p class="text-sm text-red-600">{errors.type}</p>{/if}

	<button
		type="submit"
		disabled={submitting}
		class="rounded-2xl bg-teal-700 py-4 font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-60 dark:bg-teal-600"
	>
		{submitting ? 'Guardando…' : submitLabel}
	</button>
</form>
