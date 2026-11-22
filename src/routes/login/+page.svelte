<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';

	let email = $state('');
	let password = $state('');
	let errorMessage = $state<string | null>(null);
	let loading = $state(false);

	async function signInWithPassword(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMessage = null;
		const { error } = await authClient.signIn.email({ email, password });
		loading = false;
		if (error) {
			errorMessage = 'Email o contraseña incorrectos.';
			return;
		}
		await goto('/', { invalidateAll: true });
	}

	async function signInWithPasskey() {
		loading = true;
		errorMessage = null;
		const result = await authClient.signIn.passkey();
		loading = false;
		if (result?.error) {
			errorMessage = 'No se pudo iniciar sesión con Face ID.';
			return;
		}
		await goto('/', { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>Iniciar sesión · Quipu</title>
</svelte:head>

<main class="flex min-h-[80dvh] flex-col justify-center gap-8">
	<div class="text-center">
		<h1 class="text-3xl font-semibold tracking-tight">Quipu</h1>
		<p class="mt-1 text-stone-500">Tus finanzas, nudo a nudo.</p>
	</div>

	<button
		type="button"
		onclick={signInWithPasskey}
		disabled={loading}
		class="rounded-2xl bg-teal-700 py-4 font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-60 dark:bg-teal-600"
	>
		Entrar con Face ID
	</button>

	<div class="flex items-center gap-3 text-sm text-stone-400">
		<span class="h-px flex-1 bg-stone-300 dark:bg-stone-800"></span>
		o con contraseña
		<span class="h-px flex-1 bg-stone-300 dark:bg-stone-800"></span>
	</div>

	<form onsubmit={signInWithPassword} class="flex flex-col gap-3">
		<input
			type="email"
			bind:value={email}
			required
			autocomplete="username"
			placeholder="Email"
			class="rounded-2xl border-0 bg-white px-4 py-3.5 shadow-sm outline-none focus:ring-2 focus:ring-teal-600 dark:bg-stone-900"
		/>
		<input
			type="password"
			bind:value={password}
			required
			autocomplete="current-password"
			placeholder="Contraseña"
			class="rounded-2xl border-0 bg-white px-4 py-3.5 shadow-sm outline-none focus:ring-2 focus:ring-teal-600 dark:bg-stone-900"
		/>
		<button
			type="submit"
			disabled={loading}
			class="rounded-2xl bg-stone-900 py-3.5 font-semibold text-white active:scale-[0.98] disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900"
		>
			Entrar
		</button>
	</form>

	{#if errorMessage}
		<p class="text-center text-sm text-red-600" role="alert">{errorMessage}</p>
	{/if}
</main>
