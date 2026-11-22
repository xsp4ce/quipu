<script lang="ts">
	import { enhance } from '$app/forms';
	import { CURRENCIES } from '#lib/money.ts';
	import type { CategoryOption, ExpenseFormErrors, ExpenseFormValues } from '#lib/expense-form.ts';

	type Props = {
		values: ExpenseFormValues;
		errors?: ExpenseFormErrors;
		categories: CategoryOption[];
		submitLabel: string;
		action?: string;
	};

	let { values, errors = {}, categories, submitLabel, action }: Props = $props();

	let submitting = $state(false);
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
	<fieldset>
		<legend class="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">Moneda</legend>
		<div class="grid grid-cols-2 gap-2 rounded-2xl bg-stone-200 p-1 dark:bg-stone-800">
			{#each CURRENCIES as currency (currency)}
				<label
					class="cursor-pointer rounded-xl py-2.5 text-center font-semibold text-stone-600 has-checked:bg-white has-checked:text-stone-900 has-checked:shadow-sm dark:text-stone-400 dark:has-checked:bg-stone-950 dark:has-checked:text-stone-100"
				>
					<input type="radio" name="currency" value={currency} checked={values.currency === currency} class="sr-only" />
					{currency === 'PEN' ? 'S/ Soles' : 'US$ Dólares'}
				</label>
			{/each}
		</div>
		{#if errors.currency}<p class="mt-1 text-sm text-red-600">{errors.currency}</p>{/if}
	</fieldset>

	<div>
		<label for="amount" class="mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400">Monto</label>
		<input
			id="amount"
			name="amount"
			inputmode="decimal"
			autocomplete="off"
			placeholder="0.00"
			value={values.amount}
			aria-invalid={errors.amount ? 'true' : undefined}
			class="w-full rounded-2xl border-0 bg-white px-4 py-4 text-3xl font-semibold tabular-nums shadow-sm outline-none focus:ring-2 focus:ring-teal-600 dark:bg-stone-900"
		/>
		{#if errors.amount}<p class="mt-1 text-sm text-red-600">{errors.amount}</p>{/if}
	</div>

	<fieldset>
		<legend class="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">Categoría</legend>
		<div class="flex flex-wrap gap-2">
			{#each categories as category (category.id)}
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

	<div>
		<label for="description" class="mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400">
			Descripción <span class="font-normal text-stone-400">(opcional)</span>
		</label>
		<input
			id="description"
			name="description"
			maxlength="200"
			value={values.description}
			class="w-full rounded-2xl border-0 bg-white px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-600 dark:bg-stone-900"
		/>
		{#if errors.description}<p class="mt-1 text-sm text-red-600">{errors.description}</p>{/if}
	</div>

	<div>
		<label for="occurredAt" class="mb-2 block text-sm font-medium text-stone-600 dark:text-stone-400">Fecha y hora</label>
		<input
			id="occurredAt"
			name="occurredAt"
			type="datetime-local"
			value={values.occurredAt}
			class="w-full rounded-2xl border-0 bg-white px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-teal-600 dark:bg-stone-900"
		/>
		{#if errors.occurredAt}<p class="mt-1 text-sm text-red-600">{errors.occurredAt}</p>{/if}
	</div>

	<button
		type="submit"
		disabled={submitting}
		class="rounded-2xl bg-teal-700 py-4 font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-60 dark:bg-teal-600"
	>
		{submitting ? 'Guardando…' : submitLabel}
	</button>
</form>
