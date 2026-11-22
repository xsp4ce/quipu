export const CURRENCIES = ['PEN', 'USD'] as const;

export type Currency = (typeof CURRENCIES)[number];

const AMOUNT_PATTERN = /^\d{1,9}(?:[.,]\d{1,2})?$/;

const formatters: Record<Currency, Intl.NumberFormat> = {
	PEN: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }),
	USD: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' })
};

export function isCurrency(value: unknown): value is Currency {
	return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

export function parseAmountToCents(input: string): number | null {
	const value = input.trim();
	if (!AMOUNT_PATTERN.test(value)) return null;
	const [units, decimals = ''] = value.split(/[.,]/);
	const cents = Number(units) * 100 + Number(decimals.padEnd(2, '0'));
	return cents > 0 ? cents : null;
}

export function centsToInput(cents: number): string {
	return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function formatCents(cents: number, currency: Currency): string {
	return formatters[currency].format(cents / 100);
}

export function parseOptionalAmountToCents(input: string): number | null {
	const value = input.trim();
	if (value === '') return 0;
	if (!AMOUNT_PATTERN.test(value)) return null;
	const [units, decimals = ''] = value.split(/[.,]/);
	return Number(units) * 100 + Number(decimals.padEnd(2, '0'));
}

export function formatAbsCents(cents: number, currency: Currency): string {
	return formatCents(Math.abs(cents), currency);
}

export function exchangeRateFromCents(penCents: number, usdCents: number): string {
	return (penCents / usdCents).toFixed(6);
}

export function convertUsdCentsToPen(usdCents: number, rate: number): number {
	return Math.round(usdCents * rate);
}
