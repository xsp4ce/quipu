import { sql } from 'drizzle-orm';
import {
	bigint,
	check,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	smallint,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export * from './auth-schema';

export const currency = pgEnum('currency', ['PEN', 'USD']);

export const accountKind = pgEnum('account_kind', ['cash', 'bank', 'credit_card']);

export const categoryKind = pgEnum('category_kind', ['expense', 'income']);

export const categories = pgTable(
	'categories',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		kind: categoryKind().notNull(),
		name: text().notNull(),
		sortOrder: integer().notNull(),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(table) => [unique().on(table.userId, table.name)]
);

export const financialAccounts = pgTable(
	'financial_accounts',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		kind: accountKind().notNull(),
		name: text().notNull(),
		institution: text(),
		currencies: currency().array().notNull(),
		archivedAt: timestamp({ withTimezone: true }),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique().on(table.userId, table.name),
		check('financial_accounts_currencies_check', sql`cardinality(${table.currencies}) between 1 and 2`)
	]
);

export const creditCardDetails = pgTable(
	'credit_card_details',
	{
		accountId: uuid()
			.primaryKey()
			.references(() => financialAccounts.id, { onDelete: 'cascade' }),
		creditLimitCents: bigint({ mode: 'number' }).notNull(),
		statementDay: smallint().notNull(),
		paymentDueDay: smallint().notNull()
	},
	(table) => [
		check('credit_card_details_credit_limit_check', sql`${table.creditLimitCents} > 0`),
		check('credit_card_details_statement_day_check', sql`${table.statementDay} between 1 and 31`),
		check('credit_card_details_payment_due_day_check', sql`${table.paymentDueDay} between 1 and 31`)
	]
);

export const transfers = pgTable(
	'transfers',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		exchangeRate: numeric({ precision: 12, scale: 6 }),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(table) => [check('transfers_exchange_rate_check', sql`${table.exchangeRate} is null or ${table.exchangeRate} > 0`)]
);

export const transactions = pgTable(
	'transactions',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: text().notNull(),
		amountCents: bigint({ mode: 'number' }).notNull(),
		currency: currency().notNull(),
		categoryId: uuid().references(() => categories.id),
		financialAccountId: uuid()
			.notNull()
			.references(() => financialAccounts.id),
		transferId: uuid().references(() => transfers.id, { onDelete: 'cascade' }),
		description: text(),
		occurredAt: timestamp({ withTimezone: true }).notNull(),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index().on(table.userId, table.occurredAt),
		index().on(table.financialAccountId, table.occurredAt),
		index().on(table.transferId),
		check(
			'transactions_type_check',
			sql`${table.type} in ('expense', 'income', 'transfer_out', 'transfer_in', 'opening_balance')`
		),
		check(
			'transactions_amount_sign_check',
			sql`(${table.type} in ('income', 'transfer_in') and ${table.amountCents} > 0)
				or (${table.type} in ('expense', 'transfer_out') and ${table.amountCents} < 0)
				or (${table.type} = 'opening_balance' and ${table.amountCents} <> 0)`
		),
		check(
			'transactions_category_check',
			sql`(${table.type} in ('expense', 'income')) = (${table.categoryId} is not null)`
		),
		check(
			'transactions_transfer_check',
			sql`${table.type} not in ('transfer_out', 'transfer_in') or ${table.transferId} is not null`
		)
	]
);

export const userSettings = pgTable('user_settings', {
	userId: text()
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	usdPenReferenceRate: numeric({ precision: 10, scale: 4 }),
	updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
});
