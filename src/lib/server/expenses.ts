import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db } from './db';
import { categories, financialAccounts, transactions } from './db/schema';
import { isCurrency, parseAmountToCents, type Currency } from '#lib/money.ts';
import { parseLimaDateTimeInput } from '#lib/dates.ts';
import type { ExpenseFormErrors, ExpenseFormValues } from '#lib/expense-form.ts';

const EXPENSE_TYPE = 'expense';
const MAX_DESCRIPTION_LENGTH = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ExpenseInput = {
	currency: Currency;
	amountCents: number;
	categoryId: string;
	description: string | null;
	occurredAt: Date;
};

type ParsedExpenseForm =
	| { ok: true; input: ExpenseInput }
	| { ok: false; values: ExpenseFormValues; errors: ExpenseFormErrors };

export function listCategories(userId: string) {
	return db
		.select({ id: categories.id, name: categories.name })
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(asc(categories.sortOrder));
}

export function listExpensesBetween(userId: string, start: Date, end: Date) {
	return db
		.select({
			id: transactions.id,
			amountCents: transactions.amountCents,
			currency: transactions.currency,
			description: transactions.description,
			occurredAt: transactions.occurredAt,
			categoryName: categories.name
		})
		.from(transactions)
		.innerJoin(categories, eq(transactions.categoryId, categories.id))
		.where(
			and(
				eq(transactions.userId, userId),
				eq(transactions.type, EXPENSE_TYPE),
				gte(transactions.occurredAt, start),
				lt(transactions.occurredAt, end)
			)
		)
		.orderBy(asc(transactions.occurredAt));
}

export async function findExpense(userId: string, id: string) {
	if (!UUID_PATTERN.test(id)) return null;
	const [expense] = await db
		.select({
			id: transactions.id,
			amountCents: transactions.amountCents,
			currency: transactions.currency,
			categoryId: transactions.categoryId,
			description: transactions.description,
			occurredAt: transactions.occurredAt
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.id, id),
				eq(transactions.userId, userId),
				eq(transactions.type, EXPENSE_TYPE)
			)
		);
	return expense ?? null;
}

export async function parseExpenseForm(userId: string, formData: FormData): Promise<ParsedExpenseForm> {
	const values: ExpenseFormValues = {
		currency: String(formData.get('currency') ?? ''),
		amount: String(formData.get('amount') ?? '').trim(),
		categoryId: String(formData.get('categoryId') ?? ''),
		description: String(formData.get('description') ?? '').trim(),
		occurredAt: String(formData.get('occurredAt') ?? '')
	};
	const errors: ExpenseFormErrors = {};

	const currency = isCurrency(values.currency) ? values.currency : null;
	if (!currency) errors.currency = 'Elige una moneda';

	const amountCents = parseAmountToCents(values.amount);
	if (amountCents === null) errors.amount = 'Ingresa un monto válido, por ejemplo 12.50';

	const categoryExists = UUID_PATTERN.test(values.categoryId) && (await isUserCategory(userId, values.categoryId));
	if (!categoryExists) errors.categoryId = 'Elige una categoría';

	if (values.description.length > MAX_DESCRIPTION_LENGTH) {
		errors.description = `Máximo ${MAX_DESCRIPTION_LENGTH} caracteres`;
	}

	const occurredAt = parseLimaDateTimeInput(values.occurredAt);
	if (!occurredAt) errors.occurredAt = 'Ingresa una fecha y hora válidas';

	if (!currency || amountCents === null || !categoryExists || !occurredAt || Object.keys(errors).length > 0) {
		return { ok: false, values, errors };
	}

	return {
		ok: true,
		input: {
			currency,
			amountCents,
			categoryId: values.categoryId,
			description: values.description || null,
			occurredAt
		}
	};
}

export async function createExpense(userId: string, input: ExpenseInput) {
	const financialAccountId = await findCashAccountId(userId, input.currency);
	await db.insert(transactions).values({
		userId,
		type: EXPENSE_TYPE,
		financialAccountId,
		...input
	});
}

export async function updateExpense(userId: string, id: string, input: ExpenseInput): Promise<boolean> {
	if (!UUID_PATTERN.test(id)) return false;
	const financialAccountId = await findCashAccountId(userId, input.currency);
	const updated = await db
		.update(transactions)
		.set({ ...input, financialAccountId, updatedAt: new Date() })
		.where(
			and(
				eq(transactions.id, id),
				eq(transactions.userId, userId),
				eq(transactions.type, EXPENSE_TYPE)
			)
		)
		.returning({ id: transactions.id });
	return updated.length > 0;
}

export async function deleteExpense(userId: string, id: string): Promise<boolean> {
	if (!UUID_PATTERN.test(id)) return false;
	const deleted = await db
		.delete(transactions)
		.where(
			and(
				eq(transactions.id, id),
				eq(transactions.userId, userId),
				eq(transactions.type, EXPENSE_TYPE)
			)
		)
		.returning({ id: transactions.id });
	return deleted.length > 0;
}

async function isUserCategory(userId: string, categoryId: string): Promise<boolean> {
	const [category] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
	return Boolean(category);
}

async function findCashAccountId(userId: string, currency: Currency): Promise<string> {
	const [account] = await db
		.select({ id: financialAccounts.id })
		.from(financialAccounts)
		.where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.currency, currency)))
		.orderBy(asc(financialAccounts.createdAt))
		.limit(1);
	if (!account) throw new Error(`No ${currency} account found for user ${userId}`);
	return account.id;
}
