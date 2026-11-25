import { and, asc, desc, eq, gte, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from './db';
import { categories, creditCardDetails, financialAccounts, transactions } from './db/schema';
import { getReferenceRate } from './settings';
import { CURRENCIES, convertUsdCentsToPen, isCurrency, parseAmountToCents, parseOptionalAmountToCents, type Currency } from '#lib/money.ts';
import { cardCycle, limaDayRange, shiftDay, todayInLima } from '#lib/dates.ts';
import {
	isAccountKind,
	type AccountFormErrors,
	type AccountFormValues,
	type AccountSummary,
	type CardSummary,
	type CurrencyAmounts
} from '#lib/account-form.ts';
import type { AccountKind, AccountOption } from '#lib/movement-form.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME_LENGTH = 60;
const OPENING_BALANCE_TYPE = 'opening_balance';
const CARD_CURRENCIES: Currency[] = ['PEN', 'USD'];
const UNIQUE_VIOLATION = '23505';

type AccountInput = {
	kind: AccountKind;
	name: string;
	institution: string | null;
	currencies: Currency[];
	opening: CurrencyAmounts;
	card: { creditLimitCents: number; statementDay: number | null; paymentDueDay: number | null } | null;
};

type ParsedAccountForm =
	| { ok: true; values: AccountFormValues; input: AccountInput }
	| { ok: false; values: AccountFormValues; errors: AccountFormErrors };

const emptyAmounts = (): CurrencyAmounts => ({ PEN: 0, USD: 0 });

export function listAccountOptions(userId: string): Promise<AccountOption[]> {
	return db
		.select({
			id: financialAccounts.id,
			name: financialAccounts.name,
			kind: financialAccounts.kind,
			currencies: financialAccounts.currencies
		})
		.from(financialAccounts)
		.where(and(eq(financialAccounts.userId, userId), isNull(financialAccounts.archivedAt)))
		.orderBy(asc(financialAccounts.kind), asc(financialAccounts.name));
}

export async function findActiveAccount(userId: string, accountId: string) {
	if (!UUID_PATTERN.test(accountId)) return null;
	const [account] = await db
		.select({ id: financialAccounts.id, currencies: financialAccounts.currencies })
		.from(financialAccounts)
		.where(
			and(
				eq(financialAccounts.id, accountId),
				eq(financialAccounts.userId, userId),
				isNull(financialAccounts.archivedAt)
			)
		);
	return account ?? null;
}

export async function listAccountSummaries(userId: string, accountId?: string): Promise<AccountSummary[]> {
	const filters = [eq(financialAccounts.userId, userId)];
	if (accountId) filters.push(eq(financialAccounts.id, accountId));

	const rows = await db
		.select({
			id: financialAccounts.id,
			name: financialAccounts.name,
			institution: financialAccounts.institution,
			kind: financialAccounts.kind,
			currencies: financialAccounts.currencies,
			archivedAt: financialAccounts.archivedAt,
			creditLimitCents: creditCardDetails.creditLimitCents,
			statementDay: creditCardDetails.statementDay,
			paymentDueDay: creditCardDetails.paymentDueDay
		})
		.from(financialAccounts)
		.leftJoin(creditCardDetails, eq(creditCardDetails.accountId, financialAccounts.id))
		.where(and(...filters))
		.orderBy(asc(financialAccounts.kind), asc(financialAccounts.name));

	if (rows.length === 0) return [];

	const accountIds = rows.map((row) => row.id);
	const balances = await sumByAccount(userId, accountIds);
	const today = todayInLima();
	const rate = rows.some((row) => row.kind === 'credit_card') ? await getReferenceRate(userId) : null;

	const summaries: AccountSummary[] = [];
	for (const row of rows) {
		const accountBalances = balances.get(row.id) ?? emptyAmounts();
		let card: CardSummary | null = null;

		if (row.kind === 'credit_card' && row.creditLimitCents !== null) {
			const cycle =
				row.statementDay !== null && row.paymentDueDay !== null ? cardCycle(today, row.statementDay, row.paymentDueDay) : null;
			let cycleSpending: CurrencyAmounts | null = null;
			if (cycle) {
				const cycleStart = limaDayRange(shiftDay(cycle.lastStatement, 1)).start;
				const spent = (await sumByAccount(userId, [row.id], cycleStart, true)).get(row.id) ?? emptyAmounts();
				cycleSpending = { PEN: -spent.PEN, USD: -spent.USD };
			}
			const debt: CurrencyAmounts = {
				PEN: Math.max(0, -accountBalances.PEN),
				USD: Math.max(0, -accountBalances.USD)
			};
			const availableCents =
				debt.USD > 0 && rate === null
					? null
					: row.creditLimitCents - debt.PEN - (debt.USD > 0 && rate !== null ? convertUsdCentsToPen(debt.USD, rate) : 0);

			card = {
				creditLimitCents: row.creditLimitCents,
				statementDay: row.statementDay,
				paymentDueDay: row.paymentDueDay,
				cycle,
				debt,
				cycleSpending,
				availableCents
			};
		}

		summaries.push({
			id: row.id,
			name: row.name,
			institution: row.institution,
			kind: row.kind,
			currencies: row.currencies,
			archived: row.archivedAt !== null,
			balances: accountBalances,
			card
		});
	}

	return summaries;
}

export async function getAccountSummary(userId: string, accountId: string): Promise<AccountSummary | null> {
	if (!UUID_PATTERN.test(accountId)) return null;
	const [summary] = await listAccountSummaries(userId, accountId);
	return summary ?? null;
}

export async function listAccountMovements(userId: string, accountId: string, limit = 200) {
	const rows = await db
		.select({
			id: transactions.id,
			type: transactions.type,
			amountCents: transactions.amountCents,
			currency: transactions.currency,
			description: transactions.description,
			occurredAt: transactions.occurredAt,
			transferId: transactions.transferId,
			categoryName: categories.name
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(and(eq(transactions.userId, userId), eq(transactions.financialAccountId, accountId)))
		.orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
		.limit(limit);

	const transferIds = [...new Set(rows.flatMap((row) => (row.transferId ? [row.transferId] : [])))];
	const counterparts = new Map<string, string>();

	if (transferIds.length > 0) {
		const others = await db
			.select({
				transferId: transactions.transferId,
				type: transactions.type,
				accountName: financialAccounts.name
			})
			.from(transactions)
			.innerJoin(financialAccounts, eq(transactions.financialAccountId, financialAccounts.id))
			.where(
				and(
					eq(transactions.userId, userId),
					inArray(transactions.transferId, transferIds),
					inArray(transactions.type, ['transfer_out', 'transfer_in'])
				)
			);
		for (const other of others) {
			if (other.transferId) counterparts.set(`${other.transferId}:${other.type}`, other.accountName);
		}
	}

	return rows.map((row) => {
		let counterpart: string | null = null;
		if (row.transferId && row.type === 'transfer_out') counterpart = counterparts.get(`${row.transferId}:transfer_in`) ?? null;
		if (row.transferId && row.type === 'transfer_in') counterpart = counterparts.get(`${row.transferId}:transfer_out`) ?? null;
		return { ...row, counterpart };
	});
}

export async function getAccountFormValues(userId: string, accountId: string): Promise<AccountFormValues | null> {
	if (!UUID_PATTERN.test(accountId)) return null;
	const [account] = await db
		.select({
			kind: financialAccounts.kind,
			name: financialAccounts.name,
			institution: financialAccounts.institution,
			currencies: financialAccounts.currencies,
			creditLimitCents: creditCardDetails.creditLimitCents,
			statementDay: creditCardDetails.statementDay,
			paymentDueDay: creditCardDetails.paymentDueDay
		})
		.from(financialAccounts)
		.leftJoin(creditCardDetails, eq(creditCardDetails.accountId, financialAccounts.id))
		.where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)));

	if (!account) return null;

	const opening = await openingBalances(accountId);
	const sign = account.kind === 'credit_card' ? -1 : 1;
	const toInput = (cents: number | undefined) => (cents ? centsToPlain(cents * sign) : '');

	return {
		kind: account.kind,
		name: account.name,
		institution: account.institution ?? '',
		currencies: account.currencies,
		openingPEN: toInput(opening.get('PEN')?.amountCents),
		openingUSD: toInput(opening.get('USD')?.amountCents),
		creditLimit: account.creditLimitCents ? centsToPlain(account.creditLimitCents) : '',
		available: '',
		statementDay: account.statementDay ? String(account.statementDay) : '',
		paymentDueDay: account.paymentDueDay ? String(account.paymentDueDay) : ''
	};
}

