<script lang="ts">
	import { enhance } from '$app/forms';
	import { ACCOUNT_KIND_LABELS, ACCOUNT_KINDS, type AccountFormErrors, type AccountFormValues } from '#lib/account-form.ts';
	import { CURRENCIES } from '#lib/money.ts';

	type Props = {
		values: AccountFormValues;
		errors?: AccountFormErrors;
		kindLocked?: boolean;
		submitLabel: string;
		action?: string;
	};

	let { values, errors = {}, kindLocked = false, submitLabel, action }: Props = $props();

	let kind = $derived(values.kind);
	let currencies = $derived(values.currencies);
	let submitting = $state(false);

	const isCard = $derived(kind === 'credit_card');

	function toggleCurrency(currency: string, checked: boolean) {
		currencies = checked ? [...currencies, currency] : currencies.filter((item) => item !== currency);
	}

	const inputClass =
		'w-full rounded-2xl border-0 bg-white px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-600 dark:bg-stone-900';
	const labelClass = 'mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400';
	const segmentClass =
		'cursor-pointer rounded-xl py-2.5 text-center text-sm font-semibold text-stone-600 has-checked:bg-white has-checked:text-stone-900 has-checked:shadow-sm dark:text-stone-400 dark:has-checked:bg-stone-950 dark:has-checked:text-stone-100';
</script>

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
	{#if kindLocked}
		<p class="text-sm text-stone-500">Tipo: {ACCOUNT_KIND_LABELS[kind as keyof typeof ACCOUNT_KIND_LABELS]}</p>
	{:else}
		<fieldset>
			<legend class={labelClass}>Tipo</legend>
			<div class="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200 p-1 dark:bg-stone-800">
				{#each ACCOUNT_KINDS as option (option)}
					<label class={segmentClass}>
						<input type="radio" name="kind" value={option} checked={kind === option} onchange={() => (kind = option)} class="sr-only" />
						{ACCOUNT_KIND_LABELS[option]}
					</label>
				{/each}
			</div>
			{#if errors.kind}<p class="mt-1 text-sm text-red-600">{errors.kind}</p>{/if}
		</fieldset>
	{/if}

	<div>
		<label for="name" class={labelClass}>Nombre</label>
		<input id="name" name="name" maxlength="60" placeholder={isCard ? 'Visa Interbank' : 'Ahorros BCP'} value={values.name} class={inputClass} />
		{#if errors.name}<p class="mt-1 text-sm text-red-600">{errors.name}</p>{/if}
	</div>

	{#if kind !== 'cash'}
		<div>
			<label for="institution" class={labelClass}>Banco <span class="font-normal text-stone-400">(opcional)</span></label>
			<input id="institution" name="institution" maxlength="60" value={values.institution} class={inputClass} />
		</div>
	{/if}

	{#if isCard}
		{#each CURRENCIES as currency (currency)}
			<input type="hidden" name="currencies" value={currency} />
		{/each}
	{:else}
	<fieldset>
		<legend class={labelClass}>Monedas</legend>
		<div class="flex gap-2">
			{#each CURRENCIES as currency (currency)}
				<label
					class="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm has-checked:bg-teal-700 has-checked:text-white dark:bg-stone-900 dark:has-checked:bg-teal-600"
				>
					<input
						type="checkbox"
						name="currencies"
						value={currency}
						checked={currencies.includes(currency)}
						onchange={(event) => toggleCurrency(currency, event.currentTarget.checked)}
						class="sr-only"
					/>
					{currency}
				</label>
			{/each}
		</div>
		{#if errors.currencies}<p class="mt-1 text-sm text-red-600">{errors.currencies}</p>{/if}
	</fieldset>
	{/if}

	{#each !isCard ? CURRENCIES.filter((currency) => currencies.includes(currency)) : kindLocked ? CURRENCIES : [] as currency (currency)}
		{@const field = currency === 'PEN' ? 'openingPEN' : 'openingUSD'}
		<div>
			<label for={field} class={labelClass}>
				{isCard ? 'Deuda inicial' : 'Saldo actual'} en {currency}
			</label>
			<input id={field} name={field} inputmode="decimal" autocomplete="off" placeholder="0.00" value={values[field]} class={inputClass} />
			{#if errors[field]}<p class="mt-1 text-sm text-red-600">{errors[field]}</p>{/if}
		</div>
	{/each}

	{#if isCard}
		<div>
			<label for="creditLimit" class={labelClass}>Línea de crédito (PEN)</label>
			<input id="creditLimit" name="creditLimit" inputmode="decimal" autocomplete="off" placeholder="0.00" value={values.creditLimit} class={inputClass} />
			{#if errors.creditLimit}<p class="mt-1 text-sm text-red-600">{errors.creditLimit}</p>{/if}
		</div>
		{#if !kindLocked}
			<div>
				<label for="available" class={labelClass}>Disponible actual (PEN)</label>
				<input id="available" name="available" inputmode="decimal" autocomplete="off" placeholder="0.00" value={values.available} class={inputClass} />
				<p class="mt-1 text-xs text-stone-500">Si estás en sobrelínea, ingrésalo en negativo (por ejemplo -150.00).</p>
				{#if errors.available}<p class="mt-1 text-sm text-red-600">{errors.available}</p>{/if}
			</div>
		{/if}
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="statementDay" class={labelClass}>Día de corte <span class="font-normal text-stone-400">(opcional)</span></label>
				<input id="statementDay" name="statementDay" inputmode="numeric" placeholder="20" value={values.statementDay} class={inputClass} />
				{#if errors.statementDay}<p class="mt-1 text-sm text-red-600">{errors.statementDay}</p>{/if}
			</div>
			<div>
				<label for="paymentDueDay" class={labelClass}>Día de pago <span class="font-normal text-stone-400">(opcional)</span></label>
				<input id="paymentDueDay" name="paymentDueDay" inputmode="numeric" placeholder="5" value={values.paymentDueDay} class={inputClass} />
				{#if errors.paymentDueDay}<p class="mt-1 text-sm text-red-600">{errors.paymentDueDay}</p>{/if}
			</div>
		</div>
	{/if}

	{#if errors.form}<p class="text-sm text-red-600" role="alert">{errors.form}</p>{/if}

	<button
		type="submit"
		disabled={submitting}
		class="rounded-2xl bg-teal-700 py-4 font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-60 dark:bg-teal-600"
	>
		{submitting ? 'Guardando…' : submitLabel}
	</button>
</form>
