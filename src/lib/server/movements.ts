import { and, asc, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import { db } from './db';
import { categories, financialAccounts, transactions, transfers } from './db/schema';
import { findActiveAccount } from './accounts';
import { centsToInput, exchangeRateFromCents, isCurrency, parseAmountToCents, parseOptionalAmountToCents, type Currency } from '#lib/money.ts';
import { parseLimaDateTimeInput, toLimaDateTimeInput } from '#lib/dates.ts';
import {
	isMovementType,
	type CategoryKind,
	type CategoryOption,
	type MovementFormErrors,
	type MovementFormValues
} from '#lib/movement-form.ts';

const MAX_DESCRIPTION_LENGTH = 200;
const COMMISSION_CATEGORY_NAME = 'Comisión de billetera';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DbExecutor = Pick<typeof db, 'insert' | 'delete' | 'select'>;

type EntryInput = {
	type: CategoryKind;
	accountId: string;
	currency: Currency;
	amountCents: number;
	categoryId: string;
	description: string | null;
	occurredAt: Date;
};

type TransferInput = {
	type: 'transfer';
	fromAccountId: string;
	fromCurrency: Currency;
	totalOutCents: number;
	commissionCents: number;
	commissionCategoryId: string | null;
	toAccountId: string;
	toCurrency: Currency;
	toAmountCents: number;
	description: string | null;
	occurredAt: Date;
};

export type MovementInput = EntryInput | TransferInput;

type ParsedMovementForm =
	| { ok: true; input: MovementInput }
	| { ok: false; values: MovementFormValues; errors: MovementFormErrors };

export type MovementTarget = { kind: 'expense'; occurredAt: Date } | { kind: 'account'; accountId: string };

export function listCategories(userId: string): Promise<CategoryOption[]> {
	return db
		.select({ id: categories.id, name: categories.name, kind: categories.kind })
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(asc(categories.kind), asc(categories.sortOrder));
}

export function listExpensesBetween(userId: string, start: Date, end: Date) {
	return db
		.select({
			id: transactions.id,
			amountCents: transactions.amountCents,
			currency: transactions.currency,
			description: transactions.description,
			occurredAt: transactions.occurredAt,
			categoryName: categories.name,
			accountName: financialAccounts.name
		})
		.from(transactions)
		.innerJoin(categories, eq(transactions.categoryId, categories.id))
		.innerJoin(financialAccounts, eq(transactions.financialAccountId, financialAccounts.id))
		.where(
			and(
				eq(transactions.userId, userId),
				eq(transactions.type, 'expense'),
				gte(transactions.occurredAt, start),
				lt(transactions.occurredAt, end)
			)
		)
		.orderBy(asc(transactions.occurredAt));
}

export async function findLastUsedAccountId(userId: string): Promise<string | null> {
	const [last] = await db
		.select({ accountId: transactions.financialAccountId })
		.from(transactions)
		.innerJoin(financialAccounts, eq(transactions.financialAccountId, financialAccounts.id))
		.where(
			and(
				eq(transactions.userId, userId),
				inArray(transactions.type, ['expense', 'income', 'transfer_out']),
				isNull(financialAccounts.archivedAt)
			)
		)
		.orderBy(desc(transactions.createdAt))
		.limit(1);
	return last?.accountId ?? null;
}

export function emptyMovementValues(overrides: Partial<MovementFormValues> = {}): MovementFormValues {
	return {
		type: 'expense',
		accountId: '',
		currency: 'PEN',
		amount: '',
		categoryId: '',
		toAccountId: '',
		toCurrency: 'PEN',
		toAmount: '',
		commission: '',
		description: '',
		occurredAt: toLimaDateTimeInput(new Date()),
		...overrides
	};
}

export async function findMovementForEdit(userId: string, transactionId: string) {
	if (!UUID_PATTERN.test(transactionId)) return null;
	const [row] = await db
		.select()
		.from(transactions)
		.where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

	if (!row || row.type === 'opening_balance') return null;

	if (!row.transferId) {
		const type = row.type as CategoryKind;
		return {
			values: emptyMovementValues({
				type,
				accountId: row.financialAccountId,
				currency: row.currency,
				amount: centsToInput(Math.abs(row.amountCents)),
				categoryId: row.categoryId ?? '',
				description: row.description ?? '',
				occurredAt: toLimaDateTimeInput(row.occurredAt)
			}),
			target: targetFor(type, row.financialAccountId, row.occurredAt)
		};
	}

	const group = await db
		.select()
		.from(transactions)
		.where(and(eq(transactions.transferId, row.transferId), eq(transactions.userId, userId)));
	const out = group.find((item) => item.type === 'transfer_out');
	const incoming = group.find((item) => item.type === 'transfer_in');
	const commission = group.find((item) => item.type === 'expense');
	if (!out || !incoming) return null;

	const commissionCents = commission ? Math.abs(commission.amountCents) : 0;
	const totalOutCents = Math.abs(out.amountCents) + commissionCents;

	return {
		values: emptyMovementValues({
			type: 'transfer',
			accountId: out.financialAccountId,
			currency: out.currency,
			amount: centsToInput(totalOutCents),
			toAccountId: incoming.financialAccountId,
			toCurrency: incoming.currency,
			toAmount: out.currency === incoming.currency ? '' : centsToInput(incoming.amountCents),
			commission: commissionCents ? centsToInput(commissionCents) : '',
			description: out.description ?? '',
			occurredAt: toLimaDateTimeInput(out.occurredAt)
		}),
		target: targetFor('transfer', out.financialAccountId, out.occurredAt)
	};
}

export async function parseMovementForm(userId: string, formData: FormData): Promise<ParsedMovementForm> {
	const field = (name: keyof MovementFormValues) => String(formData.get(name) ?? '').trim();
	const values: MovementFormValues = {
		type: field('type'),
		accountId: field('accountId'),
		currency: field('currency'),
		amount: field('amount'),
		categoryId: field('categoryId'),
		toAccountId: field('toAccountId'),
		toCurrency: field('toCurrency'),
		toAmount: field('toAmount'),
		commission: field('commission'),
		description: field('description'),
		occurredAt: field('occurredAt')
	};
	const errors: MovementFormErrors = {};
	const fail = (): ParsedMovementForm => ({ ok: false, values, errors });

	if (!isMovementType(values.type)) {
		errors.type = 'Elige un tipo de movimiento';
		return fail();
	}

	const account = await findActiveAccount(userId, values.accountId);
	if (!account) errors.accountId = 'Elige una cuenta';

	const currency = isCurrency(values.currency) ? values.currency : null;
	if (!currency || (account && !account.currencies.includes(currency))) errors.currency = 'Elige una moneda de la cuenta';

	const amountCents = parseAmountToCents(values.amount);
	if (amountCents === null) errors.amount = 'Ingresa un monto válido, por ejemplo 12.50';

	if (values.description.length > MAX_DESCRIPTION_LENGTH) errors.description = `Máximo ${MAX_DESCRIPTION_LENGTH} caracteres`;

	const occurredAt = parseLimaDateTimeInput(values.occurredAt);
	if (!occurredAt) errors.occurredAt = 'Ingresa una fecha y hora válidas';

	const description = values.description || null;

	if (values.type !== 'transfer') {
		const categoryOk = await isUserCategory(userId, values.categoryId, values.type);
		if (!categoryOk) errors.categoryId = 'Elige una categoría';
		if (!account || !currency || amountCents === null || !occurredAt || Object.keys(errors).length > 0) return fail();
		return {
			ok: true,
			input: {
				type: values.type,
				accountId: account.id,
				currency,
				amountCents,
				categoryId: values.categoryId,
				description,
				occurredAt
			}
		};
	}

	const toAccount = await findActiveAccount(userId, values.toAccountId);
	if (!toAccount) errors.toAccountId = 'Elige la cuenta destino';

	const toCurrency = isCurrency(values.toCurrency) ? values.toCurrency : null;
	if (!toCurrency || (toAccount && !toAccount.currencies.includes(toCurrency))) {
		errors.toCurrency = 'Elige una moneda de la cuenta destino';
	}

	if (account && toAccount && account.id === toAccount.id && currency === toCurrency) {
		errors.toAccountId = 'La cuenta destino debe ser distinta';
	}

	const commissionCents = parseOptionalAmountToCents(values.commission);
	if (commissionCents === null) errors.commission = 'Ingresa una comisión válida';
	else if (amountCents !== null && commissionCents >= amountCents) errors.commission = 'La comisión debe ser menor al monto';

	const sentCents = amountCents !== null && commissionCents !== null ? amountCents - commissionCents : null;
	let toAmountCents = sentCents;
	if (currency && toCurrency && currency !== toCurrency) {
		toAmountCents = parseAmountToCents(values.toAmount);
		if (toAmountCents === null) errors.toAmount = 'Ingresa el monto que llega';
	}

	let commissionCategoryId: string | null = null;
	if (commissionCents) {
		commissionCategoryId = await findCategoryIdByName(userId, COMMISSION_CATEGORY_NAME);
		if (!commissionCategoryId) errors.commission = `No existe la categoría "${COMMISSION_CATEGORY_NAME}"`;
	}

	if (
		!account ||
		!toAccount ||
		!currency ||
		!toCurrency ||
		amountCents === null ||
		commissionCents === null ||
		toAmountCents === null ||
		!occurredAt ||
		Object.keys(errors).length > 0
	) {
		return fail();
	}

	return {
		ok: true,
		input: {
			type: 'transfer',
			fromAccountId: account.id,
			fromCurrency: currency,
			totalOutCents: amountCents,
			commissionCents,
			commissionCategoryId,
			toAccountId: toAccount.id,
			toCurrency,
			toAmountCents,
			description,
			occurredAt
		}
	};
}

export async function createMovement(userId: string, input: MovementInput): Promise<MovementTarget> {
	await db.transaction((tx) => insertMovement(tx, userId, input));
	return targetForInput(input);
}

export async function updateMovement(userId: string, transactionId: string, input: MovementInput): Promise<MovementTarget | null> {
	const updated = await db.transaction(async (tx) => {
		const removed = await removeMovement(tx, userId, transactionId);
		if (!removed) return false;
		await insertMovement(tx, userId, input);
		return true;
	});
	return updated ? targetForInput(input) : null;
}

export async function deleteMovement(userId: string, transactionId: string): Promise<boolean> {
	return db.transaction((tx) => removeMovement(tx, userId, transactionId));
}

async function insertMovement(tx: DbExecutor, userId: string, input: MovementInput) {
	if (input.type !== 'transfer') {
		await tx.insert(transactions).values({
			userId,
			type: input.type,
			amountCents: input.type === 'expense' ? -input.amountCents : input.amountCents,
			currency: input.currency,
			categoryId: input.categoryId,
			financialAccountId: input.accountId,
			description: input.description,
			occurredAt: input.occurredAt
		});
		return;
	}

	const sentCents = input.totalOutCents - input.commissionCents;
	const exchangeRate =
		input.fromCurrency === input.toCurrency
			? null
			: input.fromCurrency === 'PEN'
				? exchangeRateFromCents(sentCents, input.toAmountCents)
				: exchangeRateFromCents(input.toAmountCents, sentCents);

	const [transfer] = await tx.insert(transfers).values({ userId, exchangeRate }).returning({ id: transfers.id });
	const shared = { userId, transferId: transfer.id, description: input.description, occurredAt: input.occurredAt };

	await tx.insert(transactions).values([
		{
			...shared,
			type: 'transfer_out',
			amountCents: -sentCents,
			currency: input.fromCurrency,
			financialAccountId: input.fromAccountId
		},
		{
			...shared,
			type: 'transfer_in',
			amountCents: input.toAmountCents,
			currency: input.toCurrency,
			financialAccountId: input.toAccountId
		}
	]);

	if (input.commissionCents > 0 && input.commissionCategoryId) {
		await tx.insert(transactions).values({
			...shared,
			type: 'expense',
			amountCents: -input.commissionCents,
			currency: input.fromCurrency,
			categoryId: input.commissionCategoryId,
			financialAccountId: input.fromAccountId
		});
	}
}

async function removeMovement(tx: DbExecutor, userId: string, transactionId: string): Promise<boolean> {
	if (!UUID_PATTERN.test(transactionId)) return false;
	const [row] = await tx
		.select({ id: transactions.id, type: transactions.type, transferId: transactions.transferId })
		.from(transactions)
		.where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

	if (!row || row.type === 'opening_balance') return false;

	if (row.transferId) {
		await tx.delete(transfers).where(and(eq(transfers.id, row.transferId), eq(transfers.userId, userId)));
	} else {
		await tx.delete(transactions).where(eq(transactions.id, row.id));
	}
	return true;
}

async function isUserCategory(userId: string, categoryId: string, kind: CategoryKind): Promise<boolean> {
	if (!UUID_PATTERN.test(categoryId)) return false;
	const [category] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.userId, userId), eq(categories.kind, kind)));
	return Boolean(category);
}

async function findCategoryIdByName(userId: string, name: string): Promise<string | null> {
	const [category] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.userId, userId), eq(categories.name, name), eq(categories.kind, 'expense')));
	return category?.id ?? null;
}

function targetFor(type: string, accountId: string, occurredAt: Date): MovementTarget {
	return type === 'expense' ? { kind: 'expense', occurredAt } : { kind: 'account', accountId };
}

function targetForInput(input: MovementInput): MovementTarget {
	return input.type === 'transfer'
		? { kind: 'account', accountId: input.fromAccountId }
		: targetFor(input.type, input.accountId, input.occurredAt);
}