export function parseAccountForm(formData: FormData, editingKind?: AccountKind): ParsedAccountForm {
	const values: AccountFormValues = {
		kind: editingKind ?? String(formData.get('kind') ?? ''),
		name: String(formData.get('name') ?? '').trim(),
		institution: String(formData.get('institution') ?? '').trim(),
		currencies: formData.getAll('currencies').map(String),
		openingPEN: String(formData.get('openingPEN') ?? '').trim(),
		openingUSD: String(formData.get('openingUSD') ?? '').trim(),
		creditLimit: String(formData.get('creditLimit') ?? '').trim(),
		available: String(formData.get('available') ?? '').trim(),
		statementDay: String(formData.get('statementDay') ?? '').trim(),
		paymentDueDay: String(formData.get('paymentDueDay') ?? '').trim()
	};
	const errors: AccountFormErrors = {};

	const kind = isAccountKind(values.kind) ? values.kind : null;
	if (!kind) errors.kind = 'Elige un tipo de cuenta';

	if (!values.name) errors.name = 'Ingresa un nombre';
	if (values.name.length > MAX_NAME_LENGTH) errors.name = `Máximo ${MAX_NAME_LENGTH} caracteres`;

	const isCard = kind === 'credit_card';
	const usesAvailable = isCard && !editingKind;

	if (isCard) values.currencies = [...CARD_CURRENCIES];
	const currencies = CURRENCIES.filter((currency) => values.currencies.includes(currency));
	if (currencies.length === 0 || !values.currencies.every(isCurrency)) errors.currencies = 'Elige al menos una moneda';

	const opening = emptyAmounts();
	if (!usesAvailable) {
		for (const currency of currencies) {
			const cents = parseOptionalAmountToCents(currency === 'PEN' ? values.openingPEN : values.openingUSD);
			if (cents === null) errors[currency === 'PEN' ? 'openingPEN' : 'openingUSD'] = 'Ingresa un monto válido';
			else opening[currency] = isCard ? -cents : cents;
		}
	}

	let card: AccountInput['card'] = null;
	if (isCard) {
		const creditLimitCents = parseAmountToCents(values.creditLimit);
		if (creditLimitCents === null) errors.creditLimit = 'Ingresa la línea de crédito';

		if (usesAvailable) {
			const availableCents = parseSignedAmountToCents(values.available);
			if (availableCents === null) errors.available = 'Ingresa el disponible (negativo si estás en sobrelínea)';
			else if (creditLimitCents !== null) opening.PEN = availableCents - creditLimitCents;
		}

		const statementDay = parseOptionalDay(values.statementDay);
		const paymentDueDay = parseOptionalDay(values.paymentDueDay);
		if (statementDay === undefined) errors.statementDay = 'Día entre 1 y 31';
		if (paymentDueDay === undefined) errors.paymentDueDay = 'Día entre 1 y 31';
		if (statementDay === null && paymentDueDay !== null && paymentDueDay !== undefined) errors.statementDay = 'Ingresa ambos días o ninguno';
		if (paymentDueDay === null && statementDay !== null && statementDay !== undefined) errors.paymentDueDay = 'Ingresa ambos días o ninguno';

		if (creditLimitCents !== null && statementDay !== undefined && paymentDueDay !== undefined) {
			card = { creditLimitCents, statementDay, paymentDueDay };
		}
	}

	if (!kind || Object.keys(errors).length > 0) return { ok: false, values, errors };

	return {
		ok: true,
		values,
		input: { kind, name: values.name, institution: values.institution || null, currencies, opening, card }
	};
}

