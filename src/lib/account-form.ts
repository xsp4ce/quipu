import type { CardCycle } from './dates';
import type { Currency } from './money';
import type { AccountKind } from './movement-form';

export const ACCOUNT_KINDS = ['cash', 'bank', 'credit_card'] as const satisfies readonly AccountKind[];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
	cash: 'Efectivo',
	bank: 'Cuenta bancaria',
	credit_card: 'Tarjeta de crédito'
};

export type AccountFormValues = {
	kind: string;
	name: string;
	institution: string;
	currencies: string[];
	openingPEN: string;
	openingUSD: string;
	creditLimit: string;
	statementDay: string;
	paymentDueDay: string;
};

export type AccountFormErrors = Partial<Record<keyof AccountFormValues | 'form', string>>;

export function isAccountKind(value: unknown): value is AccountKind {
	return typeof value === 'string' && (ACCOUNT_KINDS as readonly string[]).includes(value);
}

export type CurrencyAmounts = Record<Currency, number>;

export type CardSummary = CardCycle & {
	creditLimitCents: number;
	statementDay: number;
	paymentDueDay: number;
	debt: CurrencyAmounts;
	cycleSpending: CurrencyAmounts;
	availableCents: number | null;
};

export type AccountSummary = {
	id: string;
	name: string;
	institution: string | null;
	kind: AccountKind;
	currencies: Currency[];
	archived: boolean;
	balances: CurrencyAmounts;
	card: CardSummary | null;
};
