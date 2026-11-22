import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import postgres from 'postgres';
import { hashPassword } from 'better-auth/crypto';

const DEFAULT_CATEGORIES = [
	'Comida',
	'Combustible',
	'Pago de servicios',
	'Suscripciones',
	'Comisión de billetera'
];

const DEFAULT_ACCOUNTS = [
	{ name: 'Efectivo PEN', currency: 'PEN' },
	{ name: 'Efectivo USD', currency: 'USD' }
];

const MIN_PASSWORD_LENGTH = 8;

function ask(question, { hidden = false } = {}) {
	return new Promise((resolve) => {
		const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
		if (hidden) {
			rl._writeToOutput = (text) => {
				if (text.startsWith(question)) rl.output.write(question);
			};
		}
		rl.question(question, (answer) => {
			rl.close();
			if (hidden) process.stdout.write('\n');
			resolve(answer.trim());
		});
	});
}

async function main() {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const name = await ask('Name: ');
	const email = (await ask('Email: ')).toLowerCase();
	const password = await ask('Password: ', { hidden: true });
	const confirmation = await ask('Confirm password: ', { hidden: true });

	if (!name || !email) throw new Error('Name and email are required');
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new Error(`Password must have at least ${MIN_PASSWORD_LENGTH} characters`);
	}
	if (password !== confirmation) throw new Error('Passwords do not match');

	const sql = postgres(process.env.DATABASE_URL, { max: 1 });

	try {
		const [existing] = await sql`select id from "user" where email = ${email}`;
		if (existing) throw new Error(`A user with email ${email} already exists`);

		const userId = randomUUID();
		const passwordHash = await hashPassword(password);

		await sql.begin(async (tx) => {
			await tx`insert into "user" (id, name, email, email_verified) values (${userId}, ${name}, ${email}, true)`;
			await tx`
				insert into account (id, account_id, provider_id, user_id, password)
				values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash})
			`;
			for (const [index, categoryName] of DEFAULT_CATEGORIES.entries()) {
				await tx`insert into categories (user_id, name, sort_order) values (${userId}, ${categoryName}, ${index + 1})`;
			}
			for (const account of DEFAULT_ACCOUNTS) {
				await tx`insert into financial_accounts (user_id, name, currency) values (${userId}, ${account.name}, ${account.currency})`;
			}
		});

		console.log(`User ${email} created with ${DEFAULT_CATEGORIES.length} categories and ${DEFAULT_ACCOUNTS.length} accounts`);
	} finally {
		await sql.end();
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