export async function createAccount(userId: string, input: AccountInput): Promise<{ id: string } | { error: string }> {
	try {
		return await db.transaction(async (tx) => {
			const now = new Date();
			const [account] = await tx
				.insert(financialAccounts)
				.values({
					userId,
					kind: input.kind,
					name: input.name,
					institution: input.institution,
					currencies: input.currencies,
					createdAt: now,
					updatedAt: now
				})
				.returning({ id: financialAccounts.id });

			if (input.card) await tx.insert(creditCardDetails).values({ accountId: account.id, ...input.card });

			for (const currency of input.currencies) {
				if (input.opening[currency] === 0) continue;
				await tx.insert(transactions).values({
					userId,
					type: OPENING_BALANCE_TYPE,
					amountCents: input.opening[currency],
					currency,
					financialAccountId: account.id,
					occurredAt: now
				});
			}

			return { id: account.id };
		});
	} catch (error) {
		if (isUniqueViolation(error)) return { error: 'Ya tienes una cuenta con ese nombre' };
		throw error;
	}
}

export async function updateAccount(userId: string, accountId: string, input: AccountInput): Promise<{ error: string } | null> {
	const [account] = await db
		.select({ id: financialAccounts.id, createdAt: financialAccounts.createdAt, currencies: financialAccounts.currencies })
		.from(financialAccounts)
		.where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)));
	if (!account) return { error: 'Cuenta no encontrada' };

	const removedCurrencies = account.currencies.filter((currency) => !input.currencies.includes(currency));
	if (removedCurrencies.length > 0) {
		const [used] = await db
			.select({ id: transactions.id })
			.from(transactions)
			.where(
				and(
					eq(transactions.financialAccountId, accountId),
					inArray(transactions.currency, removedCurrencies),
					ne(transactions.type, OPENING_BALANCE_TYPE)
				)
			)
			.limit(1);
		if (used) return { error: `No puedes quitar ${removedCurrencies.join(' y ')}: la cuenta tiene movimientos en esa moneda` };
	}

	try {
		await db.transaction(async (tx) => {
			await tx
				.update(financialAccounts)
				.set({ name: input.name, institution: input.institution, currencies: input.currencies, updatedAt: new Date() })
				.where(eq(financialAccounts.id, accountId));

			if (input.card) {
				await tx
					.insert(creditCardDetails)
					.values({ accountId, ...input.card })
					.onConflictDoUpdate({ target: creditCardDetails.accountId, set: input.card });
			}

			await tx
				.delete(transactions)
				.where(and(eq(transactions.financialAccountId, accountId), eq(transactions.type, OPENING_BALANCE_TYPE)));

			for (const currency of input.currencies) {
				if (input.opening[currency] === 0) continue;
				await tx.insert(transactions).values({
					userId,
					type: OPENING_BALANCE_TYPE,
					amountCents: input.opening[currency],
					currency,
					financialAccountId: accountId,
					occurredAt: account.createdAt
				});
			}
		});
	} catch (error) {
		if (isUniqueViolation(error)) return { error: 'Ya tienes una cuenta con ese nombre' };
		throw error;
	}

	return null;
}

