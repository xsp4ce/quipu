import type { Currency } from './money';

export const MOVEMENT_TYPES = ['expense', 'income', 'transfer'] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
	expense: 'Gasto',
	income: 'Ingreso',
	transfer: 'Transferencia'
};

export type CategoryKind = 'expense' | 'income';

export type CategoryOption = {
	id: string;
	name: string;
	kind: CategoryKind;
};

export type AccountKind = 'cash' | 'bank' | 'credit_card';

export type AccountOption = {
	id: string;
	name: string;
	kind: AccountKind;
	currencies: Currency[];
};

export type MovementFormValues = {
	type: string;
	accountId: string;
	currency: string;
	amount: string;
	categoryId: string;
	toAccountId: string;
	toCurrency: string;
	toAmount: string;
	commission: string;
	description: string;
	occurredAt: string;
};

export type MovementFormErrors = Partial<Record<keyof MovementFormValues | 'form', string>>;

export function isMovementType(value: unknown): value is MovementType {
	return typeof value === 'string' && (MOVEMENT_TYPES as readonly string[]).includes(value);
}
