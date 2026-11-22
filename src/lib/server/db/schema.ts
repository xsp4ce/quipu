import { sql } from 'drizzle-orm';
import {
	bigint,
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export * from './auth-schema';

export const currency = pgEnum('currency', ['PEN', 'USD']);

export const categories = pgTable(
	'categories',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
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
		name: text().notNull(),
		currency: currency().notNull(),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(table) => [unique().on(table.userId, table.name)]
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
		categoryId: uuid()
			.notNull()
			.references(() => categories.id),
		financialAccountId: uuid()
			.notNull()
			.references(() => financialAccounts.id),
		description: text(),
		occurredAt: timestamp({ withTimezone: true }).notNull(),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index().on(table.userId, table.occurredAt),
		check('transactions_type_check', sql`${table.type} in ('expense')`),
		check('transactions_amount_cents_check', sql`${table.amountCents} > 0`)
	]
);