export async function setAccountArchived(userId: string, accountId: string, archived: boolean): Promise<boolean> {
	if (!UUID_PATTERN.test(accountId)) return false;
	const updated = await db
		.update(financialAccounts)
		.set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
		.where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)))
		.returning({ id: financialAccounts.id });
	return updated.length > 0;
}

async function sumByAccount(userId: string, accountIds: string[], since?: Date, expensesOnly = false) {
	const filters = [eq(transactions.userId, userId), inArray(transactions.financialAccountId, accountIds)];
	if (since) filters.push(gte(transactions.occurredAt, since));
	if (expensesOnly) filters.push(eq(transactions.type, 'expense'));

	const rows = await db
		.select({
			accountId: transactions.financialAccountId,
			currency: transactions.currency,
			total: sql<string>`coalesce(sum(${transactions.amountCents}), 0)`
		})
		.from(transactions)
		.where(and(...filters))
		.groupBy(transactions.financialAccountId, transactions.currency);

	const result = new Map<string, CurrencyAmounts>();
	for (const row of rows) {
		const amounts = result.get(row.accountId) ?? emptyAmounts();
		amounts[row.currency] = Number(row.total);
		result.set(row.accountId, amounts);
	}
	return result;
}

async function openingBalances(accountId: string) {
	const rows = await db
		.select({ currency: transactions.currency, amountCents: transactions.amountCents })
		.from(transactions)
		.where(and(eq(transactions.financialAccountId, accountId), eq(transactions.type, OPENING_BALANCE_TYPE)));
	return new Map(rows.map((row) => [row.currency, row]));
}

function parseOptionalDay(value: string): number | null | undefined {
	if (value === '') return null;
	if (!/^\d{1,2}$/.test(value)) return undefined;
	const day = Number(value);
	return day >= 1 && day <= 31 ? day : undefined;
}

function parseSignedAmountToCents(value: string): number | null {
	const negative = value.startsWith('-');
	const body = negative ? value.slice(1).trim() : value;
	if (body === '') return null;
	const cents = parseOptionalAmountToCents(body);
	if (cents === null) return null;
	return negative ? -cents : cents;
}

function centsToPlain(cents: number): string {
	const sign = cents < 0 ? '-' : '';
	const abs = Math.abs(cents);
	return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

function isUniqueViolation(error: unknown): boolean {
	const code = (error as { code?: string; cause?: { code?: string } })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
	return code === UNIQUE_VIOLATION;
}
